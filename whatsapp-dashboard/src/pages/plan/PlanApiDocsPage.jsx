import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function PlanApiDocsPage() {
  const { notify } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    remainingHits: 100,
    apiToken: 'tok_live_demo',
    mobile: '9840123456'
  })

  const [activeTab, setActiveTab] = useState('operator')
  const [testMobile, setTestMobile] = useState('9840123456')
  const [testOpCode, setTestOpCode] = useState('2')
  const [testCircleCode, setTestCircleCode] = useState('70')
  const [testLoading, setTestLoading] = useState(false)
  const [testResponse, setTestResponse] = useState(null)
  const [copiedCurl, setCopiedCurl] = useState(false)

  const origin = window.location.origin

  useEffect(() => {
    api('/api/plans/user/stats')
      .then(data => {
        if (data.success && data.stats) {
          setStats(data.stats)
          if (data.stats.mobile) setTestMobile(data.stats.mobile)
        }
      })
      .catch(() => {})
  }, [])

  const endpoints = {
    operator: {
      name: 'Operator & Circle Fetch API',
      path: '/api/Mobile/OperatorFetchNew',
      method: 'GET / POST',
      desc: 'High-speed telecom operator and circle detection by 10-digit mobile number.',
      params: [
        { name: 'ApiUserID', req: 'Required', desc: 'Your registered mobile number / Member ID' },
        { name: 'token', req: 'Required', desc: 'Your primary Plan API secret token (tok_...)' },
        { name: 'Mobileno', req: 'Required', desc: '10-digit Indian mobile number to check' }
      ],
      sampleCurl: `curl -X GET "${origin}/api/Mobile/OperatorFetchNew?ApiUserID=${stats.mobile}&token=${stats.apiToken}&Mobileno=${testMobile}"`,
      sampleResponse: {
        "ERROR": "0",
        "STATUS": "1",
        "Mobile": testMobile,
        "Operator": "AIRTEL",
        "OpCode": "2",
        "Circle": "Chennai",
        "CircleCode": "40",
        "Message": "Successfully"
      }
    },
    plans: {
      name: 'Mobile Plans Fetch API',
      path: '/api/Mobile/Operatorplan',
      method: 'GET / POST',
      desc: 'Query categorized recharge plans (Unlimited, Data, Talktime, SMS, Roaming) by operator and circle code.',
      params: [
        { name: 'apimember_id', req: 'Required', desc: 'Your registered mobile number / Member ID' },
        { name: 'api_password', req: 'Required', desc: 'Your primary Plan API secret token (tok_...)' },
        { name: 'operatorcode', req: 'Required', desc: 'Operator Code (e.g. 2 for Airtel, 11 for Jio, 6 for VI, 4 for BSNL)' },
        { name: 'cricle', req: 'Required', desc: 'Circle Code (e.g. 70 for Rajasthan, 54 for UP East)' }
      ],
      sampleCurl: `curl -X GET "${origin}/api/Mobile/Operatorplan?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&operatorcode=${testOpCode}&cricle=${testCircleCode}"`,
      sampleResponse: {
        "ERROR": "0",
        "STATUS": "0",
        "Operator": "Airtel",
        "Circle": "RAJASTHAN",
        "RDATA": {
          "FULLTT": [{ "rs": "10", "desc": "Talktime Rs 7.47", "validity": "NA" }],
          "DATA": [{ "rs": "19", "desc": "1 GB Data for 1 Day", "validity": "1 Day" }]
        },
        "MESSAGE": "Operator Plan Successfully"
      }
    },
    roffer: {
      name: 'R-Offer (Best Offers) API',
      path: '/api/Mobile/RofferCheck',
      method: 'GET / POST',
      desc: 'Query live segmented best customized recharge offers for specific customer SIM cards.',
      params: [
        { name: 'apimember_id', req: 'Required', desc: 'Your registered mobile number / Member ID' },
        { name: 'api_password', req: 'Required', desc: 'Your primary Plan API secret token (tok_...)' },
        { name: 'mobile_no', req: 'Required', desc: '10-digit customer mobile number' },
        { name: 'operator_code', req: 'Required', desc: 'Operator code (2 for Airtel, 11 for Jio, 6 for VI)' }
      ],
      sampleCurl: `curl -X GET "${origin}/api/Mobile/RofferCheck?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&operator_code=${testOpCode}&mobile_no=${testMobile}"`,
      sampleResponse: {
        "ERROR": "0",
        "STATUS": "1",
        "MOBILENO": testMobile,
        "RDATA": [
          { "price": "349", "ofrtext": "UL 5G and 2GB/day for 28 days at Rs349" },
          { "price": "399", "ofrtext": "UL 5G, 2.5GB/day and 28days validity at Rs399" }
        ],
        "MESSAGE": "Success"
      }
    },
    dth: {
      name: 'DTH Customer Info API',
      path: '/api/Mobile/DthInfoWithLastRechargeDate',
      altPath: '/DTHinfoDetails.aspx',
      method: 'GET / POST',
      desc: 'Query customer account balance, monthly pack amount, and next due date for DTH subscriber numbers.',
      params: [
        { name: 'apimember_id', req: 'Required', desc: 'Your registered mobile number / Member ID' },
        { name: 'api_password', req: 'Required', desc: 'Your primary Plan API secret token (tok_...)' },
        { name: 'mobile_no', req: 'Required', desc: 'DTH VC / Subscriber ID / Smart card number' },
        { name: 'Opcode', req: 'Required', desc: 'DTH Operator Code (28 for Tata Play, 24 for Airtel DTH, 25 for Dish TV)' }
      ],
      sampleCurl: `curl -X GET "${origin}/api/Mobile/DthInfoWithLastRechargeDate?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&mobile_no=1024567890&Opcode=28"`,
      sampleResponse: {
        "error": "0",
        "DATA": {
          "VC": "1024567890",
          "Name": "MR Milind .",
          "Balance": "310.28",
          "Monthly": "310",
          "Next Recharge Date": "2026-10-30",
          "Plan": "Mega HD Pack"
        },
        "Message": "Offer Successfully Checked"
      }
    },
    recharge: {
      name: 'Last Recharge Check API',
      path: '/RechargeCheck.aspx',
      altPath: '/api/Mobile/RechargeCheck',
      method: 'GET / POST',
      desc: 'Verify previous recharge amount, transaction date, customer name, and active plan expiry date for any mobile or DTH number (Directly compatible with https://planapi.in/RechargeCheck.aspx).',
      params: [
        { name: 'apimember_id', req: 'Required', desc: 'Your registered mobile number or Member ID (or ApiUserID)' },
        { name: 'api_password', req: 'Required', desc: 'Your primary Plan API secret token (or token)' },
        { name: 'mobile_no', req: 'Required', desc: '10-digit mobile number or DTH VC / Subscriber ID' },
        { name: 'Opcode', req: 'Required', desc: 'Operator code (2 for Airtel, 11 for Jio, 6 for VI, 4 for BSNL, 28 for Tata Play, etc.)' }
      ],
      sampleCurl: `curl -X GET "${origin}/RechargeCheck.aspx?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&mobile_no=${testMobile}&Opcode=2"`,
      sampleResponse: {
        "error": "0",
        "DATA": {
          "VC": testMobile,
          "Name": "MR Subscriber .",
          "Rmn": testMobile,
          "Balance": "299.00",
          "Monthly": "299",
          "Next Recharge Date": "2026-11-15",
          "Plan": "₹299 Unlimited Pack",
          "Address": "Jaipur, Rajasthan",
          "City": "Jaipur",
          "District": "40",
          "State": "Rajasthan",
          "PIN Code": "302020",
          "Last Recharge Date": "2026-10-15",
          "Operator": "AIRTEL"
        },
        "Message": "Offer Successfully Checked"
      }
    }
  }

  const current = endpoints[activeTab]

  const handleRunTest = async () => {
    try {
      setTestLoading(true)
      setTestResponse(null)
      let url = ''

      if (activeTab === 'operator') {
        url = `/api/Mobile/OperatorFetchNew?ApiUserID=${stats.mobile}&token=${stats.apiToken}&Mobileno=${testMobile}`
      } else if (activeTab === 'plans') {
        url = `/api/Mobile/Operatorplan?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&operatorcode=${testOpCode}&cricle=${testCircleCode}`
      } else if (activeTab === 'roffer') {
        url = `/api/Mobile/RofferCheck?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&operator_code=${testOpCode}&mobile_no=${testMobile}`
      } else if (activeTab === 'dth') {
        url = `/api/Mobile/DthInfoWithLastRechargeDate?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&mobile_no=${testMobile}&Opcode=28`
      } else if (activeTab === 'recharge') {
        url = `/RechargeCheck.aspx?apimember_id=${stats.mobile}&api_password=${stats.apiToken}&mobile_no=${testMobile}&Opcode=2`
      }

      const res = await fetch(url)
      const data = await res.json()
      setTestResponse(data)
    } catch (err) {
      notify('Test execution error: ' + err.message)
    } finally {
      setTestLoading(false)
    }
  }

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(current.sampleCurl)
    setCopiedCurl(true)
    notify('cURL command copied!')
    setTimeout(() => setCopiedCurl(false), 2500)
  }

  return (
    <div className="content">
      <div className="hero">
        <div>
          <span className="eyebrow" style={{ color: '#ea580c' }}>DEVELOPER INTEGRATION</span>
          <h1>Plan API Developer Documentation</h1>
          <p>RESTful APIs for automated telecom discovery, plan querying, and customer verification with cURL snippets.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={() => navigate('/plans/dashboard')}>
            ⌂ Dashboard
          </button>
          <button type="button" className="btn primary" onClick={() => navigate('/subscription?service=plan')}>
            💎 Buy API Hits
          </button>
        </div>
      </div>

      {/* Live Credentials Banner */}
      <div className="card" style={{ marginBottom: 20, border: '1px solid rgba(249,115,22,0.3)', background: 'linear-gradient(145deg, #fffaf5, #fff5eb)' }}>
        <div className="card-body" style={{ padding: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, alignItems: 'center' }}>
            <div>
              <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>API BASE URL</small>
              <strong style={{ color: '#431407', fontSize: 13, fontFamily: 'monospace' }}>{origin}</strong>
            </div>
            <div>
              <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>YOUR MEMBER ID</small>
              <strong style={{ color: '#ea580c', fontSize: 13, fontFamily: 'monospace' }}>{stats.mobile || 'Your Mobile'}</strong>
            </div>
            <div>
              <small style={{ color: '#78867f', fontSize: 10, display: 'block', fontWeight: 700 }}>YOUR API TOKEN</small>
              <strong style={{ color: '#ea580c', fontSize: 12, fontFamily: 'monospace' }}>
                {stats.apiToken ? `${stats.apiToken.slice(0, 10)}...` : 'tok_...'}
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge success">
                {stats.remainingHits} Hits Available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Endpoints Tab Switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
        {Object.entries(endpoints).map(([key, item]) => (
          <button
            key={key}
            type="button"
            className={`btn ${activeTab === key ? 'primary' : ''}`}
            onClick={() => { setActiveTab(key); setTestResponse(null); }}
            style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* Main Endpoint Details */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: 6,
              background: '#ea580c',
              color: '#fff',
              fontSize: 11,
              fontWeight: 800
            }}>
              {current.method}
            </span>
            <code style={{ fontSize: 14, fontWeight: 700, color: '#431407' }}>
              {current.path}
            </code>
            {current.altPath && (
              <span style={{ fontSize: 11, color: '#78867f', marginLeft: 4 }}>
                (or <code>{current.altPath}</code>)
              </span>
            )}
          </div>
          <button type="button" className="btn" onClick={handleCopyCurl}>
            {copiedCurl ? '✓ cURL Copied' : 'Copy cURL'}
          </button>
        </div>

        <div className="card-body">
          <p style={{ color: '#431407', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0' }}>
            {current.desc}
          </p>

          {/* Parameters Table */}
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#431407', marginBottom: 8 }}>
            Request Parameters
          </h4>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Requirement</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {current.params.map((p, idx) => (
                  <tr key={idx}>
                    <td><code style={{ color: '#ea580c', fontWeight: 700 }}>{p.name}</code></td>
                    <td><span className="badge" style={{ background: '#fed7aa', color: '#9a3412', fontWeight: 700 }}>{p.req}</span></td>
                    <td>{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* cURL Snippet */}
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#431407', marginBottom: 8 }}>
            cURL Request Snippet
          </h4>
          <pre style={{
            margin: '0 0 20px 0',
            padding: 14,
            borderRadius: 12,
            background: '#2a1205',
            color: '#fdba74',
            fontSize: 12,
            overflowX: 'auto',
            fontFamily: 'monospace'
          }}>
            {current.sampleCurl}
          </pre>

          {/* Interactive Request Tester */}
          <div style={{
            padding: 16,
            borderRadius: 14,
            border: '1px solid rgba(249,115,22,0.22)',
            background: 'linear-gradient(145deg, #fffaf5, #fff5eb)',
            marginBottom: 20
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 800, color: '#431407', margin: '0 0 10px 0' }}>
              ⚡ Interactive Sandbox (Try It Live)
            </h4>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <input
                type="text"
                className="input"
                placeholder="Test Mobile / VC Number"
                value={testMobile}
                onChange={(e) => setTestMobile(e.target.value)}
                style={{ maxWidth: 260 }}
              />
              <button
                type="button"
                className="btn primary"
                onClick={handleRunTest}
                disabled={testLoading}
              >
                {testLoading ? 'Executing Request...' : 'Send Live Request ↗'}
              </button>
            </div>

            {testResponse && (
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#78867f', display: 'block', marginBottom: 4 }}>
                  LIVE SERVER RESPONSE:
                </label>
                <pre style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 10,
                  background: '#183126',
                  color: '#4ade80',
                  fontSize: 12,
                  overflowX: 'auto',
                  fontFamily: 'monospace'
                }}>
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Standard Status Code Guide */}
          <h4 style={{ fontSize: 13, fontWeight: 800, color: '#431407', marginBottom: 8 }}>
            API Response Codes Reference
          </h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>STATUS / ERROR</th>
                  <th>Meaning</th>
                  <th>Action Required</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>0 / 1</code></td>
                  <td><span className="badge success">Success</span></td>
                  <td>Request executed successfully. Data returned.</td>
                </tr>
                <tr>
                  <td><code>2</code></td>
                  <td><span className="badge pending">Invalid Parameter</span></td>
                  <td>Check mobile number format (must be 10 digits).</td>
                </tr>
                <tr>
                  <td><code>3</code></td>
                  <td><span className="badge failed">Auth Failed</span></td>
                  <td>Verify ApiUserID and secret Token.</td>
                </tr>
                <tr>
                  <td><code>4</code></td>
                  <td><span className="badge failed">Insufficient Hits</span></td>
                  <td>Account hits balance exhausted. Recharge hit pack.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
