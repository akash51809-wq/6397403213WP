import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/layout/Layout'

// Page Components
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
import SystemPage from '../pages/system/SystemPage'
import SettingsPage from '../pages/admin/SettingsPage'
import CampaignsPage from '../pages/campaigns/CampaignsPage'
import TemplatesPage from '../pages/templates/TemplatesPage'
import ContactsPage from '../pages/contacts/ContactsPage'
import ServiceDashboardPage from '../pages/services/ServiceDashboardPage'

// SMS Gateway Pages
import SmsDashboardPage from '../pages/sms/SmsDashboardPage'
import SmsDevicesPage from '../pages/sms/SmsDevicesPage'
import SmsSendPage from '../pages/sms/SmsSendPage'
import SmsInboxPage from '../pages/sms/SmsInboxPage'
import SmsWebhookPage from '../pages/sms/SmsWebhookPage'
import SmsReportsPage from '../pages/sms/SmsReportsPage'

// Plan API Pages
import PlanDashboardPage from '../pages/plan/PlanDashboardPage'
import PlanLookupPage from '../pages/plan/PlanLookupPage'
import PlanBrowsePage from '../pages/plan/PlanBrowsePage'
import PlanRofferPage from '../pages/plan/PlanRofferPage'
import PlanDthPage from '../pages/plan/PlanDthPage'
import PlanRechargePage from '../pages/plan/PlanRechargePage'
import PlanApiDocsPage from '../pages/plan/PlanApiDocsPage'
import PlanPricingPage from '../pages/plan/PlanPricingPage'

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
  return <Navigate to="/dashboard" replace />
}

export default function AppRoutes() {
  return (
    <Routes>
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
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />
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
        <Route path="campaigns" element={<CampaignsPage />} />
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

        {/* Additional Service Hub Dashboards */}
        <Route path="services/mobile-sms" element={<Navigate to="/sms/dashboard" replace />} />
        <Route path="mobile-sms" element={<Navigate to="/sms/dashboard" replace />} />

        {/* Telecom Plan API Routes */}
        <Route path="plans" element={<Navigate to="/plans/dashboard" replace />} />
        <Route path="plans/dashboard" element={<PlanDashboardPage />} />
        <Route path="plans/lookup" element={<PlanLookupPage />} />
        <Route path="plans/browse" element={<PlanBrowsePage />} />
        <Route path="plans/roffer" element={<PlanRofferPage />} />
        <Route path="plans/dth" element={<PlanDthPage />} />
        <Route path="plans/recharge-status" element={<PlanRechargePage />} />
        <Route path="plans/api-docs" element={<PlanApiDocsPage />} />
        <Route path="plans/pricing" element={<PlanPricingPage />} />

        <Route path="services/plan-api" element={<Navigate to="/plans/dashboard" replace />} />
        <Route path="plan-api" element={<Navigate to="/plans/dashboard" replace />} />

        <Route path="services/gst-api" element={<ServiceDashboardPage service="gst-api" />} />
        <Route path="gst-api" element={<Navigate to="/services/gst-api" replace />} />

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
