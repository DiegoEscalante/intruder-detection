# Sentinel IoT — Capa Móvil (Expo SDK 57 & TypeScript)

Aplicación móvil desarrollada en **React Native / Expo SDK 57** con **TypeScript**, basada en el sistema de diseño **Sentinel: ESP32 Security App** de Stitch. Integra monitorización en tiempo real del sensor **ESP32-S3 CAM**, programación de franjas horarias de seguridad, control de armado/desarmado y despacho automatizado de alertas de intrusión mediante **WebSockets** y **REST API (FastAPI)**.

---

## 📱 Módulos y Arquitectura Técnica

### 1. Visor de Video en Tiempo Real (Streaming & Concurrencia)
- **Player MJPEG nativo en 4:3**: Conexión directa al socket TCP del microcontrolador (`http://<esp_ip>:81/stream`) para latencia ultra-baja en red local, con conmutación dinámica al proxy del backend (`http://<backend_ip>:8000/api/stream`).
- **HUD Overlays en vivo**: Indicador "EN VIVO" con ping animado, telemetría de tasa de cuadros (25 FPS), reloj GMT local y controles de pantalla completa y reconexión.
- **Reconexión Automática**: Manejador de fallos de red con reintentos programados si la señal Wi-Fi sufre micro-cortes.

### 2. Gestión de Estados y Ciclo de Vida Móvil (Foreground / Background)
- **AppState Lifecycle Awareness**: La app escucha activamente las transiciones de estado (`active`, `background`, `inactive`). Al volver a primer plano, sincroniza automáticamente el estado de la cámara y reconecta el canal de WebSockets.
- **Canal Push WebSocket (`/ws`)**: Conexión no bloqueante con *heartbeat ping/pong* (cada 15s) para recibir eventos críticos de intrusión en milisegundos sin sobrecargar al microcontrolador con sondeos continuos (*polling*).

### 3. Automatización, Franjas Horarias y Alertas Críticas
- **Control de Armado**: Selector de modo (`away` Fuera de casa, `home` Desarmado, `schedule` Automático por franjas horarias).
- **Programador de Franjas**: Creación, edición, activación y eliminación de horarios semanales con soporte para **cruce de medianoche** (ej. 22:00 a 06:00).
- **Inspección de Evidencia Fotográfica**: Galería y modal de detalle para visualizar la evidencia capturada por el ESP32 en el momento exacto del movimiento, con telemetría de sensor, modo activo y confirmación de envío de correo SMTP con protección anti-spam (*cooldown*).

---

## 🚀 Puesta en Marcha

### 1. Instalar dependencias
```bash
cd front
npm install
```

### 2. Iniciar el servidor de desarrollo Expo
```bash
npm start
# O para abrir directamente en Android:
npm run android
```

### 3. Conectar con el Backend
Al abrir la app, pulsa el ícono de engranaje superior derecho para configurar la IP de tu servidor FastAPI (por defecto configurado a `http://10.162.220.76:8000`).
Dispones de un botón de prueba de conexión y un disparador manual de alertas para demostración evaluativa.

---

## 🎓 Guía para la Defensa Técnica (5 Preguntas Aleatorias)

1. **¿Cómo se coordinan el ESP32, el Backend y la App?**
   El ESP32 se anuncia por **UDP broadcast** (puerto 4210). Python responde y descubre la IP del sensor. El stream de video corre sobre un socket **TCP :81** en formato MJPEG (*multipart/x-mixed-replace*). Las alertas se envían vía **HTTP POST /event** al backend, el backend toma la captura fotográfica del ESP32 por **HTTP GET /capture**, guarda la evidencia en SQLite y la transmite por **WebSocket /ws** a la app móvil en tiempo real.

2. **¿Por qué la app y el backend no se congelan al transmitir video o correos?**
   El backend corre sobre arquitectura asíncrona **ASGI/asyncio**. Las tareas pesadas como el socket SMTP o el guardado en disco se ejecutan en **hilos secundarios (`BackgroundTasks`)**. En la app móvil, el streaming MJPEG corre en un hilo de renderizado dedicado y las alertas llegan de forma asíncrona por WebSocket sin bloquear la interfaz de usuario.

3. **¿Cómo funciona el cruce de medianoche en las franjas horarias?**
   Si una franja va de 22:00 a 06:00 (`start > end`), no se puede usar `start <= hora <= end`. Se evalúa la disyunción: la franja está activa si la hora actual es **≥ 22:00 O ≤ 06:00**, permitiendo vigilancia nocturna sin interrupciones a las 00:00.

4. **¿Cómo se evita saturar la bandeja de correo ante movimiento continuo?**
   Se utiliza un mecanismo de **Rate Limiting / Cooldown** en memoria (`ALERT_COOLDOWN_SECONDS`, 60s por defecto). Durante el cooldown, las alertas se siguen registrando en la base de datos y notificando a la app móvil, pero el envío de correos SMTP se silencia temporalmente.
