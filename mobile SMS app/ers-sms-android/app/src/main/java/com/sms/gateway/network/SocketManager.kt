package com.sms.gateway.network

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Handler
import android.os.Looper
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sms.gateway.App
import com.sms.gateway.data.model.IncomingSmsPayload
import com.sms.gateway.data.model.RegisterPayload
import com.sms.gateway.data.model.SendSmsCommand
import com.sms.gateway.data.model.SmsStatusPayload
import com.sms.gateway.data.model.SocketMessage
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.io.IOException
import java.security.SecureRandom
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class SocketManager(private val context: Context) {

    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private val client: OkHttpClient = createResilientClient()

    companion object {
        fun createResilientClient(): OkHttpClient {
            return try {
                val trustAllCerts = arrayOf<TrustManager>(object : X509TrustManager {
                    override fun checkClientTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                    override fun checkServerTrusted(chain: Array<out X509Certificate>?, authType: String?) {}
                    override fun getAcceptedIssuers(): Array<X509Certificate> = arrayOf()
                })

                val sslContext = SSLContext.getInstance("SSL")
                sslContext.init(null, trustAllCerts, SecureRandom())

                OkHttpClient.Builder()
                    .sslSocketFactory(sslContext.socketFactory, trustAllCerts[0] as X509TrustManager)
                    .hostnameVerifier { _, _ -> true }
                    .readTimeout(0, TimeUnit.MILLISECONDS)
                    .pingInterval(20, TimeUnit.SECONDS)
                    .retryOnConnectionFailure(true)
                    .build()
            } catch (e: Exception) {
                OkHttpClient.Builder()
                    .readTimeout(0, TimeUnit.MILLISECONDS)
                    .pingInterval(20, TimeUnit.SECONDS)
                    .retryOnConnectionFailure(true)
                    .build()
            }
        }
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isManualDisconnect = false
    private var reconnectAttempts = 0

    private val _connectionState = MutableLiveData(ConnectionState.DISCONNECTED)
    val connectionState: LiveData<ConnectionState> = _connectionState

    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED
    }

    fun connect() {
        val app = context.applicationContext as App
        var serverUrl = app.preferences.serverUrl.trim().trimEnd('/')
        val apiKey = app.preferences.apiKey.trim()

        if (serverUrl.isBlank() || apiKey.isBlank()) {
            _connectionState.postValue(ConnectionState.DISCONNECTED)
            return
        }

        if (serverUrl.contains("services.ers-new.onrender.com") || serverUrl.contains("services-ers-new.onrender.com")) {
            serverUrl = serverUrl.replace("services.ers-new.onrender.com", "services-ers.onrender.com")
                .replace("services-ers-new.onrender.com", "services-ers.onrender.com")
            app.preferences.serverUrl = serverUrl
        }

        if (_connectionState.value == ConnectionState.CONNECTED) return

        isManualDisconnect = false
        _connectionState.postValue(ConnectionState.CONNECTING)

        val isLocalIp = serverUrl.contains("192.168.") || serverUrl.contains("10.") || serverUrl.contains("127.0.0.1") || serverUrl.contains("localhost")
        val isDomain = serverUrl.contains(".") && !isLocalIp

        // Convert http/https URL to ws/wss URL
        var wsUrl = serverUrl.trim().trimEnd('/')
        wsUrl = when {
            wsUrl.startsWith("https://", ignoreCase = true) -> wsUrl.replaceFirst("https://", "wss://", ignoreCase = true)
            wsUrl.startsWith("http://", ignoreCase = true) -> {
                if (isDomain) wsUrl.replaceFirst("http://", "wss://", ignoreCase = true)
                else wsUrl.replaceFirst("http://", "ws://", ignoreCase = true)
            }
            wsUrl.startsWith("wss://", ignoreCase = true) -> wsUrl
            wsUrl.startsWith("ws://", ignoreCase = true) -> {
                if (isDomain) wsUrl.replaceFirst("ws://", "wss://", ignoreCase = true)
                else wsUrl
            }
            isDomain -> "wss://$wsUrl"
            else -> "ws://$wsUrl"
        }

        // Add /ws endpoint if missing and query parameters
        val fullUrl = when {
            wsUrl.contains("?") -> "$wsUrl&apiKey=$apiKey&deviceId=${app.preferences.deviceId}"
            wsUrl.endsWith("/ws") -> "$wsUrl?apiKey=$apiKey&deviceId=${app.preferences.deviceId}"
            else -> "$wsUrl/ws?apiKey=$apiKey&deviceId=${app.preferences.deviceId}"
        }

        val request = Request.Builder()
            .url(fullUrl)
            .addHeader("x-api-key", apiKey)
            .addHeader("x-device-id", app.preferences.deviceId)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _connectionState.postValue(ConnectionState.CONNECTED)
                reconnectAttempts = 0

                // Send Device Registration immediately
                sendDeviceRegistration()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleIncomingSocketMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                webSocket.close(1000, null)
                _connectionState.postValue(ConnectionState.DISCONNECTED)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _connectionState.postValue(ConnectionState.DISCONNECTED)
                if (!isManualDisconnect) {
                    scheduleReconnect()
                }
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _connectionState.postValue(ConnectionState.DISCONNECTED)
                if (!isManualDisconnect) {
                    scheduleReconnect()
                }
            }
        })
    }

    fun disconnect() {
        isManualDisconnect = true
        webSocket?.close(1000, "App disconnected")
        webSocket = null
        _connectionState.postValue(ConnectionState.DISCONNECTED)
        handler.removeCallbacksAndMessages(null)
    }

    private fun scheduleReconnect() {
        reconnectAttempts++
        val delayMillis = (reconnectAttempts * 3000L).coerceAtMost(30000L) // Max 30 seconds
        handler.postDelayed({
            val app = context.applicationContext as App
            if (app.preferences.isServiceEnabled && !isManualDisconnect) {
                connect()
            }
        }, delayMillis)
    }

    private fun sendDeviceRegistration() {
        val app = context.applicationContext as App
        val batteryInfo = getBatteryStatus()
        val sims = app.simManager.getAvailableSims()

        val payload = RegisterPayload(
            deviceId = app.preferences.deviceId,
            apiKey = app.preferences.apiKey,
            deviceName = app.preferences.deviceName,
            batteryLevel = batteryInfo.first,
            isCharging = batteryInfo.second,
            simCards = sims
        )

        sendMessage("device_register", payload)
        sendDeviceRegistrationHttp(payload)
    }

    private fun sendDeviceRegistrationHttp(payload: RegisterPayload) {
        val httpBase = getHttpBaseUrl()
        if (httpBase.isBlank()) return

        try {
            val jsonBody = gson.toJson(mapOf(
                "deviceId" to payload.deviceId,
                "apiKey" to payload.apiKey,
                "deviceName" to payload.deviceName,
                "batteryLevel" to payload.batteryLevel,
                "isCharging" to payload.isCharging,
                "simCards" to payload.simCards
            ))

            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val request = Request.Builder()
                .url("$httpBase/api/sms/devices/register")
                .addHeader("Content-Type", "application/json")
                .addHeader("x-api-key", payload.apiKey)
                .addHeader("x-device-id", payload.deviceId)
                .post(jsonBody.toRequestBody(mediaType))
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {}
                override fun onResponse(call: Call, response: Response) {
                    response.close()
                }
            })
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun handleIncomingSocketMessage(rawJson: String) {
        try {
            val jsonObject = gson.fromJson(rawJson, JsonObject::class.java) ?: return
            val event = jsonObject.get("event")?.asString ?: ""

            when (event) {
                "send_sms" -> {
                    val dataJson = jsonObject.get("data")
                    val command = gson.fromJson(dataJson, SendSmsCommand::class.java)
                    if (command != null && !command.messageId.isNullOrBlank() &&
                        !command.phoneNumber.isNullOrBlank() && !command.message.isNullOrBlank()
                    ) {
                        val app = context.applicationContext as App
                        app.smsSendManager.sendSms(
                            messageId = command.messageId,
                            phoneNumber = command.phoneNumber,
                            messageText = command.message,
                            targetSimSlot = command.simSlot
                        )
                    }
                }

                "ping" -> {
                    sendMessage("pong", mapOf("timestamp" to System.currentTimeMillis()))
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun emitSmsStatus(messageId: String, status: String, error: String? = null) {
        val payload = SmsStatusPayload(
            messageId = messageId,
            status = status,
            error = error
        )
        sendMessage("sms_status", payload)
    }

    fun emitIncomingSms(sender: String, message: String, timestamp: Long, simSlot: Int) {
        val payload = IncomingSmsPayload(
            sender = sender,
            message = message,
            timestamp = timestamp,
            simSlot = simSlot
        )
        // 1. Send via WebSocket
        sendMessage("incoming_sms", payload)

        // 2. Guaranteed Delivery via HTTP POST fallback
        sendIncomingSmsHttp(payload)
    }

    private fun getHttpBaseUrl(): String {
        val app = context.applicationContext as App
        var url = app.preferences.serverUrl.trim().trimEnd('/')
        if (url.isBlank()) return ""

        if (url.contains("services.ers-new.onrender.com") || url.contains("services-ers-new.onrender.com")) {
            url = url.replace("services.ers-new.onrender.com", "services-ers.onrender.com")
                .replace("services-ers-new.onrender.com", "services-ers.onrender.com")
            app.preferences.serverUrl = url
        }

        val isLocalIp = url.contains("192.168.") || url.contains("10.") || url.contains("127.0.0.1") || url.contains("localhost")
        val isDomain = url.contains(".") && !isLocalIp

        var httpBase = when {
            url.startsWith("wss://", ignoreCase = true) -> url.replaceFirst("wss://", "https://", ignoreCase = true)
            url.startsWith("ws://", ignoreCase = true) -> {
                if (isDomain) url.replaceFirst("ws://", "https://", ignoreCase = true)
                else url.replaceFirst("ws://", "http://", ignoreCase = true)
            }
            url.startsWith("http://", ignoreCase = true) -> {
                if (isDomain) url.replaceFirst("http://", "https://", ignoreCase = true)
                else url
            }
            url.startsWith("https://", ignoreCase = true) -> url
            isDomain -> "https://$url"
            else -> "http://$url"
        }

        if (httpBase.endsWith("/ws", ignoreCase = true)) {
            httpBase = httpBase.substring(0, httpBase.length - 3)
        }
        return httpBase
    }

    private fun sendIncomingSmsHttp(payload: IncomingSmsPayload) {
        val app = context.applicationContext as App
        val httpBase = getHttpBaseUrl()
        if (httpBase.isBlank()) return

        try {
            val jsonBody = gson.toJson(mapOf(
                "deviceId" to app.preferences.deviceId,
                "sender" to payload.sender,
                "message" to payload.message,
                "simSlot" to payload.simSlot,
                "timestamp" to payload.timestamp,
                "apiKey" to app.preferences.apiKey
            ))

            val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
            val body = jsonBody.toRequestBody(mediaType)

            // Primary endpoint: /api/sms/incoming
            val request = Request.Builder()
                .url("$httpBase/api/sms/incoming")
                .addHeader("Content-Type", "application/json")
                .addHeader("x-api-key", app.preferences.apiKey)
                .addHeader("x-device-id", app.preferences.deviceId)
                .post(body)
                .build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    // Fallback endpoint: /inbox
                    try {
                        val fallbackRequest = Request.Builder()
                            .url("$httpBase/inbox")
                            .addHeader("Content-Type", "application/json")
                            .addHeader("x-api-key", app.preferences.apiKey)
                            .addHeader("x-device-id", app.preferences.deviceId)
                            .post(jsonBody.toRequestBody(mediaType))
                            .build()

                        client.newCall(fallbackRequest).enqueue(object : Callback {
                            override fun onFailure(c: Call, ex: IOException) {}
                            override fun onResponse(c: Call, r: Response) { r.close() }
                        })
                    } catch (ignored: Exception) {}
                }

                override fun onResponse(call: Call, response: Response) {
                    response.close()
                }
            })
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun sendMessage(event: String, data: Any) {
        try {
            val message = SocketMessage(event = event, data = data)
            val jsonString = gson.toJson(message)
            webSocket?.send(jsonString)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun getBatteryStatus(): Pair<Int, Boolean> {
        val ifilter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        val batteryStatus: Intent? = context.registerReceiver(null, ifilter)

        val level: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val batteryPct = if (level != -1 && scale != -1) ((level / scale.toFloat()) * 100).toInt() else 100

        val status: Int = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
        val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING ||
                status == BatteryManager.BATTERY_STATUS_FULL

        return Pair(batteryPct, isCharging)
    }
}
