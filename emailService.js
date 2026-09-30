const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { connection, AppSettings, CompanySettings } = require('./db');

const GMAIL_SETTINGS_FILE = path.join(__dirname, 'gmail_settings.json');

/**
 * Read Gmail / SMTP settings from PostgreSQL or fallback JSON file
 */
async function getSmtpConfig() {
  let config = null;
  try {
    if (connection.readyState === 1 && AppSettings) {
      const doc = await AppSettings.findOne({ key: 'gmail' });
      if (doc && doc.value) {
        config = typeof doc.value === 'object' ? doc.value : JSON.parse(doc.value);
      }
    }
  } catch (e) {
    console.warn('[EmailService] DB read warning:', e.message);
  }

  if (!config && fs.existsSync(GMAIL_SETTINGS_FILE)) {
    try {
      config = JSON.parse(fs.readFileSync(GMAIL_SETTINGS_FILE, 'utf-8') || '{}');
    } catch (e) {
      console.warn('[EmailService] File read warning:', e.message);
    }
  }

  // Normalize fields
  const user = String(config?.gmail || config?.gmailAddress || config?.user || process.env.GMAIL_USER || process.env.SMTP_USER || '').trim();
  const host = String(config?.smtp || config?.smtpHost || config?.host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(config?.port || config?.smtpPort || process.env.SMTP_PORT || '465', 10);
  const ssl = config?.ssl !== undefined ? Boolean(config.ssl) : (port === 465);
  const pass = String(config?.password || config?.appPassword || config?.pass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim();
  const fromName = String(config?.fromName || config?.senderName || process.env.EMAIL_FROM_NAME || 'WhatsApp Automation Portal').trim();
  const isEnabled = config?.isEnabled !== undefined ? Boolean(config.isEnabled) : Boolean(user && pass);

  return {
    user,
    gmail: user,
    host,
    smtp: host,
    port,
    ssl,
    secure: ssl || port === 465,
    pass,
    password: pass,
    fromName,
    isEnabled
  };
}

/**
 * Save Gmail / SMTP settings to DB and JSON file
 */
async function saveSmtpConfig(newConfig) {
  const normalized = {
    gmail: String(newConfig.gmail || newConfig.gmailAddress || newConfig.user || '').trim(),
    smtp: String(newConfig.smtp || newConfig.smtpHost || newConfig.host || 'smtp.gmail.com').trim(),
    port: parseInt(newConfig.port || newConfig.smtpPort || 465, 10),
    ssl: newConfig.ssl !== undefined ? Boolean(newConfig.ssl) : true,
    password: String(newConfig.password || newConfig.appPassword || newConfig.pass || '').trim(),
    fromName: String(newConfig.fromName || newConfig.senderName || 'WhatsApp Automation Portal').trim(),
    isEnabled: newConfig.isEnabled !== undefined ? Boolean(newConfig.isEnabled) : true,
    updatedAt: new Date().toISOString()
  };

  try {
    if (connection.readyState === 1 && AppSettings) {
      await AppSettings.findOneAndUpdate(
        { key: 'gmail' },
        { $set: { key: 'gmail', value: normalized, updatedAt: new Date() } },
        { upsert: true, new: true }
      );
    }
  } catch (e) {
    console.warn('[EmailService] DB save warning:', e.message);
  }

  try {
    fs.writeFileSync(GMAIL_SETTINGS_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[EmailService] File save warning:', e.message);
  }

  return normalized;
}

/**
 * Create a Nodemailer Transporter instance
 */
function createTransporter(config) {
  const isSecure = config.ssl !== undefined ? Boolean(config.ssl) : (config.port === 465);

  return nodemailer.createTransport({
    host: config.host || config.smtp || 'smtp.gmail.com',
    port: config.port || (isSecure ? 465 : 587),
    secure: isSecure,
    auth: {
      user: config.user || config.gmail,
      pass: config.pass || config.password
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000
  });
}

/**
 * Generate responsive HTML email template with company branding
 */
async function renderHtmlTemplate({ title, subtitle, bodyHtml, actionUrl, actionText, footerNote }) {
  let companyName = 'Easy Recharge Solution';
  let logoUrl = '';
  let contactEmail = 'easyrechargesolution@gmail.com';
  let contactPhone = '+91 88404 57632';

  try {
    if (connection.readyState === 1 && CompanySettings) {
      const cDoc = await CompanySettings.findOne({ key: 'company' });
      if (cDoc) {
        if (cDoc.companyName) companyName = cDoc.companyName;
        if (cDoc.logoUrl) logoUrl = cDoc.logoUrl;
        if (cDoc.contactEmail) contactEmail = cDoc.contactEmail;
        if (cDoc.contactPhone) contactPhone = cDoc.contactPhone;
      }
    }
  } catch {}

  const logoHeader = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 42px; max-width: 180px; object-fit: contain; vertical-align: middle; margin-bottom: 8px;">`
    : `<div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">⚡ ${companyName}</div>`;

  const actionButton = (actionUrl && actionText)
    ? `<div style="text-align: center; margin: 28px 0 16px 0;">
        <a href="${actionUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
          ${actionText} →
        </a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #091a13 0%, #133e2b 100%); padding: 30px 25px; text-align: center; color: #ffffff;">
              ${logoHeader}
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.85; margin-top: 4px; color: #6ee7b7; font-weight: 700;">
                WhatsApp Business Automation
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 35px 30px 25px 30px;">
              ${title ? `<h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; color: #0f172a;">${title}</h2>` : ''}
              ${subtitle ? `<div style="font-size: 14px; color: #64748b; margin-bottom: 20px; font-weight: 500;">${subtitle}</div>` : ''}
              
              <div style="font-size: 14px; color: #334155; line-height: 1.7;">
                ${bodyHtml}
              </div>

              ${actionButton}

              ${footerNote ? `<div style="margin-top: 25px; padding-top: 15px; border-top: 1px dashed #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5;">${footerNote}</div>` : ''}
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <div style="margin-bottom: 6px; font-weight: 600; color: #475569;">${companyName}</div>
              <div>Need help? Email: <a href="mailto:${contactEmail}" style="color: #059669; text-decoration: none;">${contactEmail}</a> | Phone: <a href="tel:${contactPhone}" style="color: #059669; text-decoration: none;">${contactPhone}</a></div>
              <div style="margin-top: 12px; font-size: 11px; color: #94a3b8;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send an email using configured SMTP settings
 */
async function sendEmail({ to, subject, html, text, fromName, fromEmail, customConfig = null }) {
  if (!to || !String(to).trim()) {
    return { success: false, message: 'Recipient email address is required.' };
  }

  const cleanRecipient = String(to).trim();
  const config = customConfig || (await getSmtpConfig());

  if (!config.user || !config.pass) {
    console.warn(`[EmailService] Email not sent to ${cleanRecipient}: SMTP credentials are not configured.`);
    return { success: false, message: 'Gmail / SMTP credentials are not configured in Admin Settings.' };
  }

  if (!config.isEnabled) {
    console.warn(`[EmailService] Email not sent to ${cleanRecipient}: Outgoing email service is disabled.`);
    return { success: false, message: 'Outgoing email service is currently disabled.' };
  }

  try {
    const transporter = createTransporter(config);
    const senderTitle = fromName || config.fromName || 'WhatsApp Automation';
    const senderAddress = fromEmail || config.user;

    const mailOptions = {
      from: `"${senderTitle}" <${senderAddress}>`,
      to: cleanRecipient,
      subject: subject || 'Notification from WhatsApp Automation Portal',
      text: text || (html ? html.replace(/<[^>]*>?/gm, '') : ''),
      html: html || `<p>${text || ''}</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ Email sent to ${cleanRecipient} (Subject: "${subject}") [ID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService] ❌ Failed to send email to ${cleanRecipient}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send system notification email to user
 */
async function sendNotificationEmail(recipientEmail, { type = 'general', title, message, details = {}, actionUrl = '', actionText = '', footerNote = '' }) {
  if (!recipientEmail || !String(recipientEmail).includes('@')) {
    return { success: false, message: 'Invalid recipient email.' };
  }

  let subject = title || 'Notification from WhatsApp Portal';
  let subtitle = '';
  let bodyHtml = '';

  if (type === 'welcome') {
    subject = `🎉 Welcome to WhatsApp Automation Portal - Account Details`;
    subtitle = `Your account has been successfully created.`;
    bodyHtml = `
      <p>Hello <strong>${details.name || 'User'}</strong>,</p>
      <p>Welcome to WhatsApp Automation Portal! Your login details are as follows:</p>
      <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 14px; border-radius: 6px; margin: 15px 0;">
        <div style="margin-bottom: 6px;"><strong>Username:</strong> ${details.username || details.mobile || ''}</div>
        <div style="margin-bottom: 6px;"><strong>Mobile:</strong> +${details.mobile || ''}</div>
        ${details.password ? `<div style="margin-bottom: 6px;"><strong>Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${details.password}</span></div>` : ''}
        <div><strong>Plan:</strong> ${details.plan || 'Demo Plan'}</div>
      </div>
      <p>You can login to your dashboard to scan WhatsApp QR and start automating messages.</p>
    `;
    actionUrl = actionUrl || '/login';
    actionText = actionText || 'Login to Dashboard';
  } else if (type === 'plan_approved') {
    subject = `✅ Plan Activated: Your "${details.planName || 'Subscription'}" plan is now LIVE!`;
    subtitle = `Subscription request approved successfully.`;
    bodyHtml = `
      <p>Hello <strong>${details.userName || 'User'}</strong>,</p>
      <p>Great news! Your payment of <strong>₹${details.amount || 0}</strong> for plan <strong>${details.planName}</strong> has been approved by admin.</p>
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 14px; border-radius: 6px; margin: 15px 0; color: #065f46;">
        <div><strong>Plan Name:</strong> ${details.planName}</div>
        <div><strong>Daily Limit:</strong> ${details.dailyLimit || 'Active'}</div>
        <div><strong>Validity:</strong> ${details.validity || '30 Days'}</div>
        <div><strong>Expiry Date:</strong> ${details.planExpiresAt ? new Date(details.planExpiresAt).toLocaleDateString() : 'Active'}</div>
      </div>
      <p>All features for this plan have been unlocked on your dashboard.</p>
    `;
    actionUrl = actionUrl || '/dashboard';
    actionText = actionText || 'Go to Dashboard';
  } else if (type === 'plan_rejected') {
    subject = `❌ Plan Request Update: "${details.planName || 'Subscription'}"`;
    subtitle = `Your plan purchase request could not be approved.`;
    bodyHtml = `
      <p>Hello <strong>${details.userName || 'User'}</strong>,</p>
      <p>Your subscription request for <strong>${details.planName}</strong> was rejected by admin.</p>
      ${details.notes ? `<div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 6px; margin: 15px 0; color: #991b1b;"><strong>Admin Notes:</strong> ${details.notes}</div>` : ''}
      <p>Please verify your payment details or contact support for assistance.</p>
    `;
    actionUrl = actionUrl || '/plans';
    actionText = actionText || 'View Available Plans';
  } else if (type === 'plan_expiry') {
    subject = `⚠️ Urgent: Your WhatsApp Automation Plan is Expiring Soon`;
    subtitle = `Renew now to avoid service interruption.`;
    bodyHtml = `
      <p>Hello <strong>${details.name || 'User'}</strong>,</p>
      <p>Your WhatsApp automation plan (<strong>${details.plan || 'Standard'}</strong>) will expire on <strong>${details.expiryDate || 'soon'}</strong>.</p>
      <p>To ensure your WhatsApp sessions, scheduled messages, and API automation continue running without interruption, please renew or upgrade your plan.</p>
    `;
    actionUrl = actionUrl || '/plans';
    actionText = actionText || 'Renew Subscription';
  } else {
    bodyHtml = `<p>${message || ''}</p>`;
  }

  const fullHtml = await renderHtmlTemplate({
    title: title || subject,
    subtitle,
    bodyHtml,
    actionUrl,
    actionText,
    footerNote
  });

  return sendEmail({
    to: recipientEmail,
    subject,
    html: fullHtml,
    text: message || subject
  });
}

/**
 * Send a verification test email
 */
async function sendTestEmail(targetEmail, customConfig = null) {
  const config = customConfig || (await getSmtpConfig());

  const testHtml = await renderHtmlTemplate({
    title: 'Gmail / SMTP Configuration Test',
    subtitle: 'Connection verified successfully',
    bodyHtml: `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; color: #166534;">
        <h3 style="margin: 0 0 8px 0; color: #15803d;">🎉 SMTP Connection Successful!</h3>
        <p style="margin: 0; font-size: 13px;">This test email confirms that your Gmail / SMTP configuration on the WhatsApp Automation server is active and ready to deliver customer notifications, OTPs, and plan alerts.</p>
      </div>
      <table style="width: 100%; font-size: 13px; margin-top: 16px; border-collapse: collapse;">
        <tr><td style="padding: 6px 0; color: #64748b;">SMTP Host:</td><td style="font-weight: 600;">${config.host || config.smtp}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">SMTP Port:</td><td style="font-weight: 600;">${config.port} (${config.ssl ? 'SSL ON' : 'TLS/STARTTLS'})</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Sender Email:</td><td style="font-weight: 600;">${config.user || config.gmail}</td></tr>
        <tr><td style="padding: 6px 0; color: #64748b;">Test Timestamp:</td><td style="font-weight: 600;">${new Date().toLocaleString()}</td></tr>
      </table>
    `,
    footerNote: 'You received this email because a test was initiated from the Admin Settings panel.'
  });

  return sendEmail({
    to: targetEmail,
    subject: `✅ SMTP Test Email - ${config.fromName || 'WhatsApp Automation'}`,
    html: testHtml,
    customConfig: config
  });
}

module.exports = {
  getSmtpConfig,
  saveSmtpConfig,
  sendEmail,
  sendNotificationEmail,
  sendTestEmail
};
