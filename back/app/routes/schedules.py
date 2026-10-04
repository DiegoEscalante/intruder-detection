from fastapi import APIRouter, HTTPException
from typing import List
from app.models import ScheduleCreate, ScheduleUpdate, ScheduleOut
from app.database import get_db

router = APIRouter(prefix="/api/schedules", tags=["Schedules (Franjas Horarias)"])


@router.get("", response_model=List[ScheduleOut])
def list_schedules():
    """Returns all configured surveillance time-windows."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, days, start_time, end_time, enabled FROM schedules ORDER BY id ASC;")
        rows = cursor.fetchall()
        return [
            ScheduleOut(
                id=r["id"],
                name=r["name"],
                days=[int(d.strip()) for d in r["days"].split(",") if d.strip()],
                start_time=r["start_time"],
                end_time=r["end_time"],
                enabled=bool(r["enabled"])
            )
            for r in rows
        ]


@router.post("", response_model=ScheduleOut, status_code=201)
def create_schedule(schedule: ScheduleCreate):
    """Creates a new surveillance time-window rule."""
    days_str = ",".join(str(d) for d in sorted(schedule.days))
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO schedules (name, days, start_time, end_time, enabled)
            VALUES (?, ?, ?, ?, ?);
        """, (schedule.name, days_str, schedule.start_time, schedule.end_time, int(schedule.enabled)))
        new_id = cursor.lastrowid

    return ScheduleOut(
        id=new_id,
        name=schedule.name,
        days=schedule.days,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        enabled=schedule.enabled
    )


@router.put("/{schedule_id}", response_model=ScheduleOut)
def update_schedule(schedule_id: int, update: ScheduleUpdate):
    """Updates an existing surveillance time-window rule."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM schedules WHERE id = ?;", (schedule_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Franja horaria no encontrada.")

        name = update.name if update.name is not None else existing["name"]
        days = update.days if update.days is not None else [int(d) for d in existing["days"].split(",") if d]
        start_time = update.start_time if update.start_time is not None else existing["start_time"]
        end_time = update.end_time if update.end_time is not None else existing["end_time"]
        enabled = update.enabled if update.enabled is not None else bool(existing["enabled"])

        days_str = ",".join(str(d) for d in sorted(days))

        cursor.execute("""
            UPDATE schedules
            SET name = ?, days = ?, start_time = ?, end_time = ?, enabled = ?
            WHERE id = ?;
        """, (name, days_str, start_time, end_time, int(enabled), schedule_id))

    return ScheduleOut(
        id=schedule_id,
        name=name,
        days=days,
        start_time=start_time,
        end_time=end_time,
        enabled=enabled
    )


@router.delete("/{schedule_id}", status_code=204)
def delete_schedule(schedule_id: int):
    """Deletes a surveillance time-window rule."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM schedules WHERE id = ?;", (schedule_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Franja horaria no encontrada.")
    return None
