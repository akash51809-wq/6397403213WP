import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PlanDashboardPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    remainingHits: 100,
    totalHits: 100,
    usedHits: 0,
    apiToken: '',
    mobile: '',
    name: ''
  })

  // Quick lookup state
  const [quickMobile, setQuickMobile] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const loadStats = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/plans/user/stats')
      const data = await res.json()
      if (data.success && data.stats) {
        setStats(data.stats)
      }
    } catch (err) {
      notify('Stats load error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleQuickLookup = async (e) => {
    if (e) e.preventDefault()
    const clean = quickMobile.replace(/\D/g, '').slice(-10)
    if (clean.length < 10) {
      notify('Kripya 10-digit mobile number enter karein')
      return
    }

    try {
      setLookupLoading(true)
      setLookupResult(null)
      const res = await fetch('/api/lookup/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: clean, userMobile: stats.mobile })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setLookupResult(data.data)
        if (data.data.remainingHits !== undefined) {
          setStats(prev => ({ ...prev, remainingHits: data.data.remainingHits }))
        }
      } else {
        notify(data.message || 'Lookup failed')
      }
    } catch (err) {
      notify('Lookup error: ' + err.message)
    } finally {
      setLookupLoading(false)
    }
  }

  const handleCopyToken = () => {
    if (!stats.apiToken) return
    navigator.clipboard.writeText(stats.apiToken)
    setCopiedToken(true)
    notify('API Token copied to clipboard!')
    setTimeout(() => setCopiedToken(false), 2500)
  }

  const handleRegenerateToken = async () => {
    if (!window.confirm('Kya aap naya API token generate karna chahte hain? Purana token revoke ho jayega.')) {
      return
    }
    try {
      setRegenerating(true)
      const res = await fetch('/api/plans/user/regenerate-token', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setStats(prev => ({ ...prev, apiToken: data.apiToken }))
        notify('Naya API Token kamyabi se generate ho gaya!')
      } else {
        notify(data.message || 'Token generate failed')
      }
    } catch (err) {
      notify('Token error: ' + err.message)
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="content">
      {/* Hero Header */}
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>TELECOM & RECHARGE ENGINE</span>
          <h1>Plan API Dashboard</h1>
          <p>High-speed Indian Telecom operator discovery, recharge plans, personalized R-Offers, and DTH verification API engine.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={loadStats} title="Refresh data">
            ↻ Refresh
          </button>
          <button type="button" className="btn" onClick={() => navigate('/plans/api-docs')}>
            🔑 View API Docs
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/pricing')}>
            💎 Buy API Hits
          </button>
        </div>
      </div>

      {/* 4 Top Stat Cards */}
      <div className="grid4" style={{ marginBottom: 20 }}>
        <div className="stat">
          <small>AVAILABLE API HITS</small>
          <strong>{stats.remainingHits}</strong>
          <span>Plan Active · Ready</span>
        </div>
        <div className="stat">
          <small>OPERATORS SUPPORTED</small>
          <strong>4 Mobile + 5 DTH</strong>
          <span>Airtel, Jio, VI, BSNL, Tata Play</span>
        </div>
        <div className="stat">
          <small>SERIES ENGINE LATENCY</small>
          <strong>&lt; 0.5 ms</strong>
          <span>Ultra-Fast In-Memory</span>
        </div>
        <div className="stat">
          <small>CIRCLE COVERAGE</small>
          <strong>22 Circles</strong>
          <span>Pan-India Realtime</span>
        </div>
      </div>

      {/* Split Section: Quick Lookup & API Credentials */}
      <div className="split" style={{ marginBottom: 24 }}>
        {/* Left: Quick Operator Lookup Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🔍 Live Operator & Circle Lookup</h2>
              <p>Instant mobile prefix detection with operator code & telecom circle</p>
            </div>
            <span className="badge success">&lt; 1 ms Speed</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleQuickLookup}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Enter 10-digit mobile number (e.g. 9840123456)"
                  value={quickMobile}
                  onChange={(e) => setQuickMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.5px' }}
                />
                <button
                  type="submit"
                  className="btn primary"
                  disabled={lookupLoading || quickMobile.length < 10}
                  style={{ minWidth: 120 }}
                >
                  {lookupLoading ? 'Checking...' : 'Check Now ↗'}
                </button>
              </div>
            </form>

            {/* Quick Test Sample Pills */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 11, color: '#78867f', fontWeight: 600 }}>Try Samples:</span>
              <button 
                type="button" 
                className="badge" 
                style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}
                onClick={() => { setQuickMobile('9840123456'); }}
              >
                Airtel: 9840123456
              </button>
              <button 
                type="button" 
                className="badge" 
                style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}
                onClick={() => { setQuickMobile('7000012345'); }}
              >
                Jio: 7000012345
              </button>
              <button 
                type="button" 
                className="badge" 
                style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}
                onClick={() => { setQuickMobile('9820012345'); }}
              >
                VI: 9820012345
              </button>
              <button 
                type="button" 
                className="badge" 
                style={{ cursor: 'pointer', background: 'rgba(249,115,22,0.1)', color: '#ea580c', border: '1px solid rgba(249,115,22,0.2)' }}
                onClick={() => { setQuickMobile('9414012345'); }}
              >
                BSNL: 9414012345
              </button>
            </div>

            {/* Lookup Result Box */}
            {lookupResult && (
              <div style={{
                padding: 16,
                borderRadius: 14,
                border: '1px solid rgba(249,115,22,0.25)',
                background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
                boxShadow: '0 8px 20px rgba(234,88,12,0.06)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: '#ea580c',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 800
                    }}>
                      {lookupResult.operator}
                    </span>
                    <strong style={{ fontSize: 15, color: '#431407' }}>
                      +91 {lookupResult.mobile}
                    </strong>
                  </div>
                  <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 700 }}>
                    ⚡ {lookupResult.responseTime || '< 0.5 ms'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 10 }}>
                  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>TELECOM CIRCLE</small>
                    <strong style={{ color: '#183126', fontSize: 13 }}>{lookupResult.circle || 'N/A'}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>OPERATOR CODE</small>
                    <strong style={{ color: '#ea580c', fontSize: 13 }}>{lookupResult.opCode || lookupResult.opcode || '2'}</strong>
                  </div>
                  <div style={{ padding: 10, borderRadius: 10, background: '#fff', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <small style={{ color: '#78867f', fontSize: 10, display: 'block' }}>CIRCLE CODE</small>
                    <strong style={{ color: '#ea580c', fontSize: 13 }}>{lookupResult.circleCode || '54'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 12, padding: '7px 12px' }}
                    onClick={() => navigate('/plans/browse')}
                  >
                    📋 View {lookupResult.operator} Plans
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 12, padding: '7px 12px' }}
                    onClick={() => navigate('/plans/roffer')}
                  >
                    🎁 Check Best R-Offers
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: API Credentials & Key Card */}
        <div className="card">
          <div className="card-head">
            <div>
              <h2>🔑 API Credentials</h2>
              <p>Your secure credentials for developer HTTP integration</p>
            </div>
            <button 
              type="button" 
              className="btn" 
              style={{ fontSize: 11, padding: '5px 10px' }} 
              onClick={handleRegenerateToken} 
              disabled={regenerating}
            >
              {regenerating ? 'Regenerating...' : '↻ New Token'}
            </button>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                API MEMBER ID (USER IDENTIFIER)
              </label>
              <div style={{
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(249,115,22,0.15)',
                fontWeight: 700,
                color: '#431407',
                fontSize: 13
              }}>
                {stats.mobile || stats.id || 'Your Mobile Number'}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                PRIMARY API TOKEN (TOKEN / API PASSWORD)
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="input"
                  readOnly
                  value={stats.apiToken || 'tok_...'}
                  style={{ fontFamily: 'monospace', fontSize: 12, color: '#ea580c', fontWeight: 700 }}
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={handleCopyToken}
                  style={{ minWidth: 90 }}
                >
                  {copiedToken ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 12,
              background: '#fffaf5',
              border: '1px solid rgba(249,115,22,0.18)',
              fontSize: 12,
              color: '#7c2d12',
              lineHeight: 1.5
            }}>
              <strong>⚡ Instant Integration:</strong> Use these credentials in URL query parameters or JSON body for <code>/api/Mobile/OperatorFetchNew</code> and <code>/api/Mobile/Operatorplan</code>.
            </div>
          </div>
        </div>
      </div>

      {/* 6 Quick Navigation Shortcuts */}
      <h3 style={{ fontSize: 15, fontWeight: 800, color: '#431407', marginBottom: 12 }}>
        Plan API Service Suite
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/lookup')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>🔍</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>Operator Lookup</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Series engine operator detection</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Detect mobile series, operator codes & circle codes instantly.</p>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/browse')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>📋</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>Browse Plans</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Operator & circle recharge tariff</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Search by category: Truly Unlimited, Data, Talktime, Cricket, OTT.</p>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/roffer')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>🎁</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>Customer R-Offer</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Exclusive custom recharge offers</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Query operator-segmented best customized offers for any mobile.</p>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/dth')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>📺</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>DTH Customer Info</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Account verification & balance</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Check Tata Play, Airtel DTH, Dish TV, Sun Direct customer balance.</p>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/recharge-status')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>⚡</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>Last Recharge Check</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Recharge date & expiry</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Retrieve last recharge amount, transaction date, and plan expiry.</p>
        </div>

        <div 
          className="card" 
          style={{ cursor: 'pointer', padding: 18, transition: 'transform 0.2s' }}
          onClick={() => navigate('/plans/api-docs')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, padding: 8, borderRadius: 12, background: 'rgba(249,115,22,0.12)' }}>🔑</span>
            <div>
              <strong style={{ fontSize: 14, color: '#431407' }}>API Documentation</strong>
              <small style={{ display: 'block', color: '#78867f' }}>Interactive cURL & code generator</small>
            </div>
          </div>
          <p style={{ fontSize: 11, color: '#78867f', margin: 0 }}>Ready-to-use cURL, Fetch, Python snippets & JSON responses.</p>
        </div>
      </div>
    </div>
  )
}
