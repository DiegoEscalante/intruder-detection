# 🛡️ IoT Intruder Detection System (ESP32-CAM & Mobile Integration)

[![ESP32](https://img.shields.io/badge/Hardware-ESP32--CAM-red.svg)](https://www.espressif.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/Vision-OpenCV%20AI-5C3EE8.svg)](https://opencv.org/)
[![React Native](https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Expo-61DAFB.svg)](https://reactnative.dev/)
[![Kotlin](https://img.shields.io/badge/Android-Foreground%20Service-7F52FF.svg)](https://kotlinlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#licencia)

An end-to-end cyber-physical IoT security system integrating an autonomous **ESP32-CAM** microcontroller, a **Python (FastAPI)** edge gateway with computer vision verification, and a **React Native / Expo** mobile application with native Android foreground services for real-time intrusion monitoring.

---

## 📸 System Overview

```text
  ┌─────────────────┐       UDP Broadcast (4210)       ┌────────────────────────┐
  │                 ├─────────────────────────────────►│                        │
  │    ESP32-CAM    │◄─────────────────────────────────┤   FastAPI Gateway      │
  │ (OV2640 Sensor) │       UDP Unicast (4211)         │  • OpenCV AI Engine    │
  │                 │                                  │  • SQLite & Evidence   │
  │                 │── HTTP POST /event (Motion) ────►│  • SMTP TLS Alerts     │
  │                 │◄── HTTP GET /capture (Still) ────┤  • WebSocket Server    │
  └────────┬────────┘                                  └───────────┬────────────┘
           │                                                       │
           │                                                       │
           │  Direct MJPEG Stream :81/stream                       │  WebSocket /ws
           │  (Ultra-low Latency Socket)                           │  REST API :8000
           ▼                                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                           Mobile Application                                │
  │  • Real-time MJPEG Stream Viewer (HUD telemetry & Fullscreen)               │
  │  • Arming Modes (Away / Home / Schedule)                                    │
  │  • Surveillance Schedules with Midnight Crossing Support                    │
  │  • Android 14 Native Foreground Service & Persistent Notifications          │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 1. 📷 Embedded Edge Firmware (ESP32-CAM / ESP32-S3)
- **Autonomous Video Streaming**: Dedicated TCP port `81` serving multipart MJPEG (`multipart/x-mixed-replace; boundary=frame`) supporting up to 3 concurrent clients.
- **Embedded Visual Motion Detection**: PSRAM-allocated image processing engine that samples a $16 \times 12$ luminance grid and detects frame differences using integer bitwise calculations:
  $$\text{Luminance} = ((77 \cdot R + 150 \cdot G + 29 \cdot B) \gg 8)$$
- **Noise Filter & Dynamic FPS**: 2-stage temporal confirmation window (1.5s) to eliminate false positives, boosting frame rate from ~2 FPS (idle) to ~15 FPS (active intrusion).
- **Fallback Wi-Fi Configuration AP**: Launches a local Access Point (`ESP32-CAM-Setup` at `192.168.50.1`) with a web portal to configure Wi-Fi credentials in non-volatile flash (NVS Preferences).
- **Zero-Config UDP Handshake**: Auto-discovers the companion Python backend on the LAN via UDP broadcast on port `4210`.

### 2. ⚡ Gateway Backend & Computer Vision (FastAPI + OpenCV)
- **Asynchronous Architecture**: Non-blocking ASGI engine with FastAPI and asyncio event loops.
- **AI Person Detection Ensemble**: Secondary verification on intrusion bursts using OpenCV:
  - HOG (Histogram of Oriented Gradients) Pedestrian Descriptor + Linear SVM.
  - Haar Cascades (Full Body, Upper Body, Frontal Face).
  - Non-Maximum Suppression (NMS) to eliminate duplicate bounding boxes.
- **Automated SMTP Email Dispatch**: Sends immediate intrusion alerts with tactical JPEG snapshots attached, timestamped to the exact second, protected by an anti-spam cooldown algorithm.
- **Intelligent Schedule Engine**: Evaluates active surveillance windows, with native support for intervals crossing midnight (e.g., `22:00` to `06:00`).
- **Real-Time WebSocket Push**: Broadcasts live alert events and mode changes to all connected mobile clients.

### 3. 📱 Mobile Application (React Native, Expo & Native Kotlin)
- **Low-Latency Stream Player**: Connects directly to the ESP32 socket (`:81/stream`) with an in-app fallback proxy (`:8000/api/stream`) and automatic reconnect logic (`onerror="retryFeed()"`).
- **Android 14 Foreground Service**: Native Kotlin service (`ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC`) maintaining an active background WebSocket and persistent notification (`setOngoing(true)`), immune to Android Doze Mode and LMK.
- **Critical Heads-Up Notifications**: High-priority alert banner, system alarm audio, and tactical vibration patterns (`[0, 300, 200, 300, 200, 500] ms`).
- **Comprehensive Management UI**: Mode toggle (Away, Home, Schedule), schedule CRUD manager, and photographic evidence history modal.

---

## 📁 Repository Structure

```text
├── back/                           # Python FastAPI Backend & Vision Engine
│   ├── app/
│   │   ├── routes/                 # REST API endpoints (alerts, schedules, system, stream)
│   │   ├── config.py               # Environment configuration loader
│   │   ├── database.py             # SQLite connection & schema initialization
│   │   ├── discovery.py            # UDP broadcast listener & responder
│   │   ├── email_service.py        # Asynchronous SMTP alert dispatcher
│   │   ├── esp_client.py           # HTTP client communicating with ESP32-CAM
│   │   ├── person_detector.py      # OpenCV AI person detection ensemble
│   │   ├── schedule_service.py     # Time-window evaluation & midnight crossing
│   │   ├── surveillance_service.py # Event burst analysis & worker tasks
│   │   └── websocket_manager.py    # WebSocket client pool broadcaster
│   ├── main.py                     # Application entry point & lifespan manager
│   ├── requirements.txt            # Python dependencies
│   ├── .env.example                # Template for environment variables
│   └── README.md                   # Backend documentation
│
├── esp32-cam/                      # C++ Embedded Firmware (PlatformIO / Arduino)
│   ├── include/
│   │   ├── camera_manager.h        # Sensor OV2640 driver & frame buffers
│   │   ├── config.h                # GPIO pins, timings, thresholds & ports
│   │   ├── motion_detector.h       # Edge luminance comparison engine
│   │   ├── python_client.h         # UDP auto-discovery & HTTP webhook client
│   │   ├── web_server_manager.h    # HTTP port 80 & MJPEG port 81 servers
│   │   └── wifi_manager.h          # STA connection, fallback SoftAP & NVS
│   ├── src/                        # Implementation files
│   ├── platformio.ini              # PlatformIO environment config
│   └── README.md                   # Firmware flashing guide
│
├── front/                          # Mobile Application (React Native / Expo)
│   ├── android/                    # Android native project with Kotlin Foreground Service
│   ├── src/
│   │   ├── components/             # Reusable UI components (StreamPlayer, ArmCard, Modals)
│   │   ├── screens/                # Main tabs: HomeScreen, SchedulesScreen, AlertsScreen
│   │   ├── services/               # API, WebSocket, Foreground Service & Notifications
│   │   ├── theme/                  # Tactical design tokens & typography
│   │   └── types/                  # TypeScript interfaces
│   ├── App.tsx                     # Main application layout & lifecycle listener
│   ├── package.json                # Dependencies & scripts
│   └── README.md                   # Frontend documentation
│
├── .env.example                    # Root environment variables template
├── .gitignore                      # Git exclusion rules (secrets, build caches, DBs)
└── README.md                       # Project root documentation (this file)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python**: 3.10, 3.11, or 3.12 installed.
- **Node.js**: v18+ with `npm` installed.
- **Hardware**: AI-Thinker ESP32-CAM (or ESP32-S3 CAM) with FTDI USB-UART programmer.
- **PlatformIO**: VSCode extension or CLI (`pip install platformio`).
- **Expo Go App**: (Optional) For quick mobile testing on Android or iOS.

---

### 2. Firmware Setup (`esp32-cam/`)

1. Open the `esp32-cam/` directory in VSCode with the PlatformIO extension.
2. (Optional) Adjust camera pins in [`esp32-cam/include/config.h`](esp32-cam/include/config.h) if using a custom ESP32-S3 pinout. By default, it is configured for the AI-Thinker pinout.
3. Connect the ESP32-CAM via FTDI programmer (ensure `GPIO 0` is tied to `GND` to enter flash mode).
4. Compile and upload:
   ```bash
   cd esp32-cam
   pio run -t upload
   ```
5. Disconnect `GPIO 0` from `GND`, reset the board, and open the serial monitor:
   ```bash
   pio device monitor -b 115200
   ```
6. **Wi-Fi Provisioning**:
   - If no Wi-Fi credentials are saved, connect to the Wi-Fi network `ESP32-CAM-Setup` (password: `12345678`).
   - Open your browser at `http://192.168.50.1/`.
   - Enter your home/lab Wi-Fi SSID and password, then click **Guardar y reiniciar**.

---

### 3. Backend Setup (`back/`)

1. Navigate to the `back/` folder and create a Python virtual environment:
   ```bash
   cd back
   python -m venv .venv

   # Windows
   .\.venv\Scripts\activate

   # Linux / macOS
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create your local `.env` configuration:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` with your desired configuration:
   ```ini
   SERVER_HOST=0.0.0.0
   SERVER_PORT=8000
   UDP_LISTEN_PORT=4210
   ESP32_RESPONSE_PORT=4211

   # SMTP Configuration (e.g., Gmail with App Password)
   SMTP_ENABLED=true
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_correo@gmail.com
   SMTP_PASS=tu_contraseña_de_aplicacion
   ALERT_RECIPIENT=correo_destinatario@gmail.com
   ALERT_COOLDOWN_SECONDS=60
   ```
5. Run the server:
   ```bash
   python main.py
   ```
   - Interactive Swagger API Docs: `http://localhost:8000/docs`
   - Real-time WebSocket: `ws://localhost:8000/ws`

---

### 4. Mobile App Setup (`front/`)

1. Navigate to the `front/` directory and install packages:
   ```bash
   cd front
   npm install
   ```
2. Start the Expo development server:
   ```bash
   npm start
   ```
3. Open the app on your mobile device:
   - **Expo Go**: Scan the displayed QR code with your camera (iOS) or the Expo Go app (Android).
   - **Native Android APK/Build**: Run `npm run android` with a connected Android device or emulator.
4. **Configure Server IP**:
   - In the mobile app, tap the gear icon (⚙️) in the top-right corner.
   - Enter your computer's LAN IP address (e.g., `http://192.168.1.50:8000`).
   - Tap **Probar Conexión** and then **Guardar y Reconectar**.

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Global system status, surveillance state, ESP32 IP & telemetry |
| `POST` | `/api/mode` | Sets arming mode (`away`, `home`, `schedule`) |
| `GET` | `/api/stream-url` | Direct ESP32 stream URL (`:81`) and fallback proxy URL |
| `GET` | `/api/stream` | Backend proxy for MJPEG stream |
| `GET` | `/api/capture` | Proxies a live still snapshot from ESP32 |
| `GET` | `/api/schedules` | Lists all programmed time windows |
| `POST` | `/api/schedules` | Creates a new surveillance schedule rule |
| `GET` | `/api/alerts` | Paginated incident logs and evidence photos |
| `GET` | `/api/alerts/{id}/image` | Serves high-resolution JPEG evidence |
| `POST` | `/api/test-alert` | Triggers an end-to-end test alert (capture + DB + push + email) |
| `POST` | `/api/esp/wifi` | Remotely reconfigures ESP32 Wi-Fi credentials |
| `WS` | `/ws` | Full-duplex WebSocket push channel for mobile clients |

---

## 🔒 Security Best Practices

- **Never commit `.env` files**: Keep actual SMTP passwords and tokens strictly in local `.env` files.
- **Gmail App Passwords**: Never use your main Google account password; generate a dedicated App Password in [Google Account Security](https://myaccount.google.com/apppasswords).
- **Network Isolation**: In production, place IoT camera devices on a dedicated IoT VLAN or isolated subnet.

---

## 📄 License

This project is licensed under the MIT License — feel free to adapt and build upon it.
