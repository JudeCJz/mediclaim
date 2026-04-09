import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, History, LogOut, Sun, Moon, Compass, ShieldAlert, Menu, X, Settings as SettingsIcon, FileText, Users, Lock, User } from 'lucide-react';

import logo from '../assets/logo.png';

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

  const createRipple = (e) => {
    const btn = e.currentTarget;
    // Remove any existing ripples first
    btn.querySelectorAll('.sidebar-ripple').forEach(r => r.remove());
    const circle = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    circle.style.width = circle.style.height = `${size}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.className = 'sidebar-ripple';
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 700);
  };

  const handleTabClick = (tab, e) => {
    if (e) createRipple(e);
    // Delay state update so ripple is visible before re-render
    setTimeout(() => {
      setActiveTab(tab);
      setIsOpen(false);
      navigate('/');
    }, 200);
  };

  const isAdminOrHOD = user?.role === 'admin' || user?.role === 'hod';
  const isDashboardBase = location.pathname === '/' || location.pathname === '/admin' || location.pathname === '/hod' || location.pathname === '/faculty';

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
          <img src={logo} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px var(--primary-glow))' }} alt="MEDICLAIM_LOGO" />
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 900, letterSpacing: '1px', margin: 0, lineHeight: 1 }}>MEDICLAIM</h2>
            <p style={{ color: 'var(--primary)', fontSize: '0.65rem', fontWeight: 900, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>INSTITUTIONAL_PORTAL</p>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {isAdminOrHOD && (
            <>
              <button 
                onClick={(e) => handleTabClick('years', e)} 
                className={`btn ${(isDashboardBase && (activeTab === 'years' || !activeTab)) ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <LayoutDashboard size={20} /> <span>Enrollment Cycles</span>
              </button>
              <button 
                onClick={(e) => handleTabClick('registry', e)} 
                className={`btn ${(isDashboardBase && activeTab === 'registry') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <FileText size={20} /> <span>Enrollment Database</span>
              </button>
              <button 
                onClick={(e) => handleTabClick('recruit', e)} 
                className={`btn ${(isDashboardBase && activeTab === 'recruit') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <Users size={20} /> <span>Faculty Records</span>
              </button>
              <button 
                onClick={(e) => handleTabClick('audit_logs', e)} 
                className={`btn ${(isDashboardBase && activeTab === 'audit_logs') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <ShieldAlert size={20} /> <span>System Logs</span>
              </button>
              <button 
                onClick={(e) => handleTabClick('archives', e)} 
                className={`btn ${(isDashboardBase && activeTab === 'archives') ? 'btn-primary' : 'btn-ghost'}`} 
                style={navItemStyle}
              >
                <History size={20} /> <span>Historical Records</span>
              </button>
            </>
          )}

          {!isAdminOrHOD && (
            <button 
              onClick={(e) => handleTabClick('overview', e)} 
              className={`btn ${(isDashboardBase && (activeTab === 'overview' || !activeTab)) ? 'btn-primary' : 'btn-ghost'}`} 
              style={navItemStyle}
            >
              <LayoutDashboard size={20} /> <span>My Enrollment</span>
            </button>
          )}

          {!isAdminOrHOD && (
            <NavLink to="/history" onClick={(e) => { createRipple(e); setIsOpen(false); }} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={navItemStyle}>
               <History size={20} /> <span>Filing History</span>
            </NavLink>
          )}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className="btn btn-ghost" style={navItemStyle} onClick={(e) => { createRipple(e); toggleTheme(); }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <NavLink to="/settings" onClick={(e) => { createRipple(e); setIsOpen(false); }} className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`} style={{ ...navItemStyle, borderTop: '1px solid var(--border-glass)' }}>
            <SettingsIcon size={20} /> <span>Account Settings</span>
          </NavLink>
          
          <button className="btn btn-ghost" style={{ ...navItemStyle, color: '#ef4444' }} onClick={(e) => { createRipple(e); logout(); }}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
          

          <div style={{ padding: '1.5rem', position: 'relative', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>INSTITUTIONAL ACCESS</div>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isOpen && <div className="overlay mobile-only" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, backdropFilter: 'blur(4px)' }} onClick={() => setIsOpen(false)} />}
    </>
  );
};

export default Sidebar;
