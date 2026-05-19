import { Outlet, Link } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <div>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
            <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
              <rect x="2" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
              <rect x="20" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
              <rect x="2" y="20" width="10" height="10" rx="2" fill="#0a0e27"/>
              <rect x="22" y="22" width="6" height="6" rx="1.5" fill="#2540ff"/>
              <rect x="14" y="14" width="4" height="4" fill="#2540ff"/>
            </svg>
            QR Labs
          </Link>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
