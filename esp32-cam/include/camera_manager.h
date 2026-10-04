#pragma once

#include <Arduino.h>
#include "esp_camera.h"

// Camera hardware initialization and PSRAM buffer allocation
bool camera_init(void);
bool camera_init_detection_buffer(void);

// Frame capture and return wrappers
camera_fb_t* camera_get_frame(void);
void camera_return_frame(camera_fb_t* fb);

// Buffer access for visual motion analysis
uint8_t* camera_get_detection_buffer(void);
bool camera_is_detection_buffer_ready(void);
