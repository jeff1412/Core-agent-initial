import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './AISettings.css';

type Provider = 'gemini' | 'openai' | 'anthropic';

interface ProviderStatus {
  model: string;
  configured: boolean;
  masked: string | null;
  isActive: boolean;
}

const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI GPT',
  anthropic: 'Anthropic Claude'
};

export default function AISettings() {
  const { apiFetch, refreshUser } = useAuth();
  const [activeProvider, setActiveProvider] = useState<Provider>('gemini');
  const [providers, setProviders] = useState<Record<Provider, ProviderStatus> | null>(null);
  const [modelOptions, setModelOptions] = useState<Record<Provider, string[]>>({
    gemini: [], openai: [], anthropic: []
  });
  const [keys, setKeys] = useState<Record<Provider, string>>({ gemini: '', openai: '', anthropic: '' });
  const [models, setModels] = useState<Record<Provider, string>>({ gemini: '', openai: '', anthropic: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    apiFetch('/api/llm-config')
      .then(r => r.json())
      .then(data => {
        setActiveProvider(data.activeProvider);
        setProviders(data.providers);
        setModelOptions(data.modelOptions);
        setModels({
          gemini: data.providers.gemini.model,
          openai: data.providers.openai.model,
          anthropic: data.providers.anthropic.model
        });
      });
  };

  useEffect(() => { load(); }, []);

  const handleActivate = async (provider: Provider) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch('/api/llm-config/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveProvider(provider);
      setProviders(data.providers);
      await refreshUser();
      setMessage({ type: 'success', text: `${PROVIDER_LABELS[provider]} is now active.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProvider = async (provider: Provider) => {
    setSaving(true);
    setMessage(null);
    try {
      const body: any = {
        providers: {
          [provider]: {
            model: models[provider]
          }
        }
      };
      if (keys[provider].trim()) {
        body.providers[provider].apiKey = keys[provider].trim();
      }
      const res = await apiFetch('/api/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProviders(data.providers);
      setKeys(prev => ({ ...prev, [provider]: '' }));
      setMessage({ type: 'success', text: `${PROVIDER_LABELS[provider]} settings saved.` });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!providers) {
    return <div className="p-4 text-muted">Loading AI settings...</div>;
  }

  return (
    <div className="ai-settings fade-in">
      <div className="page-header-actions">
        <div>
          <h2 className="page-title">AI Settings</h2>
          <p className="text-muted ai-settings-subtitle">
            Configure GPT, Gemini, and Claude. The active provider is used for Talk to Agent, Heartbeat reports, and Task Intake code generation.
          </p>
        </div>
      </div>

      {message && <div className={`ai-settings-message ${message.type}`}>{message.text}</div>}

      <div className="ai-settings-grid">
        {(['gemini', 'openai', 'anthropic'] as Provider[]).map(provider => (
          <div key={provider} className={`card ai-provider-card ${providers[provider].isActive ? 'active' : ''}`}>
            <div className="ai-provider-header">
              <h3>{PROVIDER_LABELS[provider]}</h3>
              {providers[provider].isActive ? (
                <span className="badge badge-green">Active</span>
              ) : (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleActivate(provider)}
                  disabled={saving || !providers[provider].configured}
                >
                  Set Active
                </button>
              )}
            </div>

            <div className="ai-provider-status">
              <span className="label">Status</span>
              <span className="value">
                {providers[provider].configured
                  ? `Configured ${providers[provider].masked || ''}`
                  : 'No API key'}
              </span>
            </div>

            <div className="form-group">
              <label>Model</label>
              <select
                className="form-select"
                value={models[provider]}
                onChange={e => setModels(prev => ({ ...prev, [provider]: e.target.value }))}
              >
                {(modelOptions[provider] || []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>API Key {providers[provider].configured && '(leave blank to keep current)'}</label>
              <input
                type="password"
                className="form-input"
                placeholder={provider === 'gemini' ? 'AIza...' : provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                value={keys[provider]}
                onChange={e => setKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                autoComplete="off"
              />
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleSaveProvider(provider)}
              disabled={saving}
            >
              Save {PROVIDER_LABELS[provider].split(' ')[1] || provider}
            </button>
          </div>
        ))}
      </div>

      <p className="text-muted ai-settings-note">
        Active provider: <strong>{PROVIDER_LABELS[activeProvider]}</strong> · {models[activeProvider]}
      </p>
    </div>
  );
}
