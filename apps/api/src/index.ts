import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import qrRoutes from './routes/qr-codes';
import redirectRoutes from './routes/redirect';
import passwordResetRoutes from './routes/password-reset';
import emailVerifyRoutes from './routes/email-verify';
import domainsRoutes from './routes/domains';
import teamRoutes from './routes/team';
import bulkRoutes from './routes/bulk';
import apiKeysRoutes from './routes/api-keys';
import billingRoutes from './routes/billing';
import stripeWebhookRoutes from './routes/stripe-webhook';
import landingRoutes from './routes/landing';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', logger());

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const site = c.env.PUBLIC_SITE_URL || 'https://dynamicqrcodelabs.com';
      if (!origin) return site;
      const staticAllowed = new Set([
        site,
        'https://www.dynamicqrcodelabs.com',
        'https://app.dynamicqrcodelabs.com',
        'http://localhost:4321',
        'http://localhost:5173',
        'http://localhost:3000',
      ]);
      if (staticAllowed.has(origin)) return origin;
      try {
        const host = new URL(origin).hostname;
        if (host === 'dynamicqrcodelabs.pages.dev') return origin;
        if (host.endsWith('.dynamicqrcodelabs.pages.dev')) return origin;
        if (host === 'dynamicqrcodelabs-app.pages.dev') return origin;
        if (host.endsWith('.dynamicqrcodelabs-app.pages.dev')) return origin;
        if (host === 'dynamicqrcodelabs.com') return origin;
        if (host === 'www.dynamicqrcodelabs.com') return origin;
        if (host === 'app.dynamicqrcodelabs.com') return origin;
      } catch {
        // fall through
      }
      return site;
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use(
  '/api/*',
  secureHeaders({
    contentSecurityPolicy: undefined,
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xFrameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }),
);

app.get('/healthz', (c) =>
  c.json({ ok: true, env: c.env.ENVIRONMENT, time: new Date().toISOString() }),
);

app.route('/api/auth', authRoutes);
app.route('/api/auth/password', passwordResetRoutes);
app.route('/api/auth/email', emailVerifyRoutes);
app.route('/api/qr-codes', qrRoutes);
app.route('/api/domains', domainsRoutes);
app.route('/api/team', teamRoutes);
app.route('/api/bulk', bulkRoutes);
app.route('/api/api-keys', apiKeysRoutes);
app.route('/api/billing', billingRoutes);
app.route('/api/webhooks/stripe', stripeWebhookRoutes);
app.route('/q', redirectRoutes);
app.route('/p', landingRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled_error', err);
  return c.json(
    { error: c.env.ENVIRONMENT === 'production' ? 'Server error' : err.message },
    500,
  );
});

export default app;
