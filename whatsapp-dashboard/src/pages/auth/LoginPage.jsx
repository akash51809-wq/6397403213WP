import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import '../../styles/login.css'

export function LoginPage({ initialMode }) {
  const { handleLogin, companySettings, loadCompanySettings } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Mode: 'login' | 'signup'
  const isSignupPath = location.pathname === '/signup' || initialMode === 'signup'
  const [mode, setMode] = useState(isSignupPath ? 'signup' : 'login')

  // Sign In Form States
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [inactivityNotice, setInactivityNotice] = useState(false)

  // Sign Up Form States (WhatsApp OTP Flow)
  const [signupMobile, setSignupMobile] = useState('')
  const [signupOtp, setSignupOtp] = useState('')
  const [signupStep, setSignupStep] = useState(1) // 1: Mobile, 2: OTP, 3: Success
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupMsg, setSignupMsg] = useState({ text: '', type: '' }) // type: 'ok' | 'err'

  useEffect(() => {
    if (loadCompanySettings) {
      loadCompanySettings()
    }
    const reason = sessionStorage.getItem('wa_logout_reason')
    if (reason === 'inactivity') {
      setInactivityNotice(true)
      sessionStorage.removeItem('wa_logout_reason')
    }
  }, [loadCompanySettings])

  // Sync mode if URL changes
  useEffect(() => {
    if (location.pathname === '/signup') {
      setMode('signup')
    } else if (location.pathname === '/login') {
      setMode('login')
    }
  }, [location.pathname])

  // ── Handle Sign In ──
  const handleSignInSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      return setLoginError('Please enter both Username/Mobile and Password.')
    }
    setLoginLoading(true)
    setLoginError('')
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password })
      })
      if (data.success) {
        handleLogin(data.user.token, data.user)
        if (data.user && data.user.role === 'admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
      } else {
        setLoginError(data.message || 'Login failed. Please check credentials.')
      }
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  // ── Handle Sign Up: Step 1 (Request OTP) ──
  const handleRequestOtp = async (e) => {
    e?.preventDefault()
    const cleanMobile = signupMobile.replace(/\D/g, '')
    if (!/^\d{10}$/.test(cleanMobile)) {
      return setSignupMsg({ text: 'कृपया 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।', type: 'err' })
    }
    setSignupLoading(true)
    setSignupMsg({ text: '', type: '' })
    try {
      const res = await fetch('/api/auth/signup/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'OTP नहीं भेजा जा सका।')
      }
      setSignupStep(2)
      setSignupMsg({ text: `OTP आपके WhatsApp नंबर (+91 ${cleanMobile}) पर भेज दिया गया है।`, type: 'ok' })
    } catch (err) {
      setSignupMsg({ text: err.message || 'OTP request failed.', type: 'err' })
    } finally {
      setSignupLoading(false)
    }
  }

  // ── Handle Sign Up: Step 2 (Verify OTP) ──
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    const cleanMobile = signupMobile.replace(/\D/g, '')
    const cleanOtp = signupOtp.replace(/\D/g, '')
    if (!/^\d{6}$/.test(cleanOtp)) {
      return setSignupMsg({ text: 'कृपया 6 अंकों का OTP दर्ज करें।', type: 'err' })
    }
    setSignupLoading(true)
    setSignupMsg({ text: '', type: '' })
    try {
      const res = await fetch('/api/auth/signup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, otp: cleanOtp })
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification failed.')
      }
      setSignupStep(3)
      setSignupMsg({ text: 'Account successfully created!', type: 'ok' })
    } catch (err) {
      setSignupMsg({ text: err.message || 'Verification failed.', type: 'err' })
    } finally {
      setSignupLoading(false)
    }
  }

  const brandName = companySettings?.companyName || 'WhatsApp Automation'
  const customBanner = companySettings?.bannerUrl

  return (
    <div className="login-page-root">
      <main className="auth-split-card">
        {/* ── LEFT COLUMN: Form ── */}
        <section className="auth-form-column">
          {/* Brand Lockup */}
          <div className="auth-brand-lockup">
            {companySettings?.logoUrl ? (
              <img
                src={companySettings.logoUrl}
                alt={brandName}
                className="auth-brand-logo"
              />
            ) : (
              <div className="auth-brand-icon-fallback">
                <span>⚡</span>
              </div>
            )}
            <span className="auth-brand-title">{brandName}</span>
          </div>

          {/* ── MODE 1: SIGN IN ── */}
          {mode === 'login' ? (
            <div>
              <div className="auth-header">
                <h1 className="auth-title">Sign in</h1>
                <p className="auth-subtitle">
                  Don't have an account?{' '}
                  <span
                    className="auth-subtitle-link"
                    onClick={() => {
                      setMode('signup')
                      setLoginError('')
                    }}
                  >
                    Create now
                  </span>
                </p>
              </div>

              {inactivityNotice && (
                <div className="auth-alert auth-alert-warning">
                  <strong>⏱️ Session Timed Out:</strong> Your session expired due to inactivity. Please sign in again.
                </div>
              )}

              {loginError && (
                <div className="auth-alert auth-alert-error">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleSignInSubmit}>
                {/* Username or Mobile */}
                <div className="auth-form-group">
                  <label className="auth-label">E-mail or Username</label>
                  <div className="auth-input-container">
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="Username / Mobile"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="auth-form-group">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-container">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="auth-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Options Row */}
                <div className="auth-options-row">
                  <label className="auth-remember-label">
                    <input
                      type="checkbox"
                      className="auth-remember-checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <span
                    className="auth-forgot-link"
                    onClick={() => {
                      alert('Password recovery: Please contact the system administrator (admin) or check your registered WhatsApp credentials.')
                    }}
                  >
                    Forgot Password?
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
            </div>
          ) : (
            /* ── MODE 2: SIGN UP ── */
            <div>
              <div className="auth-header">
                <h1 className="auth-title">Create account</h1>
                <p className="auth-subtitle">
                  Already have an account?{' '}
                  <span
                    className="auth-subtitle-link"
                    onClick={() => {
                      setMode('login')
                      setSignupMsg({ text: '', type: '' })
                    }}
                  >
                    Sign in
                  </span>
                </p>
              </div>

              {signupMsg.text && (
                <div className={`auth-alert ${signupMsg.type === 'ok' ? 'auth-alert-success' : 'auth-alert-error'}`}>
                  {signupMsg.text}
                </div>
              )}

              {/* Step 1: Enter Mobile */}
              {signupStep === 1 && (
                <form onSubmit={handleRequestOtp}>
                  <div className="auth-form-group">
                    <label className="auth-label">WhatsApp Mobile Number</label>
                    <div className="auth-input-container">
                      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginRight: 8 }}>+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength="10"
                        className="auth-input"
                        placeholder="10-digit mobile number"
                        value={signupMobile}
                        onChange={(e) => setSignupMobile(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={signupLoading}
                  >
                    {signupLoading ? 'Sending OTP...' : 'Get OTP on WhatsApp'}
                  </button>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {signupStep === 2 && (
                <form onSubmit={handleVerifyOtp}>
                  <div className="auth-form-group">
                    <label className="auth-label">6-Digit OTP</label>
                    <div className="auth-input-container">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="6"
                        className="auth-input"
                        placeholder="Enter 6-digit OTP"
                        value={signupOtp}
                        onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    disabled={signupLoading}
                  >
                    {signupLoading ? 'Verifying...' : 'Verify & Create Account'}
                  </button>
                  <button
                    type="button"
                    className="auth-secondary-btn"
                    onClick={() => {
                      setSignupStep(1)
                      setSignupOtp('')
                      setSignupMsg({ text: '', type: '' })
                    }}
                  >
                    ← Change Mobile Number
                  </button>
                </form>
              )}

              {/* Step 3: Success Screen */}
              {signupStep === 3 && (
                <div>
                  <div className="auth-success-card">
                    <div className="auth-success-badge">✓</div>
                    <h3 className="auth-success-title">Account Created!</h3>
                    <p className="auth-success-desc">
                      Your Login ID is <strong className="auth-success-highlight">+91 {signupMobile}</strong>.
                    </p>
                    <p className="auth-success-desc">
                      For your security, your generated <strong>Password</strong> has been delivered directly to your WhatsApp.
                    </p>
                    <span className="auth-success-tip">
                      💬 Open WhatsApp, check your login details and sign in.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="auth-submit-btn"
                    onClick={() => {
                      setUsername(signupMobile)
                      setMode('login')
                      setSignupStep(1)
                      setSignupOtp('')
                      setSignupMobile('')
                    }}
                  >
                    Proceed to Sign in →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── RIGHT COLUMN: Banner / Hero ── */}
        <section
          className={`auth-banner-column ${customBanner ? 'has-custom-banner' : ''}`}
          style={customBanner ? { backgroundImage: `url(${customBanner})` } : undefined}
        >
          {customBanner && <div className="auth-banner-overlay" />}
          {!customBanner && <div className="auth-banner-glow" />}

          {/* Top Support Pill */}
          <div className="auth-support-bar">
            <a
              href="#support"
              className="auth-support-pill"
              onClick={(e) => {
                e.preventDefault()
                alert(`Support & Help:\nPlease contact ${brandName} support team or administrator.`)
              }}
            >
              <span>🎧</span>
              <span>Support</span>
            </a>
          </div>

          {/* Middle Floating Card (Shown on default banner) */}
          {!customBanner && (
            <div className="auth-floating-card">
              <div className="auth-floating-text">
                <h3>Automate WhatsApp faster</h3>
                <p>Scale broadcasts, trigger auto-replies, and connect multi-device sessions effortlessly.</p>
                <span className="auth-learn-btn">Active Engine</span>
              </div>
              <div className="auth-mock-graphic">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="mock-chip" />
                  <span className="mock-title">PRO</span>
                </div>
                <div className="mock-number">•••• •••• 99.8%</div>
                <div className="mock-badge">
                  <div className="mock-badge-dot" />
                  <span>Delivered</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Features & Carousel Dots */}
          <div className="auth-banner-footer">
            <h2>Introducing new features</h2>
            <p>
              Automated campaign flows, instant delivery receipts, and rock-solid cloud PostgreSQL architecture.
            </p>
            <div className="auth-slider-indicators">
              <div className="auth-indicator-pill" />
              <div className="auth-indicator-dot" />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
