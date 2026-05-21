import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { qrCodes, scanEvents } from '../db/schema';
import { hashIp, generateId } from '../lib/crypto';
import { parseUserAgent } from '../lib/ua';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

/**
 * Hosted landing pages for QR types that need a destination on our side
 * rather than an external URL (vCard, WiFi, multi-link, coupon, location,
 * feedback, review prompt, custom page).
 *
 * URL pattern: /p/:shortCode
 *
 * The QR's destinationUrl points here. The Worker reads destinationPayload
 * (JSON) and renders the matching landing page. Scan events are logged
 * just like the /q/:shortCode redirect endpoint.
 */

router.get('/:shortCode', async (c) => {
  const code = c.req.param('shortCode');
  if (!code || code.length > 32) return c.html(notFoundPage(), 404);

  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.shortCode, code))
    .limit(1);
  if (rows.length === 0) return c.html(notFoundPage(), 404);

  const qr = rows[0];
  if (qr.status !== 'active' || qr.deletedAt) {
    return c.html(unavailablePage(), 410);
  }

  // Log the scan event (async, non-blocking)
  const ua = c.req.header('user-agent') || '';
  const parsed = parseUserAgent(ua);
  const cfReq = c.req.raw as Request & { cf?: IncomingRequestCfProperties };
  const cf = cfReq.cf;
  const country = (cf?.country as string | null) ?? null;
  const city = (cf?.city as string | null) ?? null;
  const ip = c.req.header('cf-connecting-ip') || '';
  const ipHash = ip ? await hashIp(ip, c.env.IP_HASH_SALT || 'dqrl-default-salt') : null;

  c.executionCtx.waitUntil(
    db
      .insert(scanEvents)
      .values({
        id: generateId('scn'),
        qrCodeId: qr.id,
        workspaceId: qr.workspaceId,
        ipHash,
        country,
        city,
        userAgent: ua.slice(0, 500),
        deviceType: parsed.deviceType,
        os: parsed.os,
        browser: parsed.browser,
        isBot: parsed.isBot,
        isUnique: false,
        redirectedTo: `landing:${qr.type}`,
      })
      .catch(() => {}),
  );

  let payload: Record<string, any> = {};
  try {
    if (qr.destinationPayload) payload = JSON.parse(qr.destinationPayload);
  } catch {}

  let html: string;
  switch (qr.type) {
    case 'vcard':
      html = renderVcard(payload);
      break;
    case 'wifi':
      html = renderWifi(payload);
      break;
    case 'multilink':
      html = renderMultilink(payload);
      break;
    case 'location':
      html = renderLocation(payload);
      break;
    case 'coupon':
      html = renderCoupon(payload);
      break;
    case 'feedback':
      html = renderFeedback(payload, qr.id);
      break;
    case 'review':
      html = renderReview(payload);
      break;
    case 'event':
      html = renderEvent(payload);
      break;
    case 'menu':
      html = renderMenu(payload);
      break;
    case 'app':
      html = renderApp(payload, parsed.os);
      break;
    default:
      // For non-landing types, redirect to the destinationUrl
      return c.redirect(qr.destinationUrl, 302);
  }

  return c.html(html);
});

/* ============================================================
 * Reusable page chrome
 * ============================================================ */

function baseLayout(opts: { title: string; bodyClass?: string; body: string }): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0a0e27">
<meta name="robots" content="noindex">
<title>${esc(opts.title)}</title>
<style>
:root{--bg:#fafbff;--surface:#ffffff;--text:#0a0e27;--text-soft:#4a5172;--text-muted:#6b7390;--border:#e6e8f0;--brand:#2540ff;--accent:#00d4a8;--radius:14px}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;background:linear-gradient(180deg,var(--bg) 0%,#fff 100%);color:var(--text);min-height:100vh;padding:24px;display:flex;align-items:flex-start;justify-content:center;-webkit-font-smoothing:antialiased}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;max-width:480px;width:100%;box-shadow:0 8px 32px rgba(10,14,39,0.06);margin-top:24px}
.brand{display:flex;align-items:center;gap:8px;justify-content:center;font-weight:800;font-size:15px;color:var(--text-muted);margin-bottom:6px;letter-spacing:-0.01em}
h1{font-size:22px;font-weight:700;margin:14px 0 8px;letter-spacing:-0.02em;text-align:center}
h2{font-size:17px;font-weight:600;margin:18px 0 8px;letter-spacing:-0.01em}
p{margin:0 0 10px;color:var(--text-soft);font-size:14px;line-height:1.55;text-align:center}
.btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:13px 16px;background:var(--brand);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;margin:10px 0;border:none;cursor:pointer;font-family:inherit;transition:opacity 0.15s}
.btn:hover{opacity:0.92}.btn:active{opacity:0.85}
.btn-secondary{background:transparent;color:var(--text);border:1px solid var(--border)}
.btn-accent{background:var(--accent);color:#002b21}
.field{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:var(--bg);border-radius:8px;margin-bottom:8px;font-size:14px}
.field strong{color:var(--text);font-weight:600}
.field span{color:var(--text-soft);font-family:ui-monospace,Consolas,monospace;font-size:13px;text-align:right;word-break:break-all;max-width:65%}
.footer{text-align:center;color:var(--text-muted);font-size:11px;margin-top:18px;padding-top:18px;border-top:1px solid var(--border)}
.footer a{color:var(--text-muted);text-decoration:underline}
img.cover{width:calc(100% + 56px);margin:-28px -28px 14px;height:160px;object-fit:cover;border-radius:14px 14px 0 0}
.avatar{width:88px;height:88px;border-radius:50%;background:var(--bg);margin:0 auto 12px;display:block;border:3px solid #fff;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.copy-btn{background:none;border:1px solid var(--border);padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;color:var(--text-soft);font-family:inherit}
.copy-btn:hover{background:var(--bg)}
ul{list-style:none;padding:0;margin:14px 0 0}
.link-row{display:block;padding:13px 16px;background:var(--bg);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;color:var(--text);text-decoration:none;font-weight:500;text-align:center;transition:background 0.15s}
.link-row:hover{background:#eef0ff}
.coupon-code{font-size:24px;font-weight:800;letter-spacing:0.08em;font-family:ui-monospace,Consolas,monospace;background:var(--bg);padding:16px;border-radius:10px;text-align:center;margin:14px 0;border:2px dashed var(--brand);color:var(--brand)}
.rating{display:flex;gap:6px;justify-content:center;margin:14px 0}
.rating-btn{font-size:32px;background:none;border:none;cursor:pointer;color:#d4d8e0;transition:color 0.15s;padding:4px}
.rating-btn:hover,.rating-btn.active{color:#fbbf24}
.brand-mark{width:18px;height:18px}
</style></head><body class="${opts.bodyClass || ''}">${opts.body}</body></html>`;
}

function pageFooter(): string {
  return `<div class="footer">
    <div class="brand"><svg class="brand-mark" viewBox="0 0 32 32"><rect x="2" y="2" width="10" height="10" rx="2" fill="#0a0e27"/><rect x="20" y="2" width="10" height="10" rx="2" fill="#0a0e27"/><rect x="2" y="20" width="10" height="10" rx="2" fill="#0a0e27"/><rect x="22" y="22" width="6" height="6" rx="1.5" fill="#2540ff"/><rect x="14" y="14" width="4" height="4" fill="#2540ff"/></svg> Powered by <a href="https://dynamicqrcodelabs.com">Dynamic QR Code Labs</a></div>
  </div>`;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
 * Landing types
 * ============================================================ */

function renderVcard(p: any): string {
  const name = p.name || 'Contact';
  const vcfLines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (p.name) vcfLines.push(`FN:${p.name}`);
  if (p.lastName || p.firstName) vcfLines.push(`N:${p.lastName || ''};${p.firstName || ''};;;`);
  if (p.organization) vcfLines.push(`ORG:${p.organization}`);
  if (p.title) vcfLines.push(`TITLE:${p.title}`);
  if (p.phone) vcfLines.push(`TEL;TYPE=CELL:${p.phone}`);
  if (p.email) vcfLines.push(`EMAIL:${p.email}`);
  if (p.website) vcfLines.push(`URL:${p.website}`);
  if (p.address) vcfLines.push(`ADR:;;${p.address};;;;`);
  vcfLines.push('END:VCARD');
  const vcf = encodeURIComponent(vcfLines.join('\n'));

  const body = `<div class="card">
    ${p.avatarUrl ? `<img src="${esc(p.avatarUrl)}" class="avatar" alt="">` : ''}
    <h1>${esc(name)}</h1>
    ${p.title ? `<p>${esc(p.title)}${p.organization ? ` · ${esc(p.organization)}` : ''}</p>` : ''}
    ${p.phone ? `<div class="field"><strong>Phone</strong><span>${esc(p.phone)}</span></div>` : ''}
    ${p.email ? `<div class="field"><strong>Email</strong><span>${esc(p.email)}</span></div>` : ''}
    ${p.website ? `<div class="field"><strong>Website</strong><span>${esc(p.website)}</span></div>` : ''}
    ${p.address ? `<div class="field"><strong>Address</strong><span>${esc(p.address)}</span></div>` : ''}
    <a class="btn" href="data:text/vcard;charset=utf-8,${vcf}" download="${esc(name.replace(/\s+/g, '_'))}.vcf">📇 Save to Contacts</a>
    ${p.phone ? `<a class="btn btn-secondary" href="tel:${esc(p.phone)}">📞 Call</a>` : ''}
    ${p.email ? `<a class="btn btn-secondary" href="mailto:${esc(p.email)}">✉️ Email</a>` : ''}
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: name, body });
}

function renderWifi(p: any): string {
  const ssid = p.ssid || 'WiFi network';
  const password = p.password || '';
  const security = p.security || 'WPA';
  const qrString =
    security === 'nopass'
      ? `WIFI:T:nopass;S:${ssid};;`
      : `WIFI:T:${security};S:${ssid};P:${password};;`;

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">📶</div>
    <h1>Connect to WiFi</h1>
    <p>Tap the button below or copy the password manually.</p>
    <div class="field"><strong>Network</strong><span>${esc(ssid)}</span></div>
    ${security !== 'nopass' ? `<div class="field"><strong>Password</strong><span id="pw">${esc(password)}</span><button class="copy-btn" onclick="navigator.clipboard.writeText(${JSON.stringify(password)});this.textContent='Copied!'">Copy</button></div>` : ''}
    <div class="field"><strong>Security</strong><span>${esc(security === 'nopass' ? 'Open' : security)}</span></div>
    <a class="btn" href="${esc(qrString)}">📡 Connect (iOS/Android)</a>
    <p style="font-size:12px;color:var(--text-muted);margin-top:14px">If the button doesn't connect automatically, manually join "<strong>${esc(ssid)}</strong>" with the password above.</p>
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: `Connect to ${ssid}`, body });
}

function renderMultilink(p: any): string {
  const links: Array<{ label: string; url: string }> = p.links || [];
  const title = p.title || 'My links';
  const subtitle = p.subtitle || '';
  const avatar = p.avatarUrl;

  const body = `<div class="card">
    ${avatar ? `<img src="${esc(avatar)}" class="avatar" alt="">` : ''}
    <h1>${esc(title)}</h1>
    ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
    <ul>${links.map((l) => `<li><a class="link-row" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join('')}</ul>
    ${pageFooter()}
  </div>`;
  return baseLayout({ title, body });
}

function renderLocation(p: any): string {
  const address = p.address || '';
  const name = p.name || 'Location';
  const lat = p.lat;
  const lng = p.lng;
  const mapUrl =
    lat && lng
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : `https://www.google.com/maps?q=${encodeURIComponent(address)}`;
  const appleUrl =
    lat && lng
      ? `https://maps.apple.com/?ll=${lat},${lng}`
      : `https://maps.apple.com/?q=${encodeURIComponent(address)}`;

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">📍</div>
    <h1>${esc(name)}</h1>
    <p>${esc(address)}</p>
    <a class="btn" href="${esc(mapUrl)}" target="_blank" rel="noopener">🗺️ Open in Google Maps</a>
    <a class="btn btn-secondary" href="${esc(appleUrl)}" target="_blank" rel="noopener">🍎 Open in Apple Maps</a>
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: name, body });
}

function renderCoupon(p: any): string {
  const code = p.code || 'OFFER';
  const title = p.title || 'Your offer';
  const description = p.description || '';
  const expiresAt = p.expiresAt;
  const cta = p.ctaUrl;
  const ctaLabel = p.ctaLabel || 'Redeem now';

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">🎟️</div>
    <h1>${esc(title)}</h1>
    ${description ? `<p>${esc(description)}</p>` : ''}
    <div class="coupon-code">${esc(code)}</div>
    <button class="btn btn-accent" onclick="navigator.clipboard.writeText(${JSON.stringify(code)});this.textContent='Copied! ✓'">Copy code</button>
    ${cta ? `<a class="btn" href="${esc(cta)}" target="_blank" rel="noopener">${esc(ctaLabel)}</a>` : ''}
    ${expiresAt ? `<p style="font-size:12px;color:var(--text-muted);margin-top:14px">Expires ${esc(new Date(expiresAt).toLocaleDateString())}</p>` : ''}
    ${pageFooter()}
  </div>`;
  return baseLayout({ title, body });
}

function renderFeedback(p: any, qrId: string): string {
  const title = p.title || 'How was your experience?';
  const subtitle = p.subtitle || 'Your feedback helps us improve.';

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">⭐</div>
    <h1>${esc(title)}</h1>
    <p>${esc(subtitle)}</p>
    <div class="rating" role="radiogroup" aria-label="Rate from 1 to 5">
      ${[1, 2, 3, 4, 5].map((n) => `<button class="rating-btn" data-rating="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
    </div>
    <textarea placeholder="Tell us more (optional)" rows="3" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:14px;resize:vertical;margin:6px 0 12px"></textarea>
    <button class="btn" id="submit-feedback">Send feedback</button>
    <div id="feedback-thanks" hidden style="text-align:center;padding:20px;color:var(--accent);font-weight:600">Thank you for your feedback! ✓</div>
    ${pageFooter()}
    <script>
      let rating = 0;
      document.querySelectorAll('.rating-btn').forEach(b => {
        b.addEventListener('click', () => {
          rating = +b.dataset.rating;
          document.querySelectorAll('.rating-btn').forEach((x, i) => {
            x.classList.toggle('active', i < rating);
          });
        });
      });
      document.getElementById('submit-feedback').addEventListener('click', async () => {
        // Future: POST to /api/feedback/:qrId
        document.querySelector('.rating').style.display = 'none';
        document.querySelector('textarea').style.display = 'none';
        document.getElementById('submit-feedback').style.display = 'none';
        document.getElementById('feedback-thanks').hidden = false;
      });
    </script>
  </div>`;
  return baseLayout({ title, body });
}

function renderReview(p: any): string {
  const business = p.businessName || 'us';
  const googlePlaceUrl = p.googlePlaceUrl;
  const yelpUrl = p.yelpUrl;
  const tripadvisorUrl = p.tripadvisorUrl;
  const trustpilotUrl = p.trustpilotUrl;

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">⭐</div>
    <h1>Loved ${esc(business)}?</h1>
    <p>Tell others by leaving a review. It takes a minute.</p>
    ${googlePlaceUrl ? `<a class="btn" href="${esc(googlePlaceUrl)}" target="_blank" rel="noopener">⭐ Review on Google</a>` : ''}
    ${yelpUrl ? `<a class="btn btn-secondary" href="${esc(yelpUrl)}" target="_blank" rel="noopener">📝 Review on Yelp</a>` : ''}
    ${tripadvisorUrl ? `<a class="btn btn-secondary" href="${esc(tripadvisorUrl)}" target="_blank" rel="noopener">🌍 Review on TripAdvisor</a>` : ''}
    ${trustpilotUrl ? `<a class="btn btn-secondary" href="${esc(trustpilotUrl)}" target="_blank" rel="noopener">✅ Review on Trustpilot</a>` : ''}
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: `Review ${business}`, body });
}

function renderEvent(p: any): string {
  const title = p.title || 'Event';
  const startsAt = p.startsAt;
  const endsAt = p.endsAt;
  const location = p.location || '';
  const description = p.description || '';
  const ics = buildIcs(p);
  const icsBlob = encodeURIComponent(ics);

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">📅</div>
    <h1>${esc(title)}</h1>
    ${startsAt ? `<p>${esc(new Date(startsAt).toLocaleString())}${endsAt ? ` → ${esc(new Date(endsAt).toLocaleString())}` : ''}</p>` : ''}
    ${location ? `<p>📍 ${esc(location)}</p>` : ''}
    ${description ? `<p style="text-align:left">${esc(description)}</p>` : ''}
    <a class="btn" href="data:text/calendar;charset=utf-8,${icsBlob}" download="${esc(title.replace(/\s+/g, '_'))}.ics">📅 Add to Calendar</a>
    ${pageFooter()}
  </div>`;
  return baseLayout({ title, body });
}

function buildIcs(p: any): string {
  const dtStart = p.startsAt ? new Date(p.startsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '') : '';
  const dtEnd = p.endsAt ? new Date(p.endsAt).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '') : dtStart;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dynamic QR Code Labs//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@dynamicqrcodelabs.com`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${p.title || ''}`,
    `LOCATION:${p.location || ''}`,
    `DESCRIPTION:${(p.description || '').replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function renderMenu(p: any): string {
  const categories: Array<{
    name: string;
    items: Array<{ name: string; price?: string; description?: string }>;
  }> = p.categories || [];
  const restaurantName = p.restaurantName || 'Menu';

  const cats = categories
    .map(
      (c) => `<h2>${esc(c.name)}</h2>
    <ul>${c.items
      .map(
        (item) => `<li class="link-row" style="text-align:left;cursor:default">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <strong>${esc(item.name)}</strong>
          ${item.price ? `<span style="color:var(--brand);font-weight:600">${esc(item.price)}</span>` : ''}
        </div>
        ${item.description ? `<div style="font-size:13px;color:var(--text-soft);margin-top:4px">${esc(item.description)}</div>` : ''}
      </li>`,
      )
      .join('')}</ul>`,
    )
    .join('');

  const body = `<div class="card">
    <h1>${esc(restaurantName)}</h1>
    ${p.subtitle ? `<p>${esc(p.subtitle)}</p>` : ''}
    ${cats || '<p style="text-align:center;color:var(--text-muted)">Menu is being updated.</p>'}
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: restaurantName, body });
}

function renderApp(p: any, os: string): string {
  const appStoreUrl = p.appStoreUrl;
  const playStoreUrl = p.playStoreUrl;
  const fallbackUrl = p.websiteUrl;

  // Smart redirect if we have a matching store URL
  if (os === 'iOS' && appStoreUrl) {
    return baseLayout({
      title: 'Opening App Store…',
      body: `<div class="card"><h1>Opening App Store…</h1><p>If it doesn't open automatically:</p><a class="btn" href="${esc(appStoreUrl)}">Open in App Store</a></div><script>setTimeout(() => location.href = ${JSON.stringify(appStoreUrl)}, 100);</script>`,
    });
  }
  if (os === 'Android' && playStoreUrl) {
    return baseLayout({
      title: 'Opening Google Play…',
      body: `<div class="card"><h1>Opening Google Play…</h1><p>If it doesn't open automatically:</p><a class="btn" href="${esc(playStoreUrl)}">Open in Play Store</a></div><script>setTimeout(() => location.href = ${JSON.stringify(playStoreUrl)}, 100);</script>`,
    });
  }

  const body = `<div class="card">
    <div style="text-align:center;font-size:48px;margin-bottom:8px">📱</div>
    <h1>${esc(p.appName || 'Download our app')}</h1>
    ${p.description ? `<p>${esc(p.description)}</p>` : ''}
    ${appStoreUrl ? `<a class="btn" href="${esc(appStoreUrl)}" target="_blank">🍎 Download for iOS</a>` : ''}
    ${playStoreUrl ? `<a class="btn" href="${esc(playStoreUrl)}" target="_blank">▶️ Download for Android</a>` : ''}
    ${fallbackUrl ? `<a class="btn btn-secondary" href="${esc(fallbackUrl)}" target="_blank">🌐 Visit website</a>` : ''}
    ${pageFooter()}
  </div>`;
  return baseLayout({ title: p.appName || 'Download app', body });
}

function notFoundPage(): string {
  return baseLayout({
    title: 'Not found',
    body: `<div class="card"><h1>QR code not found</h1><p>We couldn't find a QR code matching this link.</p><a class="btn" href="https://dynamicqrcodelabs.com/">Create your own QR</a></div>`,
  });
}

function unavailablePage(): string {
  return baseLayout({
    title: 'Unavailable',
    body: `<div class="card"><h1>This QR code is unavailable</h1><p>The owner has paused or revoked this QR.</p><a class="btn" href="https://dynamicqrcodelabs.com/">Create your own QR</a></div>`,
  });
}

export default router;
