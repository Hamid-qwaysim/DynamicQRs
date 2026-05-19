import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type QrCode } from '../api/client';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  revoked: 'Revoked',
  archived: 'Archived',
};

export function QrCodesPage() {
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  function reload() {
    setLoading(true);
    api.listQrCodes().then((r) => setQrs(r.qrCodes)).finally(() => setLoading(false));
  }

  useEffect(reload, []);

  const filtered = qrs.filter((q) => {
    if (filter !== 'all' && q.status !== filter) return false;
    if (search && !q.name.toLowerCase().includes(search.toLowerCase()) && !q.shortCode.includes(search)) return false;
    return true;
  });

  async function action(qr: QrCode, act: 'pause' | 'resume' | 'revoke' | 'delete') {
    if (act === 'delete' && !confirm(`Delete "${qr.name}"? This is reversible from trash.`)) return;
    if (act === 'revoke' && !confirm(`Revoke "${qr.name}"? This permanently disables it.`)) return;
    const fn = act === 'pause' ? api.pauseQr : act === 'resume' ? api.resumeQr : act === 'revoke' ? api.revokeQr : api.deleteQr;
    await fn(qr.id);
    reload();
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>QR Codes</h1>
          <p className="subtle">{qrs.length} QR code{qrs.length === 1 ? '' : 's'} in this workspace</p>
        </div>
        <Link to="/qr/new" className="btn btn-primary">+ Create QR code</Link>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 14 }}>
        <div className="row">
          <input
            type="text"
            placeholder="Search by name or short code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 340 }}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="paused">Paused only</option>
            <option value="revoked">Revoked only</option>
            <option value="archived">Archived only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <h3>No QR codes found</h3>
          <p>{qrs.length === 0 ? 'Create your first QR code to get started.' : 'Try adjusting your filters.'}</p>
          {qrs.length === 0 && <Link to="/qr/new" className="btn btn-primary" style={{ marginTop: 12 }}>Create QR code</Link>}
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Scans</th>
                <th>Short URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((qr) => (
                <tr key={qr.id}>
                  <td>
                    <Link to={`/qr/${qr.id}`}><strong>{qr.name}</strong></Link>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Created {new Date(qr.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{qr.type}</span></td>
                  <td><span className={`badge badge-${qr.status}`}>{STATUS_LABELS[qr.status] ?? qr.status}</span></td>
                  <td>{qr.scanCountTotal.toLocaleString()}</td>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{qr.shortCode}</code>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      <Link to={`/qr/${qr.id}`} className="btn btn-sm btn-secondary">Edit</Link>
                      {qr.status === 'active' ? (
                        <button className="btn btn-sm btn-ghost" onClick={() => action(qr, 'pause')}>Pause</button>
                      ) : qr.status === 'paused' ? (
                        <button className="btn btn-sm btn-ghost" onClick={() => action(qr, 'resume')}>Resume</button>
                      ) : null}
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
