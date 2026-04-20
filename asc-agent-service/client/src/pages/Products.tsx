import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  repo: string;
  channel: string;
  status: string;
  onboarded: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-4 text-muted">Loading product registry...</div>;
  }

  return (
    <div className="products fade-in">
      <div className="grid-3">
        {products.map((p, i) => (
          <div key={p.name} className="card slide-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="card-header">
              <h3 className="card-title">{p.name}</h3>
              <span className={`status-dot ${p.status === 'active' ? 'green' : 'yellow'}`} title={p.status} />
            </div>
            
            <div style={{ marginTop: 'var(--space-2)' }}>
              <p className="form-label" style={{ fontSize: '11px' }}>GitHub Repository</p>
              <p className="mono truncate" style={{ marginBottom: 'var(--space-3)' }}>{p.repo}</p>
              
              <p className="form-label" style={{ fontSize: '11px' }}>Mattermost Channel</p>
              <p className="mono" style={{ marginBottom: 'var(--space-4)' }}>{p.channel}</p>
              
              <div className="flex gap-2" style={{ marginBottom: 'var(--space-4)' }}>
                <span className="badge badge-green">AGENT.md ✅</span>
                <span className="badge badge-green">CODEBASE.md ✅</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)', fontSize: '11px' }}>
              <span className="text-muted">Onboarded: {p.onboarded}</span>
              <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>Config</button>
            </div>
          </div>
        ))}
        
      </div>
    </div>
  );
}
