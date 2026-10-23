package com.sms.gateway.ui

import android.app.Activity
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.journeyapps.barcodescanner.CaptureManager
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.sms.gateway.App
import com.sms.gateway.R

class ScanQrActivity : AppCompatActivity() {

    private lateinit var captureManager: CaptureManager
    private lateinit var barcodeScannerView: DecoratedBarcodeView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_scan_qr)

        barcodeScannerView = findViewById(R.id.barcodeScannerView)
        captureManager = CaptureManager(this, barcodeScannerView)
        captureManager.initializeFromIntent(intent, savedInstanceState)
        captureManager.setShowMissingCameraPermissionDialog(true)

        barcodeScannerView.decodeSingle { result ->
            val qrText = result.text ?: ""
            handleQrContent(qrText)
        }
    }

    private fun handleQrContent(content: String) {
        val app = applicationContext as App
        var success = false

        try {
            // Try parsing as JSON: {"serverUrl":"...","apiKey":"..."}
            val json = Gson().fromJson(content, JsonObject::class.java)
            if (json != null) {
                val serverUrl = when {
                    json.has("serverUrl") -> json.get("serverUrl").asString
                    json.has("url") -> json.get("url").asString
                    json.has("server") -> json.get("server").asString
                    else -> null
                }
                val apiKey = when {
                    json.has("apiKey") -> json.get("apiKey").asString
                    json.has("key") -> json.get("key").asString
                    json.has("token") -> json.get("token").asString
                    else -> null
                }

                if (!serverUrl.isNullOrBlank() && !apiKey.isNullOrBlank()) {
                    app.preferences.serverUrl = serverUrl
                    app.preferences.apiKey = apiKey
                    val devName = when {
                        json.has("deviceName") -> json.get("deviceName").asString
                        json.has("name") -> json.get("name").asString
                        else -> null
                    }
                    if (!devName.isNullOrBlank()) {
                        app.preferences.deviceName = devName
                    }
                    success = true
                }
            }
        } catch (e: Exception) {
            // If not JSON, check if format is "serverUrl|apiKey"
            if (content.contains("|")) {
                val parts = content.split("|")
                if (parts.size >= 2) {
                    app.preferences.serverUrl = parts[0].trim()
                    app.preferences.apiKey = parts[1].trim()
                    success = true
                }
            }
        }

        if (success) {
            app.preferences.isServiceEnabled = true
            // Instant connect & start 24x7 background foreground service
            com.sms.gateway.service.GatewayForegroundService.startService(this)
            app.socketManager.connect()
            Toast.makeText(this, "QR कोड सफलतापूर्वक लिंक हुआ! सर्वर से कनेक्ट हो रहा है...", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_OK)
            finish()
        } else {
            Toast.makeText(this, "अमान्य (Invalid) QR कोड", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        captureManager.onResume()
    }

    override fun onPause() {
        super.onPause()
        captureManager.onPause()
    }

    override fun onDestroy() {
        super.onDestroy()
        captureManager.onDestroy()
    }
}
