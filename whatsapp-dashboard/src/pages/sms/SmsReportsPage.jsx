import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useAuth } from '../../context/AuthContext'
import '../../styles/reports.css'

function parseDateInput(val) {
  if (!val) return null
  const str = String(val).trim()
  if (str.includes('-')) {
    const p = str.split('-')
    if (p[0].length === 2 && p[2]?.length === 4) {
      return new Date(`${p[2]}-${p[1]}-${p[0]}`)
    }
  } else if (str.includes('/')) {
    const p = str.split('/')
    if (p[0].length === 2 && p[2]?.length === 4) {
      return new Date(`${p[2]}-${p[1]}-${p[0]}`)
    }
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

export default function SmsReportsPage() {
  const { notify } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [pageSize, setPageSize] = useState('25')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [senderFilter, setSenderFilter] = useState('')
  const [simFilter, setSimFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchMsg, setSearchMsg] = useState('')

  // Pagination & View Modal
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedSms, setSelectedSms] = useState(null)

  const fromDateRef = useRef(null)
  const toDateRef = useRef(null)

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true)
      const res = await fetch('/api/sms/messages?limit=1000').then(r => r.json())
      if (res.success) {
        setMessages(res.messages || [])
      }
    } catch (err) {
      if (isInitial) notify('SMS reports load error: ' + err.message)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(true)
    const timer = setInterval(() => loadData(false), 8000)
    return () => clearInterval(timer)
  }, [])

  // Reset Filters
  const resetFilters = () => {
    setPageSize('25')
    setFromDate('')
    setToDate('')
    setSenderFilter('')
    setSimFilter('all')
    setStatusFilter('all')
    setSearchMsg('')
    setCurrentPage(1)
    notify('Filters reset successfully.')
  }

  // Filter Computation
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      // 1. From Date
      if (fromDate) {
        const mTime = new Date(m.received_at || m.created_at).getTime()
        const fDate = parseDateInput(fromDate)
        if (fDate && !isNaN(mTime) && mTime < fDate.getTime()) return false
      }

      // 2. To Date
      if (toDate) {
        const mTime = new Date(m.received_at || m.created_at).getTime()
        const tDate = parseDateInput(toDate)
        if (tDate && !isNaN(mTime)) {
          tDate.setHours(23, 59, 59, 999)
          if (mTime > tDate.getTime()) return false
        }
      }

      // 3. Sender Filter
      if (senderFilter.trim()) {
        const q = senderFilter.toLowerCase().trim()
        const s = String(m.sender || '').toLowerCase()
        if (!s.includes(q)) return false
      }

      // 4. SIM Slot Filter
      if (simFilter !== 'all') {
        if (String(m.sim_slot) !== String(simFilter)) return false
      }

      // 5. Status Filter
      if (statusFilter !== 'all') {
        const st = String(m.webhook_status || 'DELIVERED').toUpperCase()
        if (statusFilter === 'DELIVERED') {
          if (st !== 'DELIVERED') return false
        } else if (statusFilter === 'PENDING' || statusFilter === 'RETRY') {
          if (st !== 'RETRY_SCHEDULED' && st !== 'PENDING') return false
        } else if (statusFilter === 'FAILED') {
          if (st !== 'FAILED' && st !== 'SENDER_BLOCKED') return false
        }
      }

      // 6. Search Text
      if (searchMsg.trim()) {
        const q = searchMsg.toLowerCase().trim()
        const text = String(m.message || '').toLowerCase()
        if (!text.includes(q)) return false
      }

      return true
    })
  }, [messages, fromDate, toDate, senderFilter, simFilter, statusFilter, searchMsg])

  // Pagination Calculation
  const effPageSize = pageSize === 'All' ? (filteredMessages.length || 1) : Number(pageSize)
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / effPageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedMessages = useMemo(() => {
    if (pageSize === 'All') return filteredMessages
    const start = (safeCurrentPage - 1) * effPageSize
    return filteredMessages.slice(start, start + effPageSize)
  }, [filteredMessages, safeCurrentPage, effPageSize, pageSize])

  // Format Date for table
  const formatDateTime = (dateVal) => {
    if (!dateVal) return '—'
    try {
      const d = new Date(dateVal)
      if (isNaN(d.getTime())) return dateVal
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${day}/${month}/${year} ${time}`
    } catch {
      return dateVal
    }
  }

  // Excel Export
  const exportReport = () => {
    if (filteredMessages.length === 0) {
      notify('No records found to export.')
      return
    }
    try {
      const exportData = filteredMessages.map((m, i) => ({
        'SL NO': i + 1,
        'Sender ID': m.sender || 'Unknown',
        'SIM Slot': m.sim_slot !== null && m.sim_slot !== undefined ? `SIM ${Number(m.sim_slot) + 1}` : 'SIM 1',
        'Message Text': m.message || '',
        'Received At (IST)': formatDateTime(m.received_at || m.created_at),
        'Webhook Status': m.webhook_status || 'DELIVERED',
        'HTTP Code': m.webhook_response_code || 200,
        'Device ID': m.device_id || 'Android Gateway'
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'SMS_Report')
      const today = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `sms_report_${today}.xlsx`)
      notify('SMS report exported as Excel (.xlsx) successfully!')
    } catch (err) {
      notify('Export error: ' + err.message)
    }
  }

  const getStatusBadge = (status) => {
    const s = String(status || 'DELIVERED').toUpperCase()
    if (s === 'DELIVERED') return <span className="badge delivered">Delivered</span>
    if (s === 'RETRY_SCHEDULED' || s === 'PENDING') return <span className="badge pending">Retry Queue</span>
    if (s === 'FAILED' || s === 'SENDER_BLOCKED') return <span className="badge failed">Failed</span>
    return <span className="badge delivered">{s}</span>
  }

  return (
    <div className="content">
      {/* Hero Header */}
      <div className="hero">
        <div>
          <span className="eyebrow">MOBILE SMS REPORTS</span>
          <h1>SMS Delivery Reports</h1>
          <p>Complete audit logs, incoming message records & webhook statuses</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => loadData(true)}>
            ↻ Refresh
          </button>
          <button type="button" className="btn primary" onClick={exportReport}>
            ⇩ Download Excel
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <article className="card filter-card">
        <div className="card-head filter-head">
          <div>
            <h3>Filter SMS Reports</h3>
            <p>Filter incoming SMS logs by date, sender header, SIM slot, and webhook dispatch status.</p>
          </div>
          <div className="filter-inline">
            <div className="filter-field inline-reset">
              <label>RESET</label>
              <button className="filter-clear" type="button" onClick={resetFilters}>
                ↻ Reset
              </button>
            </div>
          </div>
        </div>

        <div className="filter-grid">
          {/* SL NO / Page Size */}
          <div className="filter-field">
            <label>SL NO</label>
            <select
              className="select"
              value={pageSize}
              onChange={e => {
                setPageSize(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="500">500</option>
              <option value="All">All</option>
            </select>
          </div>

          {/* From Date */}
          <div className="filter-field date-field">
            <label>FROM DATE</label>
            <div className="date-wrap">
              <input
                className="input date-text"
                type="text"
                placeholder="DD-MM-YYYY"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
              <button
                className="date-picker"
                type="button"
                onClick={() => fromDateRef.current?.showPicker ? fromDateRef.current.showPicker() : fromDateRef.current?.focus()}
              >
                ▣
              </button>
              <input
                ref={fromDateRef}
                className="native-date"
                type="date"
                value=""
                onChange={e => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-')
                    setFromDate(`${d}-${m}-${y}`)
                  }
                }}
                tabIndex={-1}
              />
            </div>
          </div>

          {/* To Date */}
          <div className="filter-field date-field">
            <label>TO DATE</label>
            <div className="date-wrap">
              <input
                className="input date-text"
                type="text"
                placeholder="DD-MM-YYYY"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
              <button
                className="date-picker"
                type="button"
                onClick={() => toDateRef.current?.showPicker ? toDateRef.current.showPicker() : toDateRef.current?.focus()}
              >
                ▣
              </button>
              <input
                ref={toDateRef}
                className="native-date"
                type="date"
                value=""
                onChange={e => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-')
                    setToDate(`${d}-${m}-${y}`)
                  }
                }}
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Sender Header */}
          <div className="filter-field">
            <label>SENDER ID / NUMBER</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. HDFC, VK-OTP, 9876543210"
              value={senderFilter}
              onChange={e => {
                setSenderFilter(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          {/* SIM Slot */}
          <div className="filter-field">
            <label>SIM SLOT</label>
            <select
              className="select"
              value={simFilter}
              onChange={e => {
                setSimFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">All SIM Slots</option>
              <option value="0">SIM 1</option>
              <option value="1">SIM 2</option>
            </select>
          </div>

          {/* Webhook Status */}
          <div className="filter-field status-field">
            <label>STATUS</label>
            <select
              className="select"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="all">All Statuses</option>
              <option value="DELIVERED">Delivered (200 OK)</option>
              <option value="RETRY">Retry Queue</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Search Text */}
          <div className="filter-field message-field">
            <label>MESSAGE SEARCH</label>
            <input
              className="input"
              type="search"
              placeholder="Search SMS text content..."
              value={searchMsg}
              onChange={e => {
                setSearchMsg(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>
      </article>

      {/* Table Card */}
      <article className="card table-card">
        <div className="card-head compact-card-head">
          <div>
            <h3>📱 SMS Messages Table</h3>
            <p>Showing {filteredMessages.length} total messages matching filter criteria</p>
          </div>
          <div className="table-actions">
            <button type="button" className="export-link" onClick={exportReport}>
              Download Excel ⤓
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table reports-table" style={{ width: '100%', tableLayout: 'auto' }}>
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: 'center' }}>SL NO</th>
                <th style={{ width: 140 }}>SENDER</th>
                <th style={{ width: 80, textAlign: 'center' }}>SIM</th>
                <th>MESSAGE TEXT</th>
                <th style={{ width: 160 }}>RECEIVED AT</th>
                <th style={{ width: 110 }}>STATUS</th>
                <th style={{ width: 70, textAlign: 'center' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    Loading SMS reports...
                  </td>
                </tr>
              ) : paginatedMessages.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No matching SMS records found.
                  </td>
                </tr>
              ) : (
                paginatedMessages.map((m, idx) => (
                  <tr key={m.id || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {(safeCurrentPage - 1) * effPageSize + idx + 1}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a', fontSize: 13 }}>{m.sender || 'Unknown'}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: 11 }}>
                        SIM {Number(m.sim_slot || 0) + 1}
                      </span>
                    </td>
                    <td style={{ maxWidth: 360 }}>
                      <div 
                        style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontSize: 13,
                          color: '#334155'
                        }}
                        title={m.message}
                      >
                        {m.message || '—'}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDateTime(m.received_at || m.created_at)}
                    </td>
                    <td>
                      {getStatusBadge(m.webhook_status)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                        onClick={() => setSelectedSms(m)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderTop: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              Page {safeCurrentPage} of {totalPages} ({filteredMessages.length} total records)
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </article>

      {/* View SMS Detail Modal */}
      {selectedSms && (
        <div className="modal-overlay" onClick={() => setSelectedSms(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>📱 SMS Message Details</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSelectedSms(null)}
                style={{ border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <small style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>SENDER</small>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{selectedSms.sender}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <small style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>SIM SLOT</small>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>SIM {Number(selectedSms.sim_slot || 0) + 1}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>RECEIVED AT (IST)</small>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{formatDateTime(selectedSms.received_at || selectedSms.created_at)}</div>
                </div>

                <div>
                  <small style={{ color: '#64748b', fontSize: 11, fontWeight: 700 }}>WEBHOOK STATUS</small>
                  <div style={{ marginTop: 2 }}>{getStatusBadge(selectedSms.webhook_status)}</div>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4 }}>Full Message Body:</strong>
                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, padding: 12, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#0f172a' }}>
                  {selectedSms.message}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn" onClick={() => setSelectedSms(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
