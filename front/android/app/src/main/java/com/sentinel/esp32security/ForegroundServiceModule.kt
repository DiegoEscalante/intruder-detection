package com.sentinel.esp32security

import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ForegroundServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ForegroundServiceModule"

    @ReactMethod
    fun startService(serverHost: String, serverPort: Int, promise: Promise) {
        try {
            Log.d("ForegroundServiceModule", "Solicitud de inicio de Foreground Service: $serverHost:$serverPort")
            val intent = Intent(reactContext, SurveillanceForegroundService::class.java).apply {
                action = SurveillanceForegroundService.ACTION_START
                putExtra("SERVER_HOST", serverHost)
                putExtra("SERVER_PORT", serverPort)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("ForegroundServiceModule", "Error iniciando servicio: ${e.message}", e)
            promise.reject("START_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            Log.d("ForegroundServiceModule", "Solicitud de detención de Foreground Service")
            val intent = Intent(reactContext, SurveillanceForegroundService::class.java).apply {
                action = SurveillanceForegroundService.ACTION_STOP
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("ForegroundServiceModule", "Error deteniendo servicio: ${e.message}", e)
            promise.reject("STOP_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(SurveillanceForegroundService.isRunning)
    }
}
