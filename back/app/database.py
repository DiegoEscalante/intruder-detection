import sqlite3
from contextlib import contextmanager
from app.config import settings


@contextmanager
def get_db():
    """Context manager for thread-safe SQLite connection."""
    conn = sqlite3.connect(str(settings.DATABASE_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Initializes tables and default values."""
    with get_db() as conn:
        cursor = conn.cursor()

        # Settings table (system mode, notification preferences)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)

        # Surveillance time slots (Franjas Horarias)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                days TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1
            );
        """)

        # Event log / Incident history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                reason TEXT NOT NULL,
                image_path TEXT,
                email_sent INTEGER NOT NULL DEFAULT 0,
                details TEXT
            );
        """)

        # Seed default settings if not existing
        defaults = {
            "mode": "away",  # Options: 'away' (Fuera de casa), 'home' (En casa), 'schedule' (Franjas)
            "alert_recipient": settings.ALERT_RECIPIENT,
            "smtp_enabled": "true" if settings.SMTP_ENABLED else "false",
        }
        for k, v in defaults.items():
            cursor.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);",
                (k, v)
            )

        # Seed default night surveillance schedule if table is empty
        cursor.execute("SELECT COUNT(*) as count FROM schedules;")
        if cursor.fetchone()["count"] == 0:
            cursor.execute("""
                INSERT INTO schedules (name, days, start_time, end_time, enabled)
                VALUES (?, ?, ?, ?, ?);
            """, ("Vigilancia Nocturna", "0,1,2,3,4,5,6", "22:00", "06:00", 1))


def get_setting(key: str, default: str = "") -> str:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM settings WHERE key = ?;", (key,))
        row = cursor.fetchone()
        return row["value"] if row else default


def set_setting(key: str, value: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value;",
            (key, value)
        )
