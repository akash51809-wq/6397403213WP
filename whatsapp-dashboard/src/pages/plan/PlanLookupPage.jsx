import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function PlanLookupPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  const handleLookup = async (e, numToQuery) => {
    if (e) e.preventDefault()
    const target = numToQuery || mobile
    const clean = target.replace(/\D/g, '').slice(-10)

    if (clean.length < 10) {
      notify('Kripya 10-digit valid mobile number enter karein')
      return
    }

    try {
      setLoading(true)
      const data = await api('/api/lookup/operator', {
        method: 'POST',
        body: JSON.stringify({ mobile: clean })
      })
      if (data.code === 'INSUFFICIENT_BALANCE') {
        notify(data.message || 'अपर्याप्त वॉलेट बैलेंस! कृपया वॉलेट में फंड जोड़ें।')
        return
      }
      if (data.success && data.data) {
        setResult(data.data)
        // Add to history
        setHistory(prev => [
          {
            mobile: clean,
            operator: data.data.operator,
            circle: data.data.circle,
            opCode: data.data.opCode || data.data.opcode || '2',
            circleCode: data.data.circleCode || '54',
            time: 'Just now'
          },
          ...prev.filter(h => h.mobile !== clean).slice(0, 7)
        ])
      } else {
        notify(data.message || 'Lookup failed')
      }
    } catch (err) {
      notify('Lookup error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const getOpBadgeStyle = (op) => {
    const o = String(op || '').toUpperCase()
    if (o.includes('AIRTEL')) return { bg: '#ef4444', text: '#fff' }
    if (o.includes('JIO')) return { bg: '#0284c7', text: '#fff' }
    if (o.includes('VI') || o.includes('VODAFONE') || o.includes('IDEA')) return { bg: '#e11d48', text: '#fff' }
    if (o.includes('BSNL')) return { bg: '#2563eb', text: '#fff' }
    return { bg: '#ea580c', text: '#fff' }
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>SERIES ENGINE DISCOVERY</span>
          <h1>Operator & Circle Lookup</h1>
          <p>Instant Indian Telecom HLR/MSC mobile series detection with operator code & telecom circle mapping.</p>
        </div>
      </div>

      <div className="split">
        {/* Main Search Panel */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🔍 Check Any Indian Mobile Number</h2>
              <p>Detect live operator, state/circle, opcode & circlecode in &lt; 0.5 milliseconds</p>
            </div>
            <span className="badge success">&lt; 0.5 ms Latency</span>
          </div>

          <div className="card-body">
            <form onSubmit={(e) => handleLookup(e, mobile)}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 10-digit mobile number (e.g. 9840123456)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ fontSize: 15, fontWeight: 700, letterSpacing: '1px' }}
                />
                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading || mobile.length < 10}
                  style={{ minWidth: 140 }}
                >
                  {loading ? 'Detecting...' : 'Detect Operator ↗'}
                </button>
              </div>
            </form>

            {/* Quick Test Samples */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 11, color: '#78867f', fontWeight: 600 }}>Test Numbers:</span>
              {[
                { label: 'Airtel (9840123456)', num: '9840123456' },
                { label: 'Jio (7000012345)', num: '7000012345' },
                { label: 'VI (9820012345)', num: '9820012345' },
                { label: 'BSNL (9414012345)', num: '9414012345' }
              ].map(s => (
                <button
                  key={s.num}
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setMobile(s.num); handleLookup(null, s.num); }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Live Result Details Card */}
            {result ? (
              <div style={{
                padding: 20,
                borderRadius: 16,
                border: '1px solid rgba(249,115,22,0.25)',
                background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
                boxShadow: '0 12px 30px rgba(234,88,12,0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      padding: '6px 14px',
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 800,
                      ...getOpBadgeStyle(result.operator)
                    }}>
                      {result.operator}
                    </span>
                    <div>
                      <strong style={{ fontSize: 17, color: '#431407', display: 'block' }}>
                        +91 {result.mobile}
                      </strong>
                      <small style={{ color: '#78867f', fontSize: 11 }}>
                        Telecom Circle: {result.circle}
                      </small>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#15803d',
                      background: 'rgba(34,197,94,0.12)',
                      padding: '4px 8px',
                      borderRadius: 8
                    }}>
                      ⚡ {result.responseTime || '< 0.5 ms'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>OPERATOR</small>
                    <strong style={{ color: '#431407', fontSize: 13 }}>{result.operator}</strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>CIRCLE / STATE</small>
                    <strong style={{ color: '#431407', fontSize: 13 }}>{result.circle}</strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>OP CODE</small>
                    <strong style={{ color: '#ea580c', fontSize: 14 }}>{result.opCode || result.opcode || '2'}</strong>
                  </div>
                  <div style={{ padding: 12, borderRadius: 12, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>CIRCLE CODE</small>
                    <strong style={{ color: '#ea580c', fontSize: 14 }}>{result.circleCode || '54'}</strong>
                  </div>
                </div>

                {/* API Request cURL representation */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                    EQUIVALENT HTTP DEVELOPER API CALL:
                  </label>
                  <pre style={{
                    margin: 0,
                    padding: 10,
                    borderRadius: 10,
                    background: '#2a1205',
                    color: '#fdba74',
                    fontSize: 11,
                    overflowX: 'auto',
                    fontFamily: 'monospace'
                  }}>
{`GET /api/Mobile/OperatorFetchNew?Mobileno=${result.mobile}&ApiUserID=YOUR_MOBILE&token=YOUR_TOKEN`}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="empty" style={{ padding: '40px 20px' }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>📱</span>
                <strong>Enter any mobile number above</strong>
                <p>Lookup operator and circle across Airtel, Jio, VI, and BSNL in sub-milliseconds.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Lookups History */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>🕒 Recent Lookups</h3>
              <p>Quick lookup audit trail</p>
            </div>
            <span className="badge">{history.length} Saved</span>
          </div>
          <div className="card-body">
            <div className="list">
              {history.map((h, i) => (
                <div 
                  key={i} 
                  className="list-item" 
                  style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => { setMobile(h.mobile); handleLookup(null, h.mobile); }}
                  title="Click to re-query"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 800,
                      ...getOpBadgeStyle(h.operator)
                    }}>
                      {h.operator}
                    </span>
                    <div>
                      <strong style={{ color: '#431407', fontSize: 13 }}>+91 {h.mobile}</strong>
                      <small style={{ color: '#78867f' }}>{h.circle} · OpCode: {h.opCode}</small>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>Re-check ↗</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
