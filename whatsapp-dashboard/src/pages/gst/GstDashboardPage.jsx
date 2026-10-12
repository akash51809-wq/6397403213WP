import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function GstDashboardPage() {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [recentSearches, setRecentSearches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecentHistory()
  }, [])

  const fetchRecentHistory = async () => {
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('/api/gst/history', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data.success && data.history) {
        setRecentSearches(data.history)
      }
    } catch (e) {
      console.warn('Could not load GST history:', e)
    }
  }

  const handleSearchSubmit = (e) => {
    e?.preventDefault()
    const clean = searchInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length !== 15) {
      setError('GSTIN must be exactly 15 alphanumeric characters (e.g., 19MAJPS4713H1Z3)')
      return
    }
    setError('')
    navigate(`/gst/search?gstin=${encodeURIComponent(clean)}`)
  }

  return (
    <div className="content">
      {/* Quick GSTIN Search Box */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe', background: '#ffffff' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe' }}>
          <div>
            <h3 style={{ color: '#3b0764' }}>🔍 Quick GSTIN Taxpayer Lookup</h3>
            <p style={{ color: '#6d28d9' }}>Enter any 15-digit GSTIN number to fetch taxpayer identity, jurisdiction, and filing status.</p>
          </div>
          <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>
            ● Official GST Portal Sync
          </span>
        </div>

        <div className="card-body">
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 340px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="ENTER VALID GST"
                value={searchInput}
                maxLength={15}
                onChange={(e) => {
                  setSearchInput(e.target.value.toUpperCase())
                  if (error) setError('')
                }}
                style={{
                  fontSize: 16,
                  letterSpacing: '1.2px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '12px 14px'
                }}
              />
              <span style={{ position: 'absolute', right: 12, top: 12, fontSize: 11, color: '#8b5cf6', fontWeight: 700 }}>
                {searchInput.length}/15
              </span>
            </div>

            <button
              type="submit"
              className="btn primary"
              style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
            >
              Verify GSTIN ➔
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>

      {/* Recent Verifications History */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe' }}>
          <div>
            <h3 style={{ color: '#3b0764' }}>📋 Recent Verified Taxpayers</h3>
            <p style={{ color: '#6d28d9' }}>Recently queried GST numbers and their business identity details.</p>
          </div>
          <button
            type="button"
            className="btn"
            onClick={fetchRecentHistory}
            style={{ fontSize: 12, borderColor: '#ddd6fe', color: '#6d28d9' }}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>GSTIN</th>
                  <th>Legal / Trade Name</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSearches.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
                      No recent GSTIN lookups yet. Search a GSTIN above to see live results.
                    </td>
                  </tr>
                ) : (
                  recentSearches.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong style={{ color: '#7c3aed', fontFamily: 'monospace', fontSize: 13 }}>
                          {row.gstin}
                        </strong>
                      </td>
                      <td>
                        <strong>{row.tradeName || row.legalName}</strong>
                        {row.legalName && row.legalName !== row.tradeName && (
                          <small style={{ display: 'block', color: '#6b7280' }}>
                            Legal: {row.legalName}
                          </small>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: 13 }}>{row.state || 'India'}</span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: row.status === 'Active' ? 'rgba(22, 167, 101, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: row.status === 'Active' ? '#16a765' : '#dc2626',
                            borderColor: row.status === 'Active' ? '#16a765' : '#dc2626',
                            fontWeight: 700
                          }}
                        >
                          ● {row.status || 'Active'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>
                        {row.searchedAt ? new Date(row.searchedAt).toLocaleTimeString() : 'Just now'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <Link
                            to={`/gst/search?gstin=${encodeURIComponent(row.gstin)}`}
                            className="btn"
                            style={{ fontSize: 11, padding: '4px 8px', borderColor: '#ddd6fe', color: '#7c3aed' }}
                          >
                            Details
                          </Link>
                          <Link
                            to={`/gst/filings?gstin=${encodeURIComponent(row.gstin)}`}
                            className="btn"
                            style={{ fontSize: 11, padding: '4px 8px', borderColor: '#ddd6fe', color: '#7c3aed' }}
                          >
                            Filings
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Explanatory Info Card */}
      <div className="card" style={{ borderColor: '#ddd6fe', background: '#fcfaff' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe' }}>
          <h3 style={{ color: '#3b0764' }}>💡 GSTIN 15-Digit Structure Guide</h3>
        </div>
        <div className="card-body" style={{ fontSize: 13, lineHeight: 1.8, color: '#4c1d95' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
              <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 4 }}>First 2 Digits (e.g. 19)</strong>
              <span>State Code representing the Indian state where the business is registered (e.g., 19 for West Bengal, 27 for Maharashtra, 07 for Delhi).</span>
            </div>
            <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
              <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 4 }}>Next 10 Digits (PAN)</strong>
              <span>PAN (Permanent Account Number) of the business or proprietor. 4th character denotes entity type (P = Proprietor, C = Company).</span>
            </div>
            <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
              <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 4 }}>13th & 14th Digits</strong>
              <span>13th digit is the entity code representing registration count within the same state. 14th digit is by default the letter 'Z'.</span>
            </div>
            <div style={{ background: '#fff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
              <strong style={{ color: '#7c3aed', display: 'block', marginBottom: 4 }}>15th Digit</strong>
              <span>Check digit used for internal mathematical checksum validation by the GST portal.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
