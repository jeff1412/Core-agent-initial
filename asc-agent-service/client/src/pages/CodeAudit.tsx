import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../utils/api';
import ScheduleSettings from '../components/ScheduleSettings';
import { renderChatMarkdown } from '../utils/renderChatMarkdown';
import './CodeAudit.css';
import '../components/ScheduleSettings.css';
import '../utils/chatMarkdown.css';

interface CodeFileSnapshot {
  path: string;
  size: number;
  language: string | null;
  excerpt: string;
}

interface ProductCodeSnapshot {
  productId: string;
  productName: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  reachable: boolean;
  filesScanned: number;
  files: CodeFileSnapshot[];
  error: string | null;
}

interface FeatureCodeCheck {
  hash: string;
  message: string;
  filesTouched: string[];
  pathsMissingAtVersionB: string[];
  pathsPresentAtVersionB: string[];
  githubStatus: string;
}

interface VersionReleaseAnalysis {
  productId: string;
  productName: string;
  compare: {
    versionA: { version: string; title: string; monthLabel: string };
    versionB: { version: string; title: string; monthLabel: string };
    summary: {
      newFeaturesInB: number;
      featuresInANotInB: number;
    };
    newFeaturesInB: Array<{ hash: string; message: string }>;
    featuresInANotInB: Array<{ hash: string; message: string }>;
  };
  codeContext: {
    featureCodeChecks: FeatureCodeCheck[];
  };
}

interface CodeAuditReport {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  products: ProductCodeSnapshot[];
  aiReport: string | null;
  aiError: string | null;
  versionReleaseAnalysis?: VersionReleaseAnalysis[];
}

interface HistoryItem {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  summary: { products: number; filesScanned: number };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function featureCodeStatus(check: FeatureCodeCheck): 'intact' | 'partial' | 'missing' | 'unknown' {
  if (check.githubStatus !== 'ok') return 'unknown';
  if (check.filesTouched.length === 0) return 'unknown';
  if (check.pathsMissingAtVersionB.length === 0) return 'intact';
  if (check.pathsPresentAtVersionB.length === 0) return 'missing';
  return 'partial';
}

function ReleaseContinuityPanel({ analyses }: { analyses: VersionReleaseAnalysis[] }) {
  return (
    <div className="card code-audit-release slide-in">
      <h3>Release continuity (GitHub checks)</h3>
      <p className="text-muted text-sm">
        Last two monthly cycles on deploy branch — same logic as Version Insights chat.
      </p>
      {analyses.map(a => {
        const checkByHash = new Map(
          a.codeContext.featureCodeChecks.map(c => [c.hash, c])
        );
        return (
          <div key={a.productId} className="code-audit-release-product">
            <h4>
              {a.productName}: {a.compare.versionA.version} → {a.compare.versionB.version}
            </h4>
            <p className="text-muted text-sm">
              {a.compare.summary.newFeaturesInB} new feat(s) in {a.compare.versionB.version};{' '}
              {a.compare.summary.featuresInANotInB} changelog-only from {a.compare.versionA.version}
            </p>
            <div className="code-audit-release-grid">
              <div>
                <h5>New in {a.compare.versionB.version}</h5>
                <ul className="code-audit-release-list">
                  {a.compare.newFeaturesInB.slice(0, 8).map(f => (
                    <li key={f.hash}><span className="mono">{f.hash}</span> {f.message}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h5>In {a.compare.versionA.version}, not in {a.compare.versionB.version} changelog</h5>
                <ul className="code-audit-release-list">
                  {a.compare.featuresInANotInB.slice(0, 8).map(f => {
                    const check = checkByHash.get(f.hash);
                    const status = check ? featureCodeStatus(check) : 'unknown';
                    return (
                      <li key={f.hash}>
                        <span className={`code-audit-code-status code-audit-code-status--${status}`}>
                          {status}
                        </span>
                        <span className="mono">{f.hash}</span> {f.message}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportDetail({ report }: { report: CodeAuditReport }) {
  return (
    <>
      <div className="card code-audit-meta slide-in">
        <div className="code-audit-meta-row">
          <span className="label">Report Date</span>
          <span>{formatDateTime(report.generatedAt)}</span>
        </div>
        <div className="code-audit-meta-row">
          <span className="label">Trigger</span>
          <span className={`badge ${report.trigger === 'manual' ? 'badge-blue' : 'badge-purple'}`}>
            {report.trigger === 'manual' ? 'Manual Run' : 'Scheduled Run'}
          </span>
        </div>
      </div>

      <div className="grid-2">
        {report.products.map((p, i) => (
          <div key={p.productId || i} className="card code-audit-product slide-in">
            <h3>{p.productName}</h3>
            <p className="mono text-muted">{p.owner}/{p.repo}</p>
            <p className="code-audit-stat">{p.filesScanned} file(s) scanned on <span className="mono">{p.defaultBranch}</span></p>
            {p.error && <p className="code-audit-error-text">{p.error}</p>}
            {p.files.length > 0 && (
              <ul className="code-audit-file-list">
                {p.files.map(f => (
                  <li key={f.path}>
                    <span className="mono">{f.path}</span>
                    <span className="text-muted"> — {f.language || 'file'}, {f.size} chars</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {report.versionReleaseAnalysis && report.versionReleaseAnalysis.length > 0 && (
        <ReleaseContinuityPanel analyses={report.versionReleaseAnalysis} />
      )}

      {report.aiReport && (
        <div className="card code-audit-report slide-in">
          <div className="code-audit-report-header">
            <h3>AI Code Review</h3>
            {report.aiError && <span className="badge badge-yellow">Fallback / partial</span>}
          </div>
          <div className="code-audit-report-body chat-md">{renderChatMarkdown(report.aiReport)}</div>
        </div>
      )}
    </>
  );
}

export default function CodeAudit() {
  const [report, setReport] = useState<CodeAuditReport | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(() => {
    return apiFetch('/api/code-audit/history')
      .then(r => r.json())
      .then(data => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/code-audit/latest').then(r => r.json()),
      fetchHistory()
    ]).then(([latest]) => {
      if (latest && !latest.empty) {
        setReport(latest);
        setSelectedId(latest.id);
      }
    }).finally(() => setLoading(false));
  }, [fetchHistory]);

  useEffect(() => {
    if (!running) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      return;
    }
    setProgress(0);
    progressTimer.current = setInterval(() => {
      setProgress(p => Math.min(p + 4, 90));
    }, 500);
    return () => { if (progressTimer.current) clearInterval(progressTimer.current); };
  }, [running]);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await apiFetch('/api/code-audit/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code audit failed');
      setProgress(100);
      setReport(data);
      setSelectedId(data.id);
      await fetchHistory();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTimeout(() => setRunning(false), 500);
    }
  };

  const handleSelect = async (id: string) => {
    if (id === selectedId) return;
    try {
      const res = await apiFetch(`/api/code-audit/${id}`);
      const data = await res.json();
      setReport(data);
      setSelectedId(id);
    } catch {
      setError('Could not load report');
    }
  };

  if (loading) return <div className="p-4 text-muted">Loading code audit...</div>;

  return (
    <div className="code-audit fade-in">
      <div className="page-header-actions">
        <div>
          <h2 className="page-title">Code Audit</h2>
          <p className="text-muted">
            Scans actual source files inside repos and generates AI code quality reviews.
            MeetingGenius audits include the last 2 monthly release cycles from <span className="mono">main</span> (same as MG staging deploy).
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleRun} disabled={running}>
          {running ? 'Auditing...' : 'Run Code Audit Now'}
        </button>
      </div>

      {error && <div className="code-audit-error">{error}</div>}

      <ScheduleSettings
        job="codeAudit"
        title="Code Audit Schedule"
        description="Automatically scan source files and generate code review reports on selected days."
      />

      {running && (
        <div className="card code-audit-loading">
          <p>Scanning repositories and analyzing code... {Math.round(progress)}%</p>
          <div className="code-audit-progress"><div style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div className="code-audit-layout">
        <aside className="card code-audit-history">
          <h3>Report History</h3>
          {history.length === 0 ? (
            <p className="text-muted">No audits yet.</p>
          ) : (
            <ul>
              {history.map(item => (
                <li key={item.id}>
                  <button
                    className={selectedId === item.id ? 'active' : ''}
                    onClick={() => handleSelect(item.id)}
                  >
                    {formatDateTime(item.generatedAt)}
                    <span className="text-muted">{item.summary?.filesScanned || 0} files</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <div className="code-audit-main">
          {!report && !running && (
            <div className="card"><p className="text-muted">Run a code audit to review source files across onboarded repos.</p></div>
          )}
          {report && !running && <ReportDetail report={report} />}
        </div>
      </div>
    </div>
  );
}
