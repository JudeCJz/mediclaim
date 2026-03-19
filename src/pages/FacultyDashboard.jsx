import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Heart, UserPlus, Trash2, CheckCircle, ShieldCheck, Loader2, Save, Printer, User, Briefcase, X, AlertTriangle, ArrowLeft } from 'lucide-react';

const FacultyDashboard = () => {
    const { user } = useApp();
    const [years, setYears] = useState([]);
    const [selectedFY, setSelectedFY] = useState(null);
    const [profile, setProfile] = useState({ empId: '', phone: '', department: '', designation: '', doj: '', gender: 'Male' });
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [dependents, setDependents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [userSubmissions, setUserSubmissions] = useState({});

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "financialYears"), (snap) => {
            setYears(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.name.localeCompare(a.name)));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (user) {
            const unsub = onSnapshot(query(collection(db, "submissions"), where("userId", "==", user.uid)), (snap) => {
                const map = {};
                snap.docs.forEach(d => map[d.data().fyId] = { id: d.id, ...d.data() });
                setUserSubmissions(map);
            });
            return () => unsub();
        }
    }, [user]);

    const enterYear = (fy) => {
        setSelectedFY(fy);
        setSuccess(false);
        const sub = userSubmissions[fy.id];
        if (sub) {
            setExistingSubmission(sub);
            setSelectedPolicy(sub.policy);
            setDependents(sub.dependents || []);
            setProfile({ 
                empId: sub.empId || '', 
                phone: sub.phone || user.phone || '', 
                department: sub.department || user.department || '', 
                designation: sub.designation || '',
                doj: sub.doj || '',
                gender: sub.gender || 'Male'
            });
        } else {
            setExistingSubmission(null);
            setSelectedPolicy(null);
            setDependents([]);
            setProfile({ 
                empId: '', 
                phone: user.phone || '', 
                department: (user.department || '').toUpperCase(), 
                designation: '',
                doj: '',
                gender: 'Male'
            });
        }
    };

    const isAfterDeadline = selectedFY?.deadline && new Date() > new Date(selectedFY.deadline);
    const isLocked = !selectedFY?.enabled || isAfterDeadline;

    const addDep = (type) => {
        if (isLocked) return;
        const counts = dependents.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
        if (type === 'child' && (counts.child || 0) >= selectedFY.maxChildren) return alert(`Max ${selectedFY.maxChildren} children allowed.`);
        if (type === 'parent' && (counts.parent || 0) >= selectedFY.maxParents) return alert(`Max ${selectedFY.maxParents} parents allowed.`);
        setDependents([...dependents, { id: Date.now(), type, name: '', gender: 'Male', dob: '', relation: type }]);
    };

    const handleSubmit = async () => {
        if (isLocked) return alert("Submission period has ended or is locked.");
        if (!selectedPolicy || !profile.empId) return alert("Complete all profile and policy details.");
        
        setIsSubmitting(true);
        const data = {
            userId: user.uid,
            userName: user.name,
            email: user.email,
            ...profile,
            policy: selectedPolicy,
            coverageId: selectedPolicy.label,
            premium: selectedPolicy.premium,
            dependents,
            fyId: selectedFY.id,
            timestamp: serverTimestamp()
        };
        try {
            if (existingSubmission) {
                await updateDoc(doc(db, "submissions", existingSubmission.id), data);
            } else {
                await addDoc(collection(db, "submissions"), data);
            }
            // Also update the core user profile for central archival
            await updateDoc(doc(db, "users", user.uid), {
                phone: profile.phone,
                doj: profile.doj,
                gender: profile.gender,
                empId: profile.empId,
                department: profile.department,
                designation: profile.designation
            });
            setSuccess(true);
            setTimeout(() => setSelectedFY(null), 2500);
        } catch (err) { console.error(err); alert("Error saving data."); }
        finally { setIsSubmitting(false); }
    };

    if (!selectedFY) return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ marginBottom: '4rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2.5rem' }}>
                <h1 style={{ fontSize: '3.5rem', fontWeight: 900, lineHeight: 1.1 }}>Enrollment Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>Select a financial cycle to start enrollment or view history</p>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2.5rem' }}>
                {years.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '8rem', textAlign: 'center', opacity: 0.5, border: '2px dashed var(--border-glass)' }}>
                        <AlertTriangle size={80} style={{ marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Nothing here</h2>
                        <p style={{ fontWeight: 800 }}>Institutional enrollment cycles are currently offline or de-authorized.</p>
                    </div>
                ) : years.map(y => {
                    const sub = userSubmissions[y.id];
                    const expired = y.deadline && new Date() > new Date(y.deadline);
                    const locked = !y.enabled || expired;
                    
                    return (
                        <div key={y.id} className="glass-panel" onClick={() => enterYear(y)} style={{ 
                            padding: '3rem', 
                            cursor: 'pointer', 
                            borderLeft: `12px solid ${locked ? '#94a3b8' : sub ? '#22c55e' : 'var(--primary)'}`,
                            transition: 'transform 0.3s ease, background 0.3s ease'
                        }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
                                <Briefcase size={40} color={locked ? '#94a3b8' : 'var(--primary)'} />
                                <div style={{ 
                                    padding: '0.5rem 1.2rem', 
                                    border: '2px solid', 
                                    fontSize: '0.7rem', 
                                    fontWeight: 900, 
                                    color: locked ? '#94a3b8' : sub ? '#22c55e' : 'var(--primary)',
                                    background: 'rgba(255,255,255,0.03)'
                                }}>
                                    {locked ? 'ARCHIVE_VIEW' : sub ? 'ACTIVE_ENROLLED' : 'ACTION_REQUIRED'}
                                </div>
                            </div>
                            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>FY {y.name}</h2>
                            <p style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 700 }}>CYCLE DEADLINE: {y.deadline || 'PERMANENT_SESSION'}</p>
                            
                            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: locked ? '#94a3b8' : 'var(--primary)', fontWeight: 900, fontSize: '0.9rem' }}>
                                    {locked ? <><ShieldCheck size={20} /> VIEW SUMMARY</> : sub ? <><Save size={20} /> EDIT DETAILS</> : <><UserPlus size={20} /> BEGIN ENROLLMENT</>}
                                </div>
                                {sub && <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#22c55e' }}>[ INSURED ]</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '5rem' }}>
            <div className="flex-adaptive-header">
                <button className="btn btn-ghost" onClick={() => setSelectedFY(null)} style={{ border: '2px solid var(--border-glass)', padding: '0.8rem 2rem' }}><ArrowLeft /> EXIT_TO_DASHBOARD</button>
                <div className="header-info">
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900 }}>FINANCIAL_CYCLE {selectedFY.name}</h1>
                    <p style={{ color: isLocked ? '#ef4444' : '#22c55e', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>{isLocked ? 'READ_ONLY_ACCESS_ONLY' : 'MODIFICATION_WINDOW_OPEN'}</p>
                </div>
            </div>

            {success ? (
                <div className="glass-panel" style={{ padding: '8rem', textAlign: 'center', borderTop: '12px solid #22c55e' }}>
                    <CheckCircle size={100} color="#22c55e" style={{ marginBottom: '2rem' }} className="animate-pulse" />
                    <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Update Finalized!</h2>
                    <p style={{ opacity: 0.7, fontWeight: 700, fontSize: '1.2rem' }}>Your records for FY {selectedFY.name} have been synchronized. Redirecting...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '3rem' }}>
                    {/* 1. Profile Section */}
                    <section className="glass-panel" style={{ padding: '3rem' }}>
                        <h2 style={{ marginBottom: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}><User size={24} color="var(--primary)" /> Personal & Professional Details</h2>
                        <div className="responsive-auto-grid" style={{ gap: '1.2rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>EMPLOYEE ID</label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.9rem' }} value={profile.empId} onChange={e => setProfile({...profile, empId: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>PHONE NUMBER</label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.9rem' }} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DEPARTMENT</label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.9rem', textTransform: 'uppercase', fontWeight: 900 }} value={profile.department} onChange={e => setProfile({...profile, department: e.target.value.toUpperCase()})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DESIGNATION</label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.9rem' }} value={profile.designation} onChange={e => setProfile({...profile, designation: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>GENDER</label>
                                <select disabled={isLocked} className="glass-panel" style={{ width: '100%', padding: '0.9rem', background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                                    <option style={{ background: 'var(--bg-main)' }}>Male</option>
                                    <option style={{ background: 'var(--bg-main)' }}>Female</option>
                                    <option style={{ background: 'var(--bg-main)' }}>Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DATE OF JOINING</label>
                                <input disabled={isLocked} type="date" className="glass-panel" style={{ width: '100%', padding: '0.9rem', color: 'var(--text-main)' }} value={profile.doj} onChange={e => setProfile({...profile, doj: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* 2. Policy Section */}
                    <section className="glass-panel" style={{ padding: '3rem' }}>
                        <h2 style={{ marginBottom: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}><Heart size={26} color="var(--primary)" /> Policy Selection Tiers</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {selectedFY.policies?.map(p => (
                                <div key={p.id} className="glass-panel" onClick={() => !isLocked && setSelectedPolicy(p)}
                                    style={{ padding: '2rem', cursor: isLocked ? 'default' : 'pointer', border: selectedPolicy?.id === p.id ? '3px solid #22c55e' : '1px solid var(--border-glass)', background: selectedPolicy?.id === p.id ? 'rgba(34,197,94,0.08)' : 'transparent' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>{p.label}</h3>
                                        {selectedPolicy?.id === p.id && <CheckCircle size={22} color="#22c55e" />}
                                    </div>
                                    <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#22c55e' }}>₹{p.premium.toLocaleString()}</div>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 900, letterSpacing: '1px' }}>ANNUAL_RECURRING_PREMIUM</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. Dependents Section */}
                    <section className="glass-panel" style={{ padding: '3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h2 style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}><UserPlus size={26} color="var(--primary)" /> Insured Beneficiaries</h2>
                            {!isLocked && (
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('spouse')}>+ SPOUSE</button>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('child')}>+ CHILD</button>
                                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('parent')}>+ PARENT</button>
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {dependents.map(d => (
                                <div key={d.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.7rem', letterSpacing: '1.5px' }}>{d.type.toUpperCase()}_SLOT</span>
                                        {!isLocked && (
                                            <button className="btn btn-ghost" style={{ width: '45px', height: '45px', background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => setDependents(dependents.filter(x=>x.id!==d.id))}>
                                                <Trash2 size={24} color="#ef4444" strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>FULL NAME</label>
                                        <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '1rem' }} placeholder="Ex: John Doe" value={d.name} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, name: e.target.value} : x))} />
                                    </div>
                                    <div className="responsive-auto-grid" style={{ gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>GENDER</label>
                                            <select disabled={isLocked} className="glass-panel" style={{ width: '100%', padding: '1rem', background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={d.gender} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, gender: e.target.value} : x))}>
                                                <option style={{ background: 'var(--bg-main)' }}>Male</option><option style={{ background: 'var(--bg-main)' }}>Female</option><option style={{ background: 'var(--bg-main)' }}>Other</option>
                                            </select>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DATE OF BIRTH</label>
                                                {d.dob && (
                                                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.6rem', border: '1px solid var(--primary-glow)' }}>
                                                        [ AGE: {Math.floor((new Date() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))} ]
                                                    </span>
                                                )}
                                            </div>
                                            <input disabled={isLocked} type="date" className="glass-panel" style={{ width: '100%', padding: '1rem', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={d.dob} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, dob: e.target.value} : x))} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {dependents.length === 0 && <div style={{ textAlign: 'center', padding: '5rem', border: '3px dashed var(--border-glass)', borderRadius: '15px', opacity: 0.5, fontWeight: 900 }}>EMPTY_REGISTRY: NO_DEPENDENTS_ADDED</div>}
                        </div>
                    </section>

                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                        {!isLocked ? (
                            <button className="btn btn-primary" style={{ padding: '1.5rem 6rem', width: '100%', maxWidth: '600px', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }} onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={24} /> {existingSubmission ? 'UPDATE ENROLLMENT DATA' : 'FINALIZE SUBMISSION'}</>}
                            </button>
                        ) : (
                            <div className="glass-panel" style={{ padding: '3rem', background: 'rgba(239, 68, 68, 0.05)', border: '2px solid rgba(239, 68, 68, 0.2)' }}>
                                <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
                                <h3 style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '2px' }}>SESSION_LOCKED: READ_ONLY_FINALIZED</h3>
                                <p style={{ opacity: 0.7, fontWeight: 700, marginTop: '0.5rem' }}>The submission window for this financial cycle is closed. You can only view your data.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyDashboard;
