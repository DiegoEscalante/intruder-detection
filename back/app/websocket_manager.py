import json
from typing import List
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Cliente móvil conectado. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WebSocket] Cliente móvil desconectado. Restantes: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict):
        """Sends a JSON message to all active mobile WebSocket subscribers."""
        if not self.active_connections:
            return

        payload = json.dumps({"event": event_type, "data": data})
        stale = []
        for connection in self.active_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                stale.append(connection)

        for s in stale:
            self.disconnect(s)


ws_manager = ConnectionManager()
