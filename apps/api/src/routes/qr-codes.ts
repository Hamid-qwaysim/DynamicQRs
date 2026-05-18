import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  qrCodes,
  qrVersions,
  workspaces,
  workspaceMembers,
  scanEvents,
} from '../db/schema';
import { generateId, generateShortCode } from '../lib/crypto';
import { validateDestinationUrl } from '../lib/url-validator';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

router.use('*', requireAuth);

const QR_TYPES = [
  'url',
  'multilink',
  'pdf',
  'menu',
  'vcard',
  'whatsapp',
  'email',
  'sms',
  'phone',
  'wifi',
  'location',
  'event',
  'app',
  'social',
  'payment',
  'coupon',
  'feedback',
  'review',
  'video',
  'gallery',
  'html',
  'text',
] as const;

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(QR_TYPES).default('url'),
  destinationUrl: z.string().min(1).max(2048),
  campaignId: z.string().optional(),
  fallbackUrl: z.string().max(2048).optional(),
  customSlug: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{3,32}$/, 'Slug must be 3-32 alphanumeric chars')
    .optional(),
  designJson: z.record(z.unknown()).optional(),
  redirectRulesJson: z.array(z.unknown()).optional(),
  expiresAt: z.string().datetime().optional(),
  scanLimit: z.number().int().positive().optional(),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  destinationUrl: z.string().min(1).max(2048).optional(),
  fallbackUrl: z.string().max(2048).optional().nullable(),
  status: z.enum(['active', 'paused', 'revoked', 'archived']).optional(),
  designJson: z.record(z.unknown()).optional(),
  redirectRulesJson: z.array(z.unknown()).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  scanLimit: z.number().int().positive().optional().nullable(),
  campaignId: z.string().optional().nullable(),
  changeNote: z.string().max(280).optional(),
});

async function getDefaultWorkspaceId(env: Env, userId: string): Promise<string | null> {
  const db = drizzle(env.DB);
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt)
    .limit(1);
  return rows[0]?.id ?? null;
}

async function userCanAccessQr(
  env: Env,
  userId: string,
  qrId: string,
): Promise<{ allowed: boolean; role: string | null }> {
  const db = drizzle(env.DB);
  const rows = await db
    .select({ role: workspaceMembers.role })
    .from(qrCodes)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, qrCodes.workspaceId))
    .where(and(eq(qrCodes.id, qrId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  if (rows.length === 0) return { allowed: false, role: null };
  return { allowed: true, role: rows[0].role };
}

router.get('/', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ qrCodes: [] });

  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.workspaceId, wsId))
    .orderBy(desc(qrCodes.createdAt))
    .limit(100);

  return c.json({
    qrCodes: rows.map((r) => ({
      ...r,
      designJson: r.designJson ? JSON.parse(r.designJson) : null,
      redirectRulesJson: r.redirectRulesJson ? JSON.parse(r.redirectRulesJson) : null,
      shortUrl: `${c.env.SHORT_LINK_BASE}/${r.shortCode}`,
    })),
  });
});

router.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      400,
    );
  }
  const data = parsed.data;

  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace found.' }, 404);

  const validation = validateDestinationUrl(data.destinationUrl);
  if (!validation.ok) {
    return c.json({ error: validation.error }, 400);
  }
  const destinationUrl = validation.url!;

  const db = drizzle(c.env.DB);

  let shortCode: string;
  if (data.customSlug) {
    shortCode = data.customSlug;
    const exists = await db
      .select({ id: qrCodes.id })
      .from(qrCodes)
      .where(eq(qrCodes.shortCode, shortCode))
      .limit(1);
    if (exists.length > 0) {
      return c.json({ error: 'That short link is already taken.' }, 409);
    }
  } else {
    for (let i = 0; i < 5; i++) {
      shortCode = generateShortCode(7);
      const exists = await db
        .select({ id: qrCodes.id })
        .from(qrCodes)
        .where(eq(qrCodes.shortCode, shortCode))
        .limit(1);
      if (exists.length === 0) break;
      shortCode = '';
    }
    if (!shortCode!) {
      return c.json({ error: 'Could not generate a unique short code.' }, 500);
    }
  }

  const id = generateId('qr');
  await db.insert(qrCodes).values({
    id,
    workspaceId: wsId,
    campaignId: data.campaignId ?? null,
    name: data.name,
    shortCode: shortCode!,
    type: data.type,
    status: 'active',
    destinationUrl,
    fallbackUrl: data.fallbackUrl ?? null,
    designJson: data.designJson ? JSON.stringify(data.designJson) : null,
    redirectRulesJson: data.redirectRulesJson
      ? JSON.stringify(data.redirectRulesJson)
      : null,
    expiresAt: data.expiresAt ?? null,
    scanLimit: data.scanLimit ?? null,
    createdBy: user.id,
  });

  await db.insert(qrVersions).values({
    id: generateId('ver'),
    qrCodeId: id,
    versionNumber: 1,
    destinationUrl,
    designJson: data.designJson ? JSON.stringify(data.designJson) : null,
    redirectRulesJson: data.redirectRulesJson
      ? JSON.stringify(data.redirectRulesJson)
      : null,
    changeNote: 'Initial creation',
    createdBy: user.id,
  });

  return c.json({
    qrCode: {
      id,
      shortCode,
      shortUrl: `${c.env.SHORT_LINK_BASE}/${shortCode}`,
      name: data.name,
      type: data.type,
      destinationUrl,
      status: 'active',
    },
  });
});

router.get('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);

  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.id, id))
    .limit(1);
  if (rows.length === 0) return c.json({ error: 'Not found' }, 404);
  const r = rows[0];
  return c.json({
    qrCode: {
      ...r,
      designJson: r.designJson ? JSON.parse(r.designJson) : null,
      redirectRulesJson: r.redirectRulesJson ? JSON.parse(r.redirectRulesJson) : null,
      shortUrl: `${c.env.SHORT_LINK_BASE}/${r.shortCode}`,
    },
  });
});

router.patch('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);
  if (access.role === 'viewer') {
    return c.json({ error: 'Viewers cannot edit QR codes.' }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input' },
      400,
    );
  }
  const data = parsed.data;

  const update: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.name !== undefined) update.name = data.name;
  if (data.status !== undefined) update.status = data.status;
  if (data.fallbackUrl !== undefined) update.fallbackUrl = data.fallbackUrl;
  if (data.expiresAt !== undefined) update.expiresAt = data.expiresAt;
  if (data.scanLimit !== undefined) update.scanLimit = data.scanLimit;
  if (data.campaignId !== undefined) update.campaignId = data.campaignId;

  if (data.destinationUrl !== undefined) {
    const validation = validateDestinationUrl(data.destinationUrl);
    if (!validation.ok) return c.json({ error: validation.error }, 400);
    update.destinationUrl = validation.url!;
  }
  if (data.designJson !== undefined) {
    update.designJson = JSON.stringify(data.designJson);
  }
  if (data.redirectRulesJson !== undefined) {
    update.redirectRulesJson = JSON.stringify(data.redirectRulesJson);
  }

  const db = drizzle(c.env.DB);
  await db.update(qrCodes).set(update).where(eq(qrCodes.id, id));

  if (
    data.destinationUrl !== undefined ||
    data.designJson !== undefined ||
    data.redirectRulesJson !== undefined
  ) {
    const current = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.id, id))
      .limit(1);
    if (current.length > 0) {
      const versionRows = await db
        .select({ count: sql<number>`count(*)`.as('count') })
        .from(qrVersions)
        .where(eq(qrVersions.qrCodeId, id));
      const nextVersion = (versionRows[0]?.count ?? 0) + 1;
      await db.insert(qrVersions).values({
        id: generateId('ver'),
        qrCodeId: id,
        versionNumber: nextVersion,
        destinationUrl: current[0].destinationUrl,
        designJson: current[0].designJson,
        redirectRulesJson: current[0].redirectRulesJson,
        changeNote: data.changeNote ?? null,
        createdBy: user.id,
      });
    }
  }

  return c.json({ ok: true });
});

router.post('/:id/pause', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);
  if (access.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);
  const db = drizzle(c.env.DB);
  await db.update(qrCodes).set({ status: 'paused' }).where(eq(qrCodes.id, id));
  return c.json({ ok: true });
});

router.post('/:id/resume', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);
  if (access.role === 'viewer') return c.json({ error: 'Forbidden' }, 403);
  const db = drizzle(c.env.DB);
  await db.update(qrCodes).set({ status: 'active' }).where(eq(qrCodes.id, id));
  return c.json({ ok: true });
});

router.post('/:id/revoke', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);
  if (access.role !== 'owner' && access.role !== 'admin') {
    return c.json({ error: 'Only owners and admins can revoke.' }, 403);
  }
  const db = drizzle(c.env.DB);
  await db.update(qrCodes).set({ status: 'revoked' }).where(eq(qrCodes.id, id));
  return c.json({ ok: true });
});

router.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);
  if (access.role !== 'owner' && access.role !== 'admin') {
    return c.json({ error: 'Only owners and admins can delete.' }, 403);
  }
  const db = drizzle(c.env.DB);
  await db
    .update(qrCodes)
    .set({ deletedAt: new Date().toISOString(), status: 'archived' })
    .where(eq(qrCodes.id, id));
  return c.json({ ok: true });
});

router.get('/:id/analytics', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const access = await userCanAccessQr(c.env, user.id, id);
  if (!access.allowed) return c.json({ error: 'Not found' }, 404);

  const db = drizzle(c.env.DB);

  const totals = await db
    .select({
      total: sql<number>`count(*)`.as('total'),
      bots: sql<number>`sum(case when ${scanEvents.isBot} = 1 then 1 else 0 end)`.as('bots'),
    })
    .from(scanEvents)
    .where(eq(scanEvents.qrCodeId, id));

  const recent = await db
    .select()
    .from(scanEvents)
    .where(eq(scanEvents.qrCodeId, id))
    .orderBy(desc(scanEvents.timestamp))
    .limit(50);

  const byCountry = await db
    .select({
      country: scanEvents.country,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(scanEvents)
    .where(eq(scanEvents.qrCodeId, id))
    .groupBy(scanEvents.country)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const byDevice = await db
    .select({
      device: scanEvents.deviceType,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(scanEvents)
    .where(eq(scanEvents.qrCodeId, id))
    .groupBy(scanEvents.deviceType)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return c.json({
    totals: {
      total: totals[0]?.total ?? 0,
      bots: totals[0]?.bots ?? 0,
    },
    recentScans: recent,
    byCountry,
    byDevice,
  });
});

export default router;
