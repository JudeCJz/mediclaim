import React from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

const Loader = ({ fullScreen = true }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fullScreen ? '100dvh' : undefined,
      height: fullScreen ? undefined : '200px',
      background: fullScreen ? 'var(--bg-main)' : 'transparent',
      gap: '1.5rem',
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
      ...(fullScreen ? {
        padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
      } : {}),
    }}>
      <style>
        {`
          @keyframes pulse-subtle {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.98); }
          }
        `}
      </style>

      <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid var(--border-color)',
          borderRadius: '16px',
        }} />
        <Loader2 className="animate-spin" size={32} color="var(--primary)" />
      </div>

      <div style={{ textAlign: 'center', animation: 'pulse-subtle 2s ease-in-out infinite' }}>
        <p style={{ 
          fontWeight: 500, 
          fontSize: '13px', 
          color: 'var(--text-main)',
          marginBottom: '4px'
        }}>
          Institutional Data Synchronizing
        </p>
        <p style={{ 
          fontWeight: 400, 
          fontSize: '11px', 
          color: 'var(--text-muted)'
        }}>
          Please wait while we verify your session
        </p>
      </div>
    </div>
  );
};

export default Loader;
