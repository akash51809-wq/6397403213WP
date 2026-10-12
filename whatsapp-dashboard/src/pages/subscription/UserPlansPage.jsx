import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PaymentDetailsModal from '../../components/modals/PaymentDetailsModal'
import AddFundsModal from '../../components/modals/AddFundsModal'

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
      service: 'whatsapp',
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
      service: 'whatsapp',
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
      service: 'whatsapp',
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
      name: 'SMS Starter',
      price: '199',
      service: 'sms',
      validity: '30 Days',
      incomingAllowed: true,
      outgoingAllowed: true,
      badgeText: 'Starter',
      description: 'Connect Android phones as gateway to receive SMS and route to webhooks.',
      features: [
        'Incoming SMS Routing to Webhook',
        'Outgoing SMS Outbox Allowed',
        'Multi-SIM Slot Support',
        'Fast Real-Time Delivery',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_sms_pro',
      name: 'SMS Business Pro',
      price: '399',
      service: 'sms',
      validity: '30 Days',
      incomingAllowed: true,
      outgoingAllowed: true,
      badgeText: '⭐ Popular',
      isPopular: true,
      description: 'Full two-way SMS gateway for high-throughput OTPs, alerts and notifications.',
      features: [
        'High Throughput Two-Way SMS',
        'Incoming SMS Webhook Dispatches',
        'Outgoing Broadcast Outbox Allowed',
        'Detailed Delivery Reports',
        'Validity: 30 Days'
      ]
    }
  ],
  plan: [
    {
      planId: 'plan_api_basic',
      name: 'Plan API Basic',
      price: '499',
      service: 'plan',
      hits: 10000,
      validity: '30 Days',
      apiAccess: true,
      badgeText: '10K Hits',
      description: 'Mobile and DTH operator recharge plans, R-offer check & series lookup.',
      features: [
        '10,000 Hits Quota',
        'Operator & Circle Lookup',
        'Live Mobile Tariff & Plans',
        'R-Offers & DTH Customer Info',
        'REST API Secret Token Access',
        'Validity: 30 Days'
      ]
    },
    {
      planId: 'plan_api_unlimited',
      name: 'Plan API Unlimited Lifetime',
      price: '999',
      service: 'plan',
      hits: 50000,
      isUnlimitedValidity: true,
      validity: 'Unlimited',
      apiAccess: true,
      badgeText: '⭐ Lifetime',
      isPopular: true,
      description: '50,000 API Hits with lifetime unlimited validity. Never expires until used.',
      features: [
        '50,000 API Hits',
        'Unlimited Lifetime Validity',
        'Full REST API & Endpoints',
        'High-Speed Scraper Engine',
        'Instant Token Regeneration'
      ]
    }
  ],
  gst: [
    {
      planId: 'plan_gst_hit',
      name: 'GST Pay-Per-Hit',
      price: '1.0',
      pricePerHit: 1.0,
      service: 'gst',
      validity: 'Pay-per-hit',
      badgeText: 'Pay As You Go',
      isPopular: true,
      description: 'Pay ₹1.0 per lookup deducted directly from your user wallet balance.',
      features: [
        '₹1.00 Charged Per Search Hit',
        'Deducted directly from Wallet',
        'Full Legal & Trade Name Profile',
        '2-Year GSTR-1 & 3B Filing History',
        'Aadhaar & e-Invoice Verification',
        'Instant Search History Access'
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
  const [walletBalance, setWalletBalance] = useState(Number(currentUser?.walletBalance || 0))
  const [currentPlan, setCurrentPlan] = useState(currentUser?.plan || 'Standard')
  const [smsPlan, setSmsPlan] = useState(currentUser?.smsPlan || '')
  const [planApiPlan, setPlanApiPlan] = useState(currentUser?.planApiPlan || '')
  const [gstPlan, setGstPlan] = useState(currentUser?.gstPlan || '')
  const [myRequests, setMyRequests] = useState([])
  const [activeTab, setActiveTab] = useState('plans')
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [selectedService, setSelectedService] = useState(() => {
    const s = searchParams.get('service')?.toLowerCase()
    return s && ['whatsapp', 'sms', 'plan', 'gst'].includes(s) ? s : 'whatsapp'
  })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showAddFunds, setShowAddFunds] = useState(false)

  useEffect(() => {
    const s = searchParams.get('service')?.toLowerCase()
    if (s && ['whatsapp', 'sms', 'plan', 'gst'].includes(s) && s !== selectedService) {
      setSelectedService(s)
    }
  }, [searchParams, selectedService])

  const fetchPlansData = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/api/plans')
      if (d.success) {
        setPlans(d.plans || [])
        if (d.currentPlan) setCurrentPlan(d.currentPlan)
        if (d.walletBalance !== undefined) setWalletBalance(Number(d.walletBalance))
        if (d.smsPlan !== undefined) setSmsPlan(d.smsPlan || '')
        if (d.planApiPlan !== undefined) setPlanApiPlan(d.planApiPlan || '')
        if (d.gstPlan !== undefined) setGstPlan(d.gstPlan || '')
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
    const s = (p.service || selectedService).toLowerCase()
    if (s === 'whatsapp') {
      if (p.dailyLimit) f.push(`Daily Quota: ${p.dailyLimit}`)
      if (p.validity) f.push(`Validity: ${p.validity}`)
      if (p.deviceLimit) f.push(`Device Limit: ${p.deviceLimit}`)
      if (p.apiAccess) f.push('REST API & Webhook Access')
      if (p.webAccess !== false) f.push('Web Dashboard Access Included')
      if (p.bulkMsg) f.push('Bulk Message Campaigns')
      if (p.groupOption) f.push('Group Messaging Option')
      if (p.scheduleMsg) f.push('Scheduled Queue Sending')
      if (p.ipSecurity) f.push('IP Whitelist Security')
    } else if (s === 'sms') {
      if (p.validity) f.push(`Validity: ${p.validity}`)
      if (p.incomingAllowed !== false) f.push('Incoming SMS Routing Allowed')
      if (p.outgoingAllowed !== false) f.push('Outgoing SMS Sending Allowed')
      f.push('Multi-Device Android Gateway Support')
      f.push('Real-time Webhook Dispatches')
    } else if (s === 'plan') {
      if (p.hits) f.push(`Hits Quota: ${Number(p.hits).toLocaleString()} Hits`)
      if (p.isUnlimitedValidity) f.push('Unlimited Lifetime Validity')
      else if (p.validity) f.push(`Validity: ${p.validity}`)
      if (p.apiAccess) f.push('REST API Secret Token Access')
      f.push('Mobile, DTH & R-Offer Endpoints')
      f.push('High-Speed Scraper Engine')
    } else if (s === 'gst') {
      f.push(`₹${p.pricePerHit ?? p.price ?? 1.0} per Search Hit`)
      f.push('Deducted directly from Wallet Balance')
      f.push('Full Legal & Trade Name Profile')
      f.push('GSTR-1 & 3B Return History Table')
      f.push('Aadhaar & e-Invoice Verification')
    }
    return f.length > 0 ? f : ['All Core Features Included', 'Standard Support SLA']
  }

  // Active plan for selected service
  const getActivePlanNameForService = () => {
    if (selectedService === 'whatsapp') return currentPlan || 'Demo Plan'
    if (selectedService === 'sms') return smsPlan || 'No Active Plan'
    if (selectedService === 'plan') return planApiPlan || 'No Active Plan'
    if (selectedService === 'gst') return gstPlan || 'Pay-Per-Hit Active'
    return 'Active'
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
          grid-template-columns: repeat(auto-fit, minmax(240px, 300px));
          gap: 16px;
          width: 100%;
        }
        .user-plans-page .nav-action-btn {
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .user-plans-page .nav-action-btn:hover {
          transform: translateY(-1px);
        }
        .buy-plan-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }
      `}</style>

      {!isPreview && (
        <>
          {/* Header & Section Title */}
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                💎 Subscription Plans &amp; Wallet
              </h1>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                Choose the best package for your business across WhatsApp, SMS, Plan API, and GST services.
              </p>
            </div>
            <div className="d-flex align-items-center" style={{ gap: 10, flexWrap: 'wrap' }}>
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
                📋 My Orders
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
              <button
                type="button"
                className="nav-action-btn"
                onClick={() => setShowAddFunds(true)}
                style={{
                  borderRadius: 10,
                  padding: '8px 16px',
                  fontWeight: 800,
                  fontSize: 13,
                  border: '1px solid #10b981',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  boxShadow: '0 3px 10px rgba(16,185,129,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>➕</span> Add Funds
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
                  onClick={() => {
                    setSelectedService(srv.id)
                    setSearchParams({ service: srv.id })
                  }}
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

          {/* ACTIVE SERVICE STATUS BANNER */}
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
                  {activeServiceConfig.label} Service • Current Active Plan:{' '}
                  <span style={{ color: activeServiceConfig.color, fontWeight: 800 }}>
                    {getActivePlanNameForService()}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>
                  {activeServiceConfig.desc}
                </div>
              </div>
            </div>
          </div>

          {selectedService === 'gst' ? (
            /* PAY-AS-YOU-GO DIRECT WALLET MODEL EXCLUSIVE TO GST */
            <div
              style={{
                borderRadius: 18,
                background: '#ffffff',
                border: `2px solid ${activeServiceConfig.color}35`,
                boxShadow: `0 10px 32px ${activeServiceConfig.color}15`,
                overflow: 'hidden',
                marginBottom: 24
              }}
            >
              {/* Card Banner Header */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${activeServiceConfig.color}18, ${activeServiceConfig.color}06)`,
                  borderBottom: `1px solid ${activeServiceConfig.color}25`,
                  padding: '22px 26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: activeServiceConfig.color,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                      boxShadow: `0 6px 18px ${activeServiceConfig.color}45`
                    }}
                  >
                    {activeServiceConfig.icon}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#0f172a' }}>
                        GST Portal · Pay-Per-Hit
                      </h3>
                      <span
                        style={{
                          background: `${activeServiceConfig.color}22`,
                          color: activeServiceConfig.color,
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 999,
                          letterSpacing: '0.04em'
                        }}
                      >
                        ⚡ DIRECT WALLET DEBIT
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                      No fixed monthly subscription fee. GSTIN verifications are charged directly from your wallet balance per verification.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: '#ffffff',
                    border: `1px solid ${activeServiceConfig.color}35`,
                    borderRadius: 14,
                    padding: '12px 22px',
                    textAlign: 'right',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Standard Rate
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: activeServiceConfig.color }}>
                    ₹{(plans.find(p => (p.service || '').toLowerCase() === 'gst')?.pricePerHit || plans.find(p => (p.service || '').toLowerCase() === 'gst')?.price || 1.0).toFixed(2)}
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginLeft: 4 }}>/ Hit</span>
                  </div>
                </div>
              </div>

              {/* Card Main Body */}
              <div style={{ padding: '24px 26px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
                  {/* Current Wallet Balance Box */}
                  <div
                    style={{
                      borderRadius: 14,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                        👛 Current User Wallet Balance
                      </div>
                      <div style={{ fontSize: 34, fontWeight: 900, color: Number(currentUser?.walletBalance || 0) >= 1.0 ? '#10b981' : '#ef4444' }}>
                        ₹{(Number(currentUser?.walletBalance || 0)).toFixed(2)}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
                        {Number(currentUser?.walletBalance || 0) >= 1.0 ? (
                          <span style={{ color: '#10b981', fontWeight: 700 }}>
                            ✓ Active: Sufficient balance for ~{Math.floor(Number(currentUser?.walletBalance || 0) / (Number(plans.find(p => (p.service || '').toLowerCase() === 'gst')?.pricePerHit || 1.0)))} hits.
                          </span>
                        ) : (
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>
                            ⚠️ Insufficient balance for GST hits. Please add funds to proceed.
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setShowAddFunds(true)}
                        className="nav-action-btn"
                        style={{
                          flex: '1 1 auto',
                          minHeight: 42,
                          padding: '10px 18px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: 13.5,
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <span>➕</span> Add Funds to Wallet
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/gst/api-docs')}
                        className="nav-action-btn"
                        style={{
                          minHeight: 42,
                          padding: '10px 16px',
                          borderRadius: 10,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#334155',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer'
                        }}
                      >
                        📖 View API Docs
                      </button>
                    </div>
                  </div>

                  {/* Included Services & Endpoints */}
                  <div
                    style={{
                      borderRadius: 14,
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      padding: '20px'
                    }}
                  >
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                      🚀 Included Features &amp; Supported APIs
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                        <span><b>Instant GSTIN Taxpayer Lookup</b> (Legal &amp; Trade Name Profile)</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                        <span><b>Official State &amp; Center Jurisdiction</b> with Constitution of Business</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                        <span><b>GSTR-1 &amp; GSTR-3B Return Filing History</b> (Real-Time Compliance Matrix)</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                        <span><b>Aadhaar Authentication &amp; e-Invoice Verification</b></span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: '#10b981', fontWeight: 900 }}>✓</span>
                        <span><b>Standard Developer API</b> (<code>/api/v1/gst/verify</code>) with JSON payload</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* COMPACT 3D PRICING CARDS GRID FOR WHATSAPP, SMS & PLAN API */
            <div 
              className="pricing-cards-grid mb-4" 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 275px))', 
                gap: 16, 
                width: '100%' 
              }}
            >
              {displayedPlans.map((plan, idx) => {
                const activePlanName = getActivePlanNameForService().toLowerCase()
                const isCurrent = activePlanName.includes(plan.name?.toLowerCase()) || (plan.name && activePlanName === plan.name.toLowerCase())
                const isPopular = plan.isPopular || plan.badgeText?.toLowerCase().includes('popular') || plan.badgeText?.toLowerCase().includes('recommended')
                const features = getPlanFeatures(plan)

                return (
                  <div
                    key={plan.planId || idx}
                    style={{
                      borderRadius: 16,
                      background: '#ffffff',
                      border: isPopular ? `2px solid ${activeServiceConfig.color}` : '1px solid #e2e8f0',
                      borderTop: `4px solid ${activeServiceConfig.color}`,
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: isPopular 
                        ? `0 10px 28px ${activeServiceConfig.color}25` 
                        : '0 4px 14px rgba(0,0,0,0.05)',
                      transition: 'all 0.22s ease',
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
                          background: isPopular ? activeServiceConfig.color : '#f1f5f9',
                          color: isPopular ? '#ffffff' : '#475569',
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

                    <div style={{ padding: '16px 16px 10px', flexGrow: 1 }}>
                      {/* Card Header: Service Icon + Plan Name */}
                      <div className="d-flex align-items-center" style={{ gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 16 }}>{activeServiceConfig.icon}</span>
                        <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                          {plan.name}
                        </h3>
                      </div>

                      <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', minHeight: 28, lineHeight: 1.35 }}>
                        {plan.description || `${activeServiceConfig.label} Subscription Plan`}
                      </p>

                      {/* Price Box */}
                      <div
                        style={{
                          background: activeServiceConfig.softBg,
                          border: `1px solid ${activeServiceConfig.color}25`,
                          padding: '8px 12px',
                          borderRadius: 8,
                          marginBottom: 12,
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 22, fontWeight: 900, color: activeServiceConfig.color }}>
                            ₹{plan.price}
                          </span>
                          <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 4, fontWeight: 600 }}>
                            {plan.isUnlimitedValidity ? '/ Lifetime' : `/ ${plan.validity || `${plan.validityDays} Days`}`}
                          </span>
                        </div>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: activeServiceConfig.color }}>
                          Active SLA
                        </span>
                      </div>

                      {/* Features List */}
                      <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: 8 }}>
                          Included Features:
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.4 }}>
                          {features.map((f, fIdx) => (
                            <li key={fIdx} className="d-flex align-items-center" style={{ gap: 6, marginBottom: 5 }}>
                              <span
                                style={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: '50%',
                                  background: `${activeServiceConfig.color}18`,
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
                              <span style={{ color: '#1e293b', fontWeight: 500 }}>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Card Action Button (Footer) */}
                    <div style={{ padding: '0 16px 16px', background: 'transparent' }}>
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
                            fontSize: 12.5,
                            cursor: 'default'
                          }}
                        >
                          ✓ Current Active Plan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenPurchase({ ...plan, service: selectedService })}
                          className="buy-plan-btn"
                          style={{
                            width: '100%',
                            height: 40,
                            borderRadius: 10,
                            border: 'none',
                            background: `linear-gradient(135deg, ${activeServiceConfig.color}, #059669)`,
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: `0 4px 14px ${activeServiceConfig.color}35`,
                            transition: 'all 0.18s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          <span>⚡</span> Buy {plan.name}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        /* MY PURCHASE REQUESTS TAB */
        <div style={{ borderRadius: 14, background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
            <div>
              <h5 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
                📋 My Orders &amp; Daybook History
              </h5>
              <small style={{ color: '#64748b', fontSize: 12 }}>
                Track all your plan subscriptions, wallet top-ups, and payment statuses.
              </small>
            </div>
          </div>

          <div style={{ padding: 0 }}>
            {myRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>💳</div>
                <h4 style={{ color: '#0f172a', fontSize: 17, fontWeight: 700 }}>आपने अभी तक कोई पेमेंट रिक्वेस्ट नहीं भेजी है</h4>
                <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
                  You haven't submitted any plan purchase or wallet top-up requests yet.
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
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Service</th>
                      <th style={{ fontWeight: 800, color: '#475569', fontSize: 12, padding: '12px 16px' }}>Requested Plan / Item</th>
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
                          {(() => {
                            const s = String(req.service || (req.requestType === 'wallet_topup' ? 'wallet' : 'whatsapp')).toLowerCase()
                            if (s === 'sms') return <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>📱 SMS</span>
                            if (s === 'plan') return <span className="badge" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>⚡ Plan API</span>
                            if (s === 'gst') return <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>🏛️ GST</span>
                            if (s === 'wallet' || req.requestType === 'wallet_topup') return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>👛 Wallet Top-up</span>
                            return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>💬 WhatsApp</span>
                          })()}
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

      {/* PAYMENT DETAILS POPUP MODAL */}
      {selectedPlan && (
        <PaymentDetailsModal 
          plan={selectedPlan}
          walletBalance={walletBalance}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handlePurchaseSuccess}
          notify={notify}
          onOpenAddFunds={() => {
            setSelectedPlan(null)
            setShowAddFunds(true)
          }}
        />
      )}

      {/* ADD FUNDS / TOP-UP WALLET MODAL */}
      {showAddFunds && (
        <AddFundsModal
          onClose={() => setShowAddFunds(false)}
          onSuccess={() => {
            fetchPlansData()
            setActiveTab('requests')
          }}
          notify={notify}
        />
      )}
    </section>
  )
}
