import React from 'react';
import { ShieldCheck, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Agreement = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1.5rem', fontSize: '13px', border: 'var(--border)' }}><ArrowLeft size={16} /> BACK_TO_APP</button>
            <div className="glass-panel" style={{ padding: '2.5rem', background: 'var(--bg-card)', border: 'var(--border)', boxShadow: 'none' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>Terms of Service</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px', marginTop: '4px' }}>Version 1.0 | Effective March 2026</p>
                </header>
                
                <section style={{ display: 'grid', gap: '2rem', lineHeight: 1.6 }}>
                    {[
                        { title: '1. Acceptance of Terms', text: 'By accessing the Mediclaim Portal, you agree to comply with the institutional enrollment policies and payroll deduction authorizations. Any misuse of the portal for data fraudulent purposes is strictly prohibited.' },
                        { title: '2. Enrollment Windows', text: 'Enrollment is only permitted during active financial cycle windows authorized by the administration. Submissions after the deadline will not be processed. All data must be final and accurate at the time of submission.' },
                        { title: '3. User Responsibility', text: 'Users are responsible for maintaining the confidentiality of their login credentials. Any submission made via your account is considered your personal intent for insurance enrollment and related payroll deductions.' },
                        { title: '4. Liability Disclaimer', text: 'The institutional Mediclaim Portal is for administrative management and does not guarantee insurance claim approval, which is governed by the underlying third-party insurance carrier\'s policy terms.' }
                    ].map((s, idx) => (
                        <div key={idx}>
                            <h2 style={{ fontWeight: 500, fontSize: '15px', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{s.title}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{s.text}</p>
                        </div>
                    ))}

                    <div style={{ marginTop: '1.5rem', padding: '1.5rem', border: '0.5px dashed var(--border-color)', background: 'var(--bg-surface)', textAlign: 'center', borderRadius: '12px' }}>
                        <FileText size={32} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ fontWeight: 500, fontSize: '11px', color: 'var(--primary)', textTransform: 'uppercase' }}>Institutional Compliance Authorized</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Agreement;
