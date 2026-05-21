import { useEffect, useState } from 'react';
import { api, ApiError, type ApiKey } from '../api/client';
import { CopyButton } from '../components/CopyButton';

const SCOPES = [
  { value: 'qr:read', label: 'qr:read - List and view QR codes' },
  { value: 'qr:write', label: 'qr:write - Create and edit QR codes' },
  { value: 'analytics:read', label: 'analytics:read - View scan analytics' },
  { value: 'domains:read', label: 'domains:read - View custom domains' },
] as const;

export function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['qr:read', 'qr:write', 'analytics:read']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    api.listApiKeys().then((r) => setKeys(r.keys)).finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function create() {
    setError(null);
    setCreating(true);
    try {
      const res = await api.createApiKey(name, selectedScopes);
      setNewKey(res.key);
      setName('');
      setShowCreate(false);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this API key? Any service using it will stop working.')) return;
    await api.revokeApiKey(id);
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>API Keys</h1>
          <p className="subtle">Programmatic access to your QR codes. Each key works as a Bearer token in the Authorization header.</p>
        </div>
        {!showCreate && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create API key</button>
        )}
      </div>

      {newKey && (
        <div className="card alert alert-warn" style={{ marginBottom: 18, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>⚠ Save this key now</h3>
          <p>This is the only time you'll see the full key. Store it securely (e.g., a password manager or your service's secret manager).</p>
          <div className="copy-row" style={{ fontSize: '0.9rem', display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <code style={{ background: '#fff', padding: '8px 12px', borderRadius: 6, flex: 1, wordBreak: 'break-all' }}>{newKey}</code>
            <CopyButton value={newKey} />
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={() => setNewKey(null)}>Done</button>
        </div>
      )}

      {showCreate && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Create new API key</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production server" />
          </div>
          <div className="field">
            <label>Scopes</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SCOPES.map((s) => (
                <label key={s.value} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400, padding: '6px 10px', background: 'var(--bg)', borderRadius: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(s.value)}
                    onChange={(e) => {
                      setSelectedScopes(
                        e.target.checked
                          ? [...selectedScopes, s.value]
                          : selectedScopes.filter((x) => x !== s.value),
                      );
                    }}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="row">
            <button className="btn btn-primary" onClick={create} disabled={creating || !name}>
              {creating ? 'Creating…' : 'Create key'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowCreate(false); setError(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Quick start</h3>
        <p className="subtle">Authenticate API requests with your key as a Bearer token:</p>
        <pre style={{ background: 'var(--bg)', padding: 14, borderRadius: 8, fontSize: '0.85rem', overflow: 'auto' }}>
          <code>{`curl https://qr.dynamicqrcodelabs.com/api/qr-codes \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</code>
        </pre>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : keys.length === 0 ? (
        <div className="card empty">
          <h3>No API keys yet</h3>
          <p>Create your first API key to start using the API.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id}>
                  <td><strong>{k.name}</strong></td>
                  <td><code style={{ fontSize: '0.8rem' }}>{k.keyPrefix}...</code></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-soft)' }}>{k.scopes}</td>
                  <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                  <td>
                    {k.revokedAt
                      ? <span className="badge badge-revoked">Revoked</span>
                      : <span className="badge badge-active">Active</span>}
                  </td>
                  <td>
                    {!k.revokedAt && (
                      <button className="btn btn-sm btn-ghost" onClick={() => revoke(k.id)}>Revoke</button>
                    )}
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
