import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.requestPasswordReset(email);
      setSubmitted(true);
      if (res.devToken) setDevToken(res.devToken);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="auth-card">
        <h1>Check your email</h1>
        <p className="lede">If an account exists for {email}, we've sent password reset instructions.</p>
        {devToken && (
          <div className="alert alert-warn">
            <strong>Dev mode:</strong> Use this token to reset:<br />
            <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{devToken}</code><br />
            <Link to={`/reset-password?token=${devToken}`}>Open reset link →</Link>
          </div>
        )}
        <p className="auth-link"><Link to="/login">Back to sign in</Link></p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1>Forgot your password?</h1>
      <p className="lede">Enter your email and we'll send you a reset link.</p>
      <form onSubmit={submit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="auth-link"><Link to="/login">Back to sign in</Link></p>
    </div>
  );
}
