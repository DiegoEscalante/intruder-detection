#pragma once

#include <Arduino.h>

// =====================================================
// CÁMARA — PINES (AI-THINKER ESP32-CAM)
// =====================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// =====================================================
// CÁMARA — PARÁMETROS DE IMAGEN
// =====================================================
constexpr uint32_t CAMERA_XCLK_FREQ_HZ = 20000000;
constexpr int      CAMERA_JPEG_QUALITY = 12;
constexpr int      CAMERA_FB_COUNT     = 2;
constexpr int      IMAGE_WIDTH         = 320;
constexpr int      IMAGE_HEIGHT        = 240;

// =====================================================
// WI-FI & ACCESS POINT DE CONFIGURACIÓN
// =====================================================
constexpr const char* CONFIG_AP_SSID       = "ESP32-CAM-Setup";
constexpr const char* CONFIG_AP_PASSWORD   = "12345678";
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 10000;

// =====================================================
// PUERTOS DE SERVIDORES WEB Y STREAM
// =====================================================
constexpr uint16_t HTTP_SERVER_PORT = 80;
constexpr uint16_t STREAM_SERVER_PORT = 81;
constexpr int MAX_STREAM_CLIENTS = 3;

// =====================================================
// DETECCIÓN DE MOVIMIENTO / CAMBIO VISUAL
// =====================================================
constexpr unsigned long DETECTION_INTERVAL      = 300;   // Intervalo de comprobación (ms)
constexpr int           CHANGE_CONFIRMATIONS    = 2;     // Detecciones consecutivas para confirmar
constexpr unsigned long CONFIRMATION_WINDOW     = 1500;  // Ventana máxima para confirmar (ms)
constexpr unsigned long HIGH_FPS_DURATION       = 5000;  // Tiempo en FPS alto tras actividad (ms)
constexpr unsigned long NORMAL_FRAME_INTERVAL   = 500;   // Intervalo entre frames normal (ms)
constexpr unsigned long HIGH_FRAME_INTERVAL     = 67;    // Intervalo entre frames en alta actividad (ms)

constexpr int           MOTION_GRID_X           = 16;    // Columnas de la cuadrícula de muestreo
constexpr int           MOTION_GRID_Y           = 12;    // Filas de la cuadrícula de muestreo
constexpr int           BRIGHTNESS_DIFF_THRESH  = 15;    // Umbral de diferencia de luminosidad por punto
constexpr float         MOTION_PERCENT_THRESH   = 6.0f;  // Porcentaje mínimo de puntos cambiados

// =====================================================
// DESCUBRIMIENTO DEL SERVIDOR PYTHON
// =====================================================
constexpr uint16_t      PYTHON_DISCOVERY_PORT   = 4210;  // Puerto donde escucha Python
constexpr uint16_t      ESP32_DISCOVERY_PORT    = 4211;  // Puerto UDP local de respuesta
constexpr unsigned long DISCOVERY_INTERVAL      = 3000;  // Intervalo de búsqueda periódica (ms)
constexpr uint16_t      DEFAULT_PYTHON_PORT     = 8000;  // Puerto HTTP por defecto de Python

