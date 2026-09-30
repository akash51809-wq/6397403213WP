import React, { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Toast from '../common/Toast'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import EmailPromptModal from '../modals/EmailPromptModal'

export function Layout() {
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, toast, error, setError, companySettings } = useAuth()
  const location = useLocation()

  // Clear previous page errors on route transition so errors don't follow user across pages
  useEffect(() => {
    setError('')
  }, [location.pathname, setError])

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true" 
        />
      )}
      <Sidebar />
      <main className="main">
        <Navbar />
        <Toast toast={toast} error={error} onClearError={() => setError('')} />
        <EmailPromptModal />
        <Outlet />
        <footer className="footer">
          © 2026 {companySettings?.companyName || "WhatsApp Automation"} · All rights reserved.
        </footer>
      </main>
    </div>
  )
}

export default Layout
