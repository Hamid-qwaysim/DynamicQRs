import { useState, type ChangeEvent } from 'react';
import { api, ApiError } from '../api/client';

interface Row {
  name: string;
  type: string;
  destinationUrl: string;
  customSlug?: string;
}

export function BulkPage() {
  const [csvText, setCsvText] = useState('name,type,destinationUrl,customSlug\nSpring 2026,url,https://example.com/spring,\nSummer 2026,url,https://example.com/summer,\n');
  const [parsed, setParsed] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  function parseCsv(text: string): Row[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: Row[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.every((c) => !c)) continue;
      const obj: any = {};
      headers.forEach((h, j) => (obj[h] = cols[j] || ''));
      if (!obj.name) continue;
      rows.push({
        name: obj.name,
        type: obj.type || 'url',
        destinationUrl: obj.destinationUrl || obj.url || '',
        customSlug: obj.customSlug || obj.slug || undefined,
      });
    }
    return rows;
  }

  function handleParse() {
    setError(null);
    try {
      const rows = parseCsv(csvText);
      if (rows.length === 0) throw new Error('No valid rows. Make sure headers include name, type, destinationUrl.');
      setParsed(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error');
      setParsed([]);
    }
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(String(ev.target?.result || ''));
    reader.readAsText(file);
  }

  async function submit() {
    if (parsed.length === 0) return;
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const res = await api.submitBulkJob(parsed);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Bulk job failed');
    } finally {
      setSubmitting(false);
    }
  }

  function downloadResultsCsv() {
    if (!result?.results) return;
    const rows = ['row,name,success,shortCode,shortUrl,error'];
    for (const r of result.results) {
      rows.push([r.row, r.name, r.success, r.shortCode || '', r.shortUrl || '', r.error || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-results.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bulk create</h1>
          <p className="subtle">Upload a CSV with name, type, destinationUrl, optional customSlug. Generate up to 10,000 QR codes in one job.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h3>1. Upload or paste CSV</h3>
        <p className="subtle">Required headers: <code>name,type,destinationUrl</code>. Optional: <code>customSlug</code>.</p>
        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 10 }} />
        <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} style={{ minHeight: 200, fontFamily: 'ui-monospace, monospace', fontSize: '0.85rem' }} />
        <button className="btn btn-secondary" onClick={handleParse} style={{ marginTop: 10 }}>
          Parse CSV
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {parsed.length > 0 && !result && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h3>2. Preview ({parsed.length} rows)</h3>
          <div className="table-wrap" style={{ border: 'none', maxHeight: 320, overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Type</th><th>Destination</th></tr>
              </thead>
              <tbody>
                {parsed.slice(0, 20).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{r.name}</td>
                    <td>{r.type}</td>
                    <td><code style={{ fontSize: '0.78rem' }}>{r.destinationUrl}</code></td>
                  </tr>
                ))}
                {parsed.length > 20 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>… and {parsed.length - 20} more</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" onClick={submit} disabled={submitting} style={{ marginTop: 14 }}>
            {submitting ? 'Generating…' : `Generate ${parsed.length} QR codes`}
          </button>
        </div>
      )}

      {result && (
        <div className="card">
          <h3>3. Results</h3>
          <div className="stat-row">
            <div className="stat">
              <div className="stat-label">Successful</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{result.successCount}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Failed</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{result.failedCount}</div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={downloadResultsCsv}>Download results CSV</button>
          <div className="table-wrap" style={{ border: 'none', maxHeight: 400, overflow: 'auto', marginTop: 14 }}>
            <table className="table">
              <thead>
                <tr><th>#</th><th>Name</th><th>Status</th><th>Short URL / Error</th></tr>
              </thead>
              <tbody>
                {result.results.map((r: any, i: number) => (
                  <tr key={i}>
                    <td>{r.row}</td>
                    <td>{r.name}</td>
                    <td>{r.success ? <span className="badge badge-active">OK</span> : <span className="badge badge-revoked">Failed</span>}</td>
                    <td><code style={{ fontSize: '0.78rem' }}>{r.shortUrl || r.error}</code></td>
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
