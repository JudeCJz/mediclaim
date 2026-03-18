import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { Users, FileText, Search, Download, Trash2, Upload, Loader2, Settings, ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus } from 'lucide-react';

const recruiterApp = initializeApp(firebaseConfig, "ADMIN_MASTER_V2");
const recruiterAuth = getAuth(recruiterApp);

const AdminDashboard = () => {
    const { user, activeFY, activeTab, setActiveTab } = useApp();
    const [years, setYears] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkData, setBulkData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFYModal, setShowFYModal] = useState(false);
    const [showMailModal, setShowMailModal] = useState(false);
    const [isMailing, setIsMailing] = useState(false);
    const [isSavingFY, setIsSavingFY] = useState(false);
    
    const [editingFYId, setEditingFYId] = useState(null);
    const [newFY, setNewFY] = useState({ 
        name: '2026-2027', 
        maxChildren: 2, 
        maxParents: 4, 
        enabled: true, 
        policies: [
            { id: 'p1', label: '1.5 Lakhs', premium: 4500 },
            { id: 'p2', label: '5 Lakhs', premium: 8500 }
        ] 
    });

    const [tempPolicy, setTempPolicy] = useState({ label: '', premium: '' });

    useEffect(() => {
        const unsubYears = onSnapshot(collection(db, "financialYears"), (snap) => setYears(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubSubs = onSnapshot(collection(db, "submissions"), (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        // Sorting faculty by createdAt DESC
        const unsubFaculty = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'faculty');
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setFaculty(list);
        });
        
        return () => { unsubYears(); unsubSubs(); unsubFaculty(); };
    }, []);

    const addPolicyToFY = () => {
        if (!tempPolicy.label || !tempPolicy.premium) return;
        setNewFY({
            ...newFY,
            policies: [...newFY.policies, { id: 'p' + Date.now(), label: tempPolicy.label, premium: Number(tempPolicy.premium) }]
        });
        setTempPolicy({ label: '', premium: '' });
    };

    const removePolicy = (id) => {
        setNewFY({ ...newFY, policies: newFY.policies.filter(p => p.id !== id) });
    };

    const saveFY = async () => {
        if (!newFY.name || newFY.policies.length === 0) return alert("Enter year name and at least one policy.");
        setIsSavingFY(true);
        try {
            if (editingFYId) {
                await updateDoc(doc(db, "financialYears", editingFYId), newFY);
            } else {
                await addDoc(collection(db, "financialYears"), { ...newFY, createdAt: new Date() });
            }
            setShowFYModal(false);
            setEditingFYId(null);
        } catch(err) { console.error(err); }
        finally { setIsSavingFY(false); }
    };

    const openCreate = () => {
        setEditingFYId(null);
        setNewFY({ name: '2026-2027', maxChildren: 2, maxParents: 4, enabled: true, policies: [{ id: 'p1', label: '1.5 Lakhs', premium: 4500 }, { id: 'p2', label: '5 Lakhs', premium: 8500 }] });
        setShowFYModal(true);
    };

    const openEdit = (fy) => {
        setEditingFYId(fy.id);
        setNewFY({ name: fy.name, maxChildren: fy.maxChildren || 2, maxParents: fy.maxParents || 4, enabled: fy.enabled, policies: fy.policies || [] });
        setShowFYModal(true);
    };

    const toggleYear = async (id, status) => {
        await updateDoc(doc(db, "financialYears", id), { enabled: !status });
    };

    const processBulk = async () => {
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        for (const row of rows) {
            const [name, dept, email] = row.split(",").map(s => s.trim());
            try {
                const cred = await createUserWithEmailAndPassword(recruiterAuth, email, email);
                await setDoc(doc(db, "users", cred.user.uid), { 
                    name, email, role: "faculty", 
                    department: dept || "Central Administration", 
                    status: 'active',
                    createdAt: serverTimestamp()
                });
            } catch (err) { console.error(err); }
        }
        alert("Registration complete."); setBulkData(""); setIsProcessing(false);
    };

    const processBulkDelete = async () => {
        if (!confirm("CONFIRM_BULK_DELETE? All personnel listed below will be purged from the registry.")) return;
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        for (const row of rows) {
            const [_, __, email] = row.split(",").map(s => s.trim());
            try {
                // Wipe user profile
                const qU = query(collection(db, "users"), where("email", "==", email));
                const snapU = await getDocs(qU);
                for (const d of snapU.docs) await deleteDoc(doc(db, "users", d.id));

                // Wipe matching submissions
                const qS = query(collection(db, "submissions"), where("email", "==", email));
                const snapS = await getDocs(qS);
                for (const d of snapS.docs) await deleteDoc(doc(db, "submissions", d.id));
            } catch (err) { console.error(err); }
        }
        alert("Purge complete."); setBulkData(""); setIsProcessing(false);
    };

    const exportCSV = () => {
        const h = "Name,EmpId,Email,Dept,Designation,Phone,Coverage,Premium,Lives,Dependents_List\n";
        const b = submissions.map(s => {
            const deps = s.dependents?.map(d => `${d.name} (${d.type} - ${d.gender})`).join(" | ") || "None";
            return `"${s.userName}","${s.empId || ''}","${s.email}","${s.department || ''}","${s.designation || ''}","${s.phone || ''}","${s.coverageId}","${s.premium}","${(s.dependents?.length || 0) + 1}","${deps}"`;
        }).join("\n");
        const blob = new Blob([h + b], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Medical_Enrollment_FY_${activeFY?.name || 'Report'}.csv`; a.click();
    };

    const dispatchEmails = () => {
        setIsMailing(true);
        setTimeout(() => {
            setIsMailing(false);
            setShowMailModal(false);
            alert(`Simulation Successfully Dispatched: All subscribers have received their confirmation emails with coverage, premium, and family breakdowns.`);
        }, 3000);
    };

    const handleFileUpload = (e) => {
        const f = e.target.files[0];
        const r = new FileReader();
        r.onload = (ev) => setBulkData(ev.target.result);
        r.readAsText(f);
    };

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '3rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>System Control</h1>
                <p style={{ color: 'var(--text-muted)' }}>Administrative Overview</p>
            </header>

            {activeTab === 'years' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Financial Years</h2>
                        <button className="btn btn-primary" onClick={openCreate}><Plus /> Add New Year</button>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Year</th><th>Status</th><th>Coverage Options</th><th>Family Limits</th><th>Actions</th></tr></thead>
                            <tbody>
                                {years.map(y => (
                                    <tr key={y.id}>
                                        <td style={{ fontWeight: 900, fontSize: '1.2rem' }}>{y.name}</td>
                                        <td>
                                            <div style={{ padding: '0.4rem 1rem', border: '2px solid', fontWeight: 900, fontSize: '0.7rem', color: y.enabled ? '#22c55e' : '#ef4444' }}>
                                                {y.enabled ? 'ACCEPTING ENROLLMENTS' : 'DISABLED'}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {y.policies?.map(p => (
                                                    <span key={p.id} style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.6rem', border: '1px solid var(--border-glass)' }}>
                                                        {p.label} (₹{p.premium.toLocaleString()})
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>CH: {y.maxChildren} / PA: {y.maxParents}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => openEdit(y)}><Edit size={16} /></button>
                                                <button className="btn btn-ghost" onClick={() => toggleYear(y.id, y.enabled)}>{y.enabled ? 'Disable' : 'Enable'}</button>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.4rem' }} onClick={async () => { if(confirm("X_DELETE_YEAR?")) await deleteDoc(doc(db,"financialYears", y.id)) }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'registry' && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                        <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                            <Search size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input className="glass-panel" style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 4.5rem', fontWeight: 700 }} placeholder="Search Name, ID, Dept, Designation, Phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', width: '100%', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowMailModal(true)}><Mail /> Send Confirmations</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={exportCSV}><Download /> Export CSV</button>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Faculty Member</th><th>Status</th><th>Coverage</th><th>Premium</th><th>Lives</th><th>Actions</th></tr></thead>
                            <tbody>
                                {submissions.filter(s => 
                                    s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                    s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    s.phone?.toLowerCase().includes(searchTerm.toLowerCase())
                                ).map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 800 }}>{s.userName}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.email}</div></td>
                                        <td style={{ paddingLeft: '1rem' }}><ShieldCheck size={14} color="#22c55e" /> Validated</td>
                                        <td style={{ fontWeight: 700 }}>{s.coverageId}</td>
                                        <td style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{s.premium?.toLocaleString()}</td>
                                        <td style={{ fontWeight: 800 }}>{s.dependents?.length + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={async () => { if(confirm("X_DELETE_ENTRY?")) await deleteDoc(doc(db,"submissions", s.id)) }}><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'recruit' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Add Faculty Members</h2>
                        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
                            <Upload size={18} /> Upload CSV
                            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
                        </label>
                    </div>
                    <textarea 
                        className="glass-panel" 
                        style={{ width: '100%', minHeight: '300px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', color: 'white', fontWeight: 700 }} 
                        value={bulkData} onChange={e => setBulkData(e.target.value)}
                        placeholder="Name, Department, Email"
                    />
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" style={{ color: '#ef4444', flex: 1 }} onClick={processBulkDelete} disabled={isProcessing || !bulkData}>
                            {isProcessing ? <div className="btn-loader"><ShieldCheck size={20} /></div> : <><UserMinus size={18} /> Bulk Delete</>}
                        </button>
                        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={processBulk} disabled={isProcessing || !bulkData}>
                            {isProcessing ? <div className="btn-loader"><ShieldCheck size={20} /></div> : 'Register Accounts'}
                        </button>
                    </div>

                    <div style={{ marginTop: '5rem', borderTop: '2px dashed var(--border-glass)', paddingTop: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>Registered Personnel Archive</h2>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 900 }}>[ SORTED_BY: NEWEST_FIRST ]</div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Faculty Member</th><th>Department</th><th>Joined</th><th>Access Status</th><th>Manage</th></tr>
                                </thead>
                                <tbody>
                                    {faculty.map(f => (
                                        <tr key={f.id}>
                                            <td style={{ fontWeight: 800 }}>{f.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td style={{ fontWeight: 700 }}>{f.department || 'Central Admin'}</td>
                                            <td style={{ fontSize: '0.75rem', opacity: 0.6 }}>{f.createdAt?.toDate?.() ? f.createdAt.toDate().toLocaleDateString() : 'Existing'}</td>
                                            <td><div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 900 }}>ACTIVE / ACCESS</div></td>
                                            <td>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={async () => { 
                                                    if(confirm(`Confirm Total Purge of ${f.name}? Profile and all enrollments will be permanently removed.`)) {
                                                        await deleteDoc(doc(db, "users", f.id));
                                                        const qS = query(collection(db, "submissions"), where("userId", "==", f.id));
                                                        const snapS = await getDocs(qS);
                                                        for (const d of snapS.docs) await deleteDoc(doc(db, "submissions", d.id));
                                                    }
                                                }}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {faculty.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No accounts registered yet.</div>}
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '700px', padding: '3rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontWeight: 900 }}>{editingFYId ? 'Modify Financial Cycle' : 'Initialize Enrollment Session'}</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>SESSION NAME</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} placeholder="EX: 2026-27" value={newFY.name} onChange={e => setNewFY({...newFY, name: e.target.value})} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>CHILD LIMIT</label>
                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.maxChildren} onChange={e => setNewFY({...newFY, maxChildren: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>PARENT LIMIT</label>
                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.maxParents} onChange={e => setNewFY({...newFY, maxParents: Number(e.target.value)})} />
                                </div>
                            </div>
                        </div>

                        <div style={{ borderTop: '2px dashed var(--border-glass)', paddingTop: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.5rem' }}>CONFIGURE COVERAGE TIERS</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                <input className="glass-panel" style={{ flex: 2, padding: '1rem', minWidth: '200px' }} placeholder="Label (Ex: 10 Lakhs)" value={tempPolicy.label} onChange={e => setTempPolicy({...tempPolicy, label: e.target.value})} />
                                <input type="number" className="glass-panel" style={{ flex: 1, padding: '1rem', minWidth: '120px' }} placeholder="Premium" value={tempPolicy.premium} onChange={e => setTempPolicy({...tempPolicy, premium: e.target.value})} />
                                <button className="btn btn-primary" style={{ padding: '0 2rem', height: '54px' }} onClick={addPolicyToFY}>ADD TIER</button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {newFY.policies?.map(p => (
                                    <div key={p.id} className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                        <div style={{ fontWeight: 900 }}>{p.label} <span style={{ color: 'var(--primary)', marginLeft: '1rem' }}>₹{p.premium.toLocaleString()}</span></div>
                                        <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => removePolicy(p.id)}><X size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowFYModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={saveFY} disabled={isSavingFY}>
                                {isSavingFY ? <div className="btn-loader"><ShieldCheck size={20} /></div> : <><Save size={18} /> {editingFYId ? 'UPDATE SESSION' : 'START ENROLLMENT CYCLE'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMailModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-panel" style={{ width: '600px', padding: '3rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
                            <h2 style={{ fontWeight: 900 }}>Dispatch Confirmations</h2>
                            <button className="btn" onClick={() => setShowMailModal(false)}><X /></button>
                        </div>
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '2px dashed var(--border-glass)' }}>
                            <p style={{ fontWeight: 800 }}>Target: All {submissions.length} Enrolled Faculty</p>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', lineHeight: '1.6' }}>
                                <strong>Message Content:</strong><br/>
                                • Verified Plan Label (e.g. 5 Lakhs Coverage)<br/>
                                • Calculated Premium Amount<br/>
                                • Detailed Dependent Breakdown
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowMailModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={dispatchEmails} disabled={isMailing}>
                                {isMailing ? <div className="btn-loader"><ShieldCheck size={20} /></div> : <><Send size={18} /> Send Automated Emails</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
