package com.sms.gateway

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.sms.gateway.data.model.SmsItem
import com.sms.gateway.data.preferences.AppPreferences
import com.sms.gateway.network.SocketManager
import com.sms.gateway.sms.SimManager
import com.sms.gateway.sms.SmsSendManager

class App : Application() {

    lateinit var preferences: AppPreferences
        private set

    lateinit var simManager: SimManager
        private set

    lateinit var smsSendManager: SmsSendManager
        private set

    lateinit var socketManager: SocketManager
        private set

    companion object {
        const val CHANNEL_ID = "ers_sms_gateway_channel"
        const val CHANNEL_NAME = "ERS SMS Gateway"

        lateinit var instance: App
            private set

        private val _logs = MutableLiveData<List<SmsItem>>(emptyList())
        val logs: LiveData<List<SmsItem>> = _logs

        @Synchronized
        fun addLog(item: SmsItem) {
            val current = _logs.value?.toMutableList() ?: mutableListOf()
            current.add(0, item) // Add to top
            if (current.size > 100) {
                current.removeAt(current.size - 1)
            }
            _logs.postValue(current)
        }

        @Synchronized
        fun updateLogStatus(messageId: String, newStatus: com.sms.gateway.data.model.SmsStatus, error: String? = null) {
            val current = _logs.value?.toMutableList() ?: return
            val index = current.indexOfFirst { it.id == messageId }
            if (index != -1) {
                val old = current[index]
                current[index] = old.copy(status = newStatus, failureReason = error)
                _logs.postValue(current)
            }
        }

        fun clearLogs() {
            _logs.postValue(emptyList())
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        preferences = AppPreferences(this)
        simManager = SimManager(this)
        smsSendManager = SmsSendManager(this)
        socketManager = SocketManager(this)

        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "ERS SMS Gateway 24x7 Background Service"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
