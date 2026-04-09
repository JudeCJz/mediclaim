import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Shield, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.message.includes("ACCOUNT_LOCKED") || err.message.includes("ACCESS_REVOKED")) {
        setError(err.message.split(": ")[1] || err.message);
      } else {
        setError('Invalid credentials. Please verify your institutional access.');
      }
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)',
      transition: 'background 0.5s ease'
    }}>
      <div className="glass-panel" style={{ padding: '3.5rem', width: '90%', maxWidth: '480px', background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '12px 12px 0px rgba(0,0,0,0.4)' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(0,0,0,0.5)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', boxShadow: '0 0 40px var(--primary-glow)', border: '4px solid var(--primary)', borderRadius: '15px' }}>
            <img src={logo} style={{ width: '55px', height: '55px', objectFit: 'contain' }} alt="MEDICLAIM_LOGO" />
          </div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px' }}>Portal Login</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Secure Institutional Management System</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', 
            color: '#ef4444', padding: '1rem', marginBottom: '2rem', 
            fontSize: '0.85rem', textAlign: 'center', fontWeight: 800
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="email" placeholder="Email Address" required 
              style={{ padding: '1.2rem 1.2rem 1.2rem 3.5rem', width: '100%', fontWeight: 700 }}
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type={showPassword ? "text" : "password"} placeholder="Password" required 
              style={{ padding: '1.2rem 4.5rem 1.2rem 3.5rem', width: '100%', fontWeight: 700 }}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary login-btn-ripple" 
            style={{ 
              justifyContent: 'center', marginTop: '1.5rem', fontSize: '1.1rem', padding: '1.25rem',
              position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease'
            }} 
            disabled={isLoggingIn}
            onClick={(e) => {
              const btn = e.currentTarget;
              const circle = document.createElement('span');
              const rect = btn.getBoundingClientRect();
              const size = Math.max(rect.width, rect.height);
              circle.style.cssText = `
                position:absolute; border-radius:50%; pointer-events:none; z-index:1;
                width:${size}px; height:${size}px;
                left:${e.clientX - rect.left - size/2}px;
                top:${e.clientY - rect.top - size/2}px;
                background:rgba(255,255,255,0.4);
                transform:scale(0);
                animation:sidebarRipple 0.5s ease-out forwards;
              `;
              btn.appendChild(circle);
              setTimeout(() => circle.remove(), 600);
            }}
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : 'LOG IN'}
          </button>
        </form>

        <div style={{ marginTop: '3rem', textAlign: 'center', borderTop: '2px dashed var(--border-glass)', paddingTop: '2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px' }}>SECURE ACCESS GATEWAY</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
