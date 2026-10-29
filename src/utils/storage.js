import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_STORAGE_KEY = '@pme_planner_events';
const GOALS_STORAGE_KEY = '@pme_planner_goals';
const TASKS_STORAGE_KEY = '@pme_planner_tasks';
const SETTINGS_STORAGE_KEY = '@pme_planner_settings';

const now = new Date();
const getRecentDate = (daysAgo) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 12, 0, 0);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const todayStr = getRecentDate(0);
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
const tomorrowStr = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;

export const INITIAL_GOALS = [
  {
    id: '1',
    name: 'Enseñar 15 Lecciones',
    category: 'Enseñanza',
    type: 'Cuantitativa',
    currentValue: 12,
    targetValue: 15,
    unit: 'Lecciones',
    period: 'Semanal',
    reviewFreq: 'Semanal',
    status: 'En curso',
    dailyHistory: {
      [getRecentDate(6)]: 2,
      [getRecentDate(5)]: 2,
      [getRecentDate(4)]: 2,
      [getRecentDate(3)]: 2,
      [getRecentDate(2)]: 2,
      [getRecentDate(1)]: 1,
      [todayStr]: 1,
    },
  },
  {
    id: '2',
    name: 'Entrenamiento / Ejercicio Diario',
    category: 'Salud',
    type: 'Hábito',
    currentValue: 4,
    targetValue: 5,
    unit: 'Días',
    period: 'Semanal',
    reviewFreq: 'Diario',
    status: 'En curso',
    dailyHistory: {
      [getRecentDate(5)]: 1,
      [getRecentDate(4)]: 1,
      [getRecentDate(2)]: 1,
      [todayStr]: 1,
    },
  },
  {
    id: '3',
    name: 'Contactar 20 Nuevas Personas',
    category: 'Contacto',
    type: 'Cuantitativa',
    currentValue: 8,
    targetValue: 20,
    unit: 'Contactos',
    period: 'Semanal',
    reviewFreq: 'Diario',
    status: 'En curso',
    dailyHistory: {
      [getRecentDate(4)]: 3,
      [getRecentDate(2)]: 3,
      [getRecentDate(1)]: 2,
    },
  },
  {
    id: '4',
    name: 'Leer 100 Páginas del PME',
    category: 'Estudio',
    type: 'Cuantitativa',
    currentValue: 20,
    targetValue: 100,
    unit: 'Páginas',
    period: 'Mensual',
    reviewFreq: 'Mensual',
    status: 'Retrasado',
    dailyHistory: {
      [getRecentDate(1)]: 10,
      [todayStr]: 10,
    },
  },
];

export const INITIAL_TASKS = [
  {
    id: 't1',
    title: 'Preparar Lección de Capacitación PME',
    type: 'pendiente',
    linkedGoalId: '1',
    requiredHours: 6.0,
    loggedHours: 3.5,
    category: 'Enseñanza',
    dueDate: todayStr,
    completed: false,
    notes: 'Preparar transparencias y notas para el grupo de estudio.',
    completedDates: [],
  },
  {
    id: 't2',
    title: 'Lectura Diaria del Libro de Mormón / PME',
    type: 'diaria',
    linkedGoalId: '4',
    requiredHours: 1.0,
    loggedHours: 1.0,
    category: 'Estudio',
    dueDate: null,
    completed: true,
    notes: 'Lectura de 30 minutos por la mañana y noche.',
    completedDates: [todayStr],
  },
  {
    id: 't3',
    title: 'Proyecto de Organización de Contactos',
    type: 'pendiente',
    linkedGoalId: '3',
    requiredHours: 10.0,
    loggedHours: 4.0,
    category: 'Contacto',
    dueDate: tomorrowStr,
    completed: false,
    notes: 'Organizar la lista telefónica y enviar mensajes de seguimiento.',
    completedDates: [],
  },
  {
    id: 't4',
    title: 'Rutina de Ejercicio Físico Diaria',
    type: 'diaria',
    linkedGoalId: '2',
    requiredHours: 0.75,
    loggedHours: 0.75,
    category: 'Salud',
    dueDate: null,
    completed: false,
    notes: '30 min de ejercicio aeróbico + estiramientos.',
    completedDates: [],
  },
  {
    id: 't5',
    title: 'Comprar libreta de notas para planificación',
    type: 'pendiente',
    status: 'inbox',
    linkedGoalId: null,
    requiredHours: 0.5,
    loggedHours: 0,
    category: 'Personal',
    dueDate: null,
    plannedDate: null,
    completed: false,
    notes: 'Pendiente rápido en bandeja para organizar cuando haya tiempo.',
    completedDates: [],
  },
];

export const INITIAL_EVENTS = [
  {
    id: 'e1',
    title: 'Catch-up Semanal Equipo / Compañero',
    category: 'Llamadas',
    date: todayStr,
    startTime: '08:00',
    endTime: '08:45',
    location: 'Zoom Meeting / Presencial',
    notes: 'Revisar metas de la semana anterior y prioridades.',
    linkedGoalId: null,
    linkedTaskId: null,
    completed: true,
    impactPoints: 5,
  },
  {
    id: 'e2',
    title: 'Lección con Familia Ramos',
    category: 'Enseñanza',
    date: todayStr,
    startTime: '10:00',
    endTime: '11:30',
    location: 'Casa Familia Ramos - Calle Principal 123',
    notes: 'Enseñar Principio 2 del Capítulo 3 del PME.',
    linkedGoalId: '1',
    linkedTaskId: 't1',
    completed: true,
    impactPoints: 15,
  },
  {
    id: 'e2_backup',
    title: 'Estudio Alternativo PME',
    category: 'Estudio',
    date: todayStr,
    startTime: '10:00',
    endTime: '11:00',
    location: 'Biblioteca / Cuarto',
    notes: 'Plan alternativo si se cancela lección.',
    linkedGoalId: null,
    linkedTaskId: null,
    completed: false,
    isBackupPlan: true,
    impactPoints: 10,
  },
  {
    id: 'e3',
    title: 'Almuerzo & Descanso',
    category: 'Personal',
    date: todayStr,
    startTime: '12:00',
    endTime: '13:30',
    location: 'Restaurante El Jardín',
    notes: 'Tiempo personal y recargar energías.',
    linkedGoalId: '2',
    linkedTaskId: null,
    completed: true,
    impactPoints: 10,
  },
  {
    id: 'e4',
    title: 'Contactar en Plaza Central (Extendido)',
    category: 'Contacto',
    date: todayStr,
    startTime: '14:00',
    endTime: '18:00',
    location: 'Plaza de Armas B',
    notes: 'Entregar referencias e invitar a reunión.',
    linkedGoalId: '3',
    linkedTaskId: 't3',
    completed: false,
    impactPoints: 15,
  },
  {
    id: 'e4_intermediate',
    title: 'Plan de Respaldo Intermedio',
    category: 'Servicio',
    date: todayStr,
    startTime: '14:10',
    endTime: '15:40',
    location: 'Centro Comunitario',
    notes: 'Respaldo intermedio de 14:10 a 15:40.',
    linkedGoalId: null,
    linkedTaskId: null,
    completed: false,
    isBackupPlan: true,
    impactPoints: 10,
  },
  {
    id: 'e5',
    title: 'Estudio Personal PME',
    category: 'Estudio',
    date: todayStr,
    startTime: '16:00',
    endTime: '17:00',
    location: 'Oficina / Cuarto',
    notes: 'Revisión con referencias de escrituras.',
    linkedGoalId: '4',
    linkedTaskId: 't2',
    completed: false,
    impactPoints: 10,
  },
  {
    id: 'e6',
    title: 'Servicio en Comedor Comunitario',
    category: 'Servicio',
    date: tomorrowStr,
    startTime: '09:00',
    endTime: '11:00',
    location: 'Centro Comunitario Sur',
    notes: 'Ayudar con la distribución de suministros.',
    linkedGoalId: null,
    linkedTaskId: null,
    completed: false,
    impactPoints: 20,
  },
];

export const INITIAL_SETTINGS = {
  startHour: 7,
  endHour: 22,
  userName: 'Elder Alex',
  missionName: 'Misión Chile Santiago',
  streakDays: 1,
  lastVisitDate: todayStr,
  focusTimeMinutes: 1455, // 24h 15m
  notificationsEnabled: true,
  notificationLeadMinutes: 15,
};

export const loadAppData = async () => {
  try {
    const eventsJson = await AsyncStorage.getItem(EVENTS_STORAGE_KEY);
    const goalsJson = await AsyncStorage.getItem(GOALS_STORAGE_KEY);
    const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
    const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);

    const events = eventsJson ? JSON.parse(eventsJson) : INITIAL_EVENTS;
    const rawGoals = goalsJson ? JSON.parse(goalsJson) : INITIAL_GOALS;
    const goals = (rawGoals || []).map((g) => {
      if (g.dailyHistory && Object.keys(g.dailyHistory).length > 0) return g;
      const cur = g.currentValue || 0;
      const history = {};
      if (cur > 0) {
        const daysToSpread = Math.min(6, Math.max(1, cur));
        const base = Math.floor(cur / daysToSpread);
        let rem = cur % daysToSpread;
        for (let i = 0; i < daysToSpread; i++) {
          const dStr = getRecentDate(i);
          const val = base + (rem > 0 ? 1 : 0);
          if (rem > 0) rem--;
          if (val > 0) history[dStr] = val;
        }
      }
      return { ...g, dailyHistory: history };
    });
    const rawTasks = tasksJson ? JSON.parse(tasksJson) : INITIAL_TASKS;
    const tasks = (rawTasks || []).map((t) => ({
      ...t,
      status: t.status || (t.type === 'diaria' ? 'scheduled' : (t.plannedDate || t.dueDate ? 'scheduled' : 'inbox')),
      plannedDate: t.plannedDate || (t.dueDate ? t.dueDate : null),
      dueDate: t.dueDate || null,
      priority: t.priority || 'media',
    }));
    const settings = settingsJson ? JSON.parse(settingsJson) : INITIAL_SETTINGS;

    return { events, goals, tasks, settings };
  } catch (e) {
    console.error('Error loading app data from AsyncStorage:', e);
    return {
      events: INITIAL_EVENTS,
      goals: INITIAL_GOALS,
      tasks: INITIAL_TASKS,
      settings: INITIAL_SETTINGS,
    };
  }
};

export const saveAppData = async ({ events, goals, tasks, settings }) => {
  try {
    if (events) await AsyncStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
    if (goals) await AsyncStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    if (tasks) await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    if (settings) await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving app data to AsyncStorage:', e);
  }
};

