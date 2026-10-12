import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SmsDevicesPage() {
  const { notify } = useAuth()
  const [qrCode, setQrCode] = useState('')
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState('')
  const [serverUrl, setServerUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [deviceConfigModal, setDeviceConfigModal] = useState(false)
  const [customWebhookUrl, setCustomWebhookUrl] = useState('')
  const [customWhitelist, setCustomWhitelist] = useState('')

  const loadQr = async () => {
    try {
      setQrLoading(true)
      setQrError('')
      const res = await fetch('/api/sms/qr').then(r => r.json())
      if (res && res.success) {
        setQrCode(res.qrCode)
        setServerUrl(res.serverUrl)
        setApiKey(res.apiKey)
      } else {
        setQrError(res?.message || 'QR कोड लोड करने में त्रुटि आई।')
      }
    } catch (e) {
      console.error('QR fetch error:', e)
      setQrError(e.message || 'नेटवर्क त्रुटि: QR लोड नहीं हुआ')
    } finally {
      setQrLoading(false)
    }
  }

  const loadDevices = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sms/devices').then(r => r.json())
      if (res.success) {
        setDevices(res.devices || [])
      }
    } catch (err) {
      notify('Devices fetch error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQr()
    loadDevices()
    const timer = setInterval(loadDevices, 10000)
    return () => clearInterval(timer)
  }, [])

  const openConfigModal = (dev) => {
    setSelectedDevice(dev)
    setCustomWebhookUrl(dev.webhook_url || '')
    setCustomWhitelist(dev.sender_whitelist || '')
    setDeviceConfigModal(true)
  }

  const saveDeviceConfig = async (e) => {
    e.preventDefault()
    if (!selectedDevice) return
    try {
      const res = await fetch(`/api/sms/devices/${selectedDevice.device_id}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: customWebhookUrl,
          senderWhitelist: customWhitelist
        })
      }).then(r => r.json())

      if (res.success) {
        notify('Device config updated!')
        setDeviceConfigModal(false)
        loadDevices()
      } else {
        notify('Config error: ' + res.message)
      }
    } catch (err) {
      notify('Config save failed: ' + err.message)
    }
  }

  return (
    <div className="content">
      {/* Hero Header */}
      <div className="hero">
        <div>
          <span className="eyebrow">ANDROID GATEWAY CONNECTION</span>
          <h1>Connected SMS Devices</h1>
          <p>Scan the QR code in the ERS SMS Gateway Android App to pair your phone</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={loadDevices}>
            ↻ Refresh Devices
          </button>
          <button type="button" className="btn primary" onClick={loadQr}>
            ⟳ Regenerate QR
          </button>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 20 }}>
        {/* Left Column: QR Code Pairing Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Pair Android Phone</h3>
              <p>Scan with ERS-SMS-Gateway App</p>
            </div>
            <span className="badge success">Active Gateway</span>
          </div>
          <div className="card-body" style={{ textAlign: 'center', padding: '24px 18px' }}>
            {qrCode ? (
              <div style={{ display: 'inline-block', padding: 12, background: '#fff', borderRadius: 16, border: '2px solid rgba(2,132,199,0.2)', boxShadow: '0 8px 24px rgba(2,132,199,0.12)' }}>
                <img src={qrCode} alt="SMS Pairing QR" style={{ width: 220, height: 220, display: 'block' }} />
              </div>
            ) : qrLoading ? (
              <div style={{ padding: '40px 20px', color: '#0284c7' }}>
                <div className="spinner-border text-primary mb-2" role="status" style={{ width: 28, height: 28 }}></div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>Pairing QR Code तैयार हो रहा है...</div>
              </div>
            ) : qrError ? (
              <div style={{ padding: '24px 16px', background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontWeight: 800, fontSize: 13.5, color: '#991b1b', marginBottom: 4 }}>QR Code लोड नहीं हो सका</div>
                <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{qrError}</div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary" 
                  onClick={loadQr}
                  style={{ borderRadius: 8, padding: '6px 14px', fontWeight: 700, fontSize: 12 }}
                >
                  ⟳ पुनः प्रयास करें (Retry)
                </button>
              </div>
            ) : (
              <div style={{ padding: 40, color: '#64748b' }}>QR Code loading...</div>
            )}

            <div style={{ marginTop: 18, textAlign: 'left', background: 'rgba(2,132,199,0.05)', padding: 14, borderRadius: 12, border: '1px solid rgba(2,132,199,0.12)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', marginBottom: 6 }}>MANUAL CONNECTION CREDENTIALS:</div>
              <div style={{ fontSize: 11, marginBottom: 4 }}>
                <strong>Server URL:</strong> <code style={{ color: '#0f2736', background: '#fff', padding: '2px 6px', borderRadius: 6 }}>{serverUrl || 'Loading...'}</code>
              </div>
              <div style={{ fontSize: 11 }}>
                <strong>API Key:</strong> <code style={{ color: '#0f2736', background: '#fff', padding: '2px 6px', borderRadius: 6 }}>{apiKey || 'Loading...'}</code>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'left', fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
              <strong>Setup Instructions:</strong>
              <ol style={{ paddingLeft: 18, margin: '6px 0 0' }}>
                <li>Apne Android phone me <b>ERS SMS Gateway APK</b> open karein.</li>
                <li>App ke top-right me <b>Scan QR</b> button dabayein.</li>
                <li>Upar diye gaye QR Code ko scan karein.</li>
                <li>SMS Receive aur Battery Optimization permission allow karein.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Paired Devices List */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Paired Android Devices</h3>
              <p>{devices.length} registered device(s)</p>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {devices.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                <strong>Koi Device Connected Nahi Hai</strong>
                <p>Upar diye gaye QR Code ko apne Android phone ke ERS app se scan karein.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Battery</th>
                      <th>Signal</th>
                      <th>SIM Info</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map(dev => (
                      <tr key={dev.device_id}>
                        <td>
                          <div style={{ fontWeight: 700, color: '#0284c7' }}>{dev.device_name || 'Android Phone'}</div>
                          <div style={{ fontSize: 10, color: '#64748b' }}>{dev.device_id}</div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{dev.battery_level !== undefined ? `${dev.battery_level}%` : '100%'}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11 }}>{dev.signal_strength !== undefined ? `${dev.signal_strength} dBm` : 'Good'}</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(2,132,199,0.08)', color: '#0284c7' }}>
                            {dev.sim_count ? `${dev.sim_count} SIM` : 'Dual SIM'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${dev.is_online ? 'success' : 'failed'}`}>
                            {dev.is_online ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: 10 }}
                            onClick={() => openConfigModal(dev)}
                          >
                            Config ⚙
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device Config Modal */}
      {deviceConfigModal && selectedDevice && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,39,54,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: 16
        }}>
          <div className="card" style={{ maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div className="card-head">
              <div>
                <h3>Device Configuration</h3>
                <p>{selectedDevice.device_name} ({selectedDevice.device_id})</p>
              </div>
              <button 
                type="button"
                className="icon-btn" 
                onClick={() => setDeviceConfigModal(false)}
                style={{ width: 28, height: 28, fontSize: 14 }}
              >
                ×
              </button>
            </div>
            <form onSubmit={saveDeviceConfig} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label>Custom Webhook URL for this Device (Optional)</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://your-domain.com/api/sms-webhook"
                  value={customWebhookUrl}
                  onChange={e => setCustomWebhookUrl(e.target.value)}
                />
                <small style={{ color: '#64748b', fontSize: 10 }}>Khali chhodne par default global webhook use hoga.</small>
              </div>

              <div className="field">
                <label>Sender Whitelist for this Device</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. HDFC, VI-OTP, SBI (or * for all)"
                  value={customWhitelist}
                  onChange={e => setCustomWhitelist(e.target.value)}
                />
                <small style={{ color: '#64748b', fontSize: 10 }}>Comma separated sender names ya * sabhi SMS ke liye.</small>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn" onClick={() => setDeviceConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
