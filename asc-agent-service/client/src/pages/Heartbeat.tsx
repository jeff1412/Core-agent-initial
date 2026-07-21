import { useState, useEffect, useCallback } from 'react';
import './Heartbeat.css';

interface ProductHeartbeat {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  status: 'green' | 'yellow' | 'red';
  reachable: boolean;
  defaultBranch: string | null;
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    daysAgo: number;
  } | null;
  openPrCount: number;
  stalePrCount: number;
  ci: {
    available: boolean;
    conclusion: string | null;
    runAt: string | null;
  };
  issues: string[];
}

interface HeartbeatReport {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  products: ProductHeartbeat[];
  aiReport: string | null;
  aiError: string | null;
}

function statusLabel(status: string): string {
  if (status === 'green') return 'Healthy';
  if (status === 'yellow') return 'Attention';
  return 'Critical';
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

function commitAgeText(daysAgo: number): string {
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return '1 day ago';
  return `${daysAgo} days ago`;
}

export default function Heartbeat() {
  const [report, setReport] = useState<HeartbeatReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLatest = useCallback(() => {
    return fetch('/api/heartbeat/latest')
      .then(r => r.json())
      .then(data => {
        if (data.empty) {
          setReport(null);
        } else {
          setReport(data);
        }
      })
      .catch(() => setError('Failed to load heartbeat data'));
  }, []);

  useEffect(() => {
    fetchLatest().finally(() => setLoading(false));
  }, [fetchLatest]);

  const handleRunNow = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/heartbeat/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-muted">Loading heartbeat data...</div>;
  }

  return (
    <div className="heartbeat fade-in">
      <div className="page-header-actions heartbeat-header">
        <div>
          <h2 className="page-title">Heartbeat</h2>
          <p className="text-muted heartbeat-subtitle">
            Repo health for onboarded products — checks GitHub activity, PRs, and CI.
          </p>
          {report && (
            <p className="text-muted heartbeat-meta">
              Last run: {formatRelativeTime(report.generatedAt)}
              {' · '}
              Trigger: {report.trigger === 'manual' ? 'Manual' : 'Scheduled'}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary"
          onClick={handleRunNow}
          disabled={running}
        >
          {running ? 'Checking repos...' : 'Generate Report Now'}
        </button>
      </div>

      {error && (
        <div className="heartbeat-error slide-in">{error}</div>
      )}

      {!report && !running && (
        <div className="card heartbeat-empty slide-in">
          <p className="text-muted">No heartbeat report yet.</p>
          <p>Click <strong>Generate Report Now</strong> to check MeetingGenius, Janus, and other onboarded repos.</p>
        </div>
      )}

      {(report || running) && (
        <>
          <div className="grid-2 heartbeat-products">
            {(report?.products || []).map((p, i) => (
              <div
                key={p.productId}
                className="card heartbeat-product-card slide-in"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="heartbeat-product-header">
                  <div>
                    <h3>{p.productName}</h3>
                    <p className="mono text-muted heartbeat-scope">
                      {p.owner}/{p.repo}
                    </p>
                  </div>
                  <span className={`badge badge-${p.status === 'green' ? 'green' : p.status === 'yellow' ? 'yellow' : 'red'}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                <div className="heartbeat-metrics">
                  <div className="metric">
                    <span className="label">Last Commit</span>
                    <span className="value">
                      {p.lastCommit
                        ? `${commitAgeText(p.lastCommit.daysAgo)} (${p.lastCommit.sha})`
                        : '—'}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="label">Branch</span>
                    <span className="value">{p.defaultBranch || '—'}</span>
                  </div>
                  <div className="metric">
                    <span className="label">Open PRs</span>
                    <span className="value">{p.openPrCount}</span>
                  </div>
                  <div className="metric">
                    <span className="label">CI Status</span>
                    <span className="value">
                      {!p.ci.available
                        ? 'Not configured'
                        : p.ci.conclusion === 'success'
                          ? 'Passing'
                          : p.ci.conclusion || 'Pending'}
                    </span>
                  </div>
                </div>

                {p.issues.length > 0 && (
                  <ul className="heartbeat-issues">
                    {p.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {report?.aiReport && (
            <div className="card heartbeat-report slide-in">
              <div className="heartbeat-report-header">
                <h3>AI Report</h3>
                {report.aiError && (
                  <span className="badge badge-yellow">Fallback summary (AI unavailable)</span>
                )}
              </div>
              <div className="heartbeat-report-body">
                {report.aiReport.split('\n').map((line, i) => (
                  <p key={i}>{line || '\u00A0'}</p>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
