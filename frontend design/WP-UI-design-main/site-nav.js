/**
 * site-nav.js - Navigation behavior & Dynamic Website Branding Engine
 * Automatically fetches /api/settings/company and updates all site elements in real-time
 */
(() => {
  // ── 1. Navigation & Mobile Menu Logic ────────────────────────────────────────
  const initNav = () => {
    const header = document.querySelector('.site-nav');
    const toggleBtn = document.querySelector('.site-nav .mobile-menu-toggle');
    const nav = document.querySelector('.site-nav nav');

    if (header) {
      const syncScroll = () => header.classList.toggle('scrolled', window.scrollY > 12);
      syncScroll();
      window.addEventListener('scroll', syncScroll, { passive: true });
    }

    if (toggleBtn && nav) {
      const closeMenu = () => {
        document.body.classList.remove('mobile-menu-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.setAttribute('aria-label', 'Open menu');
      };

      toggleBtn.addEventListener('click', () => {
        const isOpen = document.body.classList.toggle('mobile-menu-open');
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        toggleBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      });

      nav.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeMenu();
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 1180) closeMenu();
      }, { passive: true });
    }

    // Smooth scroll for hash links
    document.querySelectorAll('a[href*="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        try {
          const u = new URL(a.href, location.href);
          if (u.origin !== location.origin || u.pathname !== location.pathname || !u.hash) return;
          const targetId = decodeURIComponent(u.hash.slice(1));
          const el = document.getElementById(targetId);
          if (!el) return;
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.replaceState(null, '', location.pathname + location.search);
        } catch {}
      });
    });
  };

  // ── 2. Dynamic Website Content & Branding Engine ──────────────────────────
  const applyDynamicBranding = (settings) => {
    if (!settings || typeof settings !== 'object') return;

    // 1. Page Title & Favicon
    if (settings.websiteTitle) {
      document.title = settings.websiteTitle;
    } else if (settings.companyName) {
      const currentSuffix = document.title.includes('—') ? document.title.split('—')[1] : 'WhatsApp Automation';
      document.title = `${settings.companyName} — ${currentSuffix.trim()}`;
    }

    if (settings.faviconUrl) {
      let iconLink = document.querySelector("link[rel*='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'shortcut icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = settings.faviconUrl;
    }

    // 2. Header Navbar Brand Logo & Company Name
    const brandNameEl = document.querySelector('.site-nav .brand span b');
    if (brandNameEl && settings.companyName) {
      brandNameEl.textContent = settings.companyName;
    }

    const brandLogoEl = document.querySelector('.site-nav .brand .logo');
    if (brandLogoEl && settings.logoUrl) {
      brandLogoEl.innerHTML = `<img src="${settings.logoUrl}" alt="${settings.companyName || 'Logo'}" style="max-height:28px; max-width:110px; vertical-align:middle; object-fit:contain; border-radius:4px;">`;
    }

    // 3. Hero Section (Landing Page)
    const heroBadgeEl = document.querySelector('.hero-badge');
    if (heroBadgeEl && (settings.heroBadge || settings.websiteTagline)) {
      const tagText = settings.heroBadge || settings.websiteTagline;
      heroBadgeEl.innerHTML = `<span class="pulse"></span> ${tagText.toUpperCase()}`;
    }

    const typedLineEl = document.getElementById('typed-line');
    if (typedLineEl && settings.heroTitle) {
      typedLineEl.textContent = settings.heroTitle;
    }

    const typedSublineEl = document.getElementById('typed-subline');
    if (typedSublineEl && settings.heroSubtitle) {
      typedSublineEl.textContent = settings.heroSubtitle;
    }

    const heroDescEl = document.querySelector('.hero-copy p');
    if (heroDescEl && settings.heroDescription) {
      heroDescEl.textContent = settings.heroDescription;
    }

    const heroCtaEl = document.querySelector('.hero-actions a.primary');
    if (heroCtaEl) {
      if (settings.ctaText) heroCtaEl.innerHTML = `${settings.ctaText} <span>→</span>`;
      if (settings.ctaLink) heroCtaEl.href = settings.ctaLink;
    }

    // 4. Contact Us Details & Contact Page (contact/index.html & #contact)
    if (settings.contactEmail) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
        el.href = `mailto:${settings.contactEmail}`;
        if (el.textContent.includes('@')) el.textContent = settings.contactEmail;
      });
      document.querySelectorAll('form[action^="mailto:"]').forEach(form => {
        form.action = `mailto:${settings.contactEmail}`;
      });
    }

    if (settings.contactPhone) {
      const cleanPhone = settings.contactPhone.replace(/\s+/g, '');
      document.querySelectorAll('a[href^="tel:"]').forEach(el => {
        el.href = `tel:${cleanPhone}`;
        el.textContent = settings.contactPhone;
      });
    }

    // WhatsApp Floating Button & Links
    const waNum = settings.contactWhatsApp ? String(settings.contactWhatsApp).replace(/\D/g, '') : (settings.contactPhone ? String(settings.contactPhone).replace(/\D/g, '') : '');
    if (waNum) {
      document.querySelectorAll('.floating-contact').forEach(el => {
        el.href = `https://wa.me/${waNum}`;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
        el.setAttribute('aria-label', `Chat on WhatsApp: +${waNum}`);
      });
    }

    if (settings.contactAddress) {
      document.querySelectorAll('.contact-item').forEach(item => {
        if (item.textContent.includes('Location')) {
          const span = item.querySelector('span');
          if (span) span.textContent = settings.contactAddress;
        }
      });
    }

    if (settings.contactBusinessEnquiry) {
      document.querySelectorAll('.contact-item').forEach(item => {
        if (item.textContent.includes('Business Enquiry')) {
          const span = item.querySelector('span');
          if (span) span.textContent = settings.contactBusinessEnquiry;
        }
      });
    }

    // 5. Footer Details
    const footerBrandB = document.querySelector('footer .footer-brand b');
    if (footerBrandB && settings.companyName) {
      footerBrandB.textContent = settings.companyName;
    }

    const footerBrandP = document.querySelector('footer .footer-brand p');
    if (footerBrandP && settings.footerAbout) {
      footerBrandP.textContent = settings.footerAbout;
    }

    const footerBottomSpan = document.querySelector('footer .footer-bottom span:first-child') || document.querySelector('footer span:first-child');
    if (footerBottomSpan) {
      if (settings.footerCopyright) {
        footerBottomSpan.textContent = settings.footerCopyright;
      } else if (settings.companyName) {
        footerBottomSpan.textContent = `© ${new Date().getFullYear()} ${settings.companyName}. All rights reserved.`;
      }
    }

    const devCreditEl = document.querySelector('footer strong');
    if (devCreditEl && settings.developerCredit) {
      devCreditEl.textContent = settings.developerCredit;
    }

    // 6. Custom CSS / JS Injection
    if (settings.customCss && !document.getElementById('site-custom-css')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'site-custom-css';
      styleEl.textContent = settings.customCss;
      document.head.appendChild(styleEl);
    }
  };

  const fetchBrandingSettings = async () => {
    // Try localStorage cached copy first for instant zero-lag rendering
    try {
      const cached = localStorage.getItem('wa_company_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        applyDynamicBranding(parsed);
      }
    } catch {}

    // Fetch fresh copy from backend API
    try {
      const res = await fetch('/api/settings/company');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.settings) {
          applyDynamicBranding(data.settings);
          try {
            localStorage.setItem('wa_company_settings', JSON.stringify(data.settings));
          } catch {}
        }
      }
    } catch (err) {
      // Offline / API unavailable — fallback to pre-rendered HTML
    }
  };

  // ── 3. Initialize Everything ───────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initNav();
      fetchBrandingSettings();
    }, { once: true });
  } else {
    initNav();
    fetchBrandingSettings();
  }
})();