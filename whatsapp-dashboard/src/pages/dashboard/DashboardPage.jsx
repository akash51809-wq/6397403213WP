import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import '../../styles/dashboard.css'

export function DashboardPage() {
  const {
    status,
    stats,
    reports = [],
    loadReports,
    currentUser,
    isAdmin,
    planInfo
  } = useAuth()

  const navigate = useNavigate()
  const [dashStats, setDashStats] = useState({
    devices: { connected: 0, allowed: 1 },
    messagesToday: 0,
    totalGroups: 0,
    savedContacts: 0,
    scheduledMessages: 0,
    monthlyActivity: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  })

  useEffect(() => {
    if (loadReports) loadReports()
  }, [loadReports])

  useEffect(() => {
    let mounted = true
    const fetchDashStats = async () => {
      try {
        const data = await api('/api/dashboard/stats')
        if (mounted && data.success) {
          setDashStats(data)
        }
      } catch (e) {}
    }
    fetchDashStats()
    const timer = setInterval(fetchDashStats, 10000)
    return () => { mounted = false; clearInterval(timer) }
  }, [])

  // Dynamic greeting based on time of day
  const getGreeting = () => {
    const hours = new Date().getHours()
    if (hours < 12) return 'Good morning'
    if (hours < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatExpiry = (isoString) => {
    if (!isoString) return '30 Sep 2026'
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    } catch {
      return '30 Sep 2026'
    }
  }

  const username = currentUser?.username || 'Prince'
  const isConnected = status?.status === 'connected'
  const currentPlan = isAdmin ? 'Super Admin' : (planInfo?.planName || currentUser?.plan || 'Demo Plan')
  const daysLeft = planInfo?.daysLeft !== undefined ? planInfo.daysLeft : null
  const isPlanExpired = !isAdmin && Boolean(planInfo?.isExpired || (daysLeft !== null && daysLeft <= 0))
  const validityDate = isAdmin 
    ? 'Lifetime' 
    : (isPlanExpired 
        ? 'Plan Expired' 
        : (daysLeft !== null ? `${formatExpiry(planInfo?.expiresAt || currentUser?.planExpiresAt)} (${daysLeft} Days Left)` : formatExpiry(planInfo?.expiresAt || currentUser?.planExpiresAt)))

  // Recent messages for table
  const recentList = (reports && reports.length > 0)
    ? reports.slice(0, 5).map((r, idx) => ({
        id: idx + 1,
        service: r.source || 'WhatsApp Message',
        serviceColor: r.source === 'Campaign' ? 'orange' : (r.source === 'Inbox' ? 'blue' : 'green'),
        mobile: r.to ? (r.to.startsWith('+') ? r.to : `+91 ${r.to}`) : '+91 98765 43210',
        message: r.text || r.message || 'Message sent successfully',
        status: (r.status === 'delivered' || r.status === 'sent' || r.status === 'Success') ? 'Success' : (r.status === 'failed' ? 'Failed' : 'Pending'),
        badgeClass: (r.status === 'delivered' || r.status === 'sent' || r.status === 'Success') ? 'success' : (r.status === 'failed' ? 'failed' : 'pending'),
        date: r.date ? new Date(r.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '10 Sep 2026, 10:30 AM'
      }))
    : [
        {
          id: 1,
          service: 'WhatsApp Message',
          serviceColor: 'green',
          mobile: '+91 98765 43210',
          message: 'Order confirmation sent',
          status: 'Success',
          badgeClass: 'success',
          date: '09 Sep 2026, 10:30 AM'
        },
        {
          id: 2,
          service: 'Campaign',
          serviceColor: 'orange',
          mobile: '+91 98123 45678',
          message: 'Offer message delivered',
          status: 'Success',
          badgeClass: 'success',
          date: '09 Sep 2026, 10:20 AM'
        },
        {
          id: 3,
          service: 'Inbox',
          serviceColor: 'blue',
          mobile: '+91 98765 43210',
          message: 'Hello, is my order ready?',
          status: 'Pending',
          badgeClass: 'pending',
          date: '09 Sep 2026, 10:15 AM'
        },
        {
          id: 4,
          service: 'WhatsApp Message',
          serviceColor: 'pink',
          mobile: '+91 87654 32109',
          message: 'Payment received',
          status: 'Success',
          badgeClass: 'success',
          date: '09 Sep 2026, 10:10 AM'
        }
      ]

  return (
    <div className="content dashboard-page">
      
      {/* 1. Hero Banner */}
      <section 
        className="dashboard-hero"
        style={{
          height: 'auto',
          minHeight: 'auto',
          padding: '12px 20px',
          marginBottom: '10px'
        }}
      >
        <div className="hero-copy">
          <span className="eyebrow">WHATSAPP AUTOMATION</span>
          <h1>
            <span>{getGreeting()}</span>, {username} 👋
          </h1>
          <p>Manage your WhatsApp workspace, messages and connected numbers from one place.</p>
        </div>

        {isAdmin ? (
          <div className="hero-whatsapp">
            <div className="whatsapp-3d-icon" aria-label="WhatsApp">
              <span>◔</span>
            </div>
          </div>
        ) : (
          <div className="hero-plan">
            <div 
              className="plan-summary" 
              onClick={() => navigate('/subscription')} 
              style={{ cursor: 'pointer' }}
              title="Click to view subscription plans and pricing"
            >
              <span className="plan-orb" style={{ background: isPlanExpired ? '#ef4444' : (currentPlan.toLowerCase().includes('demo') ? '#f59e0b' : '#3b82f6') }}>◆</span>
              <div className="plan-main">
                <span>CURRENT PLAN</span>
                <strong>{currentPlan}</strong>
              </div>
              <div className="plan-divider"></div>
              <div className="plan-main validity">
                <span>{isPlanExpired ? 'PLAN STATUS' : 'DUE VALIDITY'}</span>
                <strong style={{ color: isPlanExpired ? '#ef4444' : '#10b981' }}>
                  {isPlanExpired ? 'Expired (Buy Plan)' : (daysLeft !== null ? `${daysLeft} Days Left` : validityDate)}
                </strong>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Expired Demo / Plan Banner */}
      {!isAdmin && isPlanExpired && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <strong style={{ color: '#991b1b', fontSize: 15, display: 'block' }}>आपका Demo Plan समाप्त (Expired) हो चुका है!</strong>
              <span style={{ color: '#b91c1c', fontSize: 13 }}>WhatsApp Automation एवं API जारी रखने के लिए कृपया प्लान लिस्ट से नया प्लान खरीदें।</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => navigate('/subscription')}
            style={{
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            💎 Plan List देखें और खरीदें
          </button>
        </div>
      )}

      {/* 2. 5 3D Stat Cards (Live, Read from Database, No Links) */}
      <div className="grid4" style={{ marginTop: 10 }}>
        {/* Stat 1: Devices */}
        <article 
          className="stat stat-green" 
          style={{ cursor: 'default' }}
          title="Connected WhatsApp Devices"
        >
          <div className="stat-decoration deco-ring"></div>
          <div className="stat-icon stat-device">
            <span className="mini-device"></span>
          </div>
          <small>Devices</small>
          <strong>{dashStats.devices?.connected ?? (isConnected ? 1 : 0)} / {dashStats.devices?.allowed ?? (planInfo?.allowedDevices || 1)}</strong>
          <span>{(dashStats.devices?.connected > 0 || isConnected) ? 'Connected' : 'Scan Required'}</span>
        </article>

        {/* Stat 2: Messages Today */}
        <article className="stat stat-orange" style={{ cursor: 'default' }} title="Messages Processed Today">
          <div className="stat-decoration deco-orb orange"></div>
          <div className="stat-icon stat-message">
            <span className="mini-message">✓</span>
          </div>
          <small>Messages Today</small>
          <strong>{(dashStats.messagesToday || 0).toLocaleString('en-IN')}</strong>
          <span>Live Today</span>
        </article>

        {/* Stat 3: WhatsApp Groups */}
        <article className="stat stat-blue" style={{ cursor: 'default' }} title="Total WhatsApp Groups Across Active Sessions">
          <div className="stat-decoration deco-cube blue"></div>
          <div className="stat-icon stat-send">
            <span className="mini-plane">▦</span>
          </div>
          <small>WhatsApp Groups</small>
          <strong>{(dashStats.totalGroups || 0).toLocaleString('en-IN')}</strong>
          <span>Active Sessions</span>
        </article>

        {/* Stat 4: Saved Contacts */}
        <article className="stat stat-pink" style={{ cursor: 'default' }} title="Total Saved Contacts In Address Book">
          <div className="stat-decoration deco-bubble pink"></div>
          <div className="stat-icon stat-delivered">
            <span className="mini-check">♙</span>
          </div>
          <small>Saved Contacts</small>
          <strong>{(dashStats.savedContacts || 0).toLocaleString('en-IN')}</strong>
          <span>Contacts Book</span>
        </article>

        {/* Stat 5: Scheduled Messages */}
        <article className="stat stat-yellow" style={{ cursor: 'default' }} title="Scheduled Messages Due In Queue">
          <div className="stat-decoration deco-star yellow">✦</div>
          <div className="stat-icon stat-users">
            <span className="mini-users">
              <i></i><i></i><i></i>
            </span>
          </div>
          <small>Scheduled Messages</small>
          <strong>{(dashStats.scheduledMessages || 0).toLocaleString('en-IN')}</strong>
          <span>{dashStats.scheduledMessages > 0 ? 'Due Pending' : 'No Dues'}</span>
        </article>
      </div>

      {/* 3. Dash Grid: Message Activity 12-Month Chart + Smart Shortcuts */}
      <div className="dash-grid">
        {/* Message Activity Chart */}
        <article className="card">
          <div className="card-head">
            <div>
              <h3>Message Activity</h3>
              <p>Monthly overview across all 12 months (Database Live)</p>
            </div>
          </div>
          <div className="chart-area">
            <div className="bars" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 6, alignItems: 'flex-end', height: 160 }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((monthName, idx) => {
                const count = (dashStats.monthlyActivity && dashStats.monthlyActivity[idx]) || 0
                const maxVal = Math.max(...(dashStats.monthlyActivity || [10]), 10)
                const percent = Math.max(8, Math.round((count / maxVal) * 100))
                return (
                  <i 
                    key={monthName} 
                    style={{ height: `${percent}%`, transition: 'height 0.4s ease' }} 
                    title={`${monthName}: ${count} Messages`}
                  ></i>
                )
              })}
            </div>
            <div className="chart-labels" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', textAlign: 'center', marginTop: 8 }}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(monthName => (
                <span key={monthName} style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{monthName}</span>
              ))}
            </div>
          </div>
        </article>

        {/* Smart Shortcuts */}
        <article className="card">
          <div className="card-head">
            <div>
              <h3>Smart Shortcuts</h3>
              <p>Open your workspace instantly</p>
            </div>
          </div>
          <div className="shortcut-grid">
            <div 
              className="shortcut" 
              onClick={() => navigate('/send')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-send">
                <i>➤</i>
              </span>
              <b>Send Message</b>
            </div>

            <div 
              className="shortcut" 
              onClick={() => navigate('/contacts')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-contact">
                <i>♙</i>
              </span>
              <b>Contacts</b>
            </div>

            <div 
              className="shortcut" 
              onClick={() => navigate('/report')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-report">
                <i>▥</i>
              </span>
              <b>Reports</b>
            </div>

            <div 
              className="shortcut" 
              onClick={() => navigate('/settings')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-settings">
                <i>⚙</i>
              </span>
              <b>Settings</b>
            </div>

            <div 
              className="shortcut" 
              onClick={() => navigate('/api')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-ai">
                <i>✦</i>
              </span>
              <b>API Docs</b>
            </div>

            <div 
              className="shortcut" 
              onClick={() => navigate('/incoming')} 
              style={{ cursor: 'pointer' }}
            >
              <span className="shortcut-visual visual-campaign" style={{ background: 'rgba(234, 88, 12, 0.15)', color: '#ea580c' }}>
                <i>▤</i>
              </span>
              <b>Inbox</b>
            </div>
          </div>
        </article>
      </div>

      {/* 5. Recent Messages Table */}
      <article className="card table-card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <div>
            <h3>Recent Messages</h3>
            <p>Latest WhatsApp activity</p>
          </div>
          <button 
            type="button" 
            className="btn" 
            onClick={() => navigate('/report')}
          >
            View all
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Service</th>
                <th>Mobile</th>
                <th>Message</th>
                <th>Status</th>
                <th>Date &amp; Time</th>
              </tr>
            </thead>
            <tbody>
              {recentList.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>
                    <span className={`service-object ${row.serviceColor}`}></span>
                    {row.service}
                  </td>
                  <td>{row.mobile}</td>
                  <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.message}
                  </td>
                  <td>
                    <span className={`badge ${row.badgeClass}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

    </div>
  )
}

export default DashboardPage
