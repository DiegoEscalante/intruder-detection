#include "wifi_manager.h"
#include "config.h"
#include <Preferences.h>

static Preferences s_preferences;
static bool        s_configuration_mode = false;

// Read stored Wi-Fi credentials from non-volatile storage
bool wifi_load_credentials(String &ssid, String &password) {
  s_preferences.begin("wifi", true);
  ssid = s_preferences.getString("ssid", "");
  password = s_preferences.getString("password", "");
  s_preferences.end();

  if (ssid.length() == 0) {
    Serial.println("No hay credenciales Wi-Fi guardadas.");
    return false;
  }

  Serial.println("Credenciales Wi-Fi encontradas.");
  return true;
}

// Persist new Wi-Fi credentials into non-volatile storage
void wifi_save_credentials(const String &ssid, const String &password) {
  s_preferences.begin("wifi", false);
  s_preferences.putString("ssid", ssid);
  s_preferences.putString("password", password);
  s_preferences.end();
}

// Attempt connection to the saved AP within timeout
bool wifi_connect(void) {
  String ssid;
  String password;

  if (!wifi_load_credentials(ssid, password)) {
    return false;
  }

  Serial.println();
  Serial.println("Intentando conectar a Wi-Fi...");
  Serial.print("SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());

  const unsigned long timeout = WIFI_CONNECT_TIMEOUT_MS;
  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startTime < timeout) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi conectado.");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    return true;
  }

  Serial.println("No se pudo conectar a Wi-Fi.");
  WiFi.disconnect(true);
  return false;
}

bool wifi_init(void) {
  return wifi_connect();
}

// Launch fallback AP for credential configuration
void wifi_start_config_ap(void) {
  s_configuration_mode = true;

  Serial.println();
  Serial.println("==============================");
  Serial.println("MODO CONFIGURACIÓN WI-FI");
  Serial.println("==============================");

  WiFi.mode(WIFI_AP);

  IPAddress localIP(192, 168, 50, 1);
  IPAddress gateway(192, 168, 50, 1);
  IPAddress subnet(255, 255, 255, 0);

  WiFi.softAPConfig(localIP, gateway, subnet);

  bool result = WiFi.softAP(CONFIG_AP_SSID, CONFIG_AP_PASSWORD);

  if (!result) {
    Serial.println("Error creando Access Point.");
    return;
  }

  Serial.println();
  Serial.println("Access Point iniciado.");
  Serial.print("SSID: ");
  Serial.println(CONFIG_AP_SSID);
  Serial.print("Password: ");
  Serial.println(CONFIG_AP_PASSWORD);
  Serial.print("IP: ");
  Serial.println(WiFi.softAPIP());
}

bool wifi_is_config_mode(void) {
  return s_configuration_mode;
}

bool wifi_is_connected(void) {
  return WiFi.status() == WL_CONNECTED;
}

IPAddress wifi_get_local_ip(void) {
  return WiFi.localIP();
}

IPAddress wifi_get_soft_ap_ip(void) {
  return WiFi.softAPIP();
}

int wifi_get_rssi(void) {
  return WiFi.RSSI();
}
