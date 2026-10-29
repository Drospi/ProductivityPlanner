import { Platform } from 'react-native';

let Notifications = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('expo-notifications not loaded:', e);
  }
}

/**
 * Solicita permisos de notificaciones al sistema
 */
export const requestNotificationPermissions = async () => {
  if (Platform.OS === 'web' || !Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('Error requesting notification permissions:', e);
    return false;
  }
};

/**
 * Programa una notificación local para un evento
 * @param {Object} event Objeto del evento (id, title, date, startTime)
 * @param {number} leadMinutes Minutos antes del inicio para notificar
 * @returns {Promise<string|null>} Notification ID o null si no se pudo agendar
 */
export const scheduleEventNotification = async (event, leadMinutes = 15) => {
  if (Platform.OS === 'web' || !Notifications || !event || !event.date || !event.startTime) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const [hours, minutes] = event.startTime.split(':').map((v) => parseInt(v, 10));
    if (isNaN(hours) || isNaN(minutes)) return null;

    const eventDate = new Date(`${event.date}T${event.startTime}:00`);
    if (isNaN(eventDate.getTime())) return null;

    // Trigger date = event start date minus leadMinutes
    const triggerDate = new Date(eventDate.getTime() - leadMinutes * 60 * 1000);
    const now = new Date();

    if (triggerDate <= now) {
      // Future event start, but trigger time is already in the past
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔔 Recordatorio: ${event.title}`,
        body: `Tu actividad comienza a las ${event.startTime} (en ${leadMinutes} min).`,
        data: { eventId: event.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (e) {
    console.warn('Error scheduling notification:', e);
    return null;
  }
};

/**
 * Cancela una notificación programada por su ID
 * @param {string} notificationId ID de la notificación
 */
export const cancelEventNotification = async (notificationId) => {
  if (Platform.OS === 'web' || !Notifications || !notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.warn('Error canceling notification:', e);
  }
};

/**
 * Cancela todas las notificaciones agendadas
 */
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('Error canceling all notifications:', e);
  }
};

/**
 * Reprograma notificaciones para todos los eventos futuros según la configuración actual
 * @param {Array} events Lista de eventos
 * @param {Object} settings Objeto de ajustes (notificationsEnabled, notificationLeadMinutes)
 * @returns {Promise<Array>} Lista de eventos con sus notificationId actualizados
 */
export const rescheduleAllUpcomingNotifications = async (events, settings) => {
  if (Platform.OS === 'web' || !Notifications) return events;

  await cancelAllNotifications();

  if (!settings || !settings.notificationsEnabled) {
    return events.map((ev) => ({ ...ev, notificationId: null }));
  }

  const leadMinutes = settings.notificationLeadMinutes ?? 15;
  const updatedEvents = [];

  for (const event of events) {
    if (!event.completed) {
      const notifId = await scheduleEventNotification(event, leadMinutes);
      updatedEvents.push({ ...event, notificationId: notifId });
    } else {
      updatedEvents.push({ ...event, notificationId: null });
    }
  }

  return updatedEvents;
};
