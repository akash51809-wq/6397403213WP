import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminPlanRequestsPage({ notify: propNotify }) {
  const { notify: authNotify } = useAuth()
  const notify = propNotify || authNotify

  const [requests, setRequests] = useState([])
  const [counts, setCounts] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 })
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [previewImage, setPreviewImage] = useState(null)
  const [rejectingRequest, setRejectingRequest] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const qs = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const d = await api(`/api/admin/plan-requests${qs}`)
      if (d.success) {
        setRequests(d.requests || [])
        if (d.counts) setCounts(d.counts)
      }
    } catch (e) {
      notify('अनुरोध लोड करने में त्रुटि: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, notify])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleApprove = async (req) => {
    const isWallet = req.requestType === 'wallet_topup' || req.service === 'wallet'
    const confirmMsg = isWallet
      ? `क्या आप User ${req.userName} (${req.userMobile || req.userId}) के वॉलेट में ₹${req.amount} तुरंत जोड़ना चाहते हैं?`
      : `क्या आप User ${req.userName} (${req.userMobile || req.userId}) का ${req.service ? req.service.toUpperCase() : ''} प्लान '${req.planName}' तुरंत एक्टिवेट करना चाहते हैं?`
    if (!window.confirm(confirmMsg)) return

    setActionLoading(req.requestId)
    try {
      const d = await api(`/api/admin/plan-requests/${req.requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes: isWallet ? 'Wallet funds approved by admin' : 'Plan approved by admin' })
      })
      if (d.success) {
        notify(d.message || (isWallet ? 'वॉलेट फंड सफलतापूर्वक जोड़ दिया गया!' : 'प्लान सफलतापूर्वक एक्टिवेट कर दिया गया!'))
        fetchRequests()
      }
    } catch (e) {
      notify('Approve Error: ' + e.message)
    } finally {
      setActionLoading('')
    }
  }

  const openRejectModal = (req) => {
    setRejectingRequest(req)
    setRejectNote('')
  }

  const handleConfirmReject = async (e) => {
    e.preventDefault()
    if (!rejectingRequest) return

    setActionLoading(rejectingRequest.requestId)
    try {
      const d = await api(`/api/admin/plan-requests/${rejectingRequest.requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ notes: rejectNote.trim() || 'Payment details could not be verified' })
      })
      if (d.success) {
        notify('रिक्वेस्ट अस्वीकार (Reject) कर दी गई है।')
        setRejectingRequest(null)
        fetchRequests()
      }
    } catch (e) {
      notify('Reject Error: ' + e.message)
    } finally {
      setActionLoading('')
    }
  }

  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter(r => 
      (r.userName && r.userName.toLowerCase().includes(q)) ||
      (r.userMobile && r.userMobile.includes(q)) ||
      (r.userId && r.userId.toLowerCase().includes(q)) ||
      (r.requestId && r.requestId.toLowerCase().includes(q)) ||
      (r.planName && r.planName.toLowerCase().includes(q)) ||
      (r.bankDetails && r.bankDetails.toLowerCase().includes(q))
    )
  }, [requests, search])

  return (
    <section className="admin-plan-requests-page">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title m-0" style={{ fontSize: 22, fontWeight: 800 }}>
            💳 Plan Purchase Requests / Daybook
          </h1>
          <small className="text-muted" style={{ fontSize: 12 }}>
            Manage and approve user plan subscriptions &amp; wallet top-up requests
          </small>
        </div>
        <button 
          type="button" 
          className="btn btn-outline-primary"
          onClick={fetchRequests}
          disabled={loading}
          style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 700, fontSize: 13, height: 38 }}
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Compact Left-to-Right Filters & Search Bar */}
      <div 
        className="d-flex flex-wrap align-items-center justify-content-between p-2 mb-3"
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          gap: 12,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}
      >
        {/* Status Filter Chips (Left to Right) */}
        <div className="d-flex align-items-center gap-2" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
          <button 
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 8,
              border: statusFilter === 'all' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
              background: statusFilter === 'all' ? '#eff6ff' : '#ffffff',
              color: statusFilter === 'all' ? '#1d4ed8' : '#475569',
              fontWeight: statusFilter === 'all' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📋 All Requests</span>
            <span style={{ background: statusFilter === 'all' ? '#3b82f6' : '#e2e8f0', color: statusFilter === 'all' ? '#fff' : '#475569', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {counts.total}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 8,
              border: statusFilter === 'pending' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
              background: statusFilter === 'pending' ? '#fffbeb' : '#ffffff',
              color: statusFilter === 'pending' ? '#b45309' : '#475569',
              fontWeight: statusFilter === 'pending' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>⏳ Pending</span>
            <span style={{ background: '#f59e0b', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {counts.pending}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setStatusFilter('approved')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 8,
              border: statusFilter === 'approved' ? '2px solid #10b981' : '1px solid #e2e8f0',
              background: statusFilter === 'approved' ? '#f0fdf4' : '#ffffff',
              color: statusFilter === 'approved' ? '#047857' : '#475569',
              fontWeight: statusFilter === 'approved' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>✓ Approved</span>
            <span style={{ background: '#10b981', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {counts.approved}
            </span>
          </button>

          <button 
            type="button"
            onClick={() => setStatusFilter('rejected')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 14px',
              borderRadius: 8,
              border: statusFilter === 'rejected' ? '2px solid #ef4444' : '1px solid #e2e8f0',
              background: statusFilter === 'rejected' ? '#fef2f2' : '#ffffff',
              color: statusFilter === 'rejected' ? '#b91c1c' : '#475569',
              fontWeight: statusFilter === 'rejected' ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>✕ Rejected</span>
            <span style={{ background: '#ef4444', color: '#fff', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
              {counts.rejected}
            </span>
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ minWidth: 260, flex: '1 0 240px', maxWidth: 360 }}>
          <input 
            type="text" 
            className="form-control"
            placeholder="🔍 Search user, mobile, UTR, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ borderRadius: 8, height: 38, border: '1px solid #cbd5e1', fontSize: 13 }}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card shadow-sm" style={{ borderRadius: 16 }}>

        {/* Requests Table Body */}
        <div className="card-body p-0">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280' }}>
              <div className="spinner-border text-primary mb-2" role="status"></div>
              <div>अनुरोध लोड हो रहे हैं (Loading purchase requests)...</div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
              <h4>कोई अनुरोध नहीं मिला</h4>
              <p className="text-muted">No purchase requests matching your criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table card-table table-vcenter text-nowrap mb-0">
                <thead>
                  <tr style={{ background: 'var(--zd-card-bg, #f8fafc)', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
                    <th style={{ fontWeight: 700 }}>Request ID</th>
                    <th style={{ fontWeight: 700 }}>User Details</th>
                    <th style={{ fontWeight: 700 }}>Service</th>
                    <th style={{ fontWeight: 700 }}>Requested Plan</th>
                    <th style={{ fontWeight: 700 }}>Amount</th>
                    <th style={{ fontWeight: 700 }}>Payment Info</th>
                    <th style={{ fontWeight: 700, textAlign: 'center' }}>Screenshot Proof</th>
                    <th style={{ fontWeight: 700, textAlign: 'center' }}>Status</th>
                    <th style={{ fontWeight: 700, textAlign: 'right', paddingRight: 24 }}>Actions / Approvals</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr key={req.requestId}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--zd-text-muted, #64748b)' }}>
                          {req.requestId}
                        </span>
                        <div style={{ fontSize: 11, color: 'var(--zd-text-muted, #8a98ac)' }}>
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td>
                        <div>
                          <strong style={{ fontSize: 14, color: 'inherit' }}>{req.userName || 'User'}</strong>
                          <div style={{ fontSize: 12, color: 'var(--zd-text-muted, #64748b)' }}>
                            📱 {req.userMobile || 'No Phone'}
                          </div>
                          <small className="text-muted" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                            ID: {req.userId}
                          </small>
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const s = String(req.service || (req.requestType === 'wallet_topup' ? 'wallet' : 'whatsapp')).toLowerCase()
                          if (s === 'sms') {
                            return <span className="badge" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.3)', padding: '4px 9px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>📱 SMS</span>
                          }
                          if (s === 'plan') {
                            return <span className="badge" style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '4px 9px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>⚡ Plan API</span>
                          }
                          if (s === 'gst') {
                            return <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.3)', padding: '4px 9px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>🏛️ GST</span>
                          }
                          if (s === 'wallet' || req.requestType === 'wallet_topup') {
                            return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 9px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>👛 Wallet Top-up</span>
                          }
                          return <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 9px', borderRadius: 6, fontWeight: 700, fontSize: 11 }}>💬 WhatsApp</span>
                        })()}
                      </td>
                      <td>
                        <span className="badge badge-primary-light" style={{ fontSize: 12, padding: '4px 10px', fontWeight: 700 }}>
                          {req.planName}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                          ₹{req.amount}
                        </span>
                      </td>
                      <td>
                        <div style={{ maxWidth: 220, fontSize: 12 }}>
                          <div><strong>Date:</strong> {req.paymentDate}</div>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={req.bankDetails}>
                            <strong>Txn:</strong> {req.bankDetails}
                          </div>
                          {req.adminNotes && (
                            <small className="text-muted d-block mt-1">
                              <em>Note: {req.adminNotes}</em>
                            </small>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {req.screenshot ? (
                          <div 
                            style={{ cursor: 'pointer', display: 'inline-block' }}
                            onClick={() => setPreviewImage(req.screenshot)}
                            title="Click to view full screenshot"
                          >
                            <img 
                              src={req.screenshot} 
                              alt="Receipt" 
                              style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: '1px solid #d0d7de' }}
                            />
                            <small className="d-block text-primary" style={{ fontSize: 10, fontWeight: 700 }}>View 🔍</small>
                          </div>
                        ) : (
                          <span className="text-muted" style={{ fontSize: 12 }}>No Slip</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {req.status === 'pending' && (
                          <span className="badge badge-warning" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>
                            ⏳ Pending
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="badge badge-success" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>
                            ✓ Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="badge badge-danger" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999 }}>
                            ✕ Rejected
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 20 }}>
                        {req.status === 'pending' ? (
                          <div className="d-inline-flex gap-1" style={{ gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(req)}
                              disabled={actionLoading === req.requestId}
                              style={{ borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700 }}
                            >
                              {actionLoading === req.requestId ? '⏳' : '✓ Approve Plan'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => openRejectModal(req)}
                              disabled={actionLoading === req.requestId}
                              style={{ borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 600 }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        ) : req.status === 'approved' ? (
                          <span className="text-success" style={{ fontSize: 12, fontWeight: 600 }}>
                            Plan Activated ✓
                          </span>
                        ) : (
                          <span className="text-danger" style={{ fontSize: 12 }}>
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SCREENSHOT LIGHTBOX MODAL */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div 
            className="modal-content-card" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 650, width: '92%', borderRadius: 16, textAlign: 'center', padding: 20 }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h5 className="m-0 font-weight-bold" style={{ color: 'inherit' }}>Payment Screenshot / Receipt</h5>
              <button 
                type="button" 
                onClick={() => setPreviewImage(null)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8a98ac', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: '75vh', overflow: 'auto', borderRadius: 8 }}>
              <img 
                src={previewImage} 
                alt="Full Payment Slip" 
                style={{ maxWidth: '100%', height: 'auto', display: 'inline-block', borderRadius: 8 }}
              />
            </div>
            <div className="mt-3">
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => setPreviewImage(null)}
                style={{ borderRadius: 8, padding: '6px 18px' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REQUEST MODAL */}
      {rejectingRequest && (
        <div className="modal-overlay" onClick={() => setRejectingRequest(null)}>
          <div 
            className="modal-content-card" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 480, width: '90%', borderRadius: 16 }}
          >
            <div className="modal-header d-flex align-items-center justify-content-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
              <h5 className="modal-title font-weight-bold m-0" style={{ fontSize: 16, color: '#dc2626' }}>
                ✕ Reject Purchase Request
              </h5>
              <button 
                type="button" 
                onClick={() => setRejectingRequest(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8a98ac', lineHeight: 1 }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="modal-body" style={{ padding: 20 }}>
                <p style={{ fontSize: 13, color: 'inherit' }}>
                  User <strong>{rejectingRequest.userName}</strong> ({rejectingRequest.userMobile}) की 
                  <strong> {rejectingRequest.planName} (₹{rejectingRequest.amount})</strong> रिक्वेस्ट को अस्वीकार करने का कारण लिखें:
                </p>
                <div className="form-group mb-0">
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Rejection Reason / Note (अस्वीकृति का कारण)
                  </label>
                  <textarea 
                    className="form-control" 
                    rows="3"
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="e.g. UTR number not matched with bank account, or incorrect amount paid."
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </div>
              <div className="modal-footer d-flex justify-content-end gap-2" style={{ padding: '12px 20px', borderTop: '1px solid var(--zd-border, #eef2f6)', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={() => setRejectingRequest(null)}
                  style={{ borderRadius: 8, padding: '7px 14px' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-danger"
                  style={{ borderRadius: 8, padding: '7px 18px', fontWeight: 700 }}
                >
                  Confirm Reject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
