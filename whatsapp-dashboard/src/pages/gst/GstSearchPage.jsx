import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'

export default function GstSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialGstin = searchParams.get('gstin') || '09AKPPG5665E1ZU'

  const [gstinInput, setGstinInput] = useState(initialGstin)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('registration')

  useEffect(() => {
    if (initialGstin) {
      executeSearch(initialGstin)
    }
  }, [initialGstin])

  const executeSearch = async (gstinToQuery) => {
    const clean = String(gstinToQuery || gstinInput).trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (clean.length !== 15) {
      setError('कृपया 15-अंकों का मान्य GSTIN नंबर दर्ज करें (उदा: 19MAJPS4713H1Z3)।')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/gst/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin: clean })
      })
      const result = await res.json()
      if (result.success && result.data) {
        setData(result.data)
        setSearchParams({ gstin: clean })
      } else {
        setError(result.message || 'Taxpayer details not found for this GSTIN.')
        setData(null)
      }
    } catch (err) {
      setError('Network error while searching GSTIN: ' + err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    executeSearch(gstinInput)
  }

  const copyJson = () => {
    if (!data) return
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="content">
      {/* Top Header */}
      <div className="hero" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow" style={{ color: '#7c3aed' }}>GST PORTAL VERIFICATION</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span>🔍</span> Taxpayer Details Search
          </h1>
          <p style={{ maxWidth: 680, color: '#581c87' }}>
            Verify registered business identity, trade name, constitution, jurisdictions, and Aadhaar authentication status.
          </p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: '1 1 360px', position: 'relative' }}>
              <input
                type="text"
                className="input"
                placeholder="Enter 15-character GSTIN (e.g. 19MAJPS4713H1Z3)"
                value={gstinInput}
                maxLength={15}
                onChange={(e) => {
                  setGstinInput(e.target.value.toUpperCase())
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
                {gstinInput.length}/15
              </span>
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={loading}
              style={{ padding: '12px 24px', fontSize: 14, fontWeight: 700 }}
            >
              {loading ? 'Searching...' : 'Search GSTIN ➔'}
            </button>
          </form>

          {error && (
            <div style={{ marginTop: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Quick Click Samples */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600 }}>Sample GSTINs:</span>
            {['09AKPPG5665E1ZU', '19MAJPS4713H1Z3', '27AAACR4849R1ZZ'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setGstinInput(s)
                  executeSearch(s)
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

      {/* Taxpayer Details Card */}
      {data && (
        <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
          <div
            className="card-head"
            style={{
              borderBottomColor: '#ede9fe',
              background: 'linear-gradient(135deg, #fcfaff, #f5f3ff)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, color: '#3b0764', fontSize: 20 }}>
                  {data.tradeName || data.legalName}
                </h2>
                <span
                  className="badge"
                  style={{
                    background: data.status === 'Active' ? 'rgba(22, 167, 101, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    color: data.status === 'Active' ? '#16a765' : '#dc2626',
                    borderColor: data.status === 'Active' ? '#16a765' : '#dc2626',
                    fontWeight: 700,
                    fontSize: 12
                  }}
                >
                  ● {data.status}
                </span>
                <span
                  style={{
                    background: '#ede9fe',
                    color: '#6d28d9',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'monospace'
                  }}
                >
                  {data.gstin}
                </span>
              </div>
              {data.legalName && data.legalName !== data.tradeName && (
                <p style={{ margin: '4px 0 0', color: '#6d28d9', fontSize: 13 }}>
                  Legal Name: <strong>{data.legalName}</strong> · State: <strong>{data.state}</strong>
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                to={`/gst/filings?gstin=${encodeURIComponent(data.gstin)}`}
                className="btn primary"
                style={{ fontSize: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>📊</span> Show Filing Table
              </Link>
              <button
                type="button"
                className="btn"
                onClick={copyJson}
                style={{ fontSize: 12, borderColor: '#ddd6fe', color: '#6d28d9' }}
              >
                {copied ? '✓ Copied' : 'Copy JSON'}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #ede9fe', background: '#faf5ff', padding: '0 16px', gap: 8, overflowX: 'auto' }}>
            {[
              { id: 'registration', label: 'Registration Info' },
              { id: 'jurisdiction', label: 'Jurisdiction & Offices' },
              { id: 'address', label: 'Principal Place' },
              { id: 'compliance', label: 'Aadhaar & e-KYC' },
              { id: 'hsn', label: 'Goods & Services (HSN)' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
                  color: activeTab === tab.id ? '#7c3aed' : '#6b7280',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card-body" style={{ padding: 24 }}>
            {/* TAB 1: REGISTRATION INFO */}
            {activeTab === 'registration' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Legal Name of Business</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.legalName}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Trade Name</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.tradeName || 'Not Applicable'}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Effective Date of Registration</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.registrationDate}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Constitution of Business</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.constitutionOfBusiness}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Taxpayer Type</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.taxpayerType}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Permanent Account Number (PAN)</small>
                  <strong style={{ fontSize: 15, color: '#7c3aed', fontFamily: 'monospace' }}>{data.pan}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>e-Invoice Enabled</small>
                  <strong style={{ fontSize: 15, color: '#16a765' }}>{data.einvoiceStatus || 'Yes'}</strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 14, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Core Business Activity</small>
                  <strong style={{ fontSize: 15, color: '#3b0764' }}>{data.coreActivity || 'Service Provider and Others'}</strong>
                </div>
              </div>
            )}

            {/* TAB 2: JURISDICTIONS */}
            {activeTab === 'jurisdiction' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <div style={{ background: '#fcfaff', padding: 16, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🏛️</span>
                    <strong style={{ color: '#7c3aed', fontSize: 14 }}>Administrative Office (Center Jurisdiction)</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#3b0764' }}>
                    {data.centerJurisdiction || 'Center Jurisdiction details on record'}
                  </p>
                </div>

                <div style={{ background: '#fcfaff', padding: 16, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 18 }}>🏢</span>
                    <strong style={{ color: '#7c3aed', fontSize: 14 }}>Other Office (State Jurisdiction)</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: '#3b0764' }}>
                    {data.stateJurisdiction || 'State Jurisdiction details on record'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PRINCIPAL PLACE OF BUSINESS */}
            {activeTab === 'address' && (
              <div style={{ background: '#fcfaff', padding: 18, borderRadius: 8, border: '1px solid #ede9fe' }}>
                <small style={{ color: '#6d28d9', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  📍 Registered Principal Place of Business:
                </small>
                <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: '#3b0764', fontWeight: 500 }}>
                  {data.principalAddress}
                </p>
                <div style={{ marginTop: 14, display: 'flex', gap: 16, fontSize: 13, color: '#6d28d9' }}>
                  <span>State: <strong>{data.state} (Code: {data.stateCode})</strong></span>
                  <span>Country: <strong>India</strong></span>
                </div>
              </div>
            )}

            {/* TAB 4: COMPLIANCE & AADHAAR */}
            {activeTab === 'compliance' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                <div style={{ background: '#fcfaff', padding: 16, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Whether Aadhaar Authenticated?</small>
                  <strong style={{ fontSize: 16, color: data.aadhaarAuthenticated === 'Yes' ? '#16a765' : '#dc2626' }}>
                    {data.aadhaarAuthenticated || 'Yes'}
                  </strong>
                  {data.aadhaarAuthDate && (
                    <span style={{ display: 'block', fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      Authenticated On: {data.aadhaarAuthDate}
                    </span>
                  )}
                </div>

                <div style={{ background: '#fcfaff', padding: 16, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Whether e-KYC Verified?</small>
                  <strong style={{ fontSize: 16, color: '#3b0764' }}>
                    {data.ekycVerified || 'Not Applicable'}
                  </strong>
                </div>

                <div style={{ background: '#fcfaff', padding: 16, borderRadius: 8, border: '1px solid #ede9fe' }}>
                  <small style={{ color: '#6d28d9', display: 'block', fontWeight: 600 }}>Field Visit Conducted?</small>
                  <strong style={{ fontSize: 16, color: '#3b0764' }}>
                    No
                  </strong>
                </div>
              </div>
            )}

            {/* TAB 5: NATURE OF BUSINESS & HSN */}
            {activeTab === 'hsn' && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: '#6d28d9', fontSize: 13, display: 'block', marginBottom: 6 }}>
                    Nature of Core Business Activities:
                  </strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(data.natureOfBusiness || ['Retail Business']).map((act, i) => (
                      <span key={i} style={{ background: '#ede9fe', color: '#6d28d9', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        ✓ {act}
                      </span>
                    ))}
                  </div>
                </div>

                <strong style={{ color: '#3b0764', fontSize: 14, display: 'block', marginBottom: 8 }}>
                  Dealing In Goods & Services (HSN Code List):
                </strong>
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>HSN / SAC Code</th>
                        <th>Description of Goods / Services</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.hsnServices || []).map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <span className="badge" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                              {item.type || 'Services'}
                            </span>
                          </td>
                          <td>
                            <strong style={{ fontFamily: 'monospace', color: '#7c3aed' }}>{item.hsn}</strong>
                          </td>
                          <td style={{ color: '#3b0764' }}>{item.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
