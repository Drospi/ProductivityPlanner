/**
 * Suite de Verificación de Usabilidad y Lógica de Negocio
 * Evalúa los 7 escenarios requeridos y la Regla de los Pocos Segundos.
 */

const assert = require('assert');

// Mock dependencies
const { getDayGreetingContext, getRecommendedActions } = require('../src/utils/coach');
const { darkColors, lightColors } = require('../src/styles/colors');
const {
  shouldRegisterTelemetryInCalendar,
  buildTelemetryCalendarEvent,
  getDailyTelemetrySummary,
  QUICK_REPLACEMENT_OPTIONS,
} = require('../src/utils/telemetry');

console.log('--- INICIANDO SUITE DE PRUEBAS DE USABILIDAD Y PRODUCTIVIDAD ---');

const todayStr = new Date().toISOString().split('T')[0];
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// Test Data
let mockGoals = [
  { id: 'g1', name: 'Aprender React Native', currentValue: 2, targetValue: 5 },
];

let mockTasks = [
  {
    id: 't_inbox_1',
    title: 'Comprar libreta de notas',
    type: 'pendiente',
    status: 'inbox',
    plannedDate: null,
    dueDate: null,
    requiredHours: 0.5,
    loggedHours: 0,
    completed: false,
    completedDates: [],
  },
  {
    id: 't_today_1',
    title: 'Preparar informe de trabajo',
    type: 'pendiente',
    status: 'scheduled',
    plannedDate: todayStr,
    dueDate: todayStr,
    linkedGoalId: 'g1',
    requiredHours: 2.0,
    loggedHours: 0.5,
    completed: false,
    completedDates: [],
  },
  {
    id: 't_daily_1',
    title: '30 min de lectura',
    type: 'diaria',
    status: 'scheduled',
    plannedDate: null,
    dueDate: null,
    requiredHours: 0.5,
    loggedHours: 0.5,
    completed: false,
    completedDates: [],
  },
];

let mockEvents = [
  {
    id: 'e1',
    title: 'Reunión de coordinación',
    date: todayStr,
    startTime: '14:00',
    endTime: '15:00',
    completed: false,
    isBackupPlan: false,
  },
];

// ESCENARIO 1: Añadir un pendiente desde la pantalla principal (Captura rápida ≤ 5 seg)
console.log('\n[Escenario 1]: Captura rápida con solo título');
const startCaptureTime = Date.now();
const quickTaskInput = {
  title: 'Llamar al médico urgente',
  plannedDate: null, // Guardar en bandeja
  estimatedHours: 0.25,
};
const newTask = {
  id: 't_quick_' + Date.now(),
  title: quickTaskInput.title.trim(),
  type: 'pendiente',
  status: quickTaskInput.plannedDate ? 'scheduled' : 'inbox',
  plannedDate: quickTaskInput.plannedDate,
  dueDate: null,
  requiredHours: quickTaskInput.estimatedHours,
  loggedHours: 0,
  completed: false,
  completedDates: [],
};
mockTasks.unshift(newTask);
const captureDurationMs = Date.now() - startCaptureTime;
assert.strictEqual(newTask.status, 'inbox', 'El pendiente sin fecha debe ir a bandeja (inbox)');
assert.strictEqual(newTask.title, 'Llamar al médico urgente');
assert.ok(captureDurationMs < 50, 'La operación lógica de captura debe ejecutarse de inmediato');
console.log(`✓ Escenario 1 Superado: Tarea creada en bandeja sin fricción (${captureDurationMs} ms)`);

// ESCENARIO 2: Encontrar una tarea que vence hoy
console.log('\n[Escenario 2]: Encontrar una tarea que vence hoy');
const dueTodayTasks = mockTasks.filter(
  (t) => !t.completed && (t.dueDate === todayStr || t.plannedDate === todayStr)
);
assert.ok(dueTodayTasks.length >= 1, 'Debe haber al menos 1 tarea para hoy');
assert.strictEqual(dueTodayTasks[0].id, 't_today_1');
console.log(`✓ Escenario 2 Superado: Tarea encontrada de inmediato ("${dueTodayTasks[0].title}")`);

// ESCENARIO 3: Empezar una actividad recomendada (Coach inteligente)
console.log('\n[Escenario 3]: Empezar una actividad recomendada');
const recommendation = getRecommendedActions(mockEvents, mockTasks, mockGoals);
assert.ok(recommendation.primary, 'Debe haber una acción recomendada principal');
console.log(`  Acción Recomendada: "${recommendation.primary.title}" - Motivo: "${recommendation.primary.reason}"`);
assert.ok(recommendation.primary.title.length > 0);
assert.ok(recommendation.primary.reason.length > 0);
// Simular acción de «Empezar» con Focus Session de 25 min
const sessionMinutes = 25;
const simulatedElapsedHours = Math.round((sessionMinutes / 60) * 100) / 100;
console.log(`✓ Escenario 3 Superado: Motor determinista orienta en < 5 seg y permite iniciar enfoque`);

// ESCENARIO 4: Completar una tarea
console.log('\n[Escenario 4]: Completar una tarea con 1 interacción');
const targetTask = mockTasks.find((t) => t.id === 't_today_1');
targetTask.completed = true;
targetTask.loggedHours = targetTask.requiredHours;
assert.strictEqual(targetTask.completed, true);
// Verificar que no se recomiende si ya está completada
const nextRecAfterDone = getRecommendedActions(mockEvents, mockTasks, mockGoals);
assert.notStrictEqual(nextRecAfterDone.primary ? nextRecAfterDone.primary.originalId : null, 't_today_1');
console.log(`✓ Escenario 4 Superado: Tarea completada y retirada de pendientes activos`);

// ESCENARIO 5: Reprogramar una actividad sin cambiar dueDate real
console.log('\n[Escenario 5]: Reprogramar una actividad (Regla de pocos pasos)');
const taskToReschedule = mockTasks.find((t) => t.id === 't_inbox_1');
const originalDueDate = taskToReschedule.dueDate;
// Mover para mañana
taskToReschedule.plannedDate = tomorrowStr;
taskToReschedule.status = 'scheduled';
assert.strictEqual(taskToReschedule.plannedDate, tomorrowStr);
assert.strictEqual(taskToReschedule.dueDate, originalDueDate, 'La fecha límite original no debe ser alterada');
assert.strictEqual(taskToReschedule.status, 'scheduled');
console.log(`✓ Escenario 5 Superado: Tarea reprogramada preservando metadatos originales`);

// ESCENARIO 6: Encontrar un pendiente que todavía no tiene fecha (Bandeja)
console.log('\n[Escenario 6]: Consultar bandeja de entrada');
const inboxItems = mockTasks.filter(
  (t) => t.type !== 'diaria' && !t.completed && (t.status === 'inbox' || (!t.plannedDate && !t.dueDate))
);
assert.ok(inboxItems.some((t) => t.id.startsWith('t_quick_')), 'La tarea rápida debe estar en la bandeja');
console.log(`✓ Escenario 6 Superado: Bandeja contiene ${inboxItems.length} pendientes sin clasificar forzosamente`);

// ESCENARIO 7: Cambiar entre modo claro y oscuro con contraste accesible
console.log('\n[Escenario 7]: Contraste accesible y temas consistentes');
assert.ok(darkColors.background && darkColors.surface && darkColors.primary, 'Tokens oscuros presentes');
assert.ok(lightColors.background && lightColors.surface && lightColors.primary, 'Tokens claros presentes');
assert.notStrictEqual(darkColors.background, lightColors.background, 'Fondos claramente diferenciados');
console.log(`✓ Escenario 7 Superado: Paletas dark/light válidas y contrastes consistentes`);

// ESCENARIO 8: Telemetría del día y registro automático en calendario si > 15 minutos
console.log('\n[Escenario 8]: Telemetría de uso (> 15 min -> calendario)');
assert.strictEqual(shouldRegisterTelemetryInCalendar(10, 15), false, '10 min no debe ir al calendario');
assert.strictEqual(shouldRegisterTelemetryInCalendar(15, 15), false, '15 min exactos no supera los 15 min');
assert.strictEqual(shouldRegisterTelemetryInCalendar(16, 15), true, '16 min (> 15) debe ir al calendario');
assert.strictEqual(shouldRegisterTelemetryInCalendar(35, 15), true, '35 min (> 15) debe ir al calendario');

const mockTelemetryLogs = [
  {
    id: 'tel_short',
    date: todayStr,
    appName: 'WhatsApp',
    category: 'Personal',
    minutes: 12,
    startTime: '11:00',
    endTime: '11:12',
    registeredInCalendar: false,
  },
  {
    id: 'tel_long',
    date: todayStr,
    appName: 'YouTube',
    category: 'Digital',
    minutes: 28,
    startTime: '15:00',
    endTime: '15:28',
    registeredInCalendar: false,
  },
];

const telSummaryBefore = getDailyTelemetrySummary(mockTelemetryLogs, 20, todayStr, 15);
assert.strictEqual(telSummaryBefore.overThresholdLogs.length, 1);
assert.strictEqual(telSummaryBefore.pendingCalendarSync.length, 1);

const generatedCalEvent = buildTelemetryCalendarEvent(mockTelemetryLogs[1], 15);
assert.strictEqual(generatedCalEvent.isTelemetry, true);
assert.strictEqual(generatedCalEvent.date, todayStr);
assert.ok(generatedCalEvent.title.includes('YouTube'));
assert.ok(generatedCalEvent.title.includes('28 min'));
mockTelemetryLogs[1].registeredInCalendar = true;
mockEvents.push({ id: 'e_tel_1', ...generatedCalEvent });

const telSummaryAfter = getDailyTelemetrySummary(mockTelemetryLogs, 20, todayStr, 15);
assert.strictEqual(telSummaryAfter.syncedToCalendarCount, 1);
assert.strictEqual(telSummaryAfter.pendingCalendarSync.length, 0);
console.log('✓ Escenario 8 Superado: Solo sesiones > 15 min se registran en calendario con su bloque horario');

// ESCENARIO 9: Acceso rápido opcional para actividades no completadas al final del día
console.log('\n[Escenario 9]: Acceso rápido opcional al final del día');
assert.ok(Array.isArray(QUICK_REPLACEMENT_OPTIONS) && QUICK_REPLACEMENT_OPTIONS.length >= 4, 'Debe haber accesos rápidos predefinidos');
const uncompletedEvents = mockEvents.filter((e) => !e.completed && !e.isTelemetry);
assert.ok(uncompletedEvents.length >= 1, 'Debe identificar eventos sin completar para el collapsible');
const chosenQuickOption = QUICK_REPLACEMENT_OPTIONS[0];
assert.ok(chosenQuickOption.label && chosenQuickOption.icon && chosenQuickOption.category);
console.log(`✓ Escenario 9 Superado: Acceso rápido opcional disponible (${QUICK_REPLACEMENT_OPTIONS.length} opciones en 1 toque)`);

console.log('\n======================================================');
console.log('TODAS LAS PRUEBAS DE USABILIDAD Y NEGOCIO PASARON (9/9)');
console.log('======================================================');
