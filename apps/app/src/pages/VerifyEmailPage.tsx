import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .confirmEmail(token)
      .then(() => setStatus('ok'))
      .catch((e) => {
        setStatus('error');
        setError(e instanceof ApiError ? e.message : 'Verification failed');
      });
  }, [token]);

  return (
    <div className="auth-card">
      <h1>Email verification</h1>
      {!token && <div className="alert alert-error">Missing verification token.</div>}
      {token && status === 'pending' && <p className="lede">Verifying your email…</p>}
      {token && status === 'ok' && (
        <div className="alert alert-success">Your email has been verified. You're all set!</div>
      )}
      {token && status === 'error' && <div className="alert alert-error">{error}</div>}
      <p className="auth-link"><Link to="/dashboard">Go to dashboard</Link></p>
    </div>
  );
}
