import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SmsSendPage() {
  const { notify } = useAuth()
  const [recipient, setRecipient] = useState('')
  const [message, setMessage] = useState('')
  const [simSlot, setSimSlot] = useState(0)
  const [selectedDevice, setSelectedDevice] = useState('')
  const [devices, setDevices] = useState([])
  const [sending, setSending] = useState(false)
  const [outbox, setOutbox] = useState([])

  const loadOutbox = async () => {
    try {
      const [resOutbox, resDevices] = await Promise.all([
        fetch('/api/sms/outbox').then(r => r.json()),
        fetch('/api/sms/devices').then(r => r.json())
      ])
      if (resOutbox.success) setOutbox(resOutbox.outbox || [])
      if (resDevices.success) setDevices(resDevices.devices || [])
    } catch (e) {}
  }

  useEffect(() => {
    loadOutbox()
    const timer = setInterval(loadOutbox, 10000)
    return () => clearInterval(timer)
  }, [])

  // SMS character & parts calculation
  const charCount = message.length
  const smsParts = charCount === 0 ? 1 : Math.ceil(charCount / 160)
  const remainingInPart = charCount === 0 ? 160 : (160 * smsParts) - charCount

  const handleSend = async (e) => {
    e.preventDefault()
    if (!recipient.trim() || !message.trim()) {
      return notify('Kripya mobile number aur message body dalein.')
    }

    try {
      setSending(true)
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: recipient.trim(),
          message: message.trim(),
          simSlot: Number(simSlot),
          deviceId: selectedDevice || undefined
        })
      }).then(r => r.json())

      if (res.success) {
        notify('SMS successfully queued to ' + recipient)
        setMessage('')
        setRecipient('')
        loadOutbox()
      } else {
        notify('Send failed: ' + res.message)
      }
    } catch (err) {
      notify('Send error: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="content">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">SMS CAMPAIGN & OUTBOX</span>
          <h1>Send Mobile SMS</h1>
          <p>Send single SMS or OTP through your connected Android SIM card</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={loadOutbox}>
            ↻ Refresh Outbox
          </button>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Left Column: Send SMS Form */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Compose Message</h3>
              <p>Direct SIM Gateway Dispatch</p>
            </div>
            <span className="badge success">SIM Gateway</span>
          </div>
          <form onSubmit={handleSend} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Recipient Mobile Number (Indian or International)</label>
              <input
                type="tel"
                className="input"
                placeholder="e.g. 9876543210 or +919876543210"
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="fields">
              <div className="field">
                <label>Select SIM Slot</label>
                <select 
                  className="select" 
                  value={simSlot} 
                  onChange={e => setSimSlot(Number(e.target.value))}
                >
                  <option value={0}>SIM 1 (Default)</option>
                  <option value={1}>SIM 2</option>
                </select>
              </div>

              <div className="field">
                <label>Target Android Device</label>
                <select 
                  className="select" 
                  value={selectedDevice} 
                  onChange={e => setSelectedDevice(e.target.value)}
                >
                  <option value="">Auto Select (Online Device)</option>
                  {devices.map(d => (
                    <option key={d.device_id} value={d.device_id}>
                      {d.device_name || d.device_id} ({d.is_online ? 'Online' : 'Offline'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Message Content</label>
                <span style={{ fontSize: 10, color: '#0284c7', fontWeight: 700 }}>
                  {charCount} chars · {smsParts} SMS {smsParts > 1 ? `(${remainingInPart} chars left in part)` : ''}
                </span>
              </div>
              <textarea
                className="textarea"
                placeholder="Type your SMS message here..."
                rows={5}
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
              />
            </div>

            {/* Quick Templates */}
            <div>
              <small style={{ color: '#64748b', fontSize: 10, display: 'block', marginBottom: 6 }}>Quick Templates:</small>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setMessage('Your OTP for verification is 482910. Valid for 10 minutes. Do not share with anyone.')}
                >
                  OTP Template
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setMessage('Dear Customer, your recharge of Rs 299 was successful. Thank you for choosing our service.')}
                >
                  Recharge Success
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setMessage('Hello! Welcome to our service. For any support, call 1800-XXX-XXXX.')}
                >
                  Welcome
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={sending}
              style={{ marginTop: 8, justifyContent: 'center' }}
            >
              {sending ? 'Queueing SMS...' : '📤 Send SMS Now'}
            </button>
          </form>
        </div>

        {/* Right Column: Outbox Log */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Outbox Logs</h3>
              <p>Recent sent & queued SMS</p>
            </div>
            <span className="badge" style={{ background: 'rgba(2,132,199,0.1)', color: '#0284c7' }}>
              {outbox.length} Queued
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {outbox.length === 0 ? (
              <div className="empty">
                <strong>No Sent SMS Yet</strong>
                <p>Abhi tak koi SMS send nahi kiya gaya hai.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Recipient</th>
                      <th>Message</th>
                      <th>SIM</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outbox.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: '#0284c7' }}>{item.recipient}</td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.message}
                        </td>
                        <td>
                          <span className="badge" style={{ background: 'rgba(2,132,199,0.08)', color: '#0284c7' }}>
                            SIM {item.simSlot + 1}
                          </span>
                        </td>
                        <td>
                          <span className="badge success">QUEUED</span>
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
    </div>
  )
}
