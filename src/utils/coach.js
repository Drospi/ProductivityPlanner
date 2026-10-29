/**
 * Coach Determinista - Asistente de Orientación Personal
 * Genera recomendaciones tranquilas basadas en prioridades reales,
 * restricciones temporales y compromisos fijados en el calendario.
 */

export const getDayGreetingContext = (userName, eventsToday, tasksToday) => {
  const now = new Date();
  const hour = now.getHours();

  let timeGreeting = 'Buenos días';
  if (hour >= 12 && hour < 19) {
    timeGreeting = 'Buenas tardes';
  } else if (hour >= 19 || hour < 5) {
    timeGreeting = 'Buenas noches';
  }

  const name = userName ? userName.replace(/^(Elder|Hermana|Hno\.|Hna\.)\s*/i, '') : 'amigo';

  const pendingEvents = eventsToday.filter((e) => !e.completed && !e.isBackupPlan);
  const pendingTasks = tasksToday.filter((t) => !t.completed);

  let summaryNote = '';
  if (pendingEvents.length === 0 && pendingTasks.length === 0) {
    summaryNote = 'Todo al día por hoy. Buen momento para revisar o descansar.';
  } else {
    const parts = [];
    if (pendingEvents.length > 0) {
      parts.push(`${pendingEvents.length} compromiso${pendingEvents.length > 1 ? 's' : ''}`);
    }
    if (pendingTasks.length > 0) {
      parts.push(`${pendingTasks.length} pendiente${pendingTasks.length > 1 ? 's' : ''}`);
    }
    summaryNote = `Tienes ${parts.join(' y ')} para hoy.`;
  }

  return {
    timeGreeting,
    name,
    summaryNote,
  };
};

/**
 * Selecciona la siguiente mejor acción recomendada y sus alternativas
 */
export const getRecommendedActions = (events = [], tasks = [], goals = []) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutesFromMidnight = currentHour * 60 + currentMinute;

  // 1. Eventos de hoy no completados (excluyendo planes de respaldo a menos que estén activos)
  const todayEvents = (events || [])
    .filter((e) => e.date === todayStr && !e.completed && !e.isBackupPlan)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  // Compromiso inminente o en curso (que empiece en los próximos 60 min o ya haya empezado)
  const imminentEvent = todayEvents.find((e) => {
    if (!e.startTime) return false;
    const [sh, sm] = e.startTime.split(':').map(Number);
    const startMins = (isNaN(sh) ? 0 : sh) * 60 + (isNaN(sm) ? 0 : sm);
    const [eh, em] = (e.endTime || e.startTime).split(':').map(Number);
    const endMins = (isNaN(eh) ? 0 : eh) * 60 + (isNaN(em) ? 0 : em);

    // En curso o arranca en menos de 60 minutos
    return endMins > currentMinutesFromMidnight && startMins <= currentMinutesFromMidnight + 60;
  });

  const candidates = [];

  // Si hay un evento inminente o en curso, es la prioridad #1 absoluta
  if (imminentEvent) {
    const isOngoing = (() => {
      const [sh, sm] = imminentEvent.startTime.split(':').map(Number);
      return (sh * 60 + sm) <= currentMinutesFromMidnight;
    })();

    candidates.push({
      id: `ev_${imminentEvent.id}`,
      originalId: imminentEvent.id,
      itemType: 'event',
      item: imminentEvent,
      title: imminentEvent.title,
      category: imminentEvent.category || 'Compromiso',
      reason: isOngoing ? 'En curso en este momento' : `Inicia a las ${imminentEvent.startTime}`,
      timeContext: `${imminentEvent.startTime} - ${imminentEvent.endTime || ''}`,
      durationMinutes: 45,
      urgencyScore: 100,
    });
  }

  // 2. Tareas activas (no completadas)
  const activeTasks = (tasks || []).filter((t) => {
    if (!t) return false;
    if (t.type === 'diaria') {
      const dates = Array.isArray(t.completedDates) ? t.completedDates : [];
      return !dates.includes(todayStr);
    }
    return !t.completed && t.status !== 'archived';
  });

  // Tareas con fecha límite hoy o vencidas
  activeTasks.forEach((task) => {
    const isDueToday = task.dueDate === todayStr || task.plannedDate === todayStr;
    const isOverdue = task.dueDate && task.dueDate < todayStr;
    const linkedGoal = task.linkedGoalId ? goals.find((g) => g.id === task.linkedGoalId) : null;

    let score = 30;
    let reason = 'Pendiente recomendado para hoy';

    if (isOverdue) {
      score = 90;
      reason = `Venció el ${task.dueDate} • Conviene atenderla`;
    } else if (isDueToday) {
      score = 80;
      reason = 'Programada para hoy';
    } else if (task.type === 'diaria') {
      score = 70;
      reason = 'Hábito diario clave para mantener tu racha';
    } else if (linkedGoal) {
      score = 65;
      reason = `Aporta directamente a: ${linkedGoal.name}`;
    } else if (task.status === 'inbox') {
      score = 40;
      reason = 'Pendiente de tu bandeja de entrada';
    }

    const durationMins = Math.round((parseFloat(task.requiredHours) || 0.5) * 60);

    candidates.push({
      id: `task_${task.id}`,
      originalId: task.id,
      itemType: 'task',
      item: task,
      title: task.title,
      category: task.category || 'General',
      reason,
      timeContext: isDueToday ? 'Hoy' : task.dueDate ? `Vence: ${task.dueDate}` : 'Flexible',
      durationMinutes: durationMins,
      urgencyScore: score,
    });
  });

  // 3. Otros eventos de hoy que no sean inminentes
  todayEvents.forEach((ev) => {
    if (imminentEvent && ev.id === imminentEvent.id) return;
    candidates.push({
      id: `ev_${ev.id}`,
      originalId: ev.id,
      itemType: 'event',
      item: ev,
      title: ev.title,
      category: ev.category || 'Compromiso',
      reason: `Programado para hoy a las ${ev.startTime}`,
      timeContext: `${ev.startTime} - ${ev.endTime || ''}`,
      durationMinutes: 60,
      urgencyScore: 50,
    });
  });

  // Ordenar por score de urgencia
  candidates.sort((a, b) => b.urgencyScore - a.urgencyScore);

  if (candidates.length === 0) {
    return {
      primary: null,
      alternatives: [],
    };
  }

  const primary = candidates[0];
  const alternatives = candidates.slice(1, 4);

  return {
    primary,
    alternatives,
  };
};
