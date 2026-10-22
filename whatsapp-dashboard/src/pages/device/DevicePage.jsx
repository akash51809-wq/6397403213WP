import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import '../../styles/device.css'

export function DevicePage() {
  const {
    status,
    qr,
    stats,
    currentUser,
    isAdmin,
    loadStatus,
    loadQr,
    connectUserWhatsApp,
    disconnectUserWhatsApp,
    notify,
    planInfo
  } = useAuth()

  const [devices, setDevices] = useState([])
  const [allowedDevicesCount, setAllowedDevicesCount] = useState(isAdmin ? 4 : (planInfo?.allowedDevices || 1))
  const [connectingSlots, setConnectingSlots] = useState({})
  const [disconnectingSlots, setDisconnectingSlots] = useState({})
  const [pairingPhone, setPairingPhone] = useState({})
  const [pairingCode, setPairingCode] = useState({})
  const [loadingPairingCode, setLoadingPairingCode] = useState({})
  const [showPairingInput, setShowPairingInput] = useState({})

  const handleRequestPairingCode = async (slotId) => {
    const phone = pairingPhone[slotId] || ''
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      notify('कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।')
      return
    }
    setLoadingPairingCode(prev => ({ ...prev, [slotId]: true }))
    try {
      notify(`Device Slot 0${slotId}: Pairing Code तैयार हो रहा है...`)
      const res = await api('/api/devices/pairing-code', {
        method: 'POST',
        body: JSON.stringify({ slot: slotId, phoneNumber: phone })
      })
      if (res && res.success && res.code) {
        setPairingCode(prev => ({ ...prev, [slotId]: res.code }))
        notify(`Pairing Code: ${res.code}`)
      } else {
        notify(res?.message || 'Pairing code error')
      }
    } catch (err) {
      notify(err.message || 'Pairing code failed')
    } finally {
      setLoadingPairingCode(prev => ({ ...prev, [slotId]: false }))
    }
  }

  const onConnect = () => {
    connectUserWhatsApp()
  }

  const fetchDevices = useCallback(async () => {
    try {
      const res = await api('/api/devices')
      if (res && res.success) {
        setDevices(prev => {
          if (JSON.stringify(prev) === JSON.stringify(res.devices)) return prev
          return res.devices || []
        })
        if (res.allowedDevices) {
          setAllowedDevicesCount(res.allowedDevices)
        }
      }
    } catch (err) {
      // Fallback: construct slot 1 from global status if /api/devices is offline
      const isConnected = status?.status === 'connected'
      const fallbackAllowed = isAdmin ? 4 : (planInfo?.allowedDevices || 1)
      setAllowedDevicesCount(fallbackAllowed)
      const fallbackList = []
      for (let sIdx = 1; sIdx <= fallbackAllowed; sIdx++) {
        if (sIdx === 1) {
          fallbackList.push({
            slot: 1,
            status: status?.status || 'disconnected',
            number: status?.number || null,
            profileName: status?.profileName || (currentUser?.username || 'WhatsApp Account'),
            profilePicUrl: status?.profilePicUrl || null,
            qr: null,
            ready: isConnected,
            role: isAdmin ? 'admin' : 'user'
          })
        } else {
          fallbackList.push({
            slot: sIdx,
            status: 'disconnected',
            number: null,
            profileName: isAdmin ? `Admin Device 0${sIdx}` : `Device 0${sIdx}`,
            profilePicUrl: null,
            qr: null,
            ready: false,
            role: isAdmin ? 'admin' : 'user'
          })
        }
      }
      setDevices(fallbackList)
    }
  }, [isAdmin, planInfo?.allowedDevices, currentUser?.username])

  useEffect(() => {
    fetchDevices()
    const timer = setInterval(() => {
      fetchDevices()
    }, 3000)
    return () => clearInterval(timer)
  }, [fetchDevices])

  const handleConnect = async (slotId) => {
    setConnectingSlots(prev => ({ ...prev, [slotId]: true }))
    try {
      notify(`Device Slot 0${slotId}: QR कोड लोड हो रहा है...`)
      const res = await api('/api/devices/connect', {
        method: 'POST',
        body: JSON.stringify({ slot: slotId, force: true })
      })
      if (res && res.success) {
        if (res.qr) {
          setDevices(prev => prev.map(d => d.slot === slotId ? { ...d, qr: res.qr, status: 'waiting' } : d))
        }
        await fetchDevices()
        if (loadStatus) loadStatus()
        if (loadQr) loadQr()
      }
    } catch (err) {
      notify(`Slot 0${slotId} connect error: ` + (err.message || 'Error'))
    } finally {
      setConnectingSlots(prev => ({ ...prev, [slotId]: false }))
    }
  }

  const handleDisconnect = async (slotId) => {
    if (!window.confirm(`क्या आप Device Slot 0${slotId} का WhatsApp सेशन डिस्कनेक्ट करना चाहते हैं?`)) {
      return
    }
    setDisconnectingSlots(prev => ({ ...prev, [slotId]: true }))
    try {
      const res = await api('/api/devices/disconnect', {
        method: 'POST',
        body: JSON.stringify({ slot: slotId })
      })
      if (res && res.success) {
        notify(`Device Slot 0${slotId} disconnected.`)
        await fetchDevices()
        if (loadStatus) loadStatus()
        if (loadQr) loadQr()
      }
    } catch (err) {
      notify(`Slot 0${slotId} disconnect error: ` + (err.message || 'Error'))
    } finally {
      setDisconnectingSlots(prev => ({ ...prev, [slotId]: false }))
    }
  }

  // Ensure we display exact allowed number of device cards
  const displaySlots = []
  const maxSlots = allowedDevicesCount || (isAdmin ? 4 : 1)
  for (let sIdx = 1; sIdx <= maxSlots; sIdx++) {
    const existing = devices.find(d => d.slot === sIdx)
    if (existing) {
      displaySlots.push(existing)
    } else {
      displaySlots.push({
        slot: sIdx,
        status: 'disconnected',
        number: null,
        profileName: isAdmin ? `Admin Device 0${sIdx}` : `Device 0${sIdx}`,
        profilePicUrl: null,
        qr: null,
        ready: false,
        role: isAdmin ? 'admin' : 'user'
      })
    }
  }

  return (
    <div className="content device-page">
      <section className="device-limit-head">
        <div>
          <span className="eyebrow">DEVICE MANAGEMENT</span>
          <h1>Allow Device Limit</h1>
        </div>
        <div className="limit-pill">
          <small>ALLOWED DEVICES</small>
          <strong>{maxSlots}</strong>
        </div>
      </section>

      <div className="device-grid device-slots">
        {displaySlots.map((dev) => {
          const sId = dev.slot
          const isSlotConnected = dev.status === 'connected' || dev.ready
          const slotQr = dev.qr || (sId === 1 ? qr : null)
          const isSlotConnecting = Boolean(connectingSlots[sId]) || (dev.status === 'connecting' && !slotQr)
          const isSlotDisconnecting = Boolean(disconnectingSlots[sId])
          const displayName = dev.profileName || (isAdmin ? `Admin Device 0${sId}` : `Device 0${sId}`)
          const initial = (displayName.replace(/[^a-zA-Z0-9]/g, '') || 'W')[0].toUpperCase()

          return (
            <React.Fragment key={sId}>
              {isSlotConnected ? (
                <article className="card device-card connected-card">
                  <div className="device-top">
                    <div className="dp-wrap">
                      {dev.profilePicUrl ? (
                        <img
                          src={dev.profilePicUrl}
                          alt="WhatsApp DP"
                          className="device-dp"
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 14,
                            objectFit: 'cover',
                            border: '2px solid #10b981'
                          }}
                        />
                      ) : (
                        <div
                          className="device-dp"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(145deg, #35cb89, #129e65)',
                            color: '#fff',
                            fontWeight: 800,
                            fontSize: 18,
                            borderRadius: 14,
                            width: 44,
                            height: 44
                          }}
                        >
                          {initial}
                        </div>
                      )}
                      <span className="online-dot" title="Online"></span>
                    </div>
                    <span className="badge success">Connected</span>
                  </div>

                  <div className="device-info">
                    <h3>{displayName}</h3>
                    <p>{dev.number ? `+${dev.number}` : `Device Slot 0${sId}`}</p>
                    <span className="device-label">
                      {sId === 1 ? 'Primary WhatsApp' : `Slot 0${sId} WhatsApp`}
                    </span>
                  </div>

                  <div className="device-meta">
                    <span>
                      <small>MESSAGES</small>
                      <b>{sId === 1 ? (stats?.sent || 0) : 'Active'}</b>
                    </span>
                    <span>
                      <small>STATUS</small>
                      <b style={{ color: '#148957' }}>Online</b>
                    </span>
                  </div>

                  <button 
                    type="button" 
                    className="btn" 
                    onClick={() => handleDisconnect(sId)}
                    disabled={isSlotDisconnecting}
                    style={{ 
                      opacity: isSlotDisconnecting ? 0.6 : 1, 
                      cursor: isSlotDisconnecting ? 'not-allowed' : 'pointer',
                      backgroundColor: isSlotDisconnecting ? '#9ca3af' : undefined 
                    }}
                  >
                    {isSlotDisconnecting ? 'Disconnecting...' : 'Disconnect Session'}
                  </button>
                </article>
              ) : (
                <article className="card device-card qr-card">
                  {slotQr ? (
                    <div className="qr-active-box">
                      <img
                        src={slotQr}
                        alt={`Scan WhatsApp QR Slot 0${sId}`}
                      />
                      <strong>Scan with WhatsApp</strong>
                      <small>Linked Devices &gt; Link a Device</small>
                    </div>
                  ) : (
                    <div className="qr-placeholder">
                      <div className="qr-icon">▦</div>
                      <strong>{isSlotConnecting ? 'Generating QR...' : 'Show QR'}</strong>
                      <small>{isSlotConnecting ? 'Connecting to server...' : 'Scan QR to connect WhatsApp'}</small>
                    </div>
                  )}

                  <div className="qr-slot">
                    <span>DEVICE SLOT 0{sId}</span>
                    <b>{isSlotConnecting ? 'Connecting...' : (slotQr ? 'Scan Ready' : 'Available')}</b>
                  </div>

                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => handleConnect(sId)}
                    disabled={isSlotConnecting}
                    style={{ width: '100%' }}
                  >
                    {isSlotConnecting ? 'Connecting...' : (slotQr ? '↻ Generate Fresh QR' : 'Show QR')}
                  </button>

                  <div style={{ marginTop: 10, textAlign: 'center', width: '100%' }}>
                    {!showPairingInput[sId] ? (
                      <button
                        type="button"
                        onClick={() => setShowPairingInput(prev => ({ ...prev, [sId]: true }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#16a765',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        📱 Scan nahi ho raha? Number se link karein (Pairing Code)
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="tel"
                            placeholder="WhatsApp Number (e.g. 9876543210)"
                            value={pairingPhone[sId] || ''}
                            onChange={(e) => setPairingPhone(prev => ({ ...prev, [sId]: e.target.value }))}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: '1px solid #cbd5e1',
                              fontSize: 12,
                              color: '#183126',
                              background: '#fff'
                            }}
                          />
                          <button
                            type="button"
                            className="btn"
                            disabled={loadingPairingCode[sId]}
                            onClick={() => handleRequestPairingCode(sId)}
                            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700 }}
                          >
                            {loadingPairingCode[sId] ? '...' : 'Get Code'}
                          </button>
                        </div>
                        {pairingCode[sId] && (
                          <div style={{
                            background: '#ecfdf5',
                            border: '1px solid #10b981',
                            borderRadius: 8,
                            padding: '8px 10px',
                            color: '#065f46',
                            fontSize: 12,
                            textAlign: 'center'
                          }}>
                            <div>WhatsApp Pairing Code:</div>
                            <strong style={{ fontSize: 18, letterSpacing: 3, display: 'block', margin: '4px 0', color: '#047857' }}>
                              {pairingCode[sId]}
                            </strong>
                            <small style={{ color: '#047857', fontSize: 10 }}>
                              WhatsApp &gt; Linked Devices &gt; Link with phone number instead
                            </small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default DevicePage
