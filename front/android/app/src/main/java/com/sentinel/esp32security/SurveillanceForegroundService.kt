package com.sentinel.esp32security

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class SurveillanceForegroundService : Service() {

    companion object {
        const val TAG = "SentinelFgService"
        const val ACTION_START = "com.sentinel.esp32security.ACTION_START"
        const val ACTION_STOP = "com.sentinel.esp32security.ACTION_STOP"

        const val CHANNEL_FOREGROUND_ID = "sentinel_foreground_channel"
        const val CHANNEL_ALERTS_ID = "sentinel_alerts_channel"
        const val NOTIFICATION_ID_FOREGROUND = 1001

        @Volatile
        var isRunning = false
            private set
    }

    private var webSocket: WebSocket? = null
    private var okHttpClient: OkHttpClient? = null
    private var shouldReconnect = true
    private var serverHost: String = "10.232.157.38"
    private var serverPort: Int = 8000
    private var reconnectThread: Thread? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopSurveillance()
            return START_NOT_STICKY
        }

        serverHost = intent?.getStringExtra("SERVER_HOST") ?: serverHost
        serverPort = intent?.getIntExtra("SERVER_PORT", serverPort) ?: serverPort

        startSurveillance()
        return START_STICKY
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // 1. Canal persistente para el Foreground Service
            val fgChannel = NotificationChannel(
                CHANNEL_FOREGROUND_ID,
                "🛡️ Estado del Servicio Sentinel",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mantiene el servicio activo en segundo plano en Android 14"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(fgChannel)

            // 2. Canal de Alta Prioridad para Alertas Críticas (Heads-up, sonido, vibración)
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            val alertChannel = NotificationChannel(
                CHANNEL_ALERTS_ID,
                "🚨 Alertas Críticas de Intrusión",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificaciones urgentes de detección de intrusión o presencia humana"
                enableLights(true)
                lightColor = Color.RED
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 200, 300, 200, 500)
                setSound(soundUri, audioAttributes)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager.createNotificationChannel(alertChannel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        return NotificationCompat.Builder(this, CHANNEL_FOREGROUND_ID)
            .setContentTitle("🛡️ Sentinel: Vigilancia en Segundo Plano")
            .setContentText("Supervisando activamente ESP32-CAM ($serverHost:$serverPort)")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setColor(Color.parseColor("#0b1c30"))
            .build()
    }

    private fun startSurveillance() {
        if (isRunning) return
        isRunning = true
        shouldReconnect = true

        val notification = buildForegroundNotification()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID_FOREGROUND,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID_FOREGROUND, notification)
        }

        Log.i(TAG, "Foreground Service iniciado. Conectando WebSocket a ws://$serverHost:$serverPort/ws")

        okHttpClient = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(15, TimeUnit.SECONDS)
            .build()

        connectWebSocket()
    }

    private fun connectWebSocket() {
        if (!shouldReconnect) return

        val wsUrl = "ws://$serverHost:$serverPort/ws"
        val request = Request.Builder().url(wsUrl).build()

        webSocket = okHttpClient?.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.i(TAG, "WebSocket conectado en segundo plano.")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Mensaje WebSocket recibido: $text")
                try {
                    val json = JSONObject(text)
                    val event = json.optString("event")
                    if (event == "alert") {
                        val data = json.optJSONObject("data") ?: JSONObject()
                        val reason = data.optString("reason", "Movimiento detectado en zona vigilada")
                        val timestamp = data.optString("timestamp", "Ahora")
                        val triggerType = data.optString("trigger_type", "motion")
                        val isPerson = triggerType == "person_detected"

                        showIntrusionAlertNotification(
                            title = if (isPerson) "🚨 PERSONA DETECTADA" else "⚠️ INTRUSIÓN CONFIRMADA",
                            message = "$reason • $timestamp"
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parseando mensaje WebSocket: ${e.message}")
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.w(TAG, "Fallo de conexión WebSocket: ${t.message}. Reintentando...")
                scheduleReconnect()
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.i(TAG, "WebSocket cerrado ($code: $reason).")
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect) return
        reconnectThread?.interrupt()
        reconnectThread = Thread {
            try {
                Thread.sleep(5000)
                if (shouldReconnect && isRunning) {
                    Log.i(TAG, "Reintentando conexión WebSocket...")
                    connectWebSocket()
                }
            } catch (ignored: InterruptedException) {}
        }.apply { start() }
    }

    private fun showIntrusionAlertNotification(title: String, message: String) {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val alertNotif = NotificationCompat.Builder(this, CHANNEL_ALERTS_ID)
            .setContentTitle(title)
            .setContentText(message)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(Color.parseColor("#b91c1c"))
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 300, 200, 300, 200, 500))
            .build()

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val alertId = (System.currentTimeMillis() % 100000).toInt()
        notificationManager.notify(alertId, alertNotif)
    }

    private fun stopSurveillance() {
        Log.i(TAG, "Deteniendo Foreground Service...")
        shouldReconnect = false
        isRunning = false

        try {
            webSocket?.close(1000, "Service stopped")
        } catch (ignored: Exception) {}

        reconnectThread?.interrupt()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    override fun onDestroy() {
        stopSurveillance()
        super.onDestroy()
    }
}
