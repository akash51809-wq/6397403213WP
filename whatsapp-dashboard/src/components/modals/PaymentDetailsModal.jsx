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
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div 
        className="modal-content-card" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 540, 
          width: '100%', 
          borderRadius: 20, 
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          border: '1px solid #e2e8f0',
          maxHeight: '92vh', 
          overflowY: 'auto' 
        }}
      >
        {/* Modal Header */}
        <div 
          style={{ 
            padding: '20px 24px 16px', 
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 18 }}>💳</span>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Activate {plan.name} Plan
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>
              Select your payment method to activate subscription instantly.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ 
              background: '#f1f5f9', 
              border: 'none', 
              width: 32,
              height: 32,
              borderRadius: '50%',
              fontSize: 18, 
              cursor: 'pointer', 
              color: '#64748b', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              transition: 'all 0.15s ease'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Selected Plan Summary Banner */}
          <div 
            style={{ 
              borderRadius: 14, 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              border: '1px solid #e2e8f0',
              padding: '16px 18px',
              marginBottom: 18
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span 
                  style={{ 
                    fontSize: 10.5, 
                    fontWeight: 800, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em',
                    padding: '3px 8px', 
                    borderRadius: 6,
                    background: '#e0e7ff',
                    color: '#4338ca',
                    display: 'inline-block',
                    marginBottom: 4
                  }}
                >
                  {plan.service ? `${plan.service.toUpperCase()} SERVICE` : 'SUBSCRIPTION'}
                </span>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a' }}>
                  {plan.name}
                </h4>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#10b981', lineHeight: 1 }}>
                  ₹{plan.price}
                </div>
                <small style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  {plan.isUnlimitedValidity ? 'Lifetime Validity' : `/ ${plan.validity || `${plan.validityDays} Days`}`}
                </small>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', fontSize: 12, color: '#475569', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              {plan.dailyLimit && <div>✓ <strong>Limit:</strong> {plan.dailyLimit}</div>}
              {plan.hits && <div>✓ <strong>Hits:</strong> {Number(plan.hits).toLocaleString()}</div>}
              {plan.deviceLimit && <div>✓ <strong>Devices:</strong> {plan.deviceLimit}</div>}
              {plan.apiAccess && <div>✓ <strong>API Access</strong></div>}
              {plan.incomingAllowed && <div>✓ <strong>Incoming SMS</strong></div>}
              {plan.outgoingAllowed && <div>✓ <strong>Outgoing SMS</strong></div>}
            </div>
          </div>

          {/* Payment Method Selector Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setPaymentMode('wallet')}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: paymentMode === 'wallet' ? '2px solid #10b981' : '1px solid #e2e8f0',
                background: paymentMode === 'wallet' ? '#f0fdf4' : '#ffffff',
                color: paymentMode === 'wallet' ? '#065f46' : '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: paymentMode === 'wallet' ? '0 4px 12px rgba(16,185,129,0.15)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>👛 Wallet Pay</span>
                <span 
                  style={{ 
                    fontSize: 10, 
                    fontWeight: 800, 
                    padding: '2px 6px', 
                    borderRadius: 999, 
                    background: hasEnoughWalletBalance ? '#10b981' : '#f59e0b',
                    color: '#ffffff'
                  }}
                >
                  {hasEnoughWalletBalance ? 'Instant' : 'Low Bal'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Bal: <strong>₹{currentBalance.toFixed(2)}</strong>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMode('bank')}
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                border: paymentMode === 'bank' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: paymentMode === 'bank' ? '#f0f9ff' : '#ffffff',
                color: paymentMode === 'bank' ? '#0369a1' : '#334155',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: paymentMode === 'bank' ? '0 4px 12px rgba(2,132,199,0.15)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 800 }}>🏦 Bank / UPI</span>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: '#e0f2fe', color: '#0369a1' }}>
                  Manual
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Submit UTR slip
              </div>
            </button>
          </div>

          {/* MODE 1: INSTANT WALLET PAYMENT */}
          {paymentMode === 'wallet' && (
            <div 
              style={{ 
                borderRadius: 14, 
                border: '1px solid #bbf7d0', 
                background: '#f0fdf4', 
                padding: '16px 18px',
                marginBottom: 8
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <strong style={{ fontSize: 14, color: '#065f46' }}>Instant Wallet Payment</strong>
                  <div style={{ fontSize: 12, color: '#047857' }}>
                    Plan activates immediately without waiting for admin approval.
                  </div>
                </div>
                <span style={{ fontSize: 24 }}>⚡</span>
              </div>

              <div 
                style={{ 
                  background: '#ffffff', 
                  borderRadius: 10, 
                  padding: '12px 14px', 
                  border: '1px solid #d1fae5', 
                  marginBottom: 16 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Plan Price:</span>
                  <strong style={{ color: '#0f172a' }}>₹{planPrice}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#64748b' }}>Your Wallet Balance:</span>
                  <strong style={{ color: hasEnoughWalletBalance ? '#059669' : '#dc2626' }}>
                    ₹{currentBalance.toFixed(2)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 13, borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ color: '#64748b' }}>Balance After Purchase:</span>
                  <strong style={{ color: hasEnoughWalletBalance ? '#059669' : '#dc2626' }}>
                    ₹{hasEnoughWalletBalance ? (currentBalance - planPrice).toFixed(2) : '0.00'}
                  </strong>
                </div>
              </div>

              {hasEnoughWalletBalance ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleWalletPay}
                  style={{ 
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: 10, 
                    fontWeight: 800, 
                    fontSize: 14, 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all 0.18s ease'
                  }}
                >
                  {submitting ? '⏳ Activating Plan...' : `⚡ Pay ₹${planPrice} & Activate Plan Instantly`}
                </button>
              ) : (
                <div>
                  <div 
                    style={{ 
                      background: '#fffbeb', 
                      border: '1px solid #fde68a', 
                      borderRadius: 10, 
                      padding: '10px 14px', 
                      marginBottom: 12, 
                      fontSize: 12.5, 
                      color: '#92400e',
                      lineHeight: 1.4
                    }}
                  >
                    ⚠️ Insufficient wallet balance (Short by <strong>₹{(planPrice - currentBalance).toFixed(2)}</strong>). Top-up your wallet first or pay via Bank / UPI transfer.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      if (onOpenAddFunds) onOpenAddFunds()
                    }}
                    style={{ 
                      width: '100%',
                      padding: '10px 16px',
                      borderRadius: 10, 
                      fontWeight: 800, 
                      fontSize: 13,
                      background: '#ffffff',
                      color: '#059669',
                      border: '2px solid #10b981',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <span>➕</span> Add Funds to Wallet (वॉलेट में फंड जोड़ें)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2: MANUAL BANK / UPI PAYMENT */}
          {paymentMode === 'bank' && (
            <form onSubmit={handleSubmitBankTransfer}>
              {/* Admin Bank & UPI Instructions Box */}
              <div 
                style={{ 
                  borderRadius: 12, 
                  padding: '12px 14px', 
                  fontSize: 12.5, 
                  lineHeight: 1.5,
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  color: '#0369a1',
                  marginBottom: 14
                }}
              >
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0c4a6e' }}>
                  🏦 Bank &amp; UPI Account Details:
                </strong>
                <div>Company: <strong>{companySettings?.companyName || 'Easy Recharge Solution'}</strong></div>
                <div>UPI ID: <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{companySettings?.contactWhatsApp ? `${companySettings.contactWhatsApp.replace(/\D/g, '')}@upi` : 'ersolution@upi'}</strong></div>
                <small style={{ color: '#0284c7', display: 'block', marginTop: 4 }}>
                  Transfer ₹{planPrice} and submit your UTR / transaction ID below:
                </small>
              </div>

              {/* Form Fields: Amount & Payment Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Payment Amount (₹) *
                  </label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="1"
                    required
                    style={{ height: 40, borderRadius: 8, fontSize: 13, padding: '0 10px', border: '1px solid #cbd5e1', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                    Payment Date *
                  </label>
                  <input 
                    type="date" 
                    className="form-control" 
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    required
                    style={{ height: 40, borderRadius: 8, fontSize: 13, padding: '0 10px', border: '1px solid #cbd5e1', width: '100%' }}
                  />
                </div>
              </div>

              {/* Bank Details & UTR */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Bank / UPI / UTR Transaction ID *
                </label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={bankDetails}
                  onChange={e => setBankDetails(e.target.value)}
                  placeholder="e.g. Paid via PhonePe. UTR: 328491823901, Sender: HDFC"
                  required
                  style={{ borderRadius: 8, padding: '8px 12px', fontSize: 12.5, border: '1px solid #cbd5e1', width: '100%' }}
                />
              </div>

              {/* Screenshot Upload (Optional) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#334155' }}>
                  Payment Screenshot (Optional)
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ height: 38, borderRadius: 8, padding: '6px 10px', fontSize: 12, border: '1px solid #cbd5e1', width: '100%' }}
                />

                {screenshotPreview && (
                  <div style={{ marginTop: 8, position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={screenshotPreview} 
                      alt="Receipt Preview" 
                      style={{ maxHeight: 80, borderRadius: 8, border: '1px solid #cbd5e1', display: 'block' }}
                    />
                    <button 
                      type="button" 
                      onClick={removeScreenshot}
                      style={{ position: 'absolute', top: -6, right: -6, borderRadius: '50%', width: 22, height: 22, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', lineHeight: 1 }}
                      title="Remove Image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
                <button 
                  type="button" 
                  onClick={onClose}
                  style={{ borderRadius: 8, padding: '8px 16px', fontWeight: 600, fontSize: 13, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  style={{ 
                    borderRadius: 8, 
                    padding: '8px 20px', 
                    fontWeight: 700, 
                    fontSize: 13, 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
                    color: '#ffffff', 
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
                  }}
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
