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
import { ShieldCheck, X } from 'lucide-react';

import logo from './assets/logo.png';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="glass-panel" style={{ 
      position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: '450px', padding: '1.2rem 1.5rem', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '1px solid var(--border-glass)',
      background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(20px)'
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <img src={logo} style={{ width: '40px', height: '40px', objectFit: 'contain' }} alt="MEDICLAIM_LOGO" />
        <div>
          <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>Install App</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Add to home screen for better experience</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="btn btn-primary" onClick={handleInstall} style={{ padding: '0.6rem 1.2rem', fontSize: '0.75rem' }}>Install</button>
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
      </div>
    </div>
  );
};

const Protected = ({ children, role }) => {
  const { user, loading } = useApp();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', gap: '1.5rem' }}>
        <div style={{ width: '80px', height: '80px', background: 'var(--primary)', boxShadow: '0 0 50px var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 2s infinite' }}>
            <ShieldCheck size={40} color="white" />
        </div>
        <div style={{ letterSpacing: '1px', fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-muted)' }}>Verifying Security...</div>
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
        <InstallPrompt />
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
