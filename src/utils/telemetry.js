/**
 * Utilidades de Telemetría de Uso y Accesos Rápidos de Cierre Diario
 */

export const DEFAULT_TELEMETRY_THRESHOLD_MINUTES = 15;

/**
 * Formatea una fecha local como YYYY-MM-DD evitando desfases de zona horaria UTC
 */
export const getLocalDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Formatea minutos en texto legible (ej. "25 min", "1h 10m")
 */
export const formatDuration = (minutes) => {
  const mins = Math.max(0, Math.round(Number(minutes) || 0));
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
};

/**
 * Apps comunes para registro rápido de telemetría
 */
export const QUICK_APP_PRESETS = [
  { id: 'youtube', label: 'YouTube', category: 'Digital' },
  { id: 'instagram', label: 'Instagram', category: 'Digital' },
  { id: 'whatsapp', label: 'WhatsApp', category: 'Personal' },
  { id: 'tiktok', label: 'TikTok', category: 'Digital' },
  { id: 'navegador', label: 'Navegador / Web', category: 'Estudio' },
  { id: 'trabajo_app', label: 'App de Trabajo', category: 'Trabajo' },
];

/**
 * Accesos rápidos opcionales para "¿Qué hiciste en su lugar?"
 */
export const QUICK_REPLACEMENT_OPTIONS = [
  { id: 'reunion', label: 'Reunión / Visita imprevista', icon: 'users', category: 'Personal' },
  { id: 'llamada', label: 'Llamada / Mensaje urgente', icon: 'phone', category: 'Llamadas' },
  { id: 'traslado', label: 'Traslado / Tráfico', icon: 'navigation', category: 'Viajes' },
  { id: 'prioridad', label: 'Otra tarea prioritaria', icon: 'zap', category: 'Trabajo' },
  { id: 'descanso', label: 'Descanso / Pausa necesaria', icon: 'coffee', category: 'Personal' },
  { id: 'estudio', label: 'Lectura / Estudio', icon: 'book-open', category: 'Estudio' },
];

/**
 * Regla de negocio: solo registra en el calendario si superó los 15 minutos (> threshold)
 */
export const shouldRegisterTelemetryInCalendar = (
  minutes,
  thresholdMinutes = DEFAULT_TELEMETRY_THRESHOLD_MINUTES
) => {
  const mins = Number(minutes) || 0;
  const threshold = Number(thresholdMinutes) || DEFAULT_TELEMETRY_THRESHOLD_MINUTES;
  return mins > threshold;
};

/**
 * Calcula ventana horaria HH:MM - HH:MM dentro del mismo día dada una hora fin
 */
export const calculateTimeWindow = (minutes, endDate = new Date()) => {
  const safeMinutes = Math.max(1, Math.round(Number(minutes) || 15));
  const endTotalMins = endDate.getHours() * 60 + endDate.getMinutes();
  const clampedEndMins = Math.max(safeMinutes, Math.min(23 * 60 + 59, endTotalMins));
  const startTotalMins = Math.max(0, clampedEndMins - safeMinutes);

  const sh = Math.floor(startTotalMins / 60);
  const sm = startTotalMins % 60;
  const eh = Math.floor(clampedEndMins / 60);
  const em = clampedEndMins % 60;

  const startTime = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
  const endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;

  return { startTime, endTime };
};

/**
 * Construye el objeto de evento para el calendario a partir de una entrada de telemetría
 */
export const buildTelemetryCalendarEvent = (
  telemetryEntry,
  thresholdMinutes = DEFAULT_TELEMETRY_THRESHOLD_MINUTES
) => {
  const appName = (telemetryEntry.appName || 'App').trim();
  const minutes = Math.round(Number(telemetryEntry.minutes) || 0);
  const fallbackWindow = calculateTimeWindow(minutes);

  return {
    title: `📱 ${appName} (${minutes} min)`,
    category: telemetryEntry.category || 'Digital',
    color: '#8B5CF6',
    date: telemetryEntry.date || getLocalDateStr(),
    startTime: telemetryEntry.startTime || fallbackWindow.startTime,
    endTime: telemetryEntry.endTime || fallbackWindow.endTime,
    location: 'Telemetría de uso',
    notes: `Registrado automáticamente por superar ${thresholdMinutes} min de uso (${minutes} min en ${appName}).`,
    linkedGoalId: null,
    linkedTaskId: null,
    completed: true,
    isTelemetry: true,
    telemetryId: telemetryEntry.id,
    telemetryAppName: appName,
    telemetryMinutes: minutes,
    impactPoints: 0,
  };
};

/**
 * Genera el resumen de telemetría de un día concreto
 */
export const getDailyTelemetrySummary = (
  telemetryLogs = [],
  activeMinutesToday = 0,
  dateStr = getLocalDateStr(),
  thresholdMinutes = DEFAULT_TELEMETRY_THRESHOLD_MINUTES
) => {
  const logsToday = (Array.isArray(telemetryLogs) ? telemetryLogs : []).filter(
    (item) => item && item.date === dateStr
  );

  const totalExternalMinutes = logsToday.reduce(
    (acc, item) => acc + (Number(item.minutes) || 0),
    0
  );

  const overThresholdLogs = logsToday.filter((item) =>
    shouldRegisterTelemetryInCalendar(item.minutes, thresholdMinutes)
  );

  const pendingCalendarSync = overThresholdLogs.filter((item) => !item.registeredInCalendar);
  const syncedToCalendarCount = overThresholdLogs.filter((item) => item.registeredInCalendar).length;

  return {
    dateStr,
    logsToday,
    activeMinutesToday: Math.max(0, Math.round(Number(activeMinutesToday) || 0)),
    totalExternalMinutes,
    overThresholdLogs,
    pendingCalendarSync,
    syncedToCalendarCount,
  };
};
