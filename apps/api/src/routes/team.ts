import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  workspaces,
  workspaceMembers,
  workspaceInvites,
  users,
} from '../db/schema';
import {
  generateId,
  generateSessionId,
  hashApiKey,
} from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
router.use('*', requireAuth);

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
});

const updateRoleSchema = z.object({
  role: z.enum(['admin', 'editor', 'viewer']),
});

async function getDefaultWorkspace(env: Env, userId: string) {
  const db = drizzle(env.DB);
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      plan: workspaces.plan,
      role: workspaceMembers.role,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt)
    .limit(1);
  return rows[0] ?? null;
}

router.get('/workspace', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  return c.json({ workspace: ws });
});

router.get('/members', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ members: [] });

  const db = drizzle(c.env.DB);
  const members = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      inviteStatus: workspaceMembers.inviteStatus,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .leftJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, ws.id))
    .orderBy(workspaceMembers.createdAt);

  return c.json({ members, currentUserRole: ws.role });
});

router.get('/invites', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ invites: [] });

  const db = drizzle(c.env.DB);
  const rows = await db
    .select({
      id: workspaceInvites.id,
      email: workspaceInvites.email,
      role: workspaceInvites.role,
      expiresAt: workspaceInvites.expiresAt,
      acceptedAt: workspaceInvites.acceptedAt,
      createdAt: workspaceInvites.createdAt,
    })
    .from(workspaceInvites)
    .where(eq(workspaceInvites.workspaceId, ws.id))
    .orderBy(desc(workspaceInvites.createdAt));

  return c.json({ invites: rows });
});

router.post('/invites', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return c.json({ error: 'Only owners and admins can invite.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }

  const db = drizzle(c.env.DB);
  // Check if user is already a member
  const existingUser = await db.select().from(users).where(eq(users.email, parsed.data.email)).limit(1);
  if (existingUser.length > 0) {
    const existingMember = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, ws.id), eq(workspaceMembers.userId, existingUser[0].id)),
      )
      .limit(1);
    if (existingMember.length > 0) {
      return c.json({ error: 'This user is already a member.' }, 409);
    }
  }

  const rawToken = generateSessionId();
  const tokenHash = await hashApiKey(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(workspaceInvites).values({
    id: generateId('inv'),
    workspaceId: ws.id,
    email: parsed.data.email,
    role: parsed.data.role,
    tokenHash,
    invitedBy: user.id,
    expiresAt,
  });

  // TODO: send invite email via SendGrid
  console.log(`[team] Invite ${parsed.data.email}: ${c.env.PUBLIC_SITE_URL}/invite/?token=${rawToken}`);

  const response: Record<string, unknown> = { ok: true };
  if (c.env.ENVIRONMENT !== 'production') response.devToken = rawToken;
  return c.json(response);
});

router.delete('/invites/:id', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const db = drizzle(c.env.DB);
  await db
    .delete(workspaceInvites)
    .where(
      and(eq(workspaceInvites.id, c.req.param('id')), eq(workspaceInvites.workspaceId, ws.id)),
    );
  return c.json({ ok: true });
});

router.patch('/members/:id', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const body = await c.req.json().catch(() => ({}));
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Invalid role' }, 400);

  const db = drizzle(c.env.DB);
  await db
    .update(workspaceMembers)
    .set({ role: parsed.data.role })
    .where(
      and(eq(workspaceMembers.id, c.req.param('id')), eq(workspaceMembers.workspaceId, ws.id)),
    );
  return c.json({ ok: true });
});

router.delete('/members/:id', async (c) => {
  const user = c.get('user')!;
  const ws = await getDefaultWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);
  if (ws.role !== 'owner' && ws.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  const db = drizzle(c.env.DB);
  await db
    .delete(workspaceMembers)
    .where(
      and(eq(workspaceMembers.id, c.req.param('id')), eq(workspaceMembers.workspaceId, ws.id)),
    );
  return c.json({ ok: true });
});

// Public: accept an invite token (creates membership for the current user)
router.post('/invites/accept', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const token = (body?.token ?? '').toString();
  if (!token) return c.json({ error: 'Token required' }, 400);

  const tokenHash = await hashApiKey(token);
  const db = drizzle(c.env.DB);
  const now = new Date().toISOString();

  const rows = await db
    .select()
    .from(workspaceInvites)
    .where(eq(workspaceInvites.tokenHash, tokenHash))
    .limit(1);
  if (rows.length === 0) return c.json({ error: 'Invalid invite' }, 400);
  const inv = rows[0];
  if (inv.acceptedAt) return c.json({ error: 'Invite already accepted' }, 400);
  if (new Date(inv.expiresAt) < new Date()) {
    return c.json({ error: 'Invite expired' }, 400);
  }

  // Match email
  const userRows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (userRows[0]?.email !== inv.email) {
    return c.json({ error: 'Invite was sent to a different email' }, 403);
  }

  await db.insert(workspaceMembers).values({
    id: generateId('mem'),
    workspaceId: inv.workspaceId,
    userId: user.id,
    role: inv.role,
    inviteStatus: 'accepted',
  });
  await db
    .update(workspaceInvites)
    .set({ acceptedAt: now })
    .where(eq(workspaceInvites.id, inv.id));

  return c.json({ ok: true, workspaceId: inv.workspaceId });
});

export default router;
