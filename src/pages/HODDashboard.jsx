import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db, firebaseConfig } from '../firebase';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { Users, Search, Download, Trash2, Upload, Loader2, Settings, Plus, X, Edit, Mail, Info, Send, Save, Archive, User, Phone, Briefcase, Heart, CheckCircle, BarChart3, Activity, Clock, ArrowRight, Lock, Unlock, ShieldAlert, Key } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import * as XLSX from 'xlsx';
import emailjs from 'emailjs-com';

const recruiterApp = initializeApp(firebaseConfig, "HR_MASTER_V5");
const recruiterAuth = getAuth(recruiterApp);

const HODDashboard = () => {
    const { user, activeFY, activeTab, setActiveTab } = useApp();
    const [years, setYears] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [facultySearch, setFacultySearch] = useState('');
    const [dojFilter, setDojFilter] = useState("");
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
    const [showDisabled, setShowDisabled] = useState(false);

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
        const unsubYears = onSnapshot(collection(db, "financialYears"), (snap) => setYears(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubSubs = onSnapshot(collection(db, "submissions"), (snap) => setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubFaculty = onSnapshot(collection(db, "users"), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.role === 'faculty');
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setFaculty(list);
        });
        return () => { unsubYears(); unsubSubs(); unsubFaculty(); };
    }, []);

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
                                ACTIVE_CYCLE: {activeYear.name}
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
                        {years.length === 0 ? (
                            <button className="btn btn-primary" onClick={() => { setEditingFYId(null); setNewFY({ name: '2026-2027', maxChildren: 2, maxParents: 4, deadline: '', enabled: true, policies: [] }); setShowFYModal(true); }}><Plus size={18} /> New Session</button>
                        ) : (
                            <div style={{ padding: '0.6rem 1.2rem', background: 'var(--primary-glow)', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.2px', textAlign: 'center' }}>
                                SINGLE_PLAN_LOCK_ACTIVE: DISPOSE TO RE-CREATE
                            </div>
                        )}
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
                                                <button className="btn btn-ghost" onClick={() => { setEditingFYId(y.id); setNewFY(y); setShowFYModal(true); }}><Edit size={16} /></button>
                                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => { 
                                                    setAlertConfig({
                                                        title: 'X_PERMANENT_DISPOSAL',
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
                        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '350px', maxWidth: '800px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 5 }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', fontWeight: 700, fontSize: '0.85rem' }} placeholder="Filter registry records..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <label style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>FILTER_DOJ</label>
                                <input type="date" className="glass-panel" style={{ padding: '0.6rem 1rem', height: '100%', color: 'white', fontSize: '0.8rem' }} value={dojFilter} onChange={e => setDojFilter(e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                <input type="checkbox" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)} />
                                SHOW_DISABLED
                            </label>
                            {dojFilter && <button className="btn btn-ghost" style={{ alignSelf: 'flex-end', padding: '0.8rem' }} onClick={() => setDojFilter("")}>CLEAR</button>}
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
                                    const userStatus = faculty.find(f => f.email === s.email)?.status;
                                    const matchesStatus = showDisabled || userStatus !== 'disabled';

                                    return matchesSearch && matchesDate && matchesStatus;
                                }).map(s => (
                                    <tr key={s.id}>
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
                                                title: 'X_DELETE_ENTRY',
                                                type: 'danger',
                                                text: 'Permanently remove this faculty enrollment record from the registry?',
                                                onConfirm: async () => await deleteDoc(doc(db,"submissions", s.id))
                                            });
                                        }}><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
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
                        </div>
                        <textarea className="glass-panel" style={{ width: '100%', height: '240px', padding: '1.2rem', fontWeight: 700, fontSize: '0.8rem', resize: 'none' }} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Paste List: Name, Dept, Email" />
                        
                        {(isBulkProcessing || bulkProgress > 0) && (
                            <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.05)', height: '40px', border: '2px solid var(--border-glass)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ 
                                    position: 'absolute', left: 0, top: 0, height: '100%', 
                                    width: `${bulkProgress}%`, background: 'var(--primary)', 
                                    transition: 'width 0.3s cubic-bezier(0.1, 0.7, 1.0, 0.1)',
                                    opacity: 0.3
                                }} />
                                <span style={{ zIndex: 10, fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {isBulkProcessing ? `UPDATING: ${Math.round(bulkProgress)}%` : 'TASKS FINISHED'}
                                </span>
                            </div>
                        )}

                        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => {
                                    const names = bulkData.split("\n").filter(r => r.trim().length > 5);
                                    if(names.length === 0) return setAlertConfig({ title: 'EMPTY_LIST', text: 'Enter some details to mass disable accounts.' });
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
                                if(rows.length === 0) return setAlertConfig({ title: 'MALFORMED_LIST', text: 'Bulk registration requires "Name, Dept, Email" formatted records.' });
                                setAlertConfig({
                                    title: 'REGISTER NEW ACCOUNTS',
                                    text: `Register ${rows.length} new people? This will create their login accounts.`,
                                    onConfirm: async () => {
                                        try {
                                            setIsBulkProcessing(true); setBulkProgress(0);
                                            let count = 0;
                                            for (const row of rows) {
                                                const [name, dept, email] = row.split(",").map(s => s.trim());
                                                try {
                                                    const cred = await createUserWithEmailAndPassword(recruiterAuth, email, email);
                                                    await setDoc(doc(db, "users", cred.user.uid), { name, email, role: "faculty", department: dept || "GEN", status: 'active', createdAt: serverTimestamp() });
                                                } catch(e) {}
                                                count++;
                                                setBulkProgress(Math.min(100, (count / rows.length) * 100));
                                            }
                                            setBulkData("");
                                            setAlertConfig({ title: 'DONE', text: 'All accounts registered successfully.' });
                                        } catch(e) {
                                            setAlertConfig({ title: 'ERROR', type: 'danger', text: 'Something went wrong during registration.' });
                                        } finally { setIsBulkProcessing(false); }
                                    }
                                });
                            }} style={{ justifyContent: 'center' }}>Register Accounts</button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <h3 style={{ fontWeight: 900 }}>Active Personnel Registry</h3>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 5 }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.9rem 1rem 0.9rem 3.5rem', fontSize: '0.75rem', fontWeight: 700 }} placeholder="Filter active faculty accounts..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead><tr><th>Faculty Member</th><th>Institutional Email</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {faculty.filter(f => f.name?.toLowerCase().includes(facultySearch.toLowerCase()) || f.email?.toLowerCase().includes(facultySearch.toLowerCase())).map(f => (
                                        <tr key={f.id} style={{ opacity: f.status === 'disabled' ? 0.5 : 1 }}>
                                            <td style={{ fontWeight: 900 }}>
                                                {f.name}
                                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800 }}>DEPT: {f.department}</div>
                                                    <div style={{ fontSize: '0.65rem', color: f.status === 'disabled' ? '#ef4444' : '#22c55e', fontWeight: 900 }}>{f.status || 'active'}</div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', opacity: 0.7 }}>{f.email}</td>
                                            <td>
                                                <div 
                                                    className={`boxy-toggle-container ${f.status === 'disabled' ? 'disabled' : 'active'}`}
                                                    onClick={async () => {
                                                        const ns = f.status === 'disabled' ? 'active' : 'disabled';
                                                        await updateDoc(doc(db, "users", f.id), { status: ns });
                                                    }}
                                                >
                                                    <div className="boxy-toggle-handle"></div>
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
                    <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '350px', maxWidth: '700px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem', fontSize: '0.8rem' }} placeholder="Search faculty email..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={showDisabled} onChange={e => setShowDisabled(e.target.checked)} />
                            SHOW_DISABLED
                        </label>
                    </div>
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead><tr><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
                            <tbody>
                                {faculty.filter(f => {
                                    const q = facultySearch.toLowerCase();
                                    const matchesSearch = f.email?.toLowerCase().includes(q) || f.name?.toLowerCase().includes(q);
                                    const matchesStatus = showDisabled || f.status !== 'disabled';
                                    return matchesSearch && matchesStatus;
                                }).map(f => (
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
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Key size={24} color="var(--primary)" />
                                <h2 style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1rem', letterSpacing: '1px' }}>Access PIN Change</h2>
                            </div>
                            <button className="btn btn-ghost" onClick={() => setSelectedUserToReset(null)}><X /></button>
                        </div>

                        <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1rem' }}>
                            <p style={{ fontSize: '0.6rem', opacity: 0.6, fontWeight: 900, marginBottom: '0.3rem' }}>USER_TARGET</p>
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

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 800 }}>
                                <input type="checkbox" checked={showManualPass} onChange={e => setShowManualPass(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                Show Password
                            </label>

                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1.25rem', marginTop: '1rem' }} onClick={() => {
                                if (manualPass.next !== manualPass.confirm) return alert("PROTOCOL_MISMATCH: Passwords do not match.");
                                if (manualPass.next.length < 6) return alert("SECURITY_VIOLATION: Minimum 6 characters required.");
                                
                                // Sync override to registry
                                const userRef = doc(db, "users", selectedUserToReset.id);
                                alert("UPDATING_REGISTRY: Please wait...");
                                setDoc(userRef, { passwordOverwrite: manualPass.next }, { merge: true }).then(() => {
                                    setAlertConfig({
                                        title: 'ACCESS_REVOLVED',
                                        text: `Password for ${selectedUserToReset.name} has been manually updated. They can now login with this PIN.`,
                                        onConfirm: () => setSelectedUserToReset(null)
                                    });
                                }).catch(e => alert("WRITE_DENIED: Registry override failed."));
                            }}>
                                UPDATE PASSWORD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', padding: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>{editingFYId ? 'EDIT_ENROLLMENT_CYCLE' : 'INITIALIZE_NEW_CYCLE'}</h2>
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>CYCLE_NAME</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={newFY.name} onChange={e => setNewFY({...newFY, name: e.target.value})} placeholder="e.g. 2026-2027" />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>DEADLINE_DATE</label>
                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={newFY.deadline} onChange={e => setNewFY({...newFY, deadline: e.target.value})} />
                            </div>
                            <div style={{ marginTop: '1rem' }}>
                                <label style={{ fontSize: '0.7rem', fontWeight: 900 }}>POLICY_TIERS</label>
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
                            <button className="btn btn-primary" onClick={saveFY} disabled={isSavingFY}>{isSavingFY ? 'SAVING...' : 'SAVE_CYCLE'}</button>
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
