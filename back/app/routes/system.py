from fastapi import APIRouter, HTTPException, BackgroundTasks
from datetime import datetime
import httpx
from app.models import StatusOut, ModeUpdate, ConfigUpdate, ConfigOut, EspWifiUpdate
from app.database import get_db, get_setting, set_setting
from app.schedule_service import get_current_mode, set_current_mode, is_surveillance_active
from app.esp_client import esp_client
from app.config import settings
from app.email_service import send_alert_email
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/api", tags=["System & Settings"])


@router.get("/status", response_model=StatusOut)
def get_system_status():
    """Returns overall IoT security status, ESP32 connectivity, and active surveillance state."""
    now = datetime.now()
    is_active, reason = is_surveillance_active(now)

    total_alerts = 0
    last_alert = None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM alerts;")
        total_alerts = cursor.fetchone()["c"]

        cursor.execute("SELECT timestamp FROM alerts ORDER BY id DESC LIMIT 1;")
        row = cursor.fetchone()
        if row:
            last_alert = row["timestamp"]

    return StatusOut(
        system_mode=get_current_mode(),
        is_surveillance_active=is_active,
        active_reason=reason,
        esp32_connected=esp_client.is_connected,
        esp32_ip=esp_client.current_ip,
        esp32_stream_url=esp_client.stream_url,
        last_seen_esp32=esp_client.last_seen.strftime("%Y-%m-%d %H:%M:%S") if esp_client.last_seen else None,
        server_time=now.strftime("%Y-%m-%d %H:%M:%S"),
        total_alerts=total_alerts,
        last_alert_time=last_alert
    )


@router.post("/mode")
async def update_mode(mode_in: ModeUpdate):
    """
    Sets surveillance mode:
    - 'away': Armado forzoso ("Fuera de casa")
    - 'home': Desarmado manual ("En casa")
    - 'schedule': Automatizado según franjas horarias
    """
    new_mode = set_current_mode(mode_in.mode)
    is_active, reason = is_surveillance_active()

    # Push mode update to all mobile clients
    await ws_manager.broadcast("mode_changed", {
        "mode": new_mode,
        "is_active": is_active,
        "reason": reason
    })

    return {
        "mode": new_mode,
        "is_surveillance_active": is_active,
        "reason": reason
    }


@router.get("/config", response_model=ConfigOut)
def get_configuration():
    """Returns email alert and notification preferences."""
    return ConfigOut(
        alert_recipient=get_setting("alert_recipient", settings.ALERT_RECIPIENT),
        smtp_enabled=get_setting("smtp_enabled", "true" if settings.SMTP_ENABLED else "false").lower() in ("true", "1"),
        smtp_host=settings.SMTP_HOST,
        smtp_port=settings.SMTP_PORT,
        smtp_user=settings.SMTP_USER,
        cooldown_seconds=int(get_setting("cooldown_seconds", str(settings.ALERT_COOLDOWN_SECONDS))),
        person_cooldown_seconds=int(get_setting("person_cooldown_seconds", str(settings.PERSON_COOLDOWN_SECONDS)))
    )


@router.put("/config")
@router.post("/config")
def update_configuration(config: ConfigUpdate):
    """Updates email alert and notification preferences."""
    if config.alert_recipient is not None:
        set_setting("alert_recipient", config.alert_recipient)
    if config.smtp_enabled is not None:
        set_setting("smtp_enabled", "true" if config.smtp_enabled else "false")
    if config.cooldown_seconds is not None:
        set_setting("cooldown_seconds", str(config.cooldown_seconds))
    if config.person_cooldown_seconds is not None:
        set_setting("person_cooldown_seconds", str(config.person_cooldown_seconds))

    return {"message": "Configuración actualizada con éxito."}


@router.post("/test-alert")
async def trigger_test_alert(background_tasks: BackgroundTasks):
    """
    Manually triggers a test alert: captures a snapshot, logs to DB,
    broadcasts to mobile via WebSocket, and sends a test email.
    """
    now = datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
    reason = "Prueba manual iniciada desde API móvil"

    image_bytes = await esp_client.fetch_snapshot()
    image_rel_path = None
    if image_bytes:
        time_key = now.strftime("%Y%m%d_%H%M%S")
        image_filename = f"evidence_test_{time_key}.jpg"
        (settings.EVIDENCE_DIR / image_filename).write_bytes(image_bytes)
        image_rel_path = image_filename

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (timestamp, trigger_type, reason, image_path, email_sent, details)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (timestamp_str, "manual_test", reason, image_rel_path, 0, "Alerta de prueba manual"))
        alert_id = cursor.lastrowid

    image_url = f"/api/alerts/{alert_id}/image" if image_rel_path else None

    await ws_manager.broadcast("alert", {
        "id": alert_id,
        "timestamp": timestamp_str,
        "trigger_type": "manual_test",
        "reason": reason,
        "image_url": image_url,
        "esp_ip": esp_client.ip
    })

    background_tasks.add_task(
        send_alert_email,
        timestamp_str,
        reason,
        esp_client.current_ip,
        image_bytes,
        False,
        None,
        True  # bypass_cooldown
    )

    return {
        "status": "test_alert_dispatched",
        "alert_id": alert_id,
        "timestamp": timestamp_str,
        "image_saved": image_bytes is not None
    }


@router.post("/esp/wifi")
async def update_esp32_wifi(wifi_data: EspWifiUpdate):
    """
    Sends new Wi-Fi credentials to the ESP32-CAM HTTP server (/save).
    The ESP32 stores them in non-volatile flash (Preferences) and reconnects.
    """
    ip = esp_client.current_ip
    if not ip:
        raise HTTPException(
            status_code=503,
            detail="ESP32-CAM no detectado en la red. Conéctate a su AP 'ESP32-CAM-Setup' (192.168.50.1) si está fuera de línea."
        )

    url = f"http://{ip}/save"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
                url,
                data={"ssid": wifi_data.ssid, "password": wifi_data.password}
            )
            return {
                "status": "success",
                "message": f"Credenciales enviadas al ESP32 ({wifi_data.ssid}). El microcontrolador se reiniciará para conectarse.",
                "esp_ip": ip
            }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error enviando credenciales al ESP32 ({url}): {e}")

