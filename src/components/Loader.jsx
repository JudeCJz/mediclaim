import React from 'react';
import { Compass, ShieldCheck } from 'lucide-react';

const Loader = ({ fullScreen = true }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: fullScreen ? '100vh' : '200px',
      background: fullScreen ? 'var(--bg-main)' : 'transparent',
      gap: '2.5rem',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <style>
        {`
          @keyframes core-pulse {
            0%, 100% { transform: scale(1); filter: brightness(1) drop-shadow(0 0 5px var(--primary)); }
            50% { transform: scale(1.1); filter: brightness(1.5) drop-shadow(0 0 20px var(--primary)); }
          }
          @keyframes fast-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes reverse-spin {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes scan-line {
            0% { transform: translateY(-50px); opacity: 0; }
            50% { opacity: 0.5; }
            100% { transform: translateY(50px); opacity: 0; }
          }
          @keyframes glitch-text {
            0%, 100% { opacity: 1; transform: translateX(0); }
            20% { opacity: 0.8; transform: translateX(-2px); }
            40% { opacity: 0.9; transform: translateX(2px); }
          }
        `}
      </style>

      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
        {/* OUTER SCANNER RING */}
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px dashed var(--primary)',
          borderRadius: '20px',
          opacity: 0.3,
          animation: 'fast-spin 10s linear infinite'
        }} />

        {/* MIDDLE ROTATING PLATE */}
        <div style={{
          position: 'absolute', inset: '15px',
          border: '4px solid var(--border-glass)',
          borderTopColor: 'var(--primary)',
          animation: 'reverse-spin 3s cubic-bezier(0.53, 0.21, 0.29, 0.67) infinite',
          boxShadow: '0 0 15px rgba(99,102,241,0.2)'
        }} />

        {/* INNER CORE BOX */}
        <div style={{
          position: 'absolute', inset: '30px',
          background: 'rgba(99,102,241,0.1)',
          border: '2px solid var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'core-pulse 2s ease-in-out infinite',
          boxShadow: 'inset 0 0 20px rgba(99,102,241,0.2)',
          backdropFilter: 'blur(5px)'
        }}>
          <Compass color="var(--primary)" size={32} />
        </div>

        {/* SCANNING LINE DECORATION */}
        <div style={{
          position: 'absolute', left: '-10px', right: '-10px', height: '2px',
          background: 'var(--primary)',
          top: '50%',
          boxShadow: '0 0 10px var(--primary)',
          animation: 'scan-line 2.5s ease-in-out infinite',
          pointerEvents: 'none'
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ 
          fontWeight: 900, 
          textTransform: 'uppercase', 
          letterSpacing: '8px', 
          fontSize: '0.85rem', 
          color: 'var(--primary)',
          animation: 'glitch-text 4s step-end infinite',
          marginBottom: '0.5rem'
        }}>
          Syncing_Records
        </p>
        <div style={{ width: '200px', height: '3px', background: 'rgba(255,255,255,0.05)', margin: '0 auto', overflow: 'hidden' }}>
            <div style={{ 
                height: '100%', 
                width: '30%', 
                background: 'var(--primary)', 
                boxShadow: '0 0 10px var(--primary)',
                animation: 'scan-line 2s ease-in-out infinite alternate',
                transform: 'none' // override the keyframe for a loading bar effect
            }} />
        </div>
      </div>
    </div>
  );
};

export default Loader;
