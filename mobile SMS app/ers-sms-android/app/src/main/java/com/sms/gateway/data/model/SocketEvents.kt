package com.sms.gateway.data.model

import com.google.gson.annotations.SerializedName

data class SocketMessage(
    @SerializedName("event") val event: String,
    @SerializedName("data") val data: Any? = null
)

data class RegisterPayload(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("apiKey") val apiKey: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("isCharging") val isCharging: Boolean,
    @SerializedName("simCards") val simCards: List<SimInfo>
)

data class SendSmsCommand(
    @SerializedName("messageId") val messageId: String? = null,
    @SerializedName("phoneNumber") val phoneNumber: String? = null,
    @SerializedName("message") val message: String? = null,
    @SerializedName("simSlot") val simSlot: Int? = null // 0 for SIM 1, 1 for SIM 2, null for auto
)

data class SmsStatusPayload(
    @SerializedName("messageId") val messageId: String,
    @SerializedName("status") val status: String, // SENT, DELIVERED, FAILED
    @SerializedName("error") val error: String? = null,
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis()
)

data class IncomingSmsPayload(
    @SerializedName("sender") val sender: String,
    @SerializedName("message") val message: String,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("simSlot") val simSlot: Int
)
