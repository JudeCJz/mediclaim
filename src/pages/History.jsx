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
                        <div key={item.id} className="glass-panel" style={{ padding: '2.5rem', border: '3px solid var(--border-glass)', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem 2rem', background: 'var(--primary)', color: 'white', fontWeight: 900, fontSize: '0.75rem', transform: 'skewX(-20deg)', marginRight: '-10px' }}>
                                Official Confirmation
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
                                <div style={{ borderRight: '2px solid var(--border-glass)', paddingRight: '2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <Calendar size={18} color="var(--primary)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>SESSION ID</span>
                                    </div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{item.fyName || '---'}</div>
                                </div>

                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                        <ShieldCheck size={20} color="#22c55e" />
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 900 }}>{item.coverageId} PLAN</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>TOTAL PREMIUM</span>
                                            <span style={{ fontWeight: 900, color: '#22c55e', fontSize: '1.1rem' }}>₹{item.premium?.toLocaleString()}</span>
                                        </div>
                                        <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>LIVES COVERED</span>
                                            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>{(item.dependents?.length || 0) + 1}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'left', borderTop: '2px dashed var(--border-glass)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                        <Users size={16} color="var(--text-muted)" />
                                        <span style={{ fontWeight: 900, fontSize: '0.7rem', color: 'var(--text-muted)' }}>FAMILY MEMBERS:</span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 800, lineHeight: '1.8' }}>
                                        {item.dependents?.map(d => d.name).join(' • ') || 'No dependents added'}
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
