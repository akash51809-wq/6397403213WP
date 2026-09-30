import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

export default function EmailPromptModal() {
  const { currentUser, setCurrentUser, notify } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if user is logged in, email is empty, and not dismissed in this session
    if (currentUser?.userId) {
      const hasEmail = currentUser.email && String(currentUser.email).trim().length > 0;
      const isDismissed = sessionStorage.getItem(`email_prompt_dismissed_${currentUser.userId}`);
      if (!hasEmail && !isDismissed) {
        setEmail('');
        setName(currentUser.name || '');
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (currentUser?.userId) {
      sessionStorage.setItem(`email_prompt_dismissed_${currentUser.userId}`, '1');
    }
    setIsOpen(false);
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setErrorMsg('');

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('कृपया एक मान्य ईमेल आईडी दर्ज करें (e.g. user@gmail.com)');
      return;
    }

    setSaving(true);
    try {
      const res = await api('/api/user/profile', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim() || currentUser?.name || currentUser?.username,
          email: cleanEmail
        })
      });

      if (res && res.success) {
        notify('✅ ईमेल सफलतापूर्वक सेव हो गया! अब आपको ईमेल पर भी नोटिफिकेशन मिलेंगे।', 'success');
        if (res.profile) {
          setCurrentUser(prev => {
            const updated = {
              ...prev,
              name: res.profile.name,
              email: res.profile.email
            };
            try {
              localStorage.setItem('wa_user', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
        setIsOpen(false);
      } else {
        setErrorMsg(res?.message || 'ईमेल सेव करने में त्रुटि आई। कृपया पुनः प्रयास करें।');
      }
    } catch (err) {
      setErrorMsg(err.message || 'नेटवर्क समस्या। कृपया पुनः प्रयास करें।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 26, 19, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div 
        style={{
          backgroundColor: '#ffffff',
          color: '#1e293b',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          maxWidth: '480px',
          width: '100%',
          overflow: 'hidden',
          animation: 'scaleUp 0.25s ease'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            background: 'linear-gradient(135deg, #091a13 0%, #133e2b 100%)',
            padding: '24px 24px 20px 24px',
            color: '#ffffff',
            position: 'relative'
          }}
        >
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center'
            }}
            title="Close"
          >
            ×
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '24px',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)'
              }}
            >
              ✉️
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', color: '#ffffff' }}>
                Add Email Address
              </h3>
              <div style={{ fontSize: '12px', color: '#6ee7b7', fontWeight: 600, marginTop: '2px' }}>
                ईमेल आईडी जोड़ें और नियमित सूचनाएं पाएं
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          <p style={{ margin: '0 0 16px 0', fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
            अपने अकाउंट की सुरक्षा, प्लान अप्रूवल, एक्सपायरी अलर्ट और महत्वपूर्ण नोटिफिकेशन्स सीधे <strong>Email</strong> पर पाने के लिए अपनी ईमेल आईडी दर्ज करें:
          </p>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                FULL NAME / पूरा नाम
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                EMAIL ADDRESS / ईमेल आईडी <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. yourname@gmail.com"
                required
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: errorMsg ? '1.5px solid #ef4444' : '1.5px solid #10b981',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {errorMsg && (
              <div 
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                ⚠️ {errorMsg}
              </div>
            )}

            <div 
              style={{
                backgroundColor: '#f8fafc',
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: '#64748b',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}
            >
              <span>🔒</span>
              <span>आपकी ईमेल आईडी सुरक्षित रहेगी और केवल महत्वपूर्ण सर्विस संदेशों के लिए उपयोग होगी।</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  transition: 'opacity 0.2s'
                }}
              >
                {saving ? 'Saving...' : '💾 Save Email (ईमेल सेव करें)'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Remind Later
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
