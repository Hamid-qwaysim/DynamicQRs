import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { events } from '../lib/analytics';

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  hasStripe?: boolean;
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    bullets: ['3 dynamic QRs', '500 scans/month', 'PNG download', '30-day analytics', 'No watermark'],
  },
  {
    id: 'starter' as const,
    name: 'Starter',
    price: '$12',
    period: '/month',
    bullets: ['25 dynamic QRs', '10K scans/month', 'PNG, SVG, PDF', '90-day analytics', 'Folders & campaigns'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$39',
    period: '/month',
    bullets: ['250 dynamic QRs', '250K scans/month', 'Smart redirects', 'Custom domain', 'Landing pages', 'Bulk CSV'],
    popular: true,
  },
  {
    id: 'agency' as const,
    name: 'Agency',
    price: '$129',
    period: '/month',
    bullets: ['2,000 dynamic QRs', '2M scans/month', 'Team workspaces', 'White-label reports', 'Full REST API', 'Multiple domains'],
  },
];

export function BillingPage() {
  const [params] = useSearchParams();
  const upgradeStatus = params.get('upgrade');
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    api.getSubscription().then(setSub).finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    if (upgradeStatus === 'success') {
      events.upgradeCompleted(sub?.plan || 'unknown');
      // Sync from Stripe in case webhook was slow
      api.syncSubscription().catch(() => {}).finally(reload);
    }
  }, [upgradeStatus]);

  async function upgrade(plan: 'starter' | 'pro' | 'agency') {
    setError(null);
    setBusy(plan);
    events.upgradeStarted(plan);
    try {
      const res = await api.createCheckout(plan);
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout');
      setBusy(null);
    }
  }

  async function manage() {
    setError(null);
    setBusy('manage');
    try {
      const res = await api.openBillingPortal();
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not open billing portal');
      setBusy(null);
    }
  }

  const currentPlan = sub?.plan || 'free';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <p className="subtle">Manage your plan and payment methods. Powered by Stripe — your card details never touch our servers.</p>
        </div>
        {sub?.hasStripe && (
          <button className="btn btn-secondary" onClick={manage} disabled={busy === 'manage'}>
            {busy === 'manage' ? 'Opening…' : 'Manage billing'}
          </button>
        )}
      </div>

      {upgradeStatus === 'success' && (
        <div className="alert alert-success">🎉 Welcome to your new plan! Your account has been upgraded.</div>
      )}
      {upgradeStatus === 'cancel' && (
        <div className="alert alert-info">Checkout cancelled. No changes to your plan.</div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && sub && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3 style={{ marginTop: 0 }}>
            Current plan: <span style={{ textTransform: 'capitalize' }}>{currentPlan}</span>{' '}
            {sub.status && sub.status !== 'no_subscription' && (
              <span className={`badge badge-${sub.status === 'active' ? 'active' : 'paused'}`} style={{ marginLeft: 8 }}>
                {sub.status}
              </span>
            )}
          </h3>
          {sub.currentPeriodEnd && (
            <p className="subtle">
              {sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
              {new Date(sub.currentPeriodEnd * 1000).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                borderColor: p.popular ? 'var(--brand)' : isCurrent ? 'var(--accent)' : 'var(--border)',
                position: 'relative',
              }}
            >
              {p.popular && (
                <span style={{ position: 'absolute', top: -10, right: 16, background: 'var(--brand)', color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Popular
                </span>
              )}
              <h3>{p.name}</h3>
              <div style={{ fontSize: '1.7rem', fontWeight: 800, margin: '8px 0', letterSpacing: '-0.02em' }}>
                {p.price}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}> {p.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 140 }}>
                {p.bullets.map((b) => (
                  <li key={b} style={{ fontSize: '0.85rem', color: 'var(--text-soft)', paddingLeft: 18, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 0, color: 'var(--accent)', fontWeight: 700 }}>✓</span> {b}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <div className="badge badge-active" style={{ width: '100%', justifyContent: 'center', padding: 8 }}>Current plan</div>
              ) : p.id === 'free' ? (
                <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} disabled>
                  Downgrade in portal
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => upgrade(p.id as 'starter' | 'pro' | 'agency')}
                  disabled={busy === p.id}
                >
                  {busy === p.id ? 'Loading…' : currentPlan === 'free' ? 'Choose plan' : 'Switch to ' + p.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Need a custom plan?</h3>
        <p className="subtle">Enterprise plans include SSO, audit logs, dedicated SLA, and custom scan/QR limits.</p>
        <a href="https://dynamicqrcodelabs.com/contact/" className="btn btn-secondary">Talk to sales</a>
      </div>
    </div>
  );
}
