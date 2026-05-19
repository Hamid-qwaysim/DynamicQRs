import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { api, type QrAnalytics, type QrCode } from '../api/client';

const COLORS = ['#2540ff', '#00d4a8', '#ff9a3c', '#e5484d', '#9333ea', '#0891b2', '#a3a3a3'];

export function QrAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [qr, setQr] = useState<QrCode | null>(null);
  const [a, setA] = useState<QrAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getQr(id), api.qrAnalytics(id)])
      .then(([r1, r2]) => {
        setQr(r1.qrCode);
        setA(r2);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="empty"><div className="spinner" /></div>;
  if (!qr || !a) return <div className="card empty"><h3>Analytics not available</h3></div>;

  const countryData = a.byCountry.map((c) => ({ name: c.country || 'Unknown', value: c.count }));
  const deviceData = a.byDevice.map((d) => ({ name: d.device || 'Unknown', value: d.count }));
  const realScans = a.totals.total - a.totals.bots;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/qr/${qr.id}`} style={{ fontSize: '0.85rem' }}>← Back to {qr.name}</Link>
          <h1 style={{ marginTop: 6 }}>Analytics</h1>
          <p className="subtle">Scan events for {qr.name}</p>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">Total scans</div>
          <div className="stat-value">{a.totals.total.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Real scans (excl bots)</div>
          <div className="stat-value">{realScans.toLocaleString()}</div>
          <div className="stat-delta">{a.totals.bots} bot scans filtered</div>
        </div>
        <div className="stat">
          <div className="stat-label">Recent activity</div>
          <div className="stat-value">{a.recentScans.length}</div>
          <div className="stat-delta">last 50 scans</div>
        </div>
        <div className="stat">
          <div className="stat-label">Top country</div>
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>{countryData[0]?.name || '—'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div className="card">
          <h3>Top countries</h3>
          {countryData.length === 0 ? (
            <div className="empty">No scan data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={countryData} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" stroke="#6b7390" fontSize={12} />
                <YAxis stroke="#6b7390" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#fafbff' }} />
                <Bar dataKey="value" fill="#2540ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3>Devices</h3>
          {deviceData.length === 0 ? (
            <div className="empty">No scan data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={deviceData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {deviceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Recent scans</h3>
        {a.recentScans.length === 0 ? (
          <div className="empty">No scans yet. Share your QR to see analytics here.</div>
        ) : (
          <div className="table-wrap" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Country</th>
                  <th>Device</th>
                  <th>OS</th>
                  <th>Browser</th>
                </tr>
              </thead>
              <tbody>
                {a.recentScans.map((s) => (
                  <tr key={s.id}>
                    <td>{new Date(s.timestamp).toLocaleString()}</td>
                    <td>{s.country || '—'}</td>
                    <td>{s.deviceType || '—'}</td>
                    <td>{s.os || '—'}</td>
                    <td>{s.browser || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
