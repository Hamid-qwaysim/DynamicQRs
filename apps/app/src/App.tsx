import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/AuthContext';
import { AuthLayout } from './components/AuthLayout';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { DashboardPage } from './pages/DashboardPage';
import { QrCodesPage } from './pages/QrCodesPage';
import { QrCreatePage } from './pages/QrCreatePage';
import { QrDetailPage } from './pages/QrDetailPage';
import { QrDesignPage } from './pages/QrDesignPage';
import { QrAnalyticsPage } from './pages/QrAnalyticsPage';
import { BulkPage } from './pages/BulkPage';
import { DomainsPage } from './pages/DomainsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';
import { BillingPage } from './pages/BillingPage';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PublicOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Route>

      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/qr" element={<QrCodesPage />} />
        <Route path="/qr/new" element={<QrCreatePage />} />
        <Route path="/qr/:id" element={<QrDetailPage />} />
        <Route path="/qr/:id/design" element={<QrDesignPage />} />
        <Route path="/qr/:id/analytics" element={<QrAnalyticsPage />} />
        <Route path="/bulk" element={<BulkPage />} />
        <Route path="/domains" element={<DomainsPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/billing" element={<BillingPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
