import { useState, useEffect } from 'react';

interface Escalation {
  id: string;
  timestamp: string;
  product: string;
  reason: string;
  module: string;
  recommendation: string;
}

export default function Escalations() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchEscalations();
  }, []);

  const fetchEscalations = () => {
    fetch('/api/escalations')
      .then(r => r.json())
      .then(data => {
        setEscalations(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch escalations', err);
        setLoading(false);
      });
  };

  const handleClear = (id) => {
    fetch(`/api/escalations/${id}`, { method: 'DELETE' })
      .then(() => fetchEscalations())
      .catch(err => console.error('Failed to clear escalation', err));
  };

  if (loading) return <div className="p-5 text-muted">Scanning for active escalations...</div>;

  return (
    <div className="escalations fade-in">
      {escalations.length === 0 ? (
        <div className="card flex-center" style={{ minHeight: '300px' }}>
          <p className="text-secondary text-center">No active escalations requiring review. Platform is operating safely.</p>
        </div>
      ) : (
        <div className="grid-1" style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {escalations.map((e, i) => (
            <div key={e.id} className="card slide-in" style={{ animationDelay: `${i * 100}ms`, borderLeft: '4px solid var(--status-red)' }}>
              <div className="card-header">
                <div className="flex items-center gap-3">
                  <span className="badge badge-red">Critical Escalation</span>
                  <span className="badge badge-grey">{e.product}</span>
                </div>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleClear(e.id)}
                >
                  Clear Alert
                </button>
              </div>
              
              <div style={{ marginTop: 'var(--space-4)' }}>
                <p className="form-label">Flagged Module / Source</p>
                <p className="mono" style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>{e.module}</p>
                
                <p className="form-label">Trigger Reason</p>
                <p style={{ marginBottom: 'var(--space-3)', fontWeight: 'var(--weight-medium)' }}>{e.reason}</p>
                
                <p className="form-label">Agent Recommendation</p>
                <div style={{ background: 'var(--bg-elevated)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  {e.recommendation}
                </div>
              </div>
              
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                Triggered: {new Date(e.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
