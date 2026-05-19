import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type QrCode } from '../api/client';
import { QrPreview, downloadSvg, downloadPng, buildQrSvgString } from '../components/QrPreview';
import { CopyButton } from '../components/CopyButton';

export function QrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [qr, setQr] = useState<QrCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function load() {
    if (!id) return;
    setLoading(true);
    api.getQr(id).then((r) => {
      setQr(r.qrCode);
      setDestinationUrl(r.qrCode.destinationUrl);
      setName(r.qrCode.name);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function save() {
    if (!qr) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await api.updateQr(qr.id, {
        name,
        destinationUrl,
        changeNote: 'Edited from dashboard',
      });
      setSuccess('Saved. New scans now redirect to the new destination.');
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function statusAction(act: 'pause' | 'resume' | 'revoke' | 'delete') {
    if (!qr) return;
    if (act === 'revoke' && !confirm('Permanently revoke this QR? Visitors will see a revoked page.')) return;
    if (act === 'delete' && !confirm('Delete this QR? It will be archived (soft delete).')) return;
    const fn = act === 'pause' ? api.pauseQr : act === 'resume' ? api.resumeQr : act === 'revoke' ? api.revokeQr : api.deleteQr;
    await fn(qr.id);
    if (act === 'delete') return navigate('/qr');
    load();
  }

  if (loading) return <div className="empty"><div className="spinner" /></div>;
  if (!qr) return <div className="card empty"><h3>QR code not found</h3><Link to="/qr">Back to all QRs</Link></div>;

  const design = (qr.designJson as any) || {};
  const svgString = buildQrSvgString(qr.shortUrl, design, 1024);

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/qr" style={{ fontSize: '0.85rem' }}>← Back to QR codes</Link>
          <h1 style={{ marginTop: 6 }}>{qr.name}</h1>
          <p className="subtle">
            <span className={`badge badge-${qr.status}`}>{qr.status}</span>
            &nbsp;&middot;&nbsp;{qr.scanCountTotal.toLocaleString()} scans
            &nbsp;&middot;&nbsp;created {new Date(qr.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="row">
          <Link to={`/qr/${qr.id}/design`} className="btn btn-secondary">Design</Link>
          <Link to={`/qr/${qr.id}/analytics`} className="btn btn-secondary">Analytics</Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div>
          <div className="card">
            <h2>Destination</h2>
            <p className="subtle" style={{ marginBottom: 14 }}>
              Change the destination at any time. The printed QR doesn't need to be regenerated — the same scan immediately routes to the new URL.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <div className="field">
              <label>QR name (private)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Destination URL</label>
              <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} />
              <span className="hint">Where visitors land when they scan.</span>
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <h2>Status controls</h2>
            <p className="subtle">Pausing shows a friendly "this QR is paused" page. Revoking is permanent.</p>
            <div className="row" style={{ marginTop: 8 }}>
              {qr.status === 'active' && <button className="btn btn-secondary" onClick={() => statusAction('pause')}>Pause</button>}
              {qr.status === 'paused' && <button className="btn btn-secondary" onClick={() => statusAction('resume')}>Resume</button>}
              {qr.status !== 'revoked' && <button className="btn btn-secondary" onClick={() => statusAction('revoke')}>Revoke</button>}
              <button className="btn btn-danger" onClick={() => statusAction('delete')}>Delete</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              QR preview
            </h3>
            <QrPreview data={qr.shortUrl} design={design} />
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <div className="copy-row" style={{ marginBottom: 10 }}>
                {qr.shortUrl}
                <CopyButton value={qr.shortUrl} />
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <button className="btn btn-sm btn-secondary" onClick={() => downloadSvg(`${qr.name}.svg`, svgString)}>Download SVG</button>
                <button className="btn btn-sm btn-secondary" onClick={() => downloadPng(`${qr.name}.png`, svgString, 1024)}>Download PNG</button>
                <a className="btn btn-sm btn-secondary" href={api.qrRenderUrl(qr.id, 'svg', 2048)} target="_blank" rel="noreferrer">High-res</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
