/**
 * Email-sending helper for the Cloudflare Email Service binding.
 *
 * Usage: await sendEmail(env, { to, subject, html, text })
 *
 * Falls back to console.log if env.EMAIL is not bound (e.g. before the
 * domain is onboarded or while running on a free plan). This keeps the
 * password-reset / verification / invite flows working in dev mode.
 */

interface SendEmailBinding {
  send: (msg: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
  }) => Promise<void>;
}

interface EmailEnv {
  EMAIL?: SendEmailBinding;
  PUBLIC_SITE_URL: string;
  ENVIRONMENT: string;
}

const DEFAULT_FROM = 'Dynamic QR Code Labs <noreply@dynamicqrcodelabs.com>';
const REPLY_TO = 'hello@dynamicqrcodelabs.com';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(
  env: EmailEnv,
  msg: EmailMessage,
): Promise<{ sent: boolean; reason?: string }> {
  const from = msg.from || DEFAULT_FROM;
  const text = msg.text || stripHtml(msg.html);

  if (!env.EMAIL) {
    console.log(
      `[email-stub] To: ${msg.to} | From: ${from} | Subject: ${msg.subject}\n${text.slice(0, 400)}`,
    );
    return { sent: false, reason: 'EMAIL binding not configured' };
  }

  try {
    await env.EMAIL.send({
      to: msg.to,
      from,
      subject: msg.subject,
      html: msg.html,
      text,
      replyTo: REPLY_TO,
    });
    return { sent: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown error';
    console.error('[email] send failed:', reason);
    return { sent: false, reason };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseTemplate(opts: { title: string; preheader: string; body: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(opts.title)}</title>
<style>
  body { margin:0; padding:0; background:#fafbff; font-family: 'Helvetica Neue', Arial, sans-serif; color:#0a0e27; -webkit-font-smoothing:antialiased; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
  .card { background:#ffffff; border:1px solid #e6e8f0; border-radius:16px; padding:36px 32px; }
  .brand { display:flex; align-items:center; gap:10px; font-weight:800; font-size:18px; color:#0a0e27; margin-bottom:24px; letter-spacing:-0.02em; }
  h1 { font-size:22px; font-weight:700; margin:0 0 12px; letter-spacing:-0.02em; }
  p { font-size:15px; line-height:1.55; color:#4a5172; margin:0 0 14px; }
  .btn { display:inline-block; background:#2540ff; color:#ffffff !important; text-decoration:none; padding:12px 24px; border-radius:8px; font-weight:600; font-size:15px; margin:16px 0; }
  .url-fallback { word-break:break-all; font-size:13px; color:#6b7390; font-family:ui-monospace,Consolas,monospace; background:#f4f6fb; padding:10px 12px; border-radius:6px; }
  .footer { text-align:center; color:#6b7390; font-size:12px; margin-top:24px; line-height:1.6; }
  .footer a { color:#6b7390; }
  .preheader { display:none; font-size:1px; color:#fafbff; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
</style>
</head>
<body>
  <span class="preheader">${escapeHtml(opts.preheader)}</span>
  <div class="wrap">
    <div class="card">
      <div class="brand">
        <svg width="24" height="24" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
          <rect x="20" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
          <rect x="2" y="20" width="10" height="10" rx="2" fill="#0a0e27"/>
          <rect x="22" y="22" width="6" height="6" rx="1.5" fill="#2540ff"/>
          <rect x="14" y="14" width="4" height="4" fill="#2540ff"/>
        </svg>
        Dynamic QR Code Labs
      </div>
      ${opts.body}
    </div>
    <div class="footer">
      You are receiving this because you have an account at
      <a href="https://dynamicqrcodelabs.com">dynamicqrcodelabs.com</a>.<br>
      Need help? Reply to this email or visit
      <a href="https://dynamicqrcodelabs.com/contact/">our contact page</a>.<br>
      © 2026 Dynamic QR Code Labs
    </div>
  </div>
</body>
</html>`;
}

export function passwordResetTemplate(opts: {
  resetUrl: string;
  recipientName: string;
}): EmailMessage {
  const html = baseTemplate({
    title: 'Reset your password',
    preheader: 'Reset your Dynamic QR Code Labs password',
    body: `
      <h1>Reset your password</h1>
      <p>Hi ${escapeHtml(opts.recipientName)},</p>
      <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
      <p style="text-align:center;">
        <a href="${opts.resetUrl}" class="btn">Reset password</a>
      </p>
      <p>If the button doesn't work, paste this URL into your browser:</p>
      <div class="url-fallback">${escapeHtml(opts.resetUrl)}</div>
      <p style="margin-top:18px;">If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });
  return {
    to: '',
    subject: 'Reset your Dynamic QR Code Labs password',
    html,
  };
}

export function emailVerificationTemplate(opts: {
  verifyUrl: string;
  recipientName: string;
}): EmailMessage {
  const html = baseTemplate({
    title: 'Verify your email',
    preheader: 'Confirm your email to start creating dynamic QR codes',
    body: `
      <h1>Welcome to Dynamic QR Code Labs</h1>
      <p>Hi ${escapeHtml(opts.recipientName)},</p>
      <p>Confirm your email address to unlock the full Dynamic QR Code Labs experience: real-time analytics, custom domains, smart redirects, and unlimited edits.</p>
      <p style="text-align:center;">
        <a href="${opts.verifyUrl}" class="btn">Verify my email</a>
      </p>
      <p>If the button doesn't work, paste this URL into your browser:</p>
      <div class="url-fallback">${escapeHtml(opts.verifyUrl)}</div>
      <p style="margin-top:18px;">If you didn't sign up, you can ignore this email — no account will be activated.</p>
    `,
  });
  return {
    to: '',
    subject: 'Verify your email · Dynamic QR Code Labs',
    html,
  };
}

export function teamInviteTemplate(opts: {
  inviteUrl: string;
  workspaceName: string;
  inviterName: string;
  role: string;
}): EmailMessage {
  const html = baseTemplate({
    title: `You're invited to ${opts.workspaceName}`,
    preheader: `Join the ${opts.workspaceName} workspace on Dynamic QR Code Labs`,
    body: `
      <h1>You're invited to ${escapeHtml(opts.workspaceName)}</h1>
      <p>${escapeHtml(opts.inviterName)} invited you to join the <strong>${escapeHtml(opts.workspaceName)}</strong> workspace as a <strong>${escapeHtml(opts.role)}</strong>.</p>
      <p>You will be able to create, edit, and track dynamic QR codes alongside the rest of the team.</p>
      <p style="text-align:center;">
        <a href="${opts.inviteUrl}" class="btn">Accept invite</a>
      </p>
      <p>If the button doesn't work, paste this URL into your browser:</p>
      <div class="url-fallback">${escapeHtml(opts.inviteUrl)}</div>
      <p style="margin-top:18px;">This invite expires in 7 days. If you didn't expect this, you can safely ignore it.</p>
    `,
  });
  return {
    to: '',
    subject: `You're invited to ${opts.workspaceName} · Dynamic QR Code Labs`,
    html,
  };
}
