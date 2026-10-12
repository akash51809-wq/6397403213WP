import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PlanDthPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [dthNumber, setDthNumber] = useState('')
  const [operatorCode, setOperatorCode] = useState('28') // Tata Play default
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [responseTime, setResponseTime] = useState('')

  const handleQuery = async (e, numOverride, opOverride) => {
    if (e) e.preventDefault()
    const target = numOverride || dthNumber
    const op = opOverride || operatorCode
    const clean = String(target).trim().replace(/\D/g, '')

    if (clean.length < 8) {
      notify('Kripya valid DTH VC / Smart Card Number enter karein')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/dth/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dthNumber: clean, operatorCode: op })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setResult(data.data.DATA || data.data)
        setResponseTime(data.responseTime || '< 1 ms')
      } else {
        notify(data.message || 'DTH info fetch failed')
      }
    } catch (err) {
      notify('Error fetching DTH info: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>DTH CUSTOMER VERIFICATION</span>
          <h1>DTH Customer Information</h1>
          <p>Real-time DTH subscriber status, account balance, monthly recharge pack, and next due date lookup.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/recharge-status')}>
            ⚡ Last Recharge Check
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/lookup')}>
            🔍 Mobile Operator Lookup
          </button>
        </div>
      </div>

      <div className="split">
        {/* Left: Input Form */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📺 DTH Account Lookup</h2>
              <p>Check Tata Play, Airtel DTH, Dish TV, Sun Direct, and D2H account details</p>
            </div>
            <span className="badge success">Instant Account Check</span>
          </div>

          <div className="card-body">
            <form onSubmit={(e) => handleQuery(e, dthNumber, operatorCode)}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  SELECT DTH OPERATOR
                </label>
                <select
                  className="select"
                  value={operatorCode}
                  onChange={(e) => setOperatorCode(e.target.value)}
                  style={{ fontWeight: 700, color: '#431407' }}
                >
                  <option value="28">Tata Play / TATA Sky (Code: 28)</option>
                  <option value="24">Airtel Digital TV (Code: 24)</option>
                  <option value="25">Dish TV (Code: 25)</option>
                  <option value="27">Sun Direct (Code: 27)</option>
                  <option value="29">Videocon D2H (Code: 29)</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                  DTH VC NUMBER / SUBSCRIBER ID / SMART CARD NO.
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter VC / Subscriber Number (e.g. 1024567890)"
                  value={dthNumber}
                  onChange={(e) => setDthNumber(e.target.value.replace(/\D/g, ''))}
                  style={{ fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading || dthNumber.length < 8}
                style={{ width: '100%', height: 42 }}
              >
                {loading ? 'Checking DTH Account...' : 'Check DTH Info ↗'}
              </button>
            </form>

            {/* Samples */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(249,115,22,0.12)' }}>
              <span style={{ fontSize: 11, color: '#78867f', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Try Sample DTH Numbers:
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setDthNumber('1024567890'); setOperatorCode('28'); handleQuery(null, '1024567890', '28'); }}
                >
                  Tata Play: 1024567890
                </button>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setDthNumber('3012345678'); setOperatorCode('24'); handleQuery(null, '3012345678', '24'); }}
                >
                  Airtel DTH: 3012345678
                </button>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setDthNumber('0251234567'); setOperatorCode('25'); handleQuery(null, '0251234567', '25'); }}
                >
                  Dish TV: 0251234567
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: DTH Result Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>📋 Account Details & Balance</h2>
              <p>Live verified customer status</p>
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
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#78867f', textTransform: 'uppercase' }}>CUSTOMER NAME</span>
                    <strong style={{ fontSize: 16, color: '#431407', display: 'block' }}>
                      {result.Name || result.customerName || 'DTH Subscriber'}
                    </strong>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#fed7aa',
                    color: '#9a3412',
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    VC: {result.VC || result.vc || dthNumber}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>CURRENT BALANCE</small>
                    <strong style={{ fontSize: 18, color: '#15803d' }}>
                      ₹{result.Balance || result.balance || '0.00'}
                    </strong>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>MONTHLY PACK</small>
                    <strong style={{ fontSize: 18, color: '#ea580c' }}>
                      ₹{result.Monthly || result.monthlyPlan || '0'}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.12)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>NEXT RECHARGE DATE</small>
                    <strong style={{ fontSize: 13, color: '#431407' }}>
                      {result['Next Recharge Date'] || result.nextRechargeDate || 'N/A'}
                    </strong>
                  </div>

                  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.12)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>REGISTERED MOBILE (RMN)</small>
                    <strong style={{ fontSize: 13, color: '#431407' }}>
                      {result.Rmn || result.rmn || 'N/A'}
                    </strong>
                  </div>
                </div>

                <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.12)', marginBottom: 14 }}>
                  <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>ACTIVE PLAN</small>
                  <strong style={{ fontSize: 13, color: '#431407' }}>
                    {result.Plan || result.planName || 'Mega HD Pack'}
                  </strong>
                </div>

                {result.City && (
                  <div style={{ fontSize: 11, color: '#78867f', paddingTop: 8, borderTop: '1px solid rgba(249,115,22,0.12)' }}>
                    📍 Location: {result.City}, {result.State} {result['PIN Code'] ? `(${result['PIN Code']})` : ''}
                  </div>
                )}
              </div>
            ) : (
              <div className="empty" style={{ padding: '60px 20px' }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>📺</span>
                <strong>No DTH query executed yet</strong>
                <p>Select operator and enter VC number on the left to verify customer balance.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
