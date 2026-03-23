import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { Heart, UserPlus, Trash2, CheckCircle, ShieldCheck, Loader2, Save, Printer, User, Briefcase, X, AlertTriangle, ArrowLeft } from 'lucide-react';

const FacultyDashboard = () => {
    const { user, isDemoMode, activeFY } = useApp();
    const [years, setYears] = useState([]);
    const [selectedFY, setSelectedFY] = useState(null);
    const [profile, setProfile] = useState({ empId: '', phone: '', department: '', designation: '', doj: '', gender: 'Male' });
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [dependents, setDependents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [userSubmissions, setUserSubmissions] = useState({});
    const [allHistory, setAllHistory] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ title: '', text: '', onConfirm: null });

    const AlertModal = ({ config, onClose }) => {
        if (!config.title) return null;
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
                <div className="glass-panel animate-pop" style={{ width: '90%', maxWidth: '450px', padding: '3rem', textAlign: 'center', border: '2px solid var(--border-glass)', background: 'var(--bg-card)', boxShadow: '20px 20px 0px rgba(0,0,0,0.4)' }}>
                    <div style={{ width: '80px', height: '80px', background: 'var(--primary-glow)', borderRadius: '15px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <ShieldCheck size={40} />
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', textTransform: 'uppercase' }}>{config.title}</h2>
                    <p style={{ opacity: 0.7, fontWeight: 700, marginBottom: '2.5rem' }}>{config.text}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: config.onConfirm ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                        {config.onConfirm && <button className="btn btn-ghost" style={{ padding: '1.2rem', fontWeight: 900 }} onClick={onClose}>CANCEL</button>}
                        <button className="btn btn-primary" style={{ padding: '1.2rem', fontWeight: 900 }} onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }}>
                            {config.onConfirm ? 'CONFIRM' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    useEffect(() => {
        if (isDemoMode) {
            setYears([activeFY]);
            return;
        }
        const unsub = onSnapshot(collection(db, "financialYears"), (snap) => {
            setYears(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.name.localeCompare(a.name)));
        });
        return () => unsub();
    }, [isDemoMode, activeFY]);

    useEffect(() => {
        if (user) {
            if (isDemoMode) {
                // In Demo Mode, submissions are local to the session
                const savedSub = localStorage.getItem(`sub_${user.email}_${activeFY.id}`);
                const map = {};
                if (savedSub) {
                    const subData = JSON.parse(savedSub);
                    map[activeFY.id] = subData;
                    setAllHistory([subData]);
                } else {
                    setAllHistory([]);
                }
                setUserSubmissions(map);
                setLoadingAll(false);
                return;
            }
            const q = query(collection(db, "submissions"), where("userId", "==", user.uid), where("archived", "==", false));
            const unsub = onSnapshot(q, (snap) => {
                const map = {};
                snap.docs.forEach(d => map[d.data().fyId] = { id: d.id, ...d.data() });
                setUserSubmissions(map);
            });

            // Fetch all history (including archived) for the bottom section
            const qAll = query(collection(db, "submissions"), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
            const unsubAll = onSnapshot(qAll, (snap) => {
                setAllHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoadingAll(false);
            });

            return () => { unsub(); unsubAll(); };
        }
    }, [user, isDemoMode, activeFY]);

    useEffect(() => {
        const saved = localStorage.getItem('faculty_selected_fy');
        if (saved && years.length > 0) {
            const fy = years.find(y => y.id === saved);
            if (fy) enterYear(fy);
        }
    }, [years]);

    const enterYear = (fy) => {
        localStorage.setItem('faculty_selected_fy', fy.id);
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
        if (type === 'child' && (counts.child || 0) >= selectedFY.maxChildren) return setAlertConfig({ title: 'Limit Reached', text: `Only ${selectedFY.maxChildren} children allowed.` });
        if (type === 'parent' && (counts.parent || 0) >= selectedFY.maxParents) return setAlertConfig({ title: 'Limit Reached', text: `Only ${selectedFY.maxParents} parents allowed.` });
        setDependents([...dependents, { id: Date.now(), type, name: '', gender: 'Male', dob: '', relation: type }]);
    };

    const handleSubmit = async () => {
        if (isLocked) return setAlertConfig({ title: 'Access Denied', text: "Enrollment window is closed." });
        if (!selectedPolicy || !profile.empId) return setAlertConfig({ title: 'Incomplete', text: "Please complete all mandatory fields." });
        
        setIsSubmitting(true);
        const data = {
            userId: user.uid,
            userName: user.name,
            email: user.email,
            ...profile,
            policy: selectedPolicy,
            coverageId: selectedPolicy.label,
            basePremium: selectedPolicy.premium,
            spousePremium: (dependents.some(d => d.relation === 'Spouse') ? (selectedFY.spousePremium || 0) : 0),
            childrenPremium: (dependents.filter(d => d.relation === 'Child').length * (selectedFY.childPremium || 0)),
            parentsPremium: (dependents.filter(d => d.relation === 'Father' || d.relation === 'Mother').length * (selectedFY.parentPremium || 0)),
            premium: selectedPolicy.premium + 
                     (dependents.some(d => d.relation === 'Spouse') ? (selectedFY.spousePremium || 0) : 0) +
                     (dependents.filter(d => d.relation === 'Child').length * (selectedFY.childPremium || 0)) +
                     (dependents.filter(d => d.relation === 'Father' || d.relation === 'Mother').length * (selectedFY.parentPremium || 0)),
            dependents,
            fyId: selectedFY.id,
            archived: false,
            timestamp: serverTimestamp()
        };
        if (isDemoMode) {
            localStorage.setItem(`sub_${user.email}_${selectedFY.id}`, JSON.stringify(data));
            // Simulate profile update
            const updatedUser = { ...user, ...profile };
            localStorage.setItem('mediclaim_user', JSON.stringify(updatedUser));
            setSuccess(true);
            setTimeout(() => window.location.reload(), 2000); // Reload to sync
            return;
        }
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
        } catch (err) { console.error(err); setAlertConfig({ title: 'Error', text: "Failed to save data. Please try again." }); }
        finally { setIsSubmitting(false); }
    };

    const exitToHome = () => {
        localStorage.removeItem('faculty_selected_fy');
        setSelectedFY(null);
    };

    if (!selectedFY) return (
        <div style={{ width: '100%', margin: '0 auto' }}>
            <header style={{ marginBottom: '3.5rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.1 }}>Enrollment Dashboard</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>Active institutional enrollment sessions and cycle selection.</p>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
                {years.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '8rem', textAlign: 'center', opacity: 0.5, border: '2px dashed var(--border-glass)' }}>
                        <AlertTriangle size={80} style={{ marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Nothing here</h2>
                        <p style={{ fontWeight: 800 }}>Institutional enrollment cycles are currently offline or de-authorized.</p>
                    </div>
                ) : years.map(y => {
                    const sub = userSubmissions[y.id];
                    const expired = y.deadline && new Date() > new Date(y.deadline);
                    const locked = !y.enabled || expired || y.isArchived;
                    const color = locked ? '#94a3b8' : sub ? 'var(--primary)' : '#22c55e';
                    
                    return (
                        <div key={y.id} className="glass-panel" onClick={() => enterYear(y)} style={{ 
                            padding: '2.5rem', 
                            cursor: 'pointer', 
                            borderLeft: `10px solid ${color}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1.5rem',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: 'rgba(255,255,255,0.01)',
                            position: 'relative',
                            overflow: 'hidden'
                        }} onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-8px)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        }} onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                        }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ width: '45px', height: '45px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
                                    <Briefcase size={22} color={color} />
                                </div>
                                <div style={{ 
                                    padding: '0.4rem 1rem', 
                                    background: `${color}10`, 
                                    border: `1px solid ${color}40`, 
                                    fontSize: '0.65rem', 
                                    fontWeight: 900, 
                                    color: color,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {locked ? 'CLOSED' : sub ? 'ENROLLED' : 'AVAILABLE'}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '2px' }}>FINANCIAL CYCLE</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.2rem' }}>FY {y.name}</div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
                                <div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DEADLINE</div>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: expired ? '#ef4444' : 'inherit' }}>{y.deadline || 'NO_LIMIT'}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: color, fontWeight: 900, fontSize: '0.8rem' }}>
                                    {locked ? <ShieldCheck size={18} /> : sub ? <Save size={18} /> : <UserPlus size={18} />}
                                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {locked ? 'VIEW' : sub ? 'EDIT THE ENTRY' : 'ENTER ENROLLMENT'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '6rem' }}>
                <header style={{ marginBottom: '2.5rem', borderLeft: '12px solid var(--border-glass)', paddingLeft: '2.5rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Submission Timeline</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Legacy archives and historical enrollment snapshots.</p>
                </header>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {loadingAll ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={30} color="var(--primary)" />
                        </div>
                    ) : allHistory.filter(item => {
                        const fy = years.find(y => y.id === item.fyId);
                        const isFyLocked = fy && (!fy.enabled || fy.isArchived || (fy.deadline && new Date() > new Date(fy.deadline)));
                        return isFyLocked || item.archived;
                    }).length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                            <p style={{ fontWeight: 900 }}>No finalized historical snapshots available yet.</p>
                        </div>
                    ) : (
                        allHistory.filter(item => {
                            const fy = years.find(y => y.id === item.fyId);
                            const isFyLocked = fy && (!fy.enabled || fy.isArchived || (fy.deadline && new Date() > new Date(fy.deadline)));
                            return isFyLocked || item.archived;
                        }).map(item => (
                            <div key={item.id} className="glass-panel" style={{ padding: '1.5rem 2rem', border: '2px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>SESSION</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{item.fyName || item.fyId?.slice(0,8)}</div>
                                    </div>
                                    <div style={{ height: '30px', width: '2px', background: 'var(--border-glass)' }} />
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>COVERAGE</div>
                                        <div style={{ fontWeight: 900 }}>{item.coverageId}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>SUBMITTED</div>
                                        <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{item.timestamp?.toDate().toLocaleDateString() || 'ARCHIVED'}</div>
                                    </div>
                                </div>
                                <div style={{ padding: '0.4rem 1rem', background: 'var(--primary)', color: 'white', fontWeight: 900, fontSize: '0.6rem', letterSpacing: '1px' }}>
                                    VERIFIED_ARCHIVE
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', margin: '0 auto', paddingBottom: '5rem' }}>
            <div className="flex-adaptive-header">
                <button className="btn btn-ghost" onClick={exitToHome} style={{ border: '2px solid var(--border-glass)', padding: '0.8rem 2rem' }}><ArrowLeft /> EXIT_TO_HOME</button>
                <div className="header-info">
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 900 }}>FINANCIAL CYCLE {selectedFY.name}</h1>
                    <p style={{ color: isLocked ? '#ef4444' : '#22c55e', fontWeight: 900, fontSize: '0.75rem', letterSpacing: '1px' }}>{isLocked ? 'VIEW_ONLY' : 'ENROLLMENT_OPEN'}</p>
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
                        <h2 style={{ marginBottom: '2rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)' }}>
                            <User size={24} color="var(--primary)" /> Personal & Professional Details
                        </h2>
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
                                    <div style={{ fontSize: '0.65rem', opacity: 0.6, fontWeight: 900, letterSpacing: '1px' }}>Annual Premium</div>
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
                                    {selectedFY.allowSpouse && <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('spouse')}>+ SPOUSE</button>}
                                    {selectedFY.allowChildren && <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('child')}>+ CHILD</button>}
                                    {selectedFY.allowParents && <button className="btn btn-ghost" style={{ fontSize: '0.75rem', border: '1px solid var(--border-glass)' }} onClick={() => addDep('parent')}>+ PARENT</button>}
                                </div>
                            )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {dependents.map(d => (
                                <div key={d.id} className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.7rem', letterSpacing: '1.5px' }}>{d.type.toUpperCase()} INFORMATION</span>
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
                                                        (Age: {Math.floor((new Date() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))})
                                                    </span>
                                                )}
                                            </div>
                                            <input disabled={isLocked} type="date" className="glass-panel" style={{ width: '100%', padding: '1rem', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={d.dob} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, dob: e.target.value} : x))} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {dependents.length === 0 && <div style={{ textAlign: 'center', padding: '5rem', border: '3px dashed var(--border-glass)', borderRadius: '15px', opacity: 0.5, fontWeight: 900 }}>No dependents added yet.</div>}
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
                                <h3 style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '2px' }}>ENROLLMENT CLOSED</h3>
                                <p style={{ opacity: 0.7, fontWeight: 700, marginTop: '0.5rem' }}>The submission window for this financial cycle is closed. You can only view your data.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <AlertModal config={alertConfig} onClose={() => setAlertConfig({ title: '', text: '', onConfirm: null })} />
        </div>
    );
};

export default FacultyDashboard;
