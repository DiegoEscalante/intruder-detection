#include <Arduino.h>
#include "config.h"
#include "camera_manager.h"
#include "wifi_manager.h"
#include "motion_detector.h"
#include "python_client.h"
#include "web_server_manager.h"

void setup() {
  Serial.begin(115200);
  delay(2000);

  Serial.println();
  Serial.println("==============================");
  Serial.println("ESP32-CAM IoT");
  Serial.println("==============================");

  // Initialize camera sensor and allocation buffer
  if (!camera_init()) {
    Serial.println("No se pudo iniciar la cámara.");
    return;
  }
  camera_init_detection_buffer();

  // Connect to Wi-Fi or fall back to configuration AP
  bool connected = wifi_init();
  if (!connected) {
    wifi_start_config_ap();
  }

  // Bind motion confirmation directly to Python event notification
  motion_detector_init(python_client_notify_change);

  // Start HTTP and MJPEG streaming servers
  web_server_init();

  // Begin Python discovery only in normal network mode
  if (!wifi_is_config_mode()) {
    python_client_init();
  }

  // Print operational URLs
  Serial.println();
  if (wifi_is_config_mode()) {
    Serial.println("Modo configuración activo.");
    Serial.println("Conéctate al AP y abre:");
    Serial.println("http://192.168.50.1/");
  } else {
    Serial.println("Modo normal activo.");
    Serial.print("Web: http://");
    Serial.print(wifi_get_local_ip());
    Serial.println("/");

    Serial.print("Stream: http://");
    Serial.print(wifi_get_local_ip());
    Serial.println(":81/stream");

    Serial.print("Capture: http://");
    Serial.print(wifi_get_local_ip());
    Serial.println("/capture");
  }
}

void loop() {
  // Handle HTTP requests (/ , /capture, /save)
  web_server_handle_client();

  // Service MJPEG streaming clients with dynamic FPS
  web_server_process_stream();

  // Analyze visual changes and handle confirmation window
  motion_detector_process();

  // Discover Python server and process discovery replies
  python_client_discover();
  python_client_process_discovery();
}
