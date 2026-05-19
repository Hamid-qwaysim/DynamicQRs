import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type QrCode } from '../api/client';
import { QrPreview, type QrDesign } from '../components/QrPreview';

const DEFAULT_DESIGN: QrDesign = {
  foregroundColor: '#0a0e27',
  backgroundColor: '#ffffff',
  eyeStyle: 'rounded',
  dotStyle: 'rounded',
  errorCorrection: 'H',
  margin: 4,
};

const PRESETS: Array<{ name: string; design: QrDesign }> = [
  { name: 'Classic black', design: { foregroundColor: '#000000', backgroundColor: '#ffffff', eyeStyle: 'square', dotStyle: 'square', errorCorrection: 'H', margin: 4 } },
  { name: 'Brand navy', design: { foregroundColor: '#0a0e27', backgroundColor: '#ffffff', eyeStyle: 'rounded', dotStyle: 'rounded', errorCorrection: 'H', margin: 4 } },
  { name: 'Electric blue', design: { foregroundColor: '#2540ff', backgroundColor: '#ffffff', eyeStyle: 'rounded', dotStyle: 'rounded', errorCorrection: 'H', margin: 4 } },
  { name: 'Reversed', design: { foregroundColor: '#ffffff', backgroundColor: '#0a0e27', eyeStyle: 'rounded', dotStyle: 'rounded', errorCorrection: 'H', margin: 4 } },
  { name: 'Forest green', design: { foregroundColor: '#15803d', backgroundColor: '#ffffff', eyeStyle: 'rounded', dotStyle: 'rounded', errorCorrection: 'H', margin: 4 } },
  { name: 'Deep red', design: { foregroundColor: '#a00000', backgroundColor: '#ffffff', eyeStyle: 'circle', dotStyle: 'circle', errorCorrection: 'H', margin: 4 } },
];

export function QrDesignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [qr, setQr] = useState<QrCode | null>(null);
  const [design, setDesign] = useState<QrDesign>(DEFAULT_DESIGN);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getQr(id).then((r) => {
      setQr(r.qrCode);
      setDesign({ ...DEFAULT_DESIGN, ...(r.qrCode.designJson as QrDesign) });
    });
  }, [id]);

  async function save() {
    if (!qr) return;
    setSaving(true);
    setSuccess(null);
    try {
      await api.updateQr(qr.id, { designJson: design as any, changeNote: 'Design updated' });
      setSuccess('Design saved.');
      setTimeout(() => setSuccess(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (!qr) return <div className="empty"><div className="spinner" /></div>;

  // Scannability hints
  const fg = parseInt((design.foregroundColor || '#000').replace('#', ''), 16);
  const bg = parseInt((design.backgroundColor || '#fff').replace('#', ''), 16);
  const fgLuma = relativeLuminance(fg);
  const bgLuma = relativeLuminance(bg);
  const contrast = (Math.max(fgLuma, bgLuma) + 0.05) / (Math.min(fgLuma, bgLuma) + 0.05);
  const contrastWarn = contrast < 4;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/qr/${qr.id}`} style={{ fontSize: '0.85rem' }}>← Back to {qr.name}</Link>
          <h1 style={{ marginTop: 6 }}>Design studio</h1>
          <p className="subtle">Make this QR look like your brand. Changes save instantly to future downloads.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        <div>
          <div className="card" style={{ marginBottom: 18 }}>
            <h3>Quick presets</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  className="type-card"
                  onClick={() => setDesign(p.design)}
                  style={{ background: 'transparent', border: '1px solid var(--border)', padding: 10, cursor: 'pointer' }}
                >
                  <div style={{ width: 56, height: 56, margin: '0 auto 8px', borderRadius: 6, background: p.design.backgroundColor, padding: 4 }}>
                    <div style={{ width: '100%', height: '100%', background: `repeating-linear-gradient(45deg, ${p.design.foregroundColor}, ${p.design.foregroundColor} 4px, transparent 4px, transparent 8px)`, borderRadius: 4 }} />
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3>Customize</h3>
            <div className="design-grid">
              <div className="field">
                <label>Foreground color</label>
                <input type="color" value={design.foregroundColor || '#000'} onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })} />
              </div>
              <div className="field">
                <label>Background color</label>
                <input type="color" value={design.backgroundColor || '#fff'} onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })} />
              </div>
              <div className="field">
                <label>Eye style</label>
                <select value={design.eyeStyle} onChange={(e) => setDesign({ ...design, eyeStyle: e.target.value as any })}>
                  <option value="square">Square</option>
                  <option value="rounded">Rounded</option>
                  <option value="circle">Circle</option>
                </select>
              </div>
              <div className="field">
                <label>Eye color (optional)</label>
                <input type="color" value={design.eyeColor || design.foregroundColor || '#000'} onChange={(e) => setDesign({ ...design, eyeColor: e.target.value })} />
              </div>
              <div className="field">
                <label>Dot style</label>
                <select value={design.dotStyle} onChange={(e) => setDesign({ ...design, dotStyle: e.target.value as any })}>
                  <option value="square">Square</option>
                  <option value="rounded">Rounded</option>
                  <option value="circle">Circle</option>
                </select>
              </div>
              <div className="field">
                <label>Error correction</label>
                <select value={design.errorCorrection} onChange={(e) => setDesign({ ...design, errorCorrection: e.target.value as any })}>
                  <option value="L">Low (~7%)</option>
                  <option value="M">Medium (~15%)</option>
                  <option value="Q">Quartile (~25%)</option>
                  <option value="H">High (~30%)</option>
                </select>
              </div>
              <div className="field" style={{ gridColumn: '1 / -1' }}>
                <label>Logo URL (PNG/SVG with transparent background)</label>
                <input
                  type="url"
                  placeholder="https://yourbrand.com/logo.png"
                  value={design.logoUrl || ''}
                  onChange={(e) => setDesign({ ...design, logoUrl: e.target.value || null })}
                />
              </div>
              {design.logoUrl && (
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Logo size: {Math.round((design.logoSize ?? 0.2) * 100)}%</label>
                  <input
                    type="range"
                    min={0.1}
                    max={0.3}
                    step={0.01}
                    value={design.logoSize ?? 0.2}
                    onChange={(e) => setDesign({ ...design, logoSize: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            {contrastWarn && (
              <div className="alert alert-warn" style={{ marginTop: 14 }}>
                ⚠ Low contrast ({contrast.toFixed(1)}:1). Aim for 4:1 or higher to ensure reliable scanning.
              </div>
            )}

            {success && <div className="alert alert-success">{success}</div>}

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 12 }}>
              {saving ? 'Saving…' : 'Save design'}
            </button>
          </div>
        </div>

        <div>
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
              Live preview
            </h3>
            <QrPreview data={qr.shortUrl} design={design} />
          </div>
        </div>
      </div>
    </div>
  );
}

function relativeLuminance(rgb: number): number {
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  const adj = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * adj(r) + 0.7152 * adj(g) + 0.0722 * adj(b);
}
