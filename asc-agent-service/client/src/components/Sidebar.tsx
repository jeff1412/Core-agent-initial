import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface NavItem {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/chat',        icon: '◈', label: 'Talk to Agent' },
  { to: '/health',      icon: '◎', label: 'Health Status' },
  { to: '/heartbeat',   icon: '♥', label: 'Heartbeat' },
  { to: '/intake',      icon: '✦', label: 'Task Intake' },
  { to: '/pull-requests', icon: '⎇', label: 'Pushes & PRs' },
  { to: '/repositories', icon: '⚙', label: 'Repositories' },
  { to: '/code-audit',   icon: '◉', label: 'Code Audit' },
  { to: '/ai-settings', icon: '✧', label: 'AI Settings' },
];

export default function Sidebar() {
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
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-env-badge">
          <span className="status-dot green" />
          <span>Production</span>
        </div>
        <span className="sidebar-version">v1.2.0-TS</span>
      </div>
    </aside>
  );
}
