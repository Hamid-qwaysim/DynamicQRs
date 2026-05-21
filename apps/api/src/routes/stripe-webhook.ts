import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { workspaces } from '../db/schema';
import type { Env, Variables } from '../types';

const router = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * Stripe webhook handler.
 *
 * Verifies the Stripe-Signature header using the shared webhook secret,
 * then processes subscription lifecycle events to keep the workspace's
 * `plan`, `stripeCustomerId`, and `stripeSubscriptionId` in sync.
 *
 * Subscribe to these events in Stripe Dashboard → Webhooks:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 */

router.post('/', async (c) => {
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: 'webhook secret not configured' }, 500);
  }

  const sigHeader = c.req.header('stripe-signature');
  if (!sigHeader) return c.json({ error: 'no signature' }, 400);

  const rawBody = await c.req.text();
  const verified = await verifyStripeSignature(rawBody, sigHeader, secret);
  if (!verified) {
    return c.json({ error: 'signature verification failed' }, 400);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }

  const db = drizzle(c.env.DB);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const workspaceId = session.metadata?.workspace_id;
        if (!workspaceId) break;
        await db
          .update(workspaces)
          .set({
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
          })
          .where(eq(workspaces.id, workspaceId));
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspace_id;
        if (!workspaceId) break;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = matchPriceToPlan(c.env, priceId);
        const active = ['active', 'trialing', 'past_due'].includes(sub.status);
        await db
          .update(workspaces)
          .set({
            plan: active ? plan : 'free',
            stripeSubscriptionId: sub.id,
            stripeCustomerId: sub.customer,
          })
          .where(eq(workspaces.id, workspaceId));
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const workspaceId = sub.metadata?.workspace_id;
        if (!workspaceId) break;
        await db
          .update(workspaces)
          .set({ plan: 'free', stripeSubscriptionId: null })
          .where(eq(workspaces.id, workspaceId));
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        // Future: send a notification email to the workspace owner.
        break;

      default:
        // Unhandled but acknowledged
        break;
    }
  } catch (e) {
    console.error('webhook handler error:', e);
    // Return 200 so Stripe doesn't retry forever; logs capture the issue.
  }

  return c.json({ received: true });
});

function matchPriceToPlan(env: Env, priceId: string): 'starter' | 'pro' | 'agency' | 'free' {
  if (priceId === env.STRIPE_PRICE_STARTER) return 'starter';
  if (priceId === env.STRIPE_PRICE_PRO) return 'pro';
  if (priceId === env.STRIPE_PRICE_AGENCY) return 'agency';
  return 'free';
}

/**
 * Verify a Stripe webhook signature using HMAC-SHA-256 against the raw body.
 * Pure-Web Crypto, no Node dependencies.
 */
async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts = header.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;

  // Reject events older than 5 minutes (replay protection)
  const age = Date.now() / 1000 - Number(timestamp);
  if (Math.abs(age) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

export default router;
