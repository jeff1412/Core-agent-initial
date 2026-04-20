import { useState, useEffect } from 'react';
import './ActivityFeed.css';

interface ActivityEvent {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export default function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEvents = () => {
    fetch('/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => console.error('Failed to fetch events:', err));
  };

  useEffect(() => {
    fetchEvents();
    // Refresh every 5 seconds to feel live
    const interval = setInterval(fetchEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4 text-muted">Awaiting connection to signal stream...</div>;
  }

  return (
    <div className="activity-feed fade-in">
      <div className="card feed-container">
        <div className="feed-header">
          <div className="feed-status">
            <span className="status-dot green" />
            <span>Streaming Live Activity</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setEvents([])}>Clear UI</button>
        </div>
        
        <div className="feed-scroll">
          {events.length === 0 ? (
            <div className="text-center p-5 text-muted">
              No recent activity. Submit a task in Mattermost to see the engine in action.
            </div>
          ) : (
            events.map((e, i) => (
              <div key={e.id} className="feed-item slide-in">
                <div className="feed-time mono">
                  {new Date(e.timestamp).toLocaleTimeString()}
                </div>
                <div className={`feed-indicator ${e.type}`} />
                <div className="feed-content">
                  <div className="feed-meta">
                    <span className={`badge badge-grey`}>
                      {e.metadata?.product || 'SYSTEM'}
                    </span>
                    <span className={`feed-type-label color-${e.type}`}>
                      {e.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="feed-message">{e.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
