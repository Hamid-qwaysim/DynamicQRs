import { useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../hooks/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  async function resendVerify() {
    setSendingVerify(true);
    setVerifyResult(null);
    try {
      const r = await api.sendVerificationEmail();
      if (r.alreadyVerified) setVerifyResult('Already verified.');
      else if (r.devToken) setVerifyResult(`Dev token: ${r.devToken}`);
      else setVerifyResult('Verification email sent (check your inbox).');
    } finally {
      setSendingVerify(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtle">Manage your account and workspace settings.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Account</h3>
        <div className="field">
          <label>Name</label>
          <input value={user?.name || ''} readOnly />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user?.email || ''} readOnly />
        </div>
        <div className="field">
          <label>Email verification status</label>
          <div className="row">
            <span className={`badge badge-${user?.emailVerified ? 'active' : 'paused'}`}>
              {user?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
            </span>
            {!user?.emailVerified && (
              <button className="btn btn-sm btn-secondary" onClick={resendVerify} disabled={sendingVerify}>
                {sendingVerify ? 'Sending…' : 'Resend verification'}
              </button>
            )}
          </div>
          {verifyResult && <div className="alert alert-info" style={{ marginTop: 8 }}>{verifyResult}</div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>API access</h3>
        <p className="subtle">Programmatically create and manage QR codes. Coming soon on Pro and above.</p>
        <button className="btn btn-secondary" disabled>Generate API key (coming soon)</button>
      </div>

      <div className="card">
        <h3>Danger zone</h3>
        <p className="subtle">These actions are permanent.</p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn btn-secondary" onClick={() => alert('Account deletion requires contacting support during the beta. Email hello@dynamicqrcodelabs.com.')}>Delete account</button>
        </div>
      </div>
    </div>
  );
}
