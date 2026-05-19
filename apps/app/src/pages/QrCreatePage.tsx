import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { QrPreview, type QrDesign } from '../components/QrPreview';

type QrType =
  | 'url'
  | 'multilink'
  | 'vcard'
  | 'whatsapp'
  | 'email'
  | 'sms'
  | 'phone'
  | 'wifi'
  | 'location'
  | 'menu'
  | 'pdf'
  | 'app'
  | 'social'
  | 'event';

const TYPES: Array<{ value: QrType; label: string; icon: string; description: string }> = [
  { value: 'url', label: 'Website URL', icon: '🔗', description: 'Open any web link' },
  { value: 'vcard', label: 'vCard', icon: '👤', description: 'Save contact info' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', description: 'Open chat with you' },
  { value: 'email', label: 'Email', icon: '✉️', description: 'Pre-filled email' },
  { value: 'sms', label: 'SMS', icon: '💭', description: 'Pre-filled text message' },
  { value: 'phone', label: 'Phone call', icon: '📞', description: 'Tap to call' },
  { value: 'wifi', label: 'WiFi', icon: '📶', description: 'Auto-connect to your network' },
  { value: 'location', label: 'Map location', icon: '📍', description: 'Open in Maps' },
  { value: 'menu', label: 'Restaurant menu', icon: '🍽️', description: 'Digital menu link' },
  { value: 'pdf', label: 'PDF / File', icon: '📄', description: 'Link to hosted file' },
  { value: 'app', label: 'App download', icon: '📱', description: 'Smart-route to App Store/Play' },
  { value: 'social', label: 'Social profile', icon: '🌐', description: 'Open your social page' },
];

function buildDestination(type: QrType, fields: Record<string, string>): string {
  switch (type) {
    case 'url':
    case 'menu':
    case 'pdf':
    case 'app':
    case 'social':
      return fields.url || '';
    case 'whatsapp': {
      const phone = (fields.phone || '').replace(/\D/g, '');
      const msg = encodeURIComponent(fields.message || '');
      return `https://wa.me/${phone}${msg ? `?text=${msg}` : ''}`;
    }
    case 'email':
      return `mailto:${fields.email}?subject=${encodeURIComponent(fields.subject || '')}&body=${encodeURIComponent(fields.body || '')}`;
    case 'sms':
      return `sms:${fields.phone}?body=${encodeURIComponent(fields.message || '')}`;
    case 'phone':
      return `tel:${fields.phone}`;
    case 'wifi':
      // We'll send a hosted landing page URL since QR readers vary on WIFI: handling
      return fields.landingUrl || `https://qr.dynamicqrcodelabs.com/wifi-info?ssid=${encodeURIComponent(fields.ssid || '')}&pass=${encodeURIComponent(fields.password || '')}&t=${fields.security || 'WPA'}`;
    case 'location':
      return `https://www.google.com/maps?q=${encodeURIComponent(fields.address || '')}`;
    case 'vcard':
      // Build a hosted contact card page so dynamic edits work
      return fields.landingUrl || 'https://example.com/vcard';
    default:
      return fields.url || '';
  }
}

export function QrCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<QrType>('url');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [design, setDesign] = useState<QrDesign>({
    foregroundColor: '#0a0e27',
    backgroundColor: '#ffffff',
    eyeStyle: 'rounded',
    dotStyle: 'rounded',
    errorCorrection: 'H',
    margin: 4,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = useMemo(() => buildDestination(type, fields), [type, fields]);
  const previewData = destination || 'https://example.com/preview';

  const valid =
    name.trim().length >= 1 &&
    destination &&
    destination !== 'https://example.com/vcard'; // require real vcard URL

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.createQr({
        name: name.trim(),
        type,
        destinationUrl: destination,
        designJson: design as any,
      });
      navigate(`/qr/${res.qrCode.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Create a dynamic QR code</h1>
          <p className="subtle">Choose a type, fill in the destination, customize the look, and download.</p>
        </div>
      </div>

      <div className="wizard">
        <div className="wizard-steps">
          {[
            { n: 1, label: 'Choose type' },
            { n: 2, label: 'Destination' },
            { n: 3, label: 'Design' },
            { n: 4, label: 'Review & save' },
          ].map((s) => (
            <div
              key={s.n}
              className={`wizard-step ${step === s.n ? 'active' : step > s.n ? 'done' : ''}`}
              onClick={() => setStep(s.n)}
              style={{ cursor: 'pointer' }}
            >
              <span className="num">{step > s.n ? '✓' : s.n}</span>
              {s.label}
            </div>
          ))}
        </div>

        <div className="wizard-content">
          <div className="card">
            {error && <div className="alert alert-error">{error}</div>}

            {step === 1 && (
              <>
                <h2>What kind of QR code?</h2>
                <p className="subtle">Pick the destination type. You can always change later.</p>
                <div className="type-grid">
                  {TYPES.map((t) => (
                    <div
                      key={t.value}
                      className={`type-card ${type === t.value ? 'selected' : ''}`}
                      onClick={() => setType(t.value)}
                    >
                      <div className="icon">{t.icon}</div>
                      <div>{t.label}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>{t.description}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={() => setStep(2)}>
                    Next →
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2>Enter your destination</h2>
                <div className="field">
                  <label>QR code name (private)</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main poster - Spring sale" />
                  <span className="hint">Internal name to find this QR later. Customers never see it.</span>
                </div>
                <TypeFields type={type} fields={fields} setFields={setFields} />
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!destination}>
                    Next →
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2>Customize the design</h2>
                <p className="subtle">All changes apply to future scans instantly. You can always change later.</p>
                <DesignFields design={design} setDesign={setDesign} />
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn btn-primary" onClick={() => setStep(4)}>Next →</button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2>Review and create</h2>
                <table className="table" style={{ marginBottom: 18 }}>
                  <tbody>
                    <tr><td><strong>Name</strong></td><td>{name}</td></tr>
                    <tr><td><strong>Type</strong></td><td>{type}</td></tr>
                    <tr><td><strong>Destination</strong></td><td><code style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{destination}</code></td></tr>
                    <tr><td><strong>Foreground</strong></td><td>{design.foregroundColor}</td></tr>
                    <tr><td><strong>Background</strong></td><td>{design.backgroundColor}</td></tr>
                    <tr><td><strong>Eye style</strong></td><td>{design.eyeStyle}</td></tr>
                    <tr><td><strong>Dot style</strong></td><td>{design.dotStyle}</td></tr>
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="btn btn-secondary" onClick={() => setStep(3)}>← Back</button>
                  <button className="btn btn-primary" onClick={submit} disabled={!valid || submitting}>
                    {submitting ? 'Creating…' : 'Create QR code'}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="preview">
            <div className="preview-box">
              <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Live preview
              </h3>
              <QrPreview data={previewData} design={design} />
              <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', wordBreak: 'break-all' }}>
                {destination || '(enter destination above)'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeFields({
  type,
  fields,
  setFields,
}: {
  type: QrType;
  fields: Record<string, string>;
  setFields: (v: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => setFields({ ...fields, [k]: v });

  switch (type) {
    case 'url':
    case 'menu':
    case 'pdf':
    case 'social':
    case 'app':
      return (
        <div className="field">
          <label>{type === 'app' ? 'Destination URL (we will smart-redirect)' : 'URL'}</label>
          <input type="url" value={fields.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
        </div>
      );
    case 'whatsapp':
      return (
        <>
          <div className="field">
            <label>Phone number (with country code)</label>
            <input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+962790000000" />
          </div>
          <div className="field">
            <label>Pre-filled message (optional)</label>
            <textarea value={fields.message || ''} onChange={(e) => set('message', e.target.value)} placeholder="Hi, I'm interested in…" />
          </div>
        </>
      );
    case 'email':
      return (
        <>
          <div className="field">
            <label>Email address</label>
            <input type="email" value={fields.email || ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="field">
            <label>Subject (optional)</label>
            <input value={fields.subject || ''} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div className="field">
            <label>Body (optional)</label>
            <textarea value={fields.body || ''} onChange={(e) => set('body', e.target.value)} />
          </div>
        </>
      );
    case 'sms':
      return (
        <>
          <div className="field">
            <label>Phone number</label>
            <input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="field">
            <label>Pre-filled message</label>
            <textarea value={fields.message || ''} onChange={(e) => set('message', e.target.value)} />
          </div>
        </>
      );
    case 'phone':
      return (
        <div className="field">
          <label>Phone number</label>
          <input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+962790000000" />
        </div>
      );
    case 'wifi':
      return (
        <>
          <div className="field">
            <label>Network name (SSID)</label>
            <input value={fields.ssid || ''} onChange={(e) => set('ssid', e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input value={fields.password || ''} onChange={(e) => set('password', e.target.value)} />
          </div>
          <div className="field">
            <label>Encryption</label>
            <select value={fields.security || 'WPA'} onChange={(e) => set('security', e.target.value)}>
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </div>
          <p className="hint">QR opens a landing page with credentials and a "Copy" button. Some camera apps support direct WiFi join.</p>
        </>
      );
    case 'location':
      return (
        <div className="field">
          <label>Address or place name</label>
          <input value={fields.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="e.g. 1600 Amphitheatre Pkwy, Mountain View" />
        </div>
      );
    case 'vcard':
      return (
        <>
          <div className="field">
            <label>Landing page URL for your contact info</label>
            <input
              type="url"
              value={fields.landingUrl || ''}
              onChange={(e) => set('landingUrl', e.target.value)}
              placeholder="https://yourbrand.com/contact-card"
            />
            <span className="hint">A vCard landing page builder is coming soon. For now, host the vCard URL yourself.</span>
          </div>
        </>
      );
    default:
      return null;
  }
}

function DesignFields({ design, setDesign }: { design: QrDesign; setDesign: (d: QrDesign) => void }) {
  return (
    <div className="design-grid">
      <div className="field">
        <label>Foreground color</label>
        <input type="color" value={design.foregroundColor || '#0a0e27'} onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })} />
      </div>
      <div className="field">
        <label>Background color</label>
        <input type="color" value={design.backgroundColor || '#ffffff'} onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })} />
      </div>
      <div className="field">
        <label>Eye style</label>
        <select value={design.eyeStyle} onChange={(e) => setDesign({ ...design, eyeStyle: e.target.value as any })}>
          <option value="square">Square (classic)</option>
          <option value="rounded">Rounded</option>
          <option value="circle">Circle</option>
        </select>
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
          <option value="H">High (~30%) — recommended with logo</option>
        </select>
      </div>
      <div className="field">
        <label>Quiet zone (margin)</label>
        <input
          type="number"
          min={0}
          max={10}
          value={design.margin ?? 4}
          onChange={(e) => setDesign({ ...design, margin: Number(e.target.value) })}
        />
      </div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Logo URL (optional)</label>
        <input
          type="url"
          value={design.logoUrl || ''}
          onChange={(e) => setDesign({ ...design, logoUrl: e.target.value || null })}
          placeholder="https://yourbrand.com/logo.png"
        />
        <span className="hint">PNG/SVG with transparent background works best. Keep it small (under 25% of QR area).</span>
      </div>
    </div>
  );
}
