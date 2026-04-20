import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Overview from './pages/Overview';
import HealthStatus from './pages/HealthStatus';
import ActivityFeed from './pages/ActivityFeed';
import TaskIntake from './pages/TaskIntake';
import PullRequests from './pages/PullRequests';
import Escalations from './pages/Escalations';
import Products from './pages/Products';
import Repositories from './pages/Repositories';
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
              <Route path="/"              element={<Overview />} />
              <Route path="/health"        element={<HealthStatus />} />
              <Route path="/activity"      element={<ActivityFeed />} />
              <Route path="/intake"        element={<TaskIntake />} />
              <Route path="/pull-requests" element={<PullRequests />} />
              <Route path="/escalations"   element={<Escalations />} />
              <Route path="/products"      element={<Products />} />
              <Route path="/repositories"  element={<Repositories />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
