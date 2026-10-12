import React, { useState } from 'react'

export default function GstApiDocsPage() {
  const [selectedLang, setSelectedLang] = useState('curl')
  const [copied, setCopied] = useState(false)

  const origin = window.location.origin

  const codeSnippets = {
    curl: `curl -X POST "${origin}/api/gst/search" \\
  -H "Content-Type: application/json" \\
  -d '{"gstin": "19MAJPS4713H1Z3"}'`,
    node: `const axios = require('axios');

async function verifyGstin(gstin) {
  const response = await axios.post('${origin}/api/gst/search', {
    gstin: gstin
  });
  console.log('Taxpayer Details:', response.data);
}

verifyGstin('19MAJPS4713H1Z3');`,
    python: `import requests

url = "${origin}/api/gst/search"
payload = {"gstin": "19MAJPS4713H1Z3"}

response = requests.post(url, json=payload)
data = response.json()
print("Taxpayer Status:", data.get('data', {}).get('status'))`
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="content">
      <div className="hero" style={{ marginBottom: 20 }}>
        <div>
          <span className="eyebrow" style={{ color: '#7c3aed' }}>DEVELOPER API & INTEGRATION</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span>🔑</span> GST Verification REST API Docs
          </h1>
          <p style={{ maxWidth: 680, color: '#581c87' }}>
            Integrate instant GSTIN validation, taxpayer identity extraction, and GSTR-1/3B return compliance check into your applications.
          </p>
        </div>
      </div>

      {/* Code Generation Card */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe', background: '#faf5ff' }}>
          <div>
            <h3 style={{ color: '#3b0764' }}>💻 Code Snippet & Request Generator</h3>
            <p style={{ color: '#6d28d9' }}>Select your programming language to generate production-ready code.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['curl', 'node', 'python'].map((lang) => (
              <button
                key={lang}
                type="button"
                className={`btn ${selectedLang === lang ? 'primary' : ''}`}
                onClick={() => setSelectedLang(lang)}
                style={{ fontSize: 12, textTransform: 'uppercase', borderColor: '#ddd6fe' }}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          <div style={{ position: 'relative' }}>
            <pre
              style={{
                background: '#1e1b4b',
                color: '#e0e7ff',
                padding: '16px 20px',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'monospace',
                overflowX: 'auto',
                lineHeight: 1.6
              }}
            >
              {codeSnippets[selectedLang]}
            </pre>
            <button
              type="button"
              className="btn"
              onClick={() => copyCode(codeSnippets[selectedLang])}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                fontSize: 11,
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                borderColor: 'transparent'
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Endpoints Reference */}
      <div className="card" style={{ marginBottom: 24, borderColor: '#ddd6fe' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe' }}>
          <h3 style={{ color: '#3b0764' }}>📑 API Endpoints Reference</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Description</th>
                  <th>Payload / Parameters</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <span className="badge" style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#c4b5fd' }}>
                      POST
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#7c3aed' }}>/api/gst/search</strong>
                  </td>
                  <td>Verify GSTIN and get complete taxpayer registration profile</td>
                  <td>
                    <code style={{ background: '#f5f3ff', padding: '2px 6px', borderRadius: 4, color: '#6d28d9' }}>
                      {`{ "gstin": "19MAJPS4713H1Z3" }`}
                    </code>
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="badge" style={{ background: '#ede9fe', color: '#7c3aed', borderColor: '#c4b5fd' }}>
                      POST
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#7c3aed' }}>/api/gst/filings</strong>
                  </td>
                  <td>Get GSTR-1 and GSTR-3B return filing history for a financial year</td>
                  <td>
                    <code style={{ background: '#f5f3ff', padding: '2px 6px', borderRadius: 4, color: '#6d28d9' }}>
                      {`{ "gstin": "19MAJPS4713H1Z3", "year": "2026-2027" }`}
                    </code>
                  </td>
                </tr>

                <tr>
                  <td>
                    <span className="badge" style={{ background: 'rgba(22, 167, 101, 0.12)', color: '#16a765', borderColor: '#16a765' }}>
                      GET
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontFamily: 'monospace', color: '#7c3aed' }}>/api/v1/gst/verify</strong>
                  </td>
                  <td>Public lightweight verification endpoint</td>
                  <td>
                    <code style={{ background: '#f5f3ff', padding: '2px 6px', borderRadius: 4, color: '#6d28d9' }}>
                      ?gstin=19MAJPS4713H1Z3
                    </code>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Response Preview */}
      <div className="card" style={{ borderColor: '#ddd6fe' }}>
        <div className="card-head" style={{ borderBottomColor: '#ede9fe' }}>
          <h3 style={{ color: '#3b0764' }}>📦 Sample Response JSON</h3>
        </div>
        <div className="card-body">
          <pre
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              padding: '16px',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'monospace',
              overflowX: 'auto',
              lineHeight: 1.5
            }}
          >
{`{
  "success": true,
  "data": {
    "gstin": "19MAJPS4713H1Z3",
    "legalName": "BISWAJIT SHARMA",
    "tradeName": "YE WALLET",
    "registrationDate": "08/05/2022",
    "constitutionOfBusiness": "Proprietorship",
    "status": "Active",
    "taxpayerType": "Regular",
    "state": "West Bengal",
    "stateCode": "19",
    "pan": "MAJPS4713H",
    "principalAddress": "1/109, Rasulpur Kuchut Road, Chak Nara Bus Stop, SKPARA, Ulara, Purba Bardhaman, West Bengal, 713151",
    "aadhaarAuthenticated": "Yes",
    "aadhaarAuthDate": "26/11/2024",
    "einvoiceStatus": "Yes"
  },
  "timestamp": "2026-10-12T15:50:00.000Z"
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}
