import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PlanRofferPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [mobile, setMobile] = useState('')
  const [operatorCode, setOperatorCode] = useState('2')
  const [loading, setLoading] = useState(false)
  const [offers, setOffers] = useState([])
  const [queriedNumber, setQueriedNumber] = useState('')
  const [responseTime, setResponseTime] = useState('')

  const handleQuery = async (e, numOverride) => {
    if (e) e.preventDefault()
    const target = numOverride || mobile
    const clean = target.replace(/\D/g, '').slice(-10)

    if (clean.length < 10) {
      notify('Kripya 10-digit mobile number enter karein')
      return
    }

    try {
      setLoading(true)
      setOffers([])
      const res = await fetch('/api/roffer/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean, operatorCode })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setQueriedNumber(clean)
        setResponseTime(data.responseTime || '< 1 ms')
        setOffers(data.data.RDATA || [])
      } else {
        notify(data.message || 'R-Offers load failed')
      }
    } catch (err) {
      notify('Error querying R-Offers: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>BEST CUSTOMER OFFERS</span>
          <h1>Customer R-Offer Check</h1>
          <p>Query personalized operator R-Offers tailored specifically for customer SIM cards.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/lookup')}>
            🔍 Operator Lookup
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/browse')}>
            📋 Browse All Plans
          </button>
        </div>
      </div>

      {/* Query Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div>
            <h2>🎁 Check Live R-Offers</h2>
            <p>Enter mobile number and operator to fetch special segmented offers</p>
          </div>
          <span className="badge success">Live API Verified</span>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => handleQuery(e, mobile)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr auto', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  CUSTOMER MOBILE NUMBER
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 10-digit mobile (e.g. 9840123456)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  OPERATOR
                </label>
                <select
                  className="select"
                  value={operatorCode}
                  onChange={(e) => setOperatorCode(e.target.value)}
                  style={{ fontWeight: 700, color: '#431407' }}
                >
                  <option value="2">Airtel (Code: 2)</option>
                  <option value="11">Jio (Code: 11)</option>
                  <option value="6">VI (Code: 6)</option>
                  <option value="4">BSNL (Code: 4)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={loading || mobile.length < 10}
                  style={{ minWidth: 130, height: 42 }}
                >
                  {loading ? 'Fetching...' : 'Fetch Offers ↗'}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Try Pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 14 }}>
            <span style={{ fontSize: 11, color: '#78867f', fontWeight: 600 }}>Try Sample Numbers:</span>
            {[
              { num: '9840123456', op: '2', label: 'Airtel' },
              { num: '7000012345', op: '11', label: 'Jio' },
              { num: '9820012345', op: '6', label: 'VI' }
            ].map(s => (
              <button
                key={s.num}
                type="button"
                className="badge"
                style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                onClick={() => { setMobile(s.num); setOperatorCode(s.op); handleQuery(null, s.num); }}
              >
                {s.label}: {s.num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Query Status / Header */}
      {queriedNumber && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <strong style={{ fontSize: 15, color: '#431407' }}>
            Found {offers.length} Special R-Offers for <span style={{ color: '#ea580c' }}>+91 {queriedNumber}</span>
          </strong>
          <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>
            ⚡ Response in {responseTime}
          </span>
        </div>
      )}

      {/* Offers List */}
      {offers.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {offers.map((o, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                padding: 18,
                border: '1px solid rgba(249,115,22,0.22)',
                background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
                boxShadow: '0 8px 24px rgba(234,88,12,0.07)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#ea580c' }}>
                  ₹{o.price || o.rs}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: '#fed7aa',
                  color: '#9a3412',
                  fontSize: 11,
                  fontWeight: 800
                }}>
                  ⭐ Special Best Offer
                </span>
              </div>

              <p style={{
                fontSize: 13,
                color: '#431407',
                lineHeight: 1.5,
                margin: '0 0 10px 0',
                fontWeight: 600
              }}>
                {o.ofrtext || o.logdesc || 'Exclusive Personalized Customer Offer'}
              </p>

              <div style={{
                fontSize: 11,
                color: '#78867f',
                paddingTop: 8,
                borderTop: '1px solid rgba(249,115,22,0.12)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Operator Verified Live</span>
                <span style={{ color: '#ea580c', fontWeight: 700 }}>Instant Recharge Ready</span>
              </div>
            </div>
          ))}
        </div>
      ) : queriedNumber && !loading ? (
        <div className="empty" style={{ padding: '50px 20px' }}>
          <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>🎁</span>
          <strong>No exclusive R-Offers found for this number</strong>
          <p>Please check standard operator plans under Browse Plans.</p>
        </div>
      ) : null}
    </div>
  )
}
