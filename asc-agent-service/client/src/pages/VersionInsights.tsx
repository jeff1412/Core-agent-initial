import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './VersionInsights.css';
import './AgentChat.css';

interface ProductOption {
  id: string;
  name: string;
  enabled: boolean;
  comingSoon: boolean;
}

interface MonthOption {
  key: string;
  label: string;
  version: string;
  count: number;
}

interface CompareResult {
  versionA: { version: string; title: string; monthLabel: string };
  versionB: { version: string; title: string; monthLabel: string };
  summary: {
    newFeaturesInB: number;
    featuresInANotInB: number;
    newFixesInB: number;
    fixesInANotInB: number;
  };
  newFeaturesInB: Array<{ hash: string; message: string }>;
  featuresInANotInB: Array<{ hash: string; message: string }>;
}

interface ChatMessage {
  role: 'user' | 'agent' | 'error';
  text: string;
}

export default function VersionInsights() {
  const { activeLlm } = useAuth();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState('meetinggenius');
  const [months, setMonths] = useState<MonthOption[]>([]);
  const [monthKeyA, setMonthKeyA] = useState('');
  const [monthKeyB, setMonthKeyB] = useState('');
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [loadingChangelog, setLoadingChangelog] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'agent',
      text: 'Select two monthly releases (same labels as MeetingGenius System Version & Changelog), then ask what changed or what might be missing between them.'
    }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const selectedProduct = products.find(p => p.id === productId);
  const productEnabled = selectedProduct?.enabled === true;

  useEffect(() => {
    apiFetch('/api/product-versions/products')
      .then(r => r.json())
      .then(setProducts)
      .catch(() => setError('Could not load products'));
  }, []);

  const loadChangelog = useCallback(async (id: string, refresh = false) => {
    setLoadingChangelog(true);
    setError('');
    setCompare(null);
    try {
      const qs = refresh ? '?refresh=1' : '';
      const res = await apiFetch(`/api/product-versions/${id}/changelog${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load changelog');
      const opts: MonthOption[] = (data.availableMonths || []).map((m: MonthOption) => m);
      setMonths(opts);
      if (opts.length >= 2) {
        setMonthKeyB(opts[0].key);
        setMonthKeyA(opts[1].key);
      } else if (opts.length === 1) {
        setMonthKeyA(opts[0].key);
        setMonthKeyB(opts[0].key);
      }
    } catch (e: any) {
      setError(e.message);
      setMonths([]);
    } finally {
      setLoadingChangelog(false);
    }
  }, []);

  useEffect(() => {
    if (!productId || !productEnabled) return;
    loadChangelog(productId);
  }, [productId, productEnabled, loadChangelog]);

  const runCompare = async () => {
    if (!productEnabled || !monthKeyA || !monthKeyB) return;
    setLoadingCompare(true);
    setError('');
    try {
      const res = await apiFetch(`/api/product-versions/${productId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthKeyA, monthKeyB })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Compare failed');
      setCompare(data);
    } catch (e: any) {
      setError(e.message);
      setCompare(null);
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    if (productEnabled && monthKeyA && monthKeyB && monthKeyA !== monthKeyB) {
      runCompare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKeyA, monthKeyB, productId, productEnabled]);

  const handleSend = async () => {
    if (!input.trim() || chatLoading || !compare || monthKeyA === monthKeyB) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'error')
        .slice(1)
        .map(m => ({ role: m.role as 'user' | 'agent', text: m.text }));

      const res = await apiFetch(`/api/product-versions/${productId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          userMessage,
          monthKeyA,
          monthKeyB
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      setMessages(prev => [...prev, { role: 'agent', text: data.text }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'error', text: e.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  const monthLabel = (key: string) => {
    const m = months.find(x => x.key === key);
    return m ? `${m.version} — ${m.label}` : key;
  };

  return (
    <div className="version-insights fade-in">
      <div className="page-header-actions">
        <div>
          <h2 className="page-title">Version Insights</h2>
          <p className="text-muted">
            Monthly release cycles aligned with MeetingGenius changelog (deploy branch: main). Changelog-only compare — no code diff.
          </p>
        </div>
      </div>

      {error && <div className="code-audit-error">{error}</div>}

      <div className="card slide-in">
        <div className="version-insights-controls">
          <div className="form-group">
            <label>Product</label>
            <select
              className="form-input"
              value={productId}
              onChange={e => setProductId(e.target.value)}
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.comingSoon ? ' (coming soon)' : ''}
                </option>
              ))}
            </select>
          </div>
          {productEnabled && (
            <>
              <div className="form-group">
                <label>Version A (older)</label>
                <select
                  className="form-input"
                  value={monthKeyA}
                  onChange={e => setMonthKeyA(e.target.value)}
                  disabled={loadingChangelog}
                >
                  {months.map(m => (
                    <option key={m.key} value={m.key}>{m.version} — {m.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Version B (newer)</label>
                <select
                  className="form-input"
                  value={monthKeyB}
                  onChange={e => setMonthKeyB(e.target.value)}
                  disabled={loadingChangelog}
                >
                  {months.map(m => (
                    <option key={m.key} value={m.key}>{m.version} — {m.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => loadChangelog(productId, true)}
                disabled={loadingChangelog}
              >
                {loadingChangelog ? 'Refreshing…' : 'Refresh changelog'}
              </button>
            </>
          )}
        </div>

        {!productEnabled && selectedProduct?.comingSoon && (
          <div className="version-insights-coming-soon">
            <p><strong>{selectedProduct.name}</strong> monthly version compare is coming soon.</p>
            <p className="text-muted">MeetingGenius is available now.</p>
          </div>
        )}
      </div>

      {productEnabled && compare && (
        <div className="card slide-in">
          <h3 className="mb-2">
            {compare.versionA.version} → {compare.versionB.version}
          </h3>
          <p className="text-muted text-sm">
            {compare.versionA.title} vs {compare.versionB.title}
          </p>
          <div className="version-compare-summary">
            <span className="version-stat-pill feat">+{compare.summary.newFeaturesInB} new features in B</span>
            <span className="version-stat-pill missing">{compare.summary.featuresInANotInB} features in A not in B</span>
            <span className="version-stat-pill">+{compare.summary.newFixesInB} fixes in B</span>
          </div>
          <div className="version-insights-layout mt-4">
            <div className="version-compare-panel">
              <h4>New features in {compare.versionB.version}</h4>
              <ul className="version-compare-list">
                {compare.newFeaturesInB.slice(0, 12).map(c => (
                  <li key={c.hash}><span className="mono">{c.hash}</span> {c.message}</li>
                ))}
                {compare.newFeaturesInB.length === 0 && <li className="text-muted">None detected by changelog match.</li>}
              </ul>
            </div>
            <div className="version-compare-panel">
              <h4>Features in {compare.versionA.version} not in {compare.versionB.version}</h4>
              <ul className="version-compare-list">
                {compare.featuresInANotInB.slice(0, 12).map(c => (
                  <li key={c.hash}><span className="mono">{c.hash}</span> {c.message}</li>
                ))}
                {compare.featuresInANotInB.length === 0 && <li className="text-muted">None — all A features appear reflected in B.</li>}
              </ul>
            </div>
          </div>
          {loadingCompare && <p className="text-muted text-sm mt-2">Updating compare…</p>}
        </div>
      )}

      {productEnabled && monthKeyA && monthKeyB && monthKeyA !== monthKeyB && (
        <div className="card version-insights-chat slide-in">
          <div className="chat-header">
            <div className="agent-info">
              <span className="status-dot green" />
              <span className="agent-name">Version Compare Chat</span>
              <span className="model-badge">{activeLlm || 'Configure AI in settings'}</span>
            </div>
            <span className="text-muted text-sm">{monthLabel(monthKeyA)} ↔ {monthLabel(monthKeyB)}</span>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>{m.text}</div>
            ))}
            {chatLoading && <div className="message agent">Thinking…</div>}
          </div>
          <div className="chat-input-row">
            <input
              className="form-input"
              placeholder="e.g. Summarize what's new and what might be missing from the older release…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              disabled={chatLoading || !compare}
            />
            <button className="btn btn-primary" onClick={handleSend} disabled={chatLoading || !compare}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
