#include "camera_manager.h"
#include "config.h"

// Buffer in PSRAM used for decoding JPEG frames to RGB888 for analysis
static uint8_t* s_detection_buffer = nullptr;
static bool     s_detection_buffer_ready = false;

// Configure camera hardware pins, clock, and frame format
bool camera_init(void) {
  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = CAMERA_XCLK_FREQ_HZ;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = CAMERA_JPEG_QUALITY;
  config.fb_count = CAMERA_FB_COUNT;

  if (psramFound()) {
    config.fb_location = CAMERA_FB_IN_PSRAM;
    config.grab_mode = CAMERA_GRAB_LATEST;
  } else {
    config.fb_location = CAMERA_FB_IN_DRAM;
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  }

  Serial.println("Inicializando cámara...");

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("Error inicializando cámara: 0x%x\n", err);
    return false;
  }

  Serial.println("Cámara OK");
  return true;
}

// Allocate RGB888 working memory in PSRAM (320x240x3 bytes)
bool camera_init_detection_buffer(void) {
  if (!psramFound()) {
    Serial.println("PSRAM no disponible. No se puede crear buffer de detección.");
    return false;
  }

  size_t bufferSize = IMAGE_WIDTH * IMAGE_HEIGHT * 3;
  s_detection_buffer = (uint8_t*)ps_malloc(bufferSize);

  if (!s_detection_buffer) {
    Serial.println("No se pudo reservar buffer de detección.");
    s_detection_buffer_ready = false;
    return false;
  }

  s_detection_buffer_ready = true;
  Serial.println("Buffer de detección creado en PSRAM.");
  return true;
}

camera_fb_t* camera_get_frame(void) {
  return esp_camera_fb_get();
}

void camera_return_frame(camera_fb_t* fb) {
  if (fb) {
    esp_camera_fb_return(fb);
  }
}

uint8_t* camera_get_detection_buffer(void) {
  return s_detection_buffer;
}

bool camera_is_detection_buffer_ready(void) {
  return s_detection_buffer_ready;
}
