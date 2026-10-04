import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db
from app.discovery import start_discovery_service, stop_discovery_service
from app.websocket_manager import ws_manager
from app.routes import esp_events, schedules, alerts, system, stream


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    print("=" * 60)
    print("🚀 INICIANDO BACKEND DE DETECCIÓN DE INTRUSOS IoT (ESP32-CAM)")
    print("=" * 60)

    # 1. Initialize SQLite Database & initial records
    init_db()
    print(f"[Database] Base de datos lista en {settings.DATABASE_PATH}")

    # 2. Start UDP Discovery thread for automatic ESP32 pairing
    loop = asyncio.get_running_loop()
    start_discovery_service(loop)
    print(f"[Network] IP de anuncio local: {settings.ADVERTISED_IP}")
    print(f"[Network] Servidor HTTP listo en http://{settings.SERVER_HOST}:{settings.SERVER_PORT}")
    print(f"[Documentation] Documentación Swagger disponible en /docs")
    print("=" * 60)

    yield

    # Shutdown logic
    stop_discovery_service()
    print("[Shutdown] Servidor detenido de manera ordenada.")


app = FastAPI(
    title="IoT Intruder Detection Backend",
    description="Servidor de integración entre ESP32-CAM y Aplicación Móvil con streaming, franjas horarias y alertas críticas.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for mobile development frameworks (React Native, Flutter, Kotlin, Swift)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(esp_events.router)
app.include_router(system.router)
app.include_router(schedules.router)
app.include_router(alerts.router)
app.include_router(stream.router)


@app.get("/", tags=["General"])
def root():
    return {
        "app": "IoT Intruder Detection System",
        "version": "2.0.0",
        "docs_url": "/docs",
        "websocket_url": "/ws",
        "status_endpoint": "/api/status"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for mobile clients to receive real-time push events:
    - new intrusion alerts
    - mode toggles
    - ESP32 connect/disconnect status
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            text = await websocket.receive_text()
            if text == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.SERVER_HOST, port=settings.SERVER_PORT, reload=True)
