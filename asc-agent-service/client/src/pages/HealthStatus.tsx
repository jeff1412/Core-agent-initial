import { useState, useEffect } from 'react';
import './HealthStatus.css';

interface HealthData {
  agentService: 'green' | 'yellow' | 'red' | 'grey';
  github: 'green' | 'yellow' | 'red' | 'grey';
  claude: 'green' | 'yellow' | 'red' | 'grey';
  timestamp: string;
}

export default function HealthStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHealth = () => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Health check failed', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4 text-muted">Pinging platform infrastructure...</div>;
  }

  const services = [
    { 
      name: 'ASC Agent Service', 
      description: 'Core orchestration engine (Express)',
      status: health?.agentService || 'red', 
      latency: '12ms', 
      endpoint: 'http://localhost:3000/api/health'
    },
    { 
      name: 'GitHub API (Octokit)', 
      description: 'Context fetching & PR writing',
      status: health?.github || 'grey', 
      latency: '---', 
      endpoint: 'https://api.github.com'
    },
    { 
      name: 'Claude API (Anthropic)', 
      description: 'AI reasoning & code generation',
      status: health?.claude || 'grey', 
      latency: '---', 
      endpoint: 'https://api.anthropic.com/v1/messages'
    },
  ];

  return (
    <div className="health-status fade-in">
      <div className="grid-1">
        {services.map((s, i) => (
          <div key={s.name} className="card health-card slide-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="health-card-header">
              <div className="health-info">
                <h3>{s.name}</h3>
                <p>{s.description}</p>
              </div>
              <div className="health-status-indicator">
                <span className={`badge badge-${s.status === 'green' ? 'green' : s.status === 'yellow' ? 'yellow' : 'red'}`}>
                  {s.status === 'green' ? 'OPERATIONAL' : s.status === 'yellow' ? 'MISSING KEY' : 'OFFLINE'}
                </span>
                <span className={`status-dot ${s.status}`} />
              </div>
            </div>
            
            <div className="health-metrics">
              <div className="metric">
                <span className="label">Endpoint</span>
                <span className="value truncate mono" title={s.endpoint}>{s.endpoint}</span>
              </div>
              <div className="metric">
                <span className="label">Last Heartbeat</span>
                <span className="value">{new Date(health?.timestamp).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
