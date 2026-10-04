#include "web_server_manager.h"
#include "wifi_manager.h"
#include "camera_manager.h"
#include "motion_detector.h"
#include "config.h"
#include <WebServer.h>
#include <WiFiClient.h>
#include <WiFiServer.h>

static WebServer     s_server(HTTP_SERVER_PORT);
static WiFiServer    s_stream_server(STREAM_SERVER_PORT);
static WiFiClient    s_stream_clients[MAX_STREAM_CLIENTS];
static unsigned long s_last_frame_time = 0;

// Render Wi-Fi configuration HTML portal
static void handle_config_page(void) {
  String html = R"rawliteral(
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>ESP32-CAM Wi-Fi</title>

<style>

body {
  font-family: Arial, sans-serif;
  max-width: 500px;
  margin: 40px auto;
  padding: 20px;
}

h1 {
  text-align: center;
}

label {
  display: block;
  margin-top: 20px;
  margin-bottom: 5px;
}

input {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  font-size: 16px;
}

button {
  width: 100%;
  margin-top: 25px;
  padding: 12px;
  font-size: 16px;
}

</style>

</head>

<body>

<h1>ESP32-CAM</h1>

<p>Configuración de Wi-Fi</p>

<form action="/save" method="POST">

<label for="ssid">
SSID
</label>

<input
  type="text"
  id="ssid"
  name="ssid"
  required
>

<label for="password">
Contraseña
</label>

<input
  type="password"
  id="password"
  name="password"
>

<button type="submit">
Guardar y reiniciar
</button>

</form>

</body>

</html>
)rawliteral";

  s_server.send(200, "text/html", html);
}

// Render root landing page with links to stream and capture
static void handle_root(void) {
  if (wifi_is_config_mode()) {
    handle_config_page();
    return;
  }

  String html = R"rawliteral(
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>ESP32-CAM</title>

</head>

<body>

<h1>ESP32-CAM funcionando!</h1>

<p>
<a href="/capture">
Capturar imagen
</a>
</p>

<p>
Stream MJPEG:
</p>

<p>
<a href="http://%IP%:81/stream">
Abrir stream
</a>
</p>

</body>

</html>
)rawliteral";

  html.replace("%IP%", wifi_get_local_ip().toString());
  s_server.send(200, "text/html", html);
}

// Handle Wi-Fi credentials submitted from the configuration portal
static void handle_save_credentials(void) {
  if (!s_server.hasArg("ssid")) {
    s_server.send(400, "text/plain", "Falta el SSID.");
    return;
  }

  String ssid = s_server.arg("ssid");
  String password = s_server.arg("password");

  ssid.trim();

  if (ssid.length() == 0) {
    s_server.send(400, "text/plain", "El SSID no puede estar vacío.");
    return;
  }

  Serial.println();
  Serial.println("Guardando credenciales Wi-Fi...");
  Serial.print("SSID: ");
  Serial.println(ssid);

  wifi_save_credentials(ssid, password);

  s_server.send(
    200,
    "text/html",
    R"rawliteral(
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta name="viewport"
      content="width=device-width, initial-scale=1.0">

<title>ESP32-CAM</title>

</head>

<body>

<h1>Configuración guardada</h1>

<p>
El ESP32-CAM se reiniciará y tratará
de conectarse a la nueva red Wi-Fi.
</p>

</body>

</html>
)rawliteral"
  );

  delay(1500);
  ESP.restart();
}

// Capture and return a single JPEG image still
static void handle_capture(void) {
  camera_fb_t *fb = camera_get_frame();

  if (!fb) {
    s_server.send(500, "text/plain", "Error capturando imagen");
    return;
  }

  WiFiClient client = s_server.client();
  s_server.setContentLength(fb->len);
  s_server.send(200, "image/jpeg", "");

  client.write(fb->buf, fb->len);

  camera_return_frame(fb);
}

// Accept incoming client connection and send initial MJPEG multipart headers
static void accept_stream_clients(void) {
  WiFiClient newClient = s_stream_server.accept();

  if (!newClient) {
    return;
  }

  Serial.println("Nuevo cliente de stream.");

  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (!s_stream_clients[i] || !s_stream_clients[i].connected()) {
      s_stream_clients[i] = newClient;

      streamClientsHeader:
      s_stream_clients[i].println("HTTP/1.1 200 OK");
      s_stream_clients[i].println("Content-Type: multipart/x-mixed-replace; boundary=frame");
      s_stream_clients[i].println("Cache-Control: no-cache");
      s_stream_clients[i].println("Pragma: no-cache");
      s_stream_clients[i].println("Connection: close");
      s_stream_clients[i].println();

      Serial.print("Cliente asignado al slot ");
      Serial.println(i);
      return;
    }
  }

  Serial.println("No hay slots de stream disponibles.");

  newClient.println("HTTP/1.1 503 Service Unavailable");
  newClient.println("Content-Type: text/plain");
  newClient.println();
  newClient.println("Demasiados clientes de stream.");
  newClient.stop();
}

// Disconnect and release closed stream sockets
static void cleanup_stream_clients(void) {
  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (s_stream_clients[i] && !s_stream_clients[i].connected()) {
      Serial.print("Cliente de stream desconectado: ");
      Serial.println(i);
      s_stream_clients[i].stop();
    }
  }
}

// Write JPEG frame to all connected MJPEG stream clients
static void send_frame_to_clients(camera_fb_t *fb) {
  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (s_stream_clients[i] && s_stream_clients[i].connected()) {
      s_stream_clients[i].println("--frame");
      s_stream_clients[i].println("Content-Type: image/jpeg");
      s_stream_clients[i].print("Content-Length: ");
      s_stream_clients[i].println(fb->len);
      s_stream_clients[i].println();

      s_stream_clients[i].write(fb->buf, fb->len);
      s_stream_clients[i].println();
    }
  }
}

void web_server_init(void) {
  s_server.on("/", HTTP_GET, handle_root);
  s_server.on("/capture", HTTP_GET, handle_capture);
  s_server.on("/save", HTTP_POST, handle_save_credentials);

  s_server.begin();
  Serial.printf("Servidor HTTP iniciado en puerto %d.\n", HTTP_SERVER_PORT);

  s_stream_server.begin();
  Serial.printf("Servidor MJPEG iniciado en puerto %d.\n", STREAM_SERVER_PORT);
}

void web_server_handle_client(void) {
  s_server.handleClient();
}

// Stream video frame according to dynamic FPS interval (normal vs high)
void web_server_process_stream(void) {
  accept_stream_clients();
  cleanup_stream_clients();

  bool hasClients = false;

  for (int i = 0; i < MAX_STREAM_CLIENTS; i++) {
    if (s_stream_clients[i] && s_stream_clients[i].connected()) {
      hasClients = true;
      break;
    }
  }

  if (!hasClients) {
    return;
  }

  unsigned long frameInterval = motion_detector_is_change_detected()
    ? HIGH_FRAME_INTERVAL
    : NORMAL_FRAME_INTERVAL;

  if (millis() - s_last_frame_time < frameInterval) {
    return;
  }

  s_last_frame_time = millis();

  camera_fb_t *fb = camera_get_frame();

  if (!fb) {
    Serial.println("Error capturando frame.");
    return;
  }

  send_frame_to_clients(fb);
  camera_return_frame(fb);
}
