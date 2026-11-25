const nodemailer = require('nodemailer');
const config = require('../config/env');

let testTransporter = null;

/**
 * Configure an in-memory or mock transporter for test environments
 * @param {object|null} transporter 
 */
const setTestTransporter = (transporter) => {
  testTransporter = transporter;
};

/**
 * Return detailed SMTP configuration status without exposing credentials
 * @returns {{ isConfigured: boolean, missing: string[], host: string, port: number, secure: boolean, hasUser: boolean, hasPass: boolean, hasFrom: boolean, isTestMock: boolean }}
 */
const getSmtpStatus = () => {
  if (testTransporter) {
    return {
      isConfigured: true,
      missing: [],
      host: config.SMTP_HOST || 'mock-transporter',
      port: config.SMTP_PORT || 465,
      secure: config.SMTP_SECURE ?? true,
      hasUser: true,
      hasPass: true,
      hasFrom: true,
      isTestMock: true,
    };
  }

  const missing = [];
  if (!config.SMTP_HOST || config.SMTP_HOST.trim().length === 0) {
    missing.push('SMTP_HOST');
  }
  if (!config.SMTP_USER || config.SMTP_USER.trim().length === 0) {
    missing.push('SMTP_USER');
  }
  if (!config.SMTP_PASS || config.SMTP_PASS.trim().length === 0) {
    missing.push('SMTP_PASS');
  }

  return {
    isConfigured: missing.length === 0,
    missing,
    host: config.SMTP_HOST || '',
    port: config.SMTP_PORT || 465,
    secure: Boolean(config.SMTP_SECURE),
    hasUser: Boolean(config.SMTP_USER && config.SMTP_USER.trim().length > 0),
    hasPass: Boolean(config.SMTP_PASS && config.SMTP_PASS.trim().length > 0),
    hasFrom: Boolean(config.SMTP_FROM && config.SMTP_FROM.trim().length > 0),
    isTestMock: false,
  };
};

/**
 * Check whether email delivery is properly configured
 * @returns {boolean}
 */
const isMailConfigured = () => {
  return getSmtpStatus().isConfigured;
};

/**
 * Instantiate Nodemailer transporter using environment variables or test mock
 * @returns {object|null}
 */
const getTransporter = () => {
  if (testTransporter) {
    return testTransporter;
  }

  if (!isMailConfigured()) {
    return null;
  }

  const isGmail = (config.SMTP_HOST || '').toLowerCase().includes('gmail');

  // Sanitize Google App Password (strip wrapping quotes and spaces)
  const rawPass = config.SMTP_PASS || '';
  const cleanPass = isGmail
    ? rawPass.replace(/^["']|["']$/g, '').replace(/\s+/g, '')
    : rawPass.replace(/^["']|["']$/g, '').trim();

  const transportOptions = {
    host: config.SMTP_HOST || 'smtp.gmail.com',
    port: config.SMTP_PORT || 465,
    secure: config.SMTP_SECURE ?? true,
    auth: {
      user: (config.SMTP_USER || '').trim(),
      pass: cleanPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  return nodemailer.createTransport(transportOptions);
};

/**
 * Send password reset verification email containing a 6-digit OTP
 * Never logs credentials, OTPs, or passwords.
 * @param {string} toEmail 
 * @param {string} otp 
 * @returns {Promise<any>}
 */
const sendPasswordResetEmail = async (toEmail, otp) => {
  const status = getSmtpStatus();
  if (!status.isConfigured) {
    const error = new Error(`Email service is not configured. Missing required settings: ${status.missing.join(', ')}.`);
    error.code = 'MAIL_NOT_CONFIGURED';
    error.missing = status.missing;
    throw error;
  }

  const transporter = getTransporter();
  if (!transporter) {
    const error = new Error('Failed to initialize mail transporter.');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }

  const senderEmail = (config.SMTP_USER || '').trim();
  const fromAddress =
    config.SMTP_FROM && config.SMTP_FROM.trim().length > 0
      ? config.SMTP_FROM.trim()
      : senderEmail
      ? `"CareerPulse ATS" <${senderEmail}>`
      : '"CareerPulse ATS" <noreply@careerpulse.com>';

  const mailOptions = {
    from: fromAddress,
    to: toEmail,
    subject: 'CareerPulse ATS - Password Reset Verification Code',
    text: `Hello,\n\nYou requested to reset your password for CareerPulse ATS.\n\nYour 6-digit verification code is: ${otp}\n\nThis verification code will expire in 10 minutes. If you did not request a password reset, please ignore this email or contact support.\n\nBest regards,\nThe CareerPulse Team`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <div style="margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 12px;">
          <h2 style="color: #1e293b; margin: 0; font-size: 20px; font-weight: 700;">CareerPulse ATS</h2>
        </div>
        <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top: 0;">
          Hello,
        </p>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          You requested to reset the password for your CareerPulse account. Use the following 6-digit verification code to complete the process:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #2563eb; border-radius: 8px; padding: 14px 28px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a;">
            ${otp}
          </div>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          This code is valid for <strong>10 minutes</strong>. For your security, never share this code with anyone.
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not request this password reset, please disregard this message. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          &copy; ${new Date().getFullYear()} CareerPulse ATS. All rights reserved.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  isMailConfigured,
  getSmtpStatus,
  setTestTransporter,
  getTransporter,
  sendPasswordResetEmail,
};
