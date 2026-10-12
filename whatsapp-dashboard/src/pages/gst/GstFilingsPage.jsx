import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

const FINANCIAL_YEARS = ['2026-2027', '2025-2026', '2024-2025']

export default function GstFilingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialGstin = searchParams.get('gstin') || '09AKPPG5665E1ZU'
  const initialYear = searchParams.get('year') || '2026-2027'

  const [gstinInput, setGstinInput] = useState(initialGstin)
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [activeReturnTab, setActiveReturnTab] = useState('both') // 'both', 'gstr3b', 'gstr1'

  useEffect(() => {
    if (initialGstin) {
      fetchFilings(initialGstin, initialYear)
    }
  }, [initialGstin, initialYear])

  const fetchFilings = async (gstinToFetch, yearToFetch) => {
    const clean = String(gstinToFetch || gstinInput).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length !== 15) {
      setError('कृपया 15-अंकों का मान्य GSTIN नंबर दर्ज करें (उदा: 19MAJPS4713H1Z3)।')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gst/filings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: clean, year: yearToFetch || selectedYear })
      })
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
        setSearchParams({ gstin: clean, year: yearToFetch || selectedYear })
      } else {
        setError(result.message || 'No filing records returned.')
        setData(null)
      }
    } catch (err) {
      setError('Filing table load error: ' + err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    fetchFilings(gstinInput, selectedYear)
  }

  return (
    <div className="content">
      {/* Header */}
      <div className="hero" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow" style={{ color: '#7c3aed' }}>TAX COMPLIANCE HISTORY</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span>📊</span> GSTR-1 & GSTR-3B Return Filing Table
          </h1>
          <p style={{ maxWidth: 680, color: '#581c87' }}>
            Check monthly and quarterly return filing status, date of submission, mode of filing, and Application Reference Number (ARN).
          </p>
        </div>
      </div>

      {/* Filter and GSTIN Form */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 300px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="GSTIN Number (उदा: 19MAJPS4713H1Z3)"
                value={gstinInput}
                maxLength={15}
                onChange={(e) => {
                  setGstinInput(e.target.value.toUpperCase())
                  if (error) setError('')
                }}
                style={{
                  fontSize: 15,
                  letterSpacing: '1px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  padding: '11px 14px'
                }}
              />
            </div>

            <div style={{ width: 180 }}>
              <select
                className="select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{ padding: '11px 14px', fontSize: 14, fontWeight: 600, borderColor: '#ddd6fe' }}
              >
                {FINANCIAL_YEARS.map((y) => (
                  <option key={y} value={y}>
                    FY {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              style={{ padding: '11px 22px', fontSize: 14, fontWeight: 700 }}
            >
              {loading ? 'Loading...' : 'Get Filing Table ➔'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>Verified Samples:</span>
            {['09AKPPG5665E1ZU', '19MAJPS4713H1Z3'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setGstinInput(s)
                  fetchFilings(s, selectedYear)
                }}
                style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  color: '#6d28d9',
                  padding: '3px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filing Content */}
      {data && (
        <>
          {/* Summary Compliance Metric Bar */}
          <div className="grid4" style={{ marginBottom: 24 }}>
            <div className="stat">
              <small>GSTIN Target</small>
              <strong style={{ fontSize: 16, marginTop: 4, color: '#7c3aed', fontFamily: 'monospace' }}>
                {data.gstin}
              </strong>
              <span style={{ color: '#7c3aed', background: 'rgba(139, 92, 246, 0.12)' }}>
                FY {data.selectedYear}
              </span>
            </div>

            <div className="stat">
              <small>Total Returns Tracked</small>
              <strong style={{ fontSize: 24, marginTop: 4, color: '#3b0764' }}>
                {data.summary?.totalReturns || 0}
              </strong>
              <span style={{ color: '#7c3aed', background: 'rgba(139, 92, 246, 0.12)' }}>
                GSTR-1 & 3B
              </span>
            </div>

            <div className="stat">
              <small>Filed On Time</small>
              <strong style={{ fontSize: 24, marginTop: 4, color: '#16a765' }}>
                {data.summary?.filedCount || 0}
              </strong>
              <span style={{ color: '#16a765', background: 'rgba(22, 167, 101, 0.12)' }}>
                100% Verified
              </span>
            </div>

            <div className="stat">
              <small>Compliance Rate</small>
              <strong style={{ fontSize: 24, marginTop: 4, color: '#16a765' }}>
                {data.summary?.complianceScore || '100%'}
              </strong>
              <span style={{ color: '#16a765', background: 'rgba(22, 167, 101, 0.12)' }}>
                Compliant
              </span>
            </div>
          </div>

          {/* Table Switcher Controls */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              className={`btn ${activeReturnTab === 'both' ? 'primary' : ''}`}
              onClick={() => setActiveReturnTab('both')}
              style={{ fontSize: 13, borderColor: '#ddd6fe' }}
            >
              All Returns (Both)
            </button>
            <button
              type="button"
              className={`btn ${activeReturnTab === 'gstr3b' ? 'primary' : ''}`}
              onClick={() => setActiveReturnTab('gstr3b')}
              style={{ fontSize: 13, borderColor: '#ddd6fe' }}
            >
              GSTR-3B Only ({data.gstr3b?.length || 0})
            </button>
            <button
              type="button"
              className={`btn ${activeReturnTab === 'gstr1' ? 'primary' : ''}`}
              onClick={() => setActiveReturnTab('gstr1')}
              style={{ fontSize: 13, borderColor: '#ddd6fe' }}
            >
              GSTR-1 / IFF Only ({data.gstr1?.length || 0})
            </button>
          </div>

          {/* GSTR-3B TABLE */}
          {(activeReturnTab === 'both' || activeReturnTab === 'gstr3b') && (
            <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
              <div className="card-head" style={{ borderBottomColor: '#ede9fe', background: '#faf5ff' }}>
                <div>
                  <h3 style={{ color: '#3b0764' }}>📑 GSTR-3B (Monthly Summary Return)</h3>
                  <p style={{ color: '#6d28d9' }}>Self-assessed summary return of outward & inward supplies and input tax credit (ITC).</p>
                </div>
                <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>
                  FY {data.selectedYear}
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Financial Year</th>
                        <th>Tax Period</th>
                        <th>Date of Filing</th>
                        <th>Mode of Filing</th>
                        <th>Status</th>
                        <th>ARN Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.gstr3b || []).map((row, idx) => (
                        <tr key={idx}>
                          <td><strong>{row.fy}</strong></td>
                          <td>
                            <strong style={{ color: '#7c3aed' }}>{row.taxp}</strong>
                          </td>
                          <td style={{ fontSize: 13 }}>{row.dof || 'N/A'}</td>
                          <td>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{row.mof || 'ONLINE'}</span>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: row.status === 'Filed' ? 'rgba(22, 167, 101, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: row.status === 'Filed' ? '#16a765' : '#dc2626',
                                borderColor: row.status === 'Filed' ? '#16a765' : '#dc2626',
                                fontWeight: 700
                              }}
                            >
                              ✓ {row.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#581c87' }}>
                            {row.arn || 'NA'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* GSTR-1 TABLE */}
          {(activeReturnTab === 'both' || activeReturnTab === 'gstr1') && (
            <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
              <div className="card-head" style={{ borderBottomColor: '#ede9fe', background: '#faf5ff' }}>
                <div>
                  <h3 style={{ color: '#3b0764' }}>📑 GSTR-1 / IFF (Outward Supplies Return)</h3>
                  <p style={{ color: '#6d28d9' }}>Details of outward supplies of goods and services rendered to buyers.</p>
                </div>
                <span className="badge" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>
                  FY {data.selectedYear}
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Financial Year</th>
                        <th>Tax Period</th>
                        <th>Date of Filing</th>
                        <th>Mode of Filing</th>
                        <th>Status</th>
                        <th>ARN Number</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.gstr1 || []).map((row, idx) => (
                        <tr key={idx}>
                          <td><strong>{row.fy}</strong></td>
                          <td>
                            <strong style={{ color: '#7c3aed' }}>{row.taxp}</strong>
                          </td>
                          <td style={{ fontSize: 13 }}>{row.dof || 'N/A'}</td>
                          <td>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{row.mof || 'ONLINE'}</span>
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: row.status === 'Filed' ? 'rgba(22, 167, 101, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: row.status === 'Filed' ? '#16a765' : '#dc2626',
                                borderColor: row.status === 'Filed' ? '#16a765' : '#dc2626',
                                fontWeight: 700
                              }}
                            >
                              ✓ {row.status}
                            </span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#581c87' }}>
                            {row.arn || 'NA'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
