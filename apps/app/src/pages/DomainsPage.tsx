import { useEffect, useState } from 'react';
import { api, type CustomDomain, ApiError } from '../api/client';
import { CopyButton } from '../components/CopyButton';

export function DomainsPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<{ domain: string; instructions: string[] } | null>(null);

  function reload() {
    setLoading(true);
    api.listDomains().then((r) => setDomains(r.domains)).finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function add() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.addDomain(newDomain.trim());
      setInstructions({ domain: res.domain.domain, instructions: res.domain.instructions });
      setNewDomain('');
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to add domain');
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(id: string) {
    try {
      const res = await api.verifyDomain(id);
      if (!res.verified) {
        alert(`Not verified yet. Resolved: ${res.resolvedTarget || '(none)'}`);
      } else {
        alert('Verified!');
      }
      reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : 'Verify failed');
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this custom domain? Existing QR codes using it will fall back to the platform domain.')) return;
    await api.deleteDomain(id);
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Custom domains</h1>
          <p className="subtle">Use your brand's domain for QR short links. Available on Pro and above.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Add a custom domain</h3>
        <p className="subtle">Example: <code>qr.yourbrand.com</code></p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="row">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="qr.yourbrand.com"
            style={{ maxWidth: 360 }}
          />
          <button className="btn btn-primary" onClick={add} disabled={submitting || !newDomain}>
            {submitting ? 'Adding…' : 'Add domain'}
          </button>
        </div>
      </div>

      {instructions && (
        <div className="card alert alert-info" style={{ marginBottom: 18, padding: 18 }}>
          <h3 style={{ color: 'var(--brand)' }}>Verify {instructions.domain}</h3>
          {instructions.instructions.map((l, i) => (
            <div key={i} style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }}>{l}</div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : domains.length === 0 ? (
        <div className="card empty">
          <h3>No custom domains yet</h3>
          <p>Add a custom domain above to get branded short links.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>DNS target</th>
                <th>SSL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.domain}</strong></td>
                  <td><span className={`badge badge-${d.status === 'verified' ? 'active' : d.status === 'failed' ? 'revoked' : 'paused'}`}>{d.status}</span></td>
                  <td className="copy-row" style={{ fontSize: '0.85rem' }}>{d.dnsTarget}<CopyButton value={d.dnsTarget} /></td>
                  <td><span className="badge badge-neutral">{d.sslStatus}</span></td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {d.status !== 'verified' && <button className="btn btn-sm btn-secondary" onClick={() => verify(d.id)}>Verify</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => remove(d.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
