import asyncio
import httpx
from datetime import datetime, timedelta
from typing import Optional, AsyncGenerator


class ESP32Client:
    def __init__(self):
        self.ip: Optional[str] = None
        self.last_seen: Optional[datetime] = None

    def update_seen(self, ip: str):
        self.ip = ip
        self.last_seen = datetime.now()

    @property
    def is_connected(self) -> bool:
        if not self.ip or not self.last_seen:
            return False
        # If seen in the last 15 seconds, consider active
        return datetime.now() - self.last_seen < timedelta(seconds=15)

    @property
    def stream_url(self) -> Optional[str]:
        if self.ip:
            return f"http://{self.ip}:81/stream"
        return None

    @property
    def capture_url(self) -> Optional[str]:
        if self.ip:
            return f"http://{self.ip}/capture"
        return None

    async def fetch_snapshot(self, timeout: float = 8.0, retries: int = 2) -> Optional[bytes]:
        """Fetches a high-resolution snapshot still from ESP32 /capture with retry capability."""
        if not self.ip:
            return None

        url = f"http://{self.ip}/capture"
        for attempt in range(1, retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    res = await client.get(url)
                    if res.status_code == 200 and len(res.content) > 0:
                        self.last_seen = datetime.now()
                        return res.content
                    else:
                        print(f"[ESP32Client] Respuesta inesperada desde {url}: HTTP {res.status_code} ({len(res.content)} bytes)")
            except Exception as e:
                err_desc = f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
                print(f"[ESP32Client] Intento {attempt}/{retries} error capturando imagen desde {url}: {err_desc}")

            if attempt < retries:
                await asyncio.sleep(0.3)

        return None

    async def stream_generator(self) -> AsyncGenerator[bytes, None]:
        """Proxies MJPEG stream chunks from ESP32:81/stream to mobile clients."""
        if not self.ip:
            return

        url = f"http://{self.ip}:81/stream"
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream("GET", url) as response:
                    self.last_seen = datetime.now()
                    async for chunk in response.aiter_bytes():
                        yield chunk
        except Exception as e:
            print(f"[ESP32Client] Stream desconectado o error: {e}")


esp_client = ESP32Client()
