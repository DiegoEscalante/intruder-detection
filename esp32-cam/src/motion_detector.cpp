#include "motion_detector.h"
#include "camera_manager.h"
#include "config.h"
#include "img_converters.h"

static motion_callback_t s_motion_callback = nullptr;
static bool              s_change_detected = false;
static int               s_change_counter = 0;

static unsigned long     s_last_detection = 0;
static unsigned long     s_last_confirmation = 0;
static unsigned long     s_last_high_fps_activity = 0;

static uint8_t           s_previous_brightness[MOTION_GRID_X * MOTION_GRID_Y];
static bool              s_has_previous_frame = false;

// Downsample frame into a 16x12 luminance grid and compare with previous frame
static bool detect_visual_change(camera_fb_t *fb) {
  if (!fb || !camera_is_detection_buffer_ready()) {
    return false;
  }

  uint8_t* detectionBuffer = camera_get_detection_buffer();

  bool converted = fmt2rgb888(
    fb->buf,
    fb->len,
    fb->format,
    detectionBuffer
  );

  if (!converted) {
    Serial.println("Error decodificando JPEG para detección.");
    return false;
  }

  const int GRID_X = MOTION_GRID_X;
  const int GRID_Y = MOTION_GRID_Y;
  int changedPixels = 0;
  int totalPixels = GRID_X * GRID_Y;

  for (int y = 0; y < GRID_Y; y++) {
    for (int x = 0; x < GRID_X; x++) {
      int pixelX = (x * IMAGE_WIDTH) / GRID_X;
      int pixelY = (y * IMAGE_HEIGHT) / GRID_Y;

      int index = (pixelY * IMAGE_WIDTH + pixelX) * 3;

      uint8_t r = detectionBuffer[index];
      uint8_t g = detectionBuffer[index + 1];
      uint8_t b = detectionBuffer[index + 2];

      // Luminance approximation
      uint8_t brightness = ((77 * r) + (150 * g) + (29 * b)) >> 8;
      int sampleIndex = y * GRID_X + x;

      if (s_has_previous_frame) {
        int difference = abs((int)brightness - (int)s_previous_brightness[sampleIndex]);

        if (difference > BRIGHTNESS_DIFF_THRESH) {
          changedPixels++;
        }
      }

      s_previous_brightness[sampleIndex] = brightness;
    }
  }

  s_has_previous_frame = true;

  float changePercentage = ((float)changedPixels / totalPixels) * 100.0f;

  Serial.print("Cambio visual: ");
  Serial.print(changePercentage, 1);
  Serial.println("%");

  return changePercentage >= MOTION_PERCENT_THRESH;
}

void motion_detector_init(motion_callback_t callback) {
  s_motion_callback = callback;
  s_change_detected = false;
  s_change_counter = 0;
  s_last_detection = 0;
  s_last_confirmation = 0;
  s_last_high_fps_activity = 0;
  s_has_previous_frame = false;
  memset(s_previous_brightness, 0, sizeof(s_previous_brightness));
}

bool motion_detector_is_change_detected(void) {
  return s_change_detected;
}

// Check for motion at regular intervals, confirm across window, and update FPS mode
void motion_detector_process(void) {
  if (millis() - s_last_detection < DETECTION_INTERVAL) {
    return;
  }

  s_last_detection = millis();

  camera_fb_t *fb = camera_get_frame();
  if (!fb) {
    Serial.println("Error capturando frame para detección.");
    return;
  }

  bool visualChange = detect_visual_change(fb);
  camera_return_frame(fb);

  if (visualChange) {
    if (s_change_counter == 0) {
      s_change_counter = 1;
      s_last_confirmation = millis();
      Serial.println("Actividad detectada. Confirmación 1/2");
    } else if (millis() - s_last_confirmation <= CONFIRMATION_WINDOW) {
      s_change_counter++;
      Serial.printf("Actividad detectada. Confirmación %d/2\n", s_change_counter);

      // Confirm activity if consecutive detections occur within window
      if (s_change_counter >= CHANGE_CONFIRMATIONS) {
        s_change_detected = true;
        s_last_high_fps_activity = millis();

        Serial.println(">>> CAMBIO CONFIRMADO <<<");
        Serial.println("Aumentando FPS del stream.");

        if (s_motion_callback) {
          s_motion_callback();
        }

        s_change_counter = 0;
      }
    }
  }

  // Reset confirmation counter if window expired
  if (s_change_counter > 0 && millis() - s_last_confirmation > CONFIRMATION_WINDOW) {
    s_change_counter = 0;
    Serial.println("Confirmación expirada.");
  }

  // Return to normal FPS after inactivity period
  if (s_change_detected) {
    if (visualChange) {
      s_last_high_fps_activity = millis();
    }

    if (millis() - s_last_high_fps_activity >= HIGH_FPS_DURATION) {
      s_change_detected = false;
      Serial.println("Sin actividad reciente.");
      Serial.println("Volviendo a FPS normal.");
    }
  }
}
