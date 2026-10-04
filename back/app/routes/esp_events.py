from fastapi import APIRouter, Request, BackgroundTasks
from datetime import datetime
from app.models import EspEvent
from app.esp_client import esp_client
from app.schedule_service import is_surveillance_active
from app.database import get_db
from app.config import settings
from app.email_service import send_alert_email
from app.websocket_manager import ws_manager

router = APIRouter(tags=["ESP32 Events"])


async def handle_alert_background(alert_id: int, timestamp_str: str, reason: str, esp_ip: str, image_bytes: bytes | None):
    """Background task to send email and update database status."""
    email_success = False
    if image_bytes:
        email_success = await send_alert_email(timestamp_str, reason, esp_ip, image_bytes)

    if email_success:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE alerts SET email_sent = 1 WHERE id = ?;", (alert_id,))


@router.post("/event")
async def receive_esp_event(event: EspEvent, request: Request, background_tasks: BackgroundTasks):
    """
    Ingestion endpoint called by the ESP32-CAM when visual movement is confirmed.
    Evaluates surveillance schedules, captures evidence, logs the incident,
    and dispatches mobile push & email alerts.
    """
    client_ip = request.client.host if request.client else None
    if client_ip:
        esp_client.update_seen(client_ip)

    now = datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
    time_key = now.strftime("%Y%m%d_%H%M%S")

    is_active, reason = is_surveillance_active(now)

    print(f"[Event] Evento recibido desde ESP32 ({client_ip}): {event.type}. Estado vigilancia: {is_active} ({reason})")

    if not is_active:
        # Surveillance is disarmed or outside active schedule; log incident as ignored
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts (timestamp, trigger_type, reason, image_path, email_sent, details)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (timestamp_str, event.type, reason, None, 0, "Evento descartado: Sistema desarmado o fuera de horario"))
        return {"status": "ignored", "reason": reason}

    # Surveillance IS active: Capture photographic evidence from ESP32
    image_bytes = await esp_client.fetch_snapshot()
    image_filename = None
    image_rel_path = None

    if image_bytes:
        image_filename = f"evidence_{time_key}.jpg"
        full_path = settings.EVIDENCE_DIR / image_filename
        full_path.write_bytes(image_bytes)
        image_rel_path = image_filename
        print(f"[Event] Evidencia fotográfica guardada en {full_path}")
    else:
        print("[Event] No se pudo obtener captura fotográfica del ESP32.")

    # Save incident in SQLite database
    alert_id = 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (timestamp, trigger_type, reason, image_path, email_sent, details)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (timestamp_str, event.type, reason, image_rel_path, 0, f"Intrusión confirmada desde {client_ip}"))
        alert_id = cursor.lastrowid

    image_url = f"/api/alerts/{alert_id}/image" if image_rel_path else None

    # Broadcast real-time alert to all connected mobile clients
    await ws_manager.broadcast("alert", {
        "id": alert_id,
        "timestamp": timestamp_str,
        "trigger_type": event.type,
        "reason": reason,
        "image_url": image_url,
        "esp_ip": client_ip
    })

    # Dispatch email alert asynchronously in background task
    background_tasks.add_task(
        handle_alert_background,
        alert_id,
        timestamp_str,
        reason,
        client_ip,
        image_bytes
    )

    return {
        "status": "alert_triggered",
        "alert_id": alert_id,
        "timestamp": timestamp_str,
        "reason": reason,
        "evidence_saved": image_bytes is not None
    }
