package com.sms.gateway.sms

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import androidx.core.app.ActivityCompat
import com.sms.gateway.data.model.SimInfo

class SimManager(private val context: Context) {

    fun getAvailableSims(): List<SimInfo> {
        val simList = mutableListOf<SimInfo>()

        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.READ_PHONE_STATE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return simList
        }

        try {
            val subscriptionManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                context.getSystemService(SubscriptionManager::class.java)
            } else {
                SubscriptionManager.from(context)
            }

            val activeSubscriptions: List<SubscriptionInfo>? =
                subscriptionManager?.activeSubscriptionInfoList

            activeSubscriptions?.forEach { info ->
                val slotIndex = info.simSlotIndex
                val carrierName = info.carrierName?.toString() ?: "SIM ${slotIndex + 1}"
                val displayName = info.displayName?.toString() ?: carrierName
                val countryIso = info.countryIso ?: ""

                simList.add(
                    SimInfo(
                        slotIndex = slotIndex,
                        subscriptionId = info.subscriptionId,
                        carrierName = carrierName,
                        displayName = displayName,
                        countryIso = countryIso
                    )
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return simList
    }

    fun getSubscriptionIdForSlot(slotIndex: Int): Int? {
        val sims = getAvailableSims()
        return sims.firstOrNull { it.slotIndex == slotIndex }?.subscriptionId
    }
}
