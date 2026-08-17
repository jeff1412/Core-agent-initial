import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Login from './pages/Login';
import HealthStatus from './pages/HealthStatus';
import Heartbeat from './pages/Heartbeat';
import TaskIntake from './pages/TaskIntake';
import PullRequests from './pages/PullRequests';
import Repositories from './pages/Repositories';
import AgentChat from './pages/AgentChat';
import CodeAudit from './pages/CodeAudit';
import AISettings from './pages/AISettings';
import './App.css';

function ProtectedShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="login-page"><p className="text-muted">Loading...</p></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="page-body">
          <Routes>
            <Route path="/"              element={<Navigate to="/chat" replace />} />
            <Route path="/chat"          element={<AgentChat />} />
            <Route path="/health"        element={<HealthStatus />} />
            <Route path="/heartbeat"     element={<Heartbeat />} />
            <Route path="/intake"        element={<TaskIntake />} />
            <Route path="/pull-requests" element={<PullRequests />} />
            <Route path="/repositories"  element={<Repositories />} />
            <Route path="/code-audit"    element={<CodeAudit />} />
            <Route path="/ai-settings"   element={<AISettings />} />
            <Route path="*"              element={<Navigate to="/chat" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<ProtectedShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page"><p className="text-muted">Loading...</p></div>;
  if (user) return <Navigate to="/chat" replace />;
  return <Login />;
}
