import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SmsDashboardPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSms: 0,
    delivered: 0,
    retrying: 0,
    failed: 0,
    activeDevicesCount: 0,
    devicesCount: 0,
    serverUrl: ''
  })
  const [devices, setDevices] = useState([])
  const [recentSms, setRecentSms] = useState([])

  const loadData = async () => {
    try {
      setLoading(true)
      const [resStatus, resDevices, resMessages] = await Promise.all([
        fetch('/api/sms/status').then(r => r.json()),
        fetch('/api/sms/devices').then(r => r.json()),
        fetch('/api/sms/messages?limit=10').then(r => r.json())
      ])

      if (resStatus.success) setStats(resStatus.data)
      if (resDevices.success) setDevices(resDevices.devices || [])
      if (resMessages.success) setRecentSms(resMessages.messages || [])
    } catch (err) {
      notify('SMS status load karne me error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 12000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="content">
      {/* Hero Header */}
      <div className="hero">
        <div>
          <span className="eyebrow">MOBILE SMS HUB</span>
          <h1>SMS Gateway Dashboard</h1>
          <p>Android phone SMS receiver & real-time webhook automation hub</p>
        </div>
        <div className="actions">
          <button 
            type="button"
            className="btn" 
            onClick={loadData}
            title="Refresh statistics"
          >
            ↻ Refresh
          </button>
          <button 
            type="button"
            className="btn primary" 
            onClick={() => navigate('/sms/devices')}
          >
            + Connect Device (QR)
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <small>TOTAL INCOMING SMS</small>
          <strong>{stats.totalSms}</strong>
          <span>48h auto-retention</span>
        </div>

        <div className="stat">
          <small>DELIVERED WEBHOOKS</small>
          <strong style={{ color: '#0284c7' }}>{stats.delivered}</strong>
          <span>HTTP 200 OK</span>
        </div>

        <div className="stat">
          <small>RETRY QUEUE</small>
          <strong style={{ color: '#f59e0b' }}>{stats.retrying}</strong>
          <span>Auto-retry in 2m</span>
        </div>

        <div className="stat">
          <small>FAILED DELIVERIES</small>
          <strong style={{ color: '#ef4444' }}>{stats.failed}</strong>
          <span>Manual resend ready</span>
        </div>
      </div>

      {/* Main Split Section */}
      <div className="split">
        {/* Left Column: Recent Incoming SMS */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Recent Incoming SMS</h3>
              <p>Real-time feed from paired Android devices</p>
            </div>
            <button 
              type="button"
              className="btn" 
              style={{ padding: '6px 12px', fontSize: 11 }}
              onClick={() => navigate('/sms/inbox')}
            >
              View Full Inbox →
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {recentSms.length === 0 ? (
              <div className="empty">
                <strong>No Incoming SMS Yet</strong>
                <p>Abhi tak koi SMS receive nahi hua hai. Device connect karein aur test SMS bhejein.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Sender</th>
                      <th>Message Body</th>
                      <th>SIM</th>
                      <th>Time (IST)</th>
                      <th>Webhook</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSms.map((sms) => (
                      <tr key={sms.id}>
                        <td style={{ fontWeight: 700, color: '#0284c7' }}>{sms.sender}</td>
                        <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sms.message}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>
                            SIM {sms.sim_slot !== undefined ? sms.sim_slot + 1 : 1}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, color: '#64748b' }}>{sms.received_at}</td>
                        <td>
                          <span className={`badge ${sms.delivery_status === 'DELIVERED' ? 'success' : sms.delivery_status === 'FAILED' ? 'failed' : 'pending'}`}>
                            {sms.delivery_status || 'PROCESSED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Connected Devices & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Android Gateways</h3>
                <p>{stats.activeDevicesCount} / {stats.devicesCount} Online</p>
              </div>
              <button 
                type="button"
                className="btn" 
                style={{ padding: '6px 10px', fontSize: 11 }}
                onClick={() => navigate('/sms/devices')}
              >
                Manage
              </button>
            </div>
            <div className="card-body">
              {devices.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📱</div>
                  <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>No Android Phone Paired</strong>
                  <p style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
                    Apne Android phone me ERS SMS Gateway APK install karke QR code scan karein.
                  </p>
                  <button 
                    type="button"
                    className="btn primary" 
                    style={{ fontSize: 11 }}
                    onClick={() => navigate('/sms/devices')}
                  >
                    Pair Device via QR
                  </button>
                </div>
              ) : (
                <div className="list">
                  {devices.map(dev => (
                    <div key={dev.device_id} className="list-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>📱</span>
                        <div>
                          <strong>{dev.device_name || 'Android Device'}</strong>
                          <small>ID: {dev.device_id} · Bat: {dev.battery_level || 100}%</small>
                        </div>
                      </div>
                      <span className={`badge ${dev.is_online ? 'success' : 'failed'}`}>
                        {dev.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Quick SMS Outbox</h3>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                Bina WhatsApp ke kisi bhi Indian mobile number par seedha text SMS ya OTP bhejein.
              </p>
              <button 
                type="button"
                className="btn primary" 
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => navigate('/sms/send')}
              >
                Compose & Send SMS →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
