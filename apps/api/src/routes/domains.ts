import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { customDomains, workspaces, workspaceMembers } from '../db/schema';
import { generateId } from '../lib/crypto';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
router.use('*', requireAuth);

const addSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(253)
    .regex(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/, 'Invalid domain format'),
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

router.get('/', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ domains: [] });
  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.workspaceId, wsId))
    .orderBy(desc(customDomains.createdAt));
  return c.json({ domains: rows });
});

router.post('/', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }
  const { domain } = parsed.data;

  if (
    domain === 'dynamicqrcodelabs.com' ||
    domain.endsWith('.dynamicqrcodelabs.com') ||
    domain === 'qr.dynamicqrcodelabs.com'
  ) {
    return c.json({ error: 'This domain is reserved.' }, 400);
  }

  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace found.' }, 404);

  const db = drizzle(c.env.DB);
  const existing = await db
    .select()
    .from(customDomains)
    .where(eq(customDomains.domain, domain))
    .limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'Domain is already registered.' }, 409);
  }

  const id = generateId('cd');
  const verificationToken = 'dqrl-verify-' + Math.random().toString(36).slice(2, 10);

  await db.insert(customDomains).values({
    id,
    workspaceId: wsId,
    domain,
    status: 'pending',
    dnsTarget: 'qr.dynamicqrcodelabs.com',
    verificationToken,
    sslStatus: 'pending',
  });

  return c.json({
    domain: {
      id,
      domain,
      status: 'pending',
      dnsTarget: 'qr.dynamicqrcodelabs.com',
      verificationToken,
      sslStatus: 'pending',
      instructions: [
        `Add a CNAME record at your DNS provider:`,
        `  Name: ${domain.split('.')[0]}`,
        `  Target: qr.dynamicqrcodelabs.com`,
        `  TTL: 300 (or auto)`,
        `Then click Verify below. SSL provisions automatically after verification.`,
      ],
    },
  });
});

router.post('/:id/verify', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);

  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  const rows = await db
    .select()
    .from(customDomains)
    .where(and(eq(customDomains.id, id), eq(customDomains.workspaceId, wsId || '')))
    .limit(1);
  if (rows.length === 0) return c.json({ error: 'Not found' }, 404);
  const d = rows[0];

  // Attempt DNS verification by resolving the domain via DoH
  let verified = false;
  let resolvedTarget: string | null = null;
  try {
    const dnsResp = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(d.domain)}&type=CNAME`,
      { headers: { Accept: 'application/dns-json' } },
    );
    if (dnsResp.ok) {
      const json: { Answer?: Array<{ data: string }> } = await dnsResp.json();
      if (json.Answer) {
        for (const ans of json.Answer) {
          resolvedTarget = ans.data.replace(/\.$/, '');
          if (resolvedTarget === d.dnsTarget) {
            verified = true;
            break;
          }
        }
      }
    }
  } catch {}

  if (!verified) {
    return c.json(
      {
        verified: false,
        resolvedTarget,
        expectedTarget: d.dnsTarget,
        message:
          'DNS not pointing to the expected target. Make sure you added the CNAME record and DNS has propagated (can take up to 30 min).',
      },
      400,
    );
  }

  await db
    .update(customDomains)
    .set({ status: 'verified', verifiedAt: new Date().toISOString(), sslStatus: 'provisioning' })
    .where(eq(customDomains.id, id));

  return c.json({ verified: true });
});

router.delete('/:id', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  const db = drizzle(c.env.DB);
  await db
    .delete(customDomains)
    .where(and(eq(customDomains.id, id), eq(customDomains.workspaceId, wsId || '')));
  return c.json({ ok: true });
});

export default router;
