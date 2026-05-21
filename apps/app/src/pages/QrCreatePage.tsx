import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { QrPreview, type QrDesign } from '../components/QrPreview';
import { events } from '../lib/analytics';

type QrType =
  | 'url' | 'multilink' | 'vcard' | 'whatsapp' | 'email' | 'sms' | 'phone'
  | 'wifi' | 'location' | 'menu' | 'pdf' | 'app' | 'social' | 'event'
  | 'coupon' | 'review' | 'feedback';

const TYPES: Array<{ value: QrType; label: string; icon: string; description: string; landing?: boolean }> = [
  { value: 'url', label: 'Website URL', icon: '🔗', description: 'Open any web link' },
  { value: 'multilink', label: 'Multi-link page', icon: '🌐', description: 'Linktree-style page', landing: true },
  { value: 'vcard', label: 'vCard', icon: '👤', description: 'Save contact info', landing: true },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', description: 'Open chat with you' },
  { value: 'email', label: 'Email', icon: '✉️', description: 'Pre-filled email' },
  { value: 'sms', label: 'SMS', icon: '💭', description: 'Pre-filled text message' },
  { value: 'phone', label: 'Phone call', icon: '📞', description: 'Tap to call' },
  { value: 'wifi', label: 'WiFi', icon: '📶', description: 'Connect to your network', landing: true },
  { value: 'location', label: 'Map location', icon: '📍', description: 'Open in Maps', landing: true },
  { value: 'menu', label: 'Restaurant menu', icon: '🍽️', description: 'Digital menu', landing: true },
  { value: 'app', label: 'App download', icon: '📱', description: 'Smart-route to App Store/Play', landing: true },
  { value: 'event', label: 'Event invite', icon: '📅', description: 'Calendar event (.ics)', landing: true },
  { value: 'coupon', label: 'Coupon / promo', icon: '🎟️', description: 'Promo code page', landing: true },
  { value: 'review', label: 'Review request', icon: '⭐', description: 'Google/Yelp review prompts', landing: true },
  { value: 'feedback', label: 'Feedback form', icon: '📝', description: 'Star rating + comment', landing: true },
  { value: 'pdf', label: 'PDF / File', icon: '📄', description: 'Link to hosted file' },
  { value: 'social', label: 'Social profile', icon: '📸', description: 'Single social URL' },
];

const LANDING_TYPES = new Set(['vcard', 'wifi', 'multilink', 'location', 'coupon', 'event', 'review', 'feedback', 'menu', 'app']);

function buildPayload(type: QrType, fields: Record<string, any>): Record<string, any> {
  switch (type) {
    case 'vcard':
      return {
        name: fields.name,
        firstName: fields.firstName,
        lastName: fields.lastName,
        organization: fields.organization,
        title: fields.title,
        phone: fields.phone,
        email: fields.email,
        website: fields.website,
        address: fields.address,
        avatarUrl: fields.avatarUrl,
      };
    case 'wifi':
      return {
        ssid: fields.ssid,
        password: fields.password,
        security: fields.security || 'WPA',
      };
    case 'multilink':
      return {
        title: fields.title,
        subtitle: fields.subtitle,
        avatarUrl: fields.avatarUrl,
        links: fields.links || [],
      };
    case 'location':
      return {
        name: fields.locationName,
        address: fields.address,
        lat: fields.lat,
        lng: fields.lng,
      };
    case 'coupon':
      return {
        title: fields.couponTitle,
        code: fields.couponCode,
        description: fields.couponDescription,
        expiresAt: fields.couponExpiresAt,
        ctaUrl: fields.couponCtaUrl,
        ctaLabel: fields.couponCtaLabel,
      };
    case 'event':
      return {
        title: fields.eventTitle,
        startsAt: fields.startsAt,
        endsAt: fields.endsAt,
        location: fields.eventLocation,
        description: fields.eventDescription,
      };
    case 'review':
      return {
        businessName: fields.businessName,
        googlePlaceUrl: fields.googlePlaceUrl,
        yelpUrl: fields.yelpUrl,
        tripadvisorUrl: fields.tripadvisorUrl,
        trustpilotUrl: fields.trustpilotUrl,
      };
    case 'feedback':
      return {
        title: fields.feedbackTitle || 'How was your experience?',
        subtitle: fields.feedbackSubtitle,
      };
    case 'menu':
      return {
        restaurantName: fields.restaurantName,
        subtitle: fields.menuSubtitle,
        categories: fields.categories || [],
      };
    case 'app':
      return {
        appName: fields.appName,
        description: fields.appDescription,
        appStoreUrl: fields.appStoreUrl,
        playStoreUrl: fields.playStoreUrl,
        websiteUrl: fields.websiteUrl,
      };
    default:
      return {};
  }
}

function buildDestination(type: QrType, fields: Record<string, any>): string {
  // For landing types, the actual URL will be /p/:shortCode (set by /q/ redirect)
  // We just need any valid placeholder URL - backend will keep destinationUrl as-is.
  // For non-landing types, build the external URL directly.
  if (LANDING_TYPES.has(type)) {
    return 'https://qr.dynamicqrcodelabs.com/p/placeholder';
  }
  switch (type) {
    case 'url':
    case 'pdf':
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
    default:
      return fields.url || '';
  }
}

export function QrCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<QrType>('url');
  const [name, setName] = useState('');
  const [fields, setFields] = useState<Record<string, any>>({});
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
  const payload = useMemo(() => buildPayload(type, fields), [type, fields]);
  const previewData = destination || 'https://example.com/preview';

  const valid = name.trim().length >= 1 && destination.length > 0;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const body: any = {
        name: name.trim(),
        type,
        destinationUrl: destination,
        designJson: design as any,
      };
      if (LANDING_TYPES.has(type)) {
        body.destinationPayload = payload;
      }
      const res = await api.createQr(body);
      events.qrCreated(type);
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
                      {t.landing && <div style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: 4, fontWeight: 600 }}>+ landing page</div>}
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
                    <tr><td><strong>Destination</strong></td><td><code style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{LANDING_TYPES.has(type) ? '(hosted landing page)' : destination}</code></td></tr>
                    <tr><td><strong>Foreground</strong></td><td>{design.foregroundColor}</td></tr>
                    <tr><td><strong>Background</strong></td><td>{design.backgroundColor}</td></tr>
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
                {LANDING_TYPES.has(type) ? 'Hosted landing page' : destination || '(enter destination above)'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TypeFields({ type, fields, setFields }: { type: QrType; fields: any; setFields: (v: any) => void }) {
  const set = (k: string, v: any) => setFields({ ...fields, [k]: v });

  switch (type) {
    case 'url':
    case 'pdf':
    case 'social':
      return (
        <div className="field">
          <label>URL</label>
          <input type="url" value={fields.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
        </div>
      );

    case 'app':
      return (
        <>
          <div className="field">
            <label>App name</label>
            <input value={fields.appName || ''} onChange={(e) => set('appName', e.target.value)} placeholder="My App" />
          </div>
          <div className="field">
            <label>Short description</label>
            <input value={fields.appDescription || ''} onChange={(e) => set('appDescription', e.target.value)} />
          </div>
          <div className="field">
            <label>App Store URL (iOS)</label>
            <input type="url" value={fields.appStoreUrl || ''} onChange={(e) => set('appStoreUrl', e.target.value)} placeholder="https://apps.apple.com/app/..." />
          </div>
          <div className="field">
            <label>Google Play URL (Android)</label>
            <input type="url" value={fields.playStoreUrl || ''} onChange={(e) => set('playStoreUrl', e.target.value)} placeholder="https://play.google.com/store/apps/..." />
          </div>
          <div className="field">
            <label>Website fallback (desktop scans)</label>
            <input type="url" value={fields.websiteUrl || ''} onChange={(e) => set('websiteUrl', e.target.value)} />
          </div>
        </>
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
          <div className="field"><label>Phone number</label><input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div className="field"><label>Pre-filled message</label><textarea value={fields.message || ''} onChange={(e) => set('message', e.target.value)} /></div>
        </>
      );

    case 'phone':
      return <div className="field"><label>Phone number</label><input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="+962790000000" /></div>;

    case 'wifi':
      return (
        <>
          <div className="field"><label>Network name (SSID)</label><input value={fields.ssid || ''} onChange={(e) => set('ssid', e.target.value)} /></div>
          <div className="field"><label>Password</label><input value={fields.password || ''} onChange={(e) => set('password', e.target.value)} /></div>
          <div className="field">
            <label>Security</label>
            <select value={fields.security || 'WPA'} onChange={(e) => set('security', e.target.value)}>
              <option value="WPA">WPA/WPA2/WPA3</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No password</option>
            </select>
          </div>
          <p className="hint">Customers see a landing page with the WiFi credentials + a "Connect" button. Some camera apps support direct join.</p>
        </>
      );

    case 'location':
      return (
        <>
          <div className="field"><label>Place name</label><input value={fields.locationName || ''} onChange={(e) => set('locationName', e.target.value)} placeholder="Our office" /></div>
          <div className="field"><label>Address</label><input value={fields.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="1600 Amphitheatre Pkwy, Mountain View, CA" /></div>
          <div className="field"><label>Latitude (optional)</label><input value={fields.lat || ''} onChange={(e) => set('lat', e.target.value)} placeholder="37.4220" /></div>
          <div className="field"><label>Longitude (optional)</label><input value={fields.lng || ''} onChange={(e) => set('lng', e.target.value)} placeholder="-122.0841" /></div>
        </>
      );

    case 'vcard':
      return (
        <>
          <div className="field"><label>Full name</label><input value={fields.name || ''} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="field"><label>Job title</label><input value={fields.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="field"><label>Organization</label><input value={fields.organization || ''} onChange={(e) => set('organization', e.target.value)} /></div>
          <div className="field"><label>Phone</label><input value={fields.phone || ''} onChange={(e) => set('phone', e.target.value)} /></div>
          <div className="field"><label>Email</label><input type="email" value={fields.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label>Website</label><input type="url" value={fields.website || ''} onChange={(e) => set('website', e.target.value)} /></div>
          <div className="field"><label>Address (optional)</label><input value={fields.address || ''} onChange={(e) => set('address', e.target.value)} /></div>
          <div className="field"><label>Avatar URL (optional)</label><input type="url" value={fields.avatarUrl || ''} onChange={(e) => set('avatarUrl', e.target.value)} /></div>
        </>
      );

    case 'multilink':
      return (
        <>
          <div className="field"><label>Page title</label><input value={fields.title || ''} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="field"><label>Subtitle (optional)</label><input value={fields.subtitle || ''} onChange={(e) => set('subtitle', e.target.value)} /></div>
          <div className="field"><label>Avatar URL (optional)</label><input type="url" value={fields.avatarUrl || ''} onChange={(e) => set('avatarUrl', e.target.value)} /></div>
          <MultilinkLinks links={fields.links || []} onChange={(l) => set('links', l)} />
        </>
      );

    case 'coupon':
      return (
        <>
          <div className="field"><label>Title</label><input value={fields.couponTitle || ''} onChange={(e) => set('couponTitle', e.target.value)} placeholder="20% off your next order" /></div>
          <div className="field"><label>Promo code</label><input value={fields.couponCode || ''} onChange={(e) => set('couponCode', e.target.value)} placeholder="SAVE20" style={{ textTransform: 'uppercase' }} /></div>
          <div className="field"><label>Description</label><textarea value={fields.couponDescription || ''} onChange={(e) => set('couponDescription', e.target.value)} /></div>
          <div className="field"><label>Expires at (optional)</label><input type="date" value={fields.couponExpiresAt || ''} onChange={(e) => set('couponExpiresAt', e.target.value)} /></div>
          <div className="field"><label>Redeem CTA URL (optional)</label><input type="url" value={fields.couponCtaUrl || ''} onChange={(e) => set('couponCtaUrl', e.target.value)} /></div>
          <div className="field"><label>CTA label</label><input value={fields.couponCtaLabel || 'Redeem now'} onChange={(e) => set('couponCtaLabel', e.target.value)} /></div>
        </>
      );

    case 'event':
      return (
        <>
          <div className="field"><label>Event title</label><input value={fields.eventTitle || ''} onChange={(e) => set('eventTitle', e.target.value)} /></div>
          <div className="field"><label>Starts at</label><input type="datetime-local" value={fields.startsAt || ''} onChange={(e) => set('startsAt', e.target.value)} /></div>
          <div className="field"><label>Ends at</label><input type="datetime-local" value={fields.endsAt || ''} onChange={(e) => set('endsAt', e.target.value)} /></div>
          <div className="field"><label>Location</label><input value={fields.eventLocation || ''} onChange={(e) => set('eventLocation', e.target.value)} /></div>
          <div className="field"><label>Description</label><textarea value={fields.eventDescription || ''} onChange={(e) => set('eventDescription', e.target.value)} /></div>
        </>
      );

    case 'review':
      return (
        <>
          <div className="field"><label>Business name</label><input value={fields.businessName || ''} onChange={(e) => set('businessName', e.target.value)} /></div>
          <div className="field"><label>Google review URL</label><input type="url" value={fields.googlePlaceUrl || ''} onChange={(e) => set('googlePlaceUrl', e.target.value)} placeholder="https://g.page/r/..." /></div>
          <div className="field"><label>Yelp URL (optional)</label><input type="url" value={fields.yelpUrl || ''} onChange={(e) => set('yelpUrl', e.target.value)} /></div>
          <div className="field"><label>TripAdvisor URL (optional)</label><input type="url" value={fields.tripadvisorUrl || ''} onChange={(e) => set('tripadvisorUrl', e.target.value)} /></div>
          <div className="field"><label>Trustpilot URL (optional)</label><input type="url" value={fields.trustpilotUrl || ''} onChange={(e) => set('trustpilotUrl', e.target.value)} /></div>
        </>
      );

    case 'feedback':
      return (
        <>
          <div className="field"><label>Title</label><input value={fields.feedbackTitle || ''} onChange={(e) => set('feedbackTitle', e.target.value)} placeholder="How was your experience?" /></div>
          <div className="field"><label>Subtitle</label><input value={fields.feedbackSubtitle || ''} onChange={(e) => set('feedbackSubtitle', e.target.value)} placeholder="Your feedback helps us improve" /></div>
        </>
      );

    case 'menu':
      return (
        <>
          <div className="field"><label>Restaurant name</label><input value={fields.restaurantName || ''} onChange={(e) => set('restaurantName', e.target.value)} /></div>
          <div className="field"><label>Subtitle (e.g. "Lunch menu")</label><input value={fields.menuSubtitle || ''} onChange={(e) => set('menuSubtitle', e.target.value)} /></div>
          <p className="hint" style={{ marginTop: 8 }}>Use the QR detail page after creation to add menu categories and items.</p>
        </>
      );

    default:
      return null;
  }
}

function MultilinkLinks({ links, onChange }: { links: Array<{label: string; url: string}>; onChange: (l: any) => void }) {
  return (
    <div className="field">
      <label>Links</label>
      {links.map((link, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            placeholder="Label"
            value={link.label}
            onChange={(e) => {
              const next = [...links];
              next[i] = { ...next[i], label: e.target.value };
              onChange(next);
            }}
            style={{ width: 130 }}
          />
          <input
            type="url"
            placeholder="https://"
            value={link.url}
            onChange={(e) => {
              const next = [...links];
              next[i] = { ...next[i], url: e.target.value };
              onChange(next);
            }}
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-sm btn-ghost"
            type="button"
            onClick={() => onChange(links.filter((_, j) => j !== i))}
          >×</button>
        </div>
      ))}
      <button
        className="btn btn-sm btn-secondary"
        type="button"
        onClick={() => onChange([...links, { label: '', url: 'https://' }])}
        style={{ marginTop: 6 }}
      >+ Add link</button>
    </div>
  );
}

function DesignFields({ design, setDesign }: { design: QrDesign; setDesign: (d: QrDesign) => void }) {
  return (
    <div className="design-grid">
      <div className="field"><label>Foreground</label><input type="color" value={design.foregroundColor || '#0a0e27'} onChange={(e) => setDesign({ ...design, foregroundColor: e.target.value })} /></div>
      <div className="field"><label>Background</label><input type="color" value={design.backgroundColor || '#ffffff'} onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })} /></div>
      <div className="field">
        <label>Eye style</label>
        <select value={design.eyeStyle} onChange={(e) => setDesign({ ...design, eyeStyle: e.target.value as any })}>
          <option value="square">Square</option>
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
          <option value="H">High (~30%)</option>
        </select>
      </div>
      <div className="field"><label>Margin</label><input type="number" min={0} max={10} value={design.margin ?? 4} onChange={(e) => setDesign({ ...design, margin: Number(e.target.value) })} /></div>
      <div className="field" style={{ gridColumn: '1 / -1' }}>
        <label>Logo URL (optional)</label>
        <input type="url" value={design.logoUrl || ''} onChange={(e) => setDesign({ ...design, logoUrl: e.target.value || null })} placeholder="https://yourbrand.com/logo.png" />
      </div>
    </div>
  );
}
