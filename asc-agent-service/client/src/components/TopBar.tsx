import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './TopBar.css';

interface PageTitle {
  title: string;
  subtitle: string;
}

/* Maps route paths to human-readable page titles */
const PAGE_TITLES: Record<string, PageTitle> = {
  '/chat':          { title: 'Talk to Agent',   subtitle: 'Direct interface with the ASC Core Agent' },
  '/health':        { title: 'Health Status',   subtitle: 'Live service connection status' },
  '/heartbeat':     { title: 'Heartbeat',         subtitle: 'Repo health reports for onboarded products' },
  '/intake':        { title: 'Task Intake',      subtitle: 'Submit a new task brief to the agent' },
  '/pull-requests': { title: 'Pull Requests',   subtitle: 'All Draft PRs created by the agent' },
  '/repositories':  { title: 'Repository Management', subtitle: 'Manage onboarded GitHub repositories' },
};

export default function TopBar() {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || { title: 'ASC Agent Service', subtitle: '' };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">{page.title}</h1>
        {page.subtitle && (
          <span className="topbar-subtitle">{page.subtitle}</span>
        )}
      </div>
      <div className="topbar-right">
        <button 
          className="theme-toggle" 
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? '☼' : '☾'}
        </button>
        <span className="topbar-time mono">{formattedTime}</span>
        <div className="topbar-divider" />
        <div className="topbar-user">
          <div className="avatar">T</div>
          <span>Tim</span>
        </div>
      </div>
    </header>
  );
}
