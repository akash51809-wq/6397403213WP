import React, { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const pageMeta = {
  '/': { title: 'Dashboard', eyebrow: 'WHATSAPP AUTOMATION' },
  '/dashboard': { title: 'Dashboard', eyebrow: 'WHATSAPP AUTOMATION' },
  '/device': { title: 'Device', eyebrow: 'WHATSAPP SESSIONS' },
  '/send': { title: 'Send message', eyebrow: 'DIRECT & BULK MESSAGING' },
  '/groups': { title: 'Group', eyebrow: 'WHATSAPP GROUPS' },
  '/incoming': { title: 'Inbox', eyebrow: 'CONVERSATIONS' },
  '/chat': { title: 'Inbox', eyebrow: 'CONVERSATIONS' },
  '/report': { title: 'Msg Report', eyebrow: 'REPORTS' },
  '/reports': { title: 'Msg Report', eyebrow: 'REPORTS' },
  '/campaigns': { title: 'Campaigns', eyebrow: 'CAMPAIGN CENTER' },
  '/templates': { title: 'Templates', eyebrow: 'MESSAGE LIBRARY' },
  '/contacts': { title: 'Contacts', eyebrow: 'CONTACT MANAGEMENT' },
  '/plans': { title: 'Plans', eyebrow: 'PLANS' },
  '/subscription': { title: 'Plans', eyebrow: 'PLANS' },
  '/api': { title: 'API Docs', eyebrow: 'DEVELOPER' },
  '/api-docs': { title: 'API Docs', eyebrow: 'DEVELOPER' },
  '/settings': { title: 'Settings', eyebrow: 'SETTINGS' },
  '/admin/settings': { title: 'Settings', eyebrow: 'SUPER ADMIN' },
  '/admin': { title: 'Dashboard', eyebrow: 'SUPER ADMIN' },
  '/admin/users': { title: 'User Management', eyebrow: 'SUPER ADMIN' },
  '/admin/user-management': { title: 'User Management', eyebrow: 'SUPER ADMIN' },
  '/users': { title: 'User Management', eyebrow: 'SUPER ADMIN' },
  '/admin/plans': { title: 'Plan Management', eyebrow: 'SUPER ADMIN' },
  '/payment/daybook': { title: 'Purchase Requests', eyebrow: 'SUPER ADMIN' },
  '/sms': { title: 'SMS Dashboard', eyebrow: 'MOBILE SMS GATEWAY' },
  '/sms/dashboard': { title: 'SMS Dashboard', eyebrow: 'MOBILE SMS GATEWAY' },
  '/sms/devices': { title: 'Connected Devices', eyebrow: 'ANDROID GATEWAY' },
  '/sms/send': { title: 'Send SMS', eyebrow: 'OUTBOX & CAMPAIGN' },
  '/sms/inbox': { title: 'SMS Inbox', eyebrow: 'INCOMING MESSAGES' },
  '/sms/webhook': { title: 'Webhook Settings', eyebrow: 'API INTEGRATION' },
  '/sms/reports': { title: 'Delivery Reports', eyebrow: 'DELIVERY LOGS' },
  '/services/mobile-sms': { title: 'Mobile SMS', eyebrow: 'SMS GATEWAY' },
  '/mobile-sms': { title: 'Mobile SMS', eyebrow: 'SMS GATEWAY' },
  '/plans': { title: 'Plan API Dashboard', eyebrow: 'TELECOM ENGINE' },
  '/plans/dashboard': { title: 'Plan API Dashboard', eyebrow: 'TELECOM ENGINE' },
  '/plans/lookup': { title: 'Operator Lookup', eyebrow: 'SERIES ENGINE' },
  '/plans/browse': { title: 'Browse Plans', eyebrow: 'TARIFF & OFFERS' },
  '/plans/roffer': { title: 'R-Offer Check', eyebrow: 'BEST OFFERS' },
  '/plans/dth': { title: 'DTH Customer Info', eyebrow: 'DTH VERIFICATION' },
  '/plans/recharge-status': { title: 'Last Recharge Status', eyebrow: 'RECHARGE HISTORY' },
  '/plans/api-docs': { title: 'Plan API Docs', eyebrow: 'DEVELOPER API' },
  '/plans/pricing': { title: 'Buy API Hits', eyebrow: 'PRICING & HITS' },
  '/services/plan-api': { title: 'Plan API', eyebrow: 'RECHARGE & PLANS' },
  '/plan-api': { title: 'Plan API', eyebrow: 'RECHARGE & PLANS' },
  '/gst': { title: 'GST Dashboard', eyebrow: 'GST PORTAL' },
  '/gst/dashboard': { title: 'GST Dashboard', eyebrow: 'GST PORTAL' },
  '/gst/search': { title: 'Taxpayer Search', eyebrow: 'GSTIN LOOKUP' },
  '/gst/filings': { title: 'Return Filings', eyebrow: 'GSTR-1 & GSTR-3B' },
  '/gst/api-docs': { title: 'GST API Docs', eyebrow: 'DEVELOPER API' },
  '/services/gst-api': { title: 'GST Portal', eyebrow: 'TAX & VERIFICATION' },
  '/gst-api': { title: 'GST Portal', eyebrow: 'TAX & VERIFICATION' }
}

const servicesList = [
  { id: 'whatsapp', name: 'WhatsApp', path: '/dashboard', icon: '💬', badge: 'Active', desc: 'WhatsApp Automation' },
  { id: 'mobile-sms', name: 'Mobile SMS', path: '/sms/dashboard', icon: '📱', badge: 'New', desc: 'SMS & OTP Service' },
  { id: 'plan-api', name: 'Plan API', path: '/plans/dashboard', icon: '⚡', badge: 'New', desc: 'Recharge & Plans' },
  { id: 'gst', name: 'GST', path: '/gst/dashboard', icon: '🏛️', badge: 'New', desc: 'Taxpayer & Return Filings' }
]

export function Navbar() {
  const {
    currentUser,
    isAdmin,
    status,
    loadStatus,
    loadQr,
    notify,
    logout,
    sidebarOpen,
    setSidebarOpen,
    planInfo
  } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()
  const meta = pageMeta[location.pathname] || { title: 'Dashboard', eyebrow: 'WHATSAPP AUTOMATION' }

  const [serviceMenuOpen, setServiceMenuOpen] = useState(false)
  const serviceMenuRef = useRef(null)

  const isSmsActive = location.pathname.startsWith('/sms') || location.pathname.startsWith('/services/mobile-sms')
  const isPlanApiActive = location.pathname.startsWith('/plans') || location.pathname.startsWith('/services/plan-api') || location.pathname === '/plan-api'
  const isGstActive = location.pathname.startsWith('/gst') || location.pathname.startsWith('/services/gst')

  // Determine active service from current route
  let activeService = servicesList[0] // Default WhatsApp
  if (isSmsActive) {
    activeService = servicesList[1]
  } else if (isPlanApiActive) {
    activeService = servicesList[2]
  } else if (isGstActive) {
    activeService = servicesList[3]
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (serviceMenuRef.current && !serviceMenuRef.current.contains(event.target)) {
        setServiceMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const username = currentUser?.name || currentUser?.username || (isAdmin ? 'Admin' : 'User')
  const displayMobile = currentUser?.mobile || currentUser?.username || username
  const roleLabel = isAdmin ? 'Super Admin' : (currentUser?.plan || 'Standard Plan')
  const displayPlan = planInfo?.planName || currentUser?.plan || roleLabel
  const initials = (currentUser?.name || currentUser?.username || (isAdmin ? 'AD' : 'WA')).replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() || (isAdmin ? 'AD' : 'WA')

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button 
          type="button"
          className="icon-btn mobile-menu-btn" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle mobile menu"
        >
          ☰
        </button>
        <div className="topbar-title">
          <small>{meta.eyebrow}</small>
          <strong>{meta.title}</strong>
        </div>
      </div>

      <div className="top-actions">
        {/* Service Switcher Dropdown (WhatsApp, Mobile SMS, Plan API, GST API) */}
        <div className="service-dropdown-wrapper" ref={serviceMenuRef}>
          <button
            type="button"
            className={`service-select-btn ${isSmsActive ? 'service-sms-btn' : ''} ${isGstActive ? 'service-gst-btn' : ''}`}
            onClick={() => setServiceMenuOpen(!serviceMenuOpen)}
            title="Switch Service"
            aria-expanded={serviceMenuOpen}
            aria-haspopup="true"
          >
            <span className="service-btn-icon">{activeService.icon}</span>
            <div className="service-btn-text">
              <small>ACTIVE SERVICE</small>
              <strong>{activeService.name}</strong>
            </div>
            <span className={`service-chevron ${serviceMenuOpen ? 'open' : ''}`}>▾</span>
          </button>

          {serviceMenuOpen && (
            <div className="service-dropdown-menu">
              <div className="service-dropdown-header">
                <span>SELECT SERVICE</span>
                <small>4 Services</small>
              </div>
              <div className="service-dropdown-list">
                {servicesList.map(item => {
                  const isSelected = activeService.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`service-menu-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setServiceMenuOpen(false)
                        navigate(item.path)
                      }}
                    >
                      <span className="service-item-icon">{item.icon}</span>
                      <div className="service-item-info">
                        <div className="service-item-name">
                          <strong>{item.name}</strong>
                          <span className={`service-tag ${item.badge.toLowerCase()}`}>{item.badge}</span>
                        </div>
                        <small>{item.desc}</small>
                      </div>
                      {isSelected && <span className="service-check">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Card (Shows Mobile / Username & Plan) */}
        <div 
          className="user" 
          title={`Logged in as ${username}${currentUser?.mobile ? ` (${currentUser.mobile})` : ''} - Plan: ${displayPlan}`}
          onClick={() => navigate(isAdmin ? '/admin/settings' : '/settings')}
          style={{ cursor: 'pointer' }}
        >
          {status?.profilePicUrl ? (
            <img 
              src={status.profilePicUrl} 
              alt="Avatar" 
              className="avatar" 
              style={{ objectFit: 'cover', borderRadius: '50%', width: 34, height: 34, border: '2px solid #10b981' }} 
            />
          ) : (
            <span className="avatar">{initials}</span>
          )}
          <div>
            <strong>{displayMobile}</strong>
            <small>{displayPlan}</small>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          type="button"
          className="icon-btn" 
          title="Logout" 
          onClick={() => {
            if (window.confirm('क्या आप लॉगआउट करना चाहते हैं?')) {
              logout()
            }
          }}
          style={{ color: '#e85b63' }}
          aria-label="Logout"
        >
          ⇥
        </button>
      </div>
    </header>
  )
}

export default Navbar
