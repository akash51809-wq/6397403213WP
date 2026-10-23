package com.sms.gateway.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import com.sms.gateway.App
import com.sms.gateway.data.model.SmsItem
import com.sms.gateway.data.model.SmsStatus
import com.sms.gateway.data.model.SmsType

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val app = context.applicationContext as App

        // Check if user enabled auto-forward
        if (!app.preferences.isAutoForwardEnabled) return

        try {
            val messages: Array<SmsMessage>? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                Telephony.Sms.Intents.getMessagesFromIntent(intent)
            } else {
                val bundle = intent.extras
                val pdus = bundle?.get("pdus") as? Array<*>
                pdus?.mapNotNull {
                    @Suppress("DEPRECATION")
                    SmsMessage.createFromPdu(it as ByteArray)
                }?.toTypedArray()
            }

            if (messages.isNullOrEmpty()) return

            val sender = messages[0].displayOriginatingAddress ?: "Unknown"
            val timestamp = messages[0].timestampMillis

            // Combine multipart message parts into full text
            val messageBody = StringBuilder()
            for (sms in messages) {
                messageBody.append(sms.displayMessageBody)
            }
            val fullText = messageBody.toString()

            // Detect SIM slot (SIM 1 = 0, SIM 2 = 1)
            var simSlot = 0
            val bundle = intent.extras
            if (bundle != null) {
                if (bundle.containsKey("subscription")) {
                    val subId = bundle.getInt("subscription", -1)
                    val simInfo = app.simManager.getAvailableSims().firstOrNull { it.subscriptionId == subId }
                    if (simInfo != null) {
                        simSlot = simInfo.slotIndex
                    }
                } else if (bundle.containsKey("slot")) {
                    simSlot = bundle.getInt("slot", 0)
                } else if (bundle.containsKey("simSlot")) {
                    simSlot = bundle.getInt("simSlot", 0)
                }
            }

            // 1. Enforce Option 2: Allow Forward Incoming Msg (SIM1/SIM2/Both)
            val incomingPref = app.preferences.incomingSimPreference
            if (incomingPref == 0 && simSlot != 0) {
                App.addLog(SmsItem(
                    address = sender,
                    message = "[SIM 2 एसएमएस ड्रॉप किया गया - सिर्फ SIM 1 फॉरवर्डिंग अनुमति है] $fullText",
                    timestamp = timestamp,
                    type = SmsType.RECEIVED,
                    simSlot = simSlot,
                    status = SmsStatus.FAILED
                ))
                return
            } else if (incomingPref == 1 && simSlot != 1) {
                App.addLog(SmsItem(
                    address = sender,
                    message = "[SIM 1 एसएमएस ड्रॉप किया गया - सिर्फ SIM 2 फॉरवर्डिंग अनुमति है] $fullText",
                    timestamp = timestamp,
                    type = SmsType.RECEIVED,
                    simSlot = simSlot,
                    status = SmsStatus.FAILED
                ))
                return
            }

            // 2. Enforce Option 3: Choose SMS Sender ID Filter (All vs Custom)
            val senderFilterMode = app.preferences.senderIdFilterMode
            if (senderFilterMode.equals("custom", ignoreCase = true)) {
                val rawWhitelist = app.preferences.senderIdWhitelist
                val allowedSenders = rawWhitelist
                    .split(",")
                    .map { it.trim().lowercase() }
                    .filter { it.isNotEmpty() }

                if (allowedSenders.isNotEmpty()) {
                    val cleanSender = sender.trim().lowercase()
                    val isMatched = allowedSenders.any { allowed ->
                        cleanSender == allowed ||
                        cleanSender.contains(allowed) ||
                        allowed.contains(cleanSender) ||
                        cleanSender.replace("-", "").contains(allowed.replace("-", ""))
                    }

                    if (!isMatched) {
                        App.addLog(SmsItem(
                            address = sender,
                            message = "[सेंडर ID फ़िल्टर: '$sender' स्वीकृत सूची में नहीं है] $fullText",
                            timestamp = timestamp,
                            type = SmsType.RECEIVED,
                            simSlot = simSlot,
                            status = SmsStatus.FAILED
                        ))
                        return
                    }
                }
            }

            // Log locally as Delivered
            val logItem = SmsItem(
                address = sender,
                message = fullText,
                timestamp = timestamp,
                type = SmsType.RECEIVED,
                simSlot = simSlot,
                status = SmsStatus.DELIVERED
            )
            App.addLog(logItem)

            // Forward to Server/Web Panel via WebSocket in real-time
            app.socketManager.emitIncomingSms(
                sender = sender,
                message = fullText,
                timestamp = timestamp,
                simSlot = simSlot
            )

        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
