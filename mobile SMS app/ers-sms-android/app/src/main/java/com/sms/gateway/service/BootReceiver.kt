package com.sms.gateway.service

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.sms.gateway.App

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == "android.intent.action.QUICKBOOT_POWERON"
        ) {
            val app = context.applicationContext as App
            if (app.preferences.isServiceEnabled && app.preferences.isConfigured()) {
                GatewayForegroundService.startService(context)
            }
        }
    }
}
