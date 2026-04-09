import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus, Key, ShieldAlert, Archive, RotateCcw, CheckCircle, Clock, Heart, User, Phone, Briefcase, BarChart3, Activity, ArrowRight, Lock, Unlock, History as LogIcon, Search, Trash2, Users, Download, FileText, Settings, Loader2 } from 'lucide-react';

const AdminDashboard = () => {
    const { user: currentUser, activeFY, activeTab, setActiveTab, isDemoMode, DEMO_FACULTY, socket } = useApp();
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
    const [selectedUserToReset, setSelectedUserToReset] = useState(null);
    const [manualPass, setManualPass] = useState({ next: '', confirm: '' });
    const [showManualPass, setShowManualPass] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [quickResetEmail, setQuickResetEmail] = useState('');

    const [editingFYId, setEditingFYId] = useState(null);
    const [facultySearch, setFacultySearch] = useState('');
    const [newFY, setNewFY] = useState({
        name: '2026-2027',
        lastSubmissionDate: '',
        maxChildren: 2,
        maxParents: 4,
        spousePremium: 0,
        childPremium: 0,
        parentPremium: 0,
        allowSpouse: true,
        allowChildren: true,
        allowParents: true,
        requireDocuments: false,
        enabled: true,
        policies: [
            { id: '1.5 Lakhs', label: '1.5 Lakhs', premium: 4500 },
            { id: '5 Lakhs', label: '5 Lakhs', premium: 8500 }
        ]
    });

    const [tempPolicy, setTempPolicy] = useState({ label: '', premium: '' });

    const fetchData = useCallback(async () => {
        try {
            const [yRes, sRes, fRes, lRes] = await Promise.all([
                api.get('/financialYears'),
                api.get('/claims'),
                api.get('/users/faculty'),
                api.get('/logs')
            ]);
            setYears(yRes.data);
            setSubmissions(sRes.data);
            setFaculty(fRes.data);
            setAuditLogs(lRes.data);
        } catch (err) {
            console.error("Error fetching admin data:", err);
        }
    }, []);

    useEffect(() => {
        if (isDemoMode) {
            setYears([activeFY]);
            setFaculty(DEMO_FACULTY);
            const savedSub = localStorage.getItem(`sub_tfaculty@college.edu_${activeFY.id}`);
            if (savedSub) setSubmissions([JSON.parse(savedSub)]);
            else setSubmissions([]);
            return;
        }

        fetchData();

        if (socket) {
            socket.on('CLAIM_UPDATED', fetchData);
            socket.on('USER_UPDATED', fetchData);
            socket.on('FY_UPDATED', fetchData);
            return () => {
                socket.off('CLAIM_UPDATED', fetchData);
                socket.off('USER_UPDATED', fetchData);
                socket.off('FY_UPDATED', fetchData);
            };
        }
    }, [isDemoMode, activeFY, socket, fetchData, DEMO_FACULTY]);

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
                await api.put(`/financialYears/${editingFYId}`, newFY);
            } else {
                await api.post('/financialYears', newFY);
            }
            setShowFYModal(false);
            setEditingFYId(null);
            fetchData();
        } catch (err) { console.error(err); }
        finally { setIsSavingFY(false); }
    };

    const openCreate = () => {
        setEditingFYId(null);
        setNewFY({ 
            name: `${new Date().getFullYear()}-${new Date().getFullYear()+1}`, 
            lastSubmissionDate: '',
            maxChildren: 2, 
            maxParents: 4, 
            allowSpouse: true,
            allowChildren: true,
            allowParents: true,
            spousePremium: 0,
            childPremium: 0,
            parentPremium: 0,
            requireDocuments: false,
            enabled: true, 
            policies: [{ id: '1.5 Lakhs', label: '1.5 Lakhs', premium: 4500 }, { id: '5 Lakhs', label: '5 Lakhs', premium: 8500 }] 
        });
        setShowFYModal(true);
    };

    const openEdit = (fy) => {
        setEditingFYId(fy._id || fy.id);
        setNewFY({ 
            name: fy.name, 
            lastSubmissionDate: fy.lastSubmissionDate || '',
            maxChildren: fy.maxChildren || 2, 
            maxParents: fy.maxParents || 4, 
            allowSpouse: fy.allowSpouse !== undefined ? fy.allowSpouse : true,
            allowChildren: fy.allowChildren !== undefined ? fy.allowChildren : true,
            allowParents: fy.allowParents !== undefined ? fy.allowParents : true,
            spousePremium: fy.spousePremium || 0,
            childPremium: fy.childPremium || 0,
            parentPremium: fy.parentPremium || 0,
            requireDocuments: fy.requireDocuments || false,
            enabled: fy.enabled, 
            policies: fy.policies || [] 
        });
        setShowFYModal(true);
    };

    const toggleYear = async (id, status) => {
        try {
            await api.patch(`/financialYears/${id}/toggle`, { enabled: !status });
            fetchData();
        } catch (err) {
            console.error("Year toggle error:", err);
            setAlertConfig({ title: 'SYNC ERROR', type: 'danger', text: 'Institutional session state update failed.' });
        }
    };

    const archiveYear = async (fy) => {
        setIsProcessing(true);
        if (isDemoMode) {
            setAlertConfig({ title: 'DEMO ARCHIVE SUCCESS', text: `Session ${fy.name} archived locally.` });
            setIsProcessing(false);
            return;
        }
        try {
            await api.post(`/financialYears/${fy._id || fy.id}/archive`);
            setAlertConfig({ 
                title: 'SESSION ARCHIVED', 
                text: `Session ${fy.name} has been formally closed and moved to records.` 
            });
            fetchData();
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'ARCHIVE ERROR', type: 'danger', text: 'Critical failure during session archival.' });
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
            await api.post(`/financialYears/${fy._id || fy.id}/unarchive`);
            setAlertConfig({ title: 'SESSION RESTORED', text: `Session ${fy.name} reactivated in registry.` });
            fetchData();
        } catch (err) { 
            console.error(err);
            setAlertConfig({ title: 'RESTORE ERROR', type: 'danger', text: 'Critical failure during session restoration.' });
        } finally { setIsProcessing(false); }
    };

    const deleteFY = async (id) => {
        try { 
            await api.delete(`/financialYears/${id}`);
            fetchData();
        } catch (err) { alert("Delete failed."); }
    };

    const processBulk = async () => {
        setIsBulkProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        try {
            const res = await api.post('/users/bulk-register', { rows });
            setAlertConfig({ 
                title: 'REGISTRATION SUMMARY', 
                text: res.data.message
            });
            setBulkData("");
            fetchData();
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'ERROR', text: 'Bulk registration failed.' });
        } finally {
            setIsBulkProcessing(false);
        }
    };

    const processBulkDelete = async () => {
        if (!confirm("CONFIRM_BULK_DELETE? All personnel listed below will be purged from the registry.")) return;
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        const emails = rows.map(row => row.split(",")[2]?.trim()).filter(Boolean);
        try {
            await api.post('/users/bulk-delete', { emails });
            alert("Purge complete."); setBulkData(""); fetchData();
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const processBulkStatus = async (statusValue) => {
        if (!confirm(`CONFIRM_BULK_${statusValue.toUpperCase()}? All listed personnel will be set to ${statusValue}.`)) return;
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        const emails = rows.map(row => {
            const parts = row.split(",").map(s => s.trim());
            return parts.length > 2 ? parts[2] : parts[0];
        }).filter(Boolean);
        try {
            await api.post('/users/bulk-status', { emails, status: statusValue });
            alert(`Bulk ${statusValue} complete.`); fetchData();
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const handleQuickReset = () => {
        if (!quickResetEmail) return alert("Enter employee email/username");
        const found = faculty.find(f => f.email?.toLowerCase() === quickResetEmail.toLowerCase());
        if (!found) return alert("Employee not found in registry");
        setSelectedUserToReset(found);
    };
    const exportCSV = () => {
        let headers = "Faculty Name,Email,Gender,Employee ID,Department,Designation,DOJ,Contact,Coverage,Premium,Spouse Name,Spouse DOB,Dependents Details\n";
        let csv = submissions.filter(s => !s.archived).map(s => {
            const spouse = s.dependents?.find(d => d.type === 'spouse');
            const others = s.dependents?.filter(d => d.type !== 'spouse').map(d => `${d.relation}: ${d.name}(${d.dob})`).join(' | ');
            return `"${s.userName}","${s.email}","${s.gender}","${s.empId}","${s.department}","${s.designation}","${s.doj}","${s.phone}","${s.coverageId}","${s.premium}","${spouse?.name || ''}","${spouse?.dob || ''}","${others}"`;
        }).join("\n");
        const blob = new Blob([headers + csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Mediclaim_Registry_${activeFY?.name || 'export'}.csv`;
        a.click();
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === submissions.filter(s => !s.archived).length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(submissions.filter(s => !s.archived).map(s => s._id || s.id));
        }
    };

    const toggleSelectOne = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const dispatchEmails = async () => {
        setIsMailing(true);
        try {
            await api.post('/mail/dispatch-confirmations', { 
                fyId: activeFY?.id || activeFY?._id,
                claimIds: selectedIds 
            });
            alert(`Emails have been dispatched to ${selectedIds.length} faculty members.`);
            setShowMailModal(false);
            setSelectedIds([]); // Reset selection after dispatch
        } catch (err) {
            console.error(err);
            alert("Email dispatch failed. Please check your network connection.");
        } finally {
            setIsMailing(false);
        }
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
                <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', fontWeight: 900 }}>Administrator Portal</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>System Management & Enrollment Records</p>
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
                <div style={{ display: 'grid', gap: '2.5rem' }}>
                    <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 3.5rem)', borderLeft: '12px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
                            <div>
                                <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1px' }}>System <span style={{ color: 'var(--primary)' }}>Control Panel</span></h1>
                                <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.8rem', fontSize: 'clamp(0.9rem, 2vw, 1.1rem)' }}>Manage medical policy windows and institutional participation across all departments.</p>
                            </div>
                            <button className="btn btn-primary" onClick={openCreate} style={{ padding: '1.2rem 2.5rem', fontSize: '1rem', fontWeight: 900, boxShadow: '0 15px 30px -10px var(--primary-glow)' }}>
                                <Plus size={22} /> INITIATE NEW SESSION
                            </button>
                        </div>

                        <div className="responsive-auto-grid" style={{ marginTop: '4rem' }}>
                            <div className="stat-card-premium" style={{ borderLeft: '6px solid var(--primary)' }}>
                                <div className="stat-icon"><Users size={24} /></div>
                                <div className="stat-val">{faculty.length}</div>
                                <div className="stat-lab">TOTAL FACULTY</div>
                            </div>
                            <div className="stat-card-premium" style={{ borderLeft: '6px solid #22c55e' }}>
                                <div className="stat-icon"><CheckCircle size={24} /></div>
                                <div className="stat-val">{submissions.filter(s => !s.archived && s.fyId === (activeFY?._id || activeFY?.id)).length}</div>
                                <div className="stat-lab">TOTAL ENROLLED</div>
                            </div>
                            <div className="stat-card-premium" style={{ borderLeft: '6px solid #f59e0b' }}>
                                <div className="stat-icon"><Clock size={24} /></div>
                                <div className="stat-val">
                                    {Math.max(0, faculty.filter(f => f.status !== 'disabled').length - submissions.filter(s => !s.archived && s.fyId === (activeFY?._id || activeFY?.id)).length)}
                                </div>
                                <div className="stat-lab">AWAITING ENROLLMENT</div>
                            </div>
                            <div className="stat-card-premium" style={{ borderLeft: '6px solid #ef4444' }}>
                                <div className="stat-icon"><Archive size={24} /></div>
                                <div className="stat-val">{years.filter(y => y.isArchived).length}</div>
                                <div className="stat-lab">ARCHIVED CYCLES</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 3.5rem)' }}>
                        <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.2rem, 4vw, 1.8rem)', marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <Settings size={28} color="var(--primary)" /> Active Enrollment Cycles
                        </h2>
                        
                        <div className="table-responsive-premium">
                            <table className="data-table-premium">
                                <thead>
                                    <tr>
                                        <th>CYCLE_NAME</th>
                                        <th>STATUS_AUTHORIZATION</th>
                                        <th>COVERAGE_TIERS</th>
                                        <th>DEPENDENCY_LIMITS</th>
                                        <th>OPERATIONAL_ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {years.filter(y => !y.isArchived).sort((a,b) => b.name.localeCompare(a.name)).map(y => (
                                        <tr key={y._id || y.id} style={{ opacity: y.enabled ? 1 : 0.6, transition: 'all 0.3s ease' }}>
                                            <td style={{ fontWeight: 900, fontSize: '1.4rem', letterSpacing: '1px' }}>FY {y.name}</td>
                                            <td>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 1.2rem', background: y.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: y.enabled ? '#22c55e' : '#ef4444', border: '1px solid currentColor', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '1px' }}>
                                                    {y.enabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                                    {y.enabled ? 'ACCEPTING_ENTRIES' : 'DISABLED_SESSION'}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                                                    {y.policies?.map(p => (
                                                        <div key={p.id} style={{ fontSize: '0.65rem', fontWeight: 900, background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', border: '1px solid var(--border-glass)', borderRadius: '4px' }}>
                                                            {p.label} (₹{p.premium/1000}K)
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.75rem', fontWeight: 900 }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>CH: <b style={{ color: 'var(--text-main)' }}>{y.maxChildren}</b></span>
                                                    <span style={{ color: 'var(--text-muted)' }}>PA: <b style={{ color: 'var(--text-main)' }}>{y.maxParents}</b></span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.8rem' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid #f59e0b' }} onClick={() => openEdit(y)}><Edit size={16} /></button>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid #22c55e' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'ARCHIVE_SESSION',
                                                            text: `Officially close FY ${y.name}? All active submissions will be locked and moved to institutional history.`,
                                                            onConfirm: () => archiveYear(y)
                                                        });
                                                    }}><Archive size={16} /></button>
                                                    <label className="inst-switch" style={{ transform: 'scale(0.8)' }}>
                                                        <input type="checkbox" checked={y.enabled} onChange={() => toggleYear(y._id || y.id, y.enabled)} />
                                                        <span className="inst-slider"></span>
                                                    </label>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'HARD_DELETE',
                                                            type: 'danger',
                                                            text: `Permanently destroy session ${y.name}? THIS CANNOT BE UNDONE.`,
                                                            onConfirm: () => deleteFY(y._id || y.id)
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
                </div>
            )}

            {activeTab === 'registry' && (
                <div className="glass-panel" style={{ padding: 'clamp(1rem, 5vw, 2.5rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 4rem', fontWeight: 700, fontSize: '1rem' }} placeholder="Search database..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', minWidth: 'max-content' }}>
                            <button 
                                className="btn btn-primary" 
                                style={{ 
                                    padding: '1.2rem 2.5rem', 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center', 
                                    gap: '12px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 25px -5px rgba(67, 56, 202, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px',
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    whiteSpace: 'nowrap'
                                }} 
                                onClick={exportCSV}
                            >
                                <Download size={18} /> EXPORT (.CSV)
                            </button>
                        </div>
                    </div>
                    <div className="table-responsive-premium">
                        <table className="data-table-premium">
                            <thead>
                                <tr>
                                    <th>Faculty Member</th>
                                    <th>ID / Bio</th>
                                    <th>Institutional Dept</th>
                                    <th>Coverage Config</th>
                                    <th>Total Premium</th>
                                    <th style={{ textAlign: 'center' }}>Revoke</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.filter(s => {
                                    const q = searchTerm.toLowerCase();
                                    const isMatch = (s.userName?.toLowerCase().includes(q) || 
                                              s.email?.toLowerCase().includes(q) ||
                                              s.empId?.toLowerCase().includes(q) ||
                                              s.department?.toLowerCase().includes(q) ||
                                              s.designation?.toLowerCase().includes(q) ||
                                              s.phone?.toLowerCase().includes(q));
                                    return isMatch && !s.archived;
                                }).map(s => (
                                    <tr key={s._id || s.id}>
                                        <td style={{ fontWeight: 800 }}>
                                            {s.userName}
                                            <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', marginTop: '4px' }}>{s.email}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 900, letterSpacing: '0.5px' }}>{s.empId || 'ID_PENDING'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.gender || 'N/A'} | DOJ: {s.doj || 'N/A'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{s.department || 'NO_DEPT'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{s.designation || 'FACULTY'}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{s.coverageId}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>+{(s.dependents?.length || 0)} DEPENDENTS</div>
                                        </td>
                                        <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.2rem' }}>₹{s.premium?.toLocaleString()}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444', border: '1px solid #ef444430' }} onClick={() => {
                                                setAlertConfig({
                                                    title: 'DELETE_ENROLLMENT',
                                                    type: 'danger',
                                                    text: `Delete medical enrollment for ${s.userName}? This action is irreversible.`,
                                                    onConfirm: async () => { await api.delete(`/claims/${s._id || s.id}`); fetchData(); }
                                                });
                                            }}><Trash2 size={18} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'recruit' && (
                <div className="glass-panel" style={{ padding: 'clamp(1rem, 5vw, 3rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h2 style={{ fontWeight: 900 }}>Staff Registry</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', width: '100%' }}>
                            <input type="file" id="csvUpload" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => document.getElementById('csvUpload').click()}><FileText size={18} /> Import</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={processBulk} disabled={isBulkProcessing}>
                                {isBulkProcessing ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Bulk Add</>}
                            </button>
                        </div>
                    </div>
                    <textarea className="glass-panel" style={{ width: '100%', minHeight: '150px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', color: 'white' }} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Format: Name, Department, email@college.edu" />
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" style={{ color: '#ef4444', flex: 1 }} onClick={processBulkDelete}><UserMinus size={18} /> DELETE STAFF</button>
                        <button className="btn btn-ghost" style={{ color: '#f59e0b', flex: 1 }} onClick={() => processBulkStatus('disabled')}><Lock size={18} /> DISABLE ACCESS</button>
                        <button className="btn btn-ghost" style={{ color: '#22c55e', flex: 1 }} onClick={() => processBulkStatus('active')}><Unlock size={18} /> ENABLE ACCESS</button>
                    </div>

                    {/* Quick Password Reset */}
                    <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 900, marginBottom: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Password Reset</div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.8rem', fontSize: '0.9rem' }} placeholder="Enter username/email..." value={quickResetEmail} onChange={e => setQuickResetEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickReset()} />
                            </div>
                            <button className="btn btn-primary" style={{ padding: '0.6rem 1.5rem', fontSize: '0.8rem' }} onClick={handleQuickReset}><Key size={14} /> Reset</button>
                        </div>
                    </div>

                    <div style={{ marginTop: '4rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem' }} placeholder="Search Faculty..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="table-responsive-premium">
                            <table className="data-table-premium">
                                <thead><tr><th>Member</th><th>Dept</th><th>Access</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {faculty.filter(f => f.name?.toLowerCase().includes(facultySearch.toLowerCase()) || f.email?.toLowerCase().includes(facultySearch.toLowerCase())).map(f => (
                                        <tr key={f._id || f.id} style={{ opacity: f.status === 'disabled' ? 0.4 : 1 }}>
                                            <td>{f.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td>{f.department || 'N/A'}</td>
                                            <td>
                                                <label className="inst-switch">
                                                    <input type="checkbox" checked={f.status !== 'disabled'} onChange={async (e) => {
                                                        await api.patch(`/users/${f._id || f.id}`, { status: e.target.checked ? 'active' : 'disabled' });
                                                        fetchData();
                                                    }} />
                                                    <span className="inst-slider"></span>
                                                </label>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem' }} onClick={() => setSelectedUserToReset(f)}><Key size={16} /></button>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => {
                                                        setAlertConfig({
                                                            title: 'Delete User',
                                                            type: 'danger',
                                                            text: `Permanently delete ${f.name}?`,
                                                            onConfirm: async () => { await api.delete(`/users/${f._id || f.id}`); fetchData(); }
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
                </div>
            )}

            {activeTab === 'archives' && (
                <div className="glass-panel" style={{ padding: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem' }}>Audit Archives</h2>
                    {years.filter(y => y.isArchived).map(y => (
                        <div key={y._id || y.id} className="registry-card" style={{ marginBottom: '1rem', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>FY {y.name}</div>
                                <div style={{ color: 'var(--text-muted)' }}>{submissions.filter(s => s.fyId === (y._id || y.id)).length} Records Locked</div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => exportCSV()}>Export CSV</button>
                                <button className="btn btn-ghost" onClick={() => unarchiveYear(y)}><RotateCcw size={18} /> Restore</button>
                                <button className="btn btn-ghost" style={{ color: '#ef4444' }} onClick={() => deleteFY(y._id || y.id)}><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'audit_logs' && (
                <div className="glass-panel" style={{ padding: '3.5rem' }}>
                    <h2 style={{ fontWeight: 900, fontSize: '1.8rem', marginBottom: '2.5rem' }}>Institutional Audit Logs</h2>
                    <div className="table-responsive-premium">
                        <table className="data-table-premium">
                            <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
                            <tbody>
                                {auditLogs.map(l => (
                                    <tr key={l._id || l.id}>
                                        <td style={{ fontSize: '0.8rem' }}>{new Date(l.createdAt || l.timestamp).toLocaleString()}</td>
                                        <td>{l.actor?.email}</td>
                                        <td><span className="badge">{l.action}</span></td>
                                        <td style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{JSON.stringify(l.details)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(30px)' }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '3rem', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, padding: '1rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{editingFYId ? 'Update Session Settings' : 'Initialize New Cycle'}</h2>
                            <button className="btn btn-ghost" onClick={() => setShowFYModal(false)}><X /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>CYCLE IDENTIFIER</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }} value={newFY.name} onChange={e => setNewFY({ ...newFY, name: e.target.value })} placeholder="e.g. 2026-2027" />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>SUBMISSION DEADLINE</label>
                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '1.2rem', fontWeight: 700 }} value={newFY.lastSubmissionDate} onChange={e => setNewFY({ ...newFY, lastSubmissionDate: e.target.value })} />
                            </div>
                        </div>

                        {/* PLAN CONFIGURATION */}
                        <div style={{ marginBottom: '4rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldCheck size={22} color="var(--primary)" /> Coverage Plans</h3>
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                                <input className="glass-panel" style={{ flex: 1, minWidth: '200px', padding: '1rem' }} placeholder="Plan Label (e.g. 5 Lakhs)" value={tempPolicy.label} onChange={e => setTempPolicy({ ...tempPolicy, label: e.target.value })} />
                                <input type="number" className="glass-panel" style={{ width: '150px', padding: '1rem' }} placeholder="Base Premium" value={tempPolicy.premium} onChange={e => setTempPolicy({ ...tempPolicy, premium: e.target.value })} />
                                <button className="btn btn-primary" onClick={addPolicyToFY}>ADD PLAN</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {newFY.policies.map(p => (
                                    <div key={p.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div style={{ fontWeight: 900 }}>{p.label}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>₹{p.premium?.toLocaleString()}</div>
                                        </div>
                                        <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => removePolicy(p.id)}><X size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DEPENDENCY RULES */}
                        <div style={{ marginBottom: '4rem', padding: '2.5rem', background: 'rgba(255,255,255,0.02)', border: '2px solid var(--border-glass)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}><Users size={22} color="var(--primary)" /> Family Member Controls</h3>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                                {/* Spouse */}
                                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>ALLOW SPOUSE</span>
                                        <label className="inst-switch">
                                            <input type="checkbox" checked={newFY.allowSpouse} onChange={e => setNewFY({...newFY, allowSpouse: e.target.checked})} />
                                            <span className="inst-slider"></span>
                                        </label>
                                    </div>
                                    <div className="f-group">
                                        <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>SPOUSE PREMIUM</label>
                                        <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={newFY.spousePremium} onChange={e => setNewFY({...newFY, spousePremium: Number(e.target.value)})} disabled={!newFY.allowSpouse} />
                                    </div>
                                </div>

                                {/* Children */}
                                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>ALLOW CHILDREN</span>
                                        <label className="inst-switch">
                                            <input type="checkbox" checked={newFY.allowChildren} onChange={e => setNewFY({...newFY, allowChildren: e.target.checked})} />
                                            <span className="inst-slider"></span>
                                        </label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="f-group">
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>LIMIT</label>
                                            <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={newFY.maxChildren} onChange={e => setNewFY({...newFY, maxChildren: Number(e.target.value)})} disabled={!newFY.allowChildren} />
                                        </div>
                                        <div className="f-group">
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>PREMIUM</label>
                                            <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={newFY.childPremium} onChange={e => setNewFY({...newFY, childPremium: Number(e.target.value)})} disabled={!newFY.allowChildren} />
                                        </div>
                                    </div>
                                </div>

                                {/* Parents */}
                                <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>ALLOW PARENTS</span>
                                        <label className="inst-switch">
                                            <input type="checkbox" checked={newFY.allowParents} onChange={e => setNewFY({...newFY, allowParents: e.target.checked})} />
                                            <span className="inst-slider"></span>
                                        </label>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="f-group">
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>LIMIT</label>
                                            <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={newFY.maxParents} onChange={e => setNewFY({...newFY, maxParents: Number(e.target.value)})} disabled={!newFY.allowParents} />
                                        </div>
                                        <div className="f-group">
                                            <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>PREMIUM</label>
                                            <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={newFY.parentPremium} onChange={e => setNewFY({...newFY, parentPremium: Number(e.target.value)})} disabled={!newFY.allowParents} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'flex-end', marginTop: '4rem', sticky: 'bottom' }}>
                            <button className="btn btn-ghost" style={{ padding: '1.2rem 3rem', fontWeight: 900 }} onClick={() => setShowFYModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ padding: '1.2rem 4rem', fontWeight: 900 }} onClick={saveFY} disabled={isSavingFY}>
                                {isSavingFY ? <Loader2 className="animate-spin" /> : 'SAVE SESSION CONFIG'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedUserToReset && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>Reset Password</h2>
                        <div style={{ marginBottom: '2rem' }}>
                            <label>New Password</label>
                            <input type={showManualPass ? "text" : "password"} className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={manualPass.next} onChange={e => setManualPass({ ...manualPass, next: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                            <label>Confirm Password</label>
                            <input type={showManualPass ? "text" : "password"} className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={manualPass.confirm} onChange={e => setManualPass({ ...manualPass, confirm: e.target.value })} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                            <input type="checkbox" checked={showManualPass} onChange={e => setShowManualPass(e.target.checked)} /> Show Password
                        </label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-ghost" onClick={() => setSelectedUserToReset(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={async () => {
                                if (manualPass.next !== manualPass.confirm) return alert("Passwords do not match");
                                await api.patch(`/users/${selectedUserToReset._id || selectedUserToReset.id}`, { password: manualPass.next });
                                setSelectedUserToReset(null);
                                setManualPass({ next: '', confirm: '' });
                            }}>Update Password</button>
                        </div>
                    </div>
                </div>
            )}

            {showMailModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '3rem' }}>
                        <h2 style={{ fontWeight: 900, marginBottom: '2rem' }}>Send Confirmations</h2>
                        <p style={{ marginBottom: '2rem' }}>This will send enrollment confirmation emails to all faculty members in the active session.</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn btn-ghost" onClick={() => setShowMailModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={dispatchEmails} disabled={isMailing}>
                                {isMailing ? <Loader2 className="animate-spin" /> : 'Dispatch Emails'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" size={60} color="var(--primary)" />
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
