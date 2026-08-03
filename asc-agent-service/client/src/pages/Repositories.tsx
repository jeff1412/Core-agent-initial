import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import './Repositories.css';

interface Product {
  id: string;
  name: string;
  owner?: string;
  repo: string;
  channel: string;
  status: string;
  onboarded: string;
}

interface GithubTokenStatus {
  configured: boolean;
  source: 'dashboard' | 'env' | null;
  username: string | null;
  updatedAt: string | null;
  masked: string | null;
  hasDashboardToken: boolean;
  hasEnvFallback: boolean;
}

export default function Repositories() {
  const [repos, setRepos] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: '', owner: '', repo: '', channel: '' });
  const [newRepo, setNewRepo] = useState({ name: '', owner: '', repo: '', channel: '' });

  const [tokenStatus, setTokenStatus] = useState<GithubTokenStatus | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showTokenField, setShowTokenField] = useState(false);

  const fetchTokenStatus = () => {
    apiFetch('/api/github-token')
      .then(res => res.json())
      .then(data => setTokenStatus(data))
      .catch(() => setTokenStatus(null));
  };

  const fetchRepos = () => {
    setLoading(true);
    apiFetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setRepos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch repos:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRepos();
    fetchTokenStatus();
  }, []);

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setTokenSaving(true);
    setTokenMessage(null);
    try {
      const res = await apiFetch('/api/github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save token');

      setTokenMessage({ type: 'success', text: `Token saved — authorized as @${data.username}` });
      setTokenInput('');
      setShowTokenField(false);
      setTokenStatus(data.status);
    } catch (err: any) {
      setTokenMessage({ type: 'error', text: err.message });
    } finally {
      setTokenSaving(false);
    }
  };

  const handleRemoveToken = async () => {
    if (!confirm('Remove the dashboard GitHub token? The server will fall back to .env if configured.')) return;

    setTokenSaving(true);
    setTokenMessage(null);
    try {
      const res = await apiFetch('/api/github-token', { method: 'DELETE' });
      const data = await res.json();
      setTokenStatus(data.status);
      setTokenMessage({ type: 'success', text: 'Dashboard token removed.' });
      setTokenInput('');
    } catch {
      setTokenMessage({ type: 'error', text: 'Failed to remove token' });
    } finally {
      setTokenSaving(false);
    }
  };

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRepo)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewRepo({ name: '', owner: '', repo: '', channel: '' });
        fetchRepos();
      }
    } catch (err) {
      console.error('Failed to add repo:', err);
    }
  };

  const handleDeleteRepo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this repository?')) return;
    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (err) {
      console.error('Failed to delete repo:', err);
    }
  };

  const openEditModal = (repo: Product) => {
    setEditingRepo(repo);
    setEditForm({
      name: repo.name,
      owner: repo.owner || '',
      repo: repo.repo,
      channel: repo.channel
    });
    setShowEditModal(true);
  };

  const handleEditRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRepo) return;
    try {
      const res = await apiFetch(`/api/products/${editingRepo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        setShowEditModal(false);
        setEditingRepo(null);
        fetchRepos();
      }
    } catch (err) {
      console.error('Failed to update repo:', err);
    }
  };

  if (loading) {
    return <div className="p-4 text-muted">Loading repository registry...</div>;
  }

  return (
    <div className="repositories fade-in">
      <div className="page-header-actions">
        <h2 className="page-title">Repository Management</h2>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Repository
        </button>
      </div>

      <div className="card github-token-card slide-in">
        <div className="github-token-header">
          <div>
            <h3 className="github-token-title">GitHub Access Token</h3>
            <p className="text-muted github-token-desc">
              Used for Pushes & PRs, Heartbeat, and agent GitHub operations. Dashboard token overrides the server .env token.
            </p>
          </div>
          {tokenStatus?.configured && (
            <span className={`badge ${tokenStatus.source === 'dashboard' ? 'badge-green' : 'badge-blue'}`}>
              {tokenStatus.source === 'dashboard' ? 'Dashboard Token' : 'Server .env Token'}
            </span>
          )}
        </div>

        <div className="github-token-status">
          {tokenStatus?.configured ? (
            <>
              <div className="github-token-status-row">
                <span className="label">Authorized as</span>
                <span className="value mono">@{tokenStatus.username || 'unknown'}</span>
              </div>
              {tokenStatus.masked && (
                <div className="github-token-status-row">
                  <span className="label">Token</span>
                  <span className="value mono">{tokenStatus.masked}</span>
                </div>
              )}
              {tokenStatus.updatedAt && tokenStatus.source === 'dashboard' && (
                <div className="github-token-status-row">
                  <span className="label">Last updated</span>
                  <span className="value">{new Date(tokenStatus.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted github-token-none">No GitHub token configured. Add one below or set GITHUB_TOKEN in server .env.</p>
          )}
        </div>

        {tokenMessage && (
          <div className={`github-token-message ${tokenMessage.type}`}>{tokenMessage.text}</div>
        )}

        {showTokenField ? (
          <form onSubmit={handleSaveToken} className="github-token-form">
            <div className="form-group">
              <label>Personal Access Token</label>
              <input
                type="password"
                className="form-input"
                placeholder="ghp_... or github_pat_..."
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                autoComplete="off"
                required
              />
              <p className="form-hint">Needs <code>repo</code> scope to read private repositories. Token is stored on the server only — never shown again after saving.</p>
            </div>
            <div className="github-token-actions">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowTokenField(false); setTokenInput(''); }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={tokenSaving || !tokenInput.trim()}>
                {tokenSaving ? 'Verifying...' : 'Save Token'}
              </button>
            </div>
          </form>
        ) : (
          <div className="github-token-actions">
            <button className="btn btn-primary" onClick={() => setShowTokenField(true)}>
              {tokenStatus?.hasDashboardToken ? 'Update Token' : 'Add GitHub Token'}
            </button>
            {tokenStatus?.hasDashboardToken && (
              <button className="btn btn-secondary" onClick={handleRemoveToken} disabled={tokenSaving}>
                Remove Dashboard Token
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid-3">
        {repos.map((r, i) => (
          <div key={r.id} className="card slide-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="card-header">
              <h3 className="card-title">{r.name}</h3>
              <div className="flex gap-2">
                 <span className={`status-dot ${r.status === 'active' ? 'green' : 'yellow'}`} title={r.status} />
                 <button
                  className="btn-icon"
                  onClick={() => openEditModal(r)}
                  title="Edit Repository"
                >
                  ✎
                </button>
                 <button 
                  className="btn-icon text-error" 
                  onClick={() => handleDeleteRepo(r.id)}
                  title="Delete Repository"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: 'var(--space-2)' }}>
              <p className="form-label" style={{ fontSize: '11px' }}>GitHub Scope</p>
              <p className="mono truncate" style={{ marginBottom: 'var(--space-3)' }}>
                <span className="text-muted">{r.owner || 'default'}/</span>{r.repo}
              </p>
              
              <p className="form-label" style={{ fontSize: '11px' }}>Mattermost Channel</p>
              <p className="mono" style={{ marginBottom: 'var(--space-4)' }}>{r.channel}</p>
            </div>
            
            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', fontSize: '11px' }}>
              <span className="text-muted">Onboarded: {r.onboarded}</span>
              <span className={`badge ${tokenStatus?.configured ? 'badge-green' : 'badge-yellow'}`}>
                {tokenStatus?.configured ? 'Onboarded' : 'No Token'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showEditModal && editingRepo && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Repository</h3>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditRepo} className="modal-body">
              <div className="form-group">
                <label>Display Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>GitHub Owner / Org</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. asccreative"
                  value={editForm.owner}
                  onChange={e => setEditForm({ ...editForm, owner: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>GitHub Repo Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. meetinggenius2"
                  value={editForm.repo}
                  onChange={e => setEditForm({ ...editForm, repo: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mattermost Channel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. #dev-alerts"
                  value={editForm.channel}
                  onChange={e => setEditForm({ ...editForm, channel: e.target.value })}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Onboard New Repository</h3>
              <button className="btn-icon" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddRepo} className="modal-body">
              <div className="form-group">
                <label>Display Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Core Agent Engine"
                  value={newRepo.name}
                  onChange={e => setNewRepo({...newRepo, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>GitHub Owner / Org</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. asccreative"
                  value={newRepo.owner}
                  onChange={e => setNewRepo({...newRepo, owner: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>GitHub Repo Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. meetinggenius2"
                  value={newRepo.repo}
                  onChange={e => setNewRepo({...newRepo, repo: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Mattermost Channel</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. #dev-alerts"
                  value={newRepo.channel}
                  onChange={e => setNewRepo({...newRepo, channel: e.target.value})}
                  required
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Repository</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
