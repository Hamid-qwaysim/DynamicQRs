import type { Context } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { eq, gt, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { sessions, users } from '../db/schema';
import { generateSessionId } from './crypto';
import type { Env } from '../types';

const COOKIE_NAME = 'dqrl_session';
const SESSION_TTL_DAYS = 30;

export async function createSession(
  env: Env,
  c: Context,
  userId: string,
  meta: { ipHash?: string | null; userAgent?: string | null } = {},
): Promise<string> {
  const db = drizzle(env.DB);
  const id = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id,
    userId,
    expiresAt: expiresAt.toISOString(),
    ipHash: meta.ipHash ?? null,
    userAgent: meta.userAgent ?? null,
  });

  const isProd = env.ENVIRONMENT === 'production';
  setCookie(c, COOKIE_NAME, id, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'None' : 'Lax',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    expires: expiresAt,
  });

  return id;
}

export async function getCurrentUser(env: Env, c: Context) {
  const sid = getCookie(c, COOKIE_NAME);
  if (!sid) return null;
  const db = drizzle(env.DB);
  const now = new Date().toISOString();
  const rows = await db
    .select({
      userId: sessions.userId,
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userEmail: users.email,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sid), gt(sessions.expiresAt, now)))
    .limit(1);
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.userId,
    email: r.userEmail,
    name: r.userName,
    avatarUrl: r.userAvatar,
    sessionId: r.sessionId,
  };
}

export async function destroySession(env: Env, c: Context) {
  const sid = getCookie(c, COOKIE_NAME);
  if (sid) {
    const db = drizzle(env.DB);
    await db.delete(sessions).where(eq(sessions.id, sid));
  }
  deleteCookie(c, COOKIE_NAME, { path: '/' });
}
