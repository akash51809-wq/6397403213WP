package com.sms.gateway.data.model

data class SimInfo(
    val slotIndex: Int,
    val subscriptionId: Int,
    val carrierName: String,
    val displayName: String,
    val countryIso: String
)

data class DeviceStatus(
    val deviceId: String,
    val deviceName: String,
    val batteryLevel: Int,
    val isCharging: Boolean,
    val isConnected: Boolean,
    val simCards: List<SimInfo> = emptyList(),
    val appVersion: String = "1.0.0"
)
