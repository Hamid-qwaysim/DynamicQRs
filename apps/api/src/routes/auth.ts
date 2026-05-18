import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { users, workspaces, workspaceMembers } from '../db/schema';
import {
  hashPassword,
  verifyPassword,
  generateId,
  hashIp,
} from '../lib/crypto';
import { createSession, destroySession, getCurrentUser } from '../lib/session';
import type { Env, Variables } from '../types';

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(10).max(200),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'workspace';
}

async function uniqueWorkspaceSlug(env: Env, base: string): Promise<string> {
  const db = drizzle(env.DB);
  let slug = base;
  for (let i = 0; i < 10; i++) {
    const found = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);
    if (found.length === 0) return slug;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${base}-${suffix}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

auth.post('/signup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      400,
    );
  }
  const { name, email, password } = parsed.data;

  const db = drizzle(c.env.DB);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'An account with this email already exists.' }, 409);
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId('usr');
  await db.insert(users).values({
    id: userId,
    name,
    email,
    passwordHash,
  });

  const wsId = generateId('ws');
  const baseSlug = slugify(name) || slugify(email.split('@')[0] || 'workspace');
  const slug = await uniqueWorkspaceSlug(c.env, baseSlug);
  await db.insert(workspaces).values({
    id: wsId,
    name: `${name}'s workspace`,
    slug,
    ownerId: userId,
    plan: 'free',
  });
  await db.insert(workspaceMembers).values({
    id: generateId('mem'),
    workspaceId: wsId,
    userId,
    role: 'owner',
    inviteStatus: 'accepted',
  });

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '';
  const ua = c.req.header('user-agent') || '';
  const ipHash = ip
    ? await hashIp(ip, c.env.IP_HASH_SALT || 'dqrl-default-salt')
    : null;

  await createSession(c.env, c, userId, { ipHash, userAgent: ua });

  return c.json({
    user: { id: userId, name, email },
    workspace: { id: wsId, slug, name: `${name}'s workspace`, plan: 'free' },
  });
});

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid email or password.' }, 400);
  }
  const { email, password } = parsed.data;

  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (rows.length === 0) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }
  const user = rows[0];
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '';
  const ua = c.req.header('user-agent') || '';
  const ipHash = ip
    ? await hashIp(ip, c.env.IP_HASH_SALT || 'dqrl-default-salt')
    : null;

  await createSession(c.env, c, user.id, { ipHash, userAgent: ua });

  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
});

auth.post('/logout', async (c) => {
  await destroySession(c.env, c);
  return c.json({ ok: true });
});

auth.get('/me', async (c) => {
  const user = await getCurrentUser(c.env, c);
  if (!user) return c.json({ user: null }, 200);
  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  });
});

export default auth;
