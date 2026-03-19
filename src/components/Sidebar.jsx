import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, History, LogOut, Sun, Moon, Compass, ShieldAlert, Menu, X, Settings as SettingsIcon, FileText, Users, Lock, User } from 'lucide-react';

const Sidebar = () => {
  const { user, logout, theme, toggleTheme, activeTab, setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItemStyle = { 
    textDecoration: 'none', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '1rem', 
    padding: '1rem 1.5rem', 
    fontWeight: 800, 
    textTransform: 'uppercase', 
    fontSize: '0.85rem',
    width: '100%',
    textAlign: 'left',
    justifyContent: 'flex-start',
    transition: 'all 0.2s ease'
  };

  const isHistoryActive = location.pathname === '/history';

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsOpen(false);
    navigate('/');
  };

  const isAdminOrHOD = user?.role === 'admin' || user?.role === 'hod';
  const isDashboardBase = location.pathname === '/';

  return (
    <>
      {/* MOBILE TRIGGER - Top Right (Fixed) */}
      <button 
        className="btn btn-primary mobile-only" 
        style={{ 
            position: 'fixed', bottom: '20px', right: '20px', 
            zIndex: 2000, padding: '0.8rem', 
            boxShadow: '6px 6px 0px #000', border: '3px solid #000'
        }} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* SIDEBAR */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '2px solid var(--border-glass)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <img src="/logo.png" style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px var(--primary-glow))' }} alt="L" />
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.5px', margin: 0, lineHeight: 1 }}>MEDICLAIM_ID</h2>
            <p style={{ color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>INSTITUTIONAL_CMD</p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => handleTabClick('overview')} 
            className={`btn ${(isDashboardBase && activeTab === 'overview') ? 'btn-primary' : 'btn-ghost'}`} 
            style={navItemStyle}
          >
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </button>

          {isAdminOrHOD && (
            <>
              <button 
                onClick={() => handleTabClick('years')} 
                className={`btn ${(isDashboardBase && activeTab === 'years') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <SettingsIcon size={20} /> <span>Financial Years</span>
              </button>
              <button 
                onClick={() => handleTabClick('registry')} 
                className={`btn ${(isDashboardBase && activeTab === 'registry') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <FileText size={20} /> <span>Registry</span>
              </button>
              <button 
                onClick={() => handleTabClick('recruit')} 
                className={`btn ${(isDashboardBase && activeTab === 'recruit') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <Users size={20} /> <span>Faculty Accounts</span>
              </button>
            </>
          )}

          <NavLink to="/history" onClick={() => setIsOpen(false)} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={navItemStyle}>
             <History size={20} /> <span>History</span>
          </NavLink>

          {isAdminOrHOD && (
            <button 
              onClick={() => handleTabClick('security')} 
              className={`btn ${(isDashboardBase && activeTab === 'security') ? 'btn-primary' : 'btn-ghost'}`} 
              style={navItemStyle}
            >
              <Lock size={20} /> <span>Security Hub</span>
            </button>
          )}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={navItemStyle} onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <NavLink to="/settings" onClick={() => setIsOpen(false)} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ ...navItemStyle, borderTop: '1px solid var(--border-glass)' }}>
            <SettingsIcon size={20} /> <span>SETTINGS</span>
          </NavLink>
          
          <button className="btn btn-ghost" style={{ ...navItemStyle, color: '#ef4444' }} onClick={logout}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
          

          <div style={{ padding: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--border-glass)' }} />
            <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>Logged In</div>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isOpen && <div className="overlay mobile-only" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setIsOpen(false)} />}
    </>
  );
};

export default Sidebar;
