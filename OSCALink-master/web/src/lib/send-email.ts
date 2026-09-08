'use server';

import nodemailer from 'nodemailer';

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });
}

export async function sendCredentialEmail(
  to: string,
  fullName: string,
  password: string,
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP_USER/SMTP_PASS not set — skipping email');
    return;
  }

  const from = process.env.SMTP_USER;

  await transporter.sendMail({
    from: `OSCALink <${from}>`,
    to,
    subject: 'OSCALink: Your Staff Account Credentials',
    html: `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Welcome to OSCALink, ${fullName}!</h2>
        <p>Your account has been created for the Cotabato City Office for Senior Citizen Affairs (OSCA) digital portal.</p>
        <div style="padding: 20px; background-color: #f1f5f9; border-left: 4px solid #006837; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">Login Credentials</p>
          <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">Email: ${to}</p>
          <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">Temporary Password: ${password}</p>
        </div>
        <p style="color: #ef4444; font-weight: bold;">Important: Please change your password after your first login.</p>
        <p>Access the portal at: <a href="https://oscalink.vercel.app/login">https://oscalink.vercel.app/login</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an automated message from OSCALink. Office for Senior Citizen Affairs, Cotabato City.</p>
      </div>
    `,
  });

  console.log(`[EMAIL] Credentials sent to ${to}`);
}

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  password: string,
) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP_USER/SMTP_PASS not set — skipping email');
    return;
  }

  const from = process.env.SMTP_USER;

  await transporter.sendMail({
    from: `OSCALink <${from}>`,
    to,
    subject: 'OSCALink: Your Password Has Been Reset',
    html: `
      <div style="font-family: sans-serif; color: #334155;">
        <h2>Hello, ${fullName}!</h2>
        <p>Your password for the Cotabato City Office for Senior Citizen Affairs (OSCA) digital portal has been reset by the administrator.</p>
        <div style="padding: 20px; background-color: #f1f5f9; border-left: 4px solid #006837; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #64748b;">New Credentials</p>
          <p style="margin: 10px 0 0 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">Email: ${to}</p>
          <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #1e3a8a;">New Password: ${password}</p>
        </div>
        <p style="color: #ef4444; font-weight: bold;">Important: Please change your password after logging in.</p>
        <p>Access the portal at: <a href="https://oscalink.vercel.app/login">https://oscalink.vercel.app/login</a></p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #94a3b8;">This is an automated message from OSCALink. Office for Senior Citizen Affairs, Cotabato City.</p>
      </div>
    `,
  });

  console.log(`[EMAIL] Reset credentials sent to ${to}`);
}

export interface ErrorReportPayload {
  message: string;
  stack?: string;
  pageUrl?: string;
  timestamp: string;
  role?: string | null;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  browser?: string;
  description?: string;
  screenshot?: string | null;
}

export async function sendErrorReportEmail(report: ErrorReportPayload) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[EMAIL] SMTP_USER/SMTP_PASS not set — skipping error report email');
    return { success: false, error: 'SMTP not configured' };
  }

  const from = process.env.SMTP_USER;
  const to = process.env.REPORT_ERROR_EMAIL || process.env.SMTP_USER;
  if (!to) return { success: false, error: 'No recipient configured' };

  const safe = (v: string | null | undefined, fallback = '—') =>
    (v && v.trim() ? v : fallback).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const rows: Record<string, string> = {
    'Error Message': safe(report.message),
    'Stack Trace': safe(report.stack, 'Not provided'),
    'Page / URL': safe(report.pageUrl),
    'Timestamp': safe(report.timestamp),
    'Reported User Role': safe(report.role),
    'Reported User ID': safe(report.userId),
    'Reported By': safe(report.userName, 'Not signed in'),
    'User Email': safe(report.userEmail),
    'Browser / Device': safe(report.browser),
    'User Description': safe(report.description, 'Not provided'),
  };

  const detailsHtml = Object.entries(rows)
    .map(([label, value]) => `
      <p style="margin: 0 0 12px 0; padding: 10px 12px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid #006837;">
        <strong style="display:block; font-size: 11px; color: #006837; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${label}</strong>
        <span style="font-size: 12px; color: #334155; white-space: pre-wrap; word-break: break-word;">${value}</span>
      </p>`)
    .join('\n');

  const screenshotBlock = report.screenshot
    ? `<p style="margin: 12px 0 6px 0; font-size: 12px; color: #334155;"><strong>Screenshot:</strong></p>
       <img src="${report.screenshot}" alt="Error screenshot" style="max-width: 100%; border-radius: 8px; border: 1px solid #e2e8f0;" />`
    : '';

  try {
    await transporter.sendMail({
      from: `OSCALink Bug Reporter <${from}>`,
      to,
      subject: `[OSCALink Bug Report] ${report.message.slice(0, 80) || 'System Error'}`,
      html: `
        <div style="font-family: sans-serif; color: #334155;">
          <h2 style="color: #b91c1c;">OSCALink System Error Report</h2>
          <p style="font-size: 13px; color: #64748b;">An error was reported from the OSCALink portal.</p>
          ${detailsHtml}
          ${screenshotBlock}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">This is an automated bug report sent from OSCALink. Office for Senior Citizen Affairs, Cotabato City.</p>
        </div>
      `,
    });
    console.log('[EMAIL] Error report sent to ' + to);
    return { success: true };
  } catch (e) {
    console.error('[EMAIL] Failed to send error report:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Failed to send email' };
  }
}
