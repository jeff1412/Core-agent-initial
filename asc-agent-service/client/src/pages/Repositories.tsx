import React, { useState, useEffect } from 'react';
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

export default function Repositories() {
  const [repos, setRepos] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRepo, setNewRepo] = useState({ name: '', owner: '', repo: '', channel: '' });

  const fetchRepos = () => {
    setLoading(true);
    fetch('/api/products')
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
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
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
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchRepos();
      }
    } catch (err) {
      console.error('Failed to delete repo:', err);
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

      <div className="grid-3">
        {repos.map((r, i) => (
          <div key={r.id} className="card slide-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="card-header">
              <h3 className="card-title">{r.name}</h3>
              <div className="flex gap-2">
                 <span className={`status-dot ${r.status === 'active' ? 'green' : 'yellow'}`} title={r.status} />
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
              <span className="badge badge-green">Connected</span>
            </div>
          </div>
        ))}
      </div>

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
                  placeholder="e.g. jeff1412"
                  value={newRepo.owner}
                  onChange={e => setNewRepo({...newRepo, owner: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>GitHub Repo Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Core-agent-initial"
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
