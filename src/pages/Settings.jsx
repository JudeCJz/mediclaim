import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { Lock, ShieldCheck, Loader2, Save, Key, AlertCircle, CheckCircle, Eye, EyeOff, User } from 'lucide-react';

const Settings = () => {
    const { user, updateProfile } = useApp();
    const [name, setName] = useState(user?.name || '');
    const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwords.next !== passwords.confirm) {
            return setMessage({ type: 'error', text: 'PROTOCOL_MISMATCH: Passwords do not match.' });
        }
        if (passwords.next.length < 6) {
            return setMessage({ type: 'error', text: 'SECURITY_VIOLATION: Minimum 6 characters required.' });
        }

        setIsUpdating(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, passwords.current);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, passwords.next);
            
            setMessage({ type: 'success', text: 'ACCESS_RENEWED: Password updated successfully.' });
            setPasswords({ current: '', next: '', confirm: '' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.code?.includes('wrong-password') ? 'AUTH_DENIED: Current password incorrect.' : 'SYSTEM_REJECTION: Request blocked.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', background: '#dc2626', padding: '1.5rem 2.5rem', boxShadow: '8px 8px 0px #000', border: '3px solid #000' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>Settings</h1>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* PROFILE SECTION */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <User size={24} color="var(--primary)" />
                        <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Profile Data</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.2rem' }}>
                        <div className="f-group">
                            <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>FULL_NAME</label>
                            <input 
                                type="text" className="glass-panel" 
                                style={{ width: '100%', padding: '1rem', fontWeight: 700 }}
                                value={name} onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => {
                            try {
                                await updateProfile({ name });
                                alert("SUCCESS: Personal record updated.");
                            } catch (e) { alert("ERROR: Update failed."); }
                        }}>
                             UPDATE_PROFILE
                        </button>
                    </div>
                </div>

                {/* PASSWORD SECTION */}
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <Key size={24} color="var(--primary)" />
                        <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Access PIN Change</h2>
                    </div>

                    {message.text && (
                        <div style={{ 
                            padding: '1rem', marginBottom: '1.5rem', 
                            background: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            border: `2px solid ${message.type === 'error' ? '#ef4444' : '#22c55e'}`,
                            color: message.type === 'error' ? '#ef4444' : '#22c55e',
                            fontWeight: 800, fontSize: '0.75rem'
                        }}>{message.text}</div>
                    )}

                    <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '1.2rem' }}>
                        <input 
                            type={showPass ? "text" : "password"} required className="glass-panel" 
                            style={{ width: '100%', padding: '1rem', fontWeight: 700 }}
                            placeholder="Current Password"
                            value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input 
                                type={showPass ? "text" : "password"} required className="glass-panel" 
                                style={{ width: '100%', padding: '1rem', fontWeight: 700 }}
                                placeholder="New Password"
                                value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})}
                            />
                            <input 
                                type={showPass ? "text" : "password"} required className="glass-panel" 
                                style={{ width: '100%', padding: '1rem', fontWeight: 700 }}
                                placeholder="Confirm New"
                                value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}>
                            <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                            Show Password
                        </label>

                        <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
