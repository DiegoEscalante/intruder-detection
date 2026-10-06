import { NativeModules, Platform } from 'react-native';

const { ForegroundServiceModule } = NativeModules;

export interface ForegroundServiceStatus {
  isAvailable: boolean;
  isRunning: boolean;
}

/**
 * Parses URL to extract host and port.
 */
function parseHostAndPort(baseUrl: string): { host: string; port: number } {
  try {
    let clean = baseUrl.replace(/^https?:\/\//i, '');
    const parts = clean.split(':');
    const host = parts[0] || '10.232.157.38';
    const port = parts[1] ? parseInt(parts[1].split('/')[0], 10) : 8000;
    return { host, port };
  } catch {
    return { host: '10.232.157.38', port: 8000 };
  }
}

/**
 * Starts the native Android Foreground Service for continuous background surveillance.
 * - Displays a persistent, non-dismissible notification ("Ongoing") in Android 14.
 * - Keeps a native background thread/WebSocket active even when the app is minimized or screen is locked.
 */
export async function startSurveillanceForegroundService(baseUrl: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  if (!ForegroundServiceModule) {
    console.log('[ForegroundService] Módulo nativo no disponible en este entorno (ej. Expo Go).');
    return false;
  }

  const { host, port } = parseHostAndPort(baseUrl);

  try {
    const success = await ForegroundServiceModule.startService(host, port);
    console.log(`[ForegroundService] ✅ Servicio en primer plano iniciado nativamente (${host}:${port})`);
    return success;
  } catch (error) {
    console.warn('[ForegroundService] Error al iniciar Foreground Service nativo:', error);
    return false;
  }
}

/**
 * Stops the native Android Foreground Service and removes the persistent notification.
 */
export async function stopSurveillanceForegroundService(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  if (!ForegroundServiceModule) {
    return false;
  }

  try {
    const success = await ForegroundServiceModule.stopService();
    console.log('[ForegroundService] 🛑 Servicio en primer plano detenido.');
    return success;
  } catch (error) {
    console.warn('[ForegroundService] Error al detener Foreground Service nativo:', error);
    return false;
  }
}

/**
 * Checks whether the native Foreground Service is currently active.
 */
export async function isForegroundServiceRunning(): Promise<boolean> {
  if (Platform.OS !== 'android' || !ForegroundServiceModule) {
    return false;
  }

  try {
    return await ForegroundServiceModule.isServiceRunning();
  } catch {
    return false;
  }
}
