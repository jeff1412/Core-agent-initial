import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/',            icon: '⬡', label: 'Overview' },
  { to: '/health',      icon: '◎', label: 'Health Status' },
  { to: '/activity',   icon: '◈', label: 'Activity Feed' },
  { to: '/intake',      icon: '✦', label: 'Task Intake' },
  { to: '/pull-requests', icon: '⎇', label: 'Pull Requests' },
  { to: '/escalations', icon: '⚑', label: 'Escalations' },
  { to: '/products',    icon: '◻', label: 'Products' },
  { to: '/repositories', icon: '⚙', label: 'Repositories' },
];

export default function Sidebar() {
  const [escalationCount, setEscalationCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/escalations');
        const data = await res.json();
        setEscalationCount(data.length);
      } catch (e) {
        console.error('Failed to fetch escalation count:', e);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">A</div>
        <div className="brand-text">
          <span className="brand-name">ASC Agent</span>
          <span className="brand-sub">Service Dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.label === 'Escalations' && escalationCount > 0 && (
              <span className="nav-badge">{escalationCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-env-badge">
          <span className="status-dot green" />
          <span>Development</span>
        </div>
        <span className="sidebar-version">v1.1.0-TS</span>
      </div>
    </aside>
  );
}
