#pragma once

#include <Arduino.h>
#include <WiFi.h>

// UDP discovery and HTTP event notifications for Python backend
bool      python_client_init(void);
void      python_client_discover(void);
void      python_client_process_discovery(void);
void      python_client_notify_change(void);

// Python server status
bool      python_client_is_server_known(void);
IPAddress python_client_get_server_ip(void);
uint16_t  python_client_get_server_port(void);
