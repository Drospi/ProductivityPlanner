import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { AppState } from 'react-native';
import {
  loadAppData,
  saveAppData,
  saveBackgroundTimestamp,
  loadBackgroundTimestamp,
  INITIAL_EVENTS,
  INITIAL_GOALS,
  INITIAL_TASKS,
  INITIAL_SETTINGS,
  INITIAL_TELEMETRY,
} from '../utils/storage';
import {
  scheduleEventNotification,
  cancelEventNotification,
  rescheduleAllUpcomingNotifications,
} from '../utils/notifications';
import {
  shouldRegisterTelemetryInCalendar,
  calculateTimeWindow,
  buildTelemetryCalendarEvent,
  getLocalDateStr,
} from '../utils/telemetry';

const AppDataContext = createContext();

export const AppDataProvider = ({ children }) => {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [goals, setGoals] = useState(INITIAL_GOALS);
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [telemetryLogs, setTelemetryLogs] = useState(INITIAL_TELEMETRY.logs);
  const [activeMinutesByDate, setActiveMinutesByDate] = useState(INITIAL_TELEMETRY.activeMinutesByDate);
  const [loading, setLoading] = useState(true);

  const appStateRef = useRef(AppState.currentState);
  const bgTimestampRef = useRef(null);
  const activeStartRef = useRef(Date.now());
  const latestRef = useRef({
    events: INITIAL_EVENTS,
    goals: INITIAL_GOALS,
    tasks: INITIAL_TASKS,
    settings: INITIAL_SETTINGS,
    telemetryLogs: INITIAL_TELEMETRY.logs,
    activeMinutesByDate: INITIAL_TELEMETRY.activeMinutesByDate,
  });

  useEffect(() => {
    latestRef.current = {
      events,
      goals,
      tasks,
      settings,
      telemetryLogs,
      activeMinutesByDate,
    };
  }, [events, goals, tasks, settings, telemetryLogs, activeMinutesByDate]);

  useEffect(() => {
    const initData = async () => {
      const data = await loadAppData();
      let updatedSettings = { ...data.settings };
      const todayStr = getLocalDateStr();

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

      let loadedEvents = data.events || [];
      let loadedLogs = data.telemetry?.logs || [];
      const loadedActiveMins = data.telemetry?.activeMinutesByDate || {};
      const threshold = updatedSettings.telemetryThresholdMinutes ?? 15;
      const autoRegister = updatedSettings.autoTelemetryCalendar !== false;

      // Check if app returned from a saved background timestamp (> threshold min same day)
      const savedBgTs = await loadBackgroundTimestamp();
      if (savedBgTs) {
        await saveBackgroundTimestamp(null);
        const nowTs = Date.now();
        const awayMins = Math.round((nowTs - savedBgTs) / 60000);
        const bgDateStr = getLocalDateStr(new Date(savedBgTs));
        if (bgDateStr === todayStr && shouldRegisterTelemetryInCalendar(awayMins, threshold) && awayMins <= 240) {
          const { startTime, endTime } = calculateTimeWindow(awayMins, new Date(nowTs));
          loadedLogs = [
            {
              id: 'tel_auto_' + nowTs,
              date: todayStr,
              appName: 'App externa detectada',
              category: 'Digital',
              minutes: awayMins,
              startTime,
              endTime,
              registeredInCalendar: false,
              calendarEventId: null,
              source: 'auto_appstate',
            },
            ...loadedLogs,
          ];
        }
      }

      // Auto-register any pending today telemetry entries > threshold when enabled
      if (autoRegister) {
        let didSync = false;
        loadedLogs = loadedLogs.map((entry) => {
          if (
            entry.date === todayStr &&
            !entry.registeredInCalendar &&
            shouldRegisterTelemetryInCalendar(entry.minutes, threshold)
          ) {
            const alreadyInEvents = loadedEvents.some((ev) => ev.telemetryId === entry.id);
            if (!alreadyInEvents) {
              const newEvId = 'e_tel_' + entry.id;
              const calEvent = {
                id: newEvId,
                ...buildTelemetryCalendarEvent(entry, threshold),
              };
              loadedEvents = [calEvent, ...loadedEvents];
              didSync = true;
              return {
                ...entry,
                registeredInCalendar: true,
                calendarEventId: newEvId,
              };
            }
          }
          return entry;
        });
        if (didSync) {
          saveAppData({
            events: loadedEvents,
            goals: data.goals,
            tasks: data.tasks,
            settings: updatedSettings,
            telemetry: { logs: loadedLogs, activeMinutesByDate: loadedActiveMins },
          });
        }
      }

      setEvents(loadedEvents);
      setGoals(data.goals || []);
      setTasks(data.tasks || []);
      setSettings(updatedSettings);
      setTelemetryLogs(loadedLogs);
      setActiveMinutesByDate(loadedActiveMins);
      setLoading(false);

      // Reschedule upcoming notifications on app load if enabled
      if (updatedSettings.notificationsEnabled !== false) {
        rescheduleAllUpcomingNotifications(loadedEvents, updatedSettings).then((rescheduled) => {
          if (rescheduled && rescheduled.length > 0) {
            setEvents(rescheduled);
            saveAppData({ events: rescheduled, goals: data.goals, tasks: data.tasks, settings: updatedSettings });
          }
        });
      }
    };
    initData();
  }, []);

  // Track active usage inside app & background away sessions (> 15 min) via AppState
  useEffect(() => {
    const flushActiveMinutes = () => {
      const now = Date.now();
      const elapsedMins = Math.floor((now - activeStartRef.current) / 60000);
      if (elapsedMins >= 1) {
        activeStartRef.current = now;
        const todayStr = getLocalDateStr();
        const curMap = latestRef.current.activeMinutesByDate || {};
        const nextMap = {
          ...curMap,
          [todayStr]: (curMap[todayStr] || 0) + elapsedMins,
        };
        setActiveMinutesByDate(nextMap);
        saveAppData({
          telemetry: {
            logs: latestRef.current.telemetryLogs,
            activeMinutesByDate: nextMap,
          },
        });
      }
    };

    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        flushActiveMinutes();
      }
    }, 60000);

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prev === 'active' && nextAppState.match(/inactive|background/)) {
        flushActiveMinutes();
        const ts = Date.now();
        bgTimestampRef.current = ts;
        await saveBackgroundTimestamp(ts);
      } else if (prev.match(/inactive|background/) && nextAppState === 'active') {
        activeStartRef.current = Date.now();
        const bgTs = bgTimestampRef.current || (await loadBackgroundTimestamp());
        bgTimestampRef.current = null;
        await saveBackgroundTimestamp(null);

        if (bgTs) {
          const nowTs = Date.now();
          const awayMins = Math.round((nowTs - bgTs) / 60000);
          const todayStr = getLocalDateStr();
          const bgDateStr = getLocalDateStr(new Date(bgTs));
          const curSettings = latestRef.current.settings || {};
          const threshold = curSettings.telemetryThresholdMinutes ?? 15;

          if (bgDateStr === todayStr && shouldRegisterTelemetryInCalendar(awayMins, threshold) && awayMins <= 240) {
            const { startTime, endTime } = calculateTimeWindow(awayMins, new Date(nowTs));
            const entryId = 'tel_auto_' + nowTs;
            const autoRegister = curSettings.autoTelemetryCalendar !== false;

            let newEntry = {
              id: entryId,
              date: todayStr,
              appName: 'App externa detectada',
              category: 'Digital',
              minutes: awayMins,
              startTime,
              endTime,
              registeredInCalendar: false,
              calendarEventId: null,
              source: 'auto_appstate',
            };

            let nextEvents = latestRef.current.events || [];
            if (autoRegister) {
              const evId = 'e_tel_' + entryId;
              const calEv = {
                id: evId,
                ...buildTelemetryCalendarEvent(newEntry, threshold),
              };
              nextEvents = [calEv, ...nextEvents];
              newEntry = {
                ...newEntry,
                registeredInCalendar: true,
                calendarEventId: evId,
              };
              setEvents(nextEvents);
            }

            const nextLogs = [newEntry, ...(latestRef.current.telemetryLogs || [])];
            setTelemetryLogs(nextLogs);
            saveAppData({
              events: nextEvents,
              telemetry: {
                logs: nextLogs,
                activeMinutesByDate: latestRef.current.activeMinutesByDate,
              },
            });
          }
        }
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  const persistData = (newEvents, newGoals, newTasks, newSettings, newTelemetry) => {
    saveAppData({
      events: newEvents !== undefined ? newEvents : events,
      goals: newGoals !== undefined ? newGoals : goals,
      tasks: newTasks !== undefined ? newTasks : tasks,
      settings: newSettings !== undefined ? newSettings : settings,
      telemetry: newTelemetry !== undefined
        ? newTelemetry
        : { logs: telemetryLogs, activeMinutesByDate },
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
      const tomorrowStr = getLocalDateStr(tomorrow);
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

  // Telemetry Management
  const logAppTelemetry = ({
    appName,
    minutes,
    category = 'Digital',
    date = getLocalDateStr(),
    startTime = null,
    endTime = null,
    source = 'manual',
  }) => {
    const cleanName = (appName || '').trim();
    const numMins = Math.round(Number(minutes) || 0);
    if (!cleanName || numMins <= 0) return null;

    const threshold = settings.telemetryThresholdMinutes ?? 15;
    const autoRegister = settings.autoTelemetryCalendar !== false;
    const windowTimes = startTime && endTime ? { startTime, endTime } : calculateTimeWindow(numMins);
    const entryId = 'tel_' + Date.now().toString();

    let newEntry = {
      id: entryId,
      date,
      appName: cleanName,
      category,
      minutes: numMins,
      startTime: windowTimes.startTime,
      endTime: windowTimes.endTime,
      registeredInCalendar: false,
      calendarEventId: null,
      source,
    };

    let updatedEvents = events;
    const qualifies = shouldRegisterTelemetryInCalendar(numMins, threshold);

    if (qualifies && autoRegister) {
      const evId = 'e_tel_' + entryId;
      const calEvent = {
        id: evId,
        ...buildTelemetryCalendarEvent(newEntry, threshold),
      };
      updatedEvents = [calEvent, ...events];
      newEntry = {
        ...newEntry,
        registeredInCalendar: true,
        calendarEventId: evId,
      };
      setEvents(updatedEvents);
    }

    const updatedLogs = [newEntry, ...telemetryLogs];
    setTelemetryLogs(updatedLogs);
    persistData(updatedEvents, goals, tasks, settings, {
      logs: updatedLogs,
      activeMinutesByDate,
    });

    return {
      entry: newEntry,
      qualifiesForCalendar: qualifies,
      registeredInCalendar: newEntry.registeredInCalendar,
    };
  };

  const syncTelemetryEntryToCalendar = (telemetryId, force = false) => {
    const entry = telemetryLogs.find((t) => t.id === telemetryId);
    if (!entry || entry.registeredInCalendar) return null;

    const threshold = settings.telemetryThresholdMinutes ?? 15;
    if (!force && !shouldRegisterTelemetryInCalendar(entry.minutes, threshold)) {
      return null;
    }

    const evId = 'e_tel_' + entry.id;
    const calEvent = {
      id: evId,
      ...buildTelemetryCalendarEvent(entry, threshold),
    };
    const updatedEvents = [calEvent, ...events];
    const updatedLogs = telemetryLogs.map((t) =>
      t.id === telemetryId
        ? { ...t, registeredInCalendar: true, calendarEventId: evId }
        : t
    );

    setEvents(updatedEvents);
    setTelemetryLogs(updatedLogs);
    persistData(updatedEvents, goals, tasks, settings, {
      logs: updatedLogs,
      activeMinutesByDate,
    });
    return calEvent;
  };

  const syncAllPendingTelemetryToCalendar = (dateStr = getLocalDateStr()) => {
    const threshold = settings.telemetryThresholdMinutes ?? 15;
    const pending = telemetryLogs.filter(
      (t) =>
        t.date === dateStr &&
        !t.registeredInCalendar &&
        shouldRegisterTelemetryInCalendar(t.minutes, threshold)
    );
    if (pending.length === 0) return 0;

    const newCalEvents = [];
    const pendingIds = new Set(pending.map((p) => p.id));

    const updatedLogs = telemetryLogs.map((t) => {
      if (pendingIds.has(t.id)) {
        const evId = 'e_tel_' + t.id;
        newCalEvents.push({
          id: evId,
          ...buildTelemetryCalendarEvent(t, threshold),
        });
        return { ...t, registeredInCalendar: true, calendarEventId: evId };
      }
      return t;
    });

    const updatedEvents = [...newCalEvents, ...events];
    setEvents(updatedEvents);
    setTelemetryLogs(updatedLogs);
    persistData(updatedEvents, goals, tasks, settings, {
      logs: updatedLogs,
      activeMinutesByDate,
    });
    return newCalEvents.length;
  };

  const updateTelemetryAppName = (telemetryId, newAppName, newCategory = null) => {
    const cleanName = (newAppName || '').trim();
    if (!cleanName) return;

    const target = telemetryLogs.find((t) => t.id === telemetryId);
    if (!target) return;

    const nextCategory = newCategory || target.category || 'Digital';
    const updatedLogs = telemetryLogs.map((t) =>
      t.id === telemetryId ? { ...t, appName: cleanName, category: nextCategory } : t
    );

    let updatedEvents = events;
    if (target.calendarEventId) {
      updatedEvents = events.map((ev) =>
        ev.id === target.calendarEventId
          ? {
              ...ev,
              title: `📱 ${cleanName} (${target.minutes} min)`,
              category: nextCategory,
              telemetryAppName: cleanName,
            }
          : ev
      );
      setEvents(updatedEvents);
    }

    setTelemetryLogs(updatedLogs);
    persistData(updatedEvents, goals, tasks, settings, {
      logs: updatedLogs,
      activeMinutesByDate,
    });
  };

  const deleteTelemetryEntry = (telemetryId) => {
    const target = telemetryLogs.find((t) => t.id === telemetryId);
    const updatedLogs = telemetryLogs.filter((t) => t.id !== telemetryId);
    let updatedEvents = events;
    if (target?.calendarEventId) {
      updatedEvents = events.filter((ev) => ev.id !== target.calendarEventId);
      setEvents(updatedEvents);
    }
    setTelemetryLogs(updatedLogs);
    persistData(updatedEvents, goals, tasks, settings, {
      logs: updatedLogs,
      activeMinutesByDate,
    });
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
        telemetryLogs,
        activeMinutesByDate,
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
        logAppTelemetry,
        syncTelemetryEntryToCalendar,
        syncAllPendingTelemetryToCalendar,
        updateTelemetryAppName,
        deleteTelemetryEntry,
        updateSettings,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => useContext(AppDataContext);

