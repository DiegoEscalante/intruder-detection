import socket
import threading
import time
import asyncio
from app.config import settings
from app.esp_client import esp_client
from app.websocket_manager import ws_manager

_discovery_thread: threading.Thread | None = None
_running: bool = False


def _udp_discovery_loop(loop: asyncio.AbstractEventLoop):
    global _running

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        sock.bind(("0.0.0.0", settings.UDP_LISTEN_PORT))
        sock.settimeout(1.0)
        print(f"[UDP Discovery] Escuchando solicitudes en puerto UDP {settings.UDP_LISTEN_PORT}...")
    except Exception as e:
        print(f"[UDP Discovery] Error vinculando socket UDP en puerto {settings.UDP_LISTEN_PORT}: {e}")
        return

    while _running:
        try:
            data, addr = sock.recvfrom(512)
            message = data.decode("utf-8", errors="ignore").strip()

            if message == "PYTHON_DISCOVER":
                esp_ip = addr[0]
                esp_client.update_seen(esp_ip)

                # Format response expected by ESP32: PYTHON_SERVER:<ip>:<port>
                advertised_ip = settings.ADVERTISED_IP
                response_str = f"PYTHON_SERVER:{advertised_ip}:{settings.SERVER_PORT}"

                # Send directly to ESP32 response port (4211)
                sock.sendto(response_str.encode("utf-8"), (esp_ip, settings.ESP32_RESPONSE_PORT))

                # Notify connected mobile devices via WebSocket
                if loop and loop.is_running():
                    asyncio.run_coroutine_threadsafe(
                        ws_manager.broadcast("esp32_status", {
                            "connected": True,
                            "ip": esp_ip,
                            "stream_url": esp_client.stream_url
                        }),
                        loop
                    )
        except socket.timeout:
            continue
        except Exception as e:
            if _running:
                print(f"[UDP Discovery] Excepción en bucle UDP: {e}")
                time.sleep(0.5)

    sock.close()
    print("[UDP Discovery] Servicio de descubrimiento UDP detenido.")


def start_discovery_service(loop: asyncio.AbstractEventLoop):
    """Starts the background UDP discovery listener."""
    global _discovery_thread, _running
    if _discovery_thread and _discovery_thread.is_alive():
        return

    _running = True
    _discovery_thread = threading.Thread(
        target=_udp_discovery_loop,
        args=(loop,),
        daemon=True,
        name="UDP-Discovery-Worker"
    )
    _discovery_thread.start()


def stop_discovery_service():
    """Stops the background UDP discovery listener."""
    global _running
    _running = False
