import { useEffect, useState } from 'react';
import { api, ApiError, type WorkspaceMember, type Invite } from '../api/client';

export function TeamPage() {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('viewer');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([api.listMembers(), api.listInvites()])
      .then(([m, i]) => {
        setMembers(m.members);
        setCurrentRole(m.currentUserRole);
        setInvites(i.invites);
      })
      .finally(() => setLoading(false));
  }
  useEffect(reload, []);

  async function invite() {
    setError(null);
    setDevToken(null);
    setSubmitting(true);
    try {
      const res = await api.inviteMember(email.trim(), role);
      if (res.devToken) setDevToken(res.devToken);
      setEmail('');
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Invite failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelInvite(id: string) {
    if (!confirm('Cancel this invite?')) return;
    await api.deleteInvite(id);
    reload();
  }

  async function changeMemberRole(id: string, newRole: 'admin' | 'editor' | 'viewer') {
    await api.updateMemberRole(id, newRole);
    reload();
  }

  async function removeMember(id: string) {
    if (!confirm('Remove this member from the workspace?')) return;
    await api.removeMember(id);
    reload();
  }

  const canAdmin = currentRole === 'owner' || currentRole === 'admin';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtle">Invite teammates with owner, admin, editor, or viewer roles.</p>
        </div>
      </div>

      {canAdmin && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>Invite a teammate</h3>
          {error && <div className="alert alert-error">{error}</div>}
          {devToken && (
            <div className="alert alert-warn">
              <strong>Dev mode:</strong> Invite token (paste into invite acceptance):<br />
              <code style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{devToken}</code>
            </div>
          )}
          <div className="row">
            <input type="email" placeholder="teammate@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ maxWidth: 280 }} />
            <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ maxWidth: 140 }}>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary" onClick={invite} disabled={!email || submitting}>
              {submitting ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>Members ({members.length})</h3>
        {loading ? (
          <div className="empty"><div className="spinner" /></div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.name || '—'}</strong></td>
                    <td>{m.email}</td>
                    <td>
                      {canAdmin && m.role !== 'owner' ? (
                        <select value={m.role} onChange={(e) => changeMemberRole(m.id, e.target.value as any)} style={{ width: 110 }}>
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="badge badge-neutral">{m.role}</span>
                      )}
                    </td>
                    <td>{new Date(m.joinedAt).toLocaleDateString()}</td>
                    <td>
                      {canAdmin && m.role !== 'owner' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => removeMember(m.id)}>Remove</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invites.length > 0 && (
        <div className="card">
          <h3>Pending invites</h3>
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead><tr><th>Email</th><th>Role</th><th>Sent</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                {invites.filter((i) => !i.acceptedAt).map((i) => (
                  <tr key={i.id}>
                    <td>{i.email}</td>
                    <td><span className="badge badge-neutral">{i.role}</span></td>
                    <td>{new Date(i.createdAt).toLocaleDateString()}</td>
                    <td>{new Date(i.expiresAt).toLocaleDateString()}</td>
                    <td>{canAdmin && <button className="btn btn-sm btn-ghost" onClick={() => cancelInvite(i.id)}>Cancel</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
