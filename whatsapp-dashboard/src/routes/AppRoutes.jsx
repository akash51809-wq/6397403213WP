import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'

// Page Components
import LandingPage from '../pages/home/LandingPage'
import LoginPage from '../pages/auth/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import DevicePage from '../pages/device/DevicePage'
import SendPage from '../pages/send/SendPage'
import GroupsPage from '../pages/groups/GroupsPage'
import IncomingPage from '../pages/incoming/IncomingPage'
import ReportsPage from '../pages/reports/ReportsPage'
import UsersPage from '../pages/admin/UsersPage'
import AdminPlansPage from '../pages/admin/AdminPlansPage'
import AdminPlanRequestsPage from '../pages/admin/AdminPlanRequestsPage'
import UserPlansPage from '../pages/subscription/UserPlansPage'
import ApiPage from '../pages/api/ApiPage'
import SettingsPage from '../pages/admin/SettingsPage'
import TemplatesPage from '../pages/templates/TemplatesPage'
import ContactsPage from '../pages/contacts/ContactsPage'

// SMS Gateway Pages
import SmsDashboardPage from '../pages/sms/SmsDashboardPage'
import SmsDevicesPage from '../pages/sms/SmsDevicesPage'
import SmsSendPage from '../pages/sms/SmsSendPage'
import SmsInboxPage from '../pages/sms/SmsInboxPage'
import SmsWebhookPage from '../pages/sms/SmsWebhookPage'
import SmsReportsPage from '../pages/sms/SmsReportsPage'
import SmsApiDocsPage from '../pages/sms/SmsApiDocsPage'

// GST Verification Pages
import GstDashboardPage from '../pages/gst/GstDashboardPage'
import GstSearchPage from '../pages/gst/GstSearchPage'
import GstApiDocsPage from '../pages/gst/GstApiDocsPage'

function ProtectedRoute({ children }) {
  const { login } = useAuth()
  if (!login) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function PublicOnlyRoute({ children }) {
  const { login } = useAuth()
  if (login) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function RootRedirect() {
  const { login } = useAuth()
  return login ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing & Marketing */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<LandingPage />} />

      {/* Public Login Route */}
      <Route 
        path="/login" 
        element={
          <PublicOnlyRoute>
            <LoginPage initialMode="login" />
          </PublicOnlyRoute>
        } 
      />
      <Route 
        path="/signup" 
        element={
          <PublicOnlyRoute>
            <LoginPage initialMode="signup" />
          </PublicOnlyRoute>
        } 
      />

      {/* Main Shell (Protected) */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="device" element={<DevicePage />} />
        <Route path="send" element={<SendPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="incoming" element={<IncomingPage />} />
        <Route path="inbox" element={<Navigate to="/incoming" replace />} />
        <Route path="chat" element={<Navigate to="/incoming" replace />} />
        
        {/* Reports */}
        <Route path="report" element={<ReportsPage />} />
        <Route path="reports" element={<Navigate to="/report" replace />} />
        <Route path="msg-report" element={<Navigate to="/report" replace />} />

        {/* Campaigns & Templates & Contacts */}
        <Route path="campaigns" element={<Navigate to="/dashboard" replace />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="contacts" element={<ContactsPage />} />

        {/* User Pricing & Subscription */}
        <Route path="subscription" element={<UserPlansPage />} />

        {/* Mobile SMS Gateway Routes */}
        <Route path="sms" element={<Navigate to="/sms/dashboard" replace />} />
        <Route path="sms/dashboard" element={<SmsDashboardPage />} />
        <Route path="sms/devices" element={<SmsDevicesPage />} />
        <Route path="sms/send" element={<SmsSendPage />} />
        <Route path="sms/inbox" element={<SmsInboxPage />} />
        <Route path="sms/webhook" element={<SmsWebhookPage />} />
        <Route path="sms/reports" element={<SmsReportsPage />} />
        <Route path="sms/api-docs" element={<SmsApiDocsPage />} />
        <Route path="sms/api" element={<Navigate to="/sms/api-docs" replace />} />
        <Route path="sms-api" element={<Navigate to="/sms/api-docs" replace />} />

        {/* Additional Service Hub Dashboards */}
        <Route path="services/mobile-sms" element={<Navigate to="/sms/dashboard" replace />} />
        <Route path="mobile-sms" element={<Navigate to="/sms/dashboard" replace />} />

        {/* Legacy Plan API Route Redirects */}
        <Route path="plans" element={<Navigate to="/dashboard" replace />} />
        <Route path="plans/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="services/plan-api" element={<Navigate to="/dashboard" replace />} />
        <Route path="plan-api" element={<Navigate to="/dashboard" replace />} />

        {/* GST Portal Routes */}
        <Route path="gst" element={<Navigate to="/gst/dashboard" replace />} />
        <Route path="gst/dashboard" element={<GstDashboardPage />} />
        <Route path="gst/search" element={<GstSearchPage />} />
        <Route path="gst/filings" element={<Navigate to="/gst/dashboard" replace />} />
        <Route path="gst/api-docs" element={<GstApiDocsPage />} />

        <Route path="services/gst" element={<Navigate to="/gst/dashboard" replace />} />
        <Route path="services/gst-api" element={<Navigate to="/gst/dashboard" replace />} />
        <Route path="gst-api" element={<Navigate to="/gst/dashboard" replace />} />

        {/* Admin Routes - /admin is Dashboard, /admin/users is User Management */}
        <Route 
          path="admin" 
          element={
            <AdminRoute>
              <DashboardPage />
            </AdminRoute>
          } 
        />
        <Route 
          path="admin/users" 
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          } 
        />
        <Route path="admin/user-management" element={<Navigate to="/admin/users" replace />} />
        <Route path="user" element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<Navigate to="/admin/users" replace />} />
        
        <Route 
          path="admin/plans" 
          element={
            <AdminRoute>
              <AdminPlansPage />
            </AdminRoute>
          } 
        />

        <Route 
          path="payment/daybook" 
          element={
            <AdminRoute>
              <AdminPlanRequestsPage />
            </AdminRoute>
          } 
        />
        <Route path="admin/plan-requests" element={<Navigate to="/payment/daybook" replace />} />
        <Route path="admin/purchases" element={<Navigate to="/payment/daybook" replace />} />

        {/* API & System & Settings */}
        <Route path="api" element={<ApiPage />} />
        <Route path="system" element={<SettingsPage defaultTab="security" />} />
        <Route path="settings" element={<SettingsPage defaultTab="api" />} />
        <Route 
          path="admin/settings" 
          element={
            <AdminRoute>
              <SettingsPage defaultTab="api" />
            </AdminRoute>
          } 
        />

        {/* Default fallback inside layout */}
        <Route path="*" element={<RootRedirect />} />
      </Route>

      {/* Global Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
