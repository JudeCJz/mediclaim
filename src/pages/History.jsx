import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { History as HistoryIcon, ShieldCheck, Calendar, Users, Info } from 'lucide-react';

const History = () => {
    const { user } = useApp();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "submissions"), 
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [user]);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Enrollment Archive</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Past records and validated submissions</p>
            </header>

            {loading ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <div className="loader" style={{ fontSize: '1rem', fontWeight: 900 }}>RETRIEVING_DATA_STREAM...</div>
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
                        <div key={item.id} className="glass-panel" style={{ padding: '2.5rem', border: '3px solid var(--border-glass)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem 2rem', background: 'var(--primary)', color: 'white', fontWeight: 900, fontSize: '0.75rem', transform: 'skewX(-20deg)', marginRight: '-10px' }}>
                                VALIDATED_SYSTEM_CONFIRMATION
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '2rem', alignItems: 'center' }}>
                                <div style={{ borderRight: '2px dashed var(--border-glass)', paddingRight: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <Calendar size={18} color="var(--primary)" />
                                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)' }}>RECORD_PERIOD</span>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>{item.fyName || '---'}</div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <ShieldCheck size={20} color="#22c55e" />
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{item.coverageId} Coverage</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PREMIUM</span>
                                            <span style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{item.premium?.toLocaleString()}</span>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LIVES_COVERED</span>
                                            <span style={{ fontWeight: 900 }}>{(item.dependents?.length || 0) + 1} Members</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                                        <Users size={16} color="var(--text-muted)" />
                                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Dependents Registry:</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, lineHeight: '1.6' }}>
                                        {item.dependents?.map(d => d.name).join(', ') || 'Self Only'}
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
