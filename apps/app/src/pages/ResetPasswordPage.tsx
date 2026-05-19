import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = params.get('token') ?? '';
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      navigate('/login?reset=ok');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Set a new password</h1>
      <p className="lede">Enter your new password below.</p>
      <form onSubmit={submit}>
        {error && <div className="alert alert-error">{error}</div>}
        {!tokenFromUrl && (
          <div className="field">
            <label>Reset token</label>
            <input type="text" required value={token} onChange={(e) => setToken(e.target.value)} />
            <span className="hint">From the email link.</span>
          </div>
        )}
        <div className="field">
          <label>New password</label>
          <input type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="hint">At least 10 characters.</span>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
      <p className="auth-link"><Link to="/login">Back to sign in</Link></p>
    </div>
  );
}
