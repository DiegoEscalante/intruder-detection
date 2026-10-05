from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import StreamingResponse
from app.esp_client import esp_client
from app.person_detector import person_detector

router = APIRouter(prefix="/api", tags=["Video Streaming & Capture"])


@router.get("/stream-url")
def get_stream_url():
    """
    Returns the direct MJPEG video stream URL on the ESP32-CAM (port 81)
    for lowest possible latency on the mobile app.
    """
    if not esp_client.ip:
        raise HTTPException(
            status_code=503,
            detail="ESP32-CAM aún no detectado en la red. Esperando descubrimiento UDP..."
        )
    return {
        "esp_ip": esp_client.ip,
        "direct_stream_url": esp_client.stream_url,
        "direct_capture_url": esp_client.capture_url,
        "proxy_stream_url": "/api/stream",
        "proxy_capture_url": "/api/capture"
    }


@router.get("/capture")
async def capture_snapshot():
    """Fetches and serves a fresh still snapshot directly from the ESP32-CAM."""
    if not esp_client.ip:
        raise HTTPException(status_code=503, detail="ESP32-CAM no disponible.")

    image_bytes = await esp_client.fetch_snapshot()
    if not image_bytes:
        raise HTTPException(status_code=502, detail="Error obteniendo imagen desde ESP32-CAM.")

    return Response(content=image_bytes, media_type="image/jpeg")


@router.get("/stream")
async def proxy_mjpeg_stream():
    """
    Proxies the live MJPEG stream from the ESP32-CAM to the client.
    Useful when the client cannot access the ESP32-CAM subnet directly.
    """
    if not esp_client.ip:
        raise HTTPException(status_code=503, detail="ESP32-CAM no disponible para stream.")

    return StreamingResponse(
        esp_client.stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/detect-person")
async def detect_person_now():
    """
    Fetches a live snapshot from ESP32-CAM and runs the Person Detection AI.
    Returns detection results (person_detected, count, labels).
    """
    if not esp_client.ip:
        raise HTTPException(status_code=503, detail="ESP32-CAM no disponible.")

    image_bytes = await esp_client.fetch_snapshot()
    if not image_bytes:
        raise HTTPException(status_code=502, detail="Error obteniendo imagen desde ESP32-CAM.")

    res = person_detector.detect_person(image_bytes)
    return {
        "person_detected": res["person_detected"],
        "count": res["count"],
        "labels": res["labels"]
    }


@router.get("/detect-person/annotated")
async def detect_person_annotated():
    """
    Fetches a live snapshot from ESP32-CAM, runs the Person Detection AI,
    and returns the annotated JPEG image with bounding boxes.
    """
    if not esp_client.ip:
        raise HTTPException(status_code=503, detail="ESP32-CAM no disponible.")

    image_bytes = await esp_client.fetch_snapshot()
    if not image_bytes:
        raise HTTPException(status_code=502, detail="Error obteniendo imagen desde ESP32-CAM.")

    res = person_detector.detect_person(image_bytes)
    return Response(content=res["annotated_bytes"], media_type="image/jpeg")

