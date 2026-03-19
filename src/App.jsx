import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import FacultyDashboard from './pages/FacultyDashboard';
import HODDashboard from './pages/HODDashboard';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import { ShieldCheck } from 'lucide-react';

const Protected = ({ children, role }) => {
  const { user, loading } = useApp();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', gap: '1.5rem' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--primary)', boxShadow: '0 0 50px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
            <ShieldCheck size={40} color="white" />
        </div>
        <div style={{ letterSpacing: '2px', fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-muted)' }}>[ SECURITY_PROTOCOL_VERIFYING ]</div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return <div className="app-container"><Sidebar /><main className="main-content">{children}</main></div>;
};

const Home = () => {
    const { user } = useApp();
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'admin') return <Navigate to="/admin" />;
    if (user.role === 'hod') return <Navigate to="/hod" />;
    return <Navigate to="/faculty" />;
};

function App() {
  return (
    <Router>
      <AppProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/faculty" element={<Protected role="faculty"><FacultyDashboard /></Protected>} />
          <Route path="/hod" element={<Protected role="hod"><HODDashboard /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
          <Route path="/history" element={<Protected><History /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/" element={<Home />} />
        </Routes>
      </AppProvider>
    </Router>
  );
}

export default App;
