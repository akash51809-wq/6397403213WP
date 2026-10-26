import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function SmsApiDocsPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('send')
  const [selectedLang, setSelectedLang] = useState('curl')
  const [copied, setCopied] = useState('')
  const [testRecipient, setTestRecipient] = useState('9876543210')
  const [testMessage, setTestMessage] = useState('Hello! Your OTP is 548291. Valid for 10 minutes.')
  const [testSimSlot, setTestSimSlot] = useState('0')
  const [testLoading, setTestLoading] = useState(false)
  const [testResponse, setTestResponse] = useState(null)

  const origin = window.location.origin
  const token = localStorage.getItem('token') || 'YOUR_AUTH_BEARER_TOKEN'

  const copyCode = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key || 'Copied')
    if (notify) notify('Copied to clipboard!')
    setTimeout(() => setCopied(''), 2000)
  }

  const endpoints = {
    send: {
      name: 'Send Outgoing SMS API',
      path: '/api/sms/send',
      method: 'POST / GET',
      badge: 'POST/GET',
      badgeClass: 'post',
      desc: 'Send fast SMS or OTP to any Indian 10-digit mobile number via your connected Android ERS SMS Gateway. Supports both single-line HTTP GET URLs (for recharge/billing software) and standard JSON HTTP POST payloads.',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: `Bearer ${token}` }
      ],
      params: [
        { name: 'recipient', req: 'Required', type: 'string', desc: '10-digit mobile number (e.g. 9876543210 or +919876543210)' },
        { name: 'message', req: 'Required', type: 'string', desc: 'Text message body to send via SIM' },
        { name: 'simSlot', req: 'Optional', type: 'number', desc: '0 = 1 by 1 from both SIM (Round-robin alternate), 1 = SIM 1, 2 = SIM 2. Default: 0.' },
        { name: 'deviceId', req: 'Optional', type: 'string', desc: 'Specific Android device ID if multiple phones are connected.' }
      ],
      requestBody: {
        recipient: testRecipient,
        message: testMessage,
        simSlot: Number(testSimSlot)
      },
      snippets: {
        curl: `curl -X POST "${origin}/api/sms/send" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{
    "recipient": "${testRecipient}",
    "message": "${testMessage}",
    "simSlot": ${testSimSlot}
  }'`,
        node: `const axios = require('axios');

async function sendSms() {
  const response = await axios.post('${origin}/api/sms/send', {
    recipient: '${testRecipient}',
    message: '${testMessage}',
    simSlot: ${testSimSlot}
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${token}'
    }
  });

  console.log(response.data);
}
sendSms();`,
        python: `import requests

url = "${origin}/api/sms/send"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${token}"
}
payload = {
    "recipient": "${testRecipient}",
    "message": "${testMessage}",
    "simSlot": ${testSimSlot}
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
        php: `<?php
$curl = curl_init();

$payload = json_encode([
  "recipient" => "${testRecipient}",
  "message"   => "${testMessage}",
  "simSlot"   => ${testSimSlot}
]);

curl_setopt_array($curl, [
  CURLOPT_URL => "${origin}/api/sms/send",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_CUSTOMREQUEST => "POST",
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    "Content-Type: application/json",
    "Authorization: Bearer ${token}"
  ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`
      },
      sampleResponse: {
        success: true,
        message: "SMS queued for transmission",
        messageId: "msg_1712984523000",
        recipient: testRecipient,
        simSlot: Number(testSimSlot),
        status: "QUEUED"
      }
    },
    inbox: {
      name: 'Fetch Incoming SMS Messages',
      path: '/api/sms/messages',
      method: 'GET',
      badge: 'GET',
      badgeClass: 'get',
      desc: 'Retrieve incoming SMS messages received on your connected Android gateway phones (OTPs, customer replies, confirmations).',
      headers: [
        { name: 'Authorization', value: `Bearer ${token}` }
      ],
      params: [
        { name: 'limit', req: 'Optional', type: 'number', desc: 'Number of messages to fetch (default 50, max 100)' },
        { name: 'offset', req: 'Optional', type: 'number', desc: 'Pagination offset (default 0)' },
        { name: 'sender', req: 'Optional', type: 'string', desc: 'Filter by sender number or bank header (e.g. AX-HDFCBK)' },
        { name: 'deviceId', req: 'Optional', type: 'string', desc: 'Filter messages received by a specific connected phone' }
      ],
      snippets: {
        curl: `curl -X GET "${origin}/api/sms/messages?limit=20" \\
  -H "Authorization: Bearer ${token}"`,
        node: `const axios = require('axios');

async function getReceivedSms() {
  const response = await axios.get('${origin}/api/sms/messages?limit=20', {
    headers: { 'Authorization': 'Bearer ${token}' }
  });
  console.log(response.data);
}
getReceivedSms();`,
        python: `import requests

url = "${origin}/api/sms/messages?limit=20"
headers = { "Authorization": "Bearer ${token}" }

response = requests.get(url, headers=headers)
print(response.json())`,
        php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "${origin}/api/sms/messages?limit=20",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer ${token}"
  ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`
      },
      sampleResponse: {
        success: true,
        messages: [
          {
            id: 101,
            deviceId: "samsung_s21",
            sender: "VK-SBIPAY",
            message: "Dear SBI User, your OTP for transaction is 482910. Do not share with anyone.",
            simSlot: 0,
            timestamp: 1712984523000,
            receivedAt: "2026-10-13 17:30:15"
          }
        ]
      }
    },
    devices: {
      name: 'Connected Gateway Devices API',
      path: '/api/sms/devices',
      method: 'GET',
      badge: 'GET',
      badgeClass: 'get',
      desc: 'Query real-time health, connection state, battery percentage, and active SIM cards of your Android gateway phones.',
      headers: [
        { name: 'Authorization', value: `Bearer ${token}` }
      ],
      params: [],
      snippets: {
        curl: `curl -X GET "${origin}/api/sms/devices" \\
  -H "Authorization: Bearer ${token}"`,
        node: `const axios = require('axios');

async function getDevices() {
  const response = await axios.get('${origin}/api/sms/devices', {
    headers: { 'Authorization': 'Bearer ${token}' }
  });
  console.log(response.data);
}
getDevices();`,
        python: `import requests

url = "${origin}/api/sms/devices"
headers = { "Authorization": "Bearer ${token}" }

response = requests.get(url, headers=headers)
print(response.json())`,
        php: `<?php
$curl = curl_init();

curl_setopt_array($curl, [
  CURLOPT_URL => "${origin}/api/sms/devices",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer ${token}"
  ],
]);

$response = curl_exec($curl);
curl_close($curl);
echo $response;`
      },
      sampleResponse: {
        success: true,
        devices: [
          {
            deviceId: "ers_gateway_01",
            deviceName: "Redmi Note 12",
            is_online: 1,
            battery_level: 85,
            is_charging: 1,
            sim_cards: [
              { slotIndex: 0, carrierName: "Jio", number: "+919840123456" },
              { slotIndex: 1, carrierName: "Airtel", number: "+919840987654" }
            ],
            last_seen: "2026-10-13 17:40:00"
          }
        ]
      }
    },
    webhook: {
      name: 'Incoming SMS Webhook Specification',
      path: 'YOUR_SERVER_WEBHOOK_URL',
      method: 'POST (Inbound)',
      badge: 'WEBHOOK',
      badgeClass: 'post',
      desc: 'When an SMS is received on your Android gateway, our cloud automatically pushes this JSON payload to your configured Webhook URL in real-time.',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'x-api-key', value: 'YOUR_CONFIGURED_WEBHOOK_SECRET' }
      ],
      params: [
        { name: 'event', req: 'Constant', type: 'string', desc: '"incoming_sms"' },
        { name: 'sender', req: 'Provided', type: 'string', desc: 'Sender mobile number or SMS header (e.g. +919876543210 or VM-HDFCBK)' },
        { name: 'message', req: 'Provided', type: 'string', desc: 'Full text body of the received SMS' },
        { name: 'simSlot', req: 'Provided', type: 'number', desc: '0 for SIM 1, 1 for SIM 2' },
        { name: 'deviceId', req: 'Provided', type: 'string', desc: 'ID of the phone that received the SMS' },
        { name: 'timestamp', req: 'Provided', type: 'number', desc: 'Unix timestamp in milliseconds' }
      ],
      snippets: {
        curl: `# Sample Webhook Inbound Payload sent to your server:
{
  "event": "incoming_sms",
  "id": 142,
  "deviceId": "ers_gateway_01",
  "sender": "+919876543210",
  "message": "Dear customer, your verification code is 884021.",
  "simSlot": 0,
  "timestamp": 1712984523000
}`,
        node: `// Express.js Webhook Receiver Handler Example
const express = require('express');
const app = express();
app.use(express.json());

app.post('/my-sms-webhook', (req, res) => {
  const { event, sender, message, simSlot, timestamp } = req.body;

  if (event === 'incoming_sms') {
    console.log(\`Received SMS from \${sender}: \${message}\`);
    // Process OTP or business logic here
  }

  res.status(200).json({ success: true, received: true });
});

app.listen(4000);`,
        python: `# Flask Webhook Receiver Example
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/my-sms-webhook', methods=['POST'])
def handle_sms_webhook():
    data = request.json
    if data.get('event') == 'incoming_sms':
        sender = data.get('sender')
        message = data.get('message')
        print(f"Received SMS from {sender}: {message}")

    return jsonify({"success": True}), 200

if __name__ == '__main__':
    app.run(port=4000)`,
        php: `<?php
// PHP Webhook Receiver Example
$body = file_get_contents('php://input');
$data = json_decode($body, true);

if (isset($data['event']) && $data['event'] === 'incoming_sms') {
    $sender = $data['sender'];
    $message = $data['message'];
    file_put_contents('sms_log.txt', date('Y-m-d H:i:s') . " - $sender: $message\\n", FILE_APPEND);
}

http_response_code(200);
echo json_encode(["success" => true]);`
      },
      sampleResponse: {
        success: true,
        received: true
      }
    }
  }

  const currentEndpoint = endpoints[activeTab] || endpoints.send

  const handleRunLiveTest = async (e) => {
    e.preventDefault()
    setTestLoading(true)
    setTestResponse(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: testRecipient.trim(),
          message: testMessage.trim(),
          simSlot: Number(testSimSlot)
        })
      })
      const data = await res.json()
      setTestResponse(data)
      if (data.success) {
        if (notify) notify('Test SMS queued successfully!')
      } else {
        if (notify) notify(data.message || 'SMS send failed', 'error')
      }
    } catch (err) {
      setTestResponse({ success: false, message: err.message })
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="content" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
      {/* Page Header */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: 16, 
          marginBottom: 24,
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          borderRadius: 16,
          border: '1px solid #bae6fd'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>📱</span>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#0369a1' }}>
              Mobile SMS Gateway API Documentation
            </h1>
            <span 
              style={{ 
                background: '#0284c7', 
                color: '#fff', 
                padding: '3px 10px', 
                borderRadius: 20, 
                fontSize: 11, 
                fontWeight: 800 
              }}
            >
              REST v1.0
            </span>
          </div>
          <p style={{ margin: 0, color: '#0c4a6e', fontSize: 13, lineHeight: 1.5 }}>
            Integrate fast mobile SMS and OTP delivery directly into your website, CRM, billing, or ERP systems using your paired Android phone SIMs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/sms/dashboard')}
            style={{
              background: '#fff',
              color: '#0284c7',
              borderColor: '#bae6fd',
              borderRadius: 10,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            📱 SMS Dashboard
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigate('/sms/devices')}
            style={{
              background: '#0284c7',
              color: '#fff',
              borderColor: '#0284c7',
              borderRadius: 10,
              padding: '8px 16px',
              fontWeight: 700,
              fontSize: 13
            }}
          >
            + Pair Android Device
          </button>
        </div>
      </div>

      {/* API Endpoint Switcher Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          gap: 10, 
          overflowX: 'auto', 
          paddingBottom: 4, 
          marginBottom: 20 
        }}
      >
        {Object.entries(endpoints).map(([key, ep]) => {
          const isSelected = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 18px',
                borderRadius: 12,
                border: isSelected ? '2px solid #0284c7' : '1px solid #e2e8f0',
                background: isSelected ? '#f0f9ff' : '#ffffff',
                color: isSelected ? '#0369a1' : '#64748b',
                fontWeight: isSelected ? 800 : 600,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <span 
                style={{ 
                  background: ep.badge === 'GET' ? '#e0f2fe' : (ep.badge === 'POST' ? '#f0fdf4' : '#fef3c7'), 
                  color: ep.badge === 'GET' ? '#0284c7' : (ep.badge === 'POST' ? '#16a34a' : '#d97706'),
                  padding: '2px 6px',
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 800
                }}
              >
                {ep.badge}
              </span>
              <span>{ep.name}</span>
            </button>
          )
        })}
      </div>

      {/* Main Endpoint Card */}
      <div 
        className="card" 
        style={{ 
          marginBottom: 24, 
          borderRadius: 16, 
          border: '1px solid #bae6fd', 
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: '0 4px 20px rgba(2, 132, 199, 0.06)'
        }}
      >
        {/* Endpoint URL Header */}
        <div 
          style={{ 
            padding: '18px 24px', 
            background: '#f8fafc', 
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span 
              style={{ 
                padding: '4px 10px', 
                borderRadius: 8, 
                fontWeight: 900, 
                fontSize: 12,
                background: currentEndpoint.badge === 'GET' ? '#0284c7' : (currentEndpoint.badge === 'POST' ? '#10b981' : '#f59e0b'),
                color: '#fff'
              }}
            >
              {currentEndpoint.method}
            </span>
            <code style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Consolas, monospace' }}>
              {currentEndpoint.path.startsWith('/') ? `${origin}${currentEndpoint.path}` : currentEndpoint.path}
            </code>
          </div>

          <button
            type="button"
            className="btn"
            onClick={() => copyCode(currentEndpoint.path.startsWith('/') ? `${origin}${currentEndpoint.path}` : currentEndpoint.path, 'endpoint')}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            {copied === 'endpoint' ? '✓ Copied' : '⧉ Copy URL'}
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <p style={{ fontSize: 14, color: '#475569', marginTop: 0, marginBottom: 20 }}>
            {currentEndpoint.desc}
          </p>

          {activeTab === 'send' && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <strong style={{ color: '#166534', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚡ 1-Click Complete API URL Sample (Direct GET Request)
                </strong>
                <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                  Recharge / Billing / CRM Ready
                </span>
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: '#14532d', lineHeight: 1.4 }}>
                किसी भी सॉफ्टवेयर, रिचार्ज पैनल या ब्राउज़र में सीधे कॉल करने के लिए यह कम्प्लीट URL उपयोग करें:
              </p>
              <div style={{
                display: 'flex',
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                overflow: 'hidden',
                alignItems: 'center',
                marginBottom: 10
              }}>
                <span style={{ background: '#22c55e', color: '#fff', padding: '10px 14px', fontSize: 12, fontWeight: 900 }}>
                  GET
                </span>
                <code style={{ flex: 1, padding: '10px 14px', fontSize: 12, color: '#0f172a', overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {`${origin}/api/sms/send?token=${token}&recipient=9876543210&message=Hello+World&simSlot=0`}
                </code>
                <button
                  type="button"
                  onClick={() => copyCode(`${origin}/api/sms/send?token=${token}&recipient=9876543210&message=Hello+World&simSlot=0`, 'sample_get_sms')}
                  style={{
                    border: 'none',
                    borderLeft: '1px solid #bbf7d0',
                    background: '#f8fafc',
                    padding: '10px 16px',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    color: '#166534'
                  }}
                >
                  {copied === 'sample_get_sms' ? '✓ Copied' : '⧉ Copy URL'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#15803d', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div>• <b>सॉफ्टवेयर कॉन्फ़िगरेशन (Placeholders):</b> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, color: '#0f172a' }}>{`${origin}/api/sms/send?token={token}&recipient={recipient}&message={message}&simSlot={simSlot}`}</code></div>
                <div>• <b>simSlot पैरामीटर:</b> <code>0</code> = 1 by 1 from both SIM (दोनों सिम से एक-एक करके बारी-बारी, डिफ़ॉल्ट), <code>1</code> = SIM 1, <code>2</code> = SIM 2</div>
                <div>• <b>वैकल्पिक शॉर्ट URL:</b> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, color: '#0f172a' }}>{`${origin}/send-sms?token={token}&to={recipient}&message={message}&simSlot={simSlot}`}</code></div>
              </div>
            </div>
          )}

          {/* Parameters Table */}
          {currentEndpoint.params && currentEndpoint.params.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Payload / Request Parameters
              </h4>
              <div className="table-responsive">
                <table className="table" style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Field Name</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Type</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Requirement</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEndpoint.params.map(p => (
                      <tr key={p.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <code style={{ background: '#f0f9ff', color: '#0284c7', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                            {p.name}
                          </code>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#64748b' }}>{p.type}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span 
                            style={{ 
                              color: p.req === 'Required' ? '#dc2626' : '#64748b', 
                              fontWeight: p.req === 'Required' ? 700 : 500,
                              fontSize: 12
                            }}
                          >
                            {p.req}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#334155' }}>{p.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Code Snippets & Language Selector */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['curl', 'node', 'python', 'php'].map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLang(lang)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 8,
                      border: selectedLang === lang ? '1px solid #0284c7' : '1px solid #cbd5e1',
                      background: selectedLang === lang ? '#0284c7' : '#fff',
                      color: selectedLang === lang ? '#fff' : '#475569',
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                  >
                    {lang === 'node' ? 'Node.js' : lang}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="btn"
                onClick={() => copyCode(currentEndpoint.snippets[selectedLang], 'snippet')}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                {copied === 'snippet' ? '✓ Copied' : '⧉ Copy Code'}
              </button>
            </div>

            <pre
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '16px 20px',
                borderRadius: 12,
                fontSize: 13,
                fontFamily: 'Consolas, Monaco, monospace',
                overflowX: 'auto',
                lineHeight: 1.6,
                margin: 0,
                border: '1px solid #1e293b'
              }}
            >
              {currentEndpoint.snippets[selectedLang]}
            </pre>
          </div>

          {/* Sample JSON Response */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                Sample 200 OK Response
              </h4>
              <button
                type="button"
                className="btn"
                onClick={() => copyCode(JSON.stringify(currentEndpoint.sampleResponse, null, 2), 'response')}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  borderRadius: 6,
                  background: '#fff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                {copied === 'response' ? '✓ Copied' : '⧉ Copy JSON'}
              </button>
            </div>
            <pre
              style={{
                background: '#022c22',
                color: '#6ee7b7',
                padding: '14px 18px',
                borderRadius: 12,
                fontSize: 13,
                fontFamily: 'Consolas, Monaco, monospace',
                overflowX: 'auto',
                lineHeight: 1.6,
                margin: 0,
                border: '1px solid #065f46'
              }}
            >
              {JSON.stringify(currentEndpoint.sampleResponse, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Live Interactive API Tester Console (For Send SMS) */}
      {activeTab === 'send' && (
        <div 
          className="card" 
          style={{ 
            borderRadius: 16, 
            border: '1px solid #bae6fd', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
            padding: 24,
            marginBottom: 30
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0369a1' }}>
                Live API Console (Test Send SMS in Real-Time)
              </h3>
              <small style={{ color: '#0284c7' }}>
                Test this endpoint right from your browser using your authenticated session.
              </small>
            </div>
          </div>

          <form onSubmit={handleRunLiveTest}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  RECIPIENT MOBILE NUMBER
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={testRecipient}
                  onChange={e => setTestRecipient(e.target.value)}
                  placeholder="9876543210"
                  required
                  style={{
                    borderRadius: 8,
                    height: 42,
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                  SIM SLOT
                </label>
                <select
                  className="form-control"
                  value={testSimSlot}
                  onChange={e => setTestSimSlot(e.target.value)}
                  style={{
                    borderRadius: 8,
                    height: 42,
                    border: '1px solid #cbd5e1',
                    padding: '0 12px',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="0">0: 1 by 1 from both SIM (दोनों सिम से बारी-बारी, डिफ़ॉल्ट)</option>
                  <option value="1">1: SIM 1</option>
                  <option value="2">2: SIM 2</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                MESSAGE BODY
              </label>
              <textarea
                className="form-control"
                rows={3}
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Type your test message..."
                required
                style={{
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  padding: '10px 12px',
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={testLoading}
                style={{
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  border: 0,
                  borderRadius: 10,
                  padding: '10px 24px',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                }}
              >
                {testLoading ? 'Sending...' : '🚀 Execute Test Request'}
              </button>
            </div>
          </form>

          {testResponse && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#334155' }}>
                Console Execution Response:
              </h4>
              <pre
                style={{
                  background: testResponse.success ? '#022c22' : '#450a0a',
                  color: testResponse.success ? '#6ee7b7' : '#fca5a5',
                  padding: '14px 18px',
                  borderRadius: 10,
                  fontSize: 13,
                  margin: 0,
                  overflowX: 'auto',
                  border: testResponse.success ? '1px solid #065f46' : '1px solid #991b1b'
                }}
              >
                {JSON.stringify(testResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
