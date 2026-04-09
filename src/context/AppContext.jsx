import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { io } from 'socket.io-client';

const AppContext = createContext();

// Simplified DEMO_FY since Firestore logic is replaced
const DEMO_FY = {
  id: '2025_26', name: '2025-26', enabled: true, maxChildren: 2,
  policies: [
    { id: 'p1', label: 'Silver', premium: 4500, coverage: '1.5 Lakh' },
    { id: 'p2', label: 'Gold', premium: 8500, coverage: '5 Lakh' },
    { id: 'p3', label: 'Platinum', premium: 12000, coverage: '10 Lakh' }
  ]
};

const DEMO_FACULTY = [];

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [activeFY, setActiveFY] = useState(DEMO_FY);
  const [activeTab, setActiveTabState] = useState(localStorage.getItem('activeTab') || 'overview');
  const [socket, setSocket] = useState(null);
  const isDemoMode = false;

  const setActiveTab = (tab) => {
    localStorage.setItem('activeTab', tab);
    setActiveTabState(tab);
  };

  // Theme Toggle Logic
  const toggleTheme = (e) => {
    const x = e?.clientX || window.innerWidth / 2;
    const y = e?.clientY || window.innerHeight / 2;
    document.documentElement.style.setProperty('--reveal-x', `${x}px`);
    document.documentElement.style.setProperty('--reveal-y', `${y}px`);
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    if (!document.startViewTransition) { setTheme(newTheme); return; }
    document.startViewTransition(() => setTheme(newTheme));
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auth Logic on Mount
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/user');
          setUser(res.data);
          const fyRes = await api.get('/financialYears');
          const active = fyRes.data.find((fy) => fy.enabled && !fy.isArchived) || fyRes.data[0];
          if (active) {
            setActiveFY(active);
          }
        } catch (err) {
          console.error("Token invalid or server down", err);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  // Socket.io Setup
  useEffect(() => {
    if (user) {
      const socketUrl = window.location.origin.includes(':5173')
        ? 'http://localhost:5000'
        : window.location.origin;
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.on('CLAIM_UPDATED', (updatedClaim) => {
        // You can handle notifications or state updates here if needed globaly
        console.log('Claim Updated:', updatedClaim);
      });

      return () => newSocket.close();
    }
  }, [user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    try {
      const fyRes = await api.get('/financialYears');
      const active = fyRes.data.find((fy) => fy.enabled && !fy.isArchived) || fyRes.data[0];
      if (active) {
        setActiveFY(active);
      }
    } catch (err) {
      console.error('Failed to load financial years after login:', err);
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return;
    try {
      const res = await api.put(`/users/${user._id}`, updates);
      setUser(res.data);
    } catch (err) {
      console.error("Profile update failed:", err);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, loading, theme, toggleTheme, activeFY, login, logout, updateProfile,
      activeTab, setActiveTab, socket, isDemoMode, DEMO_FACULTY
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
