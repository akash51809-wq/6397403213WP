import React, { useRef, useState, useEffect } from 'react'
import api from '../../services/api'

export function PaymentDetailsModal({ plan, walletBalance = 0, onClose, onSuccess, notify, onOpenAddFunds }) {
  const planPrice = Number(plan?.price || 0)
  const currentBalance = Number(walletBalance || 0)
  const hasEnoughWalletBalance = currentBalance >= planPrice

  const [paymentMode, setPaymentMode] = useState(hasEnoughWalletBalance ? 'wallet' : 'bank')
  const [amount, setAmount] = useState(plan.price)
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

  // Instant Activation via Wallet
  const handleWalletPay = async () => {
    if (currentBalance < planPrice) {
      notify(`अपर्याप्त वॉलेट बैलेंस! प्लान की कीमत ₹${planPrice} है और आपका वर्तमान वॉलेट बैलेंस ₹${currentBalance} है।`)
      if (onOpenAddFunds) onOpenAddFunds()
      return
    }

    setSubmitting(true)
    try {
      const d = await api('/api/plans/purchase-wallet', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.planId,
          service: plan.service || 'whatsapp'
        })
      })

      if (d.success) {
        notify(d.message || `प्लान '${plan.name}' वॉलेट बैलेंस से तुरंत एक्टिवेट हो गया है!`)
        onSuccess()
      } else {
        notify(d.message || 'वॉलेट से भुगतान विफल')
      }
    } catch (err) {
      notify('Wallet Purchase Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Manual Bank / UPI Purchase Request
  const handleSubmitBankTransfer = async (e) => {
    e.preventDefault()
    if (!bankDetails.trim()) {
      return notify('कृपया Payment / Bank / UTR Details अवश्य भरें।')
    }

    setSubmitting(true)
    try {
      const d = await api('/api/plans/purchase', {
        method: 'POST',
        body: JSON.stringify({
          planId: plan.planId,
          service: plan.service || 'whatsapp',
          amount: Number(amount) || plan.price,
          paymentDate,
          bankDetails: bankDetails.trim(),
          screenshot,
          notes: notes.trim()
        })
      })

      if (d.success) {
        notify('आपकी पेमेंट रिक्वेस्ट सफलतापूर्वक सबमिट हो गई है! एडमिन द्वारा सत्यापन के बाद प्लान एक्टिवेट हो जाएगा।')
        onSuccess()
      } else {
        notify(d.message || 'अनुरोध सबमिट करने में विफल')
      }
    } catch (e) {
      notify('रिक्वेस्ट सबमिट करने में त्रुटि: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content-card" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: 580, width: '92%', borderRadius: 18, maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="modal-header d-flex align-items-center justify-content-between" style={{ padding: '18px 24px', borderBottom: '1px solid var(--zd-border, #eef2f6)' }}>
          <div>
            <h5 className="modal-title font-weight-bold m-0" style={{ fontSize: 18, color: 'inherit' }}>
              💳 Subscribe to {plan.name} Plan
            </h5>
            <small className="text-muted">Choose your preferred payment method to activate this subscription.</small>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#8a98ac', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {/* Selected Plan Summary Card */}
          <div className="card p-3 mb-3" style={{ borderRadius: 12, background: 'var(--zd-border-subtle, rgba(0,0,0,0.02))', border: '1px solid var(--zd-border, #eef2f6)' }}>
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div>
                <span className="badge badge-primary-light" style={{ fontSize: 11, padding: '3px 8px', marginBottom: 4, display: 'inline-block' }}>
                  {plan.service ? `${plan.service.toUpperCase()} PLAN` : 'SELECTED PLAN'}
                </span>
                <h4 className="m-0 font-weight-bold" style={{ fontSize: 18, color: 'inherit' }}>{plan.name}</h4>
              </div>
              <div className="text-right">
                <span style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>₹{plan.price}</span>
                <small className="text-muted d-block" style={{ fontSize: 11 }}>/ {plan.validity || `${plan.validityDays} Days`}</small>
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 text-muted" style={{ gap: 12, fontSize: 12, borderTop: '1px solid var(--zd-border, rgba(0,0,0,0.05))', paddingTop: 8 }}>
              {plan.dailyLimit && <div>✓ <strong>Limit:</strong> {plan.dailyLimit}</div>}
              {plan.hits && <div>✓ <strong>Hits:</strong> {Number(plan.hits).toLocaleString()}</div>}
              {plan.deviceLimit && <div>✓ <strong>Access:</strong> {plan.deviceLimit}</div>}
              {plan.apiAccess && <div>✓ <strong>API Access</strong></div>}
              {plan.incomingAllowed && <div>✓ <strong>Incoming SMS</strong></div>}
              {plan.outgoingAllowed && <div>✓ <strong>Outgoing SMS</strong></div>}
            </div>
          </div>

          {/* Payment Method Selector Tabs */}
          <div className="d-flex gap-2 mb-3" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={() => setPaymentMode('wallet')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: paymentMode === 'wallet' ? '2px solid #10b981' : '1px solid #e2e8f0',
                background: paymentMode === 'wallet' ? '#ecfdf5' : '#f8fafc',
                color: paymentMode === 'wallet' ? '#065f46' : '#475569',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 16 }}>👛 Wallet Balance</div>
              <small style={{ fontSize: 11, fontWeight: 600, color: hasEnoughWalletBalance ? '#059669' : '#dc2626' }}>
                Balance: ₹{currentBalance.toFixed(2)} {hasEnoughWalletBalance ? '(Instant)' : '(Insufficient)'}
              </small>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('bank')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 10,
                border: paymentMode === 'bank' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: paymentMode === 'bank' ? '#f0f9ff' : '#f8fafc',
                color: paymentMode === 'bank' ? '#0369a1' : '#475569',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 16 }}>🏦 Bank / UPI Transfer</div>
              <small style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>
                Submit UTR / Payment slip
              </small>
            </button>
          </div>

          {/* MODE 1: INSTANT WALLET PAYMENT */}
          {paymentMode === 'wallet' && (
            <div className="card p-3 mb-2" style={{ borderRadius: 12, border: '1px solid #10b98140', background: '#f0fdf4' }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <strong style={{ fontSize: 14, color: '#065f46' }}>Instant Wallet Payment</strong>
                  <div style={{ fontSize: 12, color: '#047857' }}>
                    No admin approval needed. Plan activates immediately!
                  </div>
                </div>
                <span style={{ fontSize: 24 }}>⚡</span>
              </div>

              <div style={{ background: '#fff', borderRadius: 8, padding: 12, border: '1px solid #d1fae5', marginBottom: 14 }}>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}>
                  <span className="text-muted">Plan Amount:</span>
                  <strong>₹{planPrice}</strong>
                </div>
                <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}>
                  <span className="text-muted">Current Wallet Balance:</span>
                  <strong style={{ color: hasEnoughWalletBalance ? '#059669' : '#dc2626' }}>₹{currentBalance.toFixed(2)}</strong>
                </div>
                <div className="d-flex justify-content-between pt-1" style={{ fontSize: 13, borderTop: '1px dashed #e2e8f0' }}>
                  <span className="text-muted">Balance After Purchase:</span>
                  <strong style={{ color: hasEnoughWalletBalance ? '#059669' : '#dc2626' }}>
                    ₹{hasEnoughWalletBalance ? (currentBalance - planPrice).toFixed(2) : '0.00'}
                  </strong>
                </div>
              </div>

              {hasEnoughWalletBalance ? (
                <button
                  type="button"
                  className="btn btn-success w-100 py-2"
                  disabled={submitting}
                  onClick={handleWalletPay}
                  style={{ borderRadius: 8, fontWeight: 700, fontSize: 14, background: '#10b981', borderColor: '#10b981' }}
                >
                  {submitting ? '⏳ Activating Plan...' : `⚡ Pay ₹${planPrice} & Activate Plan Instantly`}
                </button>
              ) : (
                <div>
                  <div className="alert alert-warning p-2 mb-2" style={{ fontSize: 12 }}>
                    ⚠️ आपका वॉलेट बैलेंस कम है (कमी: <strong>₹{(planPrice - currentBalance).toFixed(2)}</strong>)। पहले वॉलेट में फंड जोड़ें या बैंक/UPI से भुगतान करें।
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-success w-100"
                    onClick={() => {
                      onClose()
                      if (onOpenAddFunds) onOpenAddFunds()
                    }}
                    style={{ borderRadius: 8, fontWeight: 700, fontSize: 13 }}
                  >
                    + Add Funds to Wallet (वॉलेट में फंड जोड़ें)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: MANUAL BANK / UPI PAYMENT */}
          {paymentMode === 'bank' && (
            <form onSubmit={handleSubmitBankTransfer}>
              {/* Admin Bank & UPI Instructions Box */}
              <div className="alert alert-info mb-3" style={{ borderRadius: 12, padding: '10px 14px', fontSize: 12, lineHeight: 1.5 }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>🏦 Transfer To Account:</strong>
                <div>Bank / Company: <strong>{companySettings?.companyName || 'Easy Recharge Solution'}</strong></div>
                <div>UPI ID: <strong style={{ color: '#0284c7' }}>{companySettings?.contactWhatsApp ? `${companySettings.contactWhatsApp.replace(/\D/g, '')}@upi` : 'ersolution@upi'}</strong></div>
                <small className="text-muted d-block mt-1">Pay ₹{planPrice} and enter your transaction UTR reference below:</small>
              </div>

              {/* Form Fields: Amount & Payment Date */}
              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Payment Amount (राशि ₹) *
                  </label>
                  <div className="input-group">
                    <span className="input-group-text" style={{ borderRadius: '8px 0 0 8px', fontWeight: 700 }}>₹</span>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      min="1"
                      required
                      style={{ height: 40, borderRadius: '0 8px 8px 0' }}
                    />
                  </div>
                </div>
                <div className="col-sm-6">
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
              </div>

              {/* Bank Details & UTR */}
              <div className="form-group mb-3">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Bank / UPI / UTR Transaction ID *
                </label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={bankDetails}
                  onChange={e => setBankDetails(e.target.value)}
                  placeholder="e.g. Paid via GPay. UTR: 328491823901, Sender: HDFC"
                  required
                  style={{ borderRadius: 8, padding: '8px 12px', fontSize: 12 }}
                />
              </div>

              {/* Screenshot Upload (Optional) */}
              <div className="form-group mb-3">
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  Payment Screenshot (स्क्रीनशॉट - वैकल्पिक)
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="form-control"
                  style={{ height: 38, borderRadius: 8, padding: '5px 12px' }}
                />

                {screenshotPreview && (
                  <div className="mt-2 position-relative d-inline-block">
                    <img 
                      src={screenshotPreview} 
                      alt="Receipt Preview" 
                      style={{ maxHeight: 90, borderRadius: 8, border: '1px solid #d0d7de', display: 'block' }}
                    />
                    <button 
                      type="button" 
                      onClick={removeScreenshot}
                      className="btn btn-sm btn-danger"
                      style={{ position: 'absolute', top: 4, right: 4, borderRadius: '50%', width: 22, height: 22, padding: 0, lineHeight: 1 }}
                      title="Remove Image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-end gap-2 pt-2" style={{ borderTop: '1px solid #eef2f6', gap: 10 }}>
                <button 
                  type="button" 
                  className="btn btn-outline-secondary" 
                  onClick={onClose}
                  style={{ borderRadius: 8, padding: '7px 16px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ borderRadius: 8, padding: '7px 20px', fontWeight: 700 }}
                >
                  {submitting ? '⏳ Submitting...' : 'Submit Payment Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
export default PaymentDetailsModal
