import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import UserPlansPage from '../subscription/UserPlansPage'

const DEFAULT_PLAN_COLORS = [
  { name: 'Soft Blue', hex: '#4f75f2' },
  { name: 'Teal Green', hex: '#00b894' },
  { name: 'Zendash Purple', hex: '#705ec8' },
  { name: 'Warm Orange', hex: '#f77f00' },
  { name: 'Rose Pink', hex: '#e83e8c' },
  { name: 'Ocean Cyan', hex: '#00a8ff' },
]

const ADMIN_SERVICES = [
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#10b981', softBg: '#f0fdf4' },
  { id: 'sms', label: 'SMS Gateway', icon: '📱', color: '#0284c7', softBg: '#f0f9ff' },
  { id: 'plan', label: 'Plan API', icon: '⚡', color: '#ea580c', softBg: '#fff7ed' },
  { id: 'gst', label: 'GST Portal', icon: '🏛️', color: '#7c3aed', softBg: '#faf5ff' },
]

export default function AdminPlansPage({ notify: propNotify }) {
  const { notify: authNotify } = useAuth()
  const notify = propNotify || authNotify

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedService, setSelectedService] = useState('whatsapp')
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [gstPriceInput, setGstPriceInput] = useState('1.0')
  const [savingGstPrice, setSavingGstPrice] = useState(false)

  const emptyForm = {
    service: 'whatsapp',
    name: '',
    price: 99,
    currency: 'INR',
    description: '',
    dailyLimit: '500/Day',
    validity: '30 Days',
    validityDays: 30,
    deviceLimit: '1 Free + 1 Add-on',
    apiAccess: false,
    webAccess: true,
    bulkMsg: true,
    groupOption: false,
    scheduleMsg: false,
    ipSecurity: false,
    incomingAllowed: true,
    outgoingAllowed: true,
    hits: 10000,
    isUnlimitedValidity: false,
    pricePerHit: 1.0,
    headerColor: '#4f75f2',
    badgeText: '',
    active: true,
    sortOrder: 0
  }

  const [form, setForm] = useState(emptyForm)

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api('/api/admin/plans')
      if (d.success) {
        setPlans(d.plans || [])
        const gstPlan = (d.plans || []).find(p => (p.service || '').toLowerCase() === 'gst' && p.active)
        if (gstPlan) {
          setGstPriceInput(String(gstPlan.pricePerHit ?? gstPlan.price ?? 1.0))
        }
      }
    } catch (e) {
      notify('प्लान लोड करने में त्रुटि: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const handleSaveGstPrice = async () => {
    const val = Number(gstPriceInput)
    if (isNaN(val) || val < 0) {
      return notify('कृपया मान्य GST प्रति हिट शुल्क भरें।')
    }
    setSavingGstPrice(true)
    try {
      const res = await api('/api/admin/plans/gst-price', {
        method: 'POST',
        body: JSON.stringify({ pricePerHit: val })
      })
      if (res.success) {
        notify(res.message || `GST प्रति हिट शुल्क ₹${val} सफलतापूर्वक सेट कर दिया गया!`)
        fetchPlans()
      } else {
        notify(res.message || 'GST शुल्क अपडेट करने में त्रुटि')
      }
    } catch (err) {
      notify('GST Price Update Error: ' + err.message)
    } finally {
      setSavingGstPrice(false)
    }
  }

  const openCreateModal = () => {
    setEditingPlan(null)
    const serviceDefaultColors = {
      whatsapp: '#10b981',
      sms: '#0284c7',
      plan: '#ea580c',
      gst: '#7c3aed'
    }

    setForm({
      ...emptyForm,
      service: selectedService,
      headerColor: serviceDefaultColors[selectedService] || '#4f75f2',
      price: selectedService === 'gst' ? 1.0 : (selectedService === 'plan' ? 499 : (selectedService === 'sms' ? 199 : 99)),
      dailyLimit: selectedService === 'whatsapp' ? '500/Day' : '',
      hits: selectedService === 'plan' ? 10000 : 0,
      pricePerHit: selectedService === 'gst' ? 1.0 : 0,
      sortOrder: plans.filter(p => (p.service || 'whatsapp').toLowerCase() === selectedService).length + 1
    })
    setShowModal(true)
  }

  const openEditModal = (p) => {
    setEditingPlan(p)
    setForm({
      service: (p.service || 'whatsapp').toLowerCase(),
      name: p.name || '',
      price: p.price ?? 99,
      currency: p.currency || 'INR',
      description: p.description || '',
      dailyLimit: p.dailyLimit || '500/Day',
      validity: p.validity || '30 Days',
      validityDays: p.validityDays ?? 30,
      deviceLimit: p.deviceLimit || '1 Free + 1 Add-on',
      apiAccess: Boolean(p.apiAccess),
      webAccess: p.webAccess !== undefined ? Boolean(p.webAccess) : true,
      bulkMsg: Boolean(p.bulkMsg),
      groupOption: Boolean(p.groupOption),
      scheduleMsg: Boolean(p.scheduleMsg),
      ipSecurity: Boolean(p.ipSecurity),
      incomingAllowed: p.incomingAllowed !== undefined ? Boolean(p.incomingAllowed) : true,
      outgoingAllowed: p.outgoingAllowed !== undefined ? Boolean(p.outgoingAllowed) : true,
      hits: p.hits ?? 10000,
      isUnlimitedValidity: Boolean(p.isUnlimitedValidity),
      pricePerHit: p.pricePerHit ?? 1.0,
      headerColor: p.headerColor || '#4f75f2',
      badgeText: p.badgeText || '',
      active: p.active !== undefined ? Boolean(p.active) : true,
      sortOrder: p.sortOrder ?? 0
    })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      return notify('कृपया प्लान का नाम अवश्य भरें।')
    }

    setSaving(true)
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.planId}` : '/api/admin/plans'
      const method = editingPlan ? 'PUT' : 'POST'
      const payload = {
        ...form,
        service: form.service || selectedService,
        price: Number(form.price),
        validityDays: Number(form.validityDays) || 30,
        hits: Number(form.hits) || 0,
        pricePerHit: Number(form.pricePerHit) || 1.0,
        sortOrder: Number(form.sortOrder) || 0
      }

      const d = await api(url, {
        method,
        body: JSON.stringify(payload)
      })

      if (d.success) {
        notify(editingPlan ? 'Plan सफलतापूर्वक अपडेट किया गया!' : 'नया Plan सफलतापूर्वक बनाया गया!')
        setShowModal(false)
        fetchPlans()
      }
    } catch (e) {
      notify('Plan save error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const togglePlanActive = async (p) => {
    setActionLoading(p.planId)
    try {
      const newActive = !p.active
      const d = await api(`/api/admin/plans/${p.planId}`, {
        method: 'PUT',
        body: JSON.stringify({ active: newActive })
      })
      if (d.success) {
        notify(`Plan '${p.name}' ${newActive ? 'सक्रिय (Active)' : 'निष्क्रिय (Inactive)'} कर दिया गया।`)
        setPlans(prev => prev.map(item => item.planId === p.planId ? { ...item, active: newActive } : item))
      }
    } catch (e) {
      notify('Status update error: ' + e.message)
    } finally {
      setActionLoading('')
    }
  }

  const handleDeletePlan = async (p) => {
    if (!window.confirm(`क्या आप वाकई Plan '${p.name}' को हटाना चाहते हैं?`)) return
    setActionLoading(p.planId)
    try {
      const d = await api(`/api/admin/plans/${p.planId}`, { method: 'DELETE' })
      if (d.success) {
        notify(`Plan '${p.name}' हटा दिया गया है।`)
        setPlans(prev => prev.filter(item => item.planId !== p.planId))
      }
    } catch (e) {
      notify('Delete error: ' + e.message)
    } finally {
      setActionLoading('')
    }
  }

  const filteredPlans = useMemo(() => {
    return plans.filter(p => (p.service || 'whatsapp').toLowerCase() === selectedService)
  }, [plans, selectedService])

  const activeServiceObj = ADMIN_SERVICES.find(s => s.id === selectedService) || ADMIN_SERVICES[0]

  return (
    <section className="admin-plans-page">
      {/* Page Header */}
      <div className="page-header d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h1 className="page-title mb-1" style={{ fontSize: 24, fontWeight: 700, color: 'inherit' }}>
            🏷️ Plan Management
          </h1>
          <ol className="breadcrumb mb-0" style={{ background: 'transparent', padding: 0, fontSize: 13 }}>
            <li className="breadcrumb-item text-muted">Admin</li>
            <li className="breadcrumb-item active text-primary">Service Plans &amp; Subscriptions</li>
          </ol>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-md-0" style={{ gap: 10 }}>
          <button 
            type="button" 
            className="btn btn-outline-primary"
            onClick={() => setPreviewMode(!previewMode)}
            style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13 }}
          >
            {previewMode ? '⚙️ Admin List View' : '👁️ Preview User Pricing Table'}
          </button>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ 
              borderRadius: 8, 
              padding: '8px 18px', 
              fontWeight: 700, 
              fontSize: 13, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              background: activeServiceObj.color,
              borderColor: activeServiceObj.color
            }}
          >
            <span>➕</span> Create {activeServiceObj.label} Plan
          </button>
        </div>
      </div>

      {previewMode ? (
        <div className="card shadow-sm mb-4" style={{ borderRadius: 16 }}>
          <div className="card-header d-flex align-items-center justify-content-between" style={{ padding: '16px 20px' }}>
            <div>
              <h5 className="card-title mb-0" style={{ fontSize: 16, fontWeight: 700 }}>
                👁️ User Pricing Table Live Preview
              </h5>
              <small className="text-muted">This is exactly how users see the comparison table on their portal.</small>
            </div>
            <button 
              type="button" 
              className="btn btn-sm btn-white" 
              onClick={() => setPreviewMode(false)}
              style={{ borderRadius: 6, fontSize: 12 }}
            >
              Close Preview
            </button>
          </div>
          <div className="card-body p-3">
            <UserPlansPage currentUser={{ plan: 'Startup' }} notify={notify} isPreview={true} />
          </div>
        </div>
      ) : (
        <>
          {/* Service Selector Tabs (Horizontal 4 Services) */}
          <div 
            className="d-flex align-items-center gap-2 mb-4 p-2"
            style={{ 
              background: 'var(--zd-card-bg, #ffffff)', 
              borderRadius: 14, 
              border: '1px solid var(--zd-border, #eef2f6)',
              overflowX: 'auto'
            }}
          >
            {ADMIN_SERVICES.map(srv => {
              const isSelected = selectedService === srv.id
              const serviceCount = plans.filter(p => (p.service || 'whatsapp').toLowerCase() === srv.id).length
              return (
                <button
                  key={srv.id}
                  type="button"
                  onClick={() => setSelectedService(srv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 18px',
                    borderRadius: 10,
                    border: isSelected ? `2px solid ${srv.color}` : '1px solid transparent',
                    background: isSelected ? srv.softBg : 'transparent',
                    color: isSelected ? srv.color : 'var(--zd-text-muted, #64748b)',
                    fontWeight: isSelected ? 800 : 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{ fontSize: 18 }}>{srv.icon}</span>
                  <span>{srv.label}</span>
                  <span 
                    style={{ 
                      fontSize: 11, 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      background: isSelected ? srv.color : '#e2e8f0', 
                      color: isSelected ? '#ffffff' : '#475569',
                      fontWeight: 700 
                    }}
                  >
                    {serviceCount}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Stats Bar for Selected Service */}
          <div className="row row-cards mb-4">
            <div className="col-sm-6 col-lg-3">
              <div className="card p-3" style={{ borderRadius: 12 }}>
                <div className="d-flex align-items-center">
                  <span 
                    className="stamp stamp-md mr-3" 
                    style={{ 
                      marginRight: 14, 
                      fontSize: 20, 
                      width: 44, 
                      height: 44, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: 10, 
                      background: activeServiceObj.softBg,
                      color: activeServiceObj.color
                    }}
                  >
                    {activeServiceObj.icon}
                  </span>
                  <div>
                    <h4 className="m-0 font-weight-bold" style={{ fontSize: 20 }}>{filteredPlans.length}</h4>
                    <small className="text-muted">{activeServiceObj.label} Plans</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card p-3" style={{ borderRadius: 12 }}>
                <div className="d-flex align-items-center">
                  <span 
                    className="stamp stamp-md mr-3" 
                    style={{ 
                      marginRight: 14, 
                      fontSize: 20, 
                      width: 44, 
                      height: 44, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: 10, 
                      background: 'rgba(45, 206, 137, 0.12)',
                      color: '#2dce89'
                    }}
                  >
                    ✓
                  </span>
                  <div>
                    <h4 className="m-0 font-weight-bold" style={{ fontSize: 20 }}>{filteredPlans.filter(p => p.active).length}</h4>
                    <small className="text-muted">Active Plans</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card p-3" style={{ borderRadius: 12 }}>
                <div className="d-flex align-items-center">
                  <span 
                    className="stamp stamp-md mr-3" 
                    style={{ 
                      marginRight: 14, 
                      fontSize: 20, 
                      width: 44, 
                      height: 44, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: 10, 
                      background: 'rgba(247, 127, 0, 0.12)',
                      color: '#f77f00'
                    }}
                  >
                    💰
                  </span>
                  <div>
                    <h4 className="m-0 font-weight-bold" style={{ fontSize: 20 }}>
                      {filteredPlans.length > 0 
                        ? (selectedService === 'gst' ? `₹${Math.min(...filteredPlans.map(p => Number(p.pricePerHit || p.price || 1)))}/hit` : `₹${Math.min(...filteredPlans.map(p => p.price))}`) 
                        : '₹0'}
                    </h4>
                    <small className="text-muted">Lowest Plan Starting</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-sm-6 col-lg-3">
              <div className="card p-3" style={{ borderRadius: 12 }}>
                <div className="d-flex align-items-center">
                  <span 
                    className="stamp stamp-md mr-3" 
                    style={{ 
                      marginRight: 14, 
                      fontSize: 20, 
                      width: 44, 
                      height: 44, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: 10, 
                      background: 'rgba(112, 94, 200, 0.12)',
                      color: '#705ec8'
                    }}
                  >
                    📦
                  </span>
                  <div>
                    <h4 className="m-0 font-weight-bold" style={{ fontSize: 20 }}>{plans.length}</h4>
                    <small className="text-muted">Total All Services</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GST Pay-Per-Hit Configuration Card */}
          {selectedService === 'gst' && (
            <div 
              className="card shadow-sm mb-4" 
              style={{ 
                borderRadius: 16, 
                border: '2px solid #7c3aed45', 
                background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
                boxShadow: '0 4px 18px rgba(124, 58, 237, 0.08)'
              }}
            >
              <div className="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center gap-3">
                  <div 
                    style={{ 
                      width: 50, 
                      height: 50, 
                      borderRadius: 12, 
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: 24, 
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      flexShrink: 0
                    }}
                  >
                    🏛️
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                      GST Per-Hit Pricing Configuration (प्रति सर्च हिट शुल्क सेटिंग)
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                      यूज़र जब GST सर्च या API हिट करेगा तो उसके वॉलेट से यह राशि सीधे कटेगी (Pay-Per-Hit मॉडल)।
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2" style={{ flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ width: 180 }}>
                    <span className="input-group-text font-weight-bold" style={{ background: '#f3e8ff', color: '#7c3aed', borderColor: '#d8b4fe' }}>₹</span>
                    <input 
                      type="number" 
                      step="0.1" 
                      min="0"
                      className="form-control font-weight-bold" 
                      value={gstPriceInput}
                      onChange={e => setGstPriceInput(e.target.value)}
                      style={{ borderColor: '#d8b4fe', fontSize: 15 }}
                      placeholder="1.0"
                    />
                    <span className="input-group-text" style={{ background: '#f3e8ff', color: '#7c3aed', borderColor: '#d8b4fe', fontSize: 12 }}>/ hit</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveGstPrice}
                    disabled={savingGstPrice}
                    style={{ 
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', 
                      borderColor: '#7c3aed', 
                      borderRadius: 8, 
                      padding: '8px 20px', 
                      fontWeight: 800,
                      boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>💾</span>
                    <span>{savingGstPrice ? 'Saving...' : 'Save GST Price'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table Container Card */}
          <div className="card shadow-sm mb-4" style={{ borderRadius: 16 }}>
            <div className="card-header d-flex flex-wrap align-items-center justify-content-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
              <div>
                <h3 className="card-title mb-0" style={{ fontSize: 16, fontWeight: 700 }}>
                  {activeServiceObj.icon} {activeServiceObj.label} Plans
                </h3>
                <small className="text-muted">Plans configured here are dynamically shown to users in their Subscription page under {activeServiceObj.label}.</small>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-primary"
                onClick={openCreateModal}
                style={{ borderRadius: 8, padding: '6px 14px', fontWeight: 600, background: activeServiceObj.color, borderColor: activeServiceObj.color }}
              >
                + Add New {activeServiceObj.label} Plan
              </button>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
                  <div className="spinner-border text-primary mb-2" role="status"></div>
                  <div>लोड हो रहा है (Loading {activeServiceObj.label} plans)...</div>
                </div>
              ) : filteredPlans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div style={{ fontSize: 42, marginBottom: 10 }}>{activeServiceObj.icon}</div>
                  <h4>कोई {activeServiceObj.label} प्लान नहीं मिला</h4>
                  <p className="text-muted mb-3">इस सर्विस के लिए अभी तक कोई प्लान नहीं बनाया गया है। नया प्लान बनाएं ताकि यूज़र्स इसे खरीद सकें।</p>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={openCreateModal}
                    style={{ borderRadius: 8, padding: '8px 20px', fontWeight: 700, background: activeServiceObj.color, borderColor: activeServiceObj.color }}
                  >
                    + Create First {activeServiceObj.label} Plan
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table card-table table-vcenter text-nowrap mb-0" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr style={{ background: 'var(--zd-card-bg, #f8fafc)', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
                        <th style={{ width: 40, textAlign: 'center', fontWeight: 700 }}>#</th>
                        <th style={{ fontWeight: 700 }}>Plan Name &amp; Banner</th>
                        <th style={{ fontWeight: 700 }}>Pricing &amp; Validity</th>

                        {/* Service-Specific Headers */}
                        {selectedService === 'whatsapp' && (
                          <>
                            <th style={{ fontWeight: 700 }}>Limits</th>
                            <th style={{ fontWeight: 700 }}>Capabilities</th>
                          </>
                        )}
                        {selectedService === 'sms' && (
                          <>
                            <th style={{ fontWeight: 700 }}>Incoming SMS</th>
                            <th style={{ fontWeight: 700 }}>Outgoing SMS</th>
                          </>
                        )}
                        {selectedService === 'plan' && (
                          <>
                            <th style={{ fontWeight: 700 }}>Hits Quota</th>
                            <th style={{ fontWeight: 700 }}>API Access</th>
                          </>
                        )}
                        {selectedService === 'gst' && (
                          <>
                            <th style={{ fontWeight: 700 }}>Price Per Hit</th>
                            <th style={{ fontWeight: 700 }}>Description</th>
                          </>
                        )}

                        <th style={{ fontWeight: 700, textAlign: 'center' }}>Status</th>
                        <th style={{ fontWeight: 700, textAlign: 'right', paddingRight: 24 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.map((p, idx) => (
                        <tr key={p.planId || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--zd-text-muted, #64748b)' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div className="d-flex align-items-center" style={{ gap: 12 }}>
                              <span 
                                style={{ 
                                  width: 14, 
                                  height: 38, 
                                  borderRadius: 4, 
                                  background: p.headerColor || activeServiceObj.color,
                                  display: 'inline-block',
                                  flexShrink: 0
                                }} 
                              />
                              <div>
                                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                                  <strong style={{ fontSize: 15, color: 'inherit' }}>{p.name}</strong>
                                  {p.badgeText && (
                                    <span className="badge badge-warning" style={{ fontSize: 10, padding: '2px 6px', fontWeight: 700 }}>
                                      {p.badgeText}
                                    </span>
                                  )}
                                </div>
                                <small className="text-muted" style={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.description || 'No description'}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                                ₹{selectedService === 'gst' ? (p.pricePerHit ?? p.price ?? 1) : p.price}
                              </span>
                              <span className="text-muted" style={{ fontSize: 12, marginLeft: 4 }}>
                                {selectedService === 'gst' 
                                  ? '/ Per Hit' 
                                  : (p.isUnlimitedValidity ? '/ Unlimited Validity' : `/ ${p.validity || `${p.validityDays} Days`}`)}
                              </span>
                            </div>
                            <small className="text-muted" style={{ fontSize: 11 }}>
                              Currency: {p.currency || 'INR'}
                            </small>
                          </td>

                          {/* WhatsApp Columns */}
                          {selectedService === 'whatsapp' && (
                            <>
                              <td>
                                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                                  <div><strong>Daily:</strong> <span className="badge badge-primary-light" style={{ padding: '2px 6px' }}>{p.dailyLimit || '500/Day'}</span></div>
                                  <div><strong>Devices:</strong> <span className="badge badge-info-light" style={{ padding: '2px 6px' }}>{p.deviceLimit || '1 Device'}</span></div>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-wrap gap-1" style={{ gap: 4, maxWidth: 260 }}>
                                  <span className={`badge ${p.apiAccess ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.apiAccess ? '✓ API' : '✕ API'}
                                  </span>
                                  <span className={`badge ${p.webAccess !== false ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.webAccess !== false ? '✓ Web' : '✕ Web'}
                                  </span>
                                  <span className={`badge ${p.bulkMsg ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.bulkMsg ? '✓ Bulk' : '✕ Bulk'}
                                  </span>
                                  <span className={`badge ${p.groupOption ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.groupOption ? '✓ Group' : '✕ Group'}
                                  </span>
                                  <span className={`badge ${p.scheduleMsg ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.scheduleMsg ? '✓ Schedule' : '✕ Schedule'}
                                  </span>
                                  <span className={`badge ${p.ipSecurity ? 'badge-success-light' : 'badge-light text-muted'}`} style={{ fontSize: 10 }}>
                                    {p.ipSecurity ? '✓ IP Sec' : '✕ IP Sec'}
                                  </span>
                                </div>
                              </td>
                            </>
                          )}

                          {/* SMS Columns */}
                          {selectedService === 'sms' && (
                            <>
                              <td>
                                <span className={`badge ${p.incomingAllowed !== false ? 'badge-success-light' : 'badge-danger-light'}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                                  {p.incomingAllowed !== false ? '✓ Incoming Allowed' : '✕ Disallowed'}
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${p.outgoingAllowed !== false ? 'badge-success-light' : 'badge-danger-light'}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                                  {p.outgoingAllowed !== false ? '✓ Outgoing Allowed' : '✕ Disallowed'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Plan API Columns */}
                          {selectedService === 'plan' && (
                            <>
                              <td>
                                <span className="badge badge-warning-light" style={{ fontSize: 12, padding: '4px 8px', fontWeight: 700 }}>
                                  🎯 {Number(p.hits || 0).toLocaleString()} Hits
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${p.apiAccess ? 'badge-success-light' : 'badge-danger-light'}`} style={{ fontSize: 11, padding: '4px 8px' }}>
                                  {p.apiAccess ? '✓ REST API Enabled' : '✕ API Disabled'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* GST Columns */}
                          {selectedService === 'gst' && (
                            <>
                              <td>
                                <span className="badge badge-purple-light" style={{ fontSize: 13, padding: '4px 10px', fontWeight: 800, color: '#7c3aed' }}>
                                  ₹{p.pricePerHit ?? p.price ?? 1.0} / hit
                                </span>
                              </td>
                              <td>
                                <span style={{ fontSize: 12, color: 'var(--zd-text-muted, #64748b)' }}>
                                  {p.description || 'Pay-per-hit deducted from user wallet'}
                                </span>
                              </td>
                            </>
                          )}

                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`btn btn-sm ${p.active ? 'btn-success-light' : 'btn-outline-secondary'}`}
                              onClick={() => togglePlanActive(p)}
                              disabled={actionLoading === p.planId}
                              style={{ borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}
                              title="Click to toggle status"
                            >
                              {p.active ? '✓ Active' : '✕ Inactive'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right', paddingRight: 20 }}>
                            <div className="d-inline-flex gap-1" style={{ gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => openEditModal(p)}
                                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 12 }}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeletePlan(p)}
                                disabled={actionLoading === p.planId}
                                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 12 }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CREATE / EDIT PLAN MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div 
            className="modal-content-card" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 680, width: '92%', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header d-flex align-items-center justify-content-between" style={{ padding: '16px 24px', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
              <div>
                <h5 className="modal-title font-weight-bold m-0" style={{ fontSize: 17, color: 'inherit' }}>
                  {editingPlan ? `✏️ Edit ${activeServiceObj.label} Plan: ${editingPlan.name}` : `➕ Create New ${activeServiceObj.label} Plan`}
                </h5>
                <small className="text-muted">Configure service-specific parameters, pricing, and visual styling.</small>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8a98ac', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '22px 24px' }}>
                {/* Service Selector Indicator */}
                <div className="mb-3 p-2 d-flex align-items-center justify-content-between" style={{ background: activeServiceObj.softBg, borderRadius: 8, border: `1px solid ${activeServiceObj.color}40` }}>
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: 20 }}>{activeServiceObj.icon}</span>
                    <strong style={{ color: activeServiceObj.color, fontSize: 14 }}>Service: {activeServiceObj.label}</strong>
                  </div>
                  <span className="badge" style={{ background: activeServiceObj.color, color: '#fff', fontSize: 10, padding: '3px 8px' }}>
                    {form.service.toUpperCase()}
                  </span>
                </div>

                {/* Plan Name and Price */}
                <div className="row g-3 mb-3">
                  <div className="col-md-7">
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Plan Name (प्लान का नाम) *
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={selectedService === 'gst' ? 'e.g. GST Standard Pay-per-hit' : (selectedService === 'plan' ? 'e.g. 10k Hits Plan' : 'e.g. Startup, Business')}
                      required
                      style={{ height: 42, borderRadius: 8 }}
                    />
                  </div>
                  <div className="col-md-5">
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      {selectedService === 'gst' ? 'Price Per Hit (प्रति हिट शुल्क INR) *' : 'Plan Amount (कीमत INR में) *'}
                    </label>
                    <div className="input-group">
                      <span className="input-group-text" style={{ borderRadius: '8px 0 0 8px', fontWeight: 700 }}>₹</span>
                      <input 
                        type="number" 
                        step={selectedService === 'gst' ? '0.1' : '1'}
                        className="form-control" 
                        value={selectedService === 'gst' ? (form.pricePerHit ?? form.price) : form.price}
                        onChange={e => setForm(f => ({ 
                          ...f, 
                          price: e.target.value,
                          pricePerHit: selectedService === 'gst' ? Number(e.target.value) : f.pricePerHit 
                        }))}
                        placeholder={selectedService === 'gst' ? '1.0' : '99'}
                        min="0"
                        required
                        style={{ height: 42, borderRadius: '0 8px 8px 0' }}
                      />
                    </div>
                  </div>
                </div>

                {/* WHATSAPP SPECIFIC PARAMETERS */}
                {selectedService === 'whatsapp' && (
                  <>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Daily Msg Limit (प्रतिदिन संदेश सीमा) *
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={form.dailyLimit}
                          onChange={e => setForm(f => ({ ...f, dailyLimit: e.target.value }))}
                          placeholder="e.g. 500/Day, 1000/Day"
                          required
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Validity in Days (वैधता दिन) *
                        </label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={form.validityDays}
                          onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) || 30, validity: `${e.target.value} Days` }))}
                          placeholder="30"
                          min="1"
                          required
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Device Limit (डिवाइस सीमा) *
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={form.deviceLimit}
                          onChange={e => setForm(f => ({ ...f, deviceLimit: e.target.value }))}
                          placeholder="e.g. 1 Free + 1 Add-on, 2 Devices"
                          required
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Validity Display Label
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={form.validity}
                          onChange={e => setForm(f => ({ ...f, validity: e.target.value }))}
                          placeholder="30 Days"
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                    </div>

                    {/* WhatsApp Feature Toggles */}
                    <div className="card p-3 mb-3" style={{ borderRadius: 12, background: 'var(--zd-border-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--zd-border, #eef2f6)' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'inherit' }}>
                        ⚡ WhatsApp Feature Access &amp; Capabilities
                      </label>
                      <div className="row g-3">
                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.apiAccess}
                              onChange={e => setForm(f => ({ ...f, apiAccess: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>API Access Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>REST API access token for send</small>
                        </div>

                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.webAccess}
                              onChange={e => setForm(f => ({ ...f, webAccess: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Web Msg Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Web UI direct sending portal</small>
                        </div>

                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.ipSecurity}
                              onChange={e => setForm(f => ({ ...f, ipSecurity: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>IP Whitelist Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>IP Whitelisting &amp; security</small>
                        </div>

                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.bulkMsg}
                              onChange={e => setForm(f => ({ ...f, bulkMsg: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Bulk Message Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Excel upload and bulk broadcasts</small>
                        </div>

                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.groupOption}
                              onChange={e => setForm(f => ({ ...f, groupOption: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Group Message Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Broadcast to WhatsApp groups</small>
                        </div>

                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.scheduleMsg}
                              onChange={e => setForm(f => ({ ...f, scheduleMsg: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Schedule Msg Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Scheduled queue sending</small>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* SMS SPECIFIC PARAMETERS */}
                {selectedService === 'sms' && (
                  <>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Validity in Days (वैधता दिन) *
                        </label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={form.validityDays}
                          onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) || 30, validity: `${e.target.value} Days` }))}
                          placeholder="30"
                          min="1"
                          required
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Validity Display Label
                        </label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={form.validity}
                          onChange={e => setForm(f => ({ ...f, validity: e.target.value }))}
                          placeholder="30 Days"
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                    </div>

                    <div className="card p-3 mb-3" style={{ borderRadius: 12, background: 'var(--zd-border-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--zd-border, #eef2f6)' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'inherit' }}>
                        📱 SMS Routing Permissions
                      </label>
                      <div className="row g-3">
                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.incomingAllowed}
                              onChange={e => setForm(f => ({ ...f, incomingAllowed: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Incoming SMS Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Allow receiving SMS from Android phone to Webhook</small>
                        </div>
                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.outgoingAllowed}
                              onChange={e => setForm(f => ({ ...f, outgoingAllowed: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Outgoing SMS Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Allow sending SMS outbox via connected device</small>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* PLAN API SPECIFIC PARAMETERS */}
                {selectedService === 'plan' && (
                  <>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Number of Hits (कुल हिट्स संख्या) *
                        </label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={form.hits}
                          onChange={e => setForm(f => ({ ...f, hits: Number(e.target.value) || 0 }))}
                          placeholder="e.g. 10000, 50000"
                          min="1"
                          required
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                      <div className="col-md-6">
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                          Validity in Days (वैधता दिन)
                        </label>
                        <input 
                          type="number" 
                          className="form-control" 
                          value={form.validityDays}
                          disabled={form.isUnlimitedValidity}
                          onChange={e => setForm(f => ({ ...f, validityDays: Number(e.target.value) || 30, validity: `${e.target.value} Days` }))}
                          placeholder={form.isUnlimitedValidity ? 'Unlimited' : '30'}
                          min="1"
                          style={{ height: 42, borderRadius: 8 }}
                        />
                      </div>
                    </div>

                    <div className="card p-3 mb-3" style={{ borderRadius: 12, background: 'var(--zd-border-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--zd-border, #eef2f6)' }}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'inherit' }}>
                        ⚡ Plan API Access &amp; Validity Rule
                      </label>
                      <div className="row g-3">
                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.isUnlimitedValidity}
                              onChange={e => setForm(f => ({ 
                                ...f, 
                                isUnlimitedValidity: e.target.checked,
                                validity: e.target.checked ? 'Unlimited' : `${f.validityDays} Days`
                              }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>Unlimited Validity (लाइफटाइम वैधता)</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Hits never expire until consumed</small>
                        </div>
                        <div className="col-sm-6">
                          <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', margin: 0 }}>
                            <input 
                              type="checkbox" 
                              checked={form.apiAccess}
                              onChange={e => setForm(f => ({ ...f, apiAccess: e.target.checked }))}
                            />
                            <span style={{ fontSize: 13, fontWeight: 600 }}>API Access Allowed</span>
                          </label>
                          <small className="text-muted d-block" style={{ marginLeft: 22, fontSize: 11 }}>Access to Mobile, DTH, R-offer endpoints</small>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* GST SPECIFIC PARAMETERS */}
                {selectedService === 'gst' && (
                  <div className="p-3 mb-3" style={{ borderRadius: 12, background: '#faf5ff', border: '1px solid #7c3aed40' }}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span style={{ fontSize: 20 }}>🏛️</span>
                      <strong style={{ color: '#7c3aed', fontSize: 13 }}>Pay-per-Hit GST Portal Rule:</strong>
                    </div>
                    <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
                      यूज़र जब GST सर्च करेगा तो उसके वॉलेट बैलेंस में से <strong>₹{form.pricePerHit || 1.0}</strong> प्रति हिट तुरंत काटे जाएंगे। यदि वॉलेट बैलेंस पर्याप्त नहीं होगा तो यूज़र को अपर्याप्त बैलेंस का एरर दिखेगा।
                    </p>
                  </div>
                )}

                {/* Tagline / Description */}
                <div className="form-group mb-3">
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Description / Subtitle (योजना का विवरण/टैगलाइन)
                  </label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="e.g. Full suite access with high-speed API & Webhook"
                    style={{ height: 42, borderRadius: 8 }}
                  />
                </div>

                {/* Color and Badge */}
                <div className="row g-3 mb-4">
                  <div className="col-md-7">
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Header Banner Theme Color (कलर थीम)
                    </label>
                    <div className="d-flex align-items-center gap-2" style={{ gap: 8 }}>
                      <input 
                        type="color" 
                        value={form.headerColor} 
                        onChange={e => setForm(f => ({ ...f, headerColor: e.target.value }))}
                        style={{ width: 44, height: 42, padding: 2, border: '1px solid #d0d7de', borderRadius: 8, cursor: 'pointer' }}
                      />
                      <div className="d-flex flex-wrap gap-1" style={{ gap: 6 }}>
                        {DEFAULT_PLAN_COLORS.map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, headerColor: c.hex }))}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              background: c.hex,
                              border: form.headerColor === c.hex ? '2px solid #000' : '1px solid rgba(0,0,0,0.15)',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-5">
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                      Badge Text (बैज जैसे POPULAR, BEST)
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={form.badgeText}
                      onChange={e => setForm(f => ({ ...f, badgeText: e.target.value }))}
                      placeholder="e.g. POPULAR, RECOMMENDED"
                      style={{ height: 42, borderRadius: 8 }}
                    />
                  </div>
                </div>

                {/* Status & Sort Order */}
                <div className="row g-3">
                  <div className="col-6">
                    <label className="custom-control custom-checkbox d-flex align-items-center" style={{ gap: 8, cursor: 'pointer', marginTop: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={form.active}
                        onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                      />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>Plan Active (सक्रिय रखें)</span>
                    </label>
                  </div>
                  <div className="col-6">
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                      Display Sort Order
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={form.sortOrder}
                      onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                      style={{ height: 38, borderRadius: 8 }}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer d-flex justify-content-end gap-2" style={{ padding: '14px 24px', borderTop: '1px solid var(--zd-border, #eef2f6)', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={() => setShowModal(false)}
                  style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ borderRadius: 8, padding: '8px 22px', fontWeight: 700, background: activeServiceObj.color, borderColor: activeServiceObj.color }}
                >
                  {saving ? '⏳ Saving Plan...' : (editingPlan ? '💾 Update Plan' : `➕ Create ${activeServiceObj.label} Plan`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
