import os
import socket
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or back directory
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def get_local_ip() -> str:
    """
    Detects the machine's primary LAN IP address to advertise
    to the ESP32-CAM via UDP discovery.
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually transmit data; determines the routing interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


class Settings:
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

    # UDP Discovery configuration (ESP32-CAM handshake)
    UDP_LISTEN_PORT: int = int(os.getenv("UDP_LISTEN_PORT", "4210"))
    ESP32_RESPONSE_PORT: int = int(os.getenv("ESP32_RESPONSE_PORT", "4211"))

    # Storage paths
    EVIDENCE_DIR: Path = BASE_DIR / os.getenv("EVIDENCE_DIR", "evidence")
    DATABASE_PATH: Path = BASE_DIR / os.getenv("DATABASE_PATH", "data/intruder.db")

    # Email / SMTP configuration
    SMTP_ENABLED: bool = os.getenv("SMTP_ENABLED", "false").lower() in ("true", "1", "yes")
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASS: str = os.getenv("SMTP_PASS", "")
    ALERT_RECIPIENT: str = os.getenv("ALERT_RECIPIENT", "")
    ALERT_COOLDOWN_SECONDS: int = int(os.getenv("ALERT_COOLDOWN_SECONDS", "60"))

    @property
    def ADVERTISED_IP(self) -> str:
        """Returns the local LAN IP that ESP32 should reach back to."""
        configured = os.getenv("ADVERTISED_IP")
        if configured:
            return configured
        return get_local_ip()


settings = Settings()

# Ensure directories exist
settings.EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
settings.DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
