import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PaymentDetailsModal from '../../components/modals/PaymentDetailsModal'

const SERVICES = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    color: '#10b981',
    lightBg: 'rgba(16, 185, 129, 0.1)',
    desc: 'High speed WhatsApp automation, Baileys connection, bulk campaigns & group tools'
  },
  {
    id: 'sms',
    label: 'SMS Gateway',
    icon: '📱',
    color: '#0284c7',
    lightBg: 'rgba(2, 132, 199, 0.1)',
    desc: 'Turn Android devices into dedicated SMS gateways with Dual-SIM routing & fast OTP'
  },
  {
    id: 'plan',
    label: 'Plan API',
    icon: '⚡',
    color: '#ea580c',
    lightBg: 'rgba(234, 88, 12, 0.1)',
    desc: 'Live prepaid/postpaid recharge plans, special R-offers & DTH operator tariff API'
  },
  {
    id: 'gst',
    label: 'GST Portal',
    icon: '🏛️',
    color: '#7c3aed',
    lightBg: 'rgba(124, 58, 237, 0.1)',
    desc: 'Instant GSTIN verification, legal profile, GSTR-1 & 3B return history & e-Invoice status'
  }
]

const DEFAULT_PLANS = {
  whatsapp: [
    {
      planId: 'plan_startup',
      name: 'Startup',
      price: '99',
      validity: '30 Days',
      dailyLimit: '500/Day',
      deviceLimit: '1 Free + 1 Add-on',
      badgeText: 'Basic',
      description: 'Send messages to contacts only. Ideal for single business numbers.',
      features: [
        '500 Messages / Day Quota',
        '1 Device Free (+1 Add-on ₹49)',
        'WhatsApp Web & REST API Access',
        'Single Contact Direct Messaging',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_business',
      name: 'Business',
      price: '149',
      validity: '30 Days',
      dailyLimit: '1,000/Day',
      deviceLimit: '1 Free + 2 Add-ons',
      badgeText: '⭐ Most Popular',
      isPopular: true,
      description: 'Send messages to contacts and groups. Includes bulk campaigns.',
      features: [
        '1,000 Messages / Day Quota',
        '1 Device Free (+2 Add-ons ₹49/ea)',
        'Bulk Broadcast Campaigns',
        'Group Messaging Option Included',
        'Schedule Messages & Fast Queue',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_enterprise',
      name: 'Enterprise',
      price: '199',
      validity: '30 Days',
      dailyLimit: '2,000/Day',
      deviceLimit: '1 Free + 4 Add-ons',
      badgeText: 'Full Suite',
      description: 'High volume automation with received message webhooks and IP security.',
      features: [
        '2,000 Messages / Day Quota',
        '1 Device Free (+4 Add-ons ₹49/ea)',
        'Full Webhook & Inbound Triggering',
        'Bulk Campaigns & Group Sender',
        'IP Security & Dedicated Queue',
        'Validity: 30 Days'
      ]
    }
  ],
  sms: [
    {
      planId: 'plan_sms_starter',
      name: 'Starter SMS',
      price: '99',
      validity: '30 Days',
      dailyLimit: '1,000 SMS / Day',
      deviceLimit: '1 Android Device',
      badgeText: 'Basic',
      description: 'Turn your Android phone into an SMS gateway for OTP and single alerts.',
      features: [
        '1,000 SMS / Day Quota',
        '1 Android Mobile Linked',
        'Dual SIM Routing Support',
        'Instant HTTP / REST API',
        'Delivery Status Tracking',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_sms_business',
      name: 'Business Gateway',
      price: '199',
      validity: '30 Days',
      dailyLimit: '5,000 SMS / Day',
      deviceLimit: '3 Android Devices',
      badgeText: '⭐ Most Popular',
      isPopular: true,
      description: 'High-speed SMS dispatch for e-commerce, OTP verification and stores.',
      features: [
        '5,000 SMS / Day Quota',
        '3 Android Devices Linked',
        'Multi-SIM Load Balancing',
        'Real-time Webhook Forwarding',
        'Auto Retry on Network Failure',
        'Priority Delivery Dispatch'
      ]
    },
    {
      planId: 'plan_sms_enterprise',
      name: 'Enterprise Fleet',
      price: '399',
      validity: '30 Days',
      dailyLimit: '25,000 SMS / Day',
      deviceLimit: '10 Android Devices',
      badgeText: 'Bulk Scale',
      description: 'High capacity multi-device SMS cluster for large customer notification campaigns.',
      features: [
        '25,000 SMS / Day Quota',
        'Up to 10 Android Devices Linked',
        'Unlimited SIM Auto-Routing',
        'Sub-second Gateway Dispatch',
        'Dedicated Webhook Endpoint',
        '99.9% High Uptime SLA'
      ]
    }
  ],
  plan: [
    {
      planId: 'plan_api_lite',
      name: 'Developer Lite',
      price: '149',
      validity: '30 Days',
      dailyLimit: '10,000 Hits / Month',
      deviceLimit: 'Unlimited IP Access',
      badgeText: 'Lite',
      description: 'Ideal for developers testing recharge APIs and mobile tariff queries.',
      features: [
        '10,000 API Hits / Month',
        'Jio, Airtel, Vi & BSNL Plans',
        'All India Telecom Circles',
        'Standard R-Offer Queries',
        'Clean JSON REST Endpoints',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_api_pro',
      name: 'Business Pro',
      price: '299',
      validity: '30 Days',
      dailyLimit: '100,000 Hits / Month',
      deviceLimit: 'High Concurrency',
      badgeText: '⚡ Recommended',
      isPopular: true,
      description: 'Production plan data engine for recharge portals, mobile apps and fintech.',
      features: [
        '100,000 API Hits / Month',
        'Mobile + DTH Operators Data',
        'Live Special R-Offer Engine',
        'Sub-150ms Response SLA',
        'Real-time Scraping & Cache Sync',
        'Instant Token Regeneration'
      ]
    },
    {
      planId: 'plan_api_enterprise',
      name: 'Enterprise Scale',
      price: '599',
      validity: '30 Days',
      dailyLimit: '1,000,000 Hits / Month',
      deviceLimit: 'Dedicated Cluster',
      badgeText: 'High Volume',
      description: 'Full-throttle high volume access for large telecom recharge networks.',
      features: [
        '1,000,000 API Hits / Month',
        'Complete Mobile, DTH & Datacard',
        'Deep Live Scraper Engine',
        '99.99% High Availability SLA',
        'Dedicated High-Speed Queue',
        'Priority Technical Support'
      ]
    }
  ],
  gst: [
    {
      planId: 'plan_gst_basic',
      name: 'Basic GST Check',
      price: '149',
      validity: '30 Days',
      dailyLimit: '500 Lookups / Month',
      deviceLimit: 'Single User Access',
      badgeText: 'Starter',
      description: 'Verify taxpayer registration, trade name and active GST status.',
      features: [
        '500 GSTIN Verifications',
        'Legal Name & Trade Name Check',
        'Active / Inactive Status Check',
        'Last 3 Months Filing Status',
        'Center & State Jurisdiction',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_gst_pro',
      name: 'Pro Taxpayer Suite',
      price: '349',
      validity: '30 Days',
      dailyLimit: '3,000 Lookups / Month',
      deviceLimit: 'Multi-User Access',
      badgeText: '⭐ Most Popular',
      isPopular: true,
      description: 'Complete 2-year filing audit, Aadhaar auth and e-invoice status verification.',
      features: [
        '3,000 GSTIN Verifications',
        'Full Legal Profile & Address',
        'GSTR-1 & 3B 2-Year History Table',
        'Aadhaar Authentication Status',
        'e-Invoice Enabled Status Check',
        'Instant Print & PDF Export'
      ]
    },
    {
      planId: 'plan_gst_corporate',
      name: 'Corporate Bulk GST',
      price: '749',
      validity: '30 Days',
      dailyLimit: '15,000 Lookups / Month',
      deviceLimit: 'API + Web Portal',
      badgeText: 'Corporate',
      description: 'High volume GST compliance engine with batch verification and REST API.',
      features: [
        '15,000 GSTIN Lookups / Month',
        'Live Official Portal Scraper Engine',
        'Complete GSTR-1, 3B, 9 & 9C Tracking',
        'Batch GSTIN Verification Mode',
        'Clean JSON REST API Access',
        'Priority 24/7 Processing Queue'
      ]
    }
  ]
}

export default function UserPlansPage({ currentUser: propUser, notify: propNotify, isPreview = false }) {
  const { user: authUser, notify: authNotify } = useAuth()
  const currentUser = propUser || authUser
  const notify = propNotify || authNotify

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [currentPlan, setCurrentPlan] = useState(currentUser?.plan || 'Standard')
  const [myRequests, setMyRequests] = useState([])
  const [activeTab, setActiveTab] = useState('plans')
  const [selectedService, setSelectedService] = useState('whatsapp')
  const [selectedPlan, setSelectedPlan] = useState(null)

  const fetchPlansData = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/api/plans')
      if (d.success) {
        setPlans(d.plans || [])
        if (d.currentPlan) setCurrentPlan(d.currentPlan)
        if (d.myRequests) setMyRequests(d.myRequests)
      }
    } catch (e) {
      notify('Plans लोड करने में त्रुटि: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchPlansData()
  }, [fetchPlansData])

  const pendingCount = myRequests.filter(r => r.status === 'pending').length

  const handleOpenPurchase = (plan) => {
    setSelectedPlan(plan)
  }

  const handlePurchaseSuccess = () => {
    setSelectedPlan(null)
    fetchPlansData()
    setActiveTab('requests')
  }

  const activeServiceConfig = SERVICES.find(s => s.id === selectedService) || SERVICES[0]

  // Filter admin plans matching current service
  const serviceAdminPlans = plans.filter(p => {
    const s = (p.service || 'whatsapp').toLowerCase()
    return s === selectedService.toLowerCase()
  })

  // Fallback to compact curated default plans if no admin plans exist for this service yet
  const displayedPlans = serviceAdminPlans.length > 0 
    ? serviceAdminPlans 
    : (DEFAULT_PLANS[selectedService] || [])

  // Helper to extract clean bullet features from any plan
  const getPlanFeatures = (p) => {
    if (Array.isArray(p.features) && p.features.length > 0) {
      return p.features
    }
    const f = []
    if (p.dailyLimit) f.push(`Daily Limit: ${p.dailyLimit}`)
    if (p.validity) f.push(`Validity: ${p.validity}`)
    if (p.deviceLimit) f.push(`Device Limit: ${p.deviceLimit}`)
    if (p.apiAccess) f.push('API & Developer Access Included')
    if (p.webAccess) f.push('Web Dashboard Access Included')
    if (p.bulkMsg) f.push('Bulk Message Campaigns')
    if (p.groupOption) f.push('Group Messaging Option')
    if (p.scheduleMsg) f.push('Schedule Messages')
    if (p.ipSecurity) f.push('IP Whitelist Security')
    return f.length > 0 ? f : ['All Core Features Included', 'Standard Support SLA']
  }

  return (
    <section className="user-plans-page">
      {!isPreview && (
        <>
          {/* Header & Subtitle */}
          <div className="page-header d-flex flex-wrap align-items-center justify-content-between mb-3">
            <div>
              <h1 className="page-title mb-1" style={{ fontSize: 22, fontWeight: 800, color: 'inherit' }}>
                💎 Subscription Plans &amp; Pricing
              </h1>
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                Choose the best package for your business across WhatsApp, SMS, Plan API, and GST services.
              </p>
            </div>
            <div className="d-flex align-items-center gap-2 mt-2 mt-md-0" style={{ gap: 10 }}>
              <button 
                type="button" 
                className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('plans')}
                style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13 }}
              >
                🏷️ Pricing Plans
              </button>
              <button 
                type="button" 
                className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('requests')}
                style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, position: 'relative' }}
              >
                📋 My Purchase Requests
                {pendingCount > 0 && (
                  <span className="badge badge-warning" style={{ marginLeft: 6, fontSize: 10, padding: '2px 6px' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <div>प्लान लोड हो रहे हैं (Loading pricing plans)...</div>
        </div>
      ) : activeTab === 'plans' ? (
        <>
          {/* SERVICE SWITCHER TABS - WHATSAPP, SMS, PLAN, GST */}
          <div className="d-flex align-items-center flex-wrap gap-2 mb-3" style={{ gap: 10 }}>
            {SERVICES.map((srv) => {
              const isSelected = selectedService === srv.id
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedService(srv.id)}
                  className="btn"
                  style={{
                    borderRadius: 10,
                    padding: '8px 18px',
                    fontWeight: 700,
                    fontSize: 13.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    border: isSelected ? `2px solid ${srv.color}` : '1px solid var(--zd-border, #e2e8f0)',
                    backgroundColor: isSelected ? srv.lightBg : 'var(--zd-card-bg, #ffffff)',
                    color: isSelected ? srv.color : 'inherit',
                    boxShadow: isSelected ? `0 3px 12px ${srv.color}30` : 'none',
                    transition: 'all 0.18s ease',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{srv.icon}</span>
                  <span>{srv.label}</span>
                </button>
              )
            })}
          </div>

          {/* Current Active Plan Status Banner (Compact) */}
          <div 
            className="card mb-3" 
            style={{ 
              borderRadius: 12, 
              background: `linear-gradient(135deg, ${activeServiceConfig.lightBg} 0%, rgba(255,255,255,0.02) 100%)`, 
              border: `1px solid ${activeServiceConfig.color}40`,
              padding: '12px 18px'
            }}
          >
            <div className="d-flex flex-wrap align-items-center justify-content-between" style={{ gap: 12 }}>
              <div className="d-flex align-items-center" style={{ gap: 12 }}>
                <div 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: 10, 
                    background: activeServiceConfig.color, 
                    color: '#fff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: 18, 
                    flexShrink: 0 
                  }}
                >
                  {activeServiceConfig.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'inherit' }}>
                    {activeServiceConfig.label} Service • Active Plan: <span style={{ color: activeServiceConfig.color }}>{currentPlan}</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {activeServiceConfig.desc}
                  </div>
                </div>
              </div>
              <div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-outline-secondary"
                  onClick={fetchPlansData}
                  style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}
                >
                  ↻ Refresh
                </button>
              </div>
            </div>
          </div>

          {/* COMPACT PRICING CARDS GRID */}
          <div 
            className="pricing-cards-grid mb-4"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              maxWidth: 1240
            }}
          >
            {displayedPlans.map((plan, idx) => {
              const isCurrent = currentPlan?.toLowerCase() === plan.name?.toLowerCase()
              const isPopular = plan.isPopular || plan.badgeText?.toLowerCase().includes('popular') || plan.badgeText?.toLowerCase().includes('recommended')
              const features = getPlanFeatures(plan)

              return (
                <div
                  key={plan.planId || idx}
                  className="pricing-card card h-100"
                  style={{
                    borderRadius: 14,
                    border: isPopular ? `2px solid ${activeServiceConfig.color}` : '1px solid var(--zd-border, #e2e8f0)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isPopular ? `0 6px 18px ${activeServiceConfig.color}22` : '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Badge (if any) */}
                  {plan.badgeText && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 12,
                        background: isPopular ? activeServiceConfig.color : 'rgba(0,0,0,0.08)',
                        color: isPopular ? '#ffffff' : 'inherit',
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {plan.badgeText}
                    </div>
                  )}

                  <div className="card-body p-3 p-md-4" style={{ flexGrow: 1 }}>
                    {/* Card Header: Service Icon + Plan Name */}
                    <div className="d-flex align-items-center mb-1" style={{ gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{activeServiceConfig.icon}</span>
                      <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'inherit' }}>
                        {plan.name}
                      </h3>
                    </div>

                    <p className="text-muted mb-3" style={{ fontSize: 12, minHeight: 32, lineHeight: 1.35 }}>
                      {plan.description || `${activeServiceConfig.label} Subscription Plan`}
                    </p>

                    {/* Compact Price Pill */}
                    <div
                      style={{
                        background: activeServiceConfig.lightBg,
                        padding: '9px 12px',
                        borderRadius: 10,
                        marginBottom: 14,
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 22, fontWeight: 900, color: activeServiceConfig.color }}>
                          ₹{plan.price}
                        </span>
                        <span className="text-muted" style={{ fontSize: 11.5, marginLeft: 4 }}>
                          / {plan.validity || '30 Days'}
                        </span>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: activeServiceConfig.color }}>
                        Instant Activation
                      </span>
                    </div>

                    {/* Compact Features List */}
                    <div style={{ borderTop: '1px solid var(--zd-border, #eef2f6)', paddingTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--zd-text-muted, #8a98ac)', letterSpacing: '0.04em', marginBottom: 8 }}>
                        Plan Features &amp; Quotas:
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.35 }}>
                        {features.map((f, fIdx) => (
                          <li key={fIdx} className="d-flex align-items-center mb-2" style={{ gap: 7 }}>
                            <span
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                background: `${activeServiceConfig.color}20`,
                                color: activeServiceConfig.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9.5,
                                fontWeight: 900,
                                flexShrink: 0
                              }}
                            >
                              ✓
                            </span>
                            <span style={{ color: 'inherit' }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Action Button (Footer) */}
                  <div className="card-footer p-3 pt-0" style={{ background: 'transparent', borderTop: 'none' }}>
                    {isCurrent ? (
                      <button
                        type="button"
                        className="btn btn-outline-success w-100"
                        disabled
                        style={{ borderRadius: 8, fontWeight: 700, fontSize: 12.5, height: 36 }}
                      >
                        ✓ Current Active Plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn w-100"
                        onClick={() => handleOpenPurchase(plan)}
                        style={{
                          backgroundColor: activeServiceConfig.color,
                          borderColor: activeServiceConfig.color,
                          color: '#ffffff',
                          borderRadius: 8,
                          fontWeight: 700,
                          fontSize: 12.5,
                          height: 36,
                          boxShadow: `0 3px 10px ${activeServiceConfig.color}35`,
                          cursor: 'pointer'
                        }}
                      >
                        Buy {plan.name}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* MY PURCHASE REQUESTS TAB */
        <div className="card shadow-sm" style={{ borderRadius: 14 }}>
          <div className="card-header d-flex align-items-center justify-content-between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--zd-border, rgba(0,0,0,0.06))' }}>
            <div>
              <h5 className="card-title mb-0" style={{ fontSize: 15, fontWeight: 700 }}>
                📋 My Subscription Purchase History
              </h5>
              <small className="text-muted">Track all your submitted plan purchase payments and activation statuses.</small>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-outline-primary"
              onClick={fetchPlansData}
              style={{ borderRadius: 8 }}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="card-body p-0">
            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                <h4>आपने अभी तक कोई पेमेंट रिक्वेस्ट नहीं भेजी है</h4>
                <p className="text-muted mb-3">You haven't submitted any plan purchase requests yet.</p>
                <button type="button" className="btn btn-primary" onClick={() => setActiveTab('plans')}>
                  Browse Plans &amp; Pricing
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table card-table table-vcenter text-nowrap mb-0">
                  <thead>
                    <tr style={{ background: 'var(--zd-card-bg, #f8fafc)', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
                      <th style={{ fontWeight: 700 }}>Request ID</th>
                      <th style={{ fontWeight: 700 }}>Plan Name</th>
                      <th style={{ fontWeight: 700 }}>Amount</th>
                      <th style={{ fontWeight: 700 }}>Payment Date</th>
                      <th style={{ fontWeight: 700 }}>Bank / Txn Details</th>
                      <th style={{ fontWeight: 700 }}>Status</th>
                      <th style={{ fontWeight: 700 }}>Submitted On</th>
                      <th style={{ fontWeight: 700 }}>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req) => (
                      <tr key={req.requestId}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--zd-text-muted, #64748b)' }}>
                            {req.requestId}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: 13.5 }}>{req.planName}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
                            ₹{req.amount}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12.5 }}>{req.paymentDate}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.bankDetails}>
                            {req.bankDetails}
                          </div>
                        </td>
                        <td>
                          {req.status === 'pending' && (
                            <span className="badge badge-warning" style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999 }}>
                              ⏳ Pending Review
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="badge badge-success" style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999 }}>
                              ✓ Activated / Approved
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="badge badge-danger" style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999 }}>
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--zd-text-muted, #8a98ac)' }}>
                            {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, color: 'var(--zd-text-muted, #8a98ac)' }}>
                            {req.adminNotes || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAYMENT DETAILS POPUP MODAL (When user clicks Buy Plan) */}
      {selectedPlan && (
        <PaymentDetailsModal 
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePurchaseSuccess}
          notify={notify}
        />
      )}
    </section>
  )
}
