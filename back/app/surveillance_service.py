import asyncio
import time
from datetime import datetime
from typing import Optional
from app.esp_client import esp_client
from app.schedule_service import is_surveillance_active
from app.database import get_db, get_setting
from app.config import settings
from app.email_service import send_alert_email
from app.websocket_manager import ws_manager
from app.person_detector import person_detector

# Separate in-memory cooldown timestamps
_last_motion_notification_time: float = 0.0
_last_person_notification_time: float = 0.0

# Concurrency guard for active burst inspection
_burst_in_progress: bool = False


def get_cooldowns():
    motion_cd = int(get_setting("cooldown_seconds", str(settings.ALERT_COOLDOWN_SECONDS)))
    person_cd = int(get_setting("person_cooldown_seconds", str(settings.PERSON_COOLDOWN_SECONDS)))
    return motion_cd, person_cd


async def dispatch_person_alert(
    image_bytes: bytes,
    detection: dict,
    timestamp_str: str,
    time_key: str,
    client_ip: Optional[str],
    source_desc: str = "Ráfaga de alta actividad"
) -> bool:
    """Dispatches a high-priority person detection alert to DB, WebSocket and Email."""
    global _last_person_notification_time, _last_motion_notification_time

    # Guard: only dispatch and record if surveillance schedule / mode is active
    is_active, reason = is_surveillance_active()
    if not is_active:
        print(f"[Surveillance] Detección de persona ignorada: {reason}.")
        return False

    now_time = time.time()
    motion_cd, person_cd = get_cooldowns()
    time_since_last_person = now_time - _last_person_notification_time

    if time_since_last_person < person_cd:
        remaining = int(person_cd - time_since_last_person)
        print(f"[Surveillance] 🚨 Persona detectada ({source_desc}), pero alerta en cooldown ({remaining}s restantes).")
        return False

    # Update cooldowns (person alert also resets motion cooldown)
    _last_person_notification_time = now_time
    _last_motion_notification_time = now_time

    # Save annotated evidence image
    image_filename = f"evidence_{time_key}.jpg"
    full_path = settings.EVIDENCE_DIR / image_filename
    full_path.write_bytes(image_bytes)
    image_rel_path = image_filename

    person_count = detection.get("count", 1)
    labels = detection.get("labels", ["Persona"])
    alert_reason = f"🚨 Persona detectada ({', '.join(labels)})"
    alert_details = f"Visión OpenCV: {person_count} sujeto(s) identificado(s) [{', '.join(labels)}]. Origen: {source_desc}."

    # Save to SQLite DB
    alert_id = 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (timestamp, trigger_type, reason, image_path, email_sent, details)
            VALUES (?, 'person_detected', ?, ?, 0, ?);
        """, (timestamp_str, alert_reason, image_rel_path, alert_details))
        alert_id = cursor.lastrowid

    image_url = f"/api/alerts/{alert_id}/image" if image_rel_path else None

    # Broadcast real-time WebSocket push to mobile clients
    await ws_manager.broadcast("alert", {
        "id": alert_id,
        "timestamp": timestamp_str,
        "trigger_type": "person_detected",
        "person_detected": True,
        "person_count": person_count,
        "labels": labels,
        "reason": alert_reason,
        "image_url": image_url,
        "esp_ip": client_ip
    })

    # Dispatch email with annotated JPEG attachment
    email_success = await send_alert_email(
        timestamp_str,
        alert_reason,
        client_ip or "",
        image_bytes,
        person_detected=True,
        labels=labels
    )
    if email_success:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE alerts SET email_sent = 1 WHERE id = ?;", (alert_id,))

    print(f"[Surveillance] 🚨 ALERTA DE PERSONA ENVIADA (#ESP-{alert_id})! Categorías: {labels}")
    return True


async def dispatch_motion_alert(
    image_bytes: Optional[bytes],
    timestamp_str: str,
    time_key: str,
    client_ip: Optional[str],
    source_desc: str = "Movimiento confirmado por ESP32"
) -> bool:
    """Dispatches a motion alert if motion cooldown has elapsed."""
    global _last_motion_notification_time

    # Guard: only dispatch and record if surveillance schedule / mode is active
    is_active, reason = is_surveillance_active()
    if not is_active:
        print(f"[Surveillance] Movimiento ignorado: {reason}.")
        return False

    now_time = time.time()
    motion_cd, _ = get_cooldowns()
    time_since_last_motion = now_time - _last_motion_notification_time

    if time_since_last_motion < motion_cd:
        remaining = int(motion_cd - time_since_last_motion)
        print(f"[Surveillance] Movimiento en ESP32, pero notificación omitida por cooldown ({remaining}s restantes).")
        return False

    _last_motion_notification_time = now_time

    image_rel_path = None
    if image_bytes:
        image_filename = f"evidence_{time_key}.jpg"
        full_path = settings.EVIDENCE_DIR / image_filename
        full_path.write_bytes(image_bytes)
        image_rel_path = image_filename

    alert_reason = "Movimiento detectado en zona vigilada"
    alert_details = f"Análisis OpenCV: cambio visual sin figura humana identificada. Origen: {source_desc}."

    # Save to SQLite DB
    alert_id = 0
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (timestamp, trigger_type, reason, image_path, email_sent, details)
            VALUES (?, 'motion_only', ?, ?, 0, ?);
        """, (timestamp_str, alert_reason, image_rel_path, alert_details))
        alert_id = cursor.lastrowid

    image_url = f"/api/alerts/{alert_id}/image" if image_rel_path else None

    # Broadcast real-time WebSocket push to mobile clients
    await ws_manager.broadcast("alert", {
        "id": alert_id,
        "timestamp": timestamp_str,
        "trigger_type": "motion_only",
        "person_detected": False,
        "person_count": 0,
        "labels": [],
        "reason": alert_reason,
        "image_url": image_url,
        "esp_ip": client_ip
    })

    # Dispatch email if image is present
    if image_bytes:
        email_success = await send_alert_email(
            timestamp_str,
            alert_reason,
            client_ip or "",
            image_bytes,
            person_detected=False,
            labels=[]
        )
        if email_success:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE alerts SET email_sent = 1 WHERE id = ?;", (alert_id,))

    print(f"[Surveillance] Notificación de movimiento enviada (#ESP-{alert_id}, cooldown: {motion_cd}s).")
    return True


async def process_motion_event_burst(
    timestamp_str: str,
    time_key: str,
    client_ip: Optional[str]
):
    """
    Executes a high-FPS multi-frame burst inspection when the ESP32 signals movement.
    Samples up to 4 frames across the high-FPS window (~1.5s total) to detect any person.
    """
    global _burst_in_progress

    if _burst_in_progress:
        print("[Surveillance] Ráfaga de análisis ya activa. La inspección continuará con los frames actuales.")
        return

    _burst_in_progress = True
    try:
        # Brief pause to allow the ESP32 to finish sending HTTP POST and resume loop()
        await asyncio.sleep(0.12)

        detected_person = False
        best_detection = None
        best_image_bytes = None
        frames_inspected = 0

        # Sample up to 4 frames across the high-FPS window
        for frame_idx in range(4):
            frames_inspected += 1
            image_bytes = await esp_client.fetch_snapshot(timeout=2.0)
            if image_bytes:
                best_image_bytes = image_bytes
                detection = person_detector.detect_person(image_bytes)
                if detection["person_detected"]:
                    detected_person = True
                    best_detection = detection
                    best_image_bytes = detection["annotated_bytes"]
                    print(f"[Vision] 🚨 PERSONA DETECTADA en ráfaga (frame {frame_idx + 1}/4)! Labels: {detection['labels']}")
                    break
            else:
                # Camera unreachable or busy; don't stall in timeout loop
                if frame_idx >= 1:
                    break

            await asyncio.sleep(0.2)

        if detected_person and best_detection and best_image_bytes:
            await dispatch_person_alert(
                best_image_bytes,
                best_detection,
                timestamp_str,
                time_key,
                client_ip,
                source_desc=f"Ráfaga alto FPS (frame {frames_inspected}/4)"
            )
        else:
            await dispatch_motion_alert(
                best_image_bytes,
                timestamp_str,
                time_key,
                client_ip,
                source_desc=f"Ráfaga alto FPS ({frames_inspected} frames analizados, sin personas)"
            )

    except Exception as e:
        print(f"[Surveillance] Error en proceso de ráfaga: {e}")
    finally:
        _burst_in_progress = False


async def continuous_surveillance_worker():
    """
    Continuous background monitor that inspects the ESP32 camera feed at all times
    while surveillance is active. Runs in the background independently of motion triggers.
    """
    global _burst_in_progress

    print("[Continuous Vision] Monitor continuo de visión artificial iniciado.")

    while True:
        try:
            now = datetime.now()
            is_active, _ = is_surveillance_active(now)

            # Only inspect if surveillance is active, ESP32 is actively connected, and no event burst is running
            if is_active and esp_client.is_connected and not _burst_in_progress:
                image_bytes = await esp_client.fetch_snapshot(timeout=2.5)
                if image_bytes and not _burst_in_progress:
                    detection = person_detector.detect_person(image_bytes)
                    if detection["person_detected"]:
                        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
                        now_key = now.strftime("%Y%m%d_%H%M%S")
                        await dispatch_person_alert(
                            detection["annotated_bytes"],
                            detection,
                            now_str,
                            now_key,
                            esp_client.current_ip,
                            source_desc="Monitor continuo OpenCV"
                        )
                elif not image_bytes:
                    # ESP32 did not provide snapshot; wait slightly longer before retrying
                    await asyncio.sleep(2.0)
        except Exception as e:
            await asyncio.sleep(1.0)

        # Nominal loop interval
        await asyncio.sleep(1.5)
