import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import SecurityInfo from './pages/SecurityInfo';
import Agreement from './pages/Agreement';
import { ShieldCheck } from 'lucide-react';

const Protected = ({ children, role }) => {
  const { user, loading, activeFY } = useApp();
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', gap: '1.25rem', padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))', boxSizing: 'border-box' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
            <ShieldCheck size={28} color="white" />
        </div>
        <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>Verifying Security...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  
  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        {activeFY && (
          <div className="session-badge" style={{ 
            marginBottom: '1.5rem', 
            fontSize: '11px'
          }}>
            ACTIVE SESSION &bull; FY {activeFY.name}
          </div>
        )}
        {children}
      </main>
    </div>
  );
};

const Home = () => {
    const { user, loading } = useApp();
    if (loading) return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', gap: '1.25rem', padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))', boxSizing: 'border-box' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '12px', background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
                <ShieldCheck size={28} color="white" />
            </div>
            <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>Synchronizing Access...</div>
        </div>
    );

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
          <Route path="/hod" element={<Protected role="hod"><AdminDashboard /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
          <Route path="/history" element={<Protected><History /></Protected>} />
          <Route path="/settings" element={<Protected><Settings /></Protected>} />
          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AppProvider>
    </Router>
  );
}

export default App;
