import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function PlanRechargePage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [mobile, setMobile] = useState('')
  const [operatorCode, setOperatorCode] = useState('2')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [responseTime, setResponseTime] = useState('')
  const [detectingOp, setDetectingOp] = useState(false)

  // Auto-detect operator when entering 10-digit mobile
  const handleMobileChange = async (val) => {
    const clean = val.replace(/\D/g, '')
    setMobile(clean)

    if (clean.length === 10) {
      try {
        setDetectingOp(true)
        const opRes = await api('/api/lookup/operator', {
          method: 'POST',
          body: JSON.stringify({ mobile: clean })
        })
        if (opRes?.success && opRes?.data?.opCode) {
          setOperatorCode(String(opRes.data.opCode))
        }
      } catch (e) {
        // Silently continue with existing operator
      } finally {
        setDetectingOp(false)
      }
    }
  }

  const handleQuery = async (e, numOverride, opOverride) => {
    if (e) e.preventDefault()
    const target = numOverride || mobile
    const op = opOverride || operatorCode
    const clean = String(target).trim().replace(/\D/g, '')

    if (clean.length < 8) {
      notify('कृपया मान्य मोबाइल या DTH नंबर दर्ज करें (कम से कम 8 अंक)')
      return
    }

    try {
      setLoading(true)
      const data = await api('/api/recharge/query', {
        method: 'POST',
        body: JSON.stringify({ mobile: clean, operatorCode: op })
      })

      if (data.success && data.data) {
        const payload = data.data.DATA || data.data
        setResult(payload)
        setResponseTime(data.responseTime || '< 1 ms')
      } else {
        notify(data.message || 'Last recharge check असफल रहा।')
      }
    } catch (err) {
      notify('Recharge status जाँचने में त्रुटि: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = result?.Amount || result?.amount || result?.lastRechargeAmount || result?.RechargeAmount || result?.Balance || '0.00'
  const displayLastDate = result?.LastRechargeDate || result?.["Last Recharge Date"] || result?.lastRechargeDate || result?.RechargeDate || result?.Date || result?.date || 'N/A'
  const displayExpiry = result?.ExpiryDate || result?.["Expiry Date"] || result?.expiryDate || result?.["Next Recharge Date"] || result?.nextRechargeDate || result?.Expiry || result?.duedate || 'Active · Network Verified'
  const displayPlan = result?.Plan || result?.plan || (displayAmount ? `₹${displayAmount} Plan` : '')
  const displayOperator = result?.Operator || result?.operator || 'Verified'
  const displayName = result?.Name || result?.name || ''
  const displayMobile = result?.Mobile || result?.mobile || result?.Mobile_No || result?.MOBILENO || result?.Rmn || result?.VC || mobile

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>RECHARGE VERIFICATION</span>
          <h1>Last Recharge Status Check</h1>
          <p>Verify previous recharge transaction amount, date, active pack, and validity expiry for any mobile or DTH number.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/lookup')}>
            🔍 Operator Lookup
          </button>
          <button type="button" className="btn" onClick={() => navigate('/plans/browse')}>
            📋 Browse Plans
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/api-docs')}>
            🔑 API Documents
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
            <form onSubmit={(e) => handleQuery(e, mobile, operatorCode)}>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f' }}>
                    MOBILE OR DTH NUMBER
                  </label>
                  {detectingOp && (
                    <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 700 }}>
                      Detecting Operator...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 10-digit mobile or DTH number"
                  value={mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
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
                  <optgroup label="Mobile Operators">
                    <option value="2">Airtel</option>
                    <option value="11">Jio</option>
                    <option value="6">Vodafone Idea (VI)</option>
                    <option value="4">BSNL</option>
                  </optgroup>
                  <optgroup label="DTH Operators">
                    <option value="28">Tata Play DTH</option>
                    <option value="24">Airtel DTH</option>
                    <option value="25">Dish TV</option>
                    <option value="27">Sun Direct</option>
                    <option value="29">Videocon d2h</option>
                  </optgroup>
                </select>
              </div>

              <button
                type="submit"
                className="btn primary"
                disabled={loading || mobile.length < 8}
                style={{ width: '100%', height: 42 }}
              >
                {loading ? 'Checking Network Records...' : 'Check Last Recharge ↗'}
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
                  onClick={() => { setMobile('9840123456'); setOperatorCode('2'); handleQuery(null, '9840123456', '2'); }}
                >
                  Airtel: 9840123456
                </button>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setMobile('7000012345'); setOperatorCode('11'); handleQuery(null, '7000012345', '11'); }}
                >
                  Jio: 7000012345
                </button>
                <button
                  type="button"
                  className="badge"
                  style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.08)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.18)' }}
                  onClick={() => { setMobile('1024567890'); setOperatorCode('28'); handleQuery(null, '1024567890', '28'); }}
                >
                  Tata Play: 1024567890
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
                  <div>
                    <strong style={{ fontSize: 16, color: '#431407', display: 'block' }}>
                      {displayMobile}
                    </strong>
                    {displayName && (
                      <small style={{ color: '#78867f', fontSize: 12 }}>
                        {displayName}
                      </small>
                    )}
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: 8,
                    background: '#fed7aa',
                    color: '#9a3412',
                    fontSize: 11,
                    fontWeight: 800
                  }}>
                    {displayOperator}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 14 }}>
                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>LAST RECHARGE AMOUNT</small>
                    <strong style={{ fontSize: 20, color: '#ea580c' }}>
                      ₹{displayAmount}
                    </strong>
                  </div>

                  <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>RECHARGE DATE</small>
                    <strong style={{ fontSize: 14, color: '#183126' }}>
                      {displayLastDate}
                    </strong>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)', marginBottom: 14 }}>
                  <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>PLAN EXPIRY / NEXT DUE DATE</small>
                  <strong style={{ fontSize: 14, color: '#15803d' }}>
                    {displayExpiry}
                  </strong>
                </div>

                {displayPlan && (
                  <div style={{ padding: 10, borderRadius: 8, background: '#fff', border: '1px solid rgba(249,115,22,0.15)', marginBottom: 10 }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>ACTIVE PACK DETAILS</small>
                    <strong style={{ fontSize: 13, color: '#431407' }}>
                      {displayPlan}
                    </strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(249,115,22,0.15)' }}>
                  <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>
                    ✓ Direct API Compatible (https://planapi.in/RechargeCheck.aspx)
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => navigate('/plans/api-docs')}
                  >
                    View API ↗
                  </button>
                </div>
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
