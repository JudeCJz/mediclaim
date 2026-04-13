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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>Enrollment History</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px', marginTop: '4px' }}>View all your past and current medical insurance sessions.</p>
            </header>

            {loading ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>Loading enrollment history...</div>
                </div>
            ) : history.length === 0 ? (
                <div className="glass-panel" style={{ padding: '6rem', textAlign: 'center', border: 'var(--border)' }}>
                    <HistoryIcon size={48} color="var(--border-color)" style={{ marginBottom: '1.5rem' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-main)' }}>No Prior Records Found</h3>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px', marginTop: '8px' }}>You haven't completed any enrollments in the system yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.map(item => (
                        <div key={item._id || item.id} className="glass-panel" style={{ padding: '1.5rem', border: 'var(--border)', background: 'var(--bg-card)', borderRadius: '12px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ borderRight: '0.5px solid #DDE3EE', paddingRight: '1rem' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#475E75', marginBottom: '4px' }}>FINANCIAL YEAR</div>
                                    <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-main)' }}>FY {item.financialYear || item.fyName || '---'}</div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#475E75', marginBottom: '4px' }}>PLAN TYPE</div>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>{item.coverageId || '---'}</div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: '#475E75', marginBottom: '4px' }}>TOTAL PREMIUM</div>
                                    <div style={{ fontSize: '18px', fontWeight: 500, color: '#185FA5' }}>₹{item.amount?.toLocaleString() || item.premium?.toLocaleString()}</div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px' }}>STATUS</div>
                                    <div style={{ 
                                        display: 'inline-block', 
                                        padding: '4px 10px', 
                                        background: item.status === 'VERIFIED' ? 'var(--accent-green-bg)' : item.status === 'REJECTED' ? 'var(--bg-surface)' : 'var(--accent-blue-bg)', 
                                        color: item.status === 'VERIFIED' ? 'var(--accent-green-text)' : item.status === 'REJECTED' ? 'var(--danger)' : 'var(--accent-blue-text)', 
                                        fontSize: '11px', 
                                        fontWeight: 500, 
                                        borderRadius: '20px',
                                        border: 'var(--border)'
                                    }}>
                                        {item.status?.replace('_', ' ') || 'SUBMITTED'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '0.5px dashed #DDE3EE' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <Users size={14} color="#475E75" />
                                    <span style={{ fontWeight: 500, fontSize: '11px', color: '#475E75' }}>COVERED MEMBERS:</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div key="self" style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 400, color: 'var(--text-main)', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                                        {item.userName || user?.name} (Self)
                                    </div>
                                    {item.dependents?.map((d, idx) => (
                                        <div key={idx} style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 400, color: 'var(--text-main)', background: 'var(--bg-surface)', borderRadius: '4px' }}>
                                            {d.name} ({d.type})
                                        </div>
                                    ))}
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
