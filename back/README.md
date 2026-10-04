# Backend de Detección de Intrusos IoT (ESP32-CAM & Mobile Gateway)

Servidor intermedio desarrollado en **Python (FastAPI)** para orquestar la comunicación entre el microcontrolador **ESP32-CAM** y la **Aplicación Móvil**, gestionando el descubrimiento de red, almacenamiento de evidencia fotográfica, franjas horarias de vigilancia y despacho automatizado de alertas críticas por correo electrónico y WebSockets.

---

## 🚀 Inicio Rápido

### 1. Activar el entorno virtual e instalar dependencias
```bash
# En la carpeta back/
.\.venv\Scripts\activate

# Si no están instaladas:
pip install -r requirements.txt
```

### 2. Configurar variables de entorno (`.env`)
Edita el archivo `.env` para configurar tu correo de notificaciones (por ejemplo Gmail con contraseña de aplicación):
```ini
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
UDP_LISTEN_PORT=4210
ESP32_RESPONSE_PORT=4211

SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_correo@gmail.com
SMTP_PASS=tu_app_password
ALERT_RECIPIENT=correo_del_propietario@gmail.com
ALERT_COOLDOWN_SECONDS=60
```

### 3. Iniciar el servidor
```bash
python main.py
```
O con Uvicorn directamente:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- Documentación interactiva Swagger: **http://localhost:8000/docs**
- Panel de estado JSON: **http://localhost:8000/api/status**
- Canal WebSocket en tiempo real: **ws://localhost:8000/ws**

---

## 📐 Arquitectura del Sistema

```text
  [ ESP32-CAM ]                               [ Backend Python (FastAPI) ]                  [ App Móvil ]
        |                                                  |                                      |
        |--- 1. UDP Broadcast "PYTHON_DISCOVER" (4210) --->|                                      |
        |<-- 2. UDP Unicast "PYTHON_SERVER:<IP>:<PORT>" ---|                                      |
        |                                                  |                                      |
        |                                                  |<====== 3. Conexión WebSocket /ws ====|
        |                                                  |<====== 4. GET /api/status ===========|
        |                                                  |<====== 5. POST /api/mode (Away) =====|
        |                                                  |                                      |
  [ Movimiento ]                                           |                                      |
        |--- 6. HTTP POST /event {"type":"change_"} ------>|                                      |
        |                                                  |--- 7. Evaluar Franja Horaria / Modo  |
        |<-- 8. GET /capture (Descargar Snapshot JPEG) ----|                                      |
        |                                                  |--- 9. Guardar Evidencia en Disco     |
        |                                                  |--- 10. Insertar Alerta en SQLite    |
        |                                                  |--- 11. Push Alerta por WebSocket --->| (Notificación móvil)
        |                                                  |--- 12. Enviar Email con Evidencia -->| (Bandeja del dueño)
        |                                                  |                                      |
        |<================= 13. Stream MJPEG Directo :81/stream (o vía Proxy /api/stream) ========| (Visor baja latencia)
```

---

## 📡 API Endpoints para la Aplicación Móvil

### 1. Estado y Control del Sistema
- `GET /api/status`: Devuelve el modo actual (`away`, `home`, `schedule`), si la vigilancia está activa, estado de conexión del ESP32, IP, URL de stream y total de alertas.
- `POST /api/mode`: Cambia el modo de armado.
  ```json
  { "mode": "away" }      // "Fuera de casa" (Armado forzoso)
  { "mode": "home" }      // "En casa" (Desarmado)
  { "mode": "schedule" }  // Según franjas horarias configuradas
  ```
- `POST /api/test-alert`: Dispara una alerta de prueba manual (captura foto, guarda en BD, envía email y emite por WebSocket).

### 2. Franjas Horarias (Surveillance Schedules)
- `GET /api/schedules`: Lista todas las franjas horarias configuradas.
- `POST /api/schedules`: Crea una nueva franja horaria.
  ```json
  {
    "name": "Vigilancia Noche",
    "days": [0, 1, 2, 3, 4, 5, 6],
    "start_time": "22:00",
    "end_time": "06:00",
    "enabled": true
  }
  ```
  > **Nota**: El sistema soporta automáticamente franjas que cruzan la medianoche (ej. de 22:00 a 06:00 del día siguiente).
- `PUT /api/schedules/{id}`: Actualiza o habilita/deshabilita una franja.
- `DELETE /api/schedules/{id}`: Elimina una franja.

### 3. Historial de Incidentes y Evidencia
- `GET /api/alerts?limit=50&offset=0`: Lista el historial de alertas con fecha, motivo, estado de correo y URL de foto.
- `GET /api/alerts/{id}/image`: Descarga o visualiza la foto JPEG tomada durante la intrusión.
- `DELETE /api/alerts/{id}`: Elimina el registro y su archivo del disco.

### 4. Video en Vivo y Capturas
- `GET /api/stream-url`: Devuelve la URL directa del ESP32 (`http://<esp_ip>:81/stream`) para visualización con latencia mínima en la app.
- `GET /api/stream`: Proxy del flujo MJPEG (útil si la app móvil y el ESP32 están en subredes distintas).
- `GET /api/capture`: Toma una captura instantánea en tiempo real del sensor de la cámara.

### 5. WebSocket en Tiempo Real (`ws://<IP>:8000/ws`)
La aplicación móvil debe mantener una conexión a este socket (en su Foreground Service). Los eventos emitidos en formato JSON son:
- `alert`: Alerta de intrusión confirmada con evidencia fotográfica.
- `mode_changed`: Actualización del modo de vigilancia ("away", "home", "schedule").
- `esp32_status`: Notificación de conexión o cambio de IP del ESP32-CAM.

---

## 🎓 Guía para la Defensa Técnica y Preguntas de Evaluación

Para la sustentación oral frente al docente (calificación con escala 0% - 50% - 100%), repasa estos conceptos clave implementados en el código:

### 1. ¿Por qué se utiliza UDP para el descubrimiento del ESP32 en lugar de HTTP?
* **Respuesta técnica**: El microcontrolador ESP32-CAM no conoce la dirección IP local de la computadora donde corre el backend tras conectarse al router por DHCP. El protocolo UDP permite enviar paquetes de **Broadcast** a la dirección `255.255.255.255` o `broadcastIP()` sin necesidad de conocer previamente la IP de destino ni establecer un handshake TCP. El backend escucha en el puerto `4210` y responde de vuelta a la IP de origen en el puerto `4211` con su IP y puerto HTTP (`PYTHON_SERVER:<ip>:<port>`).

### 2. ¿Cómo maneja el backend la concurrencia entre el streaming de video, las alertas y la API móvil?
* **Respuesta técnica**: FastAPI está construido sobre **ASGI (Starlette)** y **Uvicorn**, utilizando el bucle de eventos asíncrono `asyncio`. Las operaciones de E/S de red (como WebSockets y peticiones HTTP) son no bloqueantes (`async/await`). Para operaciones potencialmente bloqueantes o sincrónicas (como la conexión SMTP de correo o la escucha en el socket UDP), se delegan a un hilo secundario mediante `asyncio.to_thread` o hilos daemon de `threading`, garantizando que el streaming y las respuestas a la app móvil mantengan baja latencia sin congelar el servidor.

### 3. ¿Cómo funciona la lógica de franjas horarias nocturnas que cruzan la medianoche?
* **Respuesta técnica**: Cuando una franja tiene `start_time > end_time` (por ejemplo, `22:00` a `06:00`), no se puede comparar con un simple `start <= actual <= end`. El servicio `app/schedule_service.py` descompone la condición:
  1. Si `hora_actual >= start_time`, la vigilancia comenzó hoy por la noche y el día de la semana actual debe estar activo.
  2. Si `hora_actual <= end_time`, la vigilancia comenzó ayer por la noche y concluye esta mañana; por lo tanto, se verifica si el día de ayer (`(weekday - 1) % 7`) estaba habilitado en la regla.

### 4. ¿Cómo se previene el spam o saturación de correos ante movimiento continuo del intruso?
* **Respuesta técnica**: Se implementa un mecanismo de **Cooldown / Rate Limiting** mediante la variable `ALERT_COOLDOWN_SECONDS` (por defecto 60 segundos). Cada vez que se despacha un correo exitosamente, se almacena una marca de tiempo en memoria (`_last_email_sent_time`). Si el sensor ESP32 reporta más actividad visual antes de que expire el cooldown, el incidente se registra en la base de datos SQLite y se notifica por WebSocket a la app móvil, pero el envío de correo SMTP se omite temporalmente.

### 5. ¿Cuál es la diferencia entre el stream directo del ESP32 y el endpoint `/api/stream` de este backend?
* **Respuesta técnica**: 
  - **Stream directo (`http://<esp_ip>:81/stream`)**: La app móvil se conecta directamente al socket TCP del ESP32. Produce la menor latencia posible y libera de consumo de ancho de banda al servidor Python.
  - **Proxy del backend (`http://<backend_ip>:8000/api/stream`)**: El backend consume los fragmentos JPEG del ESP32 mediante un generador asíncrono (`StreamingResponse`) y los retransmite a la app móvil. Es útil como túnel cuando el dispositivo móvil se encuentra fuera de la red local o cuando no tiene ruta directa hacia la IP del microcontrolador.
