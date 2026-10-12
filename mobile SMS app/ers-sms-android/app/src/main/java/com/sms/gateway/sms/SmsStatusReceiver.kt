package com.sms.gateway.sms

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.SmsManager
import com.sms.gateway.App
import com.sms.gateway.data.model.SmsStatus

class SmsStatusReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val messageId = intent.getStringExtra(SmsSendManager.EXTRA_MESSAGE_ID) ?: return
        val app = context.applicationContext as App

        when (intent.action) {
            SmsSendManager.ACTION_SMS_SENT -> {
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        App.updateLogStatus(messageId, SmsStatus.SENT)
                        app.socketManager.emitSmsStatus(messageId, "SENT")
                    }
                    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> {
                        val err = "Generic failure (insufficient balance or network error)"
                        App.updateLogStatus(messageId, SmsStatus.FAILED, err)
                        app.socketManager.emitSmsStatus(messageId, "FAILED", err)
                    }
                    SmsManager.RESULT_ERROR_NO_SERVICE -> {
                        val err = "No mobile service"
                        App.updateLogStatus(messageId, SmsStatus.FAILED, err)
                        app.socketManager.emitSmsStatus(messageId, "FAILED", err)
                    }
                    SmsManager.RESULT_ERROR_RADIO_OFF -> {
                        val err = "Airplane mode / Radio off"
                        App.updateLogStatus(messageId, SmsStatus.FAILED, err)
                        app.socketManager.emitSmsStatus(messageId, "FAILED", err)
                    }
                    else -> {
                        val err = "Send failed (code $resultCode)"
                        App.updateLogStatus(messageId, SmsStatus.FAILED, err)
                        app.socketManager.emitSmsStatus(messageId, "FAILED", err)
                    }
                }
            }

            SmsSendManager.ACTION_SMS_DELIVERED -> {
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        App.updateLogStatus(messageId, SmsStatus.DELIVERED)
                        app.socketManager.emitSmsStatus(messageId, "DELIVERED")
                    }
                    else -> {
                        val err = "Delivery failed (code $resultCode)"
                        App.updateLogStatus(messageId, SmsStatus.FAILED, err)
                        app.socketManager.emitSmsStatus(messageId, "FAILED", err)
                    }
                }
            }
        }
    }
}
