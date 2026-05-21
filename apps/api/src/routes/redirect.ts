import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { qrCodes, scanEvents } from '../db/schema';
import { hashIp, generateId } from '../lib/crypto';
import { parseUserAgent } from '../lib/ua';
import type { Env } from '../types';

const redirect = new Hono<{ Bindings: Env }>();

const STATUS_PAGES: Record<string, { title: string; body: string }> = {
  paused: {
    title: 'This QR code is temporarily paused',
    body: 'The owner has paused this QR code. Please check back later.',
  },
  revoked: {
    title: 'This QR code is no longer active',
    body: 'The owner has revoked this QR code. It is permanently disabled.',
  },
  expired: {
    title: 'This QR code has expired',
    body: 'This QR code reached its expiration date and is no longer redirecting.',
  },
  limit_reached: {
    title: 'This QR code has reached its scan limit',
    body: 'The scan limit set by the owner has been reached. The QR code is no longer redirecting.',
  },
  unavailable: {
    title: 'This QR code is unavailable',
    body: 'This QR code is no longer available.',
  },
  notfound: {
    title: 'QR code not found',
    body: 'We could not find a QR code matching this short link.',
  },
};

function statusPage(reason: keyof typeof STATUS_PAGES): string {
  const { title, body } = STATUS_PAGES[reason] ?? STATUS_PAGES.unavailable;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#fafbff;color:#0a0e27;padding:24px}.box{max-width:480px;text-align:center;background:#fff;border:1px solid #e6e8f0;border-radius:16px;padding:40px 32px;box-shadow:0 8px 32px rgba(10,14,39,0.06)}h1{font-size:1.5rem;margin:0 0 12px;letter-spacing:-0.02em}p{color:#4a5172;margin:0 0 24px;line-height:1.55}a{display:inline-block;background:#2540ff;color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.94rem}</style></head><body><div class="box"><h1>${title}</h1><p>${body}</p><a href="https://dynamicqrcodelabs.com/">Create your own QR code</a></div></body></html>`;
}

interface RedirectRule {
  type: 'device' | 'os' | 'country' | 'language' | 'time' | 'ab' | 'scan_count';
  match: string | string[];
  destination: string;
}

function applyRedirectRules(
  rules: RedirectRule[] | null,
  ctx: {
    deviceType: string;
    os: string;
    country: string | null;
    language: string | null;
    scanCount: number;
  },
): { destination: string | null; ruleId: string | null } {
  if (!rules || rules.length === 0) return { destination: null, ruleId: null };
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const matchValues = Array.isArray(rule.match) ? rule.match : [rule.match];
    let hit = false;
    switch (rule.type) {
      case 'device':
        hit = matchValues.includes(ctx.deviceType);
        break;
      case 'os':
        hit = matchValues.some((m) => m.toLowerCase() === ctx.os.toLowerCase());
        break;
      case 'country':
        hit = ctx.country !== null && matchValues.includes(ctx.country);
        break;
      case 'language':
        hit =
          ctx.language !== null &&
          matchValues.some((m) =>
            ctx.language!.toLowerCase().startsWith(m.toLowerCase()),
          );
        break;
      case 'ab': {
        const pct = Number(matchValues[0]) || 50;
        hit = Math.random() * 100 < pct;
        break;
      }
      case 'scan_count': {
        const limit = Number(matchValues[0]);
        hit = !Number.isNaN(limit) && ctx.scanCount < limit;
        break;
      }
    }
    if (hit) {
      return { destination: rule.destination, ruleId: `rule_${i}` };
    }
  }
  return { destination: null, ruleId: null };
}

redirect.get('/:shortCode', async (c) => {
  const start = Date.now();
  const code = c.req.param('shortCode');
  if (!code || code.length > 32) {
    return c.html(statusPage('notfound'), 404);
  }

  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.shortCode, code))
    .limit(1);

  if (rows.length === 0) {
    return c.html(statusPage('notfound'), 404);
  }
  const qr = rows[0];

  if (qr.deletedAt) return c.html(statusPage('unavailable'), 410);
  if (qr.status === 'paused') return c.html(statusPage('paused'), 200);
  if (qr.status === 'revoked' || qr.status === 'archived') {
    return c.html(statusPage('revoked'), 410);
  }

  // For landing-page QR types, serve the hosted landing instead of redirecting.
  // The /p/:shortCode route renders the HTML and logs its own scan event.
  const LANDING_TYPES = new Set([
    'vcard', 'wifi', 'multilink', 'location', 'coupon',
    'event', 'review', 'feedback', 'menu', 'app',
  ]);
  if (LANDING_TYPES.has(qr.type)) {
    // Forward to /p/:shortCode (preserves analytics for that route)
    const url = new URL(c.req.url);
    return c.redirect(`${url.origin}/p/${code}`, 302);
  }
  if (qr.expiresAt && new Date(qr.expiresAt).valueOf() < Date.now()) {
    if (qr.fallbackUrl) return c.redirect(qr.fallbackUrl, 302);
    return c.html(statusPage('expired'), 410);
  }
  if (
    typeof qr.scanLimit === 'number' &&
    qr.scanLimit > 0 &&
    qr.scanCountTotal >= qr.scanLimit
  ) {
    if (qr.fallbackUrl) return c.redirect(qr.fallbackUrl, 302);
    return c.html(statusPage('limit_reached'), 410);
  }

  const cfReq = c.req.raw as Request & { cf?: IncomingRequestCfProperties };
  const cf = cfReq.cf;
  const country = (cf?.country as string | null) ?? null;
  const city = (cf?.city as string | null) ?? null;
  const region = (cf?.region as string | null) ?? null;
  const ua = c.req.header('user-agent') || '';
  const parsed = parseUserAgent(ua);
  const referrer = c.req.header('referer') || null;
  const acceptLang = c.req.header('accept-language') || null;
  const language = acceptLang ? acceptLang.split(',')[0]?.split(';')[0] || null : null;

  let rules: RedirectRule[] | null = null;
  if (qr.redirectRulesJson) {
    try {
      rules = JSON.parse(qr.redirectRulesJson);
    } catch {
      rules = null;
    }
  }

  const ruleResult = applyRedirectRules(rules, {
    deviceType: parsed.deviceType,
    os: parsed.os,
    country,
    language,
    scanCount: qr.scanCountTotal,
  });
  const finalDestination = ruleResult.destination || qr.destinationUrl;

  const ip =
    c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '';
  const ipHash = ip
    ? await hashIp(ip, c.env.IP_HASH_SALT || 'dqrl-default-salt')
    : null;

  const url = new URL(c.req.url);
  const utmSource = url.searchParams.get('utm_source');
  const utmMedium = url.searchParams.get('utm_medium');
  const utmCampaign = url.searchParams.get('utm_campaign');

  const responseTime = Date.now() - start;

  c.executionCtx.waitUntil(
    (async () => {
      try {
        await db.insert(scanEvents).values({
          id: generateId('scn'),
          qrCodeId: qr.id,
          workspaceId: qr.workspaceId,
          ipHash,
          country,
          city,
          region,
          userAgent: ua.slice(0, 500),
          deviceType: parsed.deviceType,
          os: parsed.os,
          browser: parsed.browser,
          referrer: referrer?.slice(0, 500) ?? null,
          utmSource,
          utmMedium,
          utmCampaign,
          language,
          isBot: parsed.isBot,
          isUnique: false,
          ruleMatched: ruleResult.ruleId,
          redirectedTo: finalDestination.slice(0, 500),
          responseTimeMs: responseTime,
        });
        if (!parsed.isBot) {
          await db
            .update(qrCodes)
            .set({ scanCountTotal: sql`${qrCodes.scanCountTotal} + 1` })
            .where(eq(qrCodes.id, qr.id));
        }
      } catch (err) {
        console.error('scan_event_insert_failed', err);
      }
    })(),
  );

  c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
  c.header('Referrer-Policy', 'no-referrer-when-downgrade');
  return c.redirect(finalDestination, 302);
});

export default redirect;
