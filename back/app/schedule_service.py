from datetime import datetime, time
from app.database import get_db, get_setting, set_setting


def parse_time_str(time_str: str) -> time:
    """Converts 'HH:MM' string to a datetime.time object."""
    h, m = map(int, time_str.split(":"))
    return time(hour=h, minute=m)


def get_current_mode() -> str:
    """Returns the current system surveillance mode ('away', 'home', or 'schedule')."""
    return get_setting("mode", "away")


def set_current_mode(mode: str) -> str:
    """Updates the surveillance mode."""
    set_setting("mode", mode)
    return mode


def is_surveillance_active(now: datetime | None = None) -> tuple[bool, str]:
    """
    Evaluates whether the security system is currently armed and actively
    monitoring for intrusions.

    Returns:
        tuple[bool, str]: (is_active, descriptive_reason)
    """
    if now is None:
        now = datetime.now()

    mode = get_current_mode()

    if mode == "away":
        return True, "Modo 'Fuera de casa' activo (Armado Manual)"

    if mode == "home":
        return False, "Modo 'En casa' activo (Desarmado Manual)"

    # Mode is 'schedule': Evaluate programmed time windows
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    cur_time = now.time()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM schedules WHERE enabled = 1;")
        schedules = cursor.fetchall()

    for s in schedules:
        try:
            days = [int(d.strip()) for d in s["days"].split(",") if d.strip()]
            start_t = parse_time_str(s["start_time"])
            end_t = parse_time_str(s["end_time"])
        except Exception:
            continue

        if start_t <= end_t:
            # Same-day interval (e.g. 09:00 - 18:00)
            if weekday in days and start_t <= cur_time <= end_t:
                return True, f"Franja horaria activa: {s['name']} ({s['start_time']} - {s['end_time']})"
        else:
            # Cross-midnight interval (e.g. 22:00 - 06:00)
            # 1. Started today evening
            if cur_time >= start_t and weekday in days:
                return True, f"Franja horaria activa: {s['name']} ({s['start_time']} - {s['end_time']})"
            # 2. Started yesterday evening and concludes this morning
            yesterday = (weekday - 1) % 7
            if cur_time <= end_t and yesterday in days:
                return True, f"Franja horaria activa: {s['name']} ({s['start_time']} - {s['end_time']})"

    return False, "Fuera de franjas horarias programadas"
