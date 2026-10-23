package com.sms.gateway.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.sms.gateway.App
import com.sms.gateway.R
import com.sms.gateway.network.SocketManager
import com.sms.gateway.ui.MainActivity

class GatewayForegroundService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var isObservingConnection = false

    private val connectionStateObserver = androidx.lifecycle.Observer<SocketManager.ConnectionState> { state ->
        val statusText = when (state) {
            SocketManager.ConnectionState.CONNECTED -> "🟢 ऑनलाइन - 24x7 एक्टिव (स्क्रीन लॉक में भी कनेक्टेड)"
            SocketManager.ConnectionState.CONNECTING -> "🟡 कनेक्ट हो रहा है..."
            SocketManager.ConnectionState.DISCONNECTED, null -> "🔴 रीकनेक्टिंग... पुनः कनेक्ट किया जा रहा है"
        }
        updateNotification(statusText)
    }

    companion object {
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.sms.gateway.action.START"
        const val ACTION_STOP = "com.sms.gateway.action.STOP"

        fun startService(context: Context) {
            val intent = Intent(context, GatewayForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, GatewayForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        acquireWakeAndWifiLocks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val app = applicationContext as App

        if (intent?.action == ACTION_STOP) {
            app.preferences.isServiceEnabled = false
            app.socketManager.disconnect()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            return START_NOT_STICKY
        }

        app.preferences.isServiceEnabled = true

        val notification = buildNotification("सर्वर से कनेक्ट हो रहा है...")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // Start WebSocket connection
        app.socketManager.connect()

        // Observe connection state to update notification
        if (!isObservingConnection) {
            app.socketManager.connectionState.observeForever(connectionStateObserver)
            isObservingConnection = true
        }

        return START_STICKY
    }

    private fun buildNotification(statusText: String): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, GatewayForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, App.CHANNEL_ID)
            .setContentTitle("ERS mobile SMS")
            .setContentText(statusText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "बंद करें", stopPendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun updateNotification(statusText: String) {
        val notification = buildNotification(statusText)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        manager.notify(NOTIFICATION_ID, notification)
    }

    private fun acquireWakeAndWifiLocks() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "ERSSMS::GatewayWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire() // Continuous wake lock for lock-screen persistence
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiLock = wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "ERSSMS::WifiLock"
            ).apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        try {
            wakeLock?.let {
                if (it.isHeld) it.release()
            }
            wifiLock?.let {
                if (it.isHeld) it.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        val app = applicationContext as App
        if (isObservingConnection) {
            app.socketManager.connectionState.removeObserver(connectionStateObserver)
            isObservingConnection = false
        }
        app.socketManager.disconnect()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
