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
    softBg: '#f0fdf4',
    desc: 'High-speed WhatsApp automation, Baileys session, bulk broadcast campaigns & group messaging.'
  },
  {
    id: 'sms',
    label: 'SMS Gateway',
    icon: '📱',
    color: '#0284c7',
    softBg: '#f0f9ff',
    desc: 'Turn Android devices into dedicated SMS gateways with Dual-SIM routing & fast OTP delivery.'
  },
  {
    id: 'plan',
    label: 'Plan API',
    icon: '⚡',
    color: '#ea580c',
    softBg: '#fff7ed',
    desc: 'Live prepaid/postpaid mobile recharge plans, special R-offers & DTH operator tariff API.'
  },
  {
    id: 'gst',
    label: 'GST Portal',
    icon: '🏛️',
    color: '#7c3aed',
    softBg: '#faf5ff',
    desc: 'Instant GSTIN taxpayer verification, legal profile, GSTR-1 & 3B return history & e-Invoice status.'
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
      description: 'Send messages to contacts and groups. Includes bulk broadcast campaigns.',
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
    if (p.dailyLimit) f.push(`Daily Quota: ${p.dailyLimit}`)
    if (p.validity) f.push(`Validity: ${p.validity}`)
    if (p.deviceLimit) f.push(`Device Limit: ${p.deviceLimit}`)
    if (p.apiAccess) f.push('REST API & Webhook Access')
    if (p.webAccess) f.push('Web Dashboard Access Included')
    if (p.bulkMsg) f.push('Bulk Message Campaigns')
    if (p.groupOption) f.push('Group Messaging Option')
    if (p.scheduleMsg) f.push('Scheduled Queue Sending')
    if (p.ipSecurity) f.push('IP Whitelist Security')
    return f.length > 0 ? f : ['All Core Features Included', 'Standard Support SLA']
  }

  return (
    <section className="user-plans-page" style={{ color: '#0f172a' }}>
      <style>{`
        .service-tabs-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          margin-bottom: 18px;
        }
        @media (max-width: 820px) {
          .service-tabs-bar {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 480px) {
          .service-tabs-bar {
            grid-template-columns: 1fr;
          }
        }
        .pricing-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 18px;
          width: 100%;
        }
        .user-plans-page .nav-action-btn {
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .user-plans-page .nav-action-btn:hover {
          transform: translateY(-1px);
        }
      `}</style>

      {!isPreview && (
        <>
          {/* Header & Section Title */}
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                💎 Subscription Plans &amp; Pricing
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Choose the best package for your business across WhatsApp, SMS, Plan API, and GST services.
              </p>
            </div>
            <div className="d-flex align-items-center" style={{ gap: 10 }}>
              <button 
                type="button" 
                className="nav-action-btn"
                onClick={() => setActiveTab('plans')}
                style={{ 
                  borderRadius: 10, 
                  padding: '8px 16px', 
                  fontWeight: 700, 
                  fontSize: 13,
                  border: activeTab === 'plans' ? '1px solid #16a765' : '1px solid #cbd5e1',
                  background: activeTab === 'plans' ? '#16a765' : '#ffffff',
                  color: activeTab === 'plans' ? '#ffffff' : '#334155',
                  boxShadow: activeTab === 'plans' ? '0 3px 10px rgba(22,167,101,0.25)' : '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                🏷️ Pricing Plans
              </button>
              <button 
                type="button" 
                className="nav-action-btn"
                onClick={() => setActiveTab('requests')}
                style={{ 
                  borderRadius: 10, 
                  padding: '8px 16px', 
                  fontWeight: 700, 
                  fontSize: 13, 
                  position: 'relative',
                  border: activeTab === 'requests' ? '1px solid #16a765' : '1px solid #cbd5e1',
                  background: activeTab === 'requests' ? '#16a765' : '#ffffff',
                  color: activeTab === 'requests' ? '#ffffff' : '#334155',
                  boxShadow: activeTab === 'requests' ? '0 3px 10px rgba(22,167,101,0.25)' : '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                📋 My Purchase Requests
                {pendingCount > 0 && (
                  <span style={{ 
                    marginLeft: 6, 
                    fontSize: 10, 
                    fontWeight: 800,
                    padding: '2px 7px', 
                    borderRadius: 999,
                    background: '#eab308',
                    color: '#000000'
                  }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>लोड हो रहे हैं (Loading plans)...</div>
        </div>
      ) : activeTab === 'plans' ? (
        <>
          {/* 4 SERVICE BUTTONS LEFT TO RIGHT IN A SINGLE ROW */}
          <div className="service-tabs-bar">
            {SERVICES.map((srv) => {
              const isSelected = selectedService === srv.id
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedService(srv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: isSelected ? `2px solid ${srv.color}` : '1px solid #cbd5e1',
                    background: isSelected ? srv.color : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontWeight: isSelected ? 800 : 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 4px 14px ${srv.color}35` : '0 2px 4px rgba(0,0,0,0.03)',
                    transition: 'all 0.18s ease',
                    outline: 'none'
                  }}
                >
                  <span style={{ fontSize: 18 }}>{srv.icon}</span>
                  <span>{srv.label}</span>
                </button>
              )
            })}
          </div>

          {/* ACTIVE SERVICE STATUS BANNER (NO REFRESH BUTTON, PURE CLEAN CONTRAST) */}
          <div 
            style={{ 
              borderRadius: 12, 
              background: '#ffffff', 
              border: '1px solid #e2e8f0',
              borderLeft: `5px solid ${activeServiceConfig.color}`,
              padding: '14px 20px',
              marginBottom: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          >
            <div className="d-flex align-items-center" style={{ gap: 14 }}>
              <div 
                style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 10, 
                  background: activeServiceConfig.softBg, 
                  color: activeServiceConfig.color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 20, 
                  flexShrink: 0,
                  border: `1px solid ${activeServiceConfig.color}30`
                }}
              >
                {activeServiceConfig.icon}
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>
                  {activeServiceConfig.label} Service • Current Plan:{' '}
                  <span style={{ color: activeServiceConfig.color, fontWeight: 800 }}>
                    {currentPlan}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  {activeServiceConfig.desc}
                </div>
              </div>
            </div>
          </div>

          {/* COMPACT PRICING CARDS GRID */}
          <div className="pricing-cards-grid mb-4">
            {displayedPlans.map((plan, idx) => {
              const isCurrent = currentPlan?.toLowerCase() === plan.name?.toLowerCase()
              const isPopular = plan.isPopular || plan.badgeText?.toLowerCase().includes('popular') || plan.badgeText?.toLowerCase().includes('recommended')
              const features = getPlanFeatures(plan)

              return (
                <div
                  key={plan.planId || idx}
                  style={{
                    borderRadius: 14,
                    background: '#ffffff',
                    border: isPopular ? `2px solid ${activeServiceConfig.color}` : '1px solid #e2e8f0',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isPopular 
                      ? `0 8px 24px ${activeServiceConfig.color}20` 
                      : '0 2px 8px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden'
                  }}
                >
                  {/* Top Badge (if any) */}
                  {plan.badgeText && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 14,
                        background: isPopular ? activeServiceConfig.color : '#f1f5f9',
                        color: isPopular ? '#ffffff' : '#475569',
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '3px 10px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {plan.badgeText}
                    </div>
                  )}

                  <div style={{ padding: '20px 20px 14px', flexGrow: 1 }}>
                    {/* Card Header: Service Icon + Plan Name */}
                    <div className="d-flex align-items-center" style={{ gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{activeServiceConfig.icon}</span>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        {plan.name}
                      </h3>
                    </div>

                    <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 16px', minHeight: 34, lineHeight: 1.4 }}>
                      {plan.description || `${activeServiceConfig.label} Subscription Plan`}
                    </p>

                    {/* Price Box */}
                    <div
                      style={{
                        background: activeServiceConfig.softBg,
                        border: `1px solid ${activeServiceConfig.color}30`,
                        padding: '10px 14px',
                        borderRadius: 10,
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 24, fontWeight: 900, color: activeServiceConfig.color }}>
                          ₹{plan.price}
                        </span>
                        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 5, fontWeight: 600 }}>
                          / {plan.validity || '30 Days'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: activeServiceConfig.color }}>
                        Active Support
                      </span>
                    </div>

                    {/* Features List */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 10 }}>
                        Included Features:
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, lineHeight: 1.45 }}>
                        {features.map((f, fIdx) => (
                          <li key={fIdx} className="d-flex align-items-center mb-2" style={{ gap: 8 }}>
                            <span
                              style={{
                                width: 17,
                                height: 17,
                                borderRadius: '50%',
                                background: `${activeServiceConfig.color}18`,
                                color: activeServiceConfig.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 900,
                                flexShrink: 0
                              }}
                            >
                              ✓
                            </span>
                            <span style={{ color: '#1e293b', fontWeight: 500 }}>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Action Button (Footer) */}
                  <div style={{ padding: '0 20px 20px', background: 'transparent' }}>
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          width: '100%',
                          height: 40,
                          borderRadius: 10,
                          border: '1px solid #86efac',
                          background: '#f0fdf4',
                          color: '#15803d',
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: 'default'
                        }}
                      >
                        ✓ Current Active Plan
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenPurchase(plan)}
                        style={{
                          width: '100%',
                          height: 40,
                          borderRadius: 10,
                          border: 'none',
                          background: activeServiceConfig.color,
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: 'pointer',
                          boxShadow: `0 4px 14px ${activeServiceConfig.color}35`,
                          transition: 'all 0.18s ease'
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
        /* MY PURCHASE REQUESTS TAB (NO REFRESH BUTTON, HIGH CONTRAST) */
        <div style={{ borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
            <h5 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
              📋 My Subscription Purchase History
            </h5>
            <small style={{ color: '#64748b', fontSize: 12 }}>
              Track all your submitted plan purchase payments and activation statuses.
            </small>
          </div>

          <div style={{ padding: 0 }}>
            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                <h4 style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>आपने अभी तक कोई पेमेंट रिक्वेस्ट नहीं भेजी है</h4>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                  You haven't submitted any plan purchase requests yet.
                </p>
                <button 
                  type="button" 
                  onClick={() => setActiveTab('plans')}
                  style={{
                    background: '#16a765',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '9px 20px',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Browse Plans &amp; Pricing
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table card-table table-vcenter text-nowrap mb-0" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Request ID</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Plan Name</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Amount</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Payment Date</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Bank / Txn Details</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Status</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Submitted On</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req) => (
                      <tr key={req.requestId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: '#64748b' }}>
                            {req.requestId}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <strong style={{ fontSize: 13.5, color: '#0f172a' }}>{req.planName}</strong>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#16a765' }}>
                            ₹{req.amount}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12.5, color: '#334155' }}>
                          {req.paymentDate}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 12, color: '#475569', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }} title={req.bankDetails}>
                            {req.bankDetails}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {req.status === 'pending' && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#fef3c7', color: '#b45309' }}>
                              ⏳ Pending Review
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#dcfce7', color: '#15803d' }}>
                              ✓ Activated / Approved
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c' }}>
                              ✕ Rejected
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>
                          {req.adminNotes || '-'}
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
