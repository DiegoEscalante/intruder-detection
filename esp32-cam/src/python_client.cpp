#include "python_client.h"
#include "config.h"
#include <WiFiUdp.h>
#include <HTTPClient.h>

static WiFiUDP       s_discovery_udp;
static IPAddress     s_python_server_ip;
static uint16_t      s_python_server_port = DEFAULT_PYTHON_PORT;
static bool          s_python_server_known = false;
static unsigned long s_last_discovery = 0;

// Initialize UDP discovery socket on local port
bool python_client_init(void) {
  if (s_discovery_udp.begin(ESP32_DISCOVERY_PORT) != 1) {
    Serial.println("Error iniciando UDP discovery.");
    return false;
  }

  Serial.print("UDP discovery iniciado. Puerto local: ");
  Serial.println(ESP32_DISCOVERY_PORT);
  return true;
}

// Periodically broadcast UDP discovery request to Python server port
void python_client_discover(void) {
  if (s_python_server_known) {
    return;
  }

  if (millis() - s_last_discovery < DISCOVERY_INTERVAL) {
    return;
  }

  s_last_discovery = millis();

  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  IPAddress broadcast = WiFi.broadcastIP();
  const char* message = "PYTHON_DISCOVER";

  Serial.println("Buscando servidor Python...");

  s_discovery_udp.beginPacket(broadcast, PYTHON_DISCOVERY_PORT);
  s_discovery_udp.write((const uint8_t*)message, strlen(message));
  s_discovery_udp.endPacket();
}

// Parse incoming UDP response (format: PYTHON_SERVER:<ip>:<port>)
void python_client_process_discovery(void) {
  if (s_python_server_known) {
    return;
  }

  int packetSize = s_discovery_udp.parsePacket();

  if (packetSize <= 0) {
    return;
  }

  char buffer[100];
  int len = s_discovery_udp.read(buffer, sizeof(buffer) - 1);

  if (len <= 0) {
    return;
  }

  buffer[len] = '\0';
  String message(buffer);

  Serial.print("Discovery recibido: ");
  Serial.println(message);

  if (!message.startsWith("PYTHON_SERVER:")) {
    return;
  }

  String data = message.substring(strlen("PYTHON_SERVER:"));
  int separator = data.indexOf(':');

  if (separator <= 0) {
    return;
  }

  String ip = data.substring(0, separator);
  String port = data.substring(separator + 1);

  IPAddress newIP;

  if (!newIP.fromString(ip)) {
    Serial.println("IP de Python inválida.");
    return;
  }

  s_python_server_ip = newIP;
  s_python_server_port = port.toInt();
  s_python_server_known = true;

  Serial.print("Servidor Python encontrado: ");
  Serial.print(s_python_server_ip);
  Serial.print(":");
  Serial.println(s_python_server_port);
}

// Send HTTP POST event to Python server endpoint when change is confirmed
void python_client_notify_change(void) {
  if (!s_python_server_known) {
    Serial.println("No conozco la IP del servidor Python.");
    Serial.println("El evento no será enviado.");
    return;
  }

  HTTPClient http;
  String url = "http://" + s_python_server_ip.toString() + ":" + String(s_python_server_port) + "/event";

  Serial.println();
  Serial.print("Notificando cambio a Python: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  String body = "{\"type\":\"change_detected\"}";
  int response = http.POST(body);

  Serial.print("Respuesta Python: ");
  Serial.println(response);

  if (response > 0) {
    String responseBody = http.getString();
    Serial.print("Respuesta: ");
    Serial.println(responseBody);
  } else {
    Serial.print("Error conectando con servidor Python: ");
    Serial.println(http.errorToString(response).c_str());
    Serial.println("Reiniciando búsqueda de servidor...");
    s_python_server_known = false;
  }

  http.end();
}

bool python_client_is_server_known(void) {
  return s_python_server_known;
}

IPAddress python_client_get_server_ip(void) {
  return s_python_server_ip;
}

uint16_t python_client_get_server_port(void) {
  return s_python_server_port;
}
