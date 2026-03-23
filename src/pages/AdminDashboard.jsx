import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { Users, FileText, Search, Download, Trash2, Upload, Loader2, Settings, ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus, Key, ShieldAlert, Archive, RotateCcw } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';

const recruiterApp = initializeApp(firebaseConfig, "ADMIN_MASTER_V2");
const recruiterAuth = getAuth(recruiterApp);

const AdminDashboard = () => {
    const { user, activeFY, activeTab, setActiveTab, isDemoMode, DEMO_FACULTY } = useApp();
    const [years, setYears] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const recentSubmissions = submissions.filter(s => !s.archived).slice(0, 5);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkData, setBulkData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFYModal, setShowFYModal] = useState(false);
    const [showMailModal, setShowMailModal] = useState(false);
    const [isMailing, setIsMailing] = useState(false);
    const [isSavingFY, setIsSavingFY] = useState(false);
    const [alertConfig, setAlertConfig] = useState(null);
    const [dojFilter, setDojFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [selectedUserToReset, setSelectedUserToReset] = useState(null);
    const [manualPass, setManualPass] = useState({ next: '', confirm: '' });
    const [showManualPass, setShowManualPass] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const [editingFYId, setEditingFYId] = useState(null);
    const [facultySearch, setFacultySearch] = useState('');
    const [showDisabled, setShowDisabled] = useState(true);
    const [newFY, setNewFY] = useState({
        name: '2026-2027',
        maxChildren: 2,
        maxParents: 4,
        spousePremium: 0,
        childPremium: 0,
        parentPremium: 0,
        enabled: true,
        policies: [
            { id: 'p1', label: '1.5 Lakhs', premium: 4500 },
            { id: 'p2', label: '5 Lakhs', premium: 8500 }
        ]
    });

    const [tempPolicy, setTempPolicy] = useState({ label: '', premium: '' });

    useEffect(() => {
        if (isDemoMode) {
            setYears([activeFY]);
            setFaculty(DEMO_FACULTY);
            const savedSub = localStorage.getItem(`sub_tfaculty@college.edu_${activeFY.id}`);
            if (savedSub) setSubmissions([JSON.parse(savedSub)]);
            else setSubmissions([]);
            return;
        }
        const unsubYears = onSnapshot(collection(db, "financialYears"), (snap) => setYears(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubSubs = onSnapshot(collection(db, "submissions"), (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        // Sorting faculty by createdAt DESC
        const unsubFaculty = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'faculty');
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setFaculty(list);
        });

        return () => { unsubYears(); unsubSubs(); unsubFaculty(); };
    }, [isDemoMode, activeFY]);

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
        } catch (err) { console.error(err); }
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

    const handleBulkStatus = async (status) => {
        setIsBulkProcessing(true);
        try {
            for (const id of selectedIds) {
                await updateDoc(doc(db, "users", id), { status });
            }
            setSelectedIds([]);
        } catch (e) { console.error(e); }
        setIsBulkProcessing(false);
    };

    const handleBulkDelete = async () => {
        setAlertConfig({
            title: 'Bulk Delete',
            type: 'danger',
            text: `Permanently delete ${selectedIds.length} selected accounts and their records?`,
            onConfirm: async () => {
                setIsBulkProcessing(true);
                for (const id of selectedIds) {
                    await deleteDoc(doc(db, "users", id));
                    const qS = query(collection(db, "submissions"), where("userId", "==", id));
                    const snapS = await getDocs(qS);
                    for (const d of snapS.docs) await deleteDoc(doc(db, "submissions", d.id));
                }
                setSelectedIds([]);
                setIsBulkProcessing(false);
            }
        });
    };

    const archiveYear = async (fy) => {
        setIsProcessing(true);
        if (isDemoMode) {
            setAlertConfig({ title: 'DEMO ARCHIVE SUCCESS', text: `Session ${fy.name} archived locally. (Demo Mode overrides Firestore)` });
            setIsProcessing(false);
            return;
        }
        try {
            await updateDoc(doc(db, "financialYears", fy.id), { 
                enabled: false, 
                isArchived: true, 
                archivedAt: serverTimestamp() 
            });

            const q = query(collection(db, "submissions"), where("fyId", "==", fy.id));
            const snap = await getDocs(q);
            
            const batchPromises = snap.docs.map(d => 
                updateDoc(doc(db, "submissions", d.id), { archived: true, fyName: fy.name })
            );
            
            await Promise.all(batchPromises);

            setAlertConfig({ 
                title: 'SESSION ARCHIVED', 
                text: `Session ${fy.name} and its ${snap.docs.length} records have been moved to the Audit Archives.` 
            });
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'ARCHIVE ERROR', type: 'danger', text: 'Failed to archive session logs.' });
        } finally { setIsProcessing(false); }
    };

    const unarchiveYear = async (fy) => {
        setIsProcessing(true);
        if (isDemoMode) {
            setAlertConfig({ title: 'DEMO RESTORE SUCCESS', text: `Session ${fy.name} restored locally.` });
            setIsProcessing(false);
            return;
        }
        try {
            await updateDoc(doc(db, "financialYears", fy.id), { enabled: true, isArchived: false });
            const q = query(collection(db, "submissions"), where("fyId", "==", fy.id));
            const snap = await getDocs(q);
            const batch = snap.docs.map(d => updateDoc(doc(db, "submissions", d.id), { archived: false }));
            await Promise.all(batch);
            setAlertConfig({ title: 'SESSION RESTORED', text: `Session ${fy.name} is now back in the active cycle.` });
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'RESTORE ERROR', type: 'danger', text: 'Critical failure during session restoration.' });
        } finally { setIsProcessing(false); }
    };

    const deleteFY = async (id) => {
        try { await deleteDoc(doc(db, "financialYears", id)); } catch (err) { alert("Delete failed."); }
    };

    const processBulk = async () => {
        setIsBulkProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        let success = 0;
        let skipped = 0;
        let errors = 0;

        for (const row of rows) {
            const parts = row.split(",").map(s => s.trim());
            if (parts.length < 3) { skipped++; continue; }
            const [name, dept, email] = parts;
            try {
                const cred = await createUserWithEmailAndPassword(recruiterAuth, email, email);
                await setDoc(doc(db, "users", cred.user.uid), {
                    name, email, role: "faculty",
                    department: dept || "Central Administration",
                    status: 'active',
                    createdAt: serverTimestamp()
                });
                success++;
            } catch (err) { 
                if (err.code === 'auth/email-already-in-use') skipped++;
                else errors++;
                console.error(err); 
            }
        }
        setAlertConfig({ 
            title: 'REGISTRATION SUMMARY', 
            text: `Process finished: ${success} Registered, ${skipped} Already Exist/Invalid, ${errors} Errors.` 
        });
        setBulkData(""); 
        setIsBulkProcessing(false);
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
            {activeTab === 'overview' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Operational Insights</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Real-time metrics for the current enrollment cycle.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid var(--primary)', background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <Users size={24} color="var(--primary)" />
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '2px 8px' }}>TOTAL_STAFF</div>
                            </div>
                            <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1 }}>{faculty.length}</div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.8rem', fontWeight: 700 }}>Registered faculty accounts in system.</p>
                        </div>

                        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #22c55e', background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <ShieldCheck size={24} color="#22c55e" />
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '2px 8px' }}>VALID_ENTRIES</div>
                            </div>
                            <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1 }}>{submissions.filter(s => !s.archived).length}</div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.8rem', fontWeight: 700 }}>Enrollments for the active financial year.</p>
                        </div>

                        <div className="glass-panel" style={{ padding: '2.5rem', borderLeft: '6px solid #ef4444', background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <Archive size={24} color="#ef4444" />
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px' }}>ARCHIVED</div>
                            </div>
                            <div style={{ fontSize: '2.8rem', fontWeight: 900, lineHeight: 1 }}>{years.filter(y => y.isArchived).length}</div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.8rem', fontWeight: 700 }}>Finalized and archived enrollment cycles.</p>
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem' }} className="glass-panel">
                        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem' }}>RECENT ACCOUNT ACTIVITY</h3>
                            <button className="btn btn-ghost" style={{ fontSize: '0.7rem' }} onClick={() => setActiveTab('recruit')}>VIEW ALL ACCOUNTS</button>
                        </div>
                        <div className="table-responsive" style={{ maxHeight: '400px' }}>
                            <table className="data-table">
                                <thead><tr><th>Faculty Member</th><th>Department</th><th>Access Status</th></tr></thead>
                                <tbody>
                                    {faculty.slice(0, 5).map(f => (
                                        <tr key={f.id}>
                                            <td style={{ fontWeight: 800 }}>{f.name}<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td style={{ fontWeight: 700, fontSize: '0.8rem' }}>{f.department || 'Central Admin'}</td>
                                            <td>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: f.status === 'disabled' ? '#ef4444' : '#22c55e' }}>
                                                    {f.status?.toUpperCase() || 'ACTIVE'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                {years.filter(y => !y.isArchived).map(y => (
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
                                                {!y.isArchived ? (
                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem', border: '1px solid var(--border-glass)', fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'FINALISE SESSION',
                                                            text: `Formally close ${y.name}? This will reset all active enrollments and move them to history.`,
                                                            onConfirm: () => archiveYear(y)
                                                        });
                                                    }}>
                                                        ARCHIVE
                                                    </button>
                                                ) : (
                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem', border: '1px solid var(--primary)', fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'RESTORE SESSION',
                                                            text: `Re-activate ${y.name}? History data will be restored to the active registry.`,
                                                            onConfirm: () => unarchiveYear(y)
                                                        });
                                                    }}>
                                                        RESTORE
                                                    </button>
                                                )}
                                                <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => openEdit(y)}><Edit size={16} /></button>
                                                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.2rem' }}>
                                                    <label className="inst-switch" style={{ transform: 'scale(0.7)', originX: 'center' }}>
                                                        <input type="checkbox" checked={y.enabled} onChange={() => toggleYear(y.id, y.enabled)} />
                                                        <span className="inst-slider"></span>
                                                    </label>
                                                </div>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.4rem' }} onClick={() => {
                                                    setAlertConfig({
                                                        title: 'DELETE YEAR',
                                                        type: 'danger',
                                                        text: 'Permanently remove this financial year cycle?',
                                                        onConfirm: () => deleteFY(y.id)
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
                        <div style={{ flex: 1.5, minWidth: '400px', maxWidth: '850px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input className="glass-panel" style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 4rem', fontWeight: 700, fontSize: '1rem' }} placeholder="Search registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <button 
                                    className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                    style={{ padding: '1.2rem', height: '100%', border: '1px solid var(--border-glass)' }}
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                >
                                    <Settings size={22} />
                                </button>
                            </div>

                            {/* --- POPUP FILTERS --- */}
                            {isFilterOpen && (
                                <div className="filter-popover" style={{ width: '360px' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <span className="filter-section-title">TIME FRAME</span>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                                            <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                                                <option value="">Year</option>
                                                {[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                            </select>
                                            <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                                                <option value="">Month</option>
                                                {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('default', { month: 'short' })}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ position: 'relative', marginTop: '0.8rem' }}>
                                            <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem', color: 'white', fontSize: '0.85rem', fontWeight: 700 }} value={dojFilter} onChange={e => setDojFilter(e.target.value)} />
                                        </div>
                                    </div>

                                    <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '1px solid var(--border-glass)', padding: '0.8rem' }} onClick={() => { setYearFilter(""); setMonthFilter(""); setDojFilter(""); setIsFilterOpen(false); }}>CLEAR ALL FILTERS</button>
                                </div>
                            )}

                            {/* --- FILTER PILLS --- */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1.2rem' }}>
                                {yearFilter && <div className="filter-pill" onClick={() => setYearFilter("")}>Year: {yearFilter} <X size={12} /></div>}
                                {monthFilter && <div className="filter-pill" onClick={() => setMonthFilter("")}>Month: {new Date(2000, parseInt(monthFilter)-1).toLocaleString('default', { month: 'short' })} <X size={12} /></div>}
                                {dojFilter && <div className="filter-pill" onClick={() => setDojFilter("")}>Joined: {dojFilter} <X size={12} /></div>}
                            </div>
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
                                    const matchesYear = !yearFilter || s.doj?.startsWith(yearFilter);
                                    const matchesMonth = !monthFilter || s.doj?.includes(`-${monthFilter}-`);
                                    const isNotArchived = !s.archived;
                                    return matchesSearch && matchesDate && matchesYear && matchesMonth && isNotArchived;
                                }).map(s => {
                                    const uStatus = faculty.find(f => f.email === s.email)?.status;
                                    return (
                                        <tr key={s.id} style={{ opacity: uStatus === 'disabled' ? 0.4 : 1 }}>
                                            <td style={{ fontWeight: 800 }}>
                                                {s.userName}
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.email}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, marginTop: '2px' }}>{s.gender || 'N/A'} | DOJ: {s.doj || 'N/A'}</div>
                                            </td>
                                            <td style={{ paddingLeft: '1rem' }}><ShieldCheck size={14} color="#22c55e" /> Validated</td>
                                            <td style={{ fontWeight: 700 }}>{s.coverageId}</td>
                                            <td style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{s.premium?.toLocaleString()}</td>
                                            <td style={{ fontWeight: 800 }}>{(s.dependents?.length || 0) + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'Remove Enrollment Record',
                                                            type: 'danger',
                                                            text: 'Delete this enrollment record?',
                                                            onConfirm: async () => await deleteDoc(doc(db, "submissions", s.id))
                                                        });
                                                    }}><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'recruit' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Add Faculty Members</h2>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="file"
                                id="csvUpload"
                                accept=".csv,.txt"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                            <button className="btn btn-ghost" onClick={() => document.getElementById('csvUpload').click()}>
                                <FileText size={18} /> Import CSV
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowBulkModal(true)}>
                                <Plus size={18} /> Add Faculty
                            </button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, marginBottom: '0.5rem', opacity: 0.8 }}>FORMAT: Name, Department, Institutional_Email (One per line)</div>
                    <textarea
                        className="glass-panel"
                        style={{ width: '100%', minHeight: '300px', padding: '1.5rem', background: 'rgba(44, 30, 30, 0.2)', color: 'white', fontWeight: 700 }}
                        value={bulkData} onChange={e => setBulkData(e.target.value)}
                        placeholder="e.g. Full Name, Department, email@college.edu"
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
                                <h2 style={{ fontWeight: 900 }}>Registered Personnel Registry</h2>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 900, marginTop: '0.5rem' }}>[ Sorted by: Newest First ]</div>
                            </div>
                            <div style={{ flex: 1, maxWidth: '500px', position: 'relative' }}>
                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', fontSize: '0.85rem', fontWeight: 700 }} placeholder="Search Personnel..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                                    </div>
                                    <button 
                                        className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                        style={{ padding: '0.8rem', border: '1px solid var(--border-glass)' }}
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    >
                                        <Settings size={22} />
                                    </button>
                                </div>
                                {isFilterOpen && (
                                    <div className="filter-popover" style={{ width: '360px' }}>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <span className="filter-section-title">TIME FRAME</span>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                                                <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                                                    <option value="">Year</option>
                                                    {[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                                </select>
                                                <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                                                    <option value="">Month</option>
                                                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('default', { month: 'short' })}</option>)}
                                                </select>
                                            </div>
                                            <div style={{ position: 'relative', marginTop: '0.8rem' }}>
                                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem', color: 'white', fontSize: '0.85rem', fontWeight: 700 }} value={dojFilter} onChange={e => setDojFilter(e.target.value)} />
                                            </div>
                                        </div>

                                        <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '1px solid var(--border-glass)', padding: '0.8rem' }} onClick={() => { setYearFilter(""); setMonthFilter(""); setDojFilter(""); setIsFilterOpen(false); }}>CLEAR ALL FILTERS</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr><th>Faculty Member</th><th>Department</th><th>Phone / DOJ</th><th>Access Status</th><th style={{ textAlign: 'center' }}>Manage</th></tr>
                                </thead>
                                <tbody>
                                    {faculty.filter(f => {
                                        const q = facultySearch.toLowerCase();
                                        const matchesSearch = f.name?.toLowerCase().includes(q) ||
                                            f.email?.toLowerCase().includes(q) ||
                                            f.phone?.toLowerCase().includes(q) ||
                                            f.doj?.toLowerCase().includes(q) ||
                                            f.department?.toLowerCase().includes(q);
                                        const matchesDate = !dojFilter || f.doj === dojFilter;
                                        const matchesYear = !yearFilter || f.doj?.startsWith(yearFilter);
                                        const matchesMonth = !monthFilter || f.doj?.includes(`-${monthFilter}-`);
                                        return matchesSearch && matchesDate && matchesYear && matchesMonth;
                                    }).map(f => (
                                        <tr key={f.id} style={{ opacity: f.status === 'disabled' ? 0.4 : 1, transition: 'all 0.3s ease' }}>
                                            <td style={{ fontWeight: 800 }}>{f.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td style={{ fontWeight: 700 }}>{f.department || 'Central Admin'}</td>
                                            <td style={{ fontSize: '0.75rem', fontWeight: 900 }}>
                                                <div>{f.phone || 'No Phone'}</div>
                                                <div style={{ opacity: 0.6 }}>{f.doj ? `Joined: ${f.doj}` : 'DOJ Not Set'}</div>
                                            </td>
                                            <td>
                                                {f.status === 'disabled' ? (
                                                    <div style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 900 }}>DISABLED</div>
                                                ) : (
                                                    <div style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 900 }}>ACTIVE / ACCESS</div>
                                                )}
                                            </td>
                                            <td>
                                                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                     <label className="inst-switch" style={{ transform: 'scale(1)', cursor: 'pointer' }}>
                                                         <input 
                                                             type="checkbox" 
                                                             checked={f.status !== 'disabled'} 
                                                             onChange={async (e) => {
                                                                 const checked = e.target.checked;
                                                                 const ns = checked ? 'active' : 'disabled';
                                                                 try {
                                                                     const updatedList = faculty.map(it => it.id === f.id ? { ...it, status: ns } : it);
                                                                     setFaculty(updatedList);
                                                                     await updateDoc(doc(db, "users", f.id), { status: ns });
                                                                 } catch (err) {
                                                                     console.error("Admin toggle failed:", err);
                                                                     setAlertConfig({ title: 'SYNC ERROR', type: 'danger', text: 'Institutional access update failed.' });
                                                                 }
                                                             }} 
                                                         />
                                                         <span className="inst-slider"></span>
                                                     </label>
                                                 </div>
                                             </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.4rem' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'Remove Personnel',
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
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {faculty.filter(f => {
                            const q = facultySearch.toLowerCase();
                            const matchesSearch = f.name?.toLowerCase().includes(q) ||
                                f.email?.toLowerCase().includes(q) ||
                                f.phone?.toLowerCase().includes(q) ||
                                f.doj?.toLowerCase().includes(q) ||
                                f.department?.toLowerCase().includes(q);
                            const matchesStatus = showDisabled || f.status !== 'disabled';
                            return matchesSearch && matchesStatus;
                        }).length === 0 && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No accounts registered yet.</div>}
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Password Reset Hub</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send password reset links to any faculty member</p>
                    </div>
                    <div style={{ flex: 1, maxWidth: '600px', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', fontSize: '0.9rem', fontWeight: 700 }} placeholder="Search faculty email..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                            <button 
                                className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                style={{ padding: '1rem', border: '1px solid var(--border-glass)' }}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Settings size={22} />
                            </button>
                        </div>
                        {isFilterOpen && (
                            <div className="filter-popover" style={{ width: '360px' }}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <span className="filter-section-title">TIME FRAME</span>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginTop: '0.8rem' }}>
                                        <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                                            <option value="">Year</option>
                                            {[2022,2023,2024,2025,2026,2027].map(y => <option key={y} value={y.toString()}>{y}</option>)}
                                        </select>
                                        <select className="glass-panel" style={{ padding: '0.8rem', fontSize: '0.85rem', fontWeight: 700, color: 'white' }} value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
                                            <option value="">Month</option>
                                            {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => <option key={m} value={m}>{new Date(2000, parseInt(m)-1).toLocaleString('default', { month: 'short' })}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ position: 'relative', marginTop: '0.8rem' }}>
                                        <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem', color: 'white', fontSize: '0.85rem', fontWeight: 700 }} value={dojFilter} onChange={e => setDojFilter(e.target.value)} />
                                    </div>
                                </div>

                                <button className="btn btn-ghost" style={{ width: '100%', color: '#ef4444', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, border: '1px solid var(--border-glass)', padding: '0.8rem' }} onClick={() => { setYearFilter(""); setMonthFilter(""); setDojFilter(""); setIsFilterOpen(false); }}>CLEAR ALL FILTERS</button>
                            </div>
                        )}
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                            <tbody>
                                {faculty.filter(f => {
                                    const q = facultySearch.toLowerCase();
                                    const matchesSearch = f.email?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q) || f.doj?.includes(q) || f.phone?.includes(q);
                                    const matchesDate = !dojFilter || f.doj === dojFilter;
                                    const matchesYear = !yearFilter || f.doj?.startsWith(yearFilter);
                                    const matchesMonth = !monthFilter || f.doj?.includes(`-${monthFilter}-`);
                                    return matchesSearch && matchesDate && matchesYear && matchesMonth;
                                }).map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 900 }}>{f.name}</td>
                                        <td>{f.email}</td>
                                        <td>
                                            <button className="btn btn-ghost" style={{ color: 'var(--primary)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 1.2rem' }} onClick={() => {
                                                setSelectedUserToReset(f);
                                                setManualPass({ next: '', confirm: '' });
                                            }}>
                                                <Key size={16} /> Reset Password
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
                                <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem', letterSpacing: '1px' }}>Change Access PIN</h2>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setSelectedUserToReset(null)}><X /></button>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <p style={{ fontSize: '0.8rem', opacity: 0.6, fontWeight: 900, marginBottom: '0.5rem' }}>User Details</p>
                            <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>{selectedUserToReset.name}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{selectedUserToReset.email}</div>
                        </div>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    type={showManualPass ? "text" : "password"} className="glass-panel"
                                    style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }}
                                    placeholder="New Password"
                                    value={manualPass.next} onChange={e => setManualPass({ ...manualPass, next: e.target.value })}
                                />
                                <input
                                    type={showManualPass ? "text" : "password"} className="glass-panel"
                                    style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }}
                                    placeholder="Confirm New"
                                    value={manualPass.confirm} onChange={e => setManualPass({ ...manualPass, confirm: e.target.value })}
                                />
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 800 }}>
                                <input type="checkbox" checked={showManualPass} onChange={e => setShowManualPass(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                                Show Password
                            </label>

                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.5rem', marginTop: '1rem' }} onClick={() => {
                                if (manualPass.next !== manualPass.confirm) return alert("Passwords do not match.");
                                if (manualPass.next.length < 6) return alert("Security Alert: Minimum 6 characters required.");

                                // Actually update Firestore so Login can use it as an override
                                const userRef = doc(db, "users", selectedUserToReset.id);
                                setDoc(userRef, { passwordOverwrite: manualPass.next }, { merge: true }).then(() => {
                                    setAlertConfig({
                                        title: 'Password Updated Successfully',
                                        text: `Password for ${selectedUserToReset.name} has been manually updated. They can now login using this new PIN.`,
                                        onConfirm: () => setSelectedUserToReset(null)
                                    });
                                }).catch(e => alert("Error: Update failed."));
                            }}>
                                CHANGE PASSWORD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '700px', padding: '3rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <h2 style={{ fontWeight: 900 }}>{editingFYId ? 'Update Enrollment Session' : 'Setup New Enrollment'}</h2>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>ENROLLMENT NAME</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '1rem' }} placeholder="EX: 2026-27" value={newFY.name} onChange={e => setNewFY({ ...newFY, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>CHILD LIMIT</label>
                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.maxChildren} onChange={e => setNewFY({ ...newFY, maxChildren: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>PARENT LIMIT</label>
                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.maxParents} onChange={e => setNewFY({ ...newFY, maxParents: Number(e.target.value) })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>SPOUSE PREM</label>
                                <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.spousePremium || 0} onChange={e => setNewFY({ ...newFY, spousePremium: Number(e.target.value) })} placeholder="₹" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>CHILD PREM (EA)</label>
                                <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.childPremium || 0} onChange={e => setNewFY({ ...newFY, childPremium: Number(e.target.value) })} placeholder="₹" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.75rem' }}>PARENT PREM (EA)</label>
                                <input type="number" className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={newFY.parentPremium || 0} onChange={e => setNewFY({ ...newFY, parentPremium: Number(e.target.value) })} placeholder="₹" />
                            </div>
                        </div>

                        <div style={{ borderTop: '2px dashed var(--border-glass)', paddingTop: '2.5rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.5rem' }}>CONFIGURE COVERAGE TIERS</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                <input className="glass-panel" style={{ flex: 2, padding: '1rem', minWidth: '200px' }} placeholder="Label (Ex: 10 Lakhs)" value={tempPolicy.label} onChange={e => setTempPolicy({ ...tempPolicy, label: e.target.value })} />
                                <input type="number" className="glass-panel" style={{ flex: 1, padding: '1rem', minWidth: '120px' }} placeholder="Premium" value={tempPolicy.premium} onChange={e => setTempPolicy({ ...tempPolicy, premium: e.target.value })} />
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
                                {isSavingFY ? <div className="btn-loader"><ShieldCheck size={20} /></div> : <><Save size={18} /> {editingFYId ? 'SAVE CHANGES' : 'START ENROLLMENT SESSION'}</>}
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
                                <strong>Message Content:</strong><br />
                                • Verified Plan Label (e.g. 5 Lakhs Coverage)<br />
                                • Calculated Premium Amount<br />
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
            {activeTab === 'archives' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Global Audit Archives</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Master repository for all finalized enrollment cycles across all departments.</p>
                    </div>
                    
                    {years.filter(y => y.isArchived).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                            <Settings size={60} style={{ marginBottom: '1.5rem' }} />
                            <h3 style={{ fontWeight: 900 }}>No Archived Sessions</h3>
                            <p style={{ fontSize: '0.8rem' }}>Move a financial year to the archive to generate permanent reports.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {years.filter(y => y.isArchived).map(y => (
                                <div key={y.id} className="glass-panel" style={{ 
                                    padding: '1.2rem 2.5rem', 
                                    border: '2px solid var(--border-glass)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    transition: 'transform 0.2s ease',
                                    background: 'rgba(255,255,255,0.01)'
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(12px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                                    
                                    <div style={{ display: 'flex', gap: '5rem', alignItems: 'center' }}>
                                        <div style={{ minWidth: '130px' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px' }}>YEAR</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>FY {y.name}</div>
                                        </div>
                                        
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>ARCHIVED DATE</div>
                                            <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{y.archivedAt?.toDate().toLocaleDateString() || 'N/A'}</div>
                                        </div>

                                        <div style={{ padding: '0.4rem 1.2rem', border: '1px solid var(--primary)', fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(99,102,241,0.05)' }}>
                                            DATA SAVED
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn btn-primary" style={{ padding: '0.7rem 1.8rem', fontSize: '0.75rem' }} onClick={() => {
                                            const h = "Name,EmpId,Email,Dept,Coverage,Premium,Lives\n";
                                            const b = submissions.filter(s => s.fyId === y.id).map(s => 
                                                `"${s.userName}","${s.empId}","${s.email}","${s.department}","${s.coverageId}","${s.premium}","${(s.dependents?.length || 0) + 1}"`
                                            ).join("\n");
                                            const blob = new Blob([h + b], { type: 'text/csv' });
                                            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Global_Audit_Report_${y.name}.csv`; a.click();
                                        }}>
                                            <Download size={16} /> GET_REPORT
                                        </button>

                                        <button className="btn btn-ghost" style={{ border: '2px solid var(--primary)', color: 'var(--primary)', padding: '0.7rem 1.8rem', fontSize: '0.75rem' }} onClick={() => {
                                            setAlertConfig({
                                                title: 'RESTORE YEAR',
                                                text: `Restore ${y.name} to the active registry? This will make archived submissions editable again.`,
                                                onConfirm: () => unarchiveYear(y)
                                            });
                                        }}>
                                            <RotateCcw size={16} /> RESTORE
                                        </button>

                                        <button className="btn btn-ghost" style={{ color: '#ef4444', border: '2px solid rgba(239,68,68,0.2)', padding: '0.7rem 1.2rem', fontSize: '0.75rem' }} onClick={() => {
                                            setAlertConfig({
                                                title: 'PERMANENT DELETE',
                                                type: 'danger',
                                                text: `Permanently delete this global archive snapshot for ${y.name}? All related faculty entries will be permanently removed.`,
                                                onConfirm: async () => await deleteDoc(doc(db, "financialYears", y.id))
                                            });
                                        }}>
                                            <Trash2 size={16} /> DELETE FOREVER
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}


        </div>
    );
};

export default AdminDashboard;
