import React, { useRef, useState, useEffect } from 'react'
import api from '../../services/api'

export default function AddFundsModal({ onClose, onSuccess, notify }) {
  const [amount, setAmount] = useState('500')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [bankDetails, setBankDetails] = useState('')
  const [notes, setNotes] = useState('')
  const [screenshot, setScreenshot] = useState('')
  const [screenshotPreview, setScreenshotPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [companySettings, setCompanySettings] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    api('/api/settings/company')
      .then(res => {
        if (res && res.success && res.settings) {
          setCompanySettings(res.settings)
        }
      })
      .catch(() => {})
  }, [])

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      return notify('फाइल का आकार 5MB से कम होना चाहिए।')
    }

    const reader = new FileReader()
    reader.onload = () => {
      setScreenshot(reader.result)
      setScreenshotPreview(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const removeScreenshot = () => {
    setScreenshot('')
    setScreenshotPreview('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!numAmount || numAmount <= 0) {
      return notify('कृपया एक वैध राशि (Amount) दर्ज करें।')
    }
    if (!bankDetails.trim()) {
      return notify('कृपया UTR नंबर या Bank Transaction Reference अवश्य भरें।')
    }

    setSubmitting(true)
    try {
      const d = await api('/api/wallet/topup-request', {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          paymentDate,
          bankDetails: bankDetails.trim(),
          screenshot,
          notes: notes.trim()
        })
      })

      if (d.success) {
        notify('वॉलेट टॉप-अप रिक्वेस्ट सफलतापूर्वक सबमिट हो गई है! एडमिन सत्यापन के बाद फंड आपके वॉलेट में जोड़ दिया जाएगा।')
        if (onSuccess) onSuccess()
        onClose()
      } else {
        notify(d.message || 'टॉप-अप अनुरोध सबमिट करने में विफल')
      }
    } catch (e) {
      notify('रिक्वेस्ट सबमिट करने में त्रुटि: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const quickAmounts = ['100', '200', '500', '1000', '2000']

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content-card" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 560, width: '92%', borderRadius: 18, maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header d-flex align-items-center justify-content-between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
          <div>
            <h5 className="modal-title font-weight-bold m-0" style={{ fontSize: 18, color: 'inherit', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>👛</span> Add Funds to Wallet (वॉलेट टॉप-अप)
            </h5>
            <small className="text-muted">Top up your balance to instantly activate WhatsApp, SMS, Plan &amp; GST services.</small>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8a98ac', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '22px 24px' }}>
            {/* Amount Selection */}
            <div className="form-group mb-3">
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Enter Top-up Amount (जोड़ने हेतु राशि INR) *
              </label>
              <div className="input-group mb-2">
                <span className="input-group-text" style={{ borderRadius: '8px 0 0 8px', fontWeight: 700, fontSize: 16 }}>₹</span>
                <input 
                  type="number"
                  className="form-control"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="500"
                  min="10"
                  required
                  style={{ height: 44, borderRadius: '0 8px 8px 0', fontSize: 18, fontWeight: 700 }}
                />
              </div>
              {/* Quick Select Buttons */}
              <div className="d-flex flex-wrap gap-2" style={{ gap: 8 }}>
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: 700,
                      border: amount === val ? '1px solid #10b981' : '1px solid #e2e8f0',
                      background: amount === val ? '#ecfdf5' : '#f8fafc',
                      color: amount === val ? '#059669' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Official Payment Accounts Card */}
            <div className="card p-3 mb-3" style={{ borderRadius: 12, background: 'var(--zd-border-subtle, #f8fafc)', border: '1px solid var(--zd-border, #eef2f6)' }}>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <strong style={{ fontSize: 13, color: '#059669' }}>🏦 Payment Deposit Details (भुगतान खाता विवरण)</strong>
                <span className="badge badge-success-light" style={{ fontSize: 10, padding: '2px 6px' }}>Verified</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--zd-text-muted, #64748b)', margin: '0 0 8px 0' }}>
                कृपया नीचे दिए गए बैंक खाते या UPI पर राशि ट्रांसफर करें और UTR / Ref No दर्ज करें:
              </p>
              <div style={{ fontSize: 12, lineHeight: 1.6, background: '#fff', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div><strong>Bank Name:</strong> {companySettings?.contactBusinessEnquiry || 'State Bank of India / HDFC'}</div>
                <div><strong>UPI ID:</strong> <span style={{ fontFamily: 'monospace', color: '#0284c7', fontWeight: 700 }}>{companySettings?.contactWhatsApp ? `${companySettings.contactWhatsApp.replace(/\D/g, '')}@upi` : 'ersolution@upi'}</span></div>
                <div><strong>Company:</strong> {companySettings?.companyName || 'Easy Recharge Solution'}</div>
                <div><strong>Helpdesk:</strong> {companySettings?.contactPhone || '+91 9876543210'}</div>
              </div>
            </div>

            {/* Date and Transaction Info */}
            <div className="row g-3 mb-3">
              <div className="col-md-5">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Payment Date (तारीख) *
                </label>
                <input 
                  type="date"
                  className="form-control"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  required
                  style={{ height: 40, borderRadius: 8 }}
                />
              </div>
              <div className="col-md-7">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  UTR / Txn ID / Reference No *
                </label>
                <input 
                  type="text"
                  className="form-control"
                  value={bankDetails}
                  onChange={e => setBankDetails(e.target.value)}
                  placeholder="e.g. UPI/428394839281 or IMPS Ref"
                  required
                  style={{ height: 40, borderRadius: 8 }}
                />
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="form-group mb-3">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Upload Payment Screenshot (स्क्रीनशॉट रसीद)
              </label>
              <input 
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="form-control"
                style={{ borderRadius: 8, height: 38 }}
              />
              <small className="text-muted" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                Optional: Upload receipt for faster verification (JPG, PNG, WebP up to 5MB).
              </small>

              {screenshotPreview && (
                <div className="mt-2 position-relative" style={{ display: 'inline-block' }}>
                  <img 
                    src={screenshotPreview} 
                    alt="Receipt preview" 
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #10b981' }}
                  />
                  <button
                    type="button"
                    onClick={removeScreenshot}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: 20,
                      height: 20,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            {/* User Notes */}
            <div className="form-group mb-2">
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Additional Notes (वैकल्पिक टिप्पणी)
              </label>
              <input 
                type="text"
                className="form-control"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Paid from Google Pay / PhonePe"
                style={{ height: 40, borderRadius: 8 }}
              />
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-end gap-2" style={{ padding: '14px 24px', borderTop: '1px solid var(--zd-border, #eef2f6)', gap: 10 }}>
            <button 
              type="button" 
              className="btn btn-outline-secondary" 
              onClick={onClose}
              style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-success"
              disabled={submitting}
              style={{ borderRadius: 8, padding: '8px 22px', fontWeight: 700, background: '#10b981', borderColor: '#10b981' }}
            >
              {submitting ? '⏳ Submitting...' : `Submit Top-up (₹${amount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
