import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { apiKeys, workspaces, workspaceMembers } from '../db/schema';
import { generateId, generateApiKey, hashApiKey } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
router.use('*', requireAuth);

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(['qr:read', 'qr:write', 'analytics:read', 'domains:read', 'admin']))
    .default(['qr:read', 'qr:write', 'analytics:read']),
});

async function getDefaultWorkspaceId(env: Env, userId: string): Promise<string | null> {
  const db = drizzle(env.DB);
  const rows = await db
    .select({ id: workspaces.id, role: workspaceMembers.role })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt)
    .limit(1);
  return rows[0]?.id ?? null;
}

router.get('/', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ keys: [] });

  const db = drizzle(c.env.DB);
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.workspaceId, wsId))
    .orderBy(desc(apiKeys.createdAt));

  return c.json({ keys: rows });
});

router.post('/', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }

  const { key, prefix } = generateApiKey();
  const keyHash = await hashApiKey(key);
  const id = generateId('key');

  const db = drizzle(c.env.DB);
  await db.insert(apiKeys).values({
    id,
    workspaceId: wsId,
    name: parsed.data.name,
    keyHash,
    keyPrefix: prefix,
    scopes: parsed.data.scopes.join(','),
  });

  // The full key is only shown once on creation
  return c.json({
    id,
    name: parsed.data.name,
    key, // ← only returned once, never again
    keyPrefix: prefix,
    scopes: parsed.data.scopes,
  });
});

router.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace' }, 404);

  const db = drizzle(c.env.DB);
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(eq(apiKeys.id, c.req.param('id')), eq(apiKeys.workspaceId, wsId)));
  return c.json({ ok: true });
});

export default router;
