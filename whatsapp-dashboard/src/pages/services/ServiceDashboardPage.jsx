import React from 'react'
import { Link } from 'react-router-dom'

const SERVICES_CONFIG = {
  'mobile-sms': {
    title: 'Mobile SMS',
    eyebrow: 'SMS GATEWAY & BULK MESSAGING',
    icon: '📱',
    badgeColor: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    description: 'High-speed Bulk SMS, OTP delivery, Promotional & Transactional messaging hub.',
    stats: [
      { label: 'SMS Balance', val: '0 SMS', change: 'Add Credits' },
      { label: 'Delivery Rate', val: '99.8%', change: 'DLT Approved' },
      { label: 'Sender IDs', val: '0 Active', change: 'Manage Headers' },
      { label: 'API Status', val: 'Ready', change: 'HTTP / SMPP' }
    ]
  },
  'plan-api': {
    title: 'Plan API',
    eyebrow: 'RECHARGE & OPERATOR DATA',
    icon: '⚡',
    badgeColor: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    description: 'Real-time Mobile Prepaid/Postpaid plans, DTH channel packages, Operator lookups & R-Offers.',
    stats: [
      { label: 'Supported Operators', val: '12+', change: 'All India Circles' },
      { label: 'API Latency', val: '< 150ms', change: 'Ultra Fast' },
      { label: 'Daily Lookups', val: 'Unlimited', change: 'High TPS' },
      { label: 'API Status', val: 'Ready', change: 'JSON REST' }
    ]
  },
  'gst-api': {
    title: 'GST API',
    eyebrow: 'TAX & BUSINESS VERIFICATION',
    icon: '🏛️',
    badgeColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.12)',
    description: 'Instant GSTIN Verification, Return filing status, taxpayer details & Business identity checks.',
    stats: [
      { label: 'GSTIN Searches', val: 'Active', change: 'Instant Verification' },
      { label: 'Govt Portal Sync', val: 'Realtime', change: '100% Verified' },
      { label: 'Tax Filings', val: 'GSTR-1/3B', change: 'History Check' },
      { label: 'API Status', val: 'Ready', change: 'Secure Token' }
    ]
  }
}

export default function ServiceDashboardPage({ service = 'mobile-sms' }) {
  const current = SERVICES_CONFIG[service] || SERVICES_CONFIG['mobile-sms']

  return (
    <div className="content">
      <div className="hero" style={{ marginBottom: 24 }}>
        <div>
          <span className="eyebrow" style={{ color: current.badgeColor }}>{current.eyebrow}</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span>{current.icon}</span> {current.title} Dashboard
          </h1>
          <p style={{ maxWidth: 650 }}>{current.description}</p>
        </div>
        <div className="actions">
          <Link to="/dashboard" className="btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>💬</span> WhatsApp Dashboard
          </Link>
        </div>
      </div>

      {/* Overview Stat Grid */}
      <div className="grid4" style={{ marginBottom: 24 }}>
        {current.stats.map((s, idx) => (
          <div key={idx} className="stat">
            <small>{s.label}</small>
            <strong style={{ fontSize: 22, marginTop: 4 }}>{s.val}</strong>
            <span style={{ color: current.badgeColor, background: current.badgeBg }}>
              {s.change}
            </span>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div className="card" style={{ maxWidth: 900 }}>
        <div className="card-head">
          <div>
            <h3>🚀 {current.title} Service Hub</h3>
            <p>Aapke anurodh ke mutabiq is service ka menu configure kar diya gaya hai.</p>
          </div>
          <span className="badge success" style={{ color: current.badgeColor, borderColor: current.badgeColor, background: current.badgeBg }}>
            ● Ready for Feature Integration
          </span>
        </div>
        <div className="card-body" style={{ lineHeight: 1.7, fontSize: 13, color: '#4a5d53' }}>
          <p style={{ margin: '0 0 14px' }}>
            Aapne <strong>{current.title}</strong> service ko top header menu se select kiya hai.
            Is service ka dedicated dashboard workspace ready hai. Agle charan (phase) me iske specific features, API endpoints aur reporting tools add kiye ja sakte hain.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Link to="/dashboard" className="btn" style={{ fontSize: 12 }}>
              ← Return to WhatsApp Automation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
