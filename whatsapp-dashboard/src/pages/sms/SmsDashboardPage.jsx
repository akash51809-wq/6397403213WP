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
          <p>Android phone SMS receiver &amp; real-time webhook automation hub</p>
        </div>
        <div className="actions" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="/download/ERS-SMS-Gateway.apk"
            download="ERS-SMS-Gateway.apk"
            className="apk-blink-btn-hero"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              animation: 'apk-blink-glow 2s infinite ease-in-out',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.45)'
            }}
          >
            <span className="apk-pulse-dot"></span>
            <span>📲 Download APK (v1.0)</span>
          </a>
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

      {/* Embedded CSS for Animated Blinking APK Button */}
      <style>{`
        @keyframes apk-blink-glow {
          0% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7), 0 4px 18px rgba(2, 132, 199, 0.4);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0), 0 4px 28px rgba(16, 185, 129, 0.85);
            transform: scale(1.025);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0), 0 4px 18px rgba(2, 132, 199, 0.4);
            transform: scale(1);
          }
        }
        @keyframes apk-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.85); }
        }
        .apk-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ffffff;
          display: inline-block;
          animation: apk-pulse 1.2s infinite ease-in-out;
        }
        .apk-blink-action-btn:hover {
          transform: translateY(-2px) scale(1.03) !important;
          filter: brightness(1.1);
        }
      `}</style>

      {/* Prominent Animated Callout Banner for APK Download */}
      <div 
        className="card apk-download-banner" 
        style={{ 
          marginBottom: 22,
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '2px solid rgba(16, 185, 129, 0.55)',
          boxShadow: '0 10px 30px rgba(2, 132, 199, 0.2)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{
          padding: '18px 22px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div 
              style={{
                width: 50,
                height: 50,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #10b981, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                boxShadow: '0 6px 18px rgba(16, 185, 129, 0.45)',
                flexShrink: 0
              }}
            >
              📲
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#ffffff' }}>
                  ERS SMS Gateway Android App (v1.0)
                </h3>
                <span 
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: 999,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span className="apk-pulse-dot" style={{ width: 6, height: 6 }}></span>
                  OFFICIAL APK
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#94a3b8', lineHeight: 1.4 }}>
                Android फोन में SMS रिसीव करने, डुअल-सिम राउटिंग और रियल-टाइम सिंक के लिए ऐप इंस्टॉल करें।
              </p>
            </div>
          </div>

          <a
            href="/download/ERS-SMS-Gateway.apk"
            download="ERS-SMS-Gateway.apk"
            className="apk-blink-action-btn"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #0284c7 100%)',
              color: '#ffffff',
              padding: '11px 22px',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 13.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              animation: 'apk-blink-glow 2.2s infinite ease-in-out',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.5)',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: 20 }}>📥</span>
            <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
              <div style={{ fontWeight: 900 }}>Download APK</div>
              <div style={{ fontSize: 11, opacity: 0.9, fontWeight: 600 }}>v1.0 (7.1 MB) • Direct Install</div>
            </div>
          </a>
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
