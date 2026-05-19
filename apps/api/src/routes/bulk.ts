import { Hono } from 'hono';
import { z } from 'zod';
import { and, desc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import {
  bulkJobs,
  qrCodes,
  qrVersions,
  workspaces,
  workspaceMembers,
} from '../db/schema';
import { generateId, generateShortCode } from '../lib/crypto';
import { validateDestinationUrl } from '../lib/url-validator';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
router.use('*', requireAuth);

interface CsvRow {
  name: string;
  type: string;
  destinationUrl: string;
  campaign?: string;
  customSlug?: string;
  designJson?: string;
}

const submitSchema = z.object({
  rows: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        type: z.string().default('url'),
        destinationUrl: z.string().min(1).max(2048),
        campaign: z.string().optional(),
        customSlug: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{3,32}$/)
          .optional(),
        designJson: z.record(z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(10000),
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
  if (!wsId) return c.json({ jobs: [] });
  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(bulkJobs)
    .where(eq(bulkJobs.workspaceId, wsId))
    .orderBy(desc(bulkJobs.createdAt))
    .limit(20);
  return c.json({ jobs: rows });
});

router.get('/:id', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace' }, 404);
  const db = drizzle(c.env.DB);
  const rows = await db
    .select()
    .from(bulkJobs)
    .where(and(eq(bulkJobs.id, c.req.param('id')), eq(bulkJobs.workspaceId, wsId)))
    .limit(1);
  if (rows.length === 0) return c.json({ error: 'Not found' }, 404);
  const job = rows[0];
  return c.json({
    job: {
      ...job,
      resultJson: job.resultJson ? JSON.parse(job.resultJson) : null,
      errorJson: job.errorJson ? JSON.parse(job.errorJson) : null,
    },
  });
});

router.post('/', async (c) => {
  const user = c.get('user')!;
  const wsId = await getDefaultWorkspaceId(c.env, user.id);
  if (!wsId) return c.json({ error: 'No workspace' }, 404);

  const body = await c.req.json().catch(() => ({}));
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }
  const rows = parsed.data.rows;

  const db = drizzle(c.env.DB);
  const jobId = generateId('bulk');
  await db.insert(bulkJobs).values({
    id: jobId,
    workspaceId: wsId,
    createdBy: user.id,
    status: 'running',
    totalRows: rows.length,
  });

  // Process synchronously - Workers have CPU limits but this should fit
  const results: Array<{
    row: number;
    name: string;
    success: boolean;
    shortCode?: string;
    shortUrl?: string;
    error?: string;
  }> = [];
  const errors: Array<{ row: number; error: string }> = [];

  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const validation = validateDestinationUrl(row.destinationUrl);
      if (!validation.ok) throw new Error(validation.error || 'Invalid URL');

      // Generate short code
      let shortCode = '';
      if (row.customSlug) {
        shortCode = row.customSlug;
        const ex = await db
          .select({ id: qrCodes.id })
          .from(qrCodes)
          .where(eq(qrCodes.shortCode, shortCode))
          .limit(1);
        if (ex.length > 0) throw new Error(`Slug "${shortCode}" is already taken`);
      } else {
        for (let attempt = 0; attempt < 5; attempt++) {
          shortCode = generateShortCode(7);
          const ex = await db
            .select({ id: qrCodes.id })
            .from(qrCodes)
            .where(eq(qrCodes.shortCode, shortCode))
            .limit(1);
          if (ex.length === 0) break;
          shortCode = '';
        }
        if (!shortCode) throw new Error('Could not generate unique short code');
      }

      const id = generateId('qr');
      await db.insert(qrCodes).values({
        id,
        workspaceId: wsId,
        name: row.name,
        shortCode,
        type: row.type as string,
        status: 'active',
        destinationUrl: validation.url!,
        designJson: row.designJson ? JSON.stringify(row.designJson) : null,
        createdBy: user.id,
      });
      await db.insert(qrVersions).values({
        id: generateId('ver'),
        qrCodeId: id,
        versionNumber: 1,
        destinationUrl: validation.url!,
        designJson: row.designJson ? JSON.stringify(row.designJson) : null,
        changeNote: 'Bulk import',
        createdBy: user.id,
      });

      results.push({
        row: i + 1,
        name: row.name,
        success: true,
        shortCode,
        shortUrl: `${c.env.SHORT_LINK_BASE}/${shortCode}`,
      });
      successCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ row: i + 1, name: row.name, success: false, error: msg });
      errors.push({ row: i + 1, error: msg });
      failedCount++;
    }
  }

  await db
    .update(bulkJobs)
    .set({
      status: 'completed',
      successCount,
      failedCount,
      resultJson: JSON.stringify(results),
      errorJson: errors.length > 0 ? JSON.stringify(errors) : null,
      completedAt: new Date().toISOString(),
    })
    .where(eq(bulkJobs.id, jobId));

  return c.json({ jobId, successCount, failedCount, results });
});

export default router;
