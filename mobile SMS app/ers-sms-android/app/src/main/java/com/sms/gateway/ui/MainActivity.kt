package com.sms.gateway.ui

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.sms.gateway.App
import com.sms.gateway.R
import com.sms.gateway.databinding.ActivityMainBinding
import com.sms.gateway.network.SocketManager
import com.sms.gateway.network.UpdateManager
import com.sms.gateway.service.GatewayForegroundService

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val logsAdapter = LogsAdapter()
    private var isUpdatingSwitch = false

    // Required Permissions launcher
    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val smsGranted = permissions[Manifest.permission.SEND_SMS] == true &&
                permissions[Manifest.permission.RECEIVE_SMS] == true
        if (smsGranted) {
            updateSimInfo()
        } else {
            Toast.makeText(this, "एसएमएस भेजने व प्राप्त करने की अनुमतियाँ आवश्यक हैं!", Toast.LENGTH_LONG).show()
        }
    }

    private val scanQrLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            val app = applicationContext as App
            app.preferences.isServiceEnabled = true
            updateServerInfo()
            // Always auto connect on QR scan
            GatewayForegroundService.startService(this)
            Toast.makeText(this, "🟢 सर्वर से कनेक्ट हो गया!", Toast.LENGTH_SHORT).show()
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

        val app = applicationContext as App
        // 24x7 Always connect by default if configured
        if (app.preferences.isConfigured() && app.preferences.isServiceEnabled) {
            GatewayForegroundService.startService(this)
        }

        // Automatic In-App Update Check on App Launch
        UpdateManager.checkForUpdate(this, isManual = false)

        // Lock-screen persistence: check battery optimization once
        checkBatteryOptimization()
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

        binding.btnCheckUpdate.setOnClickListener {
            UpdateManager.checkForUpdate(this, isManual = true)
        }

        binding.btnScanQr.setOnClickListener {
            scanQrLauncher.launch(Intent(this, ScanQrActivity::class.java))
        }

        binding.switchService.setOnCheckedChangeListener { _, isChecked ->
            if (isUpdatingSwitch) return@setOnCheckedChangeListener

            val app = applicationContext as App
            if (isChecked) {
                if (!app.preferences.isConfigured()) {
                    isUpdatingSwitch = true
                    binding.switchService.isChecked = false
                    isUpdatingSwitch = false
                    Toast.makeText(this, "कृपया पहले सर्वर सेटिंग्स कॉन्फ़िगर करें या QR स्कैन करें!", Toast.LENGTH_LONG).show()
                    startActivity(Intent(this, SettingsActivity::class.java))
                    return@setOnCheckedChangeListener
                }
                app.preferences.isServiceEnabled = true
                GatewayForegroundService.startService(this)
            } else {
                app.preferences.isServiceEnabled = false
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

        // Real-time Connection State Observer
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
                    binding.tvStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_connecting))
                }
                SocketManager.ConnectionState.DISCONNECTED, null -> {
                    binding.viewStatusDot.setBackgroundResource(R.drawable.status_dot_offline)
                    binding.tvStatusText.text = getString(R.string.status_disconnected)
                    binding.tvStatusText.setTextColor(ContextCompat.getColor(this, R.color.status_offline))
                }
            }
        }

        // Live Message Logs Observer
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
            binding.tvServerDetails.text = "सर्वर: कॉन्फ़िगर नहीं है (QR स्कैन करें)"
            binding.tvDeviceDetails.text = "डिवाइस: ${prefs.deviceName}"
        }

        isUpdatingSwitch = true
        binding.switchService.isChecked = prefs.isServiceEnabled
        isUpdatingSwitch = false
    }

    private fun updateSimInfo() {
        val app = applicationContext as App
        val sims = app.simManager.getAvailableSims()
        val prefs = app.preferences

        // Update badge
        val outDesc = when (prefs.outgoingSimPreference) {
            0 -> "आउटगोइंग: SIM 1"
            1 -> "आउटगोइंग: SIM 2"
            else -> "आउटगोइंग: Both"
        }
        val inDesc = when (prefs.incomingSimPreference) {
            0 -> "इनकमिंग: SIM 1"
            1 -> "इनकमिंग: SIM 2"
            else -> "इनकमिंग: Both"
        }
        binding.tvSimRoutingBadge.text = "$outDesc | $inDesc"

        if (sims.isEmpty()) {
            binding.tvSimInfo.text = "कोई एक्टिव सिम कार्ड नहीं मिला या अनुमति नहीं मिली।"
        } else {
            val sb = StringBuilder()
            sims.forEach { sim ->
                sb.append("• SIM ${sim.slotIndex + 1}: ${sim.carrierName} (${sim.countryIso.uppercase()})\n")
            }
            sb.append("\n[रूटिंग नियम]:\n")
            sb.append("• $outDesc\n")
            sb.append("• $inDesc\n")
            if (prefs.senderIdFilterMode.equals("custom", ignoreCase = true) && prefs.senderIdWhitelist.isNotBlank()) {
                sb.append("• सेंडर ID फ़िल्टर: केवल [${prefs.senderIdWhitelist}]")
            } else {
                sb.append("• सेंडर ID फ़िल्टर: All (सभी मैसेज)")
            }
            binding.tvSimInfo.text = sb.toString().trim()
        }
    }

    private fun checkBatteryOptimization() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                // Inform user once to allow lock-screen background operation
                MaterialAlertDialogBuilder(this)
                    .setTitle("⚡ 24x7 ऑलवेज कनेक्टेड")
                    .setMessage("जब फोन की स्क्रीन लॉक हो, तब भी एसएमएस सर्विस लगातार काम करती रहे इसके लिए बैटरी ऑप्टिमाइज़ेशन को 'Don't Optimize' पर सेट करें।")
                    .setPositiveButton("अनुमति दें") { _, _ ->
                        try {
                            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                                data = Uri.parse("package:$packageName")
                            }
                            startActivity(intent)
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    }
                    .setNegativeButton("बाद में", null)
                    .show()
            }
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
                        messageText = "नमस्ते! यह ERS mobile SMS गेटवे से भेजा गया एक टेस्ट मैसेज है।"
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
