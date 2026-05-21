import { Hono } from 'hono';
import { z } from 'zod';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users, passwordResetTokens } from '../db/schema';
import {
  hashPassword,
  generateId,
  generateSessionId,
  hashApiKey,
} from '../lib/crypto';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

const resetSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(6).max(200),
});

// Always returns 200 to avoid email enumeration attacks.
router.post('/request', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ ok: true }, 200);
  }
  const { email } = parsed.data;

  const db = drizzle(c.env.DB);
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (rows.length === 0) {
    return c.json({ ok: true }, 200);
  }
  const user = rows[0];

  const rawToken = generateSessionId() + generateSessionId();
  const tokenHash = await hashApiKey(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await db.insert(passwordResetTokens).values({
    id: generateId('prt'),
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  // TODO: When SendGrid is configured, send email here.
  //   The reset link is:
  //   `${env.PUBLIC_SITE_URL}/reset-password/?token=${rawToken}`
  console.log(`[password-reset] Email to ${email}: token=${rawToken}`);

  const response: Record<string, unknown> = { ok: true };
  if (c.env.ENVIRONMENT !== 'production') {
    // Surface the token in non-prod for testing without an email provider configured.
    response.devToken = rawToken;
  }
  return c.json(response, 200);
});

router.post('/reset', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }
  const { token, password } = parsed.data;

  const tokenHash = await hashApiKey(token);
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return c.json({ error: 'This password reset link is invalid or has expired.' }, 400);
  }

  const row = rows[0];
  const newHash = await hashPassword(password);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, row.userId));
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, row.id));

  return c.json({ ok: true });
});

export default router;
