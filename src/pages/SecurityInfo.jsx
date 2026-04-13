import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecurityInfo = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem', fontSize: '13px', border: 'var(--border)' }}><ArrowLeft size={16} /> BACK_TO_APP</button>
            <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: 'var(--border)', boxShadow: 'none' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>Privacy Policy</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px', marginTop: '4px' }}>Version 1.0 | Effective March 2026</p>
                </header>
                
                <section style={{ display: 'grid', gap: '2rem', lineHeight: 1.6 }}>
                    {[
                        { title: '1. Data Collection', text: 'We collect personal and professional information such as Employee ID, Full Name, Department, Date of Joining, and family beneficiary details. This data is essential for processing medical insurance enrollment within the institution.' },
                        { title: '2. Use of Information', text: 'Information collected is strictly used for institutional insurance administration and payroll synchronization. We do not sell or share your personal data with third-party marketing entities.' },
                        { title: '3. Storage & Security', text: 'Your data is stored securely using MongoDB and local encrypted storage. Document evidence (ID cards/photos) is stored securely. We utilize system-wide audit logs to track all administrative changes to your records.' },
                        { title: '4. User Rights', text: 'Faculty members have the right to view their submitted data and update it during an active enrollment cycle. Once a cycle is archived, data can only be viewed/exported by authorized institutional administrators.' }
                    ].map((s, idx) => (
                        <div key={idx}>
                            <h2 style={{ fontWeight: 500, fontSize: '15px', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{s.title}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{s.text}</p>
                        </div>
                    ))}

                    <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '0.5px dashed var(--border-color)', background: 'var(--bg-surface)', textAlign: 'center', borderRadius: '12px' }}>
                        <ShieldCheck size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 500, fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase' }}>Data Protection Standards Verified</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SecurityInfo;
