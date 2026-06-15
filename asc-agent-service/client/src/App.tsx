import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import HealthStatus from './pages/HealthStatus';
import TaskIntake from './pages/TaskIntake';
import PullRequests from './pages/PullRequests';
import Repositories from './pages/Repositories';
import AgentChat from './pages/AgentChat';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <div className="main-content">
          <TopBar />
          <main className="page-body">
            <Routes>
              <Route path="/"              element={<Navigate to="/chat" replace />} />
              <Route path="/chat"          element={<AgentChat />} />
              <Route path="/health"        element={<HealthStatus />} />
              <Route path="/intake"        element={<TaskIntake />} />
              <Route path="/pull-requests" element={<PullRequests />} />
              <Route path="/repositories"  element={<Repositories />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
