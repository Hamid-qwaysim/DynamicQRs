import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { workspaces, workspaceMembers } from '../db/schema';
import { requireAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();
router.use('*', requireAuth);

/**
 * Stripe is called via REST API directly from the Worker (no SDK needed).
 * Requires three secrets set via `wrangler secret put`:
 *   STRIPE_SECRET_KEY      - sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET  - whsec_... (used in webhooks route)
 *   STRIPE_PRICE_STARTER   - price_... for the Starter plan
 *   STRIPE_PRICE_PRO       - price_... for the Pro plan
 *   STRIPE_PRICE_AGENCY    - price_... for the Agency plan
 */

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'pro', 'agency']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

async function stripeFetch(
  env: Env,
  path: string,
  init: { method?: string; body?: Record<string, string | number | undefined> } = {},
): Promise<any> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  let body: string | undefined;
  if (init.body) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(init.body)) {
      if (v !== undefined && v !== '') params.append(k, String(v));
    }
    body = params.toString();
  }
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: init.method || 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-12-18.acacia',
    },
    body,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Stripe ${res.status}: ${data?.error?.message || 'request failed'}`);
  }
  return data;
}

async function getOwnedWorkspace(env: Env, userId: string) {
  const db = drizzle(env.DB);
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      plan: workspaces.plan,
      stripeCustomerId: workspaces.stripeCustomerId,
      stripeSubscriptionId: workspaces.stripeSubscriptionId,
      role: workspaceMembers.role,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt)
    .limit(1);
  return rows[0] ?? null;
}

router.post('/checkout', async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, 400);
  }

  const ws = await getOwnedWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);
  if (ws.role !== 'owner') {
    return c.json({ error: 'Only the workspace owner can manage billing.' }, 403);
  }

  const priceMap = {
    starter: c.env.STRIPE_PRICE_STARTER,
    pro: c.env.STRIPE_PRICE_PRO,
    agency: c.env.STRIPE_PRICE_AGENCY,
  };
  const priceId = priceMap[parsed.data.plan];
  if (!priceId) {
    return c.json({ error: `No Stripe price configured for the ${parsed.data.plan} plan.` }, 500);
  }

  // Reuse existing Stripe customer if we have one
  let customerId = ws.stripeCustomerId;
  if (!customerId) {
    const customer = await stripeFetch(c.env, '/v1/customers', {
      body: {
        email: user.email,
        name: user.name,
        'metadata[workspace_id]': ws.id,
        'metadata[user_id]': user.id,
      },
    });
    customerId = customer.id;
    const db = drizzle(c.env.DB);
    await db
      .update(workspaces)
      .set({ stripeCustomerId: customerId })
      .where(eq(workspaces.id, ws.id));
  }

  const session = await stripeFetch(c.env, '/v1/checkout/sessions', {
    body: {
      mode: 'subscription',
      customer: customerId!,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      'subscription_data[metadata][workspace_id]': ws.id,
      success_url:
        parsed.data.successUrl ||
        `${c.env.PUBLIC_SITE_URL}/dashboard?upgrade=success&session={CHECKOUT_SESSION_ID}`,
      cancel_url:
        parsed.data.cancelUrl ||
        `${c.env.PUBLIC_SITE_URL}/dashboard?upgrade=cancel`,
      'metadata[workspace_id]': ws.id,
      allow_promotion_codes: 'true',
      'automatic_tax[enabled]': 'true',
    },
  });

  return c.json({ url: session.url, id: session.id });
});

router.post('/portal', async (c) => {
  const user = c.get('user')!;
  const ws = await getOwnedWorkspace(c.env, user.id);
  if (!ws || !ws.stripeCustomerId) {
    return c.json({ error: 'No active billing customer.' }, 404);
  }
  if (ws.role !== 'owner') {
    return c.json({ error: 'Only the workspace owner can manage billing.' }, 403);
  }

  const session = await stripeFetch(c.env, '/v1/billing_portal/sessions', {
    body: {
      customer: ws.stripeCustomerId,
      return_url: `${c.env.PUBLIC_SITE_URL}/dashboard/billing`,
    },
  });

  return c.json({ url: session.url });
});

router.get('/subscription', async (c) => {
  const user = c.get('user')!;
  const ws = await getOwnedWorkspace(c.env, user.id);
  if (!ws) return c.json({ error: 'No workspace' }, 404);

  if (!ws.stripeSubscriptionId) {
    return c.json({
      plan: ws.plan,
      status: 'no_subscription',
      hasStripe: !!ws.stripeCustomerId,
    });
  }

  try {
    const sub = await stripeFetch(c.env, `/v1/subscriptions/${ws.stripeSubscriptionId}`, {
      method: 'GET',
    });
    return c.json({
      plan: ws.plan,
      status: sub.status,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      priceId: sub.items.data[0]?.price?.id,
    });
  } catch (e) {
    return c.json({
      plan: ws.plan,
      status: 'unknown',
      error: e instanceof Error ? e.message : 'fetch failed',
    });
  }
});

/**
 * Webhook fallback: sync subscription state from Stripe directly. Useful
 * when a webhook is missed (transient outage, signature failure) or during
 * local development without webhook forwarding. Can be triggered manually
 * from the billing page or run periodically via a Cron Trigger.
 */
router.post('/sync', async (c) => {
  const user = c.get('user')!;
  const ws = await getOwnedWorkspace(c.env, user.id);
  if (!ws || !ws.stripeCustomerId) return c.json({ synced: false });

  const db = drizzle(c.env.DB);
  const subs = await stripeFetch(
    c.env,
    `/v1/subscriptions?customer=${ws.stripeCustomerId}&status=all&limit=1`,
    { method: 'GET' },
  );
  const sub = subs.data?.[0];
  if (!sub) {
    await db
      .update(workspaces)
      .set({ plan: 'free', stripeSubscriptionId: null })
      .where(eq(workspaces.id, ws.id));
    return c.json({ synced: true, plan: 'free' });
  }

  const priceId: string = sub.items?.data?.[0]?.price?.id || '';
  const plan = matchPriceToPlan(c.env, priceId);
  const active = ['active', 'trialing', 'past_due'].includes(sub.status);

  await db
    .update(workspaces)
    .set({
      plan: active ? plan : 'free',
      stripeSubscriptionId: sub.id,
    })
    .where(eq(workspaces.id, ws.id));

  return c.json({ synced: true, plan: active ? plan : 'free', status: sub.status });
});

function matchPriceToPlan(env: Env, priceId: string): 'starter' | 'pro' | 'agency' | 'free' {
  if (priceId === env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === env.STRIPE_PRICE_AGENCY) return 'agency';
  return 'free';
}

export default router;
