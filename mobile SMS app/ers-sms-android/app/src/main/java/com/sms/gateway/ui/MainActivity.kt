package com.sms.gateway.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.sms.gateway.App
import com.sms.gateway.R
import com.sms.gateway.databinding.ActivityMainBinding
import com.sms.gateway.network.SocketManager
import com.sms.gateway.service.GatewayForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val logsAdapter = LogsAdapter()

    // Required Permissions launcher
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.SEND_SMS] == true &&
                permissions[Manifest.permission.RECEIVE_SMS] == true
        if (smsGranted) {
            updateSimInfo()
        } else {
            Toast.makeText(this, "एसएमएस अनुमतियाँ आवश्यक हैं!", Toast.LENGTH_LONG).show()
        }
    }

    private val scanQrLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            updateServerInfo()
            // Auto start if configured
            val app = applicationContext as App
            if (app.preferences.isConfigured()) {
                binding.switchService.isChecked = true
                GatewayForegroundService.startService(this)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupListeners()
        observeData()
        checkPermissions()
    }

    override fun onResume() {
        super.onResume()
        updateServerInfo()
        updateSimInfo()
    }

    private fun setupRecyclerView() {
        binding.rvLogs.apply {
            layoutManager = LinearLayoutManager(this@MainActivity)
            adapter = logsAdapter
        }
    }

    private fun setupListeners() {
        binding.btnSettings.setOnClickListener {
            startActivity(Intent(this, SettingsActivity::class.java))
        }

        binding.btnScanQr.setOnClickListener {
            scanQrLauncher.launch(Intent(this, ScanQrActivity::class.java))
        }

        binding.switchService.setOnCheckedChangeListener { _, isChecked ->
            val app = applicationContext as App
            if (isChecked) {
                if (!app.preferences.isConfigured()) {
                    binding.switchService.isChecked = false
                    Toast.makeText(this, "कृपया पहले सर्वर सेटिंग्स कॉन्फ़िगर करें या QR स्कैन करें!", Toast.LENGTH_LONG).show()
                    startActivity(Intent(this, SettingsActivity::class.java))
                    return@setOnCheckedChangeListener
                }
                GatewayForegroundService.startService(this)
            } else {
                GatewayForegroundService.stopService(this)
            }
        }

        binding.btnTestSms.setOnClickListener {
            showTestSmsDialog()
        }

        binding.tvClearLogs.setOnClickListener {
            App.clearLogs()
        }
    }

    private fun observeData() {
        val app = applicationContext as App

        // Connection State
        app.socketManager.connectionState.observe(this) { state ->
            when (state) {
                SocketManager.ConnectionState.CONNECTED -> {
                    binding.viewStatusDot.setBackgroundResource(R.drawable.status_dot_online)
                    binding.tvStatusText.text = getString(R.string.status_connected)
                    binding.tvStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_online))
                }
                SocketManager.ConnectionState.CONNECTING -> {
                    binding.viewStatusDot.setBackgroundResource(R.drawable.status_dot_offline)
                    binding.tvStatusText.text = getString(R.string.status_connecting)
                    binding.tvStatusText.setTextColor(ContextCompat.getColor(this, R.color.text_secondary))
                }
                SocketManager.ConnectionState.DISCONNECTED -> {
                    binding.viewStatusDot.setBackgroundResource(R.drawable.status_dot_offline)
                    binding.tvStatusText.text = getString(R.string.status_disconnected)
                    binding.tvStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_offline))
                }
                null -> {}
            }
        }

        // Live Message Logs
        App.logs.observe(this) { logs ->
            logsAdapter.submitList(logs)
            if (logs.isNullOrEmpty()) {
                binding.tvEmptyLogs.visibility = View.VISIBLE
                binding.rvLogs.visibility = View.GONE
            } else {
                binding.tvEmptyLogs.visibility = View.GONE
                binding.rvLogs.visibility = View.VISIBLE
            }
        }
    }

    private fun updateServerInfo() {
        val app = applicationContext as App
        val prefs = app.preferences

        if (prefs.isConfigured()) {
            binding.tvServerDetails.text = "सर्वर: ${prefs.serverUrl}"
            binding.tvDeviceDetails.text = "डिवाइस: ${prefs.deviceName}"
        } else {
            binding.tvServerDetails.text = "सर्वर: कॉन्फ़िगर नहीं है"
            binding.tvDeviceDetails.text = "डिवाइस: ${prefs.deviceName}"
        }

        binding.switchService.isChecked = prefs.isServiceEnabled
    }

    private fun updateSimInfo() {
        val app = applicationContext as App
        val sims = app.simManager.getAvailableSims()

        if (sims.isEmpty()) {
            binding.tvSimInfo.text = "कोई एक्टिव सिम कार्ड नहीं मिला या अनुमति नहीं मिली।"
        } else {
            val sb = StringBuilder()
            sims.forEach { sim ->
                sb.append("• SIM ${sim.slotIndex + 1}: ${sim.carrierName} (${sim.countryIso.uppercase()})\n")
            }
            val preferredSlot = app.preferences.preferredSim
            if (preferredSlot >= 0) {
                sb.append("डिफ़ॉल्ट सिम: SIM ${preferredSlot + 1}")
            } else {
                sb.append("डिफ़ॉल्ट सिम: ऑटोमैटिक")
            }
            binding.tvSimInfo.text = sb.toString().trim()
        }
    }

    private fun checkPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.SEND_SMS,
            Manifest.permission.RECEIVE_SMS,
            Manifest.permission.READ_SMS,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CAMERA
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    private fun showTestSmsDialog() {
        val view = LayoutInflater.from(this).inflate(android.R.layout.simple_list_item_1, null)
        val input = EditText(this).apply {
            hint = "मोबाइल नंबर दर्ज करें (उदा. +91XXXXXXXXXX)"
            inputType = android.text.InputType.TYPE_CLASS_PHONE
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this)
            .setTitle("टेस्ट एसएमएस भेजें")
            .setMessage("अपने मोबाइल से तुरंत एक टेस्ट मैसेज भेजकर जांचें:")
            .setView(input)
            .setPositiveButton("भेजें") { _, _ ->
                val phone = input.text.toString().trim()
                if (phone.isNotBlank()) {
                    val app = applicationContext as App
                    val testMessageId = "test_${System.currentTimeMillis()}"
                    val success = app.smsSendManager.sendSms(
                        messageId = testMessageId,
                        phoneNumber = phone,
                        messageText = "नमस्ते! यह ERS SMS Gateway से भेजा गया एक टेस्ट मैसेज है।"
                    )
                    if (success) {
                        Toast.makeText(this, "एसएमएस भेजने की प्रक्रिया शुरू हुई", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("रद्द करें", null)
            .show()
    }
}
