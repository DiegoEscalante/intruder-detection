import smtplib
import time
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from typing import Optional
from app.config import settings
from app.database import get_setting

_last_email_sent_time: float = 0.0


def _send_email_sync(
    subject: str,
    body_text: str,
    body_html: str,
    recipient: str,
    image_bytes: Optional[bytes] = None,
    image_filename: str = "evidence.jpg"
) -> bool:
    """Synchronous SMTP transmission executed in background thread."""
    global _last_email_sent_time

    smtp_enabled = get_setting("smtp_enabled", "true" if settings.SMTP_ENABLED else "false").lower() in ("true", "1")
    if not smtp_enabled:
        print("[EmailService] SMTP deshabilitado en configuración. No se envía correo.")
        return False

    smtp_user = settings.SMTP_USER
    smtp_pass = settings.SMTP_PASS
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT

    if not smtp_user or not smtp_pass:
        print("[EmailService] Credenciales SMTP no configuradas. Revisa tu archivo .env.")
        return False

    msg = MIMEMultipart("related")
    msg["Subject"] = subject
    msg["From"] = f"Sistema de Seguridad IoT <{smtp_user}>"
    msg["To"] = recipient

    # Alternative body (plain text & HTML)
    msg_alt = MIMEMultipart("alternative")
    msg.attach(msg_alt)
    msg_alt.attach(MIMEText(body_text, "plain", "utf-8"))
    msg_alt.attach(MIMEText(body_html, "html", "utf-8"))

    # Attach photographic evidence if available
    if image_bytes:
        img_part = MIMEImage(image_bytes, name=image_filename)
        img_part.add_header("Content-Disposition", f"attachment; filename=\"{image_filename}\"")
        img_part.add_header("Content-ID", "<evidence_snapshot>")
        msg.attach(img_part)

    try:
        print(f"[EmailService] Conectando a {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, [recipient], msg.as_string())
        server.quit()

        _last_email_sent_time = time.time()
        print(f"[EmailService] Correo de alerta enviado exitosamente a {recipient}.")
        return True
    except Exception as e:
        print(f"[EmailService] Error enviando correo: {e}")
        return False


async def send_alert_email(
    timestamp_str: str,
    reason: str,
    esp_ip: Optional[str],
    image_bytes: Optional[bytes] = None
) -> bool:
    """
    Asynchronously sends an intrusion alert email with cooldown protection.
    """
    global _last_email_sent_time

    cooldown = int(get_setting("cooldown_seconds", str(settings.ALERT_COOLDOWN_SECONDS)))
    now = time.time()
    if now - _last_email_sent_time < cooldown:
        print(f"[EmailService] Alerta omitida por cooldown ({int(cooldown - (now - _last_email_sent_time))}s restantes).")
        return False

    recipient = get_setting("alert_recipient", settings.ALERT_RECIPIENT)
    if not recipient:
        print("[EmailService] No hay destinatario configurado para alertas.")
        return False

    subject = f"🚨 ALERTA DE SEGURIDAD: Intruso detectado [{timestamp_str}]"

    body_text = (
        f"ALERTA DE SEGURIDAD - SISTEMA DE DETECCIÓN DE INTRUSOS\n"
        f"---------------------------------------------------\n"
        f"Fecha y Hora: {timestamp_str}\n"
        f"Causa / Franja: {reason}\n"
        f"Dispositivo ESP32-CAM: {esp_ip or 'Desconocido'}\n\n"
        f"Se ha capturado evidencia fotográfica y se adjunta a este mensaje.\n"
    )

    body_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; }}
        .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e1e4e8; overflow: hidden; }}
        .header {{ background-color: #d93025; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 24px; color: #333333; }}
        .data-row {{ margin-bottom: 12px; }}
        .label {{ font-weight: bold; color: #555555; }}
        .footer {{ background: #f8f9fa; padding: 12px; text-align: center; font-size: 12px; color: #888888; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin:0;">🚨 Intrusión Detectada</h2>
          <p style="margin:5px 0 0 0; font-size:14px;">ESP32-S3 CAM Security System</p>
        </div>
        <div class="content">
          <p>Se ha detectado actividad sospechosa dentro de la franja horaria activa de vigilancia.</p>
          <div class="data-row"><span class="label">Marca temporal:</span> {timestamp_str}</div>
          <div class="data-row"><span class="label">Motivo de activación:</span> {reason}</div>
          <div class="data-row"><span class="label">Dirección IP del Sensor:</span> {esp_ip or 'No disponible'}</div>
          <p>Adjunto encontrarás la captura fotográfica tomada en el instante exacto de la intrusión.</p>
        </div>
        <div class="footer">
          Sistema de Detección de Intrusos IoT • Desarrollo Móvil
        </div>
      </div>
    </body>
    </html>
    """

    return await asyncio.to_thread(
        _send_email_sync,
        subject,
        body_text,
        body_html,
        recipient,
        image_bytes,
        f"evidencia_{int(now)}.jpg"
    )
