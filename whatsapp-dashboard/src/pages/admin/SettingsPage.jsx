import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, getToken } from '../../services/api';
import '../../styles/settings.css';

// All tabs defined for Admin and Regular Users
const ALL_TABS = [
  { key: 'company',        icon: '▦',  label: 'Company',        adminOnly: true },
  { key: 'profile',        icon: '👤',  label: 'My Profile',     adminOnly: false },
  { key: 'api',            icon: '⚙',  label: 'API Setting',    adminOnly: false },
  { key: 'whatsapp',       icon: '◉',  label: 'WhatsApp',       adminOnly: false },
  { key: 'gdrive',         icon: '◈',  label: 'G Drive',        adminOnly: true },
  { key: 'gmail',          icon: '✉',  label: 'Gmail',          adminOnly: true },
  { key: 'gemini',         icon: '✦',  label: 'Gemini',         adminOnly: false },
  { key: 'email-template', icon: '▤',  label: 'Email Template', adminOnly: true },
  { key: 'system',         icon: '⚡',  label: 'System Info',    adminOnly: true },
  { key: 'security',       icon: '🔒',  label: 'Security',       adminOnly: false },
];

const apiGet  = (url) => api(url, { method: 'GET' });
const apiPost = (url, body) => api(url, { method: 'POST', body: JSON.stringify(body) });

function SInput({ type = 'text', value, onChange, placeholder, ...rest }) {
  return (
    <input
      className="sinput"
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      {...rest}
    />
  );
}

// ─── Tab 1: Company & Website Settings (Admin Only) ──────────────────────────
function CompanyTab({ notify }) {
  const { companySettings, updateCompanySettings } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('branding'); // 'branding' | 'website' | 'contact' | 'footer'
  const [form, setForm] = useState({
    companyName: '',
    faviconUrl: '',
    logoUrl: '',
    bannerUrl: '',
    websiteTitle: '',
    websiteTagline: '',
    heroBadge: '',
    heroTitle: '',
    heroSubtitle: '',
    heroDescription: '',
    ctaText: '',
    ctaLink: '',
    contactEmail: '',
    contactPhone: '',
    contactWhatsApp: '',
    contactAddress: '',
    contactBusinessEnquiry: '',
    workingHours: '',
    footerAbout: '',
    footerCopyright: '',
    developerCredit: '',
    socialFacebook: '',
    socialTwitter: '',
    socialInstagram: '',
    socialLinkedin: '',
    socialYoutube: ''
  });
  const [saving, setSaving] = useState(false);
  const [previewTheme, setPreviewTheme] = useState('light');
  const faviconInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    if (companySettings) {
      setForm({
        companyName: companySettings.companyName || '',
        faviconUrl: companySettings.faviconUrl || '',
        logoUrl: companySettings.logoUrl || '',
        bannerUrl: companySettings.bannerUrl || '',
        websiteTitle: companySettings.websiteTitle || '',
        websiteTagline: companySettings.websiteTagline || '',
        heroBadge: companySettings.heroBadge || '',
        heroTitle: companySettings.heroTitle || '',
        heroSubtitle: companySettings.heroSubtitle || '',
        heroDescription: companySettings.heroDescription || '',
        ctaText: companySettings.ctaText || '',
        ctaLink: companySettings.ctaLink || '',
        contactEmail: companySettings.contactEmail || '',
        contactPhone: companySettings.contactPhone || '',
        contactWhatsApp: companySettings.contactWhatsApp || '',
        contactAddress: companySettings.contactAddress || '',
        contactBusinessEnquiry: companySettings.contactBusinessEnquiry || '',
        workingHours: companySettings.workingHours || '',
        footerAbout: companySettings.footerAbout || '',
        footerCopyright: companySettings.footerCopyright || '',
        developerCredit: companySettings.developerCredit || '',
        socialFacebook: companySettings.socialFacebook || '',
        socialTwitter: companySettings.socialTwitter || '',
        socialInstagram: companySettings.socialInstagram || '',
        socialLinkedin: companySettings.socialLinkedin || '',
        socialYoutube: companySettings.socialYoutube || ''
      });
    }
  }, [companySettings]);

  const handleImageFile = (file, type) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      notify('File size must be under 8MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      if (type === 'favicon') {
        setForm(prev => ({ ...prev, faviconUrl: dataUrl }));
        notify('Favicon image loaded! Click Save to apply.', 'success');
      } else if (type === 'logo') {
        setForm(prev => ({ ...prev, logoUrl: dataUrl }));
        notify('Logo image loaded! Click Save to apply.', 'success');
      } else if (type === 'banner') {
        setForm(prev => ({ ...prev, bannerUrl: dataUrl }));
        notify('Login banner image loaded! Click Save to apply.', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const res = await apiPost('/api/settings/company', form);
      if (res.success) {
        if (updateCompanySettings) updateCompanySettings(res.settings || form);
        notify('Company & Website settings saved successfully!', 'success');
      } else {
        notify(res.message || 'Save failed', 'error');
      }
    } catch (err) {
      notify(err.message || 'Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm('Reset all website branding, contact info, and hero copy to defaults?')) return;
    const defaults = {
      companyName: 'Easy Recharge Solution',
      faviconUrl: '',
      logoUrl: '',
      bannerUrl: '',
      websiteTitle: 'Easy Recharge Solution — WhatsApp Automation',
      websiteTagline: 'WHATSAPP BUSINESS AUTOMATION',
      heroBadge: 'WHATSAPP BUSINESS AUTOMATION',
      heroTitle: 'Automate WhatsApp.',
      heroSubtitle: 'Grow your business.',
      heroDescription: 'Manage WhatsApp sessions, messaging, campaigns, contacts, API workflows and reports from one fast, organized workspace.',
      ctaText: 'Login',
      ctaLink: '/login',
      contactEmail: 'easyrechargesolution@gmail.com',
      contactPhone: '+91 88404 57632',
      contactWhatsApp: '8840457632',
      contactAddress: 'Meerpur, Prayagraj, Uttar Pradesh, India',
      contactBusinessEnquiry: 'API integration, WhatsApp automation और business workflow requirements.',
      workingHours: 'Mon - Sat: 9:00 AM - 7:00 PM',
      footerAbout: 'Messaging workflows, developer APIs and campaign tools for modern businesses.',
      footerCopyright: '© 2026 Easy Recharge Solution. All rights reserved.',
      developerCredit: 'PRINCE GOYAL',
      socialFacebook: '',
      socialTwitter: '',
      socialInstagram: '',
      socialLinkedin: '',
      socialYoutube: ''
    };
    setForm(defaults);
    setSaving(true);
    try {
      const res = await apiPost('/api/settings/company', defaults);
      if (res.success) {
        if (updateCompanySettings) updateCompanySettings(defaults);
        notify('Default website settings restored!', 'success');
      }
    } catch (err) {
      notify('Reset failed: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
      {/* Settings Form Column */}
      <article className="card settings-form" style={{ width: '100%', maxWidth: 'none' }}>
        <div className="scard-head">
          <div>
            <h3>Company &amp; Front Website Settings</h3>
            <p>Customize branding, landing page hero copy, Contact Us section, and footer in real-time.</p>
          </div>
          <button type="button" className="btn secondary" onClick={resetDefaults} style={{ padding: '6px 12px', fontSize: 12 }}>
            Reset Defaults
          </button>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
          {[
            { id: 'branding', icon: '🏢', label: '1. Branding & Logo' },
            { id: 'website',  icon: '🌐', label: '2. Hero & Website' },
            { id: 'contact',  icon: '📞', label: '3. Contact Us Section' },
            { id: 'footer',   icon: '📄', label: '4. Footer & Social' }
          ].map(st => (
            <button
              key={st.id}
              type="button"
              className={`btn ${activeSubTab === st.id ? 'primary' : 'secondary'}`}
              onClick={() => setActiveSubTab(st.id)}
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 6 }}
            >
              <span>{st.icon}</span>
              <strong>{st.label}</strong>
            </button>
          ))}
        </div>

        <div className="card-body">
          <form onSubmit={save}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* SECTION 1: BRANDING & LOGO */}
              {activeSubTab === 'branding' && (
                <>
                  <div className="field">
                    <label>COMPANY / PORTAL NAME</label>
                    <SInput
                      value={form.companyName}
                      onChange={v => setForm(f => ({ ...f, companyName: v }))}
                      placeholder="e.g. Easy Recharge Solution"
                    />
                    <small style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>
                      Appears on header navbar, tab titles, invoices, and user panels.
                    </small>
                  </div>

                  <div className="field">
                    <label>WEBSITE FAVICON (Browser Tab Icon)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        ref={faviconInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleImageFile(e.target.files?.[0], 'favicon')}
                      />
                      <button type="button" className="btn secondary" onClick={() => faviconInputRef.current?.click()} style={{ padding: '8px 14px' }}>
                        📁 Choose Favicon File
                      </button>
                      {form.faviconUrl && (
                        <img src={form.faviconUrl} alt="Favicon" style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #cbd5e1', objectFit: 'contain' }} />
                      )}
                      {form.faviconUrl && (
                        <button type="button" className="btn secondary" onClick={() => setForm(f => ({ ...f, faviconUrl: '' }))} style={{ padding: '4px 10px', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label>WEBSITE LOGO (Sidebar / Header / Marketing Nav)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleImageFile(e.target.files?.[0], 'logo')}
                      />
                      <button type="button" className="btn secondary" onClick={() => logoInputRef.current?.click()} style={{ padding: '8px 14px' }}>
                        📁 Choose Logo File
                      </button>
                      {form.logoUrl && (
                        <img src={form.logoUrl} alt="Logo" style={{ maxHeight: 34, maxWidth: 120, objectFit: 'contain', background: '#f1f5f9', padding: 4, borderRadius: 6 }} />
                      )}
                      {form.logoUrl && (
                        <button type="button" className="btn secondary" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} style={{ padding: '4px 10px', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="field">
                    <label>LOGIN &amp; SIGNUP PAGE BANNER (Right-side Graphic)</label>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        ref={bannerInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => handleImageFile(e.target.files?.[0], 'banner')}
                      />
                      <button type="button" className="btn secondary" onClick={() => bannerInputRef.current?.click()} style={{ padding: '8px 14px' }}>
                        📁 Choose Banner File
                      </button>
                      {form.bannerUrl && (
                        <img src={form.bannerUrl} alt="Login Banner" style={{ maxHeight: 42, maxWidth: 100, objectFit: 'cover', borderRadius: 6, border: '1px solid #cbd5e1' }} />
                      )}
                      {form.bannerUrl && (
                        <button type="button" className="btn secondary" onClick={() => setForm(f => ({ ...f, bannerUrl: '' }))} style={{ padding: '4px 10px', fontSize: 12 }}>
                          Remove
                        </button>
                      )}
                    </div>
                    <small style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>
                      Displays prominently on the right half of the Login &amp; Signup screens.
                    </small>
                  </div>
                </>
              )}

              {/* SECTION 2: HERO & WEBSITE COPY */}
              {activeSubTab === 'website' && (
                <>
                  <div className="field">
                    <label>WEBSITE BROWSER TITLE (SEO &amp; Tab Header)</label>
                    <SInput
                      value={form.websiteTitle}
                      onChange={v => setForm(f => ({ ...f, websiteTitle: v }))}
                      placeholder="e.g. Easy Recharge Solution — WhatsApp Automation"
                    />
                  </div>

                  <div className="field">
                    <label>HERO BADGE / TAGLINE (Above Headline)</label>
                    <SInput
                      value={form.heroBadge}
                      onChange={v => setForm(f => ({ ...f, heroBadge: v }))}
                      placeholder="e.g. WHATSAPP BUSINESS AUTOMATION"
                    />
                  </div>

                  <div className="field">
                    <label>HERO MAIN HEADLINE (Typing Line 1)</label>
                    <SInput
                      value={form.heroTitle}
                      onChange={v => setForm(f => ({ ...f, heroTitle: v }))}
                      placeholder="e.g. Automate WhatsApp."
                    />
                  </div>

                  <div className="field">
                    <label>HERO SUB-HEADLINE (Typing Line 2)</label>
                    <SInput
                      value={form.heroSubtitle}
                      onChange={v => setForm(f => ({ ...f, heroSubtitle: v }))}
                      placeholder="e.g. Grow your business."
                    />
                  </div>

                  <div className="field">
                    <label>HERO DESCRIPTION PARAGRAPH</label>
                    <textarea
                      className="sinput"
                      rows={3}
                      value={form.heroDescription}
                      onChange={e => setForm(f => ({ ...f, heroDescription: e.target.value }))}
                      placeholder="e.g. Manage WhatsApp sessions, messaging, campaigns, contacts, API workflows and reports from one fast workspace."
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>CTA BUTTON TEXT</label>
                      <SInput
                        value={form.ctaText}
                        onChange={v => setForm(f => ({ ...f, ctaText: v }))}
                        placeholder="e.g. Login / Get Started"
                      />
                    </div>
                    <div className="field">
                      <label>CTA BUTTON LINK</label>
                      <SInput
                        value={form.ctaLink}
                        onChange={v => setForm(f => ({ ...f, ctaLink: v }))}
                        placeholder="e.g. /login"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* SECTION 3: CONTACT US SECTION */}
              {activeSubTab === 'contact' && (
                <>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
                    💡 <strong>Live Dynamic Contact Us:</strong> Changing these details will automatically update the Contact Page, WhatsApp 1-Click chat link, and landing page contact cards immediately.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>SUPPORT EMAIL</label>
                      <SInput
                        type="email"
                        value={form.contactEmail}
                        onChange={v => setForm(f => ({ ...f, contactEmail: v }))}
                        placeholder="e.g. support@yourcompany.com"
                      />
                    </div>
                    <div className="field">
                      <label>PHONE / CALLING NUMBER</label>
                      <SInput
                        value={form.contactPhone}
                        onChange={v => setForm(f => ({ ...f, contactPhone: v }))}
                        placeholder="e.g. +91 88404 57632"
                      />
                    </div>
                  </div>

                  <div className="field">
                    <label>WHATSAPP NUMBER (For 1-Click Floating Chat Button)</label>
                    <SInput
                      value={form.contactWhatsApp}
                      onChange={v => setForm(f => ({ ...f, contactWhatsApp: v }))}
                      placeholder="e.g. 918840457632 (with country code, no + or spaces)"
                    />
                    <small style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>
                      Users tapping the floating ✆ WhatsApp icon on your website will directly open chat with this number.
                    </small>
                  </div>

                  <div className="field">
                    <label>OFFICE ADDRESS / LOCATION</label>
                    <textarea
                      className="sinput"
                      rows={2}
                      value={form.contactAddress}
                      onChange={e => setForm(f => ({ ...f, contactAddress: e.target.value }))}
                      placeholder="e.g. Meerpur, Prayagraj, Uttar Pradesh, India"
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div className="field">
                    <label>BUSINESS ENQUIRY &amp; SUPPORT NOTE</label>
                    <SInput
                      value={form.contactBusinessEnquiry}
                      onChange={v => setForm(f => ({ ...f, contactBusinessEnquiry: v }))}
                      placeholder="e.g. API integration, WhatsApp automation and custom business solutions."
                    />
                  </div>

                  <div className="field">
                    <label>WORKING / SUPPORT HOURS</label>
                    <SInput
                      value={form.workingHours}
                      onChange={v => setForm(f => ({ ...f, workingHours: v }))}
                      placeholder="e.g. Mon - Sat: 9:00 AM - 7:00 PM"
                    />
                  </div>
                </>
              )}

              {/* SECTION 4: FOOTER & SOCIAL */}
              {activeSubTab === 'footer' && (
                <>
                  <div className="field">
                    <label>FOOTER ABOUT SUMMARY</label>
                    <textarea
                      className="sinput"
                      rows={2}
                      value={form.footerAbout}
                      onChange={e => setForm(f => ({ ...f, footerAbout: e.target.value }))}
                      placeholder="e.g. Messaging workflows, developer APIs and campaign tools for modern businesses."
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="field">
                      <label>FOOTER COPYRIGHT TEXT</label>
                      <SInput
                        value={form.footerCopyright}
                        onChange={v => setForm(f => ({ ...f, footerCopyright: v }))}
                        placeholder="e.g. © 2026 Easy Recharge Solution. All rights reserved."
                      />
                    </div>
                    <div className="field">
                      <label>DEVELOPER / OWNER CREDIT NAME</label>
                      <SInput
                        value={form.developerCredit}
                        onChange={v => setForm(f => ({ ...f, developerCredit: v }))}
                        placeholder="e.g. PRINCE GOYAL"
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
                    <label style={{ fontWeight: 700, fontSize: 12, color: '#475569', marginBottom: 8, display: 'block' }}>
                      SOCIAL MEDIA PROFILES (Optional)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <SInput
                        value={form.socialFacebook}
                        onChange={v => setForm(f => ({ ...f, socialFacebook: v }))}
                        placeholder="Facebook URL"
                      />
                      <SInput
                        value={form.socialTwitter}
                        onChange={v => setForm(f => ({ ...f, socialTwitter: v }))}
                        placeholder="Twitter / X URL"
                      />
                      <SInput
                        value={form.socialInstagram}
                        onChange={v => setForm(f => ({ ...f, socialInstagram: v }))}
                        placeholder="Instagram URL"
                      />
                      <SInput
                        value={form.socialLinkedin}
                        onChange={v => setForm(f => ({ ...f, socialLinkedin: v }))}
                        placeholder="LinkedIn URL"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="submit" className="btn primary" disabled={saving} style={{ padding: '10px 24px', fontSize: 14 }}>
                  {saving ? 'Saving...' : '💾 Save All Website Settings'}
                </button>
                <small style={{ color: '#64748b' }}>Changes apply immediately to marketing site and user panel.</small>
              </div>

            </div>
          </form>
        </div>
      </article>

      {/* Live Preview Column */}
      <article className="card" style={{ width: '100%', maxWidth: 'none' }}>
        <div className="scard-head">
          <div>
            <h3>Live Front Website &amp; Branding Preview</h3>
            <p>Real-time visual preview of your changes as users see them</p>
          </div>
        </div>
        <div className="card-body">
          {/* 1. Browser Tab Preview */}
          <div className="preview-box">
            <small style={{ display: 'block', fontWeight: 800, color: '#718078', marginBottom: 6 }}>1. BROWSER TAB PREVIEW</small>
            <div className="browser-tab-mock">
              {form.faviconUrl ? (
                <img src={form.faviconUrl} alt="Favicon" />
              ) : (
                <span style={{ fontSize: 14 }}>⚡</span>
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {form.websiteTitle || (form.companyName ? `${form.companyName} — WhatsApp Automation` : 'Easy Recharge Solution — WhatsApp Automation')}
              </span>
              <span className="tab-close">×</span>
            </div>
          </div>

          {/* 2. Header & Logo Preview */}
          <div className="preview-box" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <small style={{ fontWeight: 800, color: '#718078' }}>2. WEBSITE NAVBAR &amp; LOGO PREVIEW</small>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className={`btn ${previewTheme === 'light' ? 'primary' : 'secondary'}`}
                  onClick={() => setPreviewTheme('light')}
                  style={{ padding: '3px 8px', fontSize: 11 }}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={`btn ${previewTheme === 'dark' ? 'primary' : 'secondary'}`}
                  onClick={() => setPreviewTheme('dark')}
                  style={{ padding: '3px 8px', fontSize: 11 }}
                >
                  Dark
                </button>
              </div>
            </div>
            <div className={`sidebar-logo-mock ${previewTheme}`} style={{ padding: '10px 14px', borderRadius: 8 }}>
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Brand Logo" style={{ maxHeight: 32, objectFit: 'contain' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(145deg, #35c987, #0f9b61)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900 }}>⚡</div>
                  <div>
                    <strong style={{ display: 'block', fontSize: 13 }}>{form.companyName || 'Easy Recharge Solution'}</strong>
                    <small style={{ display: 'block', fontSize: 9, opacity: 0.7 }}>WHATSAPP AUTOMATION</small>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Hero Section Preview */}
          <div className="preview-box" style={{ marginTop: 14 }}>
            <small style={{ display: 'block', fontWeight: 800, color: '#718078', marginBottom: 6 }}>3. HERO BANNER LIVE PREVIEW</small>
            <div style={{
              background: 'linear-gradient(145deg, #091a13, #0d281c)',
              color: '#fff',
              padding: '16px',
              borderRadius: 10,
              border: '1px solid rgba(53, 201, 135, 0.2)'
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(53,201,135,0.15)', color: '#35c987', padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#35c987' }}></span>
                {form.heroBadge || form.websiteTagline || 'WHATSAPP BUSINESS AUTOMATION'}
              </div>
              <h4 style={{ margin: '4px 0 2px 0', fontSize: 16, color: '#f8fafc', fontWeight: 800 }}>
                {form.heroTitle || 'Automate WhatsApp.'}
              </h4>
              <h5 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#35c987', fontWeight: 700, fontStyle: 'italic' }}>
                {form.heroSubtitle || 'Grow your business.'}
              </h5>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                {form.heroDescription || 'Manage WhatsApp sessions, messaging, campaigns, contacts, API workflows and reports from one fast workspace.'}
              </p>
              <div style={{ marginTop: 10 }}>
                <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #35c987, #0f9b61)', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                  {form.ctaText || 'Login'} →
                </span>
              </div>
            </div>
          </div>

          {/* 4. Contact Us Preview */}
          <div className="preview-box" style={{ marginTop: 14 }}>
            <small style={{ display: 'block', fontWeight: 800, color: '#718078', marginBottom: 6 }}>4. CONTACT US SECTION LIVE PREVIEW</small>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', fontSize: 11 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✉</span>
                  <div>
                    <strong>Email:</strong> <span style={{ color: '#0f766e' }}>{form.contactEmail || 'easyrechargesolution@gmail.com'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>☎</span>
                  <div>
                    <strong>Phone:</strong> <span style={{ color: '#0f766e' }}>{form.contactPhone || '+91 88404 57632'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>💬</span>
                  <div>
                    <strong>1-Click WhatsApp:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>+{form.contactWhatsApp || '918840457632'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>📍</span>
                  <div>
                    <strong>Location:</strong> <span style={{ color: '#475569' }}>{form.contactAddress || 'Meerpur, Prayagraj, Uttar Pradesh, India'}</span>
                  </div>
                </div>
                {form.workingHours && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>⏰</span>
                    <div>
                      <strong>Hours:</strong> <span style={{ color: '#475569' }}>{form.workingHours}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Footer Preview */}
          <div className="preview-box" style={{ marginTop: 14 }}>
            <small style={{ display: 'block', fontWeight: 800, color: '#718078', marginBottom: 6 }}>5. FOOTER &amp; DEVELOPER CREDIT PREVIEW</small>
            <div style={{ background: '#0f172a', color: '#94a3b8', borderRadius: 8, padding: '10px 14px', fontSize: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span>{form.footerCopyright || `© 2026 ${form.companyName || 'Easy Recharge Solution'}. All rights reserved.`}</span>
                <span>Developed by <strong style={{ color: '#fff' }}>{form.developerCredit || 'PRINCE GOYAL'}</strong></span>
              </div>
            </div>
          </div>

        </div>
      </article>
    </div>
  );
}

// ─── Tab 2: API Setting ───────────────────────────────────────────────────────
function ApiTab({ notify }) {
  const [form, setForm]   = useState({ allowedIp: '', callbackUrl: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/api/settings/api-setting')
      .then(r => { if (r?.data) setForm({ allowedIp: r.data.allowedIp || '', callbackUrl: r.data.callbackUrl || '' }); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiPost('/api/settings/api-setting', form);
      notify(r.success ? 'API Setting saved!' : (r.message || 'Save failed'), r.success ? 'success' : 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSaving(false);
  };

  return (
    <article className="card api-settings-card">
      <div className="scard-head">
        <div>
          <h3>API Setting</h3>
          <p>Configure allowed IP addresses and webhook callback URL for external API requests.</p>
        </div>
      </div>
      <div className="api-form">
        <div className="api-field">
          <label htmlFor="api-ip">Allowed IP (Leave blank for all)</label>
          <SInput id="api-ip" value={form.allowedIp} onChange={v => setForm(f => ({ ...f, allowedIp: v }))} placeholder="e.g. 192.168.1.100 or *" />
        </div>
        <div className="api-field">
          <label htmlFor="callback-url">Callback / Webhook URL</label>
          <SInput id="callback-url" type="url" value={form.callbackUrl} onChange={v => setForm(f => ({ ...f, callbackUrl: v }))} placeholder="https://your-crm.com/webhook" />
        </div>
        <div className="api-actions">
          <button className="btn primary" onClick={save} disabled={saving} style={{ height: 46 }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </article>
  );
}

// ─── Tab 3: WhatsApp Setting ──────────────────────────────────────────────────
function WhatsAppTab({ notify }) {
  const [queue,       setQueue]       = useState({ minDelay: '', maxDelay: '' });
  const [savingQueue, setSavingQueue] = useState(false);
  const [autoImg,     setAutoImg]     = useState({ enabled: false, imageUrl: '', fileName: '' });
  const [imgFile,     setImgFile]     = useState(null);
  const [savingImg,   setSavingImg]   = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    apiGet('/api/settings/wa-queue')
      .then(r => { if (r?.data) setQueue({ minDelay: r.data.minDelay ?? '', maxDelay: r.data.maxDelay ?? '' }); })
      .catch(() => {});

    apiGet('/api/user/settings/auto-image')
      .then(r => { if (r?.autoSendImage) setAutoImg({ enabled: r.autoSendImage.enabled || false, imageUrl: r.autoSendImage.imageUrl || '', fileName: r.autoSendImage.fileName || '' }); })
      .catch(() => {});
  }, []);

  const saveQueue = async () => {
    setSavingQueue(true);
    try {
      const r = await apiPost('/api/settings/wa-queue', { minDelay: Number(queue.minDelay), maxDelay: Number(queue.maxDelay) });
      notify(r.success ? 'Queue delay saved!' : (r.message || 'Save failed'), r.success ? 'success' : 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSavingQueue(false);
  };

  const saveAutoImg = async () => {
    setSavingImg(true);
    try {
      const fd = new FormData();
      fd.append('enabled', autoImg.enabled);
      fd.append('imageUrl', autoImg.imageUrl || '');
      if (imgFile) fd.append('image', imgFile);
      const res = await fetch('/api/user/settings/auto-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      });
      const r = await res.json();
      notify(r.success ? 'Auto image settings saved!' : (r.message || 'Save failed'), r.success ? 'success' : 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSavingImg(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Card 1: Queue Delay */}
      <article className="card wa-setting-card">
        <div className="scard-head">
          <div>
            <h3>Message Queue Delay</h3>
            <p>Control anti-ban delivery intervals between bulk messages.</p>
          </div>
        </div>
        <div className="wa-form-row">
          <div className="wa-field">
            <label>MIN DELAY (SECONDS)</label>
            <SInput type="number" min="0" value={queue.minDelay} onChange={v => setQueue(q => ({ ...q, minDelay: v }))} placeholder="3" />
          </div>
          <div className="wa-field">
            <label>MAX DELAY (SECONDS)</label>
            <SInput type="number" min="0" value={queue.maxDelay} onChange={v => setQueue(q => ({ ...q, maxDelay: v }))} placeholder="8" />
          </div>
          <button className="btn primary" onClick={saveQueue} disabled={savingQueue} style={{ height: 46 }}>
            {savingQueue ? 'Saving…' : 'Save'}
          </button>
        </div>
      </article>

      {/* Card 2: Auto Send Image with WhatsApp Live Preview */}
      <article className="card wa-setting-card">
        <div className="scard-head">
          <div>
            <h3>Auto Send Image with API Message</h3>
            <p>Automatically attach your promotional banner, flyer, or business card whenever an API message is sent.</p>
          </div>
          <button
            type="button"
            className={`compact-toggle ${autoImg.enabled ? 'on' : 'off'}`}
            onClick={() => setAutoImg(a => ({ ...a, enabled: !a.enabled }))}
          >
            <span />
            {autoImg.enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <div className="field">
                <label>UPLOAD IMAGE OR ENTER IMAGE URL</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setImgFile(f);
                        const r = new FileReader();
                        r.onload = ev => setAutoImg(prev => ({ ...prev, imageUrl: ev.target.result, fileName: f.name }));
                        r.readAsDataURL(f);
                      }
                    }}
                  />
                  <button type="button" className="btn secondary" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 12px' }}>
                    📁 Choose Image File
                  </button>
                  {autoImg.imageUrl && (
                    <button type="button" className="btn secondary" onClick={() => { setAutoImg(a => ({ ...a, imageUrl: '', fileName: '' })); setImgFile(null); }} style={{ padding: '4px 10px', fontSize: 12 }}>
                      Clear
                    </button>
                  )}
                </div>
                <SInput
                  value={autoImg.imageUrl?.startsWith('data:') ? '' : autoImg.imageUrl}
                  onChange={v => setAutoImg(a => ({ ...a, imageUrl: v }))}
                  placeholder="Or paste public Image URL (https://...)"
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <button type="button" className="btn primary" onClick={saveAutoImg} disabled={savingImg}>
                  {savingImg ? 'Saving...' : '💾 Save Image Settings'}
                </button>
              </div>
            </div>

            {/* Simulated WhatsApp Bubble */}
            <div>
              <small style={{ fontWeight: 800, color: '#718078', display: 'block', marginBottom: 8 }}>WHATSAPP LIVE PREVIEW</small>
              <div style={{ background: '#eae6df', padding: 14, borderRadius: 12, minHeight: 180, display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ background: '#d9fdd3', borderRadius: '8px 2px 8px 8px', maxWidth: '85%', width: 240, padding: 4, boxShadow: '0 1px 2px rgba(0,0,0,.15)' }}>
                  {autoImg.imageUrl ? (
                    <img src={autoImg.imageUrl} alt="Preview" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                  ) : (
                    <div style={{ height: 100, background: '#e2e8f0', borderRadius: 6, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 12 }}>
                      No Image Selected
                    </div>
                  )}
                  <div style={{ padding: '6px 8px', fontSize: 12, color: '#111b21', lineHeight: 1.4 }}>
                    Hello! This caption represents your automated WhatsApp message. ✨
                    <div style={{ textAlign: 'right', fontSize: 10, color: '#53bdeb', fontWeight: 'bold', marginTop: 2 }}>✓✓ 12:45 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── Tab 4: G Drive Setting (Admin Only) ──────────────────────────────────────
function GDriveTab({ notify }) {
  const [form, setForm] = useState({ clientId: '', clientSecret: '', redirectUri: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/api/settings/gdrive')
      .then(r => { if (r?.data) setForm({ clientId: r.data.clientId || '', clientSecret: r.data.clientSecret || '', redirectUri: r.data.redirectUri || '' }); })
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const r = await apiPost('/api/settings/gdrive', form);
      notify(r.success ? 'Google Drive settings saved!' : (r.message || 'Save failed'), r.success ? 'success' : 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSaving(false);
  };

  return (
    <article className="card settings-form">
      <div className="scard-head">
        <div>
          <h3>Google Drive Setting</h3>
          <p>Configure Google Drive OAuth credentials for cloud backup and file attachments.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
      <div className="card-body">
        <div className="fields">
          <div className="field">
            <label>GOOGLE CLIENT ID</label>
            <SInput value={form.clientId} onChange={v => setForm(f => ({ ...f, clientId: v }))} placeholder="Enter OAuth Client ID" />
          </div>
          <div className="field">
            <label>GOOGLE CLIENT SECRET</label>
            <SInput type="password" value={form.clientSecret} onChange={v => setForm(f => ({ ...f, clientSecret: v }))} placeholder="Enter Client Secret" />
          </div>
          <div className="field full">
            <label>REDIRECT URI</label>
            <SInput value={form.redirectUri} onChange={v => setForm(f => ({ ...f, redirectUri: v }))} placeholder="https://your-domain.com/oauth2callback" />
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Tab: User Profile (All Users & Admin) ──────────────────────────────────
function ProfileTab({ notify }) {
  const { currentUser, setCurrentUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    username: '',
    mobile: '',
    plan: '',
    planExpiresAt: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/api/user/profile')
      .then(r => {
        if (r?.profile) {
          setProfile({
            name: r.profile.name || '',
            email: r.profile.email || '',
            username: r.profile.username || '',
            mobile: r.profile.mobile || '',
            plan: r.profile.plan || 'Standard',
            planExpiresAt: r.profile.planExpiresAt || ''
          });
        }
      })
      .catch(() => {
        if (currentUser) {
          setProfile({
            name: currentUser.name || '',
            email: currentUser.email || '',
            username: currentUser.username || '',
            mobile: currentUser.mobile || '',
            plan: currentUser.plan || 'Standard',
            planExpiresAt: currentUser.planExpiresAt || ''
          });
        }
      });
  }, [currentUser]);

  const save = async (e) => {
    e?.preventDefault();
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) {
      return notify('कृपया एक मान्य ईमेल पता (Valid Email Address) दर्ज करें।', 'error');
    }
    setSaving(true);
    try {
      const res = await apiPost('/api/user/profile', {
        name: profile.name.trim(),
        email: profile.email.trim().toLowerCase()
      });
      if (res.success) {
        notify('Profile और Email सफलतापूर्वक सेव हो गया!', 'success');
        if (res.profile) {
          setCurrentUser(prev => {
            const upd = { ...prev, name: res.profile.name, email: res.profile.email };
            try { localStorage.setItem('wa_user', JSON.stringify(upd)); } catch {}
            return upd;
          });
        }
      } else {
        notify(res.message || 'Save failed', 'error');
      }
    } catch (err) {
      notify(err.message || 'Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="card settings-form" style={{ maxWidth: 720 }}>
      <div className="scard-head">
        <div>
          <h3>My Profile &amp; Email Notification Settings</h3>
          <p>Manage your account name and email address to receive real-time updates and notifications.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : '💾 Save Profile'}
        </button>
      </div>
      <div className="card-body">
        <form onSubmit={save}>
          <div className="fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div className="field">
              <label>FULL NAME</label>
              <SInput
                value={profile.name}
                onChange={v => setProfile(p => ({ ...p, name: v }))}
                placeholder="e.g. Prince Goyal"
              />
            </div>
            <div className="field">
              <label>EMAIL ADDRESS (FOR ALERTS &amp; NOTIFICATIONS)</label>
              <SInput
                type="email"
                value={profile.email}
                onChange={v => setProfile(p => ({ ...p, email: v }))}
                placeholder="e.g. yourname@gmail.com"
              />
              <small style={{ color: '#10b981', marginTop: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                💡 Plan approval, expiry alerts, and system notices will be sent to this email.
              </small>
            </div>
            <div className="field">
              <label>LOGIN USERNAME / ID</label>
              <SInput value={profile.username} disabled style={{ background: '#f8fafc', opacity: 0.8 }} />
            </div>
            <div className="field">
              <label>REGISTERED MOBILE</label>
              <SInput value={profile.mobile ? `+${profile.mobile}` : ''} disabled style={{ background: '#f8fafc', opacity: 0.8 }} />
            </div>
            <div className="field">
              <label>CURRENT PLAN</label>
              <SInput value={profile.plan} disabled style={{ background: '#f8fafc', opacity: 0.8 }} />
            </div>
            <div className="field">
              <label>PLAN EXPIRY</label>
              <SInput
                value={profile.planExpiresAt ? new Date(profile.planExpiresAt).toLocaleDateString() : 'Active'}
                disabled
                style={{ background: '#f8fafc', opacity: 0.8 }}
              />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn primary" disabled={saving} style={{ height: 42, padding: '0 24px' }}>
              {saving ? 'Saving Changes…' : '💾 Save Profile & Email'}
            </button>
          </div>
        </form>
      </div>
    </article>
  );
}

// ─── Tab 5: Gmail Setting (Admin Only) ────────────────────────────────────────
function GmailTab({ notify }) {
  const [form, setForm] = useState({
    gmail: '',
    smtp: 'smtp.gmail.com',
    port: 465,
    ssl: true,
    password: '',
    fromName: 'Easy Recharge Solution',
    isEnabled: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    apiGet('/api/settings/gmail')
      .then(r => {
        if (r?.data) {
          setForm({
            gmail: r.data.gmail || r.data.gmailAddress || '',
            smtp: r.data.smtp || r.data.smtpHost || 'smtp.gmail.com',
            port: Number(r.data.port || r.data.smtpPort || 465),
            ssl: r.data.ssl !== undefined ? Boolean(r.data.ssl) : true,
            password: r.data.password || r.data.appPassword || '',
            fromName: r.data.fromName || 'Easy Recharge Solution',
            isEnabled: r.data.isEnabled !== undefined ? Boolean(r.data.isEnabled) : true
          });
          if (r.data.gmail || r.data.gmailAddress) {
            setTestEmail(r.data.gmail || r.data.gmailAddress);
          }
        }
      })
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    if (!form.gmail) {
      return notify('कृपया Gmail / Sender Email पता दर्ज करें।', 'error');
    }
    setSaving(true);
    try {
      const r = await apiPost('/api/settings/gmail', form);
      if (r.success) {
        notify('Gmail & SMTP settings saved successfully!', 'success');
        if (r.data) {
          setForm(prev => ({
            ...prev,
            ...r.data,
            password: r.data.password || prev.password
          }));
        }
      } else {
        notify(r.message || 'Save failed', 'error');
      }
    } catch (e) {
      notify(e.message || 'Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (e) => {
    e?.preventDefault();
    if (!testEmail || !testEmail.includes('@')) {
      return notify('कृपया टेस्ट ईमेल भेजने के लिए एक वैध ईमेल पता दर्ज करें।', 'error');
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiPost('/api/settings/gmail/test', {
        testEmail: testEmail.trim(),
        config: form
      });
      if (res.success) {
        setTestResult({ success: true, message: res.message || 'Test email sent successfully!' });
        notify('Test Email successfully sent!', 'success');
      } else {
        setTestResult({ success: false, message: res.message || 'Failed to send test email.' });
        notify(res.message || 'Test email failed', 'error');
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message || 'Error communicating with server.' });
      notify(err.message || 'Test email error', 'error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <article className="card settings-form">
        <div className="scard-head">
          <div>
            <h3>Gmail &amp; SMTP Configuration</h3>
            <p>Configure manual SMTP credentials. All user notifications (Welcome, Plan Approval/Rejection, Expiry) will be delivered via this email.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className={`compact-toggle ${form.isEnabled ? 'on' : 'off'}`}
              onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
            >
              <span />
              {form.isEnabled ? 'Service Active' : 'Service Disabled'}
            </button>
            <button className="btn primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Settings'}
            </button>
          </div>
        </div>

        <div className="card-body">
          <form onSubmit={save}>
            <div className="fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
              {/* Field 1: Gmail */}
              <div className="field">
                <label>GMAIL / SENDER ADDRESS</label>
                <SInput
                  type="email"
                  value={form.gmail}
                  onChange={v => setForm(f => ({ ...f, gmail: v }))}
                  placeholder="yourname@gmail.com"
                  required
                />
              </div>

              {/* Field 2: SMTP Host */}
              <div className="field">
                <label>SMTP HOST</label>
                <SInput
                  value={form.smtp}
                  onChange={v => setForm(f => ({ ...f, smtp: v }))}
                  placeholder="smtp.gmail.com"
                  required
                />
              </div>

              {/* Field 3: Port */}
              <div className="field">
                <label>PORT</label>
                <SInput
                  type="number"
                  value={form.port}
                  onChange={v => {
                    const p = parseInt(v, 10) || 465;
                    setForm(f => ({ ...f, port: p, ssl: p === 465 }));
                  }}
                  placeholder="465"
                  required
                />
              </div>

              {/* Field 4: SSL Toggle */}
              <div className="field">
                <label>SSL / SECURE CONNECTION</label>
                <div style={{ display: 'flex', alignItems: 'center', height: 44, gap: 10 }}>
                  <button
                    type="button"
                    className={`btn ${form.ssl ? 'primary' : 'secondary'}`}
                    onClick={() => setForm(f => ({ ...f, ssl: !f.ssl }))}
                    style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700 }}
                  >
                    SSL: {form.ssl ? 'ON (Port 465)' : 'OFF / STARTTLS (Port 587)'}
                  </button>
                </div>
              </div>

              {/* Field 5: Password with Show/Hide */}
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>PASSWORD / GOOGLE APP PASSWORD (16-DIGITS)</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <SInput
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={v => setForm(f => ({ ...f, password: v }))}
                      placeholder="XXXXXXXXXX (Enter 16-character App Password)"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ height: 44, padding: '0 14px', whiteSpace: 'nowrap' }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈 Hide' : '👁 Show'}
                  </button>
                </div>
                <small style={{ color: '#64748b', marginTop: 4, display: 'block', fontSize: 11 }}>
                  🔒 For Gmail, use an <strong>App Password</strong> generated from Google Account Security.
                </small>
              </div>

              {/* Field 6: Sender Name */}
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>FROM NAME / SENDER BRAND TITLE</label>
                <SInput
                  value={form.fromName}
                  onChange={v => setForm(f => ({ ...f, fromName: v }))}
                  placeholder="e.g. Easy Recharge Solution"
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button type="submit" className="btn primary" disabled={saving} style={{ padding: '10px 24px' }}>
                {saving ? 'Saving…' : '💾 Save Gmail & SMTP Settings'}
              </button>
            </div>
          </form>
        </div>
      </article>

      {/* Card 2: Send Test Email */}
      <article className="card">
        <div className="scard-head">
          <div>
            <h3>✉ Test SMTP Connection</h3>
            <p>Send an immediate test email to verify your credentials and deliverability.</p>
          </div>
        </div>
        <div className="card-body">
          <form onSubmit={handleTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
            <div className="field">
              <label>SEND TEST EMAIL TO</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <SInput
                  type="email"
                  value={testEmail}
                  onChange={setTestEmail}
                  placeholder="your-personal-email@gmail.com"
                  required
                />
                <button
                  type="submit"
                  className="btn primary"
                  disabled={testing || saving}
                  style={{ height: 44, whiteSpace: 'nowrap', padding: '0 20px' }}
                >
                  {testing ? 'Sending…' : '✉ Send Test Email'}
                </button>
              </div>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
                  color: testResult.success ? '#15803d' : '#b91c1c'
                }}
              >
                {testResult.message}
              </div>
            )}
          </form>

          {/* Quick Guide */}
          <div style={{ marginTop: 20, background: '#f8fafc', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
            <strong style={{ display: 'block', color: '#0f172a', marginBottom: 4 }}>💡 How to setup Gmail App Password:</strong>
            1. Open your Google Account &gt; <strong>Security</strong>.<br />
            2. Ensure <strong>2-Step Verification</strong> is turned ON.<br />
            3. Search for <strong>App Passwords</strong> and create a password for "Mail".<br />
            4. Copy the generated 16-letter code and paste into the <strong>Password</strong> field above.
          </div>
        </div>
      </article>
    </div>
  );
}

// ─── Tab 6: Gemini AI ─────────────────────────────────────────────────────────
function GeminiTab({ notify }) {
  const [keys, setKeys]   = useState([{ id: `g_${Date.now()}`, apiKey: '', model: 'Gemini Flash' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/api/settings/gemini')
      .then(r => { if (Array.isArray(r?.keys) && r.keys.length > 0) setKeys(r.keys); })
      .catch(() => {});
  }, []);

  const addKey    = () => setKeys(k => [...k, { id: `g_${Date.now()}`, apiKey: '', model: 'Gemini Flash' }]);
  const removeKey = (id) => { if (keys.length > 1) setKeys(k => k.filter(x => x.id !== id)); };
  const updateKey = (id, field, value) => setKeys(k => k.map(x => x.id === id ? { ...x, [field]: value } : x));

  const save = async () => {
    setSaving(true);
    try {
      const r = await apiPost('/api/settings/gemini', { keys });
      if (r.success) { notify('Gemini settings saved!', 'success'); if (Array.isArray(r.keys)) setKeys(r.keys); }
      else notify(r.message || 'Save failed', 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSaving(false);
  };

  return (
    <article className="card settings-form">
      <div className="scard-head">
        <div><h3>Gemini API Settings</h3><p>Add and manage multiple Gemini API keys for AI chat and auto-replies.</p></div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <div className="card-body">
        <div className="gemini-keys">
          {keys.map(k => (
            <div key={k.id} className="gemini-row">
              <div className="field">
                <label>GEMINI API KEY</label>
                <SInput type="password" value={k.apiKey} onChange={v => updateKey(k.id, 'apiKey', v)} placeholder="Enter Gemini API key" />
              </div>
              <div className="field">
                <label>MODEL</label>
                <select className="select sinput" value={k.model} onChange={e => updateKey(k.id, 'model', e.target.value)}>
                  <option>Gemini Flash</option>
                  <option>Gemini Pro</option>
                  <option>Gemini 1.5 Flash</option>
                  <option>Gemini 1.5 Pro</option>
                </select>
              </div>
              <button type="button" className="remove-key" title="Remove" onClick={() => removeKey(k.id)} disabled={keys.length <= 1}>×</button>
            </div>
          ))}
        </div>
        <div className="actions-row">
          <button type="button" className="btn secondary" onClick={addKey}>＋ Add Gemini Key</button>
        </div>
      </div>
    </article>
  );
}

// ─── Tab 7: Email Template (Admin Only) ───────────────────────────────────────
function EmailTemplateTab({ notify }) {
  const [form, setForm] = useState({ subject: '', htmlTemplate: '', availableVariables: '{{name}}, {{number}}, {{message}}' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/api/settings/email-template')
      .then(r => { if (r?.data) setForm(r.data); })
      .catch(() => {});
  }, []);

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const r = await apiPost('/api/settings/email-template', form);
      notify(r.success ? 'Email template saved!' : (r.message || 'Save failed'), r.success ? 'success' : 'error');
    } catch (e) { notify(e.message || 'Network error', 'error'); }
    setSaving(false);
  };

  return (
    <article className="card settings-form">
      <div className="scard-head">
        <div>
          <h3>Email Template</h3>
          <p>Create and customize HTML template for customer emails and transaction notifications.</p>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
      </div>
      <div className="card-body">
        <div className="fields">
          <div className="field full">
            <label>EMAIL SUBJECT</label>
            <SInput value={form.subject} onChange={v => setForm(f => ({ ...f, subject: v }))} placeholder="e.g. WhatsApp Service Notification - {{name}}" />
          </div>
          <div className="field full">
            <label>HTML TEMPLATE CODE</label>
            <textarea
              className="textarea sinput"
              rows={8}
              style={{ fontFamily: 'Consolas, monospace', fontSize: 13, height: 'auto', minHeight: 180 }}
              value={form.htmlTemplate}
              onChange={e => setForm(f => ({ ...f, htmlTemplate: e.target.value }))}
              placeholder="<p>Dear {{name}},</p><p>Your WhatsApp message has been delivered to {{number}}.</p>"
            />
          </div>
          <div className="field full">
            <label>AVAILABLE VARIABLES</label>
            <SInput value={form.availableVariables} onChange={v => setForm(f => ({ ...f, availableVariables: v }))} placeholder="{{name}}, {{number}}, {{message}}" />
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Tab 8: System & Keep-Alive (Admin Only) ──────────────────────────────────
function SystemTab({ notify }) {
  const [pingData, setPingData] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [pinging, setPinging] = useState(false);

  // Demo Plan Settings State
  const [demoForm, setDemoForm] = useState({
    demoDays: 7,
    planName: 'Demo Plan',
    dailyLimit: '100/Day',
    enabled: true
  });
  const [savingDemo, setSavingDemo] = useState(false);

  const loadData = useCallback(() => {
    apiGet('/api/system/autoping').then(r => setPingData(r?.stats)).catch(() => {});
    apiGet('/api/admin/system-info').then(r => setSystemInfo(r?.info)).catch(() => {});
    apiGet('/api/settings/demo').then(r => {
      if (r?.settings) {
        setDemoForm({
          demoDays: r.settings.demoDays || 7,
          planName: r.settings.planName || 'Demo Plan',
          dailyLimit: r.settings.dailyLimit || '100/Day',
          enabled: r.settings.enabled !== false
        });
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 15000);
    return () => clearInterval(t);
  }, [loadData]);

  const triggerPing = async () => {
    setPinging(true);
    try {
      const res = await apiPost('/api/system/autoping/trigger', {});
      if (res?.stats) setPingData(res.stats);
      notify('Keep-Alive Ping triggered successfully!', 'success');
    } catch (e) {
      notify(e.message || 'Ping failed', 'error');
    } finally {
      setPinging(false);
    }
  };

  const handleSaveDemoSettings = async (e) => {
    e?.preventDefault();
    setSavingDemo(true);
    try {
      const res = await apiPost('/api/settings/demo', {
        demoDays: Number(demoForm.demoDays) || 7,
        planName: demoForm.planName || 'Demo Plan',
        dailyLimit: demoForm.dailyLimit || '100/Day',
        enabled: Boolean(demoForm.enabled)
      });
      if (res.success) {
        notify('Demo Plan Settings (डेमो सेटिंग) सफलतापूर्वक सेव हो गईं!', 'success');
      } else {
        notify(res.message || 'Save failed', 'error');
      }
    } catch (err) {
      notify(err.message || 'Network error', 'error');
    } finally {
      setSavingDemo(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Demo Plan & Trial Validity Setting Card */}
      <article className="card settings-form">
        <div className="scard-head">
          <div>
            <h3>🎁 Demo Plan &amp; Trial Validity Setting (डेमो सेटिंग)</h3>
            <p>नए साइनअप करने वाले यूज़र्स को बाय-डिफ़ॉल्ट कितने दिन (Validity Days) का डेमो प्लान मिलेगा यह यहाँ सेट करें।</p>
          </div>
          <button 
            className="btn primary" 
            onClick={handleSaveDemoSettings} 
            disabled={savingDemo}
            style={{ height: 38, padding: '0 16px' }}
          >
            {savingDemo ? 'Saving…' : 'Save Demo Setting'}
          </button>
        </div>
        <div className="card-body">
          <div className="fields">
            <div className="field">
              <label>DEMO VALIDITY (DAYS / कितने दिन का डेमो मिलेगा)</label>
              <SInput 
                type="number" 
                min="1" 
                max="365" 
                value={demoForm.demoDays} 
                onChange={v => setDemoForm(f => ({ ...f, demoDays: v }))} 
                placeholder="7" 
              />
              <small style={{ color: '#64748b', fontSize: 12, marginTop: 4, display: 'block' }}>
                जैसे: 7 दिन, 3 दिन, या 15 दिन। इस अवधि के बाद यूज़र का डेमो प्लान Expire हो जाएगा।
              </small>
            </div>
            <div className="field">
              <label>DEMO PLAN NAME (प्लान का नाम)</label>
              <SInput 
                value={demoForm.planName} 
                onChange={v => setDemoForm(f => ({ ...f, planName: v }))} 
                placeholder="Demo Plan" 
              />
            </div>
            <div className="field">
              <label>DAILY MESSAGE LIMIT (दैनिक मैसेज सीमा)</label>
              <SInput 
                value={demoForm.dailyLimit} 
                onChange={v => setDemoForm(f => ({ ...f, dailyLimit: v }))} 
                placeholder="100/Day" 
              />
            </div>
            <div className="field">
              <label>DEMO STATUS</label>
              <select 
                className="select sinput" 
                value={demoForm.enabled ? 'active' : 'inactive'} 
                onChange={e => setDemoForm(f => ({ ...f, enabled: e.target.value === 'active' }))}
              >
                <option value="active">Active (सभी नए Signup यूज़र्स को स्वतः डेमो प्लान दें)</option>
                <option value="inactive">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </article>

      {/* Auto-Ping Card */}
      <article className="card">
        <div className="scard-head">
          <div>
            <h3>⏰ Render 24/7 Keep-Alive AutoPing</h3>
            <p>Automatic background ping scheduler to keep your server running 24/7 without going to sleep.</p>
          </div>
          <button className="btn primary" onClick={triggerPing} disabled={pinging} style={{ height: 38, padding: '0 16px' }}>
            {pinging ? 'Pinging...' : '⚡ Ping Now'}
          </button>
        </div>
        <div className="card-body">
          <div className="system-stats-grid">
            <div className="sys-stat-card">
              <small>Scheduler Status</small>
              <strong style={{ color: '#15803d' }}>● Active (24/7 Awake)</strong>
            </div>
            <div className="sys-stat-card">
              <small>Ping Interval</small>
              <strong>{pingData?.intervalMinutes ? `${pingData.intervalMinutes} Minutes` : '5 Minutes'}</strong>
            </div>
            <div className="sys-stat-card">
              <small>Total Successful Pings</small>
              <strong>{pingData?.totalPings ?? 0}</strong>
            </div>
            <div className="sys-stat-card">
              <small>Last Ping Response</small>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                {pingData?.lastPingStatus || 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* System Specifications Card */}
      {systemInfo && (
        <article className="card">
          <div className="scard-head">
            <div>
              <h3>Server Specifications & Host Info</h3>
              <p>Platform hardware and Node.js runtime information</p>
            </div>
          </div>
          <div className="card-body">
            <div className="system-stats-grid">
              <div className="sys-stat-card">
                <small>Platform & OS</small>
                <strong>{systemInfo.platform || 'Linux'}</strong>
              </div>
              <div className="sys-stat-card">
                <small>Node.js Runtime</small>
                <strong>{systemInfo.nodeVersion || process.version}</strong>
              </div>
              <div className="sys-stat-card">
                <small>Server Uptime</small>
                <strong>{systemInfo.uptime || 'Active'}</strong>
              </div>
              <div className="sys-stat-card">
                <small>Memory (RAM) Usage</small>
                <strong>{systemInfo.memoryUsage || 'Normal'}</strong>
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

// ─── Tab 9: Security ──────────────────────────────────────────────────────────
function SecurityTab({ notify }) {
  const [form, setForm]   = useState({ oldPassword: '', newPassword: '', rePassword: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.oldPassword) return notify('Please enter your current password', 'error');
    if (!form.newPassword) return notify('Please enter a new password', 'error');
    if (form.newPassword.length < 6) return notify('New password must be at least 6 characters', 'error');
    if (form.newPassword !== form.rePassword) return notify('New passwords do not match', 'error');
    setSaving(true);
    try {
      let r;
      try {
        r = await apiPost('/api/user/change-password', {
          currentPassword: form.oldPassword,
          newPassword:     form.newPassword,
        });
      } catch (err) {
        if (err.message && err.message.includes('404')) {
          r = await apiPost('/api/auth/change-password', {
            currentPassword: form.oldPassword,
            newPassword:     form.newPassword,
          });
        } else {
          throw err;
        }
      }
      if (r && r.success) {
        notify(r.message || 'Password updated successfully!', 'success');
        setForm({ oldPassword: '', newPassword: '', rePassword: '' });
      } else {
        notify((r && r.message) || 'Password update failed', 'error');
      }
    } catch (e) {
      notify(e.message || 'Network error', 'error');
    }
    setSaving(false);
  };

  return (
    <article className="card security-card" style={{ maxWidth: 640 }}>
      <div className="scard-head">
        <div><h3>Change Password</h3><p>Update your account password securely.</p></div>
      </div>
      <div className="security-form" style={{ padding: '20px' }}>
        <div className="security-field" style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 800, fontSize: 12, marginBottom: 6 }}>CURRENT PASSWORD</label>
          <SInput type="password" value={form.oldPassword} onChange={v => setForm(f => ({ ...f, oldPassword: v }))} placeholder="Enter current password" />
        </div>
        <div className="security-field" style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontWeight: 800, fontSize: 12, marginBottom: 6 }}>NEW PASSWORD</label>
          <SInput type="password" value={form.newPassword} onChange={v => setForm(f => ({ ...f, newPassword: v }))} placeholder="Enter new password (min 6 characters)" />
        </div>
        <div className="security-field" style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontWeight: 800, fontSize: 12, marginBottom: 6 }}>CONFIRM NEW PASSWORD</label>
          <SInput type="password" value={form.rePassword} onChange={v => setForm(f => ({ ...f, rePassword: v }))} placeholder="Re-enter new password" />
        </div>
        <div className="security-actions">
          <button className="btn primary" onClick={save} disabled={saving} style={{ height: 44, padding: '0 24px' }}>
            {saving ? 'Updating Password…' : '🔒 Update Password'}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────
export default function SettingsPage({ defaultTab = 'company' }) {
  const { notify, isAdmin } = useAuth();

  // If Admin: show all 9 tabs. If regular user: show only user tabs.
  const visibleTabs = ALL_TABS.filter(t => isAdmin || !t.adminOnly);

  const initialTab = () => {
    if (isAdmin) {
      return defaultTab || 'company';
    }
    return defaultTab === 'company' || defaultTab === 'gdrive' || defaultTab === 'gmail' || defaultTab === 'email-template' || defaultTab === 'system'
      ? 'api'
      : defaultTab;
  };

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!isAdmin && ['company', 'gdrive', 'gmail', 'email-template', 'system'].includes(activeTab)) {
      setActiveTab('api');
    }
  }, [isAdmin, activeTab]);

  return (
    <div className="content settings-page">
      <div className="settings-subnav">
        {visibleTabs.map(t => (
          <a
            key={t.key}
            href="#"
            className={activeTab === t.key ? 'active' : ''}
            onClick={e => { e.preventDefault(); setActiveTab(t.key); }}
          >
            <span>{t.icon}</span><b>{t.label}</b>
          </a>
        ))}
      </div>

      {activeTab === 'company'        && <CompanyTab        notify={notify} />}
      {activeTab === 'profile'        && <ProfileTab        notify={notify} />}
      {activeTab === 'api'            && <ApiTab            notify={notify} />}
      {activeTab === 'whatsapp'       && <WhatsAppTab       notify={notify} />}
      {activeTab === 'gdrive'         && <GDriveTab         notify={notify} />}
      {activeTab === 'gmail'          && <GmailTab          notify={notify} />}
      {activeTab === 'gemini'         && <GeminiTab         notify={notify} />}
      {activeTab === 'email-template' && <EmailTemplateTab notify={notify} />}
      {activeTab === 'system'         && <SystemTab         notify={notify} />}
      {activeTab === 'security'       && <SecurityTab       notify={notify} />}
    </div>
  );
}
