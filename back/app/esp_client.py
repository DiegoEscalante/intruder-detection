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

    async def fetch_snapshot(self, timeout: float = 4.0) -> Optional[bytes]:
        """Fetches a high-resolution snapshot still from ESP32 /capture."""
        if not self.ip:
            return None

        url = f"http://{self.ip}/capture"
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.get(url)
                if res.status_code == 200 and len(res.content) > 0:
                    self.last_seen = datetime.now()
                    return res.content
        except Exception as e:
            print(f"[ESP32Client] Error capturando imagen desde {url}: {e}")
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
