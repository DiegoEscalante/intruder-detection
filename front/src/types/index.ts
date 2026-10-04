export type SystemMode = 'away' | 'home' | 'schedule';

export interface StatusResponse {
  system_mode: SystemMode;
  is_surveillance_active: boolean;
  active_reason: string;
  esp32_connected: boolean;
  esp32_ip: string | null;
  esp32_stream_url: string | null;
  last_seen_esp32: string | null;
  server_time: string;
  total_alerts: number;
  last_alert_time: string | null;
}

export interface Schedule {
  id: number;
  name: string;
  days: number[]; // 0=Mon, 1=Tue, ..., 6=Sun
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  enabled: boolean;
}

export interface ScheduleCreate {
  name: string;
  days: number[];
  start_time: string;
  end_time: string;
  enabled?: boolean;
}

export interface ScheduleUpdate {
  name?: string;
  days?: number[];
  start_time?: string;
  end_time?: string;
  enabled?: boolean;
}

export interface AlertItem {
  id: number;
  timestamp: string;
  trigger_type: string;
  reason: string;
  image_url: string | null;
  email_sent: boolean;
  details: string | null;
}

export interface StreamUrlsResponse {
  esp_ip: string;
  direct_stream_url: string;
  direct_capture_url: string;
  proxy_stream_url: string;
  proxy_capture_url: string;
}

export interface ConfigSettings {
  alert_recipient: string;
  smtp_enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  cooldown_seconds: number;
}

export interface WebSocketEventMessage {
  event: string;
  data: any;
}
