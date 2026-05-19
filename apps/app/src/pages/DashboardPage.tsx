import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type QrCode } from '../api/client';
import { useAuth } from '../hooks/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listQrCodes()
      .then((r) => setQrs(r.qrCodes))
      .finally(() => setLoading(false));
  }, []);

  const totalScans = qrs.reduce((s, q) => s + (q.scanCountTotal || 0), 0);
  const active = qrs.filter((q) => q.status === 'active').length;
  const paused = qrs.filter((q) => q.status === 'paused').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user?.name.split(' ')[0]}</h1>
          <p className="subtle">Here's an overview of your QR codes and recent activity.</p>
        </div>
        <Link to="/qr/new" className="btn btn-primary">+ Create QR code</Link>
      </div>

      {user && !user.emailVerified && (
        <div className="alert alert-warn">
          Please verify your email address to unlock all features.{' '}
          <button
            className="btn btn-sm btn-ghost"
            style={{ padding: 0, color: 'inherit', textDecoration: 'underline' }}
            onClick={() => api.sendVerificationEmail().then((r) => alert(r.devToken ? 'Dev token: ' + r.devToken : 'Verification email sent'))}
          >
            Resend verification
          </button>
        </div>
      )}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Total QR codes</div>
          <div className="stat-value">{loading ? '—' : qrs.length}</div>
          <div className="stat-delta">{active} active · {paused} paused</div>
        </div>
        <div className="stat">
          <div className="stat-label">Total scans</div>
          <div className="stat-value">{loading ? '—' : totalScans.toLocaleString()}</div>
          <div className="stat-delta">all time</div>
        </div>
        <div className="stat">
          <div className="stat-label">Plan</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>Free</div>
          <div className="stat-delta">3 QRs · 500 scans/mo</div>
        </div>
        <div className="stat">
          <div className="stat-label">Account status</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}</div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Recent QR codes</h2>
          <Link to="/qr">View all →</Link>
        </div>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : qrs.length === 0 ? (
          <div className="empty">
            <h3>No QR codes yet</h3>
            <p>Create your first dynamic QR code in under a minute.</p>
            <Link to="/qr/new" className="btn btn-primary" style={{ marginTop: 12 }}>Create QR code</Link>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Scans</th>
                  <th>Short URL</th>
                </tr>
              </thead>
              <tbody>
                {qrs.slice(0, 5).map((qr) => (
                  <tr key={qr.id} style={{ cursor: 'pointer' }} onClick={() => (window.location.href = `/qr/${qr.id}`)}>
                    <td><strong>{qr.name}</strong></td>
                    <td>{qr.type}</td>
                    <td><span className={`badge badge-${qr.status}`}>{qr.status}</span></td>
                    <td>{qr.scanCountTotal.toLocaleString()}</td>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{qr.shortCode}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
