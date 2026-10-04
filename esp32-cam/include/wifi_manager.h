#pragma once

#include <Arduino.h>
#include <WiFi.h>

// Wi-Fi connection and fallback Access Point
bool      wifi_init(void);
bool      wifi_connect(void);
void      wifi_start_config_ap(void);

// Connection status
bool      wifi_is_config_mode(void);
bool      wifi_is_connected(void);

// NVS persistent credentials
bool      wifi_load_credentials(String &ssid, String &password);
void      wifi_save_credentials(const String &ssid, const String &password);

// Network information
IPAddress wifi_get_local_ip(void);
IPAddress wifi_get_soft_ap_ip(void);
int       wifi_get_rssi(void);
