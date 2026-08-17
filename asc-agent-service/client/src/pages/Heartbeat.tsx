import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { apiFetch } from '../utils/api';
import ScheduleSettings from '../components/ScheduleSettings';
import './Heartbeat.css';
import '../components/ScheduleSettings.css';

interface HeartbeatIssue {
  category: 'branch' | 'pull_request' | 'ci' | 'access';
  message: string;
}

interface BranchActivity {
  name: string;
  lastCommitDate: string;
  daysAgo: number;
  sha: string;
  author: string;
}

interface ProductHeartbeat {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  status: 'green' | 'yellow' | 'red';
  reachable: boolean;
  defaultBranch: string | null;
  branchesChecked: number;
  branchActivity: BranchActivity[];
  staleBranches: BranchActivity[];
  lastCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
    daysAgo: number;
    branch?: string;
  } | null;
  openPrCount: number;
  stalePrCount: number;
  ci: {
    available: boolean;
    conclusion: string | null;
    runAt: string | null;
  };
  issues: HeartbeatIssue[];
  recommendations: string[];
  openPrs: Array<{ number: number; title: string; author: string; daysOpen: number; daysSinceUpdate?: number }>;
  commitsLast7Days: number;
}

interface HeartbeatReport {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  products: ProductHeartbeat[];
  aiReport: string | null;
  aiError: string | null;
}

interface HistoryItem {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  summary: {
    green: number;
    yellow: number;
    red: number;
    products: Array<{ name: string; status: string }>;
  };
}

function statusLabel(status: string): string {
  if (status === 'green') return 'Healthy';
  if (status === 'yellow') return 'Attention';
  return 'Critical';
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function commitAgeText(daysAgo: number): string {
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return '1 day ago';
  return `${daysAgo} days ago`;
}

function normalizeIssue(issue: HeartbeatIssue | string): HeartbeatIssue {
  if (typeof issue === 'object' && issue.category) return issue;
  const msg = String(issue);
  if (msg.includes('PR') || msg.includes('pull request')) return { category: 'pull_request', message: msg };
  if (msg.includes('CI') || msg.includes('workflow')) return { category: 'ci', message: msg };
  if (msg.includes('token') || msg.includes('access')) return { category: 'access', message: msg };
  return { category: 'branch', message: msg };
}

function normalizeProduct(p: Partial<ProductHeartbeat>): ProductHeartbeat {
  return {
    productId: p.productId || '',
    productName: p.productName || 'Unknown',
    owner: p.owner || '',
    repo: p.repo || '',
    status: p.status || 'red',
    reachable: p.reachable ?? false,
    defaultBranch: p.defaultBranch ?? null,
    branchesChecked: p.branchesChecked ?? 0,
    branchActivity: Array.isArray(p.branchActivity) ? p.branchActivity : [],
    staleBranches: Array.isArray(p.staleBranches) ? p.staleBranches : [],
    lastCommit: p.lastCommit ?? null,
    openPrCount: p.openPrCount ?? 0,
    stalePrCount: p.stalePrCount ?? 0,
    ci: p.ci ?? { available: false, conclusion: null, runAt: null },
    issues: Array.isArray(p.issues) ? p.issues.map(normalizeIssue) : [],
    recommendations: Array.isArray(p.recommendations) ? p.recommendations : [],
    openPrs: Array.isArray(p.openPrs) ? p.openPrs : [],
    commitsLast7Days: p.commitsLast7Days ?? 0
  };
}

function normalizeReport(raw: Partial<HeartbeatReport> & { empty?: boolean }): HeartbeatReport | null {
  if (!raw || raw.empty || !raw.id) return null;
  return {
    id: raw.id,
    generatedAt: raw.generatedAt || new Date().toISOString(),
    trigger: raw.trigger === 'scheduled' ? 'scheduled' : 'manual',
    products: Array.isArray(raw.products) ? raw.products.map(normalizeProduct) : [],
    aiReport: raw.aiReport ?? null,
    aiError: raw.aiError ?? null
  };
}

function normalizeHistoryItem(item: Partial<HistoryItem>): HistoryItem | null {
  if (!item?.id || !item.generatedAt) return null;
  const summary = item.summary || { green: 0, yellow: 0, red: 0, products: [] };
  return {
    id: item.id,
    generatedAt: item.generatedAt,
    trigger: item.trigger === 'scheduled' ? 'scheduled' : 'manual',
    summary: {
      green: summary.green ?? 0,
      yellow: summary.yellow ?? 0,
      red: summary.red ?? 0,
      products: Array.isArray(summary.products) ? summary.products : []
    }
  };
}

function renderReportMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${listKey++}`} className="heartbeat-md-list">
        {listItems.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
    listItems = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      flushList();
      elements.push(<h2 key={i} className="heartbeat-md-h2">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      flushList();
      elements.push(<h3 key={i} className="heartbeat-md-h3">{line.slice(4)}</h3>);
    } else if (/^\*\*.+\*\*$/.test(line.trim())) {
      flushList();
      elements.push(<p key={i} className="heartbeat-md-bold">{line.replace(/\*\*/g, '')}</p>);
    } else if (line.startsWith('**') && line.includes(':**')) {
      flushList();
      elements.push(<p key={i} className="heartbeat-md-meta">{line.replace(/\*\*/g, '')}</p>);
    } else if (/^\d+\.\s/.test(line.trim())) {
      flushList();
      elements.push(<p key={i} className="heartbeat-md-numbered">{line}</p>);
    } else if (line.trim().startsWith('- ')) {
      listItems.push(line.trim().slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(<p key={i} className="heartbeat-md-p">{line}</p>);
    }
  }
  flushList();
  return elements;
}

function LoadingBar({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="card heartbeat-loading slide-in">
      <p className="heartbeat-loading-label">{label}</p>
      <div className="heartbeat-progress-track">
        <div className="heartbeat-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="heartbeat-loading-pct">{Math.round(progress)}%</p>
    </div>
  );
}

function IssueGroups({ issues }: { issues: HeartbeatIssue[] }) {
  const groups: Record<string, HeartbeatIssue[]> = {
    branch: [], pull_request: [], ci: [], access: []
  };
  issues.forEach(i => groups[i.category]?.push(i));

  const labels: Record<string, string> = {
    branch: 'Branch Activity',
    pull_request: 'Pull Requests',
    ci: 'CI / Build',
    access: 'Access'
  };

  return (
    <>
      {Object.entries(groups).map(([cat, items]) =>
        items.length > 0 ? (
          <div key={cat} className="heartbeat-block heartbeat-block-issues">
            <span className="heartbeat-issue-group-title">{labels[cat]}</span>
            <ul>{items.map((issue, idx) => <li key={idx}>{issue.message}</li>)}</ul>
          </div>
        ) : null
      )}
    </>
  );
}

function ReportDetail({ report }: { report: HeartbeatReport }) {
  const products = report.products || [];
  return (
    <>
      <div className="heartbeat-report-meta card slide-in">
        <div className="heartbeat-report-meta-row">
          <span className="label">Report Date & Time</span>
          <span className="value">{formatDateTime(report.generatedAt)}</span>
        </div>
        <div className="heartbeat-report-meta-row">
          <span className="label">Trigger</span>
          <span className={`badge ${report.trigger === 'manual' ? 'badge-blue' : 'badge-purple'}`}>
            {report.trigger === 'manual' ? 'Manual Run' : 'Scheduled Run'}
          </span>
        </div>
        <div className="heartbeat-report-meta-row">
          <span className="label">Report ID</span>
          <span className="value mono">{report.id}</span>
        </div>
      </div>

      <div className="grid-2 heartbeat-products">
        {products.map((p, i) => {
          const openPrs = p.openPrs || [];
          const issues = p.issues || [];
          const recommendations = p.recommendations || [];
          const ci = p.ci || { available: false, conclusion: null, runAt: null };
          const branchActivity = p.branchActivity || [];
          const staleBranches = p.staleBranches || [];
          return (
          <div key={p.productId || i} className="card heartbeat-product-card slide-in" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="heartbeat-product-header">
              <div>
                <h3>{p.productName}</h3>
                <p className="mono text-muted heartbeat-scope">{p.owner}/{p.repo}</p>
              </div>
              <span className={`badge badge-${p.status === 'green' ? 'green' : p.status === 'yellow' ? 'yellow' : 'red'}`}>
                {statusLabel(p.status)}
              </span>
            </div>

            <div className="heartbeat-metrics">
              <div className="metric">
                <span className="label">Last Commit</span>
                <span className="value">
                  {p.lastCommit ? `${commitAgeText(p.lastCommit.daysAgo)} (${p.lastCommit.sha})` : '—'}
                </span>
              </div>
              <div className="metric">
                <span className="label">7-Day Commits</span>
                <span className="value">{p.commitsLast7Days}</span>
              </div>
              <div className="metric">
                <span className="label">Branches Checked</span>
                <span className="value">{p.branchesChecked || '—'}</span>
              </div>
              <div className="metric">
                <span className="label">Open PRs</span>
                <span className="value">{p.openPrCount}{p.stalePrCount > 0 ? ` (${p.stalePrCount} inactive)` : ''}</span>
              </div>
              <div className="metric">
                <span className="label">CI Status</span>
                <span className="value">
                  {!ci.available ? 'Not configured' : ci.conclusion === 'success' ? 'Passing' : ci.conclusion || 'Pending'}
                </span>
              </div>
            </div>

            {p.lastCommit && (
              <p className="heartbeat-commit-msg">"{p.lastCommit.message}" — @{p.lastCommit.author} on <span className="mono">{p.lastCommit.branch || p.defaultBranch}</span></p>
            )}

            {(branchActivity.length > 0 || staleBranches.length > 0) && (
              <div className="heartbeat-branch-list">
                <span className="label">Branch activity</span>
                {branchActivity.slice(0, 4).map(b => (
                  <div key={b.name} className="heartbeat-branch-item">
                    <span className="mono">{b.name}</span> — {commitAgeText(b.daysAgo)} ({b.sha})
                  </div>
                ))}
                {staleBranches.slice(0, 3).map(b => (
                  <div key={b.name} className="heartbeat-branch-item stale">
                    <span className="mono">{b.name}</span> — stale ({b.daysAgo}d)
                  </div>
                ))}
              </div>
            )}

            {openPrs.length > 0 && (
              <div className="heartbeat-pr-list">
                <span className="label">Open PRs</span>
                {openPrs.map(pr => (
                  <div key={pr.number} className="heartbeat-pr-item">
                    <span className="mono">#{pr.number}</span> {pr.title}
                    <span className="text-muted"> — @{pr.author}, {pr.daysOpen}d open{pr.daysSinceUpdate !== undefined ? `, updated ${pr.daysSinceUpdate}d ago` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {issues.length > 0 && <IssueGroups issues={issues} />}

            {recommendations.length > 0 && (
              <div className="heartbeat-block heartbeat-block-recs">
                <span className="heartbeat-block-title">Recommendations</span>
                <ul>{recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}</ul>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {report.aiReport && (
        <div className="card heartbeat-report slide-in">
          <div className="heartbeat-report-header">
            <h3>Detailed AI Report</h3>
            {report.aiError && (
              <span className="badge badge-yellow">Fallback template (AI unavailable)</span>
            )}
          </div>
          <div className="heartbeat-report-body">{renderReportMarkdown(report.aiReport)}</div>
        </div>
      )}
    </>
  );
}

export default function Heartbeat() {
  const [report, setReport] = useState<HeartbeatReport | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(() => {
    return apiFetch('/api/heartbeat/history')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data)
          ? data.map(normalizeHistoryItem).filter((x): x is HistoryItem => x !== null)
          : [];
        setHistory(items);
      })
      .catch(() => setHistory([]));
  }, []);

  const loadReport = useCallback(async (id: string) => {
    const res = await apiFetch(`/api/heartbeat/${id}`);
    if (!res.ok) throw new Error('Report not found');
    const data = await res.json();
    const normalized = normalizeReport(data);
    if (!normalized) throw new Error('Invalid report data');
    setReport(normalized);
    setSelectedId(id);
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/heartbeat/latest').then(r => r.json()),
      fetchHistory()
    ]).then(([latest]) => {
      const normalized = normalizeReport(latest);
      if (normalized) {
        setReport(normalized);
        setSelectedId(normalized.id);
      }
    }).catch(() => setError('Failed to load heartbeat data'))
      .finally(() => setLoading(false));
  }, [fetchHistory]);

  useEffect(() => {
    if (!running) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      return;
    }

    setProgress(0);
    setProgressLabel('Connecting to GitHub...');

    const stages = [
      { at: 15, label: 'Checking repository access...' },
      { at: 35, label: 'Analyzing commits and pull requests...' },
      { at: 55, label: 'Reviewing CI workflow status...' },
      { at: 72, label: 'Generating detailed AI report...' },
      { at: 88, label: 'Finalizing report...' }
    ];

    let current = 0;
    progressTimer.current = setInterval(() => {
      current = Math.min(current + 2 + Math.random() * 3, 92);
      setProgress(current);
      const stage = [...stages].reverse().find(s => current >= s.at);
      if (stage) setProgressLabel(stage.label);
    }, 400);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [running]);

  const handleRunNow = async () => {
    setRunning(true);
    setError(null);
    setProgressLabel('Starting heartbeat check...');
    try {
      const res = await apiFetch('/api/heartbeat/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate report');
      setProgress(100);
      setProgressLabel('Report complete!');
      const normalized = normalizeReport(data);
      if (normalized) {
        setReport(normalized);
        setSelectedId(normalized.id);
      }
      await fetchHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTimeout(() => setRunning(false), 600);
    }
  };

  const handleSelectReport = async (id: string) => {
    if (id === selectedId) return;
    setError(null);
    try {
      await loadReport(id);
    } catch {
      setError('Could not load that report');
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
            Repo health reports for onboarded products — activity, issues, and recommendations.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRunNow} disabled={running}>
          {running ? 'Generating...' : 'Generate Report Now'}
        </button>
      </div>

      {error && <div className="heartbeat-error slide-in">{error}</div>}

      <ScheduleSettings
        job="heartbeat"
        title="Heartbeat Schedule"
        description="Automatically run repo health checks on selected days. Changes apply immediately without restart."
      />

      {running && <LoadingBar progress={progress} label={progressLabel} />}

      <div className="heartbeat-layout">
        <aside className="heartbeat-history-panel card">
          <h3 className="heartbeat-history-title">Report History</h3>
          {history.length === 0 ? (
            <p className="text-muted heartbeat-history-empty">No reports yet. Run your first heartbeat check.</p>
          ) : (
            <ul className="heartbeat-history-list">
              {history.map(item => (
                <li key={item.id}>
                  <button
                    className={`heartbeat-history-item ${selectedId === item.id ? 'active' : ''}`}
                    onClick={() => handleSelectReport(item.id)}
                  >
                    <span className="heartbeat-history-datetime">{formatDateTime(item.generatedAt)}</span>
                    <span className={`badge badge-sm ${item.trigger === 'manual' ? 'badge-blue' : 'badge-purple'}`}>
                      {item.trigger === 'manual' ? 'Manual' : 'Scheduled'}
                    </span>
                    <span className="heartbeat-history-stats">
                      {(item.summary?.green ?? 0) > 0 && <span className="dot green">{item.summary.green}</span>}
                      {(item.summary?.yellow ?? 0) > 0 && <span className="dot yellow">{item.summary.yellow}</span>}
                      {(item.summary?.red ?? 0) > 0 && <span className="dot red">{item.summary.red}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="heartbeat-main">
          {!report && !running && (
            <div className="card heartbeat-empty slide-in">
              <p className="text-muted">No heartbeat report yet.</p>
              <p>Click <strong>Generate Report Now</strong> to check MeetingGenius, Janus, and other onboarded repos.</p>
            </div>
          )}

          {report && !running && <ReportDetail report={report} />}
        </div>
      </div>
    </div>
  );
}
