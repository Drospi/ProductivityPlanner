import React, { createContext, useState, useEffect, useContext } from 'react';
import { loadAppData, saveAppData, INITIAL_EVENTS, INITIAL_GOALS, INITIAL_TASKS, INITIAL_SETTINGS } from '../utils/storage';
import {
  scheduleEventNotification,
  cancelEventNotification,
  rescheduleAllUpcomingNotifications,
} from '../utils/notifications';

const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      const data = await loadAppData();
      let updatedSettings = { ...data.settings };
      const todayStr = new Date().toISOString().split('T')[0];

      if (!updatedSettings.lastVisitDate) {
        updatedSettings.lastVisitDate = todayStr;
        updatedSettings.streakDays = updatedSettings.streakDays || 1;
        saveAppData({ events: data.events, goals: data.goals, tasks: data.tasks, settings: updatedSettings });
      } else if (updatedSettings.lastVisitDate !== todayStr) {
        const last = new Date(updatedSettings.lastVisitDate + 'T00:00:00');
        const current = new Date(todayStr + 'T00:00:00');
        const diffTime = current.getTime() - last.getTime();
        const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

        if (diffDays === 1) {
          updatedSettings.streakDays = (updatedSettings.streakDays || 0) + 1;
        } else if (diffDays > 1) {
          updatedSettings.streakDays = 1;
        }
        updatedSettings.lastVisitDate = todayStr;
        saveAppData({ events: data.events, goals: data.goals, tasks: data.tasks, settings: updatedSettings });
      }

      setEvents(data.events || []);
      setGoals(data.goals || []);
      setTasks(data.tasks || []);
      setSettings(updatedSettings);
      setLoading(false);

      // Reschedule upcoming notifications on app load if enabled
      if (updatedSettings.notificationsEnabled !== false) {
        rescheduleAllUpcomingNotifications(data.events || [], updatedSettings).then((rescheduled) => {
          if (rescheduled && rescheduled.length > 0) {
            setEvents(rescheduled);
            saveAppData({ events: rescheduled, goals: data.goals, tasks: data.tasks, settings: updatedSettings });
          }
        });
      }
    };
    initData();
  }, []);

  const persistData = (newEvents, newGoals, newTasks, newSettings) => {
    saveAppData({
      events: newEvents !== undefined ? newEvents : events,
      goals: newGoals !== undefined ? newGoals : goals,
      tasks: newTasks !== undefined ? newTasks : tasks,
      settings: newSettings !== undefined ? newSettings : settings,
    });
  };

  const addEvent = async (eventData) => {
    const leadMinutes = settings.notificationLeadMinutes ?? 15;

    if (eventData.isRecurring && eventData.recurringUntil && eventData.date) {
      const instances = [];
      const startDate = new Date(eventData.date + 'T00:00:00');
      const untilDate = new Date(eventData.recurringUntil + 'T23:59:59');

      if (!isNaN(startDate.getTime()) && !isNaN(untilDate.getTime()) && startDate <= untilDate) {
        let currDate = new Date(startDate);
        const groupId = 'rec_' + Date.now().toString();
        let idx = 0;
        const daysSelected = (eventData.recurringDays && eventData.recurringDays.length > 0)
          ? eventData.recurringDays
          : [startDate.getDay()];

        while (currDate <= untilDate) {
          const dayOfWeek = currDate.getDay();
          if (daysSelected.includes(dayOfWeek)) {
            const dateStr = currDate.toISOString().split('T')[0];
            const tempEvent = {
              id: `e_${Date.now()}_${idx}`,
              completed: false,
              impactPoints: 10,
              ...eventData,
              date: dateStr,
              recurringGroupId: groupId,
            };

            let notifId = null;
            if (settings.notificationsEnabled !== false) {
              notifId = await scheduleEventNotification(tempEvent, leadMinutes);
            }

            instances.push({
              ...tempEvent,
              notificationId: notifId,
            });
            idx++;
          }
          currDate.setDate(currDate.getDate() + 1);
        }
      }

      if (instances.length > 0) {
        const updatedEvents = [...instances, ...events];
        setEvents(updatedEvents);
        persistData(updatedEvents, goals, tasks, settings);
        return instances[0];
      }
    }

    const tempEvent = {
      id: 'e_' + Date.now().toString(),
      completed: false,
      impactPoints: 10,
      ...eventData,
    };

    let notifId = null;
    if (settings.notificationsEnabled !== false) {
      notifId = await scheduleEventNotification(tempEvent, leadMinutes);
    }

    const newEvent = {
      ...tempEvent,
      notificationId: notifId,
    };

    const updatedEvents = [newEvent, ...events];
    setEvents(updatedEvents);
    persistData(updatedEvents, goals, tasks, settings);
    return newEvent;
  };

  const updateEvent = async (eventId, updatedFields, scope = 'single') => {
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (!targetEvent) return;

    if (targetEvent.notificationId) {
      await cancelEventNotification(targetEvent.notificationId);
    }

    const leadMinutes = settings.notificationLeadMinutes ?? 15;

    let updatedEvents;
    if (scope === 'following' && targetEvent.recurringGroupId) {
      updatedEvents = events.map((ev) => {
        if (ev.recurringGroupId === targetEvent.recurringGroupId && ev.date >= targetEvent.date) {
          return {
            ...ev,
            ...updatedFields,
            id: ev.id,
            date: ev.date,
            recurringGroupId: ev.recurringGroupId,
          };
        }
        return ev;
      });
    } else if (scope === 'all' && targetEvent.recurringGroupId) {
      updatedEvents = events.map((ev) => {
        if (ev.recurringGroupId === targetEvent.recurringGroupId) {
          return {
            ...ev,
            ...updatedFields,
            id: ev.id,
            date: ev.date,
            recurringGroupId: ev.recurringGroupId,
          };
        }
        return ev;
      });
    } else {
      updatedEvents = events.map((ev) => {
        if (ev.id === eventId) {
          return {
            ...ev,
            ...updatedFields,
            id: ev.id,
          };
        }
        return ev;
      });
    }

    if (settings.notificationsEnabled !== false) {
      const updatedTarget = updatedEvents.find((ev) => ev.id === eventId);
      if (updatedTarget && !updatedTarget.completed) {
        const newNotifId = await scheduleEventNotification(updatedTarget, leadMinutes);
        updatedEvents = updatedEvents.map((ev) =>
          ev.id === eventId ? { ...ev, notificationId: newNotifId } : ev
        );
      }
    }

    setEvents(updatedEvents);
    persistData(updatedEvents, goals, tasks, settings);
  };

  const getEventDurationInHours = (startStr, endStr) => {
    if (!startStr || !endStr) return 1.0;
    const [sh, sm] = startStr.split(':').map(Number);
    const [eh, em] = endStr.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = Math.max(15, endMins - startMins);
    return Math.round((diff / 60) * 100) / 100;
  };

  const toggleEventCompletion = (eventId, forcedStatus = null) => {
    let goalIncremented = null;
    let taskHoursDelta = null;

    const updatedEvents = events.map((ev) => {
      if (ev.id === eventId) {
        const nextCompleted = forcedStatus !== null ? forcedStatus : !ev.completed;

        if (nextCompleted && ev.notificationId) {
          cancelEventNotification(ev.notificationId);
        }

        // Handle goal linking increment / decrement
        if (ev.linkedGoalId) {
          const targetGoal = goals.find((g) => g.id === ev.linkedGoalId);
          if (targetGoal) {
            goalIncremented = {
              goal: targetGoal,
              wasCompleted: nextCompleted,
              eventDate: ev.date || new Date().toISOString().split('T')[0],
            };
          }
        }

        // Handle task linking hours increment / decrement
        if (ev.linkedTaskId) {
          const duration = getEventDurationInHours(ev.startTime, ev.endTime);
          taskHoursDelta = {
            taskId: ev.linkedTaskId,
            delta: nextCompleted ? duration : -duration,
          };
        }

        return {
          ...ev,
          completed: nextCompleted,
          notificationId: nextCompleted ? null : ev.notificationId,
        };
      }
      return ev;
    });

    let updatedGoals = [...goals];
    if (goalIncremented) {
      const { goal, wasCompleted, eventDate } = goalIncremented;
      updatedGoals = goals.map((g) => {
        if (g.id === goal.id) {
          const delta = wasCompleted ? 1 : -1;
          const nextVal = Math.max(0, g.currentValue + delta);
          const isDone = nextVal >= g.targetValue;
          const curDayVal = (g.dailyHistory && g.dailyHistory[eventDate]) || 0;
          const nextDayVal = Math.max(0, curDayVal + delta);
          return {
            ...g,
            currentValue: nextVal,
            status: isDone ? 'Completada' : 'En curso',
            dailyHistory: {
              ...(g.dailyHistory || {}),
              [eventDate]: nextDayVal,
            },
          };
        }
        return g;
      });
    }

    let updatedTasks = [...tasks];
    if (taskHoursDelta) {
      const { taskId, delta } = taskHoursDelta;
      updatedTasks = tasks.map((t) => {
        if (t.id === taskId) {
          const nextLogged = Math.max(0, Math.round((t.loggedHours + delta) * 100) / 100);
          const isDone = nextLogged >= (t.requiredHours || 1);
          return {
            ...t,
            loggedHours: nextLogged,
            completed: isDone || t.completed,
          };
        }
        return t;
      });
    }

    setEvents(updatedEvents);
    setGoals(updatedGoals);
    setTasks(updatedTasks);
    persistData(updatedEvents, updatedGoals, updatedTasks, settings);

    return goalIncremented;
  };

  const deleteEvent = (eventId, scope = 'single') => {
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (!targetEvent) return;

    if (targetEvent.notificationId) {
      cancelEventNotification(targetEvent.notificationId);
    }

    let updatedEvents;
    if (scope === 'following' && targetEvent.recurringGroupId) {
      const toDelete = events.filter(
        (ev) => ev.recurringGroupId === targetEvent.recurringGroupId && ev.date >= targetEvent.date
      );
      toDelete.forEach((ev) => {
        if (ev.notificationId) cancelEventNotification(ev.notificationId);
      });
      updatedEvents = events.filter(
        (ev) =>
          !(
            ev.recurringGroupId === targetEvent.recurringGroupId &&
            ev.date >= targetEvent.date
          )
      );
    } else if (scope === 'all' && targetEvent.recurringGroupId) {
      const toDelete = events.filter(
        (ev) => ev.recurringGroupId === targetEvent.recurringGroupId
      );
      toDelete.forEach((ev) => {
        if (ev.notificationId) cancelEventNotification(ev.notificationId);
      });
      updatedEvents = events.filter(
        (ev) => ev.recurringGroupId !== targetEvent.recurringGroupId
      );
    } else {
      updatedEvents = events.filter((ev) => ev.id !== eventId);
    }

    setEvents(updatedEvents);
    persistData(updatedEvents, goals, tasks, settings);
  };

  const addGoal = (goalData) => {
    const newGoal = {
      id: 'g_' + Date.now().toString(),
      currentValue: 0,
      status: 'En curso',
      ...goalData,
    };
    const updatedGoals = [newGoal, ...goals];
    setGoals(updatedGoals);
    persistData(events, updatedGoals, tasks, settings);
    return newGoal;
  };

  const updateGoal = (goalId, updatedFields) => {
    const updatedGoals = goals.map((g) => (g.id === goalId ? { ...g, ...updatedFields } : g));
    setGoals(updatedGoals);
    persistData(events, updatedGoals, tasks, settings);
  };

  const deleteGoal = (goalId) => {
    const updatedGoals = goals.filter((g) => g.id !== goalId);
    setGoals(updatedGoals);
    persistData(events, updatedGoals, tasks, settings);
  };

  // Task Management
  const addTask = (taskData) => {
    const newTask = {
      id: 't_' + Date.now().toString(),
      loggedHours: 0,
      completed: false,
      completedDates: [],
      ...taskData,
    };
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = [newTask, ...currentTasks];
    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
    return newTask;
  };

  const updateTask = (taskId, updatedFields) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.map((t) => (t.id === taskId ? { ...t, ...updatedFields } : t));
    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
  };

  const deleteTask = (taskId) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.filter((t) => t.id !== taskId);
    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
  };

  const toggleTaskCompletion = (taskId, dateStr = new Date().toISOString().split('T')[0]) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    let goalDelta = null;

    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        if (t.type === 'diaria') {
          const dates = Array.isArray(t.completedDates) ? t.completedDates : [];
          const isDoneToday = dates.includes(dateStr);
          const nextDates = isDoneToday
            ? dates.filter((d) => d !== dateStr)
            : [...dates, dateStr];
          const isDone = nextDates.includes(dateStr);
          if (t.linkedGoalId) {
            goalDelta = {
              goalId: t.linkedGoalId,
              delta: isDoneToday ? -1 : 1,
              date: dateStr,
            };
          }
          return {
            ...t,
            completedDates: nextDates,
            completed: isDone,
          };
        } else {
          const nextCompleted = !t.completed;
          if (t.linkedGoalId) {
            goalDelta = {
              goalId: t.linkedGoalId,
              delta: nextCompleted ? 1 : -1,
              date: t.plannedDate || t.dueDate || dateStr,
            };
          }
          return {
            ...t,
            completed: nextCompleted,
            loggedHours: nextCompleted ? Math.max(t.loggedHours || 0, t.requiredHours || 1) : (t.loggedHours || 0),
          };
        }
      }
      return t;
    });

    let updatedGoals = goals;
    if (goalDelta) {
      const { goalId, delta, date } = goalDelta;
      updatedGoals = goals.map((g) => {
        if (g.id === goalId) {
          const nextVal = Math.max(0, g.currentValue + delta);
          const isDone = nextVal >= g.targetValue;
          const curDayVal = (g.dailyHistory && g.dailyHistory[date]) || 0;
          const nextDayVal = Math.max(0, curDayVal + delta);
          return {
            ...g,
            currentValue: nextVal,
            status: isDone ? 'Completada' : 'En curso',
            dailyHistory: {
              ...(g.dailyHistory || {}),
              [date]: nextDayVal,
            },
          };
        }
        return g;
      });
      setGoals(updatedGoals);
    }

    setTasks(updatedTasks);
    persistData(events, updatedGoals, updatedTasks, settings);
  };

  const recordGoalProgress = (goalId, dateStr = new Date().toISOString().split('T')[0], increment = 1) => {
    const targetGoal = goals.find((g) => g.id === goalId);
    if (!targetGoal) return;

    const nextVal = Math.max(0, targetGoal.currentValue + increment);
    const isDone = nextVal >= targetGoal.targetValue;
    const curDayVal = (targetGoal.dailyHistory && targetGoal.dailyHistory[dateStr]) || 0;
    const nextDayVal = Math.max(0, curDayVal + increment);

    const updatedGoals = goals.map((g) => {
      if (g.id === goalId) {
        return {
          ...g,
          currentValue: nextVal,
          status: isDone ? 'Completada' : 'En curso',
          dailyHistory: {
            ...(g.dailyHistory || {}),
            [dateStr]: nextDayVal,
          },
        };
      }
      return g;
    });

    setGoals(updatedGoals);
    persistData(events, updatedGoals, tasks, settings);
  };

  const logTaskHours = (taskId, hoursToAdd) => {
    const numHours = parseFloat(hoursToAdd) || 0;
    if (numHours <= 0) return;
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        const nextLogged = Math.round(((t.loggedHours || 0) + numHours) * 100) / 100;
        const isDone = nextLogged >= (t.requiredHours || 1);
        return {
          ...t,
          loggedHours: nextLogged,
          completed: isDone || t.completed,
        };
      }
      return t;
    });
    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
  };

  const quickCaptureTask = ({
    title,
    plannedDate = null,
    dueDate = null,
    estimatedHours = null,
    linkedGoalId = null,
    category = 'Personal',
  }) => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return null;

    const hrsNum = parseFloat(estimatedHours) || 1.0;
    const isScheduled = !!plannedDate || !!dueDate;

    const newTask = {
      id: 't_' + Date.now().toString(),
      title: cleanTitle,
      type: 'pendiente',
      status: isScheduled ? 'scheduled' : 'inbox',
      plannedDate: plannedDate || null,
      dueDate: dueDate || null,
      linkedGoalId: linkedGoalId || null,
      requiredHours: hrsNum,
      loggedHours: 0,
      category: category || 'Personal',
      priority: 'media',
      notes: '',
      completed: false,
      completedDates: [],
    };

    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = [newTask, ...currentTasks];
    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
    return newTask;
  };

  const rescheduleTask = (taskId, newPlannedDate, newDueDate = undefined) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const updatedTasks = currentTasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = newPlannedDate ? 'scheduled' : (t.type === 'diaria' ? 'scheduled' : 'inbox');
        return {
          ...t,
          plannedDate: newPlannedDate !== undefined ? newPlannedDate : t.plannedDate,
          dueDate: newDueDate !== undefined ? newDueDate : t.dueDate,
          status: nextStatus,
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    persistData(events, goals, updatedTasks, settings);
  };

  const moveTaskToInbox = (taskId) => {
    rescheduleTask(taskId, null);
  };

  const rescheduleEvent = async (eventId, newDate, newStartTime = null, newEndTime = null) => {
    const targetEvent = events.find((ev) => ev.id === eventId);
    if (!targetEvent) return;

    const fieldsToUpdate = { date: newDate };
    if (newStartTime) fieldsToUpdate.startTime = newStartTime;
    if (newEndTime) fieldsToUpdate.endTime = newEndTime;

    await updateEvent(eventId, fieldsToUpdate);
  };

  const recordFocusSession = (minutes, taskId = null, eventId = null, markCompleted = false) => {
    const addedMins = parseInt(minutes, 10) || 0;
    if (addedMins <= 0) return;

    const currentMins = settings.focusTimeMinutes || 0;
    const updatedSettings = {
      ...settings,
      focusTimeMinutes: currentMins + addedMins,
    };
    setSettings(updatedSettings);

    let updatedTasks = tasks;
    if (taskId) {
      const hoursToAdd = Math.round((addedMins / 60) * 100) / 100;
      const currentTasks = Array.isArray(tasks) ? tasks : [];
      updatedTasks = currentTasks.map((t) => {
        if (t.id === taskId) {
          const nextLogged = Math.round(((t.loggedHours || 0) + hoursToAdd) * 100) / 100;
          const isDone = markCompleted || nextLogged >= (t.requiredHours || 1);
          return {
            ...t,
            loggedHours: nextLogged,
            completed: isDone || t.completed,
          };
        }
        return t;
      });
      setTasks(updatedTasks);
    }

    let updatedEvents = events;
    if (eventId && markCompleted) {
      toggleEventCompletion(eventId, true);
      return;
    }

    persistData(updatedEvents, goals, updatedTasks, updatedSettings);
  };

  const scheduleTaskInCalendar = async ({ taskId, date, startTime, durationHours, title, notes }) => {
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const targetTask = currentTasks.find((t) => t.id === taskId);
    const taskTitle = title || (targetTask ? targetTask.title : 'Bloque de Tarea');
    const taskCategory = targetTask ? targetTask.category : 'Tarea';
    const duration = parseFloat(durationHours) || 1.0;

    const [sh, sm] = (startTime || '10:00').split(':').map(Number);
    const startMins = (isNaN(sh) ? 10 : sh) * 60 + (isNaN(sm) ? 0 : sm);
    const endMins = startMins + Math.round(duration * 60);
    const eh = Math.floor(endMins / 60) % 24;
    const em = endMins % 60;
    const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

    const newEvent = await addEvent({
      title: taskTitle,
      category: taskCategory,
      date: date || new Date().toISOString().split('T')[0],
      startTime: startTime || '10:00',
      endTime,
      notes: notes || (targetTask ? targetTask.notes : ''),
      linkedGoalId: targetTask ? targetTask.linkedGoalId : null,
      linkedTaskId: taskId,
      completed: false,
      impactPoints: 10,
    });

    // Update task to link to this event and set plannedDate without double-counting hours prematurely
    if (targetTask) {
      updateTask(taskId, {
        calendarEventId: newEvent.id,
        plannedDate: date || new Date().toISOString().split('T')[0],
        status: 'scheduled',
      });
    }

    return newEvent;
  };

  const recordReplacementActivity = async ({
    originalItemId,
    originalItemType = 'event',
    replacementTitle,
    category = 'Personal',
    linkedGoalId = null,
    date = new Date().toISOString().split('T')[0],
    startTime = '12:00',
    endTime = '13:00',
    actionForOriginal = 'tomorrow', // 'tomorrow' | 'inbox' | 'keep'
  }) => {
    const cleanTitle = (replacementTitle || '').trim();
    if (!cleanTitle) return null;

    // 1. Add replacement event as completed for today
    const newEvent = await addEvent({
      title: cleanTitle,
      category,
      date,
      startTime: startTime || '12:00',
      endTime: endTime || '13:00',
      notes: 'Realizado en sustitución de pendiente no realizado',
      linkedGoalId: linkedGoalId || null,
      completed: true,
      impactPoints: 10,
    });

    // 2. If connected to a goal, increment goal and record progress
    if (linkedGoalId) {
      recordGoalProgress(linkedGoalId, date, 1);
    }

    // 3. Handle original item
    if (actionForOriginal === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      if (originalItemType === 'task') {
        rescheduleTask(originalItemId, tomorrowStr);
      } else if (originalItemType === 'event') {
        rescheduleEvent(originalItemId, tomorrowStr);
      }
    } else if (actionForOriginal === 'inbox' && originalItemType === 'task') {
      moveTaskToInbox(originalItemId);
    }

    return newEvent;
  };

  const updateSettings = async (newSettingsFields) => {
    const updatedSettings = { ...settings, ...newSettingsFields };
    setSettings(updatedSettings);

    let updatedEvents = events;
    if (
      newSettingsFields.notificationsEnabled !== undefined ||
      newSettingsFields.notificationLeadMinutes !== undefined
    ) {
      updatedEvents = await rescheduleAllUpcomingNotifications(events, updatedSettings);
      setEvents(updatedEvents);
    }

    persistData(updatedEvents, goals, tasks, updatedSettings);
  };

  return (
    <AppDataContext.Provider
      value={{
        events,
        goals,
        tasks,
        settings,
        loading,
        addEvent,
        updateEvent,
        toggleEventCompletion,
        deleteEvent,
        rescheduleEvent,
        addGoal,
        updateGoal,
        deleteGoal,
        addTask,
        quickCaptureTask,
        rescheduleTask,
        moveTaskToInbox,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        logTaskHours,
        recordFocusSession,
        scheduleTaskInCalendar,
        recordGoalProgress,
        recordReplacementActivity,
        updateSettings,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);

