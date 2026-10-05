from fastapi import APIRouter, Request, BackgroundTasks
from datetime import datetime
from app.models import EspEvent
from app.esp_client import esp_client
from app.schedule_service import is_surveillance_active
from app.database import get_db
from app.surveillance_service import process_motion_event_burst

router = APIRouter(tags=["ESP32 Events"])


@router.post("/event")
async def receive_esp_event(event: EspEvent, request: Request, background_tasks: BackgroundTasks):
    """
    Ingestion endpoint called by the ESP32-CAM when visual movement is confirmed.
    Immediately answers the ESP32 with 200 OK (so it can enter high-FPS mode without blocking),
    and dispatches a background multi-frame burst inspection to detect any person in the frames.
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

    # Surveillance is active: schedule multi-frame burst inspection during the high-FPS window.
    # Note: Cooldowns are evaluated inside the analysis worker — person detection is NEVER
    # blocked by motion cooldown, allowing the backend to catch people at all times.
    background_tasks.add_task(
        process_motion_event_burst,
        timestamp_str,
        time_key,
        client_ip
    )

    return {
        "status": "burst_analysis_started",
        "timestamp": timestamp_str,
        "reason": reason
    }
