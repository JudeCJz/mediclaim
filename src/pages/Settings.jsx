import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { ShieldCheck, Loader2, Key, User } from 'lucide-react';

const Settings = () => {
    const { user, updateProfile } = useApp();
    const [profile, setProfile] = useState({
        name: user?.name || '',
        empId: user?.empId || '',
        phone: user?.phone || '',
        department: user?.department || '',
        designation: user?.designation || '',
        gender: user?.gender || 'Male',
        doj: user?.doj || ''
    });

    const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
    const [showPass, setShowPass] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [alertConfig, setAlertConfig] = useState({ title: '', text: '', onConfirm: null });

    const AlertModal = ({ config, onClose }) => {
        if (!config.title) return null;
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
                <div className="glass-panel animate-pop" style={{ width: '90%', maxWidth: '450px', padding: '3rem', textAlign: 'center', border: '2px solid var(--border-glass)', background: 'var(--bg-card)', boxShadow: '20px 20px 0px rgba(0,0,0,0.4)' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--primary-glow)', borderRadius: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <ShieldCheck size={40} />
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', textTransform: 'uppercase' }}>{config.title}</h2>
                    <p style={{ opacity: 0.7, fontWeight: 700, marginBottom: '2.5rem' }}>{config.text}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: config.onConfirm ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                        {config.onConfirm && <button className="btn btn-ghost" style={{ padding: '1.2rem', fontWeight: 900 }} onClick={onClose}>CANCEL</button>}
                        <button className="btn btn-primary" style={{ padding: '1.2rem', fontWeight: 900 }} onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }}>
                            {config.onConfirm ? 'CONFIRM' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwords.next !== passwords.confirm) {
            return setMessage({ type: 'error', text: 'Passwords do not match.' });
        }
        if (passwords.next.length < 6) {
            return setMessage({ type: 'error', text: 'Minimum 6 characters required.' });
        }

        setIsUpdating(true);
        try {
            await api.put('/auth/update-password', {
                currentPassword: passwords.current,
                newPassword: passwords.next
            });
            
            setMessage({ type: 'success', text: 'Password updated successfully.' });
            setPasswords({ current: '', next: '', confirm: '' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.response?.data?.msg || 'Request blocked by security.' });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2rem' }}>
                <h1 style={{ fontSize: 'clamp(2rem, 8vw, 2.5rem)', fontWeight: 900 }}>Account Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>Manage your institutional profile and security credentials.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))', gap: '2rem' }}>
                {/* PROFILE SECTION */}
                <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <User size={24} color="var(--primary)" />
                        <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Master Enrollment Profile</h2>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="responsive-auto-grid" style={{ gap: '1rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>FULL NAME</label>
                                <input type="text" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>EMPLOYEE ID</label>
                                <input type="text" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={profile.empId} onChange={e => setProfile({...profile, empId: e.target.value})} />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>PHONE NUMBER</label>
                                <input type="text" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>DEPARTMENT</label>
                                <input type="text" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }} value={profile.department} onChange={e => setProfile({...profile, department: e.target.value})} />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>DESIGNATION</label>
                                <input type="text" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={profile.designation} onChange={e => setProfile({...profile, designation: e.target.value})} />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6, display: 'block', marginBottom: '0.5rem' }}>DATE OF JOINING</label>
                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }} value={profile.doj} onChange={e => setProfile({...profile, doj: e.target.value})} />
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.2rem' }} onClick={async () => {
                            try {
                                await updateProfile(profile);
                                setAlertConfig({ title: 'Profile Synchronized', text: 'All enrollment details have been saved to your master record.' });
                            } catch {
                                setAlertConfig({ title: 'Error', text: 'Update failed. Check your network.' });
                            }
                        }}>
                             SAVE MASTER PROFILE
                        </button>
                    </div>
                </div>

                {/* PASSWORD SECTION */}
                <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                        <Key size={24} color="var(--primary)" />
                        <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem' }}>Security Settings</h2>
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
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

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', border: '1px solid var(--border-glass)', marginTop: '0.5rem' }}>
                            <label className="inst-switch">
                                <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} />
                                <span className="inst-slider"></span>
                            </label>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Show Password</span>
                        </div>

                        <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
            <AlertModal config={alertConfig} onClose={() => setAlertConfig({ title: '', text: '', onConfirm: null })} />
        </div>
    );
};

export default Settings;
