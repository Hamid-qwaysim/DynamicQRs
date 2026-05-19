const PLANS = [
  { name: 'Free', price: '$0', limit: '3 QR codes · 500 scans/mo', current: true },
  { name: 'Starter', price: '$12/mo', limit: '25 QR codes · 10K scans/mo', current: false },
  { name: 'Pro', price: '$39/mo', limit: '250 QR codes · 250K scans · smart redirects · custom domain', current: false },
  { name: 'Agency', price: '$129/mo', limit: '2,000 QR codes · 2M scans · API · white-label', current: false },
];

export function BillingPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Billing</h1>
          <p className="subtle">Manage your plan and view usage. Payment integration coming soon.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Current plan: Free</h3>
        <p className="subtle">Upgrade anytime to unlock more QR codes, smart redirects, and a custom domain.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {PLANS.map((p) => (
          <div key={p.name} className="card" style={{ borderColor: p.current ? 'var(--brand)' : 'var(--border)' }}>
            <h3>{p.name}</h3>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, margin: '8px 0', letterSpacing: '-0.02em' }}>{p.price}</div>
            <p className="subtle" style={{ minHeight: 60 }}>{p.limit}</p>
            {p.current ? (
              <div className="badge badge-active">Your plan</div>
            ) : (
              <button className="btn btn-secondary" disabled>Coming soon</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
