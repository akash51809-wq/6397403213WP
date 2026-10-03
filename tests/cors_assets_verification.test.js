const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

test('CORS, Static Asset Serving & SPA Routing Verification', async (t) => {
  const distPath = path.join(__dirname, '..', 'whatsapp-dashboard', 'dist');
  const websitePath = fs.existsSync(path.join(__dirname, '..', 'frontend design', 'WP-UI-design-main', 'index.html'))
    ? path.join(__dirname, '..', 'frontend design', 'WP-UI-design-main')
    : path.join(__dirname, '..', 'frontend design');

  assert.ok(fs.existsSync(path.join(distPath, 'index.html')), 'dist/index.html must exist');
  assert.ok(fs.existsSync(path.join(distPath, 'assets')), 'dist/assets must exist');

  const defaultAllowedOrigins = [
    'https://local-whatsapp-eq4i.onrender.com',
    'https://wp.easyrechargesolution.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];

  const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));

  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    const normalized = origin.trim().replace(/\/$/, '');
    if (allowedOrigins.some(ao => ao.replace(/\/$/, '') === normalized)) {
      return true;
    }
    if (process.env.RENDER_EXTERNAL_URL && normalized === process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, '')) {
      return true;
    }
    if (process.env.APP_URL && normalized === process.env.APP_URL.trim().replace(/\/$/, '')) {
      return true;
    }
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
      return true;
    }
    return false;
  };

  const corsOptions = {
    origin: function (origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Api-Token']
  };

  const app = express();
  app.use(cors(corsOptions));

  // Security Headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // 1. Serve static files from marketing website and React dashboard
  app.use(express.static(websitePath, { index: false }));
  app.use(express.static(distPath, { index: false }));

  // 2. Marketing subpages
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
      res.status(404).send('Not Found');
    });
  });

  // 3. Marketing home page
  app.get(['/', '/index.html'], (req, res) => {
    const homeFile = path.join(websitePath, 'index.html');
    if (fs.existsSync(homeFile)) return res.sendFile(homeFile);
    const fallbackDashboard = path.join(distPath, 'index.html');
    return res.sendFile(fallbackDashboard);
  });

  // 4. Sample mock API endpoint
  app.get('/api/test-secure', (req, res) => {
    res.json({ success: true, message: 'API response' });
  });

  // 5. React Dashboard SPA fallback
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

  // 6. Centralized Error Handler
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message });
  });

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /login => HTTP 200 + React SPA HTML
    const resLogin = await fetch(`${baseUrl}/login`);
    assert.equal(resLogin.status, 200);
    const loginBody = await resLogin.text();
    assert.ok(loginBody.includes('<div id="root"></div>'), 'Login must return React root HTML');

    // 2. GET /dashboard => HTTP 200 + React SPA HTML
    const resDashboard = await fetch(`${baseUrl}/dashboard`);
    assert.equal(resDashboard.status, 200);
    const dashBody = await resDashboard.text();
    assert.ok(dashBody.includes('<div id="root"></div>'), 'Dashboard must return React root HTML');

    // 3. GET /subscription => HTTP 200 + React SPA HTML
    const resSub = await fetch(`${baseUrl}/subscription`);
    assert.equal(resSub.status, 200);
    const subBody = await resSub.text();
    assert.ok(subBody.includes('<div id="root"></div>'), 'Subscription must return React root HTML');

    // 4. GET /admin/plans => HTTP 200 + React SPA HTML
    const resAdminPlans = await fetch(`${baseUrl}/admin/plans`);
    assert.equal(resAdminPlans.status, 200);
    const adminPlansBody = await resAdminPlans.text();
    assert.ok(adminPlansBody.includes('<div id="root"></div>'), 'Admin plans must return React root HTML');

    // 5. GET /api => HTTP 200 + React SPA HTML (client side route)
    const resApiSpa = await fetch(`${baseUrl}/api`);
    assert.equal(resApiSpa.status, 200);
    const apiSpaBody = await resApiSpa.text();
    assert.ok(apiSpaBody.includes('<div id="root"></div>'), '/api SPA route must return React root HTML');

    // Find actual generated JS and CSS filenames in dist/assets
    const assetsDir = path.join(distPath, 'assets');
    const assetFiles = fs.readdirSync(assetsDir);
    const jsFile = assetFiles.find(f => f.endsWith('.js'));
    const cssFile = assetFiles.find(f => f.endsWith('.css'));

    assert.ok(jsFile, 'A JS asset must exist in dist/assets');
    assert.ok(cssFile, 'A CSS asset must exist in dist/assets');

    // 6. Direct GET on /assets/*.js with same-origin (no Origin header) => HTTP 200
    const resJsDirect = await fetch(`${baseUrl}/assets/${jsFile}`);
    assert.equal(resJsDirect.status, 200, 'Direct JS request must return 200');
    assert.ok(resJsDirect.headers.get('content-type').includes('javascript'), 'JS must have javascript Content-Type');

    // 7. Direct GET on /assets/*.css with same-origin (no Origin header) => HTTP 200
    const resCssDirect = await fetch(`${baseUrl}/assets/${cssFile}`);
    assert.equal(resCssDirect.status, 200, 'Direct CSS request must return 200');
    assert.ok(resCssDirect.headers.get('content-type').includes('text/css'), 'CSS must have text/css Content-Type');

    // 8. CORS request from production custom domain https://wp.easyrechargesolution.com
    const resWpDomainJs = await fetch(`${baseUrl}/assets/${jsFile}`, {
      headers: { Origin: 'https://wp.easyrechargesolution.com' }
    });
    assert.equal(resWpDomainJs.status, 200, 'Asset request from custom domain must return 200');
    assert.equal(
      resWpDomainJs.headers.get('access-control-allow-origin'),
      'https://wp.easyrechargesolution.com',
      'Must allow custom domain origin'
    );
    assert.equal(
      resWpDomainJs.headers.get('access-control-allow-credentials'),
      'true',
      'Must allow credentials'
    );

    // 9. CORS request from Render production domain https://local-whatsapp-eq4i.onrender.com
    const resRenderDomainJs = await fetch(`${baseUrl}/assets/${jsFile}`, {
      headers: { Origin: 'https://local-whatsapp-eq4i.onrender.com' }
    });
    assert.equal(resRenderDomainJs.status, 200, 'Asset request from render domain must return 200');
    assert.equal(
      resRenderDomainJs.headers.get('access-control-allow-origin'),
      'https://local-whatsapp-eq4i.onrender.com',
      'Must allow render domain origin'
    );

    // 10. CORS request from local development origins (http://localhost:5173, http://127.0.0.1:3000)
    const resLocalhostJs = await fetch(`${baseUrl}/assets/${jsFile}`, {
      headers: { Origin: 'http://localhost:5173' }
    });
    assert.equal(resLocalhostJs.status, 200);
    assert.equal(resLocalhostJs.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const res127Js = await fetch(`${baseUrl}/assets/${jsFile}`, {
      headers: { Origin: 'http://127.0.0.1:3000' }
    });
    assert.equal(res127Js.status, 200);
    assert.equal(res127Js.headers.get('access-control-allow-origin'), 'http://127.0.0.1:3000');

    // 11. CORS request from unauthorized origin:
    // Static asset should still return 200 (since it is a public static file), but NOT receive Access-Control-Allow-Origin header
    const resUnauthorizedJs = await fetch(`${baseUrl}/assets/${jsFile}`, {
      headers: { Origin: 'https://unauthorized-malicious-site.com' }
    });
    assert.equal(resUnauthorizedJs.status, 200, 'Static asset must return 200, not 500');
    assert.equal(
      resUnauthorizedJs.headers.get('access-control-allow-origin'),
      null,
      'Unauthorized origin must NOT receive Access-Control-Allow-Origin'
    );

    // 12. API call from allowed origin
    const resApiAllowed = await fetch(`${baseUrl}/api/test-secure`, {
      headers: { Origin: 'https://wp.easyrechargesolution.com' }
    });
    assert.equal(resApiAllowed.status, 200);
    assert.equal(
      resApiAllowed.headers.get('access-control-allow-origin'),
      'https://wp.easyrechargesolution.com'
    );

    // 13. API call from unauthorized origin (CORS header not present)
    const resApiUnauthorized = await fetch(`${baseUrl}/api/test-secure`, {
      headers: { Origin: 'https://unauthorized-malicious-site.com' }
    });
    assert.equal(resApiUnauthorized.status, 200);
    assert.equal(
      resApiUnauthorized.headers.get('access-control-allow-origin'),
      null,
      'API call from unauthorized origin must NOT have Access-Control-Allow-Origin header'
    );

    // 14. OPTIONS Preflight request for allowed origin
    const resPreflightAllowed = await fetch(`${baseUrl}/api/test-secure`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://wp.easyrechargesolution.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, X-Api-Token'
      }
    });
    assert.equal(
      resPreflightAllowed.headers.get('access-control-allow-origin'),
      'https://wp.easyrechargesolution.com'
    );

    // 15. OPTIONS Preflight request for unauthorized origin
    const resPreflightUnauthorized = await fetch(`${baseUrl}/api/test-secure`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://unauthorized-malicious-site.com',
        'Access-Control-Request-Method': 'POST'
      }
    });
    assert.equal(
      resPreflightUnauthorized.headers.get('access-control-allow-origin'),
      null,
      'Preflight for unauthorized origin must NOT have allow origin header'
    );

  } finally {
    server.close();
  }
});
