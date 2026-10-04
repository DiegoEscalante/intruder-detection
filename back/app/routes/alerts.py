from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List
from app.models import AlertOut
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Evidence History"])


@router.get("", response_model=List[AlertOut])
def get_alerts(limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    """Returns incident logs and evidence history ordered by most recent."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, trigger_type, reason, image_path, email_sent, details
            FROM alerts
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
        """, (limit, offset))
        rows = cursor.fetchall()
        return [
            AlertOut(
                id=r["id"],
                timestamp=r["timestamp"],
                trigger_type=r["trigger_type"],
                reason=r["reason"],
                image_url=f"/api/alerts/{r['id']}/image" if r["image_path"] else None,
                email_sent=bool(r["email_sent"]),
                details=r["details"]
            )
            for r in rows
        ]


@router.get("/{alert_id}/image")
def get_alert_image(alert_id: int):
    """Serves the JPEG photographic evidence captured during intrusion."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT image_path FROM alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        if not row or not row["image_path"]:
            raise HTTPException(status_code=404, detail="Evidencia no disponible.")

        file_path = settings.EVIDENCE_DIR / row["image_path"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Archivo de imagen no encontrado en disco.")

        return FileResponse(file_path, media_type="image/jpeg")


@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: int):
    """Deletes an alert record and its associated image file."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT image_path FROM alerts WHERE id = ?;", (alert_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Alerta no encontrada.")

        if row["image_path"]:
            f = settings.EVIDENCE_DIR / row["image_path"]
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass

        cursor.execute("DELETE FROM alerts WHERE id = ?;", (alert_id,))
    return None
