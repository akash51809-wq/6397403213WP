package com.sms.gateway.ui

import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.sms.gateway.R
import com.sms.gateway.data.model.SmsItem
import com.sms.gateway.data.model.SmsStatus
import com.sms.gateway.data.model.SmsType
import com.sms.gateway.databinding.ItemSmsLogBinding
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class LogsAdapter : ListAdapter<SmsItem, LogsAdapter.LogViewHolder>(DiffCallback) {

    private val timeFormat = SimpleDateFormat("hh:mm a", Locale.getDefault())

    object DiffCallback : DiffUtil.ItemCallback<SmsItem>() {
        override fun areItemsTheSame(oldItem: SmsItem, newItem: SmsItem): Boolean =
            oldItem.id == newItem.id

        override fun areContentsTheSame(oldItem: SmsItem, newItem: SmsItem): Boolean =
            oldItem == newItem
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): LogViewHolder {
        val binding = ItemSmsLogBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return LogViewHolder(binding)
    }

    override fun onBindViewHolder(holder: LogViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class LogViewHolder(private val binding: ItemSmsLogBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(item: SmsItem) {
            val context = itemView.context

            binding.tvAddress.text = item.address
            binding.tvMessage.text = item.message
            binding.tvTimestamp.text = timeFormat.format(Date(item.timestamp))
            binding.tvSimBadge.text = "SIM ${item.simSlot + 1}"

            // Type badge
            val badgeBg = GradientDrawable().apply {
                cornerRadius = 12f
                if (item.type == SmsType.SENT) {
                    setColor(ContextCompat.getColor(context, R.color.status_sent))
                } else {
                    setColor(ContextCompat.getColor(context, R.color.status_received))
                }
            }
            binding.tvTypeBadge.background = badgeBg
            binding.tvTypeBadge.text = if (item.type == SmsType.SENT) "SENT" else "INCOMING"

            // Status label
            if (item.type == SmsType.SENT) {
                binding.tvStatus.visibility = android.view.View.VISIBLE
                when (item.status) {
                    SmsStatus.PENDING -> {
                        binding.tvStatus.text = "Pending..."
                        binding.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.text_muted))
                    }
                    SmsStatus.SENT -> {
                        binding.tvStatus.text = "Sent ✓"
                        binding.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_sent))
                    }
                    SmsStatus.DELIVERED -> {
                        binding.tvStatus.text = "Delivered ✓✓"
                        binding.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_delivered))
                    }
                    SmsStatus.FAILED -> {
                        binding.tvStatus.text = "Failed: ${item.failureReason ?: "Unknown"}"
                        binding.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.status_failed))
                    }
                }
            } else {
                binding.tvStatus.visibility = android.view.View.GONE
            }
        }
    }
}
