# ESP32-CAM Intruder Detection & Streaming System

A lightweight, modular, procedural C-style firmware for the **AI-Thinker ESP32-CAM** board built with PlatformIO (Arduino framework).

---

## Features

- **Visual Motion Detection**: Compares frame luminance across a 16×12 grid in PSRAM. Confirms activity over multiple detections to avoid false positives.
- **Dynamic Framerate**: Streams at a low power/bandwidth frame rate (~2 FPS) under static conditions and automatically boosts to high FPS (~15 FPS) when activity is detected.
- **MJPEG Multi-Client Video Stream**: Dedicated HTTP MJPEG stream server on port `81` supporting up to 3 concurrent clients.
- **Fallback Configuration AP**: If unable to connect to the saved Wi-Fi network, starts an Access Point (`ESP32-CAM-Setup`) with a web portal at `http://192.168.50.1` to configure credentials without re-flashing.
- **Python Backend Discovery & Webhooks**:
  - Broadcasts UDP packets to discover a companion Python server on the local network (ports `4210`/`4211`).
  - Sends HTTP POST notifications to `/event` (`{"type":"change_detected"}`) upon confirmed motion.

---

## Project Structure

```text
├── include/
│   ├── config.h             # All GPIO pinouts, timings, ports, and thresholds
│   ├── camera_manager.h     # Camera hardware and frame buffer interface
│   ├── wifi_manager.h       # Wi-Fi STA, fallback SoftAP, and NVS storage
│   ├── motion_detector.h    # Luminance grid analysis and state machine
│   ├── python_client.h      # UDP discovery and HTTP webhook notifications
│   └── web_server_manager.h # HTTP web server and MJPEG streaming server
├── src/
│   ├── main.cpp             # setup() and loop() orchestration
│   ├── camera_manager.cpp
│   ├── wifi_manager.cpp
│   ├── motion_detector.cpp
│   ├── python_client.cpp
│   └── web_server_manager.cpp
└── platformio.ini           # PlatformIO environment settings (esp32cam)
```

---

## Configuration

All customizable settings are centralized in [`include/config.h`](include/config.h):

- **Pin Assignments**: Camera data and control pins (AI-Thinker pinout by default).
- **Wi-Fi Settings**: Configuration AP SSID (`ESP32-CAM-Setup`), password, and timeouts.
- **Server Ports**: Web server (`80`) and MJPEG stream server (`81`).
- **Detection Parameters**:
  - `DETECTION_INTERVAL`: Check frequency (ms).
  - `CHANGE_CONFIRMATIONS`: Number of consecutive detections required.
  - `CONFIRMATION_WINDOW`: Time window to confirm activity (ms).
  - `MOTION_PERCENT_THRESH`: Minimum percentage of changed grid points.
  - `BRIGHTNESS_DIFF_THRESH`: Luminance difference threshold per sample.

---

## HTTP Endpoints

| URL | Method | Description |
| :--- | :--- | :--- |
| `http://<ESP_IP>/` | `GET` | Web interface / status page (or config portal in AP mode) |
| `http://<ESP_IP>/capture` | `GET` | Captures and returns a single JPEG still |
| `http://<ESP_IP>/save` | `POST` | Saves Wi-Fi credentials to NVS and reboots |
| `http://<ESP_IP>:81/stream` | `GET` | Multipart MJPEG live video stream |

---

## Build & Flash (PlatformIO)

### Compile
```bash
pio run
```

### Upload to ESP32-CAM
Connect your ESP32-CAM via an FTDI / USB-to-UART adapter (ensure `GPIO 0` is connected to `GND` during flashing):
```bash
pio run -t upload
```

### Serial Monitor
```bash
pio device monitor -b 115200
```
