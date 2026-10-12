import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SmsReportsPage() {
  const { notify } = useAuth()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [retryingId, setRetryingId] = useState(null)

  const loadDeliveries = async () => {
    try {
      setLoading(true)
      let url = '/api/sms/webhook-deliveries?limit=100'
      if (statusFilter) url += `&status=${statusFilter}`
      const res = await fetch(url).then(r => r.json())
      if (res.success) {
        setDeliveries(res.deliveries || [])
      }
    } catch (err) {
      notify('Deliveries report error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeliveries()
    const timer = setInterval(loadDeliveries, 10000)
    return () => clearInterval(timer)
  }, [statusFilter])

  const handleManualResend = async (delivery) => {
    try {
      setRetryingId(delivery.id)
      const res = await fetch('/api/sms/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: delivery.webhook_url })
      }).then(r => r.json())

      if (res.success) {
        notify('Resend successful to ' + delivery.webhook_url)
        loadDeliveries()
      } else {
        notify('Resend returned non-200: ' + (res.result?.errorMessage || res.message))
      }
    } catch (err) {
      notify('Resend failed: ' + err.message)
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="content">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">AUDIT & LOGS</span>
          <h1>Webhook Delivery Reports</h1>
          <p>Trace every HTTP dispatch attempt, response codes, and retry queue status</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={loadDeliveries}>
            ↻ Refresh Reports
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-body" style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 200 }}>
            <select
              className="select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px' }}
            >
              <option value="">All Statuses</option>
              <option value="DELIVERED">Delivered (200 OK)</option>
              <option value="RETRY_SCHEDULED">Retry Scheduled</option>
              <option value="FAILED">Failed</option>
              <option value="SENDER_BLOCKED">Sender Blocked</option>
            </select>
          </div>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Showing {deliveries.length} delivery record(s)
          </span>
        </div>
      </div>

      {/* Reports Table */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Webhook Dispatches</h3>
            <p>Delivery latency & response logs</p>
          </div>
          <span className="badge success">Audit Logs</span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {deliveries.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
              <strong>No Webhook Delivery Logs</strong>
              <p>Abhi tak koi webhook dispatch attempt record nahi hua hai.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Message ID</th>
                    <th>Target Webhook URL</th>
                    <th>Status</th>
                    <th>HTTP Code</th>
                    <th>Attempts</th>
                    <th>Latency</th>
                    <th>Attempt Time (IST)</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map(d => (
                    <tr key={d.id}>
                      <td style={{ fontSize: 10, color: '#64748b' }}>#{d.id}</td>
                      <td>
                        <strong style={{ color: '#0284c7' }}>#{d.sms_id}</strong>
                      </td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                        <code>{d.webhook_url}</code>
                      </td>
                      <td>
                        <span className={`badge ${d.status === 'DELIVERED' ? 'success' : d.status === 'FAILED' ? 'failed' : 'pending'}`}>
                          {d.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: d.http_status === 200 ? '#0284c7' : '#ef4444' }}>
                          {d.http_status || '-'}
                        </span>
                      </td>
                      <td>{d.attempts || 1}</td>
                      <td>{d.response_time_ms ? `${d.response_time_ms}ms` : '-'}</td>
                      <td style={{ fontSize: 11, color: '#64748b' }}>{d.last_attempt_at}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                          disabled={retryingId === d.id}
                          onClick={() => handleManualResend(d)}
                        >
                          {retryingId === d.id ? 'Resending...' : 'Resend ↻'}
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
  )
}
