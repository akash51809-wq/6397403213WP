import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function Sidebar() {
  const {
    currentUser,
    isAdmin,
    status,
    stats,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    companySettings
  } = useAuth()

  const location = useLocation()
  const isReportsActive = location.pathname.startsWith('/report') || location.pathname === '/msg-report'
  const isSmsActive = location.pathname.startsWith('/sms') || location.pathname.startsWith('/services/mobile-sms')
  const isPlanApiActive = location.pathname.startsWith('/plans') || location.pathname.startsWith('/services/plan-api') || location.pathname === '/plan-api'
  const isGstActive = location.pathname.startsWith('/gst') || location.pathname.startsWith('/services/gst')
  const closeMobile = () => setSidebarOpen(false)

  const isConnected = status?.status === 'connected'

  const [smsStats, setSmsStats] = useState({ activeDevicesCount: 0, totalSms: 0 })
  const [planStats, setPlanStats] = useState({ remainingHits: 100 })

  useEffect(() => {
    if (!isSmsActive) return
    let mounted = true
    const fetchSmsStatus = async () => {
      try {
        const res = await fetch('/api/sms/status')
        const data = await res.json()
        if (mounted && data.success) {
          setSmsStats(data.data)
        }
      } catch (e) {}
    }
    fetchSmsStatus()
    const timer = setInterval(fetchSmsStatus, 15000)
    return () => { mounted = false; clearInterval(timer) }
  }, [isSmsActive])

  useEffect(() => {
    if (!isPlanApiActive) return
    let mounted = true
    const fetchPlanStatus = async () => {
      try {
        const res = await fetch('/api/plans/user/stats')
        const data = await res.json()
        if (mounted && data.success && data.stats) {
          setPlanStats(data.stats)
        }
      } catch (e) {}
    }
    fetchPlanStatus()
    const timer = setInterval(fetchPlanStatus, 20000)
    return () => { mounted = false; clearInterval(timer) }
  }, [isPlanApiActive])

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      {/* Collapse Toggle Button */}
      <button 
        type="button" 
        className="sidebar-collapse-btn" 
        onClick={toggleSidebarCollapsed} 
        title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label="Toggle sidebar collapse"
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      {/* Brand Header - Logo Only */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '12px 14px', boxSizing: 'border-box', overflow: 'hidden' }}>
        <NavLink 
          to={isSmsActive ? "/sms/dashboard" : isPlanApiActive ? "/plans/dashboard" : isGstActive ? "/gst/dashboard" : "/dashboard"} 
          onClick={closeMobile} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}
          title={companySettings?.companyName || "Easy Recharge Solution"}
        >
          <img
            src={companySettings?.logoUrl || "/logo.png"}
            alt={companySettings?.companyName || "Logo"}
            onError={(e) => {
              if (e.target.src !== '/logo.png') {
                e.target.src = '/logo.png'
              }
            }}
            style={{ 
              maxHeight: 44, 
              maxWidth: '100%', 
              objectFit: 'contain', 
              display: 'block', 
              margin: '0 auto' 
            }}
          />
        </NavLink>
        <button 
          type="button" 
          className="mobile-close-btn" 
          onClick={closeMobile} 
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          ×
        </button>
      </div>

      {/* Navigation */}
      <nav className="nav">
        {isSmsActive ? (
          /* =========================================================
             MOBILE SMS GATEWAY NAVIGATION (6 FOCUSED MENUS)
             ========================================================= */
          <>
            <NavLink 
              to="/sms/dashboard" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="SMS Dashboard"
            >
              <span>⌂</span><b>Dashboard</b>
            </NavLink>

            <NavLink 
              to="/sms/devices" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Connected Devices"
            >
              <span>📱</span><b>Connected Devices</b>
              {smsStats?.activeDevicesCount > 0 && (
                <span 
                  className="side-badge" 
                  style={{ 
                    marginLeft: 'auto', 
                    background: '#0284c7', 
                    color: '#fff', 
                    padding: '2px 8px', 
                    borderRadius: 10, 
                    fontSize: 10,
                    fontWeight: 800
                  }}
                >
                  {smsStats.activeDevicesCount}
                </span>
              )}
            </NavLink>

            <NavLink 
              to="/sms/send" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Send SMS"
            >
              <span>↗</span><b>Send SMS</b>
            </NavLink>

            <NavLink 
              to="/sms/inbox" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="SMS Inbox"
            >
              <span>📥</span><b>SMS Inbox</b>
            </NavLink>

            <NavLink 
              to="/sms/webhook" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Webhook Settings"
            >
              <span>⚡</span><b>Webhook Settings</b>
            </NavLink>

            <NavLink 
              to="/sms/reports" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Send Msg Report"
            >
              <span>▥</span><b>Send Msg Report</b>
            </NavLink>

            <NavLink 
              to="/sms/api-docs" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="SMS API Docs"
            >
              <span>🔑</span><b>SMS API Docs</b>
            </NavLink>
          </>
        ) : isPlanApiActive ? (
          /* =========================================================
             PLAN API NAVIGATION (8 FOCUSED MENUS)
             ========================================================= */
          <>
            <NavLink 
              to="/plans/dashboard" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Plan API Dashboard"
            >
              <span>⌂</span><b>Dashboard</b>
            </NavLink>

            <NavLink 
              to="/plans/lookup" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Operator Lookup"
            >
              <span>🔍</span><b>Operator Lookup</b>
            </NavLink>

            <NavLink 
              to="/plans/api-docs" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Plan API Docs"
            >
              <span>🔑</span><b>API Documents</b>
            </NavLink>
          </>
        ) : isGstActive ? (
          /* =========================================================
             GST PORTAL NAVIGATION (3 FOCUSED USER MENUS)
             ========================================================= */
          <>
            <NavLink 
              to="/gst/dashboard" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="GST Dashboard"
            >
              <span>⌂</span><b>Dashboard</b>
            </NavLink>

            <NavLink 
              to="/gst/search" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Taxpayer Search"
            >
              <span>🔍</span><b>Taxpayer Search</b>
            </NavLink>

            <NavLink 
              to="/gst/api-docs" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="GST API Docs"
            >
              <span>🔑</span><b>GST API Docs</b>
            </NavLink>
          </>
        ) : (
          /* =========================================================
             WHATSAPP & ADMIN NAVIGATION
             ========================================================= */
          <>
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Dashboard"
            >
              <span>⌂</span><b>Dashboard</b>
            </NavLink>

            <NavLink 
              to="/device" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="WhatsApp Device"
            >
              <span>▣</span><b>WhatsApp Device</b>
            </NavLink>

            <NavLink 
              to="/send" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Send message"
            >
              <span>↗</span><b>Send message</b>
            </NavLink>

            <NavLink 
              to="/incoming" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Inbox"
            >
              <span>▤</span><b>Inbox</b>
            </NavLink>

            <NavLink 
              to="/groups" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Group"
            >
              <span>▦</span><b>Group</b>
            </NavLink>

            {/* Direct Msg Report Nav Item */}
            <NavLink 
              to="/report" 
              className={({ isActive }) => (isActive || isReportsActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Msg Report"
            >
              <span>▥</span><b>Msg Report</b>
            </NavLink>

            <NavLink 
              to="/templates" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Templates"
            >
              <span>▧</span><b>Templates</b>
            </NavLink>

            <NavLink 
              to="/contacts" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Contacts"
            >
              <span>♙</span><b>Contacts</b>
            </NavLink>

            <NavLink 
              to="/settings" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="Settings"
            >
              <span>⚙</span><b>Settings</b>
            </NavLink>

            <NavLink 
              to="/api" 
              className={({ isActive }) => (isActive ? 'active' : '')} 
              onClick={closeMobile}
              data-title="API Docs"
            >
              <span>⌘</span><b>API Docs</b>
            </NavLink>

            {isAdmin && (
              <>
                <div className="nav-section-title">
                  <span>ADMINISTRATION</span>
                  <hr className="nav-section-divider" />
                </div>
                <NavLink 
                  to="/admin/users" 
                  className={({ isActive }) => (isActive ? 'active' : '')} 
                  onClick={closeMobile}
                  data-title="User Management"
                >
                  <span>👥</span><b>User Management</b>
                </NavLink>
                <NavLink 
                  to="/admin/plans" 
                  className={({ isActive }) => (isActive ? 'active' : '')} 
                  onClick={closeMobile}
                  data-title="Plan Management"
                >
                  <span>🏷️</span><b>Plan Management</b>
                </NavLink>
                <NavLink 
                  to="/payment/daybook" 
                  className={({ isActive }) => (isActive ? 'active' : '')} 
                  onClick={closeMobile}
                  data-title="Purchase Requests"
                >
                  <span>💳</span><b>Purchase Requests</b>
                </NavLink>
              </>
            )}
          </>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
