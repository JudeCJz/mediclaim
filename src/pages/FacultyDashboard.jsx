import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { Heart, UserPlus, Trash2, CheckCircle, ShieldCheck, Loader2, ArrowRight, ArrowLeft, Printer, Mail, User, Phone, Briefcase } from 'lucide-react';

const FacultyDashboard = () => {
    const { user, activeFY } = useApp();
    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState({ empId: '', phone: '', department: '', designation: '' });
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [dependents, setDependents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);

    useEffect(() => {
        if (user && activeFY) checkExisting();
    }, [user, activeFY]);

    const checkExisting = async () => {
        const q = query(collection(db, "submissions"), where("userId", "==", user.uid), where("fyId", "==", activeFY.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const data = snap.docs[0].data();
            setExistingSubmission({ id: snap.docs[0].id, ...data });
            setSelectedPolicy(data.policy);
            setDependents(data.dependents || []);
            setProfile({ empId: data.empId, phone: data.phone, department: data.department, designation: data.designation });
            if (!activeFY.enabled) setStep(4); // View only
        }
    };

    const addDep = (type) => {
        const counts = dependents.reduce((acc, d) => { acc[d.type] = (acc[d.type] || 0) + 1; return acc; }, {});
        if (type === 'child' && (counts.child || 0) >= activeFY.maxChildren) return alert(`Max ${activeFY.maxChildren} children allowed.`);
        if (type === 'parent' && (counts.parent || 0) >= activeFY.maxParents) return alert(`Max ${activeFY.maxParents} parents allowed.`);
        setDependents([...dependents, { id: Date.now(), type, name: '', gender: 'Male', dob: '', relation: type }]);
    };

    const handleSubmit = async () => {
        if (!selectedPolicy || !profile.empId) return alert("Complete all details.");
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
            fyId: activeFY.id,
            timestamp: serverTimestamp()
        };
        try {
            if (existingSubmission) {
                await updateDoc(doc(db, "submissions", existingSubmission.id), data);
            } else {
                await addDoc(collection(db, "submissions"), data);
            }
            setSuccess(true);
        } catch (err) { console.error(err); alert("Error saving data."); }
        finally { setIsSubmitting(false); }
    };

    if (success) return (
        <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', borderTop: '10px solid #22c55e' }}>
            <CheckCircle size={80} color="#22c55e" style={{ marginBottom: '2rem' }} />
            <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Enrolled</h1>
            <div className="glass-panel" style={{ textAlign: 'left', margin: '2rem auto', maxWidth: '600px', padding: '2rem' }}>
                <h3 style={{ borderBottom: '2px dashed var(--border-glass)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>Summary</h3>
                <p><strong>Member:</strong> {user.name} ({profile.empId})</p>
                <p><strong>Policy:</strong> {selectedPolicy.label}</p>
                <p><strong>Premium:</strong> ₹{selectedPolicy.premium.toLocaleString()}</p>
                <p><strong>Dependents:</strong> {dependents.length} insured</p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => window.print()}><Printer /> Print</button>
                <button className="btn btn-ghost" onClick={() => window.location.reload()}>Finish</button>
            </div>
        </div>
    );

    if (!activeFY) return <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>No active financial year found. Contact Admin.</div>;

    return (
        <div>
            <header style={{ marginBottom: '3rem', borderLeft: '10px solid var(--primary)', paddingLeft: '1.5rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Medical Enrollment</h1>
                <p style={{ color: 'var(--text-muted)' }}>Status: {activeFY.enabled ? 'Enrollment Open' : 'View Only (Locked)'} | Year: {activeFY.name}</p>
            </header>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '3rem' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{ flex: 1, height: '10px', background: step >= i ? 'var(--primary)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)' }} />
                ))}
            </div>

            {step === 1 && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h2 style={{ marginBottom: '2.5rem', fontWeight: 900 }}>1. Personal Information</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, display: 'block', marginBottom: '0.5rem' }}>EMPLOYEE ID</label>
                            <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={profile.empId} onChange={e => setProfile({...profile, empId: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, display: 'block', marginBottom: '0.5rem' }}>PHONE NUMBER</label>
                            <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, display: 'block', marginBottom: '0.5rem' }}>DEPARTMENT</label>
                            <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={profile.department} onChange={e => setProfile({...profile, department: e.target.value})} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 900, display: 'block', marginBottom: '0.5rem' }}>DESIGNATION</label>
                            <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={profile.designation} onChange={e => setProfile({...profile, designation: e.target.value})} />
                        </div>
                    </div>
                    <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                        <button className="btn btn-primary" onClick={() => setStep(2)}>Next Step <ArrowRight /></button>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <h2 style={{ marginBottom: '2.5rem', fontWeight: 900 }}>2. Choose Coverage Option</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {activeFY.policies.map(p => (
                            <div key={p.id} className="glass-panel" 
                                onClick={() => activeFY.enabled && setSelectedPolicy(p)}
                                style={{ 
                                    padding: '2.5rem', cursor: activeFY.enabled ? 'pointer' : 'default',
                                    border: selectedPolicy?.id === p.id ? '4px solid var(--primary)' : '2px solid var(--border-glass)',
                                    background: selectedPolicy?.id === p.id ? 'rgba(99,102,241,0.05)' : 'transparent'
                                }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>{p.label}</h3>
                                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>₹{p.premium.toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>PER FINANCIAL YEAR</div>
                            </div>
                        ))}
                    </div>
                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft /> Back</button>
                        <button className="btn btn-primary" disabled={!selectedPolicy} onClick={() => setStep(3)}>Next Step <ArrowRight /></button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontWeight: 900 }}>3. Family Members</h2>
                        {activeFY.enabled && (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-ghost" onClick={() => addDep('spouse')}>+ Spouse</button>
                                <button className="btn btn-ghost" onClick={() => addDep('child')}>+ Child</button>
                                <button className="btn btn-ghost" onClick={() => addDep('parent')}>+ Parent</button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {dependents.map(d => (
                            <div key={d.id} className="glass-panel" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '120px 1fr 150px 200px 50px', gap: '1rem', alignItems: 'center' }}>
                                <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{d.type.toUpperCase()}</span>
                                <input className="glass-panel" style={{ padding: '0.8rem' }} placeholder="Full Name" value={d.name} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, name: e.target.value} : x))} />
                                <select className="glass-panel" style={{ padding: '0.8rem', color: 'var(--text-main)', background: 'var(--bg-glass)' }} value={d.gender} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, gender: e.target.value} : x))}>
                                    <option style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>Male</option>
                                    <option style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>Female</option>
                                    <option style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>Other</option>
                                </select>
                                <input type="date" className="glass-panel" style={{ padding: '0.8rem', color: 'var(--text-main)' }} value={d.dob} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, dob: e.target.value} : x))} />
                                {activeFY.enabled && (
                                    <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', height: '40px' }} onClick={() => setDependents(dependents.filter(x=>x.id!==d.id))}>
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {dependents.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No family members added.</div>}
                    </div>
                    <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft /> Back</button>
                        <button className="btn btn-primary" onClick={() => setStep(4)}>Final Review <ArrowRight /></button>
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <h2 style={{ marginBottom: '2.5rem', fontWeight: 900 }}>4. Summary & Confirmation</h2>
                    <div className="glass-panel" style={{ padding: '2.5rem', background: 'rgba(255,255,255,0.02)', border: '2px solid var(--border-glass)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                            <div>
                                <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>SUBSCRIBER</h4>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>{user.name}</div>
                                <div style={{ color: 'var(--text-muted)' }}>ID: {profile.empId}</div>
                                <div style={{ color: 'var(--text-muted)' }}>{profile.department} | {profile.designation}</div>
                            </div>
                            <div>
                                <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>SELECTED PLAN</h4>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>{selectedPolicy.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>₹{selectedPolicy.premium.toLocaleString()}</div>
                            </div>
                        </div>
                        <div style={{ marginTop: '2.5rem', borderTop: '2px dashed var(--border-glass)', paddingTop: '2rem' }}>
                            <h4 style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>DEPENDENTS ({dependents.length})</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                {dependents.map((d, i) => (
                                    <div key={i} style={{ padding: '1rem', border: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.1)' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)' }}>{d.type}</div>
                                        <div style={{ fontWeight: 800 }}>{d.name}</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{d.dob} ({d.gender})</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between' }}>
                        <button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft /> Modify</button>
                        {activeFY.enabled ? (
                            <button className="btn btn-primary" style={{ padding: '1rem 4rem' }} onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <div className="btn-loader"><ShieldCheck size={20} /></div> : existingSubmission ? 'UPDATE ENROLLMENT' : 'SUBMIT ENROLLMENT'}
                            </button>
                        ) : (
                            <div style={{ color: '#ef4444', fontWeight: 900 }}>ENROLLMENT LOCKED BY ADMIN</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FacultyDashboard;
