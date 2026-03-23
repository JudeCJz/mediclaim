import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { Users, Search, Download, Trash2, Upload, Loader2, Settings, Plus, X, Edit, Mail, Info, Send, Save, Archive, User, Phone, Briefcase, Heart, CheckCircle, BarChart3, Activity, Clock, ArrowRight, Lock, Unlock, ShieldAlert, Key, RotateCcw } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import * as XLSX from 'xlsx';
import emailjs from 'emailjs-com';

const recruiterApp = initializeApp(firebaseConfig, "HR_MASTER_V5");
const recruiterAuth = getAuth(recruiterApp);

const HODDashboard = () => {
    const { user, activeFY, activeTab, setActiveTab, isDemoMode, DEMO_FACULTY } = useApp();
    const [years, setYears] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [facultySearch, setFacultySearch] = useState('');
    const [dojFilter, setDojFilter] = useState("");
    const [yearFilter, setYearFilter] = useState("");
    const [monthFilter, setMonthFilter] = useState("");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [bulkData, setBulkData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFYModal, setShowFYModal] = useState(false);
    const [showSubModal, setShowSubModal] = useState(false);
    const [isSavingFY, setIsSavingFY] = useState(false);
    const [isSavingSub, setIsSavingSub] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [selectedUserToReset, setSelectedUserToReset] = useState(null);
    const [manualPass, setManualPass] = useState({ next: '', confirm: '' });
    const [showManualPass, setShowManualPass] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [editingFYId, setEditingFYId] = useState(null);
    const [alertConfig, setAlertConfig] = useState(null); // { title: '', type: 'info', onConfirm: null }
    const [newFY, setNewFY] = useState({
        name: '2026-2027',
        maxChildren: 2,
        maxParents: 4,
        deadline: '',
        enabled: true,
        policies: [
            { id: 'p1', label: '1.5 Lakhs', premium: 4500 },
            { id: 'p2', label: '5 Lakhs', premium: 8500 }
        ]
    });

    const [editingSub, setEditingSub] = useState(null);
    const [tempPolicy, setTempPolicy] = useState({ label: '', premium: '' });

    useEffect(() => {
        if (isDemoMode) {
            setYears([activeFY]);
            setFaculty(DEMO_FACULTY);
            // Check for demo submission
            const savedSub = localStorage.getItem(`sub_tfaculty@college.edu_${activeFY.id}`);
            if (savedSub) setSubmissions([JSON.parse(savedSub)]);
            else setSubmissions([]);
            return;
        }
        const unsubYears = onSnapshot(collection(db, "financialYears"), (snap) => setYears(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubSubs = onSnapshot(collection(db, "submissions"), (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubFaculty = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'faculty');
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setFaculty(list);
        });
        return () => { unsubYears(); unsubSubs(); unsubFaculty(); };
    }, [isDemoMode, activeFY]);

    const saveFY = async () => {
        if (!newFY.name || newFY.policies.length === 0) return alert("Validation failed: Session Name and at least one Policy Tier required.");
        setIsSavingFY(true);
        try {
            if (editingFYId) {
                await updateDoc(doc(db, "financialYears", editingFYId), newFY);
            } else {
                await addDoc(collection(db, "financialYears"), { ...newFY, createdAt: serverTimestamp() });
            }
            setShowFYModal(false);
            setEditingFYId(null);
        } catch (err) { console.error(err); }
        finally { setIsSavingFY(false); }
    };

    const saveSub = async () => {
        if (!editingSub.userName) return alert("Name required.");
        setIsSavingSub(true);
        try {
            await updateDoc(doc(db, "submissions", editingSub.id), editingSub);
            setShowSubModal(false);
            setEditingSub(null);
        } catch (err) { alert("Save error."); }
        finally { setIsSavingSub(false); }
    };

    const archiveYear = async (fy) => {
        if (isDemoMode) {
            setYears(prev => prev.map(y => y.id === fy.id ? { ...y, enabled: false, isArchived: true, archivedAt: { toDate: () => new Date() } } : y));
            setAlertConfig({ title: 'SESSION ARCHIVED', text: `Session ${fy.name} has been formally closed and moved to records.` });
            return;
        }
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "financialYears", fy.id), { enabled: false, isArchived: true, archivedAt: serverTimestamp() });
            const q = query(collection(db, "submissions"), where("fyId", "==", fy.id));
            const snap = await getDocs(q);
            const batch = snap.docs.map(d => updateDoc(doc(db, "submissions", d.id), { archived: true }));
            await Promise.all(batch);
            setAlertConfig({ title: 'SESSION ARCHIVED', text: `Session ${fy.name} has been formally closed and moved to records.` });
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'ARCHIVE ERROR', type: 'danger', text: 'Critical failure during session archival.' });
        } finally { setIsProcessing(false); }
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

    const unarchiveYear = async (fy) => {
        if (isDemoMode) {
            setYears(prev => prev.map(y => y.id === fy.id ? { ...y, enabled: true, isArchived: false } : y));
            setAlertConfig({ title: 'SESSION RESTORED', text: `Session ${fy.name} is now back in the active registry.` });
            return;
        }
        setIsProcessing(true);
        try {
            await updateDoc(doc(db, "financialYears", fy.id), { enabled: true, isArchived: false });
            const q = query(collection(db, "submissions"), where("fyId", "==", fy.id));
            const snap = await getDocs(q);
            const batch = snap.docs.map(d => updateDoc(doc(db, "submissions", d.id), { archived: false }));
            await Promise.all(batch);
            setAlertConfig({ title: 'SESSION RESTORED', text: `Session ${fy.name} is now back in the active registry.` });
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'RESTORE ERROR', type: 'danger', text: 'Critical failure during session restoration.' });
        } finally { setIsProcessing(false); }
    };

    const exportExcel = () => {
        const data = submissions.map(s => ({ "Faculty Name": s.userName, "Email": s.email, "Dept": s.department, "Coverage": s.coverageId, "Premium": s.premium }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Submissions");
        XLSX.writeFile(wb, `HR_Report_${new Date().toLocaleDateString()}.xlsx`);
    };

    const stats = {
        total: faculty.length,
        enrolled: submissions.length,
        pending: Math.max(0, faculty.length - submissions.length),
        revenue: submissions.reduce((sum, s) => sum + (s.premium || 0), 0)
    };

    const recentSubmissions = [...submissions].sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).slice(0, 5);
    const activeYear = years.find(y => y.enabled === true);

    return (
        <div style={{ paddingBottom: '3rem' }}>
            <header className="flex-adaptive-header" style={{ borderLeft: '12px solid var(--primary)', paddingLeft: '2.5rem', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ lineHeight: 1 }}>HR Administration</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                        {activeYear && (
                            <span style={{ padding: '0.4rem 1rem', background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid var(--primary)', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Active Cycle: {activeYear.name}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {activeTab === 'overview' && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                        {[
                            { label: 'Total Faculty', val: stats.total, icon: <Users size={20} />, color: 'var(--primary)' },
                            { label: 'Active', val: stats.enrolled, icon: <CheckCircle size={20} />, color: '#22c55e' },
                            { label: 'Pending', val: stats.pending, icon: <Clock size={20} />, color: '#ef4444' }
                        ].map((s, i) => (
                            <div key={i} className="glass-panel" style={{ padding: '1.2rem', borderTop: `4px solid ${s.color}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</span>
                                    <span style={{ color: s.color }}>{s.icon}</span>
                                </div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{s.val}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div className="glass-panel" style={{ padding: '1.8rem' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Enrollment Status</h3>
                            <div style={{ width: '100%', height: '8px', background: 'var(--border-glass)', borderRadius: '0', overflow: 'hidden', marginBottom: '1rem' }}>
                                <div style={{ height: '100%', background: 'var(--primary)', width: `${(stats.enrolled / stats.total) * 100}%` }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.75rem' }}>
                                <span>{Math.round((stats.enrolled / stats.total) * 100)}% Complete</span>
                                <span style={{ opacity: 0.6 }}>{stats.enrolled}/{stats.total} Enrolled</span>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '1.8rem' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.8rem' }}>Recent Notifications</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                {recentSubmissions.map((s, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                        <div style={{ width: '32px', height: '32px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <User size={14} color="var(--primary)" />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{s.userName}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.coverageId} Plan</div>
                                        </div>
                                    </div>
                                ))}
                                {recentSubmissions.length === 0 && <div style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.75rem', fontWeight: 800 }}>No entries yet.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {alertConfig && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '450px', padding: '3.5rem', border: `2px solid ${alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div style={{ width: '50px', height: '50px', background: alertConfig.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)'}` }}>
                                {alertConfig.type === 'danger' ? <ShieldAlert color="#ef4444" size={24} /> : <Info color="var(--primary)" size={24} />}
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{alertConfig.title}</h3>
                                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', marginTop: '0.3rem' }}>VERIFY ACTION</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.6, marginBottom: '3rem' }}>{alertConfig.text}</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {alertConfig.onConfirm ? (
                                <>
                                    <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setAlertConfig(null)}>CANCEL</button>
                                    <button className="btn btn-primary" style={{ flex: 1, background: alertConfig.type === 'danger' ? '#ef4444' : 'var(--primary)', justifyContent: 'center' }} onClick={() => { alertConfig.onConfirm(); setAlertConfig(null); }}>AUTHORIZE</button>
                                </>
                            ) : (
                                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setAlertConfig(null)}>ACKNOWLEDGE</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'years' && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div className="flex-adaptive-header" style={{ marginBottom: '2.5rem', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 900, margin: 0 }}>Enrollment Cycles</h2>
                        <button className="btn btn-primary" onClick={() => { setEditingFYId(null); setNewFY({ name: '2026-2027', maxChildren: 2, maxParents: 4, deadline: '', enabled: true, policies: [] }); setShowFYModal(true); }}>
                            <Plus size={18} /> Add New Session
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Session Name</th><th>Status</th><th>Deadline</th><th>Premium Slots</th><th>Actions</th></tr></thead>
                            <tbody>
                                {years.map(y => (
                                    <tr key={y.id}>
                                        <td style={{ fontWeight: 900 }}>{y.name}</td>
                                        <td><div style={{ padding: '0.4rem 1rem', border: '1px solid', fontSize: '0.7rem', fontWeight: 900, color: y.enabled ? '#22c55e' : '#ef4444', textAlign: 'center', minWidth: '80px' }}>{y.enabled ? 'Live' : 'Archived'}</div></td>
                                        <td>{y.deadline || 'Permanent'}</td>
                                        <td>{y.policies?.length} Tiers</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {!y.isArchived && (
                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem', border: '1px solid var(--border-glass)', fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'FINALISE SESSION',
                                                            text: `Formally close ${y.name}? This will reset all active enrollments and move them to history.`,
                                                            onConfirm: () => archiveYear(y)
                                                        });
                                                    }}>
                                                        ARCHIVE
                                                    </button>
                                                )}
                                                <button className="btn btn-ghost" onClick={() => { setEditingFYId(y.id); setNewFY(y); setShowFYModal(true); }}><Edit size={16} /></button>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => { 
                                                    setAlertConfig({
                                                        title: 'Permanent Deletion',
                                                        type: 'danger',
                                                        text: 'Purge institutional financial record for this cycle? This action cannot be undone.',
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
                <div className="glass-panel" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '400px', maxWidth: '800px', position: 'relative' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 5 }} />
                                    <input className="glass-panel" style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', fontWeight: 700, fontSize: '0.9rem' }} placeholder="Search registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <button 
                                    className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                    style={{ padding: '1rem', border: '1px solid var(--border-glass)' }}
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                >
                                    <Settings size={20} />
                                </button>
                            </div>

                            {/* --- FILTER POPOVER --- */}
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

                            {/* --- ACTIVE CHIPS --- */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                                {yearFilter && <div className="filter-pill" onClick={() => setYearFilter("")}>Year: {yearFilter} <X size={12} className="close-icon" /></div>}
                                {monthFilter && <div className="filter-pill" onClick={() => setMonthFilter("")}>Month: {new Date(2000, parseInt(monthFilter)-1).toLocaleString('default', { month: 'short' })} <X size={12} className="close-icon" /></div>}
                                {dojFilter && <div className="filter-pill" onClick={() => setDojFilter("")}>Date: {dojFilter} <X size={12} className="close-icon" /></div>}
                            </div>
                        </div>
                        <button className="btn btn-primary" onClick={exportExcel} style={{ padding: '0.8rem 2rem' }}><Download size={18} /> Export Master Excel</button>
                    </div>

                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Faculty Member</th>
                                    <th>Status</th>
                                    <th>Emp ID</th>
                                    <th>Coverage ID</th>
                                    <th>Premium</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.filter(s => {
                                    const q = searchTerm.toLowerCase();
                                    const matchesSearch = s.userName?.toLowerCase().includes(q) || 
                                        s.email?.toLowerCase().includes(q) ||
                                        s.empId?.toLowerCase().includes(q) ||
                                        s.department?.toLowerCase().includes(q) ||
                                        s.designation?.toLowerCase().includes(q) ||
                                        s.phone?.toLowerCase().includes(q) ||
                                        s.doj?.toLowerCase().includes(q);
                                    
                                     const matchesDate = !dojFilter || s.doj === dojFilter;
                                     const matchesYear = !yearFilter || s.doj?.startsWith(yearFilter);
                                     const matchesMonth = !monthFilter || s.doj?.includes(`-${monthFilter}-`);
                                     const isNotArchived = !s.archived;

                                     return matchesSearch && matchesDate && matchesYear && matchesMonth && isNotArchived;
                                 }).map(s => {
                                    const uStatus = faculty.find(f => f.email === s.email)?.status;
                                    return (
                                        <tr key={s.id} style={{ opacity: uStatus === 'disabled' ? 0.4 : 1 }}>
                                        <td style={{ fontWeight: 900 }}>
                                            {s.userName}
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.email}</div>
                                            <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, marginTop: '2px' }}>{s.gender || 'N/A'} | DOJ: {s.doj || 'N/A'}</div>
                                        </td>
                                        <td>
                                            {faculty.find(f => f.email === s.email)?.status === 'disabled' ? (
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#ef4444' }}>DISABLED</div>
                                            ) : (
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#22c55e' }}>ACTIVE</div>
                                            )}
                                        </td>
                                        <td style={{ fontWeight: 800 }}>{s.empId || 'N/A'}</td>
                                        <td style={{ fontWeight: 800 }}>{s.coverageId}</td>
                                        <td style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{s.premium?.toLocaleString()}</td>
                                        <td><button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => { 
                                            setAlertConfig({
                                                title: 'Confirm Deletion',
                                                type: 'danger',
                                                text: 'Permanently remove this faculty enrollment record from the registry?',
                                                onConfirm: async () => await deleteDoc(doc(db,"submissions", s.id))
                                            });
                                        }}><Trash2 size={16} /></button></td>
                                    </tr>
                                        );
                                    })}
                                </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'recruit' && (
                <div style={{ display: 'grid', gap: '2rem' }}>
                    <div className="glass-panel" style={{ padding: '2.5rem' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontWeight: 900 }}>Bulk Controls</h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Manage multiple accounts or register new ones at once</p>
                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, marginBottom: '0.5rem', opacity: 0.8 }}>FORMAT: Name, Department, Institutional_Email (One per line)</div>
                        </div>
                        <textarea className="glass-panel" style={{ width: '100%', height: '240px', padding: '1.2rem', fontWeight: 700, fontSize: '0.8rem', resize: 'none' }} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="e.g. Jude, Engineering, jude@college.edu" />
                        
                        {(isBulkProcessing || bulkProgress > 0) && (
                            <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)', height: '40px', border: '2px solid var(--border-glass)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ 
                                    position: 'absolute', left: 0, top: 0, height: '100%', 
                                    width: `${bulkProgress}%`, background: 'var(--primary)', 
                                    transition: 'width 0.3s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                                    opacity: 0.3
                                }} />
                                <span style={{ zIndex: 10, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {isBulkProcessing ? `PROCESSING: ${Math.round(bulkProgress)}%` : 'FINISHED'}
                                </span>
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => {
                                    const names = bulkData.split("\n").filter(r => r.trim().length > 5);
                                    if(names.length === 0) return setAlertConfig({ title: 'LIST IS EMPTY', text: 'Enter some details to mass disable accounts.' });
                                    setAlertConfig({
                                        title: 'CONFIRM MASS DISABLE',
                                        type: 'danger',
                                        text: `Disable access for ${names.length} selected accounts?`,
                                        onConfirm: async () => {
                                            try {
                                                setIsBulkProcessing(true); setBulkProgress(0);
                                                let count = 0;
                                                for(const row of names) {
                                                    const email = row.includes(",") ? row.split(",")[2]?.trim() : row.trim();
                                                    const userRef = faculty.find(f => f.email === email);
                                                    if(userRef) await updateDoc(doc(db, "users", userRef.id), { status: 'disabled' });
                                                    count++;
                                                    setBulkProgress(Math.min(100, (count / names.length) * 100));
                                                }
                                                setAlertConfig({ title: 'ACCOUNTS DISABLED', text: 'All selected accounts are now disabled.' });
                                            } catch(e) { 
                                                setAlertConfig({ title: 'ERROR', type: 'danger', text: 'Something went wrong during the update.' });
                                            } finally { setIsBulkProcessing(false); }
                                        }
                                    });
                                }} style={{ background: '#ef4444', justifyContent: 'center', fontSize: '0.7rem' }}>MASS DISABLE</button>
                                <button className="btn btn-primary" onClick={() => {
                                    const names = bulkData.split("\n").filter(r => r.trim().length > 5);
                                    if(names.length === 0) return setAlertConfig({ title: 'EMPTY_LIST', text: 'Enter some details to mass enable accounts.' });
                                    setAlertConfig({
                                        title: 'CONFIRM MASS ENABLE',
                                        text: `Restore access for ${names.length} selected accounts?`,
                                        onConfirm: async () => {
                                            try {
                                                setIsBulkProcessing(true); setBulkProgress(0);
                                                let count = 0;
                                                for(const row of names) {
                                                    const email = row.includes(",") ? row.split(",")[2]?.trim() : row.trim();
                                                    const userRef = faculty.find(f => f.email === email);
                                                    if(userRef) await updateDoc(doc(db, "users", userRef.id), { status: 'active' });
                                                    count++;
                                                    setBulkProgress(Math.min(100, (count / names.length) * 100));
                                                }
                                                setAlertConfig({ title: 'ACCOUNTS ENABLED', text: 'All selected accounts are now active.' });
                                            } catch(e) {
                                                setAlertConfig({ title: 'ERROR', type: 'danger', text: 'Something went wrong during the update.' });
                                            } finally { setIsBulkProcessing(false); }
                                        }
                                    });
                                }} style={{ background: '#22c55e', justifyContent: 'center', fontSize: '0.7rem' }}>MASS ENABLE</button>
                            </div>
                            <button className="btn btn-primary" onClick={() => {
                                const rows = bulkData.split("\n").filter(r => r.trim().includes(","));
                                if(rows.length === 0) return setAlertConfig({ title: 'INVALID FORMATTING', text: 'Bulk registration requires "Name, Dept, Email" formatted records.' });
                                setAlertConfig({
                                    title: 'REGISTER NEW ACCOUNTS',
                                    text: `Register ${rows.length} new people? This will create their login accounts.`,
                                    onConfirm: async () => {
                                try {
                                    setIsBulkProcessing(true); setBulkProgress(0);
                                    let count = 0;
                                    let success = 0;
                                    let skipped = 0;
                                    let errors = 0;
                                    
                                    for (const row of rows) {
                                        const parts = row.split(",").map(s => s.trim());
                                        if (parts.length < 3) { skipped++; continue; }
                                        const [name, dept, email] = parts;
                                        
                                        try {
                                            const cred = await createUserWithEmailAndPassword(recruiterAuth, email, email);
                                            await setDoc(doc(db, "users", cred.user.uid), { name, email, role: "faculty", department: dept || "GEN", status: 'active', createdAt: serverTimestamp() });
                                            success++;
                                        } catch(e) {
                                            if (e.code === 'auth/email-already-in-use') skipped++;
                                            else errors++;
                                            console.error(`Error for ${email}:`, e);
                                        }
                                        count++;
                                        setBulkProgress(Math.min(100, (count / rows.length) * 100));
                                    }
                                    setBulkData("");
                                    setAlertConfig({ 
                                        title: 'REGISTRATION SUMMARY', 
                                        text: `Process finished: ${success} Registered, ${skipped} Already Exist/Invalid, ${errors} Processing Errors.` 
                                    });
                                } catch(e) {
                                    setAlertConfig({ title: 'ENGINE ERROR', type: 'danger', text: 'The registration engine encountered a critical failure.' });
                                } finally { setIsBulkProcessing(false); }
                            }
                        });
                    }} style={{ justifyContent: 'center' }}>Register Accounts</button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <h3 style={{ fontWeight: 900 }}>Active Personnel Registry</h3>
                            <div style={{ flex: 1, maxWidth: '450px', position: 'relative' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 5 }} />
                                        <input className="glass-panel" style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.8rem', fontSize: '0.75rem', fontWeight: 700 }} placeholder="Search name or email..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                                    </div>
                                    <button 
                                        className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                        style={{ padding: '0.75rem', border: '1px solid var(--border-glass)' }}
                                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    >
                                        <Settings size={18} />
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

                        {selectedIds.length > 0 && (
                            <div className="glass-panel" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
                                <span style={{ fontWeight: 900, fontSize: '0.8rem' }}>{selectedIds.length} ACCOUNTS SELECTED</span>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.7rem' }} onClick={() => handleBulkStatus('active')} disabled={isProcessingBulk}>Enable All</button>
                                    <button className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.7rem' }} onClick={() => handleBulkStatus('disabled')} disabled={isProcessingBulk}>Disable All</button>
                                    <button className="btn btn-ghost" style={{ padding: '0.6rem 1rem', fontSize: '0.7rem', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={handleBulkDelete} disabled={isProcessingBulk}>Delete All</button>
                                    <button className="btn btn-ghost" style={{ padding: '0.6rem', border: 'none' }} onClick={() => setSelectedIds([])}><X size={15} /></button>
                                </div>
                            </div>
                        )}

                        <div className="table-responsive">
                            <table className="data-table">
                                <thead><tr><th style={{ width: '40px' }}><input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === faculty.length} onChange={(e) => { if(e.target.checked) setSelectedIds(faculty.map(f => f.id)); else setSelectedIds([]); }} /></th><th>Faculty Member</th><th>Institutional Email</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {faculty.filter(f => {
                                        const matchesSearch = f.name?.toLowerCase().includes(facultySearch.toLowerCase()) || f.email?.toLowerCase().includes(facultySearch.toLowerCase());
                                        const matchesDate = !dojFilter || f.doj === dojFilter;
                                        const matchesYear = !yearFilter || f.doj?.startsWith(yearFilter);
                                        const matchesMonth = !monthFilter || f.doj?.includes(`-${monthFilter}-`);
                                        return matchesSearch && matchesDate && matchesYear && matchesMonth;
                                    }).map(f => (
                                        <tr key={f.id} style={{ opacity: f.status === 'disabled' ? 0.4 : 1, transition: 'opacity 0.3s ease' }}>
                                            <td><input type="checkbox" checked={selectedIds.includes(f.id)} onChange={() => { if(selectedIds.includes(f.id)) setSelectedIds(selectedIds.filter(id => id !== f.id)); else setSelectedIds([...selectedIds, f.id]); }} /></td>
                                            <td style={{ fontWeight: 900 }}>
                                                {f.name}
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>DEPT: {f.department}</div>
                                                    <div style={{ fontSize: '0.65rem', color: f.status === 'disabled' ? '#ef4444' : '#22c55e', fontWeight: 900 }}>{f.status || 'active'}</div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>{f.email}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <label className="inst-switch" style={{ transform: 'scale(0.8)' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={f.status !== 'disabled'} 
                                                            onChange={async () => {
                                                                const ns = f.status === 'disabled' ? 'active' : 'disabled';
                                                                await updateDoc(doc(db, "users", f.id), { status: ns });
                                                            }} 
                                                        />
                                                        <span className="inst-slider"></span>
                                                    </label>
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
            {activeTab === 'security' && (
                <div className="glass-panel" style={{ padding: '2.5rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Password Reset Hub</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Send password reset links to any faculty member</p>
                    </div>
                    <div style={{ flex: 1, maxWidth: '600px', position: 'relative' }}>
                        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3.5rem', fontSize: '0.85rem', fontWeight: 700 }} placeholder="Search Personnel..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                            <button 
                                className={`btn ${isFilterOpen ? 'btn-primary' : 'btn-ghost'}`} 
                                style={{ padding: '0.8rem', border: '1px solid var(--border-glass)' }}
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                            >
                                <Settings size={18} />
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
                                    const matchesSearch = f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
                                    const matchesDate = !dojFilter || f.doj === dojFilter;
                                    const matchesYear = !yearFilter || f.doj?.startsWith(yearFilter);
                                    const matchesMonth = !monthFilter || f.doj?.includes(`-${monthFilter}-`);
                                    return matchesSearch && matchesDate && matchesYear && matchesMonth;
                                }).map(f => (
                                    <tr key={f.id}>
                                        <td style={{ fontWeight: 900 }}>{f.name}</td>
                                        <td>{f.email}</td>
                                         <td>
                                            <button className="btn btn-ghost" style={{ color: 'var(--primary)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', fontSize: '0.7rem' }} onClick={() => {
                                                setSelectedUserToReset(f);
                                                setManualPass({ next: '', confirm: '' });
                                            }}>
                                                <Key size={14} /> Reset Password
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'archives' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <div style={{ marginBottom: '3.5rem' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Audit Archives</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Legacy enrollment reports and historical institutional data.</p>
                    </div>
                    
                    {years.filter(y => y.isArchived).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '5rem', opacity: 0.5 }}>
                            <Archive size={60} style={{ marginBottom: '1.5rem' }} />
                            <h3 style={{ fontWeight: 900 }}>Database Archive Empty</h3>
                            <p style={{ fontSize: '0.8rem' }}>No financial cycles have been finalized and archived yet.</p>
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
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(10px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                                    
                                    <div style={{ display: 'flex', gap: '4rem', alignItems: 'center' }}>
                                        <div style={{ minWidth: '120px' }}>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px' }}>YEAR</div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>FY {y.name}</div>
                                        </div>
                                        
                                        <div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>ARCHIVED_DATE</div>
                                            <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{y.archivedAt?.toDate().toLocaleDateString() || 'N/A'}</div>
                                        </div>

                                        <div style={{ padding: '0.4rem 1rem', border: '1px solid var(--border-glass)', fontSize: '0.6rem', fontWeight: 900, color: '#22c55e', background: 'rgba(34,197,94,0.05)' }}>
                                            DATA_SAVED
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.7rem' }} onClick={() => {
                                            const archivalH = "Name,EmpId,Email,Coverage,Premium,Lives\n";
                                            const archivalB = submissions.filter(s => s.fyId === y.id).map(s => 
                                                `"${s.userName}","${s.empId}","${s.email}","${s.coverageId}","${s.premium}","${(s.dependents?.length || 0) + 1}"`
                                            ).join("\n");
                                            const blob = new Blob([archivalH + archivalB], { type: 'text/csv' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url; a.download = `Institutional_Report_${y.name}.csv`; a.click();
                                        }}>
                                            <Download size={15} /> GET_REPORT
                                        </button>

                                        <button className="btn btn-ghost" style={{ border: '1px solid var(--primary)', color: 'var(--primary)', padding: '0.6rem 1.5rem', fontSize: '0.7rem' }} onClick={() => {
                                            setAlertConfig({
                                                title: 'RESTORE YEAR',
                                                text: `Re-activate ${y.name}? All previously archived data will return to the active registry for editing.`,
                                                onConfirm: () => unarchiveYear(y)
                                            });
                                        }}>
                                            <RotateCcw size={15} /> RESTORE
                                        </button>

                                        <button className="btn btn-ghost" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.6rem 1.2rem', fontSize: '0.7rem' }} onClick={() => {
                                            setAlertConfig({
                                                title: 'PERMANENT DELETE',
                                                type: 'danger',
                                                text: `Permanently delete all historical records for ${y.name}? This action cannot be undone.`,
                                                onConfirm: async () => await deleteDoc(doc(db, "financialYears", y.id))
                                            });
                                        }}>
                                            <Trash2 size={15} /> DELETE FOREVER
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}



            <div style={{ marginTop: '5rem', borderTop: '2px solid var(--border-glass)', paddingTop: '2rem', textAlign: 'center', opacity: 0.5 }}>
                <p style={{ fontSize: '0.65rem', fontWeight: 900, letterSpacing: '2px' }}>MEDICLAIM_INSTITUTIONAL_ADMIN_V2.5</p>
            </div>

            {selectedUserToReset && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                     <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Key size={24} color="var(--primary)" />
                                <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px' }}>Security Settings</h2>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setSelectedUserToReset(null)}><X /></button>
                        </div>

                        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                            <p style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 900, marginBottom: '0.3rem' }}>Target User</p>
                            <div style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>{selectedUserToReset.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{selectedUserToReset.email}</div>
                        </div>

                        <div style={{ display: 'grid', gap: '1.2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input 
                                    type={showManualPass ? "text" : "password"} className="glass-panel" 
                                    style={{ width: '100%', padding: '1rem', fontWeight: 700 }} 
                                    placeholder="New Password"
                                    value={manualPass.next} onChange={e => setManualPass({...manualPass, next: e.target.value})}
                                />
                                <input 
                                    type={showManualPass ? "text" : "password"} className="glass-panel" 
                                    style={{ width: '100%', padding: '1rem', fontWeight: 700 }} 
                                    placeholder="Confirm New"
                                    value={manualPass.confirm} onChange={e => setManualPass({...manualPass, confirm: e.target.value})}
                                />
                            </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', border: '1px solid var(--border-glass)' }}>
                                 <label className="inst-switch">
                                     <input type="checkbox" checked={showManualPass} onChange={e => setShowManualPass(e.target.checked)} />
                                     <span className="inst-slider"></span>
                                 </label>
                                 <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Show Password</span>
                             </div>                             
                             <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.25rem', marginTop: '1rem' }} onClick={() => {
                                 if (manualPass.next !== manualPass.confirm) return setAlertConfig({ title: 'Error', text: "Passwords do not match." });
                                 if (manualPass.next.length < 6) return setAlertConfig({ title: 'Error', text: "Minimum 6 characters required." });
                                 
                                 setIsProcessing(true);
                                 const userRef = doc(db, "users", selectedUserToReset.id);
                                 updateDoc(userRef, { passwordOverwrite: manualPass.next }).then(() => {
                                     setAlertConfig({
                                         title: 'Success',
                                         text: `Password for ${selectedUserToReset.name} updated.`,
                                         onConfirm: () => { setSelectedUserToReset(null); setIsProcessing(false); }
                                     });
                                 }).catch(e => { setIsProcessing(false); setAlertConfig({ title: 'Error', text: "Request failed." }); });
                             }}>
                                 Update Password
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>{editingFYId ? 'Update Enrollment Session' : 'Setup New Enrollment'}</h2>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>Financial Year Name</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={newFY.name} onChange={e => setNewFY({...newFY, name: e.target.value})} placeholder="e.g. 2026-2027" />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>Submission Deadline Date</label>
                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={newFY.deadline} onChange={e => setNewFY({...newFY, deadline: e.target.value})} />
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>Available Insurance Plans</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <input className="glass-panel" style={{ flex: 1, padding: '0.6rem' }} placeholder="Label (5 Lakhs)" value={tempPolicy.label} onChange={e => setTempPolicy({...tempPolicy, label: e.target.value})} />
                                    <input type="number" className="glass-panel" style={{ width: '100px', padding: '0.6rem' }} placeholder="₹" value={tempPolicy.premium} onChange={e => setTempPolicy({...tempPolicy, premium: e.target.value})} />
                                    <button className="btn btn-primary" onClick={() => { if(tempPolicy.label && tempPolicy.premium) { setNewFY({...newFY, policies: [...newFY.policies, { ...tempPolicy, id: Date.now() }]}); setTempPolicy({label:'', premium:''}); } }}>+</button>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {newFY.policies.map(p => (
                                        <div key={p.id} style={{ padding: '0.4rem 0.8rem', background: 'var(--border-glass)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>{p.label} (₹{p.premium})</span>
                                            <X size={12} style={{ cursor: 'pointer' }} onClick={() => setNewFY({...newFY, policies: newFY.policies.filter(x => x.id !== p.id)})} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => setShowFYModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" onClick={saveFY} disabled={isSavingFY}>{isSavingFY ? 'SAVING...' : 'Save Settings'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showSubModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '800px', padding: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>Edit Enrollment Data</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            <div className="f-group"><label>Name</label><input className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={editingSub.userName} onChange={e => setEditingSub({...editingSub, userName: e.target.value})} /></div>
                            <div className="f-group"><label>Dept</label><input className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={editingSub.department} onChange={e => setEditingSub({...editingSub, department: e.target.value})} /></div>
                        </div>
                        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-ghost" onClick={() => setShowSubModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveSub} disabled={isSavingSub}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HODDashboard;
