import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PlanPricingPage() {
  const { notify, currentUser } = useAuth()
  const navigate = useNavigate()

  const [selectedPack, setSelectedPack] = useState(null)
  const [utrNumber, setUtrNumber] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const packs = [
    {
      id: 'pack_starter',
      name: 'Starter Developer Pack',
      hits: '2,000 Hits',
      price: '₹199',
      popular: false,
      desc: 'Ideal for small scripts, personal tools, and testing.',
      features: [
        '2,000 API Query Hits',
        'Operator & Circle Lookup (< 0.5 ms)',
        'Full Mobile Plans Tariffs Browse',
        'Standard Rate Limit: 60 req/min',
        'Valid for 30 Days'
      ]
    },
    {
      id: 'pack_business',
      name: 'Business Pro Pack',
      hits: '8,000 Hits',
      price: '₹499',
      popular: true,
      desc: 'Best for active recharge portals and mobile retailers.',
      features: [
        '8,000 API Query Hits',
        'Operator & Circle Lookup',
        'Live Customer R-Offer API',
        'DTH Customer Info & Balance Check',
        'High Rate Limit: 180 req/min',
        'Valid for 60 Days'
      ]
    },
    {
      id: 'pack_enterprise',
      name: 'High Volume Enterprise',
      hits: '30,000 Hits',
      price: '₹1,499',
      popular: false,
      desc: 'For multi-store retailers, ERPs, and fintech apps.',
      features: [
        '30,000 API Query Hits',
        'All Telecom & DTH Features',
        'Last Recharge History Status',
        'Dedicated IP Whitelisting',
        'High Rate Limit: 300 req/min',
        'Valid for 90 Days'
      ]
    },
    {
      id: 'pack_bulk',
      name: 'Mega Ultra Bulk',
      hits: '1,00,000 Hits',
      price: '₹3,999',
      popular: false,
      desc: 'Enterprise volume with dedicated server throughput.',
      features: [
        '1,00,000 API Query Hits',
        'Highest Concurrency & Throughput',
        'Multiple API Client Keys',
        'Real-time Webhook Support',
        '24/7 Priority WhatsApp Support',
        'Valid for 180 Days'
      ]
    }
  ]

  const handleSubmitRequest = (e) => {
    e.preventDefault()
    if (!utrNumber || utrNumber.trim().length < 6) {
      notify('Kripya valid 12-digit UTR / Transaction Reference Number enter karein')
      return
    }

    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
      notify('Payment verification request submitted successfully! Admin will credit hits shortly.')
    }, 1000)
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>PRICING & RECHARGE HITS</span>
          <h1>Buy Plan API Hits</h1>
          <p>Instant hit top-ups for Telecom Operator Lookup, Tariff Plans, R-Offers, and DTH Verification.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/dashboard')}>
            ⌂ Dashboard
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/plans/api-docs')}>
            🔑 API Docs
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {packs.map((p) => (
          <div
            key={p.id}
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              border: p.popular ? '2px solid #ea580c' : '1px solid rgba(249,115,22,0.2)',
              background: p.popular ? 'linear-gradient(145deg, #fff7ed, #fff1e6)' : 'linear-gradient(145deg, #fffaf5, #fff5eb)',
              boxShadow: p.popular ? '0 12px 30px rgba(234,88,12,0.14)' : '0 6px 18px rgba(234,88,12,0.05)'
            }}
          >
            {p.popular && (
              <span style={{
                position: 'absolute',
                top: -11,
                right: 16,
                background: '#ea580c',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: 12,
                letterSpacing: '0.5px'
              }}>
                MOST POPULAR
              </span>
            )}

            <div>
              <small style={{ color: '#ea580c', fontWeight: 800, fontSize: 11, textTransform: 'uppercase' }}>
                {p.hits}
              </small>
              <h3 style={{ fontSize: 16, color: '#431407', margin: '4px 0 6px 0' }}>
                {p.name}
              </h3>
              <p style={{ fontSize: 11, color: '#78867f', margin: '0 0 14px 0', minHeight: 32 }}>
                {p.desc}
              </p>

              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#ea580c' }}>
                  {p.price}
                </span>
                <span style={{ fontSize: 11, color: '#78867f', marginLeft: 4 }}>one-time</span>
              </div>

              <div style={{ borderTop: '1px solid rgba(249,115,22,0.15)', paddingTop: 14, marginBottom: 18 }}>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#431407', lineHeight: 1.8 }}>
                  {p.features.map((f, fi) => (
                    <li key={fi}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              className={`btn ${p.popular ? 'primary' : ''}`}
              onClick={() => { setSelectedPack(p); setSubmitted(false); }}
              style={{ width: '100%', padding: '10px 0', fontWeight: 800 }}
            >
              Select & Pay ↗
            </button>
          </div>
        ))}
      </div>

      {/* Selected Pack Payment Form */}
      {selectedPack && (
        <div className="card" style={{ border: '2px solid #ea580c', background: 'linear-gradient(145deg, #fffaf5, #fff5eb)', marginBottom: 24 }}>
          <div className="card-head">
            <div>
              <h2>💳 Complete Purchase: {selectedPack.name} ({selectedPack.price})</h2>
              <p>Scan UPI QR code or pay via UPI ID and submit your 12-digit UTR reference number</p>
            </div>
            <button type="button" className="btn" onClick={() => setSelectedPack(null)}>
              ✕ Cancel
            </button>
          </div>

          <div className="card-body">
            {submitted ? (
              <div style={{
                padding: 24,
                borderRadius: 14,
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.3)',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>✅</span>
                <strong style={{ fontSize: 16, color: '#15803d', display: 'block', marginBottom: 4 }}>
                  Payment Request Submitted Successfully!
                </strong>
                <p style={{ fontSize: 12, color: '#166534', margin: 0 }}>
                  UTR <code>{utrNumber}</code> is pending admin verification. Your {selectedPack.hits} will be credited to your account shortly.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24, alignItems: 'center' }}>
                <div style={{
                  padding: 18,
                  borderRadius: 14,
                  background: '#fff',
                  border: '1px solid rgba(249,115,22,0.2)',
                  textAlign: 'center'
                }}>
                  <strong style={{ display: 'block', fontSize: 14, color: '#431407', marginBottom: 6 }}>
                    Scan & Pay via any UPI App
                  </strong>
                  <div style={{
                    width: 170,
                    height: 170,
                    margin: '0 auto 10px',
                    borderRadius: 12,
                    background: '#fff7ed',
                    display: 'grid',
                    placeItems: 'center',
                    border: '1px dashed #ea580c',
                    fontSize: 12,
                    color: '#c2410c'
                  }}>
                    <span>📱 UPI QR CODE<br/><strong>Amount: {selectedPack.price}</strong></span>
                  </div>
                  <small style={{ color: '#78867f', fontSize: 11 }}>
                    GPay, PhonePe, Paytm, BHIM accepted
                  </small>
                </div>

                <form onSubmit={handleSubmitRequest}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                      SELECTED PACK
                    </label>
                    <input
                      type="text"
                      className="input"
                      readOnly
                      value={`${selectedPack.name} - ${selectedPack.hits} (${selectedPack.price})`}
                      style={{ fontWeight: 700, color: '#ea580c' }}
                    />
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                      12-DIGIT UPI / BANK UTR NUMBER
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Enter 12-digit UTR (e.g. 429381920194)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.trim())}
                      style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.5px' }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn primary"
                    disabled={submitting || utrNumber.length < 6}
                    style={{ width: '100%', height: 44, fontWeight: 800 }}
                  >
                    {submitting ? 'Submitting Request...' : `Submit Payment Request for ${selectedPack.price} ↗`}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
