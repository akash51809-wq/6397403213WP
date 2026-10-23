package com.sms.gateway.data.preferences

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import java.util.UUID

class AppPreferences(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("ers_sms_preferences", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_API_KEY = "api_key"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_PREFERRED_SIM = "preferred_sim"
        private const val KEY_SERVICE_ENABLED = "service_enabled"
        private const val KEY_AUTO_FORWARD = "auto_forward"

        // New Feature Preferences requested by User
        private const val KEY_OUTGOING_SIM = "outgoing_sim_pref" // -1: Both, 0: SIM 1, 1: SIM 2
        private const val KEY_INCOMING_SIM = "incoming_sim_pref" // -1: Both, 0: SIM 1, 1: SIM 2
        private const val KEY_SENDER_FILTER_MODE = "sender_filter_mode" // "all" or "custom"
        private const val KEY_SENDER_WHITELIST = "sender_whitelist" // comma-separated strings
    }

    var serverUrl: String
        get() {
            var url = prefs.getString(KEY_SERVER_URL, "") ?: ""
            if (url.contains("services.ers-new.onrender.com") || url.contains("services-ers-new.onrender.com")) {
                url = url.replace("services.ers-new.onrender.com", "services-ers.onrender.com")
                    .replace("services-ers-new.onrender.com", "services-ers.onrender.com")
                prefs.edit().putString(KEY_SERVER_URL, url).apply()
            }
            return url
        }
        set(value) {
            var clean = value.trim()
            if (clean.contains("services.ers-new.onrender.com") || clean.contains("services-ers-new.onrender.com")) {
                clean = clean.replace("services.ers-new.onrender.com", "services-ers.onrender.com")
                    .replace("services-ers-new.onrender.com", "services-ers.onrender.com")
            }
            prefs.edit().putString(KEY_SERVER_URL, clean).apply()
        }

    var apiKey: String
        get() = prefs.getString(KEY_API_KEY, "") ?: ""
        set(value) = prefs.edit().putString(KEY_API_KEY, value.trim()).apply()

    var deviceId: String
        get() {
            var id = prefs.getString(KEY_DEVICE_ID, null)
            if (id.isNullOrEmpty()) {
                id = UUID.randomUUID().toString()
                prefs.edit().putString(KEY_DEVICE_ID, id).apply()
            }
            return id
        }
        set(value) = prefs.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceName: String
        get() = prefs.getString(KEY_DEVICE_NAME, "${Build.MANUFACTURER} ${Build.MODEL}") ?: "Android Device"
        set(value) = prefs.edit().putString(KEY_DEVICE_NAME, value).apply()

    var preferredSim: Int
        get() = prefs.getInt(KEY_PREFERRED_SIM, -1) // -1 for Auto, 0 for SIM 1, 1 for SIM 2
        set(value) = prefs.edit().putInt(KEY_PREFERRED_SIM, value).apply()

    // 1. Allow SIM for Send Outgoing Msg (Option 1)
    // -1 = Both/Auto, 0 = SIM 1, 1 = SIM 2
    var outgoingSimPreference: Int
        get() = prefs.getInt(KEY_OUTGOING_SIM, -1)
        set(value) = prefs.edit().putInt(KEY_OUTGOING_SIM, value).apply()

    // 2. Allow Forward Incoming Msg (Option 2)
    // -1 = Both, 0 = SIM 1, 1 = SIM 2
    var incomingSimPreference: Int
        get() = prefs.getInt(KEY_INCOMING_SIM, -1)
        set(value) = prefs.edit().putInt(KEY_INCOMING_SIM, value).apply()

    // 3. Choose SMS Sender ID Filter (Option 3)
    // "all" = All senders, "custom" = Only specified sender IDs
    var senderIdFilterMode: String
        get() = prefs.getString(KEY_SENDER_FILTER_MODE, "all") ?: "all"
        set(value) = prefs.edit().putString(KEY_SENDER_FILTER_MODE, value).apply()

    var senderIdWhitelist: String
        get() = prefs.getString(KEY_SENDER_WHITELIST, "") ?: ""
        set(value) = prefs.edit().putString(KEY_SENDER_WHITELIST, value.trim()).apply()

    // By default always connect if configured
    var isServiceEnabled: Boolean
        get() = prefs.getBoolean(KEY_SERVICE_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_SERVICE_ENABLED, value).apply()

    var isAutoForwardEnabled: Boolean
        get() = prefs.getBoolean(KEY_AUTO_FORWARD, true)
        set(value) = prefs.edit().putBoolean(KEY_AUTO_FORWARD, value).apply()

    fun isConfigured(): Boolean {
        return serverUrl.isNotEmpty() && apiKey.isNotEmpty()
    }
}
