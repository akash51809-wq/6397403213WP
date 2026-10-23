package com.sms.gateway.network

import android.app.Activity
import android.app.ProgressDialog
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.content.FileProvider
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.sms.gateway.App
import com.sms.gateway.R
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.TimeUnit

object UpdateManager {

    private val httpClient = SocketManager.createResilientClient().newBuilder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val gson = Gson()

    fun checkForUpdate(activity: Activity, isManual: Boolean = false) {
        val app = activity.applicationContext as App
        var serverUrl = app.preferences.serverUrl.trim().removeSuffix("/")

        if (serverUrl.contains("services.ers-new.onrender.com") || serverUrl.contains("services-ers-new.onrender.com")) {
            serverUrl = serverUrl.replace("services.ers-new.onrender.com", "services-ers.onrender.com")
                .replace("services-ers-new.onrender.com", "services-ers.onrender.com")
            app.preferences.serverUrl = serverUrl
        }

        if (serverUrl.isEmpty()) {
            if (isManual) {
                Toast.makeText(activity, "कृपया पहले सर्वर URL कॉन्फ़िगर करें!", Toast.LENGTH_SHORT).show()
            }
            return
        }

        val currentVersionCode = try {
            val packageInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                packageInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                packageInfo.versionCode
            }
        } catch (e: Exception) {
            1
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val updateEndpoint = "$serverUrl/api/sms/app-version"
                val request = Request.Builder()
                    .url(updateEndpoint)
                    .get()
                    .build()

                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        if (isManual) {
                            withContext(Dispatchers.Main) {
                                Toast.makeText(activity, "अपडेट जांचने में विफल (HTTP ${response.code})", Toast.LENGTH_SHORT).show()
                            }
                        }
                        return@launch
                    }

                    val bodyString = response.body?.string() ?: return@launch
                    val json = gson.fromJson(bodyString, JsonObject::class.java)

                    if (json.has("versionCode")) {
                        val remoteVersionCode = json.get("versionCode").asInt
                        val remoteVersionName = if (json.has("versionName")) json.get("versionName").asString else "2.0.0"
                        val releaseNotes = if (json.has("releaseNotes")) json.get("releaseNotes").asString else ""
                        val apkUrlRelative = if (json.has("apkUrl")) json.get("apkUrl").asString else "/download/ERS-SMS-Gateway.apk"
                        val fullDownloadUrl = if (apkUrlRelative.startsWith("http://") || apkUrlRelative.startsWith("https://")) {
                            apkUrlRelative
                        } else {
                            "$serverUrl/${apkUrlRelative.removePrefix("/")}"
                        }

                        if (remoteVersionCode > currentVersionCode) {
                            withContext(Dispatchers.Main) {
                                showUpdateDialog(
                                    activity = activity,
                                    versionName = remoteVersionName,
                                    releaseNotes = releaseNotes,
                                    downloadUrl = fullDownloadUrl
                                )
                            }
                        } else {
                            if (isManual) {
                                withContext(Dispatchers.Main) {
                                    Toast.makeText(
                                        activity,
                                        "ERS mobile SMS पहले से ही नवीनतम वर्ज़न પર है! (v$remoteVersionName)",
                                        Toast.LENGTH_LONG
                                    ).show()
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                if (isManual) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(activity, "सर्वर से कनेक्ट नहीं हो सका: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
    }

    private fun showUpdateDialog(
        activity: Activity,
        versionName: String,
        releaseNotes: String,
        downloadUrl: String
    ) {
        if (activity.isFinishing || activity.isDestroyed) return

        val msg = if (releaseNotes.isNotBlank()) {
            "नया वर्ज़न: v$versionName\n\nनए फीचर्स:\n$releaseNotes\n\nक्या आप अभी नया वर्ज़न इंस्टॉल करना चाहते हैं?"
        } else {
            "नया वर्ज़न v$versionName उपलब्ध है। क्या आप अभी अपडेट करना चाहते हैं?"
        }

        MaterialAlertDialogBuilder(activity)
            .setTitle("🚀 ERS mobile SMS नया अपडेट")
            .setMessage(msg)
            .setCancelable(false)
            .setPositiveButton("अभी अपडेट करें") { dialog, _ ->
                dialog.dismiss()
                downloadAndInstallApk(activity, downloadUrl)
            }
            .setNegativeButton("बाद में", null)
            .show()
    }

    private fun downloadAndInstallApk(activity: Activity, downloadUrl: String) {
        @Suppress("DEPRECATION")
        val progressDialog = ProgressDialog(activity).apply {
            setTitle("ERS mobile SMS डाउनलोड हो रहा है")
            setMessage("नया वर्ज़न डाउनलोड हो रहा है, कृपया प्रतीक्षा करें...")
            setProgressStyle(ProgressDialog.STYLE_HORIZONTAL)
            isIndeterminate = false
            max = 100
            setCancelable(false)
            show()
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val request = Request.Builder().url(downloadUrl).get().build()
                httpClient.newCall(request).execute().use { response ->
                    if (!response.isSuccessful) {
                        withContext(Dispatchers.Main) {
                            progressDialog.dismiss()
                            Toast.makeText(activity, "डाउनलोड विफल हुआ (HTTP ${response.code})", Toast.LENGTH_LONG).show()
                        }
                        return@launch
                    }

                    val body = response.body ?: throw Exception("खाली रिस्पॉन्स प्राप्त हुआ")
                    val contentLength = body.contentLength()
                    val targetDir = activity.getExternalFilesDir(null) ?: activity.cacheDir
                    val apkFile = File(targetDir, "ERS-mobile-SMS-update.apk")

                    if (apkFile.exists()) {
                        apkFile.delete()
                    }

                    var inputStream: InputStream? = null
                    var outputStream: FileOutputStream? = null

                    try {
                        inputStream = body.byteStream()
                        outputStream = FileOutputStream(apkFile)

                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        var totalRead: Long = 0

                        while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                            outputStream.write(buffer, 0, bytesRead)
                            totalRead += bytesRead
                            if (contentLength > 0) {
                                val progress = ((totalRead * 100) / contentLength).toInt()
                                withContext(Dispatchers.Main) {
                                    progressDialog.progress = progress
                                }
                            }
                        }
                        outputStream.flush()
                    } finally {
                        outputStream?.close()
                        inputStream?.close()
                    }

                    withContext(Dispatchers.Main) {
                        progressDialog.dismiss()
                        installApk(activity, apkFile)
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
                withContext(Dispatchers.Main) {
                    progressDialog.dismiss()
                    Toast.makeText(activity, "डाउनलोड त्रुटि: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun installApk(activity: Activity, apkFile: File) {
        try {
            if (!apkFile.exists() || apkFile.length() == 0L) {
                Toast.makeText(activity, "डाउनलोड की गई APK फ़ाइल नहीं मिली!", Toast.LENGTH_LONG).show()
                return
            }

            // Android 8.0+ Unknown App Sources Permission check
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activity.packageManager.canRequestPackageInstalls()) {
                    Toast.makeText(
                        activity,
                        "कृपया ERS mobile SMS को अपडेट इंस्टॉल करने की अनुमति दें",
                        Toast.LENGTH_LONG
                    ).show()
                    val permissionIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${activity.packageName}")
                    }
                    activity.startActivity(permissionIntent)
                    // Return - user can return or click update again
                }
            }

            val apkUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            activity.startActivity(installIntent)

        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(activity, "इंस्टॉलेशन शुरू नहीं हो सका: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
