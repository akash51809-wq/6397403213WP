import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function PlanBrowsePage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [operators, setOperators] = useState([
    { code: '2', name: 'Airtel' },
    { code: '11', name: 'Jio' },
    { code: '6', name: 'VI' },
    { code: '4', name: 'BSNL' }
  ])

  const [circles, setCircles] = useState([
    { code: '70', name: 'Rajasthan' },
    { code: '54', name: 'UP East' },
    { code: '97', name: 'UP West' },
    { code: '10', name: 'Delhi NCR' },
    { code: '92', name: 'Mumbai' },
    { code: '90', name: 'Maharashtra' },
    { code: '52', name: 'Bihar & Jharkhand' },
    { code: '98', name: 'Gujarat' },
    { code: '93', name: 'Madhya Pradesh' },
    { code: '02', name: 'Punjab' },
    { code: '96', name: 'Haryana' },
    { code: '31', name: 'Kolkata' },
    { code: '51', name: 'West Bengal' },
    { code: '06', name: 'Karnataka' },
    { code: '49', name: 'Andhra Pradesh & Telangana' },
    { code: '94', name: 'Tamil Nadu' },
    { code: '40', name: 'Chennai' },
    { code: '95', name: 'Kerala' },
    { code: '53', name: 'Odisha' },
    { code: '56', name: 'Assam' }
  ])

  const [selectedOp, setSelectedOp] = useState('2')
  const [selectedCircle, setSelectedCircle] = useState('70')
  const [activeCategory, setActiveCategory] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [plansData, setPlansData] = useState({})
  const [currentMeta, setCurrentMeta] = useState({ operator: 'Airtel', circle: 'Rajasthan' })

  // Fetch operators & circles metadata
  useEffect(() => {
    api('/api/plans/mobile/meta')
      .then(data => {
        if (data.success) {
          if (data.operators?.length) setOperators(data.operators)
          if (data.circles?.length) setCircles(data.circles)
        }
      })
      .catch(() => {})
  }, [])

  const fetchPlans = async () => {
    try {
      setLoading(true)
      const data = await api('/api/plans/mobile/query', {
        method: 'POST',
        body: JSON.stringify({ operatorCode: selectedOp, circleCode: selectedCircle })
      })
      if (data.success && data.data) {
        setPlansData(data.data.plans || {})
        setCurrentMeta({
          operator: data.data.operator || 'Airtel',
          circle: data.data.circle || 'Rajasthan'
        })
      } else {
        notify(data.message || 'Plans load failed')
      }
    } catch (err) {
      notify('Error loading plans: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [selectedOp, selectedCircle])

  // Extract categories
  const categories = Object.keys(plansData)
  const allCategories = ['ALL', ...categories]

  // Flatten plans based on category
  let displayedPlans = []
  if (activeCategory === 'ALL') {
    Object.entries(plansData).forEach(([cat, list]) => {
      if (Array.isArray(list)) {
        list.forEach(p => displayedPlans.push({ ...p, category: cat }))
      }
    })
  } else if (Array.isArray(plansData[activeCategory])) {
    displayedPlans = plansData[activeCategory].map(p => ({ ...p, category: activeCategory }))
  }

  // Filter by search
  if (searchTerm.trim()) {
    const s = searchTerm.toLowerCase().trim()
    displayedPlans = displayedPlans.filter(p => 
      String(p.rs || p.price || '').includes(s) ||
      String(p.desc || p.description || '').toLowerCase().includes(s) ||
      String(p.validity || '').toLowerCase().includes(s)
    )
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>TARIFF & RECHARGE PLANS</span>
          <h1>Browse Mobile Plans</h1>
          <p>Complete plan tariffs with Truly Unlimited, Daily Data, Top-up, SMS and Roaming packs across India.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={fetchPlans}>
            ↻ Refresh Plans
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/roffer')}>
            🎁 Check SIM R-Offers
          </button>
        </div>
      </div>

      {/* Filter Header Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                SELECT TELECOM OPERATOR
              </label>
              <select
                className="select"
                value={selectedOp}
                onChange={(e) => setSelectedOp(e.target.value)}
                style={{ fontWeight: 700, color: '#431407' }}
              >
                {operators.map(op => (
                  <option key={op.code} value={op.code}>
                    {op.name} (Code: {op.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                SELECT TELECOM CIRCLE
              </label>
              <select
                className="select"
                value={selectedCircle}
                onChange={(e) => setSelectedCircle(e.target.value)}
                style={{ fontWeight: 700, color: '#431407' }}
              >
                {circles.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.name} (Code: {c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 6 }}>
                SEARCH BY PRICE / DATA / PACK
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 299, 1.5GB, Unlimited, 84 Days..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
        {allCategories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`btn ${activeCategory === cat ? 'primary' : ''}`}
            onClick={() => setActiveCategory(cat)}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap'
            }}
          >
            {cat} {cat !== 'ALL' && plansData[cat]?.length ? `(${plansData[cat].length})` : ''}
          </button>
        ))}
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: '#431407', fontWeight: 700 }}>
          Showing <strong>{displayedPlans.length}</strong> recharge plans for{' '}
          <span style={{ color: '#ea580c' }}>{currentMeta.operator} · {currentMeta.circle}</span>
        </span>
        {loading && <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>Loading latest plans...</span>}
      </div>

      {/* Plans Grid */}
      {displayedPlans.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {displayedPlans.map((plan, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 16,
                border: '1px solid rgba(249,115,22,0.18)',
                background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
                boxShadow: '0 6px 18px rgba(234,88,12,0.06)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 26, fontWeight: 900, color: '#ea580c' }}>
                      ₹{plan.rs || plan.price}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 8,
                    background: '#fed7aa',
                    color: '#9a3412'
                  }}>
                    {plan.validity || 'Valid Pack'}
                  </span>
                </div>

                <p style={{
                  fontSize: 12,
                  color: '#431407',
                  lineHeight: 1.5,
                  margin: '0 0 12px 0',
                  minHeight: 48
                }}>
                  {plan.desc || plan.description || 'Special Operator Recharge Plan'}
                </p>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid rgba(249,115,22,0.15)',
                fontSize: 11,
                color: '#78867f'
              }}>
                <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#ea580c' }}>
                  {plan.category || 'Recharge'}
                </span>
                <span style={{ fontWeight: 600 }}>
                  Talktime: {plan.talktime || 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty" style={{ padding: '60px 20px' }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>📋</span>
          <strong>No plans found for current filter</strong>
          <p>Try switching operator, circle, or clearing the search query.</p>
        </div>
      )}
    </div>
  )
}
