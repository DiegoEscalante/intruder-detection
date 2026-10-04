#pragma once

#include <Arduino.h>

// Web endpoints and MJPEG streaming server lifecycle
void web_server_init(void);
void web_server_handle_client(void);
void web_server_process_stream(void);
