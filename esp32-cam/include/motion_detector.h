#pragma once

#include <Arduino.h>

// Callback signature when motion is confirmed
typedef void (*motion_callback_t)(void);

// Motion detector lifecycle and state queries
void motion_detector_init(motion_callback_t callback);
void motion_detector_process(void);
bool motion_detector_is_change_detected(void);
