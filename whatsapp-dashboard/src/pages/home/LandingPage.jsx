import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../styles/landing.css'

export default function LandingPage() {
  const { login, currentUser, companySettings, loadCompanySettings } = useAuth()
  const isLoggedIn = Boolean(login)
  const navigate = useNavigate()

  const [activeServiceTab, setActiveServiceTab] = useState('whatsapp')
  const [selectedLang, setSelectedLang] = useState('curl')
  const [copiedCode, setCopiedCode] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (loadCompanySettings) {
      loadCompanySettings()
    }
  }, [loadCompanySettings])

  // Dynamic Company Details from Admin Settings
  const companyName = companySettings?.companyName || 'Easy Recharge Solution'
  const logoUrl = companySettings?.logoUrl || '/logo.png'
  const contactPhone = companySettings?.contactPhone || '+91 8840457632'
  const contactWhatsApp = companySettings?.contactWhatsApp || '8840457632'
  const contactEmail = companySettings?.contactEmail || 'support@easyrechargesolution.com'
  const contactAddress = companySettings?.contactAddress || 'Lucknow, Uttar Pradesh, India'
  const heroTitle = companySettings?.heroTitle || 'One Powerful Portal. 4 Mission-Critical Services.'
  const heroSubtitle = companySettings?.heroSubtitle || 'Scale WhatsApp automation, route high-speed Mobile SMS via Android SIMs, query live Telecom Recharge Plans, and verify GSTIN Taxpayers in milliseconds.'
  const heroBadge = companySettings?.heroBadge || '⭐ RATED 4.9/5 BY 12,000+ INDIAN BUSINESSES & DEVELOPERS'
  const footerAbout = companySettings?.footerAbout || 'Easy Recharge Solution is India\'s trusted developer-first cloud platform offering unified WhatsApp automation, Android SMS gateway, Telecom Plan intelligence, and GST compliance verification.'

  const cleanWhatsApp = contactWhatsApp.replace(/\D/g, '')

  // 4 Core Services Definitions
  const servicesData = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Automation',
      badge: 'POPULAR',
      color: '#10b981',
      bgLight: '#ecfdf5',
      icon: '💬',
      title: 'WhatsApp Automation & Cloud Bot API',
      desc: 'Connect multi-device WhatsApp sessions, automate customer inquiries with AI auto-replies, and dispatch bulk alerts without per-message API fees.',
      features: [
        'Multi-Device QR Code Scanning (Zero Waiting)',
        'Bulk Broadcast Campaigns & Scheduled Messages',
        'Smart Group Messaging & Contact Book Manager',
        'Developer REST API with Webhook Delivery Receipts'
      ],
      ctaText: 'Explore WhatsApp →',
      ctaLink: currentUser ? '/dashboard' : '/signup'
    },
    {
      id: 'sms',
      name: 'Mobile SMS Gateway',
      badge: 'ZERO PER-SMS COST',
      color: '#0284c7',
      bgLight: '#f0f9ff',
      icon: '📱',
      title: 'Android Gateway App & High-Speed OTP',
      desc: 'Pair any Android phone using the ERS SMS Gateway APK. Route OTPs and transaction alerts through your phone SIMs with zero telecom broker costs.',
      features: [
        'Free ERS SMS Gateway Android App (Direct APK)',
        'Route High-Speed OTPs via SIM 1 or SIM 2',
        'Real-Time Incoming SMS Inbox & Webhooks',
        'Save ₹10,000+ Monthly on DLT Telecom Charters'
      ],
      ctaText: 'Download Android APK →',
      ctaLink: '/sms/dashboard'
    },
    {
      id: 'plan',
      name: 'Telecom Plan API',
      badge: '99.9% ACCURACY',
      color: '#ea580c',
      bgLight: '#fff7ed',
      icon: '⚡',
      title: 'Telecom Recharge & R-Offer Engine',
      desc: 'Instant operator and circle detection by 10-digit mobile number. Real-time customized R-Offers for Airtel, Jio, VI, BSNL, and DTH customer accounts.',
      features: [
        'Ultra-Fast Operator & Circle Detection (20ms)',
        'Live Segmented R-Offers for Jio, Airtel & VI',
        'DTH Customer Account Verification & Balance',
        'High-Throughput REST API with 99.99% Uptime'
      ],
      ctaText: 'Test Plan API →',
      ctaLink: '/plans/dashboard'
    },
    {
      id: 'gst',
      name: 'GST Verification',
      badge: 'PAY-PER-HIT',
      color: '#7c3aed',
      bgLight: '#faf5ff',
      icon: '🏛️',
      title: 'Instant GSTIN Taxpayer Verification API',
      desc: 'Verify business credentials, active registration status, taxpayer trade names, and GSTR filing compliance with direct debit from your platform wallet.',
      features: [
        'Live GSTIN Verification & Legal Trade Name Fetch',
        'Instant GSTR-1 & GSTR-3B Filing Compliance Check',
        'Pay-Per-Hit Wallet Model (Zero Monthly Retainers)',
        'Seamless B2B Onboarding & Verification API'
      ],
      ctaText: 'Verify GSTIN →',
      ctaLink: '/gst/dashboard'
    }
  ]

  // Code Snippets for Developer Sandbox
  const codeSnippets = {
    whatsapp: {
      curl: `curl -X POST "${window.location.origin}/api/message/send" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "+919876543210",
    "message": "Hello! Your payment was received successfully."
  }'`,
      node: `const axios = require('axios');

async function sendWhatsApp() {
  const res = await axios.post('${window.location.origin}/api/message/send', {
    number: '+919876543210',
    message: 'Hello! Your payment was received successfully.'
  }, {
    headers: { 'Authorization': 'Bearer YOUR_API_TOKEN' }
  });
  console.log(res.data);
}`,
      python: `import requests

url = "${window.location.origin}/api/message/send"
headers = {"Authorization": "Bearer YOUR_API_TOKEN"}
payload = {
    "number": "+919876543210",
    "message": "Hello! Your payment was received successfully."
}
response = requests.post(url, json=payload, headers=headers)
print(response.json())`
    },
    sms: {
      curl: `curl -X POST "${window.location.origin}/api/sms/send" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient": "9876543210",
    "message": "Your verification OTP is 492018.",
    "simSlot": 0
  }'`,
      node: `const axios = require('axios');

async function sendSmsOtp() {
  const res = await axios.post('${window.location.origin}/api/sms/send', {
    recipient: '9876543210',
    message: 'Your verification OTP is 492018.',
    simSlot: 0
  }, {
    headers: { 'Authorization': 'Bearer YOUR_API_TOKEN' }
  });
  console.log(res.data);
}`,
      python: `import requests

url = "${window.location.origin}/api/sms/send"
headers = {"Authorization": "Bearer YOUR_API_TOKEN"}
payload = {
    "recipient": "9876543210",
    "message": "Your verification OTP is 492018.",
    "simSlot": 0
}
response = requests.post(url, json=payload, headers=headers)
print(response.json())`
    },
    plan: {
      curl: `curl -X GET "${window.location.origin}/api/Mobile/OperatorFetchNew?Mobileno=9840123456&ApiUserID=YOUR_MOBILE&token=YOUR_TOKEN"`,
      node: `const axios = require('axios');

async function fetchOperator() {
  const res = await axios.get('${window.location.origin}/api/Mobile/OperatorFetchNew', {
    params: { Mobileno: '9840123456', ApiUserID: 'YOUR_MOBILE', token: 'YOUR_TOKEN' }
  });
  console.log(res.data);
}`,
      python: `import requests

url = "${window.location.origin}/api/Mobile/OperatorFetchNew"
params = {"Mobileno": "9840123456", "ApiUserID": "YOUR_MOBILE", "token": "YOUR_TOKEN"}
response = requests.get(url, params=params)
print(response.json())`
    },
    gst: {
      curl: `curl -X POST "${window.location.origin}/api/gst/search" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{ "gstin": "09AKPPG5665E1ZU" }'`,
      node: `const axios = require('axios');

async function verifyGstin() {
  const res = await axios.post('${window.location.origin}/api/gst/search', {
    gstin: '09AKPPG5665E1ZU'
  }, {
    headers: { 'Authorization': 'Bearer YOUR_API_TOKEN' }
  });
  console.log(res.data);
}`,
      python: `import requests

url = "${window.location.origin}/api/gst/search"
headers = {"Authorization": "Bearer YOUR_API_TOKEN"}
response = requests.post(url, json={"gstin": "09AKPPG5665E1ZU"}, headers=headers)
print(response.json())`
    }
  }

  const handleCopyCode = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  // FAQ Items
  const faqList = [
    {
      q: 'How does the Mobile SMS Gateway work without per-SMS charges?',
      a: 'You install our lightweight Android Gateway App (ERS SMS) on any Android mobile phone. The app connects securely via encrypted WebSockets to your portal. All OTPs and SMS messages are dispatched directly through your physical phone SIM cards (which typically come with unlimited SMS packs from Jio or Airtel), completely eliminating telecom third-party SMS aggregator fees!'
    },
    {
      q: 'Can I use WhatsApp, SMS, Plan API, and GST from a single wallet balance?',
      a: 'Yes, absolutely! Easy Recharge Solution features a single unified wallet. You add funds once, and you can purchase WhatsApp subscriptions, send SMS, query live Telecom recharge plans, and pay for GST lookups on a pay-per-hit model directly from your available balance.'
    },
    {
      q: 'Do you offer a free demo or trial validity upon signup?',
      a: 'Yes! Every new user who registers with their WhatsApp number receives automatic trial validity (configured by admin) so you can test live QR scanning, message sending, and API lookups immediately.'
    },
    {
      q: 'How fast is the Telecom Operator Lookup and Plan API?',
      a: 'Our Plan API engine operates at ultra-low latency (~20ms response time). It connects directly to live operator series data to instantly detect circle and operator for Airtel, Jio, VI, BSNL, and provides active R-Offers.'
    },
    {
      q: 'Is my data secure and isolated from other users?',
      a: 'Yes. We utilize a multi-tenant PostgreSQL architecture where each user’s WhatsApp sessions, contacts, groups, and message logs are cryptographically isolated. Admins and other users cannot access your private chats or credentials.'
    }
  ]

  const activeServiceObj = servicesData.find(s => s.id === activeServiceTab) || servicesData[0]
  const currentSnippet = codeSnippets[activeServiceTab]?.[selectedLang] || codeSnippets.whatsapp.curl

  return (
    <div className="landing-page-root">
      {/* ── 1. TOP NAVBAR ── */}
      <header className="lp-navbar">
        <div className="lp-navbar-container">
          <Link to="/" className="lp-brand-link">
            <img 
              src={logoUrl} 
              alt={companyName} 
              className="lp-brand-logo" 
              onError={(e) => {
                if (e.target.src !== '/logo.png') e.target.src = '/logo.png'
              }}
            />
            <span className="lp-brand-text">{companyName}</span>
          </Link>

          <nav className="lp-nav-links">
            <a href="#services" className="lp-nav-link">
              Services <span className="lp-nav-badge">4-in-1</span>
            </a>
            <a href="#how-it-works" className="lp-nav-link">How It Works</a>
            <a href="#developer" className="lp-nav-link">API Docs</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
            <a href="#contact" className="lp-nav-link">Contact</a>
          </nav>

          <div className="lp-nav-actions">
            {contactWhatsApp && (
              <a 
                href={`https://wa.me/91${cleanWhatsApp}?text=Hello%20${encodeURIComponent(companyName)}%2C%20I%20am%20interested%20in%20your%20services.`} 
                target="_blank" 
                rel="noreferrer"
                className="lp-btn-login"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}
              >
                <span>💬 WhatsApp</span>
              </a>
            )}

            {isLoggedIn ? (
              <button 
                type="button" 
                className="lp-btn-primary"
                onClick={() => navigate('/dashboard')}
              >
                <span>Go to Dashboard 🚀</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="lp-btn-login">Sign in</Link>
                <Link to="/signup" className="lp-btn-primary">
                  <span>Get Started Free ⚡</span>
                </Link>
              </>
            )}

            <button 
              type="button" 
              className="lp-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <a href="#services" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Services (4-in-1)</a>
            <a href="#how-it-works" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#developer" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Developer API</a>
            <a href="#pricing" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#faq" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            <a href="#contact" className="lp-nav-link" onClick={() => setMobileMenuOpen(false)}>Contact Support</a>
            <div style={{ display: 'flex', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
              <Link to="/login" className="lp-btn-login" style={{ flex: 1, textAlign: 'center' }}>Sign in</Link>
              <Link to="/signup" className="lp-btn-primary" style={{ flex: 1, textAlign: 'center' }}>Sign up</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION (Big Hero with Curved Bottom Transition) ── */}
      <section className="lp-hero-wrapper">
        <div className="lp-hero-orb-1" />
        <div className="lp-hero-orb-2" />

        <div className="lp-hero-container">
          {/* Left Hero Content */}
          <div>
            <div className="lp-hero-badge">
              <span>{heroBadge}</span>
            </div>

            <h1 className="lp-hero-title">
              {heroTitle.split('. ')[0]}.<br />
              <span className="lp-hero-title-highlight">{heroTitle.split('. ')[1] || 'Unified in One Portal.'}</span>
            </h1>

            <p className="lp-hero-desc">
              {heroSubtitle}
            </p>

            <div className="lp-hero-cta-group">
              <Link to={isLoggedIn ? "/dashboard" : "/signup"} className="lp-btn-yellow">
                <span>Start Free Trial 🚀</span>
              </Link>
              <a href="#services" className="lp-btn-hero-secondary">
                <span>Explore 4 Services ▾</span>
              </a>
              <Link to="/api" className="lp-btn-hero-secondary" style={{ background: 'transparent' }}>
                <span>API Docs 🔑</span>
              </Link>
            </div>

            {/* Live Stats Row */}
            <div className="lp-hero-stats-row">
              <div className="lp-hero-stat-item">
                <div className="lp-hero-stat-number">10M<span>+</span></div>
                <div className="lp-hero-stat-label">Messages Delivered</div>
              </div>
              <div className="lp-hero-stat-item">
                <div className="lp-hero-stat-number">99.9<span>%</span></div>
                <div className="lp-hero-stat-label">SLA Server Uptime</div>
              </div>
              <div className="lp-hero-stat-item">
                <div className="lp-hero-stat-number">50K<span>+</span></div>
                <div className="lp-hero-stat-label">Daily API Hits</div>
              </div>
              <div className="lp-hero-stat-item">
                <div className="lp-hero-stat-number">4<span>in</span>1</div>
                <div className="lp-hero-stat-label">Unified Services</div>
              </div>
            </div>
          </div>

          {/* Right Hero 3D Interactive Console Showcase */}
          <div className="lp-hero-visual">
            <div className="lp-floating-badge badge-top">
              <span style={{ fontSize: 18 }}>⚡</span>
              <div>
                <span style={{ color: '#0369a1', display: 'block' }}>Ultra-Fast Processing</span>
                <small style={{ color: '#64748b' }}>0.05s Instant API Response</small>
              </div>
            </div>

            <div className="lp-floating-badge badge-bottom">
              <span style={{ fontSize: 18 }}>🛡️</span>
              <div>
                <span style={{ color: '#15803d', display: 'block' }}>Bank-Grade Security</span>
                <small style={{ color: '#64748b' }}>256-bit Session Encryption</small>
              </div>
            </div>

            <div className="lp-3d-console">
              <div className="lp-console-header">
                <div className="lp-console-dots">
                  <div className="lp-console-dot red" />
                  <div className="lp-console-dot yellow" />
                  <div className="lp-console-dot green" />
                </div>
                <div className="lp-console-status">
                  <span>●</span> 4 Services Active &amp; Online
                </div>
              </div>

              <div className="lp-console-grid">
                {/* WhatsApp Status */}
                <div className="lp-console-row">
                  <div className="lp-console-left">
                    <div className="lp-console-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>💬</div>
                    <div className="lp-console-text">
                      <strong>WhatsApp Automation</strong>
                      <small>Session Active · 48,290 Sent</small>
                    </div>
                  </div>
                  <span className="lp-console-badge" style={{ background: '#dcfce7', color: '#15803d' }}>
                    99.8% Delivered
                  </span>
                </div>

                {/* Mobile SMS Gateway */}
                <div className="lp-console-row">
                  <div className="lp-console-left">
                    <div className="lp-console-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>📱</div>
                    <div className="lp-console-text">
                      <strong>ERS Android SMS Gateway</strong>
                      <small>SIM 1 (Jio) &amp; SIM 2 (Airtel) Online</small>
                    </div>
                  </div>
                  <span className="lp-console-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    0% Broker Fee
                  </span>
                </div>

                {/* Plan API Engine */}
                <div className="lp-console-row">
                  <div className="lp-console-left">
                    <div className="lp-console-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>⚡</div>
                    <div className="lp-console-text">
                      <strong>Telecom Plan API Engine</strong>
                      <small>Operator &amp; Circle Detection</small>
                    </div>
                  </div>
                  <span className="lp-console-badge" style={{ background: '#ffedd5', color: '#c2410c' }}>
                    20ms Latency
                  </span>
                </div>

                {/* GST Verification */}
                <div className="lp-console-row">
                  <div className="lp-console-left">
                    <div className="lp-console-icon" style={{ background: '#f3e8ff', color: '#7c3aed' }}>🏛️</div>
                    <div className="lp-console-text">
                      <strong>GSTIN Taxpayer Search</strong>
                      <small>Instant Trade Name &amp; Filing Check</small>
                    </div>
                  </div>
                  <span className="lp-console-badge" style={{ background: '#f3e8ff', color: '#6d28d9' }}>
                    Wallet Pay-Per-Hit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Curved Wave Cutout Transition to White Body */}
        <div className="lp-hero-curved-cutout">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path 
              d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,120 L0,120 Z" 
              className="shape-fill"
            />
          </svg>
        </div>
      </section>

      {/* ── 3. 4 CORE SERVICES 3D GRID ── */}
      <section id="services" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-section-pill">✦ MULTI-SERVICE PLATFORM</div>
            <h2 className="lp-section-title">
              Why Manage 4 Vendors When You Can Have One?
            </h2>
            <p className="lp-section-desc">
              Unify your messaging, mobile SMS, recharge telecom intelligence, and business tax verification under a single balance and single developer token.
            </p>
          </div>

          <div className="lp-services-grid">
            {servicesData.map(service => (
              <div 
                key={service.id} 
                className="lp-service-card"
                style={{ '--service-color': service.color }}
              >
                <div 
                  className="lp-service-icon-box"
                  style={{ background: service.bgLight, color: service.color }}
                >
                  {service.icon}
                </div>
                <h3>{service.name}</h3>
                <p>{service.desc}</p>
                <ul className="lp-service-feature-list">
                  {service.features.map((feat, i) => (
                    <li key={i} className="lp-service-feature-item">
                      <span className="lp-service-check">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link to={service.ctaLink} className="lp-service-btn">
                  <span>{service.ctaText}</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 3 SIMPLE STEPS TO GET STARTED (From Image 1 Layout) ── */}
      <section id="how-it-works" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-section-pill">⚡ EFFORTLESS ONBOARDING</div>
            <h2 className="lp-section-title">
              Follow These 3 Simple Steps to Get Started
            </h2>
            <p className="lp-section-desc">
              Go live in under 2 minutes. No complicated contracts or hardware requirements.
            </p>
          </div>

          <div className="lp-steps-grid">
            <div className="lp-step-card">
              <div className="lp-step-number">01</div>
              <h3>Create Free Account</h3>
              <p>
                Sign up with your WhatsApp mobile number in seconds. Your account instantly activates with a complimentary demo trial pack to test all platform features.
              </p>
            </div>

            <div className="lp-step-card">
              <div className="lp-step-number">02</div>
              <h3>Connect Device or API</h3>
              <p>
                Scan the QR code to pair your WhatsApp Web session or download our Android Gateway APK to route SMS through your physical phone SIM cards.
              </p>
            </div>

            <div className="lp-step-card">
              <div className="lp-step-number">03</div>
              <h3>Automate, Broadcast &amp; Scale</h3>
              <p>
                Dispatch scheduled alerts, query live recharge plans, and verify GSTIN records with 99.9% uptime backed by 24/7 Render Keep-Alive infrastructure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. INTERACTIVE LIVE FEATURE & DEVELOPER SHOWCASE ── */}
      <section id="developer" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-section-pill">🔑 DEVELOPER FIRST</div>
            <h2 className="lp-section-title">
              Built by Developers, for Developers &amp; Businesses
            </h2>
            <p className="lp-section-desc">
              Plug robust APIs into your CRM, ERP, billing software, or mobile apps in just 5 lines of code.
            </p>
          </div>

          <div className="lp-interactive-showcase">
            {/* Service Switcher Tabs */}
            <div className="lp-tabs-bar">
              {servicesData.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`lp-tab-btn ${activeServiceTab === s.id ? 'active' : ''}`}
                  onClick={() => setActiveServiceTab(s.id)}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </button>
              ))}
            </div>

            <div className="lp-tab-content">
              {/* Left Column: Feature Details */}
              <div>
                <span 
                  style={{ 
                    display: 'inline-block', 
                    padding: '4px 12px', 
                    borderRadius: 20, 
                    fontSize: 12, 
                    fontWeight: 800, 
                    background: activeServiceObj.bgLight, 
                    color: activeServiceObj.color,
                    marginBottom: 12 
                  }}
                >
                  {activeServiceObj.badge}
                </span>
                <h3 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 14px', color: '#0f172a' }}>
                  {activeServiceObj.title}
                </h3>
                <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
                  {activeServiceObj.desc}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {activeServiceObj.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: '#334155' }}>
                      <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Link to={activeServiceObj.ctaLink} className="lp-btn-primary">
                    <span>Try {activeServiceObj.name} Now →</span>
                  </Link>
                  <Link to="/api" className="lp-btn-login">
                    <span>Full API Specs</span>
                  </Link>
                </div>
              </div>

              {/* Right Column: Code Terminal */}
              <div className="lp-code-terminal">
                <div className="lp-terminal-bar">
                  <div className="lp-terminal-dots">
                    <div className="lp-console-dot red" />
                    <div className="lp-console-dot yellow" />
                    <div className="lp-console-dot green" />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['curl', 'node', 'python'].map(lang => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setSelectedLang(lang)}
                        style={{
                          background: selectedLang === lang ? '#334155' : 'transparent',
                          color: selectedLang === lang ? '#38bdf8' : '#94a3b8',
                          border: 'none',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          textTransform: 'uppercase'
                        }}
                      >
                        {lang === 'node' ? 'Node.js' : lang}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(currentSnippet)}
                    style={{
                      background: 'transparent',
                      color: copiedCode ? '#4ade80' : '#94a3b8',
                      border: '1px solid #334155',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedCode ? '✓ Copied' : '⧉ Copy'}
                  </button>
                </div>

                <pre className="lp-terminal-pre">
                  <code>{currentSnippet}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. PRICING & SUBSCRIPTION SECTION ── */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-section-pill">💰 TRANSPARENT PRICING</div>
            <h2 className="lp-section-title">
              Affordable Plans for Every Business Scale
            </h2>
            <p className="lp-section-desc">
              No hidden fees, no per-message broker markups. Choose the service you need or combine all four.
            </p>
          </div>

          <div className="lp-pricing-grid">
            {/* WhatsApp Plan Card */}
            <div className="lp-price-card">
              <h3 className="lp-price-plan-name">💬 WhatsApp Automation</h3>
              <p className="lp-price-plan-desc">For customer chat, broadcast alerts &amp; group bots</p>
              <div className="lp-price-amount-box">
                <span className="lp-price-amount">₹99</span>
                <span className="lp-price-period">/ Starting month</span>
              </div>
              <ul className="lp-price-features">
                <li className="lp-price-feature"><span>✓</span> 1 Scanned Phone Session</li>
                <li className="lp-price-feature"><span>✓</span> 500 Daily Messages Quota</li>
                <li className="lp-price-feature"><span>✓</span> Group Broadcasts &amp; Contacts</li>
                <li className="lp-price-feature"><span>✓</span> Full REST API &amp; Webhooks</li>
              </ul>
              <Link to="/subscription?service=whatsapp" className="lp-btn-primary" style={{ textAlign: 'center', justifyContent: 'center' }}>
                <span>Select WhatsApp Plan</span>
              </Link>
            </div>

            {/* Mobile SMS Plan Card */}
            <div className="lp-price-card featured">
              <div className="lp-price-badge-popular">MOST POPULAR</div>
              <h3 className="lp-price-plan-name">📱 Mobile SMS Gateway</h3>
              <p className="lp-price-plan-desc">Route high-speed OTPs via your Android SIMs</p>
              <div className="lp-price-amount-box">
                <span className="lp-price-amount">₹199</span>
                <span className="lp-price-period">/ Starting month</span>
              </div>
              <ul className="lp-price-features">
                <li className="lp-price-feature"><span>✓</span> Unlimited Free SMS via SIM Cards</li>
                <li className="lp-price-feature"><span>✓</span> ERS SMS Gateway Android APK</li>
                <li className="lp-price-feature"><span>✓</span> Dual-SIM Routing (Slot 1 &amp; Slot 2)</li>
                <li className="lp-price-feature"><span>✓</span> Inbound SMS Webhook Callback</li>
              </ul>
              <Link to="/subscription?service=sms" className="lp-btn-yellow" style={{ textAlign: 'center', justifyContent: 'center' }}>
                <span>Get SMS Gateway 🚀</span>
              </Link>
            </div>

            {/* Plan API Card */}
            <div className="lp-price-card">
              <h3 className="lp-price-plan-name">⚡ Telecom Plan API</h3>
              <p className="lp-price-plan-desc">Operator detection, R-Offers &amp; DTH lookup</p>
              <div className="lp-price-amount-box">
                <span className="lp-price-amount">₹499</span>
                <span className="lp-price-period">/ 10,000 Hits</span>
              </div>
              <ul className="lp-price-features">
                <li className="lp-price-feature"><span>✓</span> 10,000 API Hits Balance</li>
                <li className="lp-price-feature"><span>✓</span> All Circles &amp; Operators (Jio/Airtel/VI)</li>
                <li className="lp-price-feature"><span>✓</span> Real-Time R-Offer Custom Tariff</li>
                <li className="lp-price-feature"><span>✓</span> 20ms High-Throughput SLA</li>
              </ul>
              <Link to="/subscription?service=plan" className="lp-btn-primary" style={{ textAlign: 'center', justifyContent: 'center' }}>
                <span>Get Plan API Quota</span>
              </Link>
            </div>

            {/* GST Verification Card */}
            <div className="lp-price-card">
              <h3 className="lp-price-plan-name">🏛️ GST Verification</h3>
              <p className="lp-price-plan-desc">Instant taxpayer legal profile &amp; filing check</p>
              <div className="lp-price-amount-box">
                <span className="lp-price-amount">₹1.00</span>
                <span className="lp-price-period">/ Per Search Hit</span>
              </div>
              <ul className="lp-price-features">
                <li className="lp-price-feature"><span>✓</span> Pay-Per-Hit Direct Wallet Debit</li>
                <li className="lp-price-feature"><span>✓</span> Complete Legal Name &amp; Address</li>
                <li className="lp-price-feature"><span>✓</span> GSTR-1 &amp; GSTR-3B Filing History</li>
                <li className="lp-price-feature"><span>✓</span> Zero Minimum Monthly Commitment</li>
              </ul>
              <Link to="/subscription" className="lp-btn-primary" style={{ textAlign: 'center', justifyContent: 'center' }}>
                <span>Top-up Wallet for GST</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FREQUENTLY ASKED QUESTIONS (Accordion) ── */}
      <section id="faq" className="lp-section">
        <div className="lp-container" style={{ maxWidth: 860 }}>
          <div className="lp-section-header">
            <div className="lp-section-pill">❓ COMMON INQUIRIES</div>
            <h2 className="lp-section-title">Frequently Asked Questions</h2>
            <p className="lp-section-desc">
              Have questions about pairing, APIs, or billing? We have answers.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {faqList.map((item, idx) => {
              const isOpen = openFaq === idx
              return (
                <div 
                  key={idx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    background: '#ffffff',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 10px 25px -5px rgba(2, 132, 199, 0.08)' : 'none'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '18px 22px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 16,
                      fontWeight: 800,
                      color: isOpen ? '#0284c7' : '#0f172a'
                    }}
                  >
                    <span>{item.q}</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#64748b', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }}>
                      +
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 22px 20px', color: '#475569', fontSize: 14, lineHeight: 1.65 }}>
                      {item.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 8. CALL TO ACTION BANNER (3D Glowing Gradient) ── */}
      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-container">
          <div className="lp-cta-banner">
            <div className="lp-cta-content">
              <h2>Ready to Supercharge Your Business Communications?</h2>
              <p>
                Join thousands of businesses who use {companyName} to power WhatsApp automation, SMS gateways, and developer APIs with 99.9% uptime.
              </p>
            </div>
            <div className="lp-cta-actions">
              <Link to={isLoggedIn ? "/dashboard" : "/signup"} className="lp-btn-yellow">
                <span>Create Free Account 🚀</span>
              </Link>
              {contactWhatsApp && (
                <a 
                  href={`https://wa.me/91${cleanWhatsApp}?text=Hello%20${encodeURIComponent(companyName)}%2C%20I%20want%20to%20get%20started.`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="lp-btn-hero-secondary"
                >
                  <span>Chat with Sales on WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. DYNAMIC FOOTER (Admin Controlled) ── */}
      <footer id="contact" className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-grid">
            {/* Brand Col */}
            <div className="lp-footer-brand">
              <h4>{companyName}</h4>
              <p>{footerAbout}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#cbd5e1' }}>
                <div>📞 <strong>Phone:</strong> {contactPhone}</div>
                <div>💬 <strong>WhatsApp:</strong> +91 {contactWhatsApp}</div>
                <div>✉️ <strong>Email:</strong> {contactEmail}</div>
                <div>📍 <strong>Address:</strong> {contactAddress}</div>
              </div>
            </div>

            {/* Quick Services */}
            <div className="lp-footer-col">
              <h5>Core Services</h5>
              <ul className="lp-footer-links">
                <li><Link to="/dashboard">WhatsApp Automation</Link></li>
                <li><Link to="/sms/dashboard">Mobile SMS Gateway</Link></li>
                <li><Link to="/plans/dashboard">Telecom Plan API</Link></li>
                <li><Link to="/gst/dashboard">GSTIN Taxpayer Search</Link></li>
                <li><Link to="/subscription">Subscription Plans</Link></li>
              </ul>
            </div>

            {/* Developer Resources */}
            <div className="lp-footer-col">
              <h5>Developer Tools</h5>
              <ul className="lp-footer-links">
                <li><Link to="/api">WhatsApp REST API</Link></li>
                <li><Link to="/sms/api-docs">Mobile SMS API Docs</Link></li>
                <li><Link to="/plans/api-docs">Telecom Plan API Docs</Link></li>
                <li><Link to="/gst/api-docs">GST Verification API</Link></li>
                <li><Link to="/sms/webhook">Webhook Integrations</Link></li>
              </ul>
            </div>

            {/* Portal & Support */}
            <div className="lp-footer-col">
              <h5>Account &amp; Portal</h5>
              <ul className="lp-footer-links">
                <li><Link to="/login">Client Portal Sign in</Link></li>
                <li><Link to="/signup">Create Free Account</Link></li>
                <li><Link to="/subscription">Top-up Wallet</Link></li>
                <li>
                  <a 
                    href={`https://wa.me/91${cleanWhatsApp}?text=Help%20Needed%20with%20${encodeURIComponent(companyName)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    24/7 WhatsApp Support
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <div>
              © 2026 {companyName}. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Security &amp; Encryption</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ── 10. FLOATING WHATSAPP CHAT BUTTON ── */}
      {contactWhatsApp && (
        <a 
          href={`https://wa.me/91${cleanWhatsApp}?text=Hello%20${encodeURIComponent(companyName)}%2C%20I%20have%20an%20inquiry%20regarding%20your%20services.`}
          target="_blank"
          rel="noreferrer"
          className="lp-floating-wa-btn"
          title="Chat with us on WhatsApp"
        >
          💬
        </a>
      )}
    </div>
  )
}
