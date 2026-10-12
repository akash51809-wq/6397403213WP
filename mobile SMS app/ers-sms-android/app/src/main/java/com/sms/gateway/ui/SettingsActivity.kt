package com.sms.gateway.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.sms.gateway.App
import com.sms.gateway.databinding.ActivitySettingsBinding

class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        loadSettings()
        setupListeners()
    }

    private fun loadSettings() {
        val app = applicationContext as App
        val prefs = app.preferences

        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etApiKey.setText(prefs.apiKey)
        binding.etDeviceName.setText(prefs.deviceName)

        when (prefs.preferredSim) {
            0 -> binding.rbSim1.isChecked = true
            1 -> binding.rbSim2.isChecked = true
            else -> binding.rbSimAuto.isChecked = true
        }

        binding.switchAutoForward.isChecked = prefs.isAutoForwardEnabled
    }

    private fun setupListeners() {
        val app = applicationContext as App
        val prefs = app.preferences

        binding.btnSave.setOnClickListener {
            val serverUrl = binding.etServerUrl.text.toString().trim()
            val apiKey = binding.etApiKey.text.toString().trim()
            val deviceName = binding.etDeviceName.text.toString().trim()

            if (serverUrl.isBlank()) {
                binding.tilServerUrl.error = "सर्वर URL डालना आवश्यक है"
                return@setOnClickListener
            }

            prefs.serverUrl = serverUrl
            prefs.apiKey = apiKey
            if (deviceName.isNotBlank()) {
                prefs.deviceName = deviceName
            }

            prefs.preferredSim = when {
                binding.rbSim1.isChecked -> 0
                binding.rbSim2.isChecked -> 1
                else -> -1
            }

            prefs.isAutoForwardEnabled = binding.switchAutoForward.isChecked

            Toast.makeText(this, "सेटिंग्स सफलतापूर्वक सेव हो गई!", Toast.LENGTH_SHORT).show()

            // Reconnect if service is active
            if (prefs.isServiceEnabled) {
                app.socketManager.disconnect()
                app.socketManager.connect()
            }

            finish()
        }

        binding.btnBatteryOptimization.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }
    }

    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent()
            val packageName = packageName
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            } else {
                Toast.makeText(this, "बैटरी ऑप्टिमाइज़ेशन पहले से ही डिसेबल्ड है!", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
