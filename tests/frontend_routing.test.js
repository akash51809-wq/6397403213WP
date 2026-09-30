const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('path');
const fs = require('fs');

test('Frontend routing and static serving verification', async (t) => {
  const websitePath = path.join(__dirname, '..', 'frontend design', 'WP-UI-design-main');
  const distPath = path.join(__dirname, '..', 'whatsapp-dashboard', 'dist');

  assert.ok(fs.existsSync(path.join(websitePath, 'index.html')), 'website index.html must exist');
  assert.ok(fs.existsSync(path.join(distPath, 'index.html')), 'dist index.html must exist');

  const app = express();

  // 1. Static assets from marketing website and React dashboard
  app.use(express.static(websitePath, { index: false }));
  app.use(express.static(distPath, { index: false }));

  // 2. Marketing website subpages
  const marketingSubpages = ['plans', 'api-docs', 'contact', 'privacy', 'refund', 'security', 'terms'];
  marketingSubpages.forEach(sp => {
    app.get(`/${sp}`, (req, res) => {
      const cleanPath = req.originalUrl.split('?')[0];
      if (!cleanPath.endsWith('/')) {
        const query = req.url.slice(req.path.length);
        return res.redirect(301, `/${sp}/${query}`);
      }
      const file = path.join(websitePath, sp, 'index.html');
      if (fs.existsSync(file)) return res.sendFile(file);
      const notFound = path.join(websitePath, '404.html');
      if (fs.existsSync(notFound)) return res.status(404).sendFile(notFound);
      res.status(404).send('Not Found');
    });
  });

  // 3. Marketing website home page
  app.get(['/', '/index.html'], (req, res) => {
    const homeFile = path.join(websitePath, 'index.html');
    if (fs.existsSync(homeFile)) return res.sendFile(homeFile);
    const fallbackDashboard = path.join(distPath, 'index.html');
    return res.sendFile(fallbackDashboard);
  });

  // 4. React Dashboard SPA fallback
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.startsWith('/media') &&
      !req.path.startsWith('/send-text') &&
      req.path !== '/ping'
    ) {
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return next();
      }
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Root / should return marketing website landing page
    const resHome = await fetch(`${baseUrl}/`);
    assert.equal(resHome.status, 200);
    const homeHtml = await resHome.text();
    assert.ok(homeHtml.includes('Easy Recharge Solution — WhatsApp Automation'), 'Home page title must match marketing design');
    assert.ok(homeHtml.includes('href="/login"'), 'Home page must link to /login');
    assert.ok(!homeHtml.includes('Get Started'), 'Home page must not have Get Started button');

    // 2. /login should return React Dashboard SPA
    const resLogin = await fetch(`${baseUrl}/login`);
    assert.equal(resLogin.status, 200);
    const loginHtml = await resLogin.text();
    assert.ok(loginHtml.includes('id="root"'), 'Login must serve React Dashboard SPA root div');
    assert.ok(!loginHtml.includes('Easy Recharge Solution — WhatsApp Automation'), 'Login must not serve marketing landing page');

    // 3. /plans should redirect 301 to /plans/
    const resPlansRedirect = await fetch(`${baseUrl}/plans`, { redirect: 'manual' });
    assert.equal(resPlansRedirect.status, 301);
    assert.equal(resPlansRedirect.headers.get('location'), '/plans/');

    // 4. /plans/ should return marketing plans page
    const resPlans = await fetch(`${baseUrl}/plans/`);
    assert.equal(resPlans.status, 200);
    const plansHtml = await resPlans.text();
    assert.ok(plansHtml.includes('Easy Recharge Solution — Pricing'), 'Plans page title must match');
    assert.ok(plansHtml.includes('href="/login"'), 'Plans page must link to /login');
    assert.ok(!plansHtml.includes('Get Started'), 'Plans page must not contain Get Started');

    // 5. /api-docs should redirect 301 to /api-docs/ and return marketing API docs
    const resApiDocsRedirect = await fetch(`${baseUrl}/api-docs`, { redirect: 'manual' });
    assert.equal(resApiDocsRedirect.status, 301);
    assert.equal(resApiDocsRedirect.headers.get('location'), '/api-docs/');

    const resApiDocs = await fetch(`${baseUrl}/api-docs/`);
    assert.equal(resApiDocs.status, 200);
    const apiDocsHtml = await resApiDocs.text();
    assert.ok(apiDocsHtml.includes('Easy Recharge Solution — API Docs'), 'API docs page title must match');

    // 6. In-app dashboard routes (e.g. /dashboard, /subscription, /api, /admin, /admin/plans) should return React SPA
    const resDash = await fetch(`${baseUrl}/dashboard`);
    assert.equal(resDash.status, 200);
    const dashHtml = await resDash.text();
    assert.ok(dashHtml.includes('id="root"'), '/dashboard must serve React SPA');

    const resSub = await fetch(`${baseUrl}/subscription`);
    assert.equal(resSub.status, 200);
    const subHtml = await resSub.text();
    assert.ok(subHtml.includes('id="root"'), '/subscription must serve React SPA');

    const resApi = await fetch(`${baseUrl}/api`);
    assert.equal(resApi.status, 200);
    const apiHtml = await resApi.text();
    assert.ok(apiHtml.includes('id="root"'), '/api in dashboard must serve React SPA');

    const resAdminPlans = await fetch(`${baseUrl}/admin/plans`);
    assert.equal(resAdminPlans.status, 200);
    const adminPlansHtml = await resAdminPlans.text();
    assert.ok(adminPlansHtml.includes('id="root"'), '/admin/plans must serve React SPA');

    // 7. Static CSS should be served
    const resCss = await fetch(`${baseUrl}/landing.css`);
    assert.equal(resCss.status, 200);
    assert.ok(resCss.headers.get('content-type').includes('text/css'));

  } finally {
    server.close();
  }
});
