import {
  StatusResponse,
  SystemMode,
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  AlertItem,
  StreamUrlsResponse,
  ConfigSettings,
} from '../types';

// Default backend IP based on the active ESP32 LAN subnet
let CURRENT_BASE_URL = 'http://10.162.220.76:8000';

export function getBaseUrl(): string {
  return CURRENT_BASE_URL;
}

export function setBaseUrl(newUrl: string): void {
  let cleaned = newUrl.trim();
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned;
  }
  CURRENT_BASE_URL = cleaned;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${CURRENT_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      let errDetail = errText;
      try {
        const parsed = JSON.parse(errText);
        errDetail = parsed.detail || errText;
      } catch {}
      throw new Error(`HTTP ${res.status}: ${errDetail}`);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al conectar con el servidor.');
    }
    throw error;
  }
}

// 1. System Status & Arming Modes
export async function fetchSystemStatus(): Promise<StatusResponse> {
  return request<StatusResponse>('/api/status');
}

export async function updateSystemMode(mode: SystemMode): Promise<{
  status: string;
  mode: SystemMode;
  active: boolean;
  reason: string;
}> {
  return request('/api/mode', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export async function triggerManualTestAlert(): Promise<{
  status: string;
  alert_id: number;
  timestamp: string;
}> {
  return request('/api/test-alert', {
    method: 'POST',
  });
}

// 2. Surveillance Schedules
export async function fetchSchedules(): Promise<Schedule[]> {
  return request<Schedule[]>('/api/schedules');
}

export async function createSchedule(data: ScheduleCreate): Promise<Schedule> {
  return request<Schedule>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSchedule(id: number, data: ScheduleUpdate): Promise<Schedule> {
  return request<Schedule>(`/api/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteSchedule(id: number): Promise<void> {
  return request<void>(`/api/schedules/${id}`, {
    method: 'DELETE',
  });
}

// 3. Alerts & Incident Logs
export async function fetchAlerts(limit: number = 50, offset: number = 0): Promise<AlertItem[]> {
  return request<AlertItem[]>(`/api/alerts?limit=${limit}&offset=${offset}`);
}

export async function deleteAlert(id: number): Promise<void> {
  return request<void>(`/api/alerts/${id}`, {
    method: 'DELETE',
  });
}

// 4. Stream & Camera URLs
export async function fetchStreamUrls(): Promise<StreamUrlsResponse> {
  return request<StreamUrlsResponse>('/api/stream-url');
}

// 5. System Configuration
export async function fetchConfig(): Promise<ConfigSettings> {
  return request<ConfigSettings>('/api/config');
}

export async function updateConfig(data: Partial<ConfigSettings>): Promise<{ message: string }> {
  return request('/api/config', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getAlertImageUrl(alertId: number): string {
  return `${CURRENT_BASE_URL}/api/alerts/${alertId}/image`;
}

export function getStreamProxyUrl(): string {
  return `${CURRENT_BASE_URL}/api/stream`;
}

export async function detectPersonNow(): Promise<{
  person_detected: boolean;
  count: number;
  labels: string[];
}> {
  return request('/api/detect-person');
}

