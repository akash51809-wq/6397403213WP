package com.sms.gateway.sms

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import com.sms.gateway.App
import com.sms.gateway.data.model.SmsItem
import com.sms.gateway.data.model.SmsStatus
import com.sms.gateway.data.model.SmsType

class SmsSendManager(private val context: Context) {

    companion object {
        const val ACTION_SMS_SENT = "com.sms.gateway.ACTION_SMS_SENT"
        const val ACTION_SMS_DELIVERED = "com.sms.gateway.ACTION_SMS_DELIVERED"

        const val EXTRA_MESSAGE_ID = "extra_message_id"
        const val EXTRA_PHONE_NUMBER = "extra_phone_number"
        const val EXTRA_SIM_SLOT = "extra_sim_slot"
    }

    fun sendSms(
        messageId: String,
        phoneNumber: String,
        messageText: String,
        targetSimSlot: Int? = null
    ): Boolean {
        return try {
            val app = context.applicationContext as App
            val preferredSlot = targetSimSlot ?: app.preferences.preferredSim

            val smsManager: SmsManager = if (preferredSlot >= 0) {
                val subId = app.simManager.getSubscriptionIdForSlot(preferredSlot)
                if (subId != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        context.getSystemService(SmsManager::class.java).createForSubscriptionId(subId)
                    } else {
                        @Suppress("DEPRECATION")
                        SmsManager.getSmsManagerForSubscriptionId(subId)
                    }
                } else {
                    getDefaultSmsManager()
                }
            } else {
                getDefaultSmsManager()
            }

            // Create Log entry
            val smsItem = SmsItem(
                id = messageId,
                address = phoneNumber,
                message = messageText,
                type = SmsType.SENT,
                simSlot = if (preferredSlot >= 0) preferredSlot else 0,
                status = SmsStatus.PENDING
            )
            App.addLog(smsItem)

            // Sent Intent
            val sentIntent = Intent(ACTION_SMS_SENT).apply {
                setPackage(context.packageName)
                putExtra(EXTRA_MESSAGE_ID, messageId)
                putExtra(EXTRA_PHONE_NUMBER, phoneNumber)
            }
            val sentPI = PendingIntent.getBroadcast(
                context,
                (messageId + "_sent").hashCode(),
                sentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Delivered Intent
            val deliveredIntent = Intent(ACTION_SMS_DELIVERED).apply {
                setPackage(context.packageName)
                putExtra(EXTRA_MESSAGE_ID, messageId)
                putExtra(EXTRA_PHONE_NUMBER, phoneNumber)
            }
            val deliveredPI = PendingIntent.getBroadcast(
                context,
                (messageId + "_delivered").hashCode(),
                deliveredIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Handle multipart if length > 160
            val parts = smsManager.divideMessage(messageText)
            if (parts.size > 1) {
                val sentIntents = ArrayList<PendingIntent>()
                val deliveredIntents = ArrayList<PendingIntent>()
                for (i in parts.indices) {
                    sentIntents.add(sentPI)
                    deliveredIntents.add(deliveredPI)
                }
                smsManager.sendMultipartTextMessage(
                    phoneNumber,
                    null,
                    parts,
                    sentIntents,
                    deliveredIntents
                )
            } else {
                smsManager.sendTextMessage(
                    phoneNumber,
                    null,
                    messageText,
                    sentPI,
                    deliveredPI
                )
            }

            true
        } catch (e: Exception) {
            e.printStackTrace()
            App.updateLogStatus(messageId, SmsStatus.FAILED, e.localizedMessage)
            (context.applicationContext as App).socketManager.emitSmsStatus(
                messageId,
                "FAILED",
                e.localizedMessage ?: "Unknown Error"
            )
            false
        }
    }

    private fun getDefaultSmsManager(): SmsManager {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            context.getSystemService(SmsManager::class.java)
        } else {
            @Suppress("DEPRECATION")
            SmsManager.getDefault()
        }
    }
}
