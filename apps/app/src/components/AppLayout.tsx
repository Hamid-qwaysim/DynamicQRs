import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';

const NAV = [
  { to: '/dashboard', label: 'Overview', icon: '◈' },
  { to: '/qr', label: 'QR Codes', icon: '▦' },
  { to: '/bulk', label: 'Bulk Create', icon: '≡' },
  { to: '/domains', label: 'Domains', icon: '🌐' },
  { to: '/team', label: 'Team', icon: '👥' },
];

const NAV_SECONDARY = [
  { to: '/settings', label: 'Settings', icon: '⚙' },
  { to: '/api-keys', label: 'API Keys', icon: '🔑' },
  { to: '/billing', label: 'Billing', icon: '💳' },
];

export function AppLayout() {
  const { user, signOut } = useAuth();
  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="2" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
            <rect x="20" y="2" width="10" height="10" rx="2" fill="#0a0e27"/>
            <rect x="2" y="20" width="10" height="10" rx="2" fill="#0a0e27"/>
            <rect x="22" y="22" width="6" height="6" rx="1.5" fill="#2540ff"/>
            <rect x="14" y="14" width="4" height="4" fill="#2540ff"/>
          </svg>
          QR Labs
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">Workspace</div>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}>
              <span style={{ width: 16, display: 'inline-block' }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <div className="sidebar-section">Account</div>
          {NAV_SECONDARY.map((n) => (
            <NavLink key={n.to} to={n.to}>
              <span style={{ width: 16, display: 'inline-block' }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user">
            <div className="avatar">{initials || 'U'}</div>
            <div className="user-info">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
