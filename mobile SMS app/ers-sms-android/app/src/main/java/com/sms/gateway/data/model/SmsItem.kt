package com.sms.gateway.data.model

data class SmsItem(
    val id: String = System.currentTimeMillis().toString(),
    val address: String,          // Phone number
    val message: String,          // SMS Body
    val timestamp: Long = System.currentTimeMillis(),
    val type: SmsType,            // SENT or RECEIVED
    val simSlot: Int = 0,         // SIM 1 (0) or SIM 2 (1)
    var status: SmsStatus = SmsStatus.PENDING,
    val failureReason: String? = null
)

enum class SmsType {
    SENT,
    RECEIVED
}

enum class SmsStatus {
    PENDING,
    SENT,
    DELIVERED,
    FAILED
}
