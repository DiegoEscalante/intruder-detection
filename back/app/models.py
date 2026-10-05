from pydantic import BaseModel, Field
from typing import Optional, List


class EspEvent(BaseModel):
    type: str = Field(..., description="Event type emitted by ESP32, e.g. 'change_detected'")


class EspWifiUpdate(BaseModel):
    ssid: str = Field(..., min_length=1, description="SSID de la red Wi-Fi")
    password: str = Field(default="", description="Contraseña de la red Wi-Fi")


class ModeUpdate(BaseModel):
    mode: str = Field(
        ...,
        pattern="^(away|home|schedule)$",
        description="Mode: 'away' (Armed), 'home' (Disarmed), 'schedule' (Time-window based)"
    )


class ScheduleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    days: List[int] = Field(..., description="Days of week: 0=Mon, 1=Tue, ..., 6=Sun")
    start_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):([0-5]\d)$", description="HH:MM format")
    end_time: str = Field(..., pattern=r"^([01]\d|2[0-3]):([0-5]\d)$", description="HH:MM format")
    enabled: bool = True


class ScheduleUpdate(BaseModel):
    name: Optional[str] = None
    days: Optional[List[int]] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    enabled: Optional[bool] = None


class ScheduleOut(BaseModel):
    id: int
    name: str
    days: List[int]
    start_time: str
    end_time: str
    enabled: bool


class AlertOut(BaseModel):
    id: int
    timestamp: str
    trigger_type: str
    reason: str
    image_url: Optional[str] = None
    email_sent: bool
    details: Optional[str] = None


class ConfigUpdate(BaseModel):
    alert_recipient: Optional[str] = None
    smtp_enabled: Optional[bool] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_pass: Optional[str] = None
    cooldown_seconds: Optional[int] = None
    person_cooldown_seconds: Optional[int] = None


class ConfigOut(BaseModel):
    alert_recipient: str
    smtp_enabled: bool
    smtp_host: str
    smtp_port: int
    smtp_user: str
    cooldown_seconds: int
    person_cooldown_seconds: int = 30


class StatusOut(BaseModel):
    system_mode: str
    is_surveillance_active: bool
    active_reason: str
    esp32_connected: bool
    esp32_ip: Optional[str]
    esp32_stream_url: Optional[str]
    last_seen_esp32: Optional[str]
    server_time: str
    total_alerts: int
    last_alert_time: Optional[str]
