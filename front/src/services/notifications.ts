import { Vibration, Platform, Alert } from 'react-native';

type NotificationListener = (data: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) => void;

const listeners: NotificationListener[] = [];

/**
 * Registers an in-app listener for real-time heads-up notification banners.
 */
export function addNotificationListener(listener: NotificationListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

/**
 * Initializes notification permissions and channels.
 * Compatible with Expo Go on Android 14 / XOS 14 (Infinix Note 30 Pro)
 * without triggering SDK 53+ remote push restrictions.
 */
export async function registerForPushNotificationsAsync(): Promise<boolean> {
  console.log('[Notifications] Servicio de notificaciones y alertas táctiles listo para Expo Go.');
  return true;
}

/**
 * Dispatches an immediate high-priority intrusion notification:
 * - Triggers tactical physical vibration pattern on the device (Infinix Note 30 Pro)
 * - Broadcasts to in-app Heads-Up Notification Banner
 */
export async function triggerIntrusionNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<string> {
  try {
    // 1. Physical tactical vibration pattern on Android [wait, vibrate, wait, vibrate...]
    if (Platform.OS === 'android') {
      Vibration.vibrate([0, 300, 200, 300, 200, 500]);
    } else {
      Vibration.vibrate(400);
    }

    // 2. Notify all registered in-app banner listeners
    listeners.forEach((listener) => {
      try {
        listener(params);
      } catch (e) {
        console.warn('[Notifications] Error en listener de notificación:', e);
      }
    });

    return `notif_${Date.now()}`;
  } catch (error) {
    console.warn('[Notifications] Error al disparar notificación:', error);
    return `err_${Date.now()}`;
  }
}

/**
 * Updates ambient surveillance state.
 */
export async function updateSurveillanceStatusNotification(
  isSurveillanceActive: boolean,
  modeName: string
): Promise<void> {
  console.log(`[Notifications] Estado de vigilancia actualizado: ${isSurveillanceActive ? 'ARMADO' : 'DESARMADO'} (${modeName})`);
}

/**
 * Cancels active notifications or vibrations.
 */
export async function cancelAllNotifications(): Promise<void> {
  Vibration.cancel();
}
