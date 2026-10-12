import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SmsInboxPage() {
  const { notify } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterSender, setFilterSender] = useState('')
  const [selectedSim, setSelectedSim] = useState('')
  const [viewModalSms, setViewModalSms] = useState(null)

  const loadMessages = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      let url = '/api/sms/messages?limit=100'
      if (filterSender.trim()) url += `&sender=${encodeURIComponent(filterSender.trim())}`
      const res = await fetch(url).then(r => r.json())
      if (res.success) {
        setMessages(res.messages || [])
      }
    } catch (err) {
      if (isInitial) notify('Messages load error: ' + err.message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages(true)
    const timer = setInterval(() => loadMessages(false), 3500)
    return () => clearInterval(timer)
  }, [filterSender])

  const filteredMessages = messages.filter(m => {
    if (selectedSim !== '' && String(m.sim_slot) !== String(selectedSim)) {
      return false
    }
    return true
  })

  return (
    <div className="content">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">INCOMING MESSAGES</span>
          <h1>SMS Inbox</h1>
          <p>Real-time incoming SMS messages captured from your Android gateway</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={loadMessages}>
            ↻ Refresh Inbox
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Search by Sender ID or Keyword (e.g. HDFC, OTP)..."
              value={filterSender}
              onChange={e => setFilterSender(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
          </div>

          <div style={{ width: 140 }}>
            <select
              className="select"
              value={selectedSim}
              onChange={e => setSelectedSim(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="">All SIM Slots</option>
              <option value="0">SIM 1</option>
              <option value="1">SIM 2</option>
            </select>
          </div>

          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            {filteredMessages.length} message(s) found
          </span>
        </div>
      </div>

      {/* Messages Table Card */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Received SMS Records</h3>
            <p>Stored in SQLite with 48h automatic retention</p>
          </div>
          <span className="badge success">Live Feed</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {filteredMessages.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>📥</div>
              <strong>No Incoming SMS Found</strong>
              <p>Koi matching SMS nahi mila. Filter reset karein ya naye SMS ka intezar karein.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Sender</th>
                    <th>SIM</th>
                    <th>Message Text</th>
                    <th>Received At (IST)</th>
                    <th>Webhook</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map(sms => (
                    <tr key={sms.id}>
                      <td style={{ fontSize: 10, color: '#64748b' }}>#{sms.id}</td>
                      <td>
                        <strong style={{ color: '#0284c7' }}>{sms.sender}</strong>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(2,132,199,0.08)', color: '#0284c7' }}>
                          SIM {sms.sim_slot !== undefined ? sms.sim_slot + 1 : 1}
                        </span>
                      </td>
                      <td style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sms.message}
                      </td>
                      <td style={{ fontSize: 11, color: '#64748b' }}>{sms.received_at}</td>
                      <td>
                        <span className={`badge ${(sms.webhook_status || sms.delivery_status) === 'DELIVERED' ? 'success' : (sms.webhook_status || sms.delivery_status) === 'FAILED' ? 'failed' : 'pending'}`}>
                          {sms.webhook_status || sms.delivery_status || 'PROCESSED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                          onClick={() => setViewModalSms(sms)}
                        >
                          View 👁
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

      {/* SMS Detail Modal */}
      {viewModalSms && (
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
          <div className="card" style={{ maxWidth: 540, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div className="card-head">
              <div>
                <h3>SMS Details</h3>
                <p>From: <strong style={{ color: '#0284c7' }}>{viewModalSms.sender}</strong></p>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setViewModalSms(null)}
                style={{ width: 28, height: 28, fontSize: 14 }}
              >
                ×
              </button>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  MESSAGE CONTENT:
                </label>
                <div style={{
                  background: 'rgba(2,132,199,0.04)',
                  border: '1px solid rgba(2,132,199,0.14)',
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 13,
                  color: '#0f2736',
                  lineHeight: 1.6,
                  wordBreak: 'break-word',
                  userSelect: 'text'
                }}>
                  {viewModalSms.message}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 11 }}>
                <div>
                  <span style={{ color: '#64748b' }}>Received Time (IST):</span>
                  <div style={{ fontWeight: 600 }}>{viewModalSms.received_at}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>SIM Slot:</span>
                  <div style={{ fontWeight: 600 }}>SIM {viewModalSms.sim_slot + 1}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Device ID:</span>
                  <div style={{ fontWeight: 600 }}>{viewModalSms.device_id || 'android_device'}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Webhook Status:</span>
                  <div>
                    <span className={`badge ${viewModalSms.delivery_status === 'DELIVERED' ? 'success' : 'pending'}`}>
                      {viewModalSms.delivery_status || 'PROCESSED'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => setViewModalSms(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
