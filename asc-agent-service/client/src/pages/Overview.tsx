import { useState, useEffect } from 'react';
import './Overview.css';

interface Product {
  name: string;
}

interface ActivityEvent {
  type: string;
  message: string;
  timestamp: string;
  metadata?: {
    product?: string;
  };
}

export default function Overview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/events').then(r => r.json())
    ]).then(([productsData, eventsData]) => {
      setProducts(productsData);
      setEvents(eventsData);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to fetch overview data', err);
      setLoading(false);
    });
  }, []);

  const stats = [
    { label: 'Tasks Processed',  value: events.filter(e => e.type === 'success').length,  sub: 'Recent sessions', accent: 'blue' },
    { label: 'Draft PRs Opened', value: events.filter(e => e.message.includes('Draft PR')).length, sub: 'Auto-generated', accent: 'green' },
    { label: 'Escalations',      value: events.filter(e => e.type === 'error' || e.type === 'warning' && e.message.includes('Escalation')).length, sub: 'Human attention', accent: 'yellow' },
    { label: 'Products Active',  value: products.length, sub: products.map(p => p.name).join(' + '), accent: 'blue' },
  ];

  const recentEvents = events.slice(0, 5);

  const services = [
    { name: 'ASC Agent Service', status: 'green', label: 'Operational' },
    { name: 'Dashboard UI', status: 'green', label: 'Connected' },
    { name: 'API Engine', status: 'green', label: 'Ready' },
  ];

  if (loading) {
    return <div className="p-4 text-muted">Synchronizing platform data...</div>;
  }

  return (
    <div className="overview fade-in">
      <div className="grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        {stats.map((s) => (
          <div key={s.label} className="card stat-card">
            <p className="stat-label">{s.label}</p>
            <p className={`stat-value accent-${s.accent}`}>{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Activity</span>
            <a href="/activity" className="btn btn-secondary btn-sm">View all</a>
          </div>
          <div className="activity-list">
            {recentEvents.length === 0 ? (
              <p className="text-center p-5 text-muted">No activity yet. Engine is idle.</p>
            ) : (
              recentEvents.map((e, i) => (
                <div key={i} className="activity-row slide-in">
                  <span className={`status-dot ${e.type === 'success' ? 'green' : e.type === 'info' ? 'blue' : e.type === 'warning' ? 'yellow' : 'red'}`} />
                  <div className="activity-body">
                    <p className="activity-text">{e.message}</p>
                    <p className="activity-meta">
                      <span className={`badge badge-grey`}>{e.metadata?.product || 'SYSTEM'}</span>
                      <span className="mono">{new Date(e.timestamp).toLocaleTimeString()}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Service Health</span>
            <a href="/health" className="btn btn-secondary btn-sm">Details</a>
          </div>
          <div className="service-list">
            {services.map((s) => (
              <div key={s.name} className="service-row">
                <span className={`status-dot ${s.status}`} />
                <span className="service-name">{s.name}</span>
                <span className={`badge badge-${s.status === 'green' ? 'green' : 'red'} ml-auto`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="card-header" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="quick-actions">
            <a href="/intake" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              ✦ Submit New Task Brief
            </a>
            <a href="/pull-requests" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              ⎇ View Draft Pull Requests
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
