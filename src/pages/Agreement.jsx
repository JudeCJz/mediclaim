import React from 'react';
import { ShieldCheck, ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Agreement = () => {
    const navigate = useNavigate();
    return (
        <div style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 1.5rem' }}>
            <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '2rem' }}><ArrowLeft /> BACK_TO_APP</button>
            <div className="glass-panel" style={{ padding: '4rem' }}>
                <header style={{ marginBottom: '3rem', borderLeft: '10px solid var(--primary)', paddingLeft: '2rem' }}>
                    <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Terms of Service</h1>
                    <p style={{ opacity: 0.6, fontWeight: 700 }}>Version 1.0 | Effective March 2026</p>
                </header>
                
                <section style={{ display: 'grid', gap: '2.5rem', lineHeight: 1.7, opacity: 0.9 }}>
                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>1. Acceptance of Terms</h2>
                        <p>By accessing the Mediclaim Portal, you agree to comply with the institutional enrollment policies and payroll deduction authorizations. Any misuse of the portal for data fraudulent purposes is strictly prohibited.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>2. Enrollment Windows</h2>
                        <p>Enrollment is only permitted during active financial cycle windows authorized by the administration. Submissions after the deadline will not be processed. All data must be final and accurate at the time of submission.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>3. User Responsibility</h2>
                        <p>Users are responsible for maintaining the confidentiality of their login credentials. Any submission made via your account is considered your personal intent for insurance enrollment and related payroll deductions.</p>
                    </div>

                    <div>
                        <h2 style={{ fontWeight: 900, fontSize: '1.4rem', marginBottom: '1rem', color: 'var(--primary)' }}>4. Liability Disclaimer</h2>
                        <p>The institutional Mediclaim Portal is for administrative management and does not guarantee insurance claim approval, which is governed by the underlying third-party insurance carrier's policy terms.</p>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '2rem', border: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
                        <FileText size={40} color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} />
                        <p style={{ fontWeight: 900, fontSize: '0.8rem' }}>Institutional Compliance & Terms Authorized</p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Agreement;
