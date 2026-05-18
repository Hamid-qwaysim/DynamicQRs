import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import qrRoutes from './routes/qr-codes';
import redirectRoutes from './routes/redirect';
import type { Env, Variables } from './types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', logger());

app.use(
  '/api/*',
  cors({
    origin: (origin, c) => {
      const site = c.env.PUBLIC_SITE_URL || 'https://dynamicqrcodelabs.com';
      const allowed = new Set([
        site,
        'http://localhost:4321',
        'http://localhost:5173',
        'http://localhost:3000',
      ]);
      return origin && allowed.has(origin) ? origin : site;
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
app.route('/api/qr-codes', qrRoutes);
app.route('/q', redirectRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('unhandled_error', err);
  return c.json(
    { error: c.env.ENVIRONMENT === 'production' ? 'Server error' : err.message },
    500,
  );
});

export default app;
