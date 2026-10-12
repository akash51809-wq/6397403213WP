import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function SmsWebhookPage() {
  const { notify } = useAuth()
  const [apiKey, setApiKey] = useState('')
  const [defaultWebhookUrl, setDefaultWebhookUrl] = useState('')
  const [defaultSenderWhitelist, setDefaultSenderWhitelist] = useState('*')
  const [retentionHours, setRetentionHours] = useState('48')
  const [saving, setSaving] = useState(false)

  // Test Webhook State
  const [testUrl, setTestUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/sms/settings').then(r => r.json())
      if (res.success && res.settings) {
        setApiKey(res.settings.api_key || '')
        setDefaultWebhookUrl(res.settings.default_webhook_url || '')
        setDefaultSenderWhitelist(res.settings.default_sender_whitelist || '*')
        setRetentionHours(res.settings.retention_hours || '48')
        if (res.settings.default_webhook_url) {
          setTestUrl(res.settings.default_webhook_url)
        }
      }
    } catch (e) {
      console.error('Settings load error:', e)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await fetch('/api/sms/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          defaultWebhookUrl,
          defaultSenderWhitelist,
          retentionHours
        })
      }).then(r => r.json())

      if (res.success) {
        notify('Webhook settings saved successfully!')
      } else {
        notify('Save failed: ' + res.message)
      }
    } catch (err) {
      notify('Settings save error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    const url = testUrl || defaultWebhookUrl
    if (!url) return notify('Kripya test webhook URL enter karein.')

    try {
      setTesting(true)
      setTestResult(null)
      const res = await fetch('/api/sms/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUrl: url, apiKey })
      }).then(r => r.json())

      setTestResult(res.result || res)
      if (res.success) {
        notify('Webhook test successful (HTTP 200)!')
      } else {
        notify('Webhook test failed or non-200 response.')
      }
    } catch (err) {
      notify('Test execution error: ' + err.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="content">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">API & AUTOMATION</span>
          <h1>Webhook Integration</h1>
          <p>Configure endpoint URLs to receive incoming SMS notifications instantly</p>
        </div>
      </div>

      <div className="split" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Left Column: Webhook Settings Form */}
        <div className="card">
          <div className="card-head">
            <div>
              <h3>Global Webhook Configuration</h3>
              <p>Applied to all incoming SMS</p>
            </div>
            <span className="badge success">Active</span>
          </div>
          <form onSubmit={handleSaveSettings} className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Default Webhook URL (HTTP POST Endpoint)</label>
              <input
                type="url"
                className="input"
                placeholder="https://your-crm.com/api/receive-sms"
                value={defaultWebhookUrl}
                onChange={e => {
                  setDefaultWebhookUrl(e.target.value)
                  if (!testUrl) setTestUrl(e.target.value)
                }}
                required
              />
              <small style={{ color: '#64748b', fontSize: 10 }}>Jab bhi naya SMS aayega, ye URL turant call kiya jayega.</small>
            </div>

            <div className="field">
              <label>API Key / Secret Token</label>
              <input
                type="text"
                className="input"
                placeholder="ers_key_8899"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                required
              />
              <small style={{ color: '#64748b', fontSize: 10 }}>Android app aur Webhook delivery verification ke liye use hota hai.</small>
            </div>

            <div className="field">
              <label>Global Sender Whitelist</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. HDFC, VI-OTP, SBI, AMAZON (or * for all)"
                value={defaultSenderWhitelist}
                onChange={e => setDefaultSenderWhitelist(e.target.value)}
              />
              <small style={{ color: '#64748b', fontSize: 10 }}>Sirf in senders ke SMS forward honge. Sabhi SMS ke liye * likhein.</small>
            </div>

            <div className="field">
              <label>Data Retention Hours</label>
              <input
                type="number"
                className="input"
                value={retentionHours}
                onChange={e => setRetentionHours(e.target.value)}
                min={1}
                max={720}
              />
              <small style={{ color: '#64748b', fontSize: 10 }}>Purane SMS itne ghante baad auto-clean ho jayenge.</small>
            </div>

            <button
              type="submit"
              className="btn primary"
              disabled={saving}
              style={{ marginTop: 8, justifyContent: 'center' }}
            >
              {saving ? 'Saving...' : '💾 Save Webhook Settings'}
            </button>
          </form>
        </div>

        {/* Right Column: Webhook Test Tool & Payload Spec */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Live Webhook Tester */}
          <div className="card">
            <div className="card-head">
              <div>
                <h3>Test Webhook Endpoint</h3>
                <p>Send a mock SMS event</p>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="field">
                <label>Test URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://webhook.site/..."
                  value={testUrl}
                  onChange={e => setTestUrl(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn primary"
                disabled={testing}
                onClick={handleTestWebhook}
                style={{ justifyContent: 'center' }}
              >
                {testing ? 'Sending Test Event...' : '🚀 Trigger Test Webhook'}
              </button>

              {testResult && (
                <div style={{
                  background: testResult.success ? 'rgba(14,165,233,0.06)' : 'rgba(239,68,68,0.06)',
                  border: `1px solid ${testResult.success ? 'rgba(14,165,233,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 4
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 11, color: testResult.success ? '#0284c7' : '#ef4444' }}>
                      {testResult.success ? '✓ TEST DELIVERED' : '✗ DELIVERY FAILED'}
                    </strong>
                    <span className="badge" style={{ fontSize: 9 }}>
                      HTTP {testResult.httpStatus || 0} ({testResult.latencyMs || 0}ms)
                    </span>
                  </div>
                  <pre style={{ margin: 0, fontSize: 10, color: '#334155', background: '#fff', padding: 8, borderRadius: 8, overflowX: 'auto' }}>
                    {typeof testResult.responseBody === 'string'
                      ? testResult.responseBody
                      : JSON.stringify(testResult.responseBody || testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Webhook JSON Payload Spec */}
          <div className="card">
            <div className="card-head">
              <h3>JSON Payload Structure</h3>
            </div>
            <div className="card-body">
              <pre style={{
                margin: 0,
                fontSize: 10,
                background: 'rgba(2,132,199,0.04)',
                border: '1px solid rgba(2,132,199,0.12)',
                borderRadius: 10,
                padding: 12,
                color: '#0f2736',
                overflowX: 'auto',
                lineHeight: 1.5
              }}>
{`{
  "event": "sms_received",
  "id": 1048,
  "deviceId": "samsung_m31",
  "sender": "HDFCBK",
  "message": "Rs 1,500 credited to a/c...",
  "simSlot": 0,
  "timestamp": 1728648291000,
  "receivedAt": "11 Oct 2026, 06:45 PM IST",
  "signature": "sha256_hash_here"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
