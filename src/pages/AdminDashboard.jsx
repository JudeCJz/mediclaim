import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { Users, FileText, Search, Download, Trash2, Upload, Loader2, Settings, ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus, Key, ShieldAlert } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';

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
    const [alertConfig, setAlertConfig] = useState(null);
    const [facultySearch, setFacultySearch] = useState("");
    const [dojFilter, setDojFilter] = useState("");
    const [selectedUserToReset, setSelectedUserToReset] = useState(null);
    const [manualPass, setManualPass] = useState({ next: '', confirm: '' });
    const [showManualPass, setShowManualPass] = useState(false);
    
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
        const h = "Name,Gender,DOJ,EmpId,Email,Dept,Designation,Phone,Coverage,Premium,Lives,Dependents_List\n";
        const b = submissions.map(s => {
            const deps = s.dependents?.map(d => `${d.name} (${d.type} - ${d.gender})`).join(" | ") || "None";
            return `"${s.userName}","${s.gender || ''}","${s.doj || ''}","${s.empId || ''}","${s.email}","${s.department || ''}","${s.designation || ''}","${s.phone || ''}","${s.coverageId}","${s.premium}","${(s.dependents?.length || 0) + 1}","${deps}"`;
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
                <h1 style={{ fontSize: '3rem', fontWeight: 900 }}>Master View</h1>
                <p style={{ color: 'var(--text-muted)' }}>Administrative Hub</p>
            </header>

            {alertConfig && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '3.5rem', border: `2px solid ${alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div style={{ width: '50px', height: '50px', background: alertConfig.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)'}` }}>
                                {alertConfig.type === 'danger' ? <ShieldAlert color="#ef4444" size={24} /> : <Info color="var(--primary)" size={24} />}
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{alertConfig.title}</h3>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '0.3rem' }}>CONFIRM ACTION</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem' }}>{alertConfig.text}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {alertConfig.onConfirm ? (
                                <>
                                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAlertConfig(null)}>CANCEL</button>
                                    <button className="btn btn-primary" style={{ flex: 1, background: alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)', justifyContent: 'center' }} onClick={() => { alertConfig.onConfirm(); setAlertConfig(null); }}>CONFIRM</button>
                                </>
                            ) : (
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAlertConfig(null)}>OK</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

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
                                                <button className="btn btn-ghost" onClick={() => toggleYear(y.id, y.enabled)}>{y.enabled ? 'Off' : 'On'}</button>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.4rem' }} onClick={() => {
                                                    setAlertConfig({
                                                        title: 'DELETE YEAR',
                                                        type: 'danger',
                                                        text: 'Permanently remove this financial year cycle?',
                                                        onConfirm: async () => await deleteDoc(doc(db,"financialYears", y.id))
                                                    });
                                                }}><Trash2 size={16} /></button>
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
                        <div style={{ display: 'flex', gap: '1rem', flex: 2, minWidth: '300px' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={22} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 4.5rem', fontWeight: 700 }} placeholder="Filter registry records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>FILTER_DOJ</label>
                                <input type="date" className="glass-panel" style={{ padding: '0.8rem 1.2rem', height: '100%', color: 'white' }} value={dojFilter} onChange={e => setDojFilter(e.target.value)} />
                            </div>
                            {dojFilter && <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', padding: '1rem' }} onClick={() => setDojFilter("")}>CLEAR</button>}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', width: 'auto', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowMailModal(true)}><Mail /> Send Confirmations</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={exportCSV}><Download /> Export CSV</button>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Faculty Member</th><th>Status</th><th>Coverage</th><th>Premium</th><th>Lives</th><th>Actions</th></tr></thead>
                            <tbody>
                                {submissions.filter(s => {
                                    const matchesSearch = s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                        s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.empId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        s.doj?.toLowerCase().includes(searchTerm.toLowerCase());
                                    
                                    const matchesDate = !dojFilter || s.doj === dojFilter;
                                    return matchesSearch && matchesDate;
                                }).map(s => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 800 }}>
                                            {s.userName}
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.email}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, marginTop: '2px' }}>{s.gender || 'N/A'} | DOJ: {s.doj || 'N/A'}</div>
                                        </td>
                                        <td style={{ paddingLeft: '1rem' }}><ShieldCheck size={14} color="#22c55e" /> Validated</td>
                                        <td style={{ fontWeight: 700 }}>{s.coverageId}</td>
                                        <td style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{s.premium?.toLocaleString()}</td>
                                        <td style={{ fontWeight: 800 }}>{s.dependents?.length + 1}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => {
                                                    setAlertConfig({
                                                        title: 'REMOVE ENTRY',
                                                        type: 'danger',
                                                        text: 'Delete this enrollment record?',
                                                        onConfirm: async () => await deleteDoc(doc(db,"submissions", s.id))
                                                    });
                                                }}><Trash2 size={18} /></button>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <div>
                                <h2 style={{ fontWeight: 900 }}>Registered Personnel Archive</h2>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 900, marginTop: '0.5rem' }}>[ SORTED_BY: NEWEST_FIRST ]</div>
                            </div>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', fontSize: '0.8rem' }} placeholder="Search Name, Email, DOJ, Phone..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Faculty Member</th><th>Department</th><th>Phone / DOJ</th><th>Access Status</th><th>Manage</th></tr>
                                </thead>
                                <tbody>
                                    {faculty.filter(f => 
                                        f.name?.toLowerCase().includes(facultySearch.toLowerCase()) || 
                                        f.email?.toLowerCase().includes(facultySearch.toLowerCase()) ||
                                        f.phone?.toLowerCase().includes(facultySearch.toLowerCase()) ||
                                        f.doj?.toLowerCase().includes(facultySearch.toLowerCase()) ||
                                        f.department?.toLowerCase().includes(facultySearch.toLowerCase())
                                    ).map(f => (
                                        <tr key={f.id}>
                                            <td style={{ fontWeight: 800 }}>{f.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td style={{ fontWeight: 700 }}>{f.department || 'Central Admin'}</td>
                                            <td style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                                                <div>{f.phone || 'NO_PHONE'}</div>
                                                <div style={{ opacity: 0.6 }}>{f.doj ? `JOINED: ${f.doj}` : 'DOJ_NOT_SET'}</div>
                                            </td>
                                            <td><div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 900 }}>ACTIVE / ACCESS</div></td>
                                             <td>
                                                 <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => {
                                                     setAlertConfig({
                                                         title: 'REMOVE PERSON',
                                                         type: 'danger',
                                                         text: `Permanently delete ${f.name} and all their records?`,
                                                         onConfirm: async () => {
                                                             await deleteDoc(doc(db, "users", f.id));
                                                             const qS = query(collection(db, "submissions"), where("userId", "==", f.id));
                                                             const snapS = await getDocs(qS);
                                                             for (const d of snapS.docs) await deleteDoc(doc(db, "submissions", d.id));
                                                         }
                                                     });
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

            {activeTab === 'security' && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Password Reset Hub</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send password reset links to any faculty member</p>
                    </div>
                    <div style={{ position: 'relative', marginBottom: '2rem' }}>
                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', fontSize: '0.8rem' }} placeholder="Search faculty email..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                            <tbody>
                                {faculty.filter(f => f.email?.toLowerCase().includes(facultySearch.toLowerCase())).map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 900 }}>{f.name}</td>
                                        <td>{f.email}</td>
                                        <td>
                                            <button className="btn btn-ghost" style={{ color: 'var(--primary)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.2rem' }} onClick={() => {
                                                setSelectedUserToReset(f);
                                                setManualPass({ next: '', confirm: '' });
                                            }}>
                                                <Key size={16} /> RESET PASSWORD
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedUserToReset && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '3.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Key size={24} color="var(--primary)" />
                                <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '1px' }}>Access PIN Change</h2>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setSelectedUserToReset(null)}><X /></button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 900, marginBottom: '0.5rem' }}>TARGET_USER</p>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedUserToReset.name}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{selectedUserToReset.email}</div>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input 
                                    type={showManualPass ? "text" : "password"} className="glass-panel" 
                                    style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }} 
                                    placeholder="New Password"
                                    value={manualPass.next} onChange={e => setManualPass({...manualPass, next: e.target.value})}
                                />
                                <input 
                                    type={showManualPass ? "text" : "password"} className="glass-panel" 
                                    style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }} 
                                    placeholder="Confirm New"
                                    value={manualPass.confirm} onChange={e => setManualPass({...manualPass, confirm: e.target.value})}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                                <input type="checkbox" checked={showManualPass} onChange={e => setShowManualPass(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                                Show Password
                            </label>

                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.5rem', marginTop: '1rem' }} onClick={() => {
                                if (manualPass.next !== manualPass.confirm) return alert("PROTOCOL_MISMATCH: Passwords do not match.");
                                if (manualPass.next.length < 6) return alert("SECURITY_VIOLATION: Minimum 6 characters required.");
                                
                                // Actually update Firestore so Login can use it as an override
                                const userRef = doc(db, "users", selectedUserToReset.id);
                                setDoc(userRef, { passwordOverwrite: manualPass.next }, { merge: true }).then(() => {
                                    setAlertConfig({
                                        title: 'ACCESS_REVOLVED',
                                        text: `Password for ${selectedUserToReset.name} has been manually updated. They can now login using this new PIN.`,
                                        onConfirm: () => setSelectedUserToReset(null)
                                    });
                                }).catch(e => alert("SYSTEM_ERROR: Force update failed."));
                            }}>
                                UPDATE PASSWORD
                            </button>
                        </div>
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
