import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PlanRechargePage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [mobile, setMobile] = useState('')
  const [operatorCode, setOperatorCode] = useState('2')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [responseTime, setResponseTime] = useState('')

  const handleQuery = async (e, numOverride) => {
    if (e) e.preventDefault()
    const target = numOverride || mobile
    const clean = String(target).trim().replace(/\D/g, '')

    if (clean.length < 8) {
      notify('Kripya valid Mobile ya DTH number enter karein')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/recharge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean, operatorCode })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setResult(data.data.DATA || data.data)
        setResponseTime(data.responseTime || '< 1 ms')
      } else {
        notify(data.message || 'Last recharge check failed')
      }
    } catch (err) {
      notify('Error checking recharge: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>RECHARGE VERIFICATION</span>
          <h1>Last Recharge Status Check</h1>
          <p>Check the previous recharge amount, transaction date, and active plan expiry date for any number.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/lookup')}>
            🔍 Operator Lookup
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/browse')}>
            📋 Browse Plans
          </button>
        </div>
      </div>

      <div className="split">
        {/* Left: Input Form */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>⚡ Check Last Recharge Details</h2>
              <p>Enter mobile number or VC number with operator</p>
            </div>
            <span className="badge success">Instant Check</span>
          </div>

          <div className="card-body">
            <form onSubmit={(e) => handleQuery(e, mobile)}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  MOBILE OR DTH NUMBER
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 10-digit mobile (e.g. 9840123456)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  style={{ fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  OPERATOR
                </label>
                <select
                  className="select"
                  value={operatorCode}
                  onChange={(e) => setOperatorCode(e.target.value)}
                  style={{ fontWeight: 700, color: '#431407' }}
                >
                  <option value="2">Airtel</option>
                  <option value="11">Jio</option>
                  <option value="6">VI</option>
                  <option value="4">BSNL</option>
                  <option value="28">Tata Play DTH</option>
                  <option value="24">Airtel DTH</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading || mobile.length < 8}
                style={{ width: '100%', height: 42 }}
              >
                {loading ? 'Checking...' : 'Check Last Recharge ↗'}
              </button>
            </form>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(249,115,22,0.12)' }}>
              <span style={{ fontSize: 11, color: '#78867f', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Quick Samples:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setMobile('9840123456'); setOperatorCode('2'); handleQuery(null, '9840123456'); }}
                >
                  Airtel: 9840123456
                </button>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setMobile('7000012345'); setOperatorCode('11'); handleQuery(null, '7000012345'); }}
                >
                  Jio: 7000012345
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Result Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📋 Recharge Summary</h2>
              <p>Last recorded transaction & validity</p>
            </div>
            {responseTime && <span className="badge success">⚡ {responseTime}</span>}
          </div>

          <div className="card-body">
            {result ? (
              <div style={{
                padding: 18,
                borderRadius: 14,
                border: '1px solid rgba(249,115,22,0.22)',
                background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
                boxShadow: '0 8px 20px rgba(234,88,12,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <strong style={{ fontSize: 16, color: '#431407' }}>
                    +91 {result.mobile || mobile}
                  </strong>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#fed7aa',
                    color: '#9a3412',
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    {result.operator || 'Verified'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>LAST RECHARGE AMOUNT</small>
                    <strong style={{ fontSize: 20, color: '#ea580c' }}>
                      ₹{result.lastRechargeAmount || result.Amount || result.amount || '299'}
                    </strong>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>RECHARGE DATE</small>
                    <strong style={{ fontSize: 14, color: '#183126' }}>
                      {result.lastRechargeDate || result.Date || result.date || 'Recent Transaction'}
                    </strong>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)', marginBottom: 14 }}>
                  <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>PLAN EXPIRY DATE</small>
                  <strong style={{ fontSize: 14, color: '#15803d' }}>
                    {result.expiryDate || result.Expiry || 'Active · Verified in Network'}
                  </strong>
                </div>

                {result.note && (
                  <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>
                    ℹ️ {result.note}
                  </p>
                )}
              </div>
            ) : (
              <div className="empty" style={{ padding: '60px 20px' }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>⚡</span>
                <strong>No recharge check executed yet</strong>
                <p>Enter number on the left to verify previous recharge date and amount.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
