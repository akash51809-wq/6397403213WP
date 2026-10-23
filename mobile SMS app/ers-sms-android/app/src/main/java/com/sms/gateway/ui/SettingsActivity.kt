package com.sms.gateway.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.sms.gateway.App
import com.sms.gateway.databinding.ActivitySettingsBinding
import com.sms.gateway.network.UpdateManager

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

        // 1. Outgoing SIM (Option 1)
        when (prefs.outgoingSimPreference) {
            0 -> binding.rbOutSim1.isChecked = true
            1 -> binding.rbOutSim2.isChecked = true
            else -> binding.rbOutBoth.isChecked = true
        }

        // 2. Incoming Forwarding SIM (Option 2)
        when (prefs.incomingSimPreference) {
            0 -> binding.rbInSim1.isChecked = true
            1 -> binding.rbInSim2.isChecked = true
            else -> binding.rbInBoth.isChecked = true
        }

        // 3. Sender ID Filter (Option 3)
        if (prefs.senderIdFilterMode.equals("custom", ignoreCase = true)) {
            binding.rbSenderCustom.isChecked = true
            binding.tilSenderWhitelist.visibility = View.VISIBLE
            binding.tvSenderIdNote.visibility = View.VISIBLE
        } else {
            binding.rbSenderAll.isChecked = true
            binding.tilSenderWhitelist.visibility = View.GONE
            binding.tvSenderIdNote.visibility = View.GONE
        }
        binding.etSenderWhitelist.setText(prefs.senderIdWhitelist)

        // Server Credentials
        binding.etServerUrl.setText(prefs.serverUrl)
        binding.etApiKey.setText(prefs.apiKey)
        binding.etDeviceName.setText(prefs.deviceName)
    }

    private fun setupListeners() {
        val app = applicationContext as App
        val prefs = app.preferences

        // Toggle Sender ID input field visibility based on radio selection
        binding.rgSenderFilter.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == binding.rbSenderCustom.id) {
                binding.tilSenderWhitelist.visibility = View.VISIBLE
                binding.tvSenderIdNote.visibility = View.VISIBLE
                binding.etSenderWhitelist.requestFocus()
            } else {
                binding.tilSenderWhitelist.visibility = View.GONE
                binding.tvSenderIdNote.visibility = View.GONE
            }
        }

        binding.btnBatteryOptimization.setOnClickListener {
            requestIgnoreBatteryOptimization()
        }

        binding.btnCheckUpdateSettings.setOnClickListener {
            UpdateManager.checkForUpdate(this, isManual = true)
        }

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

            // 1. Save Outgoing SIM preference
            prefs.outgoingSimPreference = when {
                binding.rbOutSim1.isChecked -> 0
                binding.rbOutSim2.isChecked -> 1
                else -> -1
            }

            // 2. Save Incoming SIM preference
            prefs.incomingSimPreference = when {
                binding.rbInSim1.isChecked -> 0
                binding.rbInSim2.isChecked -> 1
                else -> -1
            }

            // 3. Save Sender ID filter mode & whitelist
            if (binding.rbSenderCustom.isChecked) {
                prefs.senderIdFilterMode = "custom"
                prefs.senderIdWhitelist = binding.etSenderWhitelist.text.toString().trim()
            } else {
                prefs.senderIdFilterMode = "all"
                prefs.senderIdWhitelist = ""
            }

            Toast.makeText(this, "सेटिंग्स सफलतापूर्वक सेव हो गई!", Toast.LENGTH_SHORT).show()

            // If service is enabled, reconnect socket so updated settings/SIMs are pushed to server
            if (prefs.isServiceEnabled && prefs.isConfigured()) {
                app.socketManager.disconnect()
                app.socketManager.connect()
            }

            finish()
        }
    }

    private fun requestIgnoreBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val packageName = packageName
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:$packageName")
                }
                startActivity(intent)
            } else {
                Toast.makeText(this, "बैटरी ऑप्टिमाइज़ेशन पहले से ही डिसेबल्ड है (24x7 एक्टिव)!", Toast.LENGTH_SHORT).show()
            }
        }
    }
}
