import { useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './TopBar.css';

interface PageTitle {
  title: string;
  subtitle: string;
}

const PAGE_TITLES: Record<string, PageTitle> = {
  '/chat':          { title: 'Talk to Agent',   subtitle: 'Direct interface with the ASC Core Agent' },
  '/health':        { title: 'Health Status',   subtitle: 'Live service connection status' },
  '/heartbeat':     { title: 'Heartbeat',         subtitle: 'Repo health reports for onboarded products' },
  '/intake':        { title: 'Task Intake',      subtitle: 'Submit tasks and view task history' },
  '/pull-requests': { title: 'Pull Requests',   subtitle: 'All Draft PRs created by the agent' },
  '/repositories':  { title: 'Repository Management', subtitle: 'Manage onboarded GitHub repositories' },
  '/code-audit':    { title: 'Code Audit',      subtitle: 'AI review of source files inside repositories' },
  '/ai-settings':   { title: 'AI Settings',     subtitle: 'Configure GPT, Gemini, and Claude' },
};

export default function TopBar() {
  const { pathname } = useLocation();
  const page = PAGE_TITLES[pathname] || { title: 'ASC Agent Service', subtitle: '' };
  const { user, activeLlm, logout, apiFetch } = useAuth();

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New passwords do not match');
      return;
    }
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPasswordMsg('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setShowPasswordModal(false); setPasswordMsg(''); }, 1200);
    } catch (err: any) {
      setPasswordMsg(err.message);
    }
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <h1 className="topbar-title">{page.title}</h1>
          {page.subtitle && <span className="topbar-subtitle">{page.subtitle}</span>}
        </div>
        <div className="topbar-right">
          {activeLlm && <span className="topbar-llm-badge mono">{activeLlm}</span>}
          <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDarkMode ? '☼' : '☾'}
          </button>
          <span className="topbar-time mono">{formattedTime}</span>
          <div className="topbar-divider" />
          <div className="topbar-user-wrap" ref={menuRef}>
            <button className="topbar-user" onClick={() => setShowUserMenu(v => !v)}>
              <div className="avatar">{initial}</div>
              <span>{user?.name || 'User'}</span>
            </button>
            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-dropdown-info">
                  <span className="mono">{user?.email}</span>
                </div>
                <button onClick={() => { setShowPasswordModal(true); setShowUserMenu(false); }}>
                  Change Password
                </button>
                <button onClick={() => logout()}>Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="btn-icon" onClick={() => setShowPasswordModal(false)}>✕</button>
            </div>
            <form onSubmit={handleChangePassword} className="modal-body">
              {passwordMsg && <div className="password-msg">{passwordMsg}</div>}
              <div className="form-group">
                <label>Current Password</label>
                <input type="password" className="form-input" value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" className="form-input" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" className="form-input" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
