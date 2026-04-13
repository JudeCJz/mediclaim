import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { ShieldCheck, Loader2, Key, User } from 'lucide-react';
import DefaultRoleAvatar from '../components/DefaultRoleAvatar';

const Settings = () => {
    const { user, updateProfile } = useApp();
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || '',
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
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
                <div className="glass-panel" style={{ width: '90%', maxWidth: '420px', padding: '2rem', textAlign: 'center', border: '0.5px solid var(--border-color)', background: 'var(--bg-surface)', boxShadow: 'none', borderRadius: '12px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--bg-card)', borderRadius: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={28} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{config.title}</h2>
                    <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>{config.text}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: config.onConfirm ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                        {config.onConfirm && <button className="btn btn-ghost" style={{ padding: '10px', fontSize: '13px', border: '0.5px solid var(--border-color)' }} onClick={onClose}>CANCEL</button>}
                        <button className="btn btn-primary" style={{ padding: '10px', fontSize: '13px' }} onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }}>
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
        <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>Account Settings</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px', marginTop: '4px' }}>Manage your institutional profile and security credentials.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
                {/* PROFILE SECTION */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                        <DefaultRoleAvatar role={user?.role} name={user?.name} size={56} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <h2 style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '15px' }}>Member Profile</h2>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div className="responsive-auto-grid" style={{ gap: '1rem' }}>
                            {[
                                { lab: 'FULL NAME', key: 'name', solid: user?.role !== 'admin' },
                                { lab: 'EMAIL ADDRESS', key: 'email', solid: user?.role !== 'admin' },
                                { lab: 'EMPLOYEE ID', key: 'empId' },
                                { lab: 'PHONE NUMBER', key: 'phone' },
                                { lab: 'DEPARTMENT', key: 'department', up: true, solid: user?.role !== 'admin' },
                                { lab: 'DESIGNATION', key: 'designation' }
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{f.lab}</label>
                                    <input 
                                        type="text" 
                                        disabled={f.solid} 
                                        className="input-premium" 
                                        style={{ width: '100%', background: f.solid ? 'var(--bg-card)' : 'transparent', cursor: f.solid ? 'not-allowed' : 'text', opacity: f.solid ? 0.7 : 1 }} 
                                        value={profile[f.key]} 
                                        onChange={e => setProfile({...profile, [f.key]: f.up ? e.target.value.toUpperCase() : e.target.value})} 
                                    />
                                </div>
                            ))}
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>DATE OF JOINING</label>
                                <input type="date" className="input-premium" style={{ width: '100%', background: 'transparent' }} value={profile.doj} onChange={e => setProfile({...profile, doj: e.target.value})} />
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '1rem' }} onClick={async () => {
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
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', border: '0.5px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
                        <Key size={20} color="var(--primary)" />
                        <h2 style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '15px' }}>Security Settings</h2>
                    </div>

                    {message.text && (
                        <div style={{ 
                            padding: '10px', marginBottom: '1rem', 
                            background: message.type === 'error' ? 'rgba(163, 45, 45, 0.05)' : 'rgba(59, 109, 17, 0.05)',
                            border: `0.5px solid ${message.type === 'error' ? '#A32D2D' : '#3B6D11'}`,
                            color: message.type === 'error' ? '#A32D2D' : '#3B6D11',
                            fontWeight: 500, fontSize: '12px', borderRadius: '4px'
                        }}>{message.text}</div>
                    )}

                    <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '1rem' }}>
                        <input 
                            type={showPass ? "text" : "password"} required className="input-premium" 
                            style={{ width: '100%', background: 'transparent' }}
                            placeholder="Current Password"
                            value={passwords.current} onChange={e => setPasswords({...passwords, current: e.target.value})}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                            <input 
                                type={showPass ? "text" : "password"} required className="input-premium" 
                                style={{ width: '100%', background: 'transparent' }}
                                placeholder="New Password"
                                value={passwords.next} onChange={e => setPasswords({...passwords, next: e.target.value})}
                            />
                            <input 
                                type={showPass ? "text" : "password"} required className="input-premium" 
                                style={{ width: '100%', background: 'transparent' }}
                                placeholder="Confirm New"
                                value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid var(--border-color)' }}>
                            <label className="inst-switch">
                                <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} />
                                <span className="inst-slider"></span>
                            </label>
                            <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>Show Password</span>
                        </div>

                        <button className="btn btn-primary" type="submit" style={{ width: '100%', padding: '12px', fontSize: '13px', marginTop: '0.5rem' }} disabled={isUpdating}>
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
