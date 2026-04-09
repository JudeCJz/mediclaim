import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { History as HistoryIcon, ShieldCheck, Calendar, Users } from 'lucide-react';

const History = () => {
    const { user, socket } = useApp();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchClaims = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/claims');
            setHistory(res.data);
        } catch (err) {
            console.error("Error fetching claims:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchClaims();

        if (socket) {
            socket.on('CLAIM_UPDATED', fetchClaims);
            return () => {
                socket.off('CLAIM_UPDATED', fetchClaims);
            };
        }
    }, [fetchClaims, socket]);

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
            <header style={{ marginBottom: '3rem', background: 'var(--primary)', padding: '1.5rem 2.5rem', boxShadow: '8px 8px 0px #000', border: '3px solid #000' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>Enrollment History</h1>
                <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem', opacity: 0.9 }}>View all your past and current medical insurance sessions.</p>
            </header>

            {loading ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="loader" style={{ fontSize: '1rem', fontWeight: 900 }}>Loading enrollment history...</div>
                </div>
            ) : history.length === 0 ? (
                <div className="glass-panel" style={{ padding: '6rem', textAlign: 'center' }}>
                    <HistoryIcon size={60} color="var(--border-glass)" style={{ marginBottom: '2rem' }} />
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>No Prior Records Found</h3>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>You haven't completed any enrollments in the system yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {history.map(item => (
                        <div key={item._id || item.id} className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 2.5rem)', border: '3px solid var(--border-glass)', position: 'relative', overflow: 'hidden' }}>
                            <div className="mobile-hide" style={{ position: 'absolute', top: 0, right: 0, padding: '1rem 2rem', background: 'var(--primary)', color: 'white', fontWeight: 900, fontSize: '0.75rem', transform: 'skewX(-20deg)', marginRight: '-10px' }}>
                                Official Confirmation
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '2.5rem', alignItems: 'flex-start' }}>
                                <div style={{ borderRight: '2px solid var(--border-glass)', paddingRight: '2rem' }} className="responsive-border-none">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <Calendar size={18} color="var(--primary)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>YEAR</span>
                                    </div>
                                    <div style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', fontWeight: 900 }}>{item.financialYear || item.fyName || '---'}</div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <ShieldCheck size={20} color="#22c55e" />
                                        <h3 style={{ fontSize: '1.3rem', fontWeight: 900 }}>{item.coverageId || 'CLAIM'} PLAN</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>TOTAL PREMIUM</span>
                                            <span style={{ fontWeight: 900, color: '#22c55e', fontSize: '1.1rem' }}>₹{item.amount?.toLocaleString() || item.premium?.toLocaleString()}</span>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>VERIFICATION</span>
                                            <span style={{ fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.status?.replace('_', ' ') || 'SUBMITTED'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left', borderTop: '2px dashed var(--border-glass)', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <Users size={16} color="var(--text-muted)" />
                                        <span style={{ fontWeight: 900, fontSize: '0.7rem', color: 'var(--text-muted)' }}>COVERED MEMBERS:</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div key="self" className="glass-panel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)' }}>
                                            {item.userName || user?.name} (Self)
                                        </div>
                                        {item.dependents?.map((d, idx) => (
                                            <div key={idx} className="glass-panel" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(255,255,255,0.05)' }}>
                                                {d.name} ({d.type})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;