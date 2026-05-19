import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users, emailVerificationTokens } from '../db/schema';
import { generateId, generateSessionId, hashApiKey } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

// Authenticated endpoint to (re-)send a verification email to the current user.
router.post('/send', requireAuth, async (c) => {
  const user = c.get('user')!;
  const db = drizzle(c.env.DB);

  const userRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (userRows.length === 0) return c.json({ error: 'User not found' }, 404);
  const u = userRows[0];

  if (u.emailVerified) {
    return c.json({ ok: true, alreadyVerified: true });
  }

  const rawToken = generateSessionId() + generateSessionId();
  const tokenHash = await hashApiKey(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await db.insert(emailVerificationTokens).values({
    id: generateId('evt'),
    userId: u.id,
    tokenHash,
    email: u.email,
    expiresAt,
  });

  // TODO: When SendGrid is configured, send email here.
  //   Verification URL is:
  //   `${env.PUBLIC_SITE_URL}/verify-email/?token=${rawToken}`
  console.log(`[email-verify] Send to ${u.email}: token=${rawToken}`);

  const response: Record<string, unknown> = { ok: true };
  if (c.env.ENVIRONMENT !== 'production') {
    response.devToken = rawToken;
  }
  return c.json(response, 200);
});

const verifySchema = z.object({
  token: z.string().min(20).max(200),
});

router.post('/confirm', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid token' }, 400);
  const { token } = parsed.data;

  const tokenHash = await hashApiKey(token);
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const rows = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, now),
        isNull(emailVerificationTokens.usedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return c.json({ error: 'Verification link is invalid or expired.' }, 400);
  }

  const row = rows[0];
  await db
    .update(users)
    .set({ emailVerified: true, emailVerifiedAt: now })
    .where(eq(users.id, row.userId));
  await db
    .update(emailVerificationTokens)
    .set({ usedAt: now })
    .where(eq(emailVerificationTokens.id, row.id));

  return c.json({ ok: true });
});

export default router;
