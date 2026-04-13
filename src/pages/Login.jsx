import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: 'max(1.5rem, env(safe-area-inset-top)) max(1.5rem, env(safe-area-inset-right)) max(1.5rem, env(safe-area-inset-bottom)) max(1.5rem, env(safe-area-inset-left))',
      boxSizing: 'border-box',
    }}>
      <div className="glass-panel" style={{ padding: '2.5rem 2rem', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '64px', height: '64px', background: 'var(--primary)', 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', 
            marginBottom: '1.25rem', borderRadius: '12px' 
          }}>
            <div className="brand-logo-box" style={{ width: '40px', height: '40px', borderRadius: '10px' }}>
              <img src={logo} className="brand-logo-image brand-logo-image-invert" alt="logo" />
            </div>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.25rem' }}>Institutional Login</h1>
          <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>Mediclaim Management System</p>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(163, 45, 45, 0.08)', border: '0.5px solid rgba(163, 45, 45, 0.2)', 
            color: '#A32D2D', padding: '0.875rem', borderRadius: '8px', marginBottom: '1.5rem', 
            fontSize: '12.5px', textAlign: 'center', fontWeight: 500
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 10 }} />
            <input 
              type="email" placeholder="Email" required 
              className="input-with-icon" 
              style={{ width: '100%' }}
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 10 }} />
            <input 
              type={showPassword ? "text" : "password"} placeholder="Password" required 
              className="input-with-icon" 
              style={{ paddingRight: '3rem', width: '100%' }}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', zIndex: 10 }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              justifyContent: 'center', marginTop: '0.5rem', width: '100%'
            }} 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : 'Authorize Access'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: 'var(--border)', paddingTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 500 }}>
            <ShieldCheck size={14} /> 256-BIT ENCRYPTED GATEWAY
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
