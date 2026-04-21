import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, History, LogOut, Sun, Moon, Menu, X, Settings as SettingsIcon, FileText, Users, Mail } from 'lucide-react';

import logo from '../assets/logo.png';
import DefaultRoleAvatar from './DefaultRoleAvatar';

const Sidebar = () => {
  const { user, logout, theme, toggleTheme, activeTab, setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();


  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setIsOpen(false);
    navigate('/');
  };

  const isAdminOrHOD = user?.role === 'admin' || user?.role === 'hod';
  const isDashboardBase = ['/', '/admin', '/hod', '/faculty'].includes(location.pathname);

  const isTabActive = (tab) => isDashboardBase && (activeTab === tab || (!activeTab && tab === (isAdminOrHOD ? 'years' : 'overview')));

  return (
    <>
      {/* Mobile FAB */}
      <button
        className="mobile-only"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          right: 'calc(20px + env(safe-area-inset-right, 0px))',
          zIndex: 2000, width: '48px', height: '48px',
          borderRadius: '50%', background: '#1E3A5F', color: '#fff',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(30,58,95,0.2)',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div style={{
          padding: '0.75rem 0.875rem 1.25rem',
          borderBottom: 'var(--border)',
          marginBottom: '0.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div className="brand-logo-box" style={{ width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0 }}>
            <img src={logo} className="brand-logo-image" alt="logo" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.2 }}>Mediclaim Portal</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '1px' }}>Institutional System</div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{ padding: '1rem 0.875rem 0.375rem', fontSize: '12px', fontWeight: 500, color: '#475E75', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Navigation
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.25rem' }}>
          {isAdminOrHOD && (
            <>
              <button onClick={() => handleTabClick('years')} className={isTabActive('years') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <LayoutDashboard size={15} /> Enrollment Cycles
              </button>
              <button onClick={() => handleTabClick('registry')} className={isTabActive('registry') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <FileText size={15} /> Database Records
              </button>
              <button onClick={() => handleTabClick('recruit')} className={isTabActive('recruit') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <Users size={15} /> Faculty Management
              </button>
              <button onClick={() => handleTabClick('mail')} className={isTabActive('mail') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <Mail size={15} /> Communications
              </button>
              <button onClick={() => handleTabClick('departments')} className={isTabActive('departments') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <SettingsIcon size={15} /> Departments
              </button>
            </>
          )}

          {!isAdminOrHOD && (
            <>
              <button onClick={() => handleTabClick('overview')} className={isTabActive('overview') ? "sidebar-item sidebar-item-active" : "sidebar-item"}>
                <LayoutDashboard size={15} /> My Enrollment
              </button>
              <NavLink
                to="/history"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => isActive ? "sidebar-item sidebar-item-active" : "sidebar-item"}
              >
                <History size={15} /> Filing History
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom actions */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.25rem' }}>
          <div style={{ height: '0.5px', background: '#DDE3EE', margin: '0.75rem 0.625rem' }} />

          <button onClick={toggleTheme} className="sidebar-item">
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>

          <NavLink
            to="/settings"
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => isActive ? "sidebar-item sidebar-item-active" : "sidebar-item"}
          >
            <SettingsIcon size={15} /> Account Settings
          </NavLink>

          <button
            onClick={logout}
            className="sidebar-item"
            style={{ color: '#A32D2D' }}
          >
            <LogOut size={15} /> Sign Out
          </button>

          {/* User profile strip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.875rem 0.875rem 0.375rem',
            marginTop: '0.25rem',
            borderTop: '0.5px solid var(--border-color)',
          }}>
            <DefaultRoleAvatar role={user?.role} name={user?.name} seed={user?.email} size={28} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1) || 'Staff'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(30,58,95,0.2)', zIndex: 1000, backdropFilter: 'blur(2px)' }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
