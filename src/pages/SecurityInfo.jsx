import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecurityInfo = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 1.5rem' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}><ArrowLeft /> BACK_TO_APP</button>
            <div className="glass-panel" style={{ padding: '4rem' }}>
                <header style={{ marginBottom: '3rem', borderLeft: '10px solid var(--primary)', paddingLeft: '2rem' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Privacy Policy</h1>
                    <p style={{ opacity: 0.6, fontWeight: 700 }}>Version 1.0 | Effective March 2026</p>
                </header>
                
                <section style={{ display: 'grid', gap: '2.5rem', lineHeight: 1.7, opacity: 0.9 }}>
                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>1. Data Collection</h2>
                        <p>We collect personal and professional information such as Employee ID, Full Name, Department, Date of Joining, and family beneficiary details. This data is essential for processing medical insurance enrollment within the institution.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>2. Use of Information</h2>
                        <p>Information collected is strictly used for institutional insurance administration and payroll synchronization. We do not sell or share your personal data with third-party marketing entities.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>3. Storage & Security</h2>
                        <p>Your data is stored securely using MongoDB and local encrypted storage. Document evidence (ID cards/photos) is stored securely. We utilize system-wide audit logs to track all administrative changes to your records.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>4. User Rights</h2>
                        <p>Faculty members have the right to view their submitted data and update it during an active enrollment cycle. Once a cycle is archived, data can only be viewed/exported by authorized institutional administrators.</p>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                        <ShieldCheck size={40} color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} />
                        <p style={{ fontWeight: 900, fontSize: '0.8rem' }}>Institutional Data Protection Standards Verified</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SecurityInfo;
