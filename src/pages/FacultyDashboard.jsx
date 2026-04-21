import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api, { toApiAssetUrl } from '../api';
import { Heart, UserPlus, Trash2, CheckCircle, ShieldCheck, Loader2, Save, Printer, User, Briefcase, X, AlertTriangle, ArrowLeft, Download, Edit } from 'lucide-react';
import { generateEnrollmentPDF } from '../utils/pdfGenerator';

const FacultyDashboard = () => {
    const { user, isDemoMode, activeFY, socket, activeTab, departments } = useApp();
    const [years, setYears] = useState([]);
    const [selectedFY, setSelectedFY] = useState(null);
    const [profile, setProfile] = useState({ name: '', empId: '', phone: '', department: '', designation: '', doj: '', gender: 'Male' });
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [dependents, setDependents] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState(null);
    const [documents, setDocuments] = useState({ idCard: '', photo: '' });
    const [uploading, setUploading] = useState({ idCard: false, photo: false });
    const [userSubmissions, setUserSubmissions] = useState({});
    const [allHistory, setAllHistory] = useState([]);
    const [loadingAll, setLoadingAll] = useState(true);
    const [alertConfig, setAlertConfig] = useState({ title: '', text: '', onConfirm: null });

    const AlertModal = ({ config, onClose }) => {
        if (!config.title) return null;
        return (
            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(30, 58, 95, 0.4)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(4px)' }}>
                <div className="glass-panel" style={{ width: '90%', maxWidth: '420px', padding: '2rem', textAlign: 'center', border: 'var(--border)', background: 'var(--bg-card)', boxShadow: 'none', borderRadius: '12px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'var(--bg-main)', borderRadius: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                        <ShieldCheck size={28} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{config.title}</h2>
                    <p style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.5 }}>{config.text}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: config.onConfirm ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                        {config.onConfirm && <button className="btn btn-ghost" style={{ padding: '10px', fontSize: '13px', border: 'var(--border)' }} onClick={onClose}>CANCEL</button>}
                        <button className="btn btn-primary" style={{ padding: '10px', fontSize: '13px' }} onClick={() => { if (config.onConfirm) config.onConfirm(); onClose(); }}>
                            {config.onConfirm ? 'CONFIRM' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const fetchYears = async () => {
        try {
            const res = await api.get('/financialYears');
            setYears(res.data.sort((a,b) => b.name.localeCompare(a.name)));
        } catch (err) {
            console.error("Error fetching financial years:", err);
        }
    };

    const fetchSubmissions = useCallback(async () => {
        if (!user) return;
        try {
            const res = await api.get('/claims/my-claims');
            const data = res.data;
            const map = {};
            data.filter(d => !d.archived).forEach(d => map[d.fyId] = d);
            setUserSubmissions(map);
            setAllHistory(data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setLoadingAll(false);
        } catch (err) {
            console.error("Error fetching submissions:", err);
            setLoadingAll(false);
        }
    }, [user]);

    useEffect(() => {
        if (isDemoMode) {
            setYears([activeFY]);
            return;
        }
        fetchYears();

        if (socket) {
            socket.on('FY_UPDATED', fetchYears);
            return () => socket.off('FY_UPDATED', fetchYears);
        }
    }, [isDemoMode, activeFY, socket]);

    useEffect(() => {
        if (activeTab === 'overview') {
            setSelectedFY(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (user) {
            if (isDemoMode) {
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
            fetchSubmissions();

            if (socket) {
                socket.on('CLAIM_UPDATED', fetchSubmissions);
                return () => socket.off('CLAIM_UPDATED', fetchSubmissions);
            }
        }
    }, [user, isDemoMode, activeFY, socket, fetchSubmissions]);

    const enterYear = useCallback((fy) => {
        const fyId = fy.id || fy._id;
        localStorage.setItem('faculty_selected_fy', fyId);
        setSelectedFY(fy);
        setSuccess(false);
        const sub = userSubmissions[fyId];
        if (sub) {
            setExistingSubmission(sub);
            setSelectedPolicy(sub.policy);
            setDependents(sub.dependents || []);
            setProfile({ 
                name: sub.userName || user.name || '',
                email: sub.email || user.email || '',
                empId: (sub.empId === sub.email || (sub.empId && sub.empId.startsWith('PENDING-'))) ? '' : (sub.empId || ''), 
                phone: sub.phone || user.phone || '', 
                department: (sub.department && sub.department !== 'Awaiting Assignment') ? sub.department : (user.department && user.department !== 'Awaiting Assignment' ? user.department : ''), 
                designation: sub.designation || '',
                doj: sub.doj || '',
                gender: sub.gender || 'Male'
            });
            setDocuments({
                idCard: toApiAssetUrl(sub.idCard || ''),
                photo: toApiAssetUrl(sub.photo || '')
            });
        } else {
            setExistingSubmission(null);
            setSelectedPolicy(null);
            setDependents([]);
            setProfile({ 
                name: user?.name || '',
                email: user?.email || '',
                empId: (user?.empId === user?.email || (user?.empId && user?.empId.startsWith('PENDING-'))) ? '' : (user?.empId || ''), 
                phone: user?.phone || '', 
                department: (user?.department && user?.department !== 'Awaiting Assignment') ? user.department : '', 
                designation: user?.designation || '',
                doj: user?.doj || '',
                gender: user?.gender || 'Male'
            });
            setDocuments({ idCard: '', photo: '' });

            try {
                const fyId = fy.id || fy._id;
                const draft = JSON.parse(localStorage.getItem(`m_draft_${fyId}`));
                if (draft) {
                    if (draft.profile) setProfile(prev => ({...prev, ...draft.profile}));
                    if (draft.dependents) setDependents(draft.dependents);
                    if (draft.policyId) {
                        const pol = fy.policies?.find(p => (p.id || p._id) === draft.policyId);
                        if (pol) setSelectedPolicy(pol);
                    }
                }
            } catch(e) {}
        }
    }, [userSubmissions, user]);

    useEffect(() => {
    }, []);

    const isAfterDeadline = selectedFY?.deadline && new Date() > new Date(selectedFY.deadline);
    const isLocked = !selectedFY?.enabled || isAfterDeadline;

    const addDep = (type) => {
        if (!selectedFY || !selectedPolicy) return;
        
        const counts = {
            spouse: dependents.filter(d => d.type === 'spouse').length,
            child: dependents.filter(d => d.type === 'child').length,
            parent: dependents.filter(d => d.type === 'parent').length
        };

        if (type === 'spouse' && (counts.spouse >= 1 || !selectedPolicy.allowSpouse)) return;
        if (type === 'child' && (counts.child >= (selectedPolicy.maxChildren || 0) || !selectedPolicy.allowChildren)) return;
        if (type === 'parent' && (counts.parent >= (selectedPolicy.maxParents || 0) || !selectedPolicy.allowParents)) return;

        const id = Math.random().toString(36).substr(2, 9);
        setDependents([...dependents, { id, type, name: '', dob: '', gender: 'Male' }]);
    };

    const handleFileUpload = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return setAlertConfig({ title: 'File Too Large', text: "Maximum file size is 2MB." });

        setUploading({ ...uploading, [type]: true });
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await api.post('/claims/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocuments(prev => ({ ...prev, [type]: res.data.url }));
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'Upload Failed', text: "Could not upload document. Check your connection." });
        } finally {
            setUploading({ ...uploading, [type]: false });
        }
    };

    const calculatePremium = useCallback(() => {
        if (!selectedPolicy || !selectedFY) return 0;
        const spouseCount = dependents.filter(d => d.type === 'spouse').length;
        const childrenCount = dependents.filter(d => d.type === 'child').length;
        const parentCount = dependents.filter(d => d.type === 'parent').length;

        const base = Number(selectedPolicy.premium || 0);
        const spouse = spouseCount > 0 ? Number(selectedPolicy.spousePremium || 0) : 0;
        const children = childrenCount * Number(selectedPolicy.childPremium || 0);
        const parents = parentCount * Number(selectedPolicy.parentPremium || 0);

        return base + spouse + children + parents;
    }, [selectedPolicy, selectedFY, dependents]);

    // Background Autosaver mapping to window blurs and tab switches
    useEffect(() => {
        const handleAutoSave = () => {
            if (!selectedFY || success) return;
            const fyId = selectedFY.id || selectedFY._id;
            localStorage.setItem(`m_draft_${fyId}`, JSON.stringify({ 
                profile, dependents, policyId: selectedPolicy?.id || selectedPolicy?._id 
            }));
        };

        window.addEventListener('blur', handleAutoSave);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) handleAutoSave();
        });

        return () => {
            window.removeEventListener('blur', handleAutoSave);
            document.removeEventListener('visibilitychange', () => {});
        };
    }, [profile, dependents, selectedPolicy, selectedFY, success]);

    const handleSubmit = async () => {
        if (isLocked) return setAlertConfig({ title: 'Access Denied', text: "Enrollment window is closed." });
        
        const missing = [];
        if (!profile.name) missing.push("Full Name");
        if (!profile.empId) missing.push("Employee ID");
        if (!profile.phone) missing.push("Phone Number");
        if (!profile.department) missing.push("Department");
        if (!profile.designation) missing.push("Designation");
        if (!profile.doj) missing.push("Date of Joining");
        if (!selectedPolicy) missing.push("Policy selection");
        if (selectedFY.requireDocuments) {
            if (!documents.idCard) missing.push("Government ID Upload");
            if (!documents.photo) missing.push("Passport Photo Upload");
        }

        if (missing.length > 0) {
            return setAlertConfig({ 
                title: 'Incomplete Data', 
                text: `Please complete the following mandatory fields: ${missing.join(", ")}.` 
            });
        }
        
        setIsSubmitting(true);
        const spouseCount = dependents.filter(d => d.type === 'spouse').length;
        const childrenCount = dependents.filter(d => d.type === 'child').length;
        const parentCount = dependents.filter(d => d.type === 'parent').length;
        
        const base = Number(selectedPolicy.premium || 0);
        const spouse = spouseCount > 0 ? Number(selectedPolicy.spousePremium || 0) : 0;
        const children = childrenCount * Number(selectedPolicy.childPremium || 0);
        const parents = parentCount * Number(selectedPolicy.parentPremium || 0);

        const data = {
            userId: user._id || user.uid,
            userName: profile.name,
            email: user.email,
            ...profile,
            policy: selectedPolicy,
            coverageId: selectedPolicy.label,
            basePremium: base,
            spousePremium: spouse,
            childrenPremium: children,
            parentsPremium: parents,
            premium: base + spouse + children + parents,
            dependents,
            idCard: documents.idCard,
            photo: documents.photo,
            fyId: selectedFY.id || selectedFY._id,
            fyName: selectedFY.name,
            financialYear: selectedFY.name,
            patientName: user.name,
            relation: 'Self',
            archived: false
        };
        if (isDemoMode) {
            localStorage.setItem(`sub_${user.email}_${selectedFY.id}`, JSON.stringify(data));
            const updatedUser = { ...user, ...profile };
            localStorage.setItem('mediclaim_user', JSON.stringify(updatedUser));
            localStorage.removeItem(`m_draft_${selectedFY.id || selectedFY._id}`);
            setSuccess(true);
            setTimeout(() => window.location.reload(), 2000);
            return;
        }
        try {
            if (existingSubmission) {
                await api.put(`/claims/${existingSubmission._id || existingSubmission.id}`, data);
            } else {
                await api.post('/claims', data);
            }
            localStorage.removeItem(`m_draft_${selectedFY.id || selectedFY._id}`);
            const userUpdate = {
                name: profile.name,
                phone: profile.phone,
                doj: profile.doj,
                gender: profile.gender,
                empId: profile.empId,
                department: profile.department,
                designation: profile.designation
            };
            await api.put(`/users/${user._id || user.uid}`, userUpdate);
            setSuccess(true);
            setTimeout(() => setSelectedFY(null), 2500);
        } catch (err) { console.error(err); setAlertConfig({ title: 'Error', text: "Failed to save data. Please try again." }); }
        finally { setIsSubmitting(false); }
    };

    if (!selectedFY) return (
        <div style={{ width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: '1rem' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)', lineHeight: 1.2 }}>Health Insurance Enrollment</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px', fontSize: '15px' }}>Select an active session to manage your medical policy details.</p>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem' }}>
                {years.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '4rem', textAlign: 'center', border: '0.5px dashed #DDE3EE' }}>
                        <AlertTriangle size={48} color="var(--text-muted)" style={{ marginBottom: '1.5rem' }} />
                        <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-main)' }}>No Active Cycles</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Institutional enrollment cycles are currently offline or de-authorized.</p>
                    </div>
                ) : years.map(y => {
                    const yId = y.id || y._id;
                    const sub = userSubmissions[yId];
                    const expired = y.deadline && new Date() > new Date(y.deadline);
                    const locked = !y.enabled || expired || y.isArchived;
                    const availableFg = '#065f46';
                    const availableBg = '#ecfdf5';
                    const color = locked ? '#64748b' : sub ? 'var(--accent-blue-text)' : availableFg;
                    const bgColor = locked ? 'var(--bg-surface)' : sub ? 'var(--accent-blue-bg)' : availableBg;
                    const borderColor = locked ? 'transparent' : sub ? 'rgba(24, 95, 165, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                    
                    return (
                        <div key={yId} className="glass-panel" onClick={() => enterYear(y)} style={{ 
                            padding: '1.5rem', 
                            cursor: 'pointer', 
                            border: 'var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            background: 'var(--bg-card)',
                            boxShadow: 'none'
                        }}>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ width: '32px', height: '32px', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                                    <Briefcase size={16} color={color} />
                                </div>
                                <div style={{ 
                                    padding: '6px 12px', 
                                    background: bgColor, 
                                    border: `1.5px solid ${borderColor}`,
                                    fontSize: '11px', 
                                    fontWeight: 700, 
                                    color: color,
                                    borderRadius: '10px',
                                    letterSpacing: '0.5px'
                                }}>
                                    {locked ? 'CLOSED' : sub ? 'ENROLLED' : 'AVAILABLE'}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>FINANCIAL CYCLE</div>
                                <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)' }}>FY {y.name}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '1rem', borderTop: 'var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>Deadline: <span style={{ color: expired ? 'var(--danger)' : 'var(--text-main)' }}>{y.deadline ? new Date(y.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No Limit'}</span></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: sub ? '1fr 1fr' : '1fr', gap: '0.5rem' }}>
                                    {sub && (
                                        <button 
                                            className="btn btn-ghost" 
                                            style={{ height: '34px', fontSize: '11px', fontWeight: 500, color: 'var(--primary-blue)', border: '0.5px solid #B5D4F4' }}
                                            onClick={(e) => { e.stopPropagation(); generateEnrollmentPDF({ submission: sub, activeFY: y }); }}
                                        >
                                            <Printer size={12} /> RECEIPT
                                        </button>
                                    )}
                                    <div 
                                        style={{ height: '36px', borderRadius: '12px', background: bgColor, border: `1.5px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: color, fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                                        onClick={() => enterYear(y)}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.filter = 'brightness(1.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'none'; }}
                                    >
                                        {locked ? <ShieldCheck size={14} /> : sub ? <Edit size={14} /> : <UserPlus size={14} />}
                                        {locked ? 'VIEW' : sub ? 'EDIT' : 'ENTER'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '4rem' }}>
                <header style={{ marginBottom: '1rem', paddingLeft: '1.2rem' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--text-main)' }}>My Enrollment History</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '15px' }}>Past cycle records and historical enrollment snapshots.</p>
                </header>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {loadingAll ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                        </div>
                    ) : allHistory.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ fontWeight: 400, fontSize: '13px', color: 'var(--text-muted)' }}>No historical snapshots available yet.</p>
                        </div>
                    ) : (
                        allHistory.map(item => (
                            <div key={item._id || item.id} className="glass-panel" style={{ padding: '1.25rem 1.5rem', border: 'var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
                                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SESSION</div>
                                        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-main)' }}>FY {item.fyName || item.fyId?.slice(0,8)}</div>
                                    </div>
                                    <div style={{ height: '24px', width: '0.5px', background: '#DDE3EE' }} />
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>COVERAGE</div>
                                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>{item.coverageId}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>SUBMITTED</div>
                                        <div style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-main)' }}>{new Date(item.createdAt || item.timestamp).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '11px', color: 'var(--primary-blue)', border: '0.5px solid #B5D4F4' }} onClick={() => generateEnrollmentPDF({ submission: item, activeFY: { name: item.fyName || item.fyId } })}>
                                        <Download size={14} /> PDF
                                    </button>
                                    <div style={{ padding: '4px 10px', background: 'var(--nav-active-bg)', color: 'var(--text-main)', fontWeight: 500, fontSize: '12px', borderRadius: '12px' }}>
                                        Archived
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', margin: '0 auto', paddingBottom: '3rem', boxSizing: 'border-box' }}>
            <div className="flex-adaptive-header" style={{ marginBottom: '1rem' }}>
                <div className="header-info">
                    <h1 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>SESSION {selectedFY.name}</h1>
                    <p style={{ color: isLocked ? 'var(--danger)' : 'var(--accent-green-text)', fontWeight: 500, fontSize: '15px' }}>{isLocked ? 'VIEW ONLY MODE' : 'ENROLLMENT SYNCHRONIZED'}</p>
                </div>
            </div>

            {success ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center', background: 'var(--bg-surface)', border: 'var(--border)' }}>
                    <CheckCircle size={64} color="var(--accent-green-text)" style={{ marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>Update Finalized!</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '15px', marginBottom: '2rem' }}>Your records for FY {selectedFY.name} have been synchronized. Redirecting...</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => generateEnrollmentPDF({ submission: existingSubmission || userSubmissions[selectedFY.id || selectedFY._id], activeFY: selectedFY })} style={{ padding: '12px 24px', fontSize: '13px' }}>
                            <Download size={18} /> DOWNLOAD RECEIPT
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* 1. Profile Section */}
                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-card)', border: 'var(--border)' }}>
                        <h2 style={{ marginBottom: '1.25rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontSize: '15px' }}>
                            <User size={20} color="var(--primary)" /> Member Profile
                        </h2>
                        <div className="responsive-auto-grid" style={{ gap: '1rem' }}>
                            {[
                                { lab: 'FULL NAME', key: 'name' },
                                { lab: 'EMAIL ADDRESS', key: 'email', solid: true },
                                { lab: 'EMPLOYEE ID', key: 'empId' },
                                { lab: 'PHONE NUMBER', key: 'phone' },
                                { lab: 'DESIGNATION', key: 'designation' }
                            ].map(f => (
                                <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>{f.lab} {!f.solid && <span style={{ color: 'var(--danger)' }}>*</span>}</label>
                                    <input 
                                        disabled={isLocked || f.solid} 
                                        autoComplete="off" 
                                        className="input-premium" 
                                        placeholder=""
                                        style={{ width: '100%', background: f.solid ? 'var(--bg-surface)' : 'transparent', cursor: f.solid ? 'not-allowed' : 'text' }} 
                                        value={profile[f.key]} 
                                        onChange={e => setProfile({...profile, [f.key]: f.up ? e.target.value.toUpperCase() : e.target.value})} 
                                    />
                                </div>
                            ))}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>DEPARTMENT <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <select 
                                    disabled={isLocked} 
                                    className="input-premium" 
                                    style={{ width: '100%' }} 
                                    value={profile.department} 
                                    onChange={e => setProfile({...profile, department: e.target.value})}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d._id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>GENDER <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <select disabled={isLocked} className="input-premium" style={{ width: '100%' }} value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                                    <option>Male</option><option>Female</option><option>Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>DATE OF JOINING <span style={{ color: 'var(--danger)' }}>*</span></label>
                                <input disabled={isLocked} type="date" className="input-premium" style={{ width: '100%' }} value={profile.doj} onChange={e => setProfile({...profile, doj: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* 2. Policy Section */}
                    <section className="glass-panel" style={{ padding: '1rem 1.25rem', background: 'var(--bg-surface)', border: 'var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: 'var(--text-main)' }}><Heart size={20} color="var(--primary)" /> Choose Your Plan</h2>
                            <div style={{ background: 'var(--bg-card)', padding: '10px 18px', border: 'var(--border)', borderRadius: '12px', textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Estimated Premium</div>
                                <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--text-main)' }}>₹{calculatePremium().toLocaleString()}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                            {selectedFY.policies?.map(p => (
                                <div key={p.id} className="glass-panel" onClick={() => !isLocked && setSelectedPolicy(p)}
                                    style={{ padding: '1rem', cursor: isLocked ? 'default' : 'pointer', border: selectedPolicy?.id === p.id ? '2px solid var(--primary-blue)' : 'var(--border)', background: selectedPolicy?.id === p.id ? 'var(--nav-active-bg)' : 'var(--bg-card)', boxShadow: 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>{p.label}</h3>
                                        {selectedPolicy?.id === p.id && <CheckCircle size={18} color="var(--primary-blue)" />}
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--primary-blue)' }}>₹{p.premium.toLocaleString()}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Annual Policy Premium</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 3. Dependents Section */}
                    {selectedPolicy && (selectedPolicy.allowSpouse || selectedPolicy.allowChildren || selectedPolicy.allowParents) && (
                        <section className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', border: 'var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}><UserPlus size={20} color="var(--primary)" /> Family Members (Dependents)</h2>
                                {!isLocked && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {[
                                            { type: 'spouse', lab: 'SPOUSE', limit: 1, allowed: selectedPolicy.allowSpouse },
                                            { type: 'child', lab: 'CHILD', limit: selectedPolicy.maxChildren, allowed: selectedPolicy.allowChildren },
                                            { type: 'parent', lab: 'PARENT', limit: selectedPolicy.maxParents, allowed: selectedPolicy.allowParents }
                                        ].filter(s => s.allowed).map(s => {
                                            const count = dependents.filter(d => d.type === s.type).length;
                                            return (
                                                <button 
                                                    key={s.type}
                                                    className="btn btn-ghost" 
                                                    style={{ fontSize: '11px', border: 'var(--border)', padding: '6px 12px', fontWeight: 500, color: 'var(--text-main)' }} 
                                                    onClick={() => addDep(s.type)}
                                                    disabled={count >= s.limit}
                                                >
                                                    {s.lab}: {count}/{s.limit}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {dependents.map(d => (
                                    <div key={d.id} className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-surface)', border: 'var(--border)', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)', fontSize: '12px' }}>{d.type.toUpperCase()} INFORMATION</span>
                                            {!isLocked && (
                                                <button className="btn btn-ghost" style={{ padding: '6px', color: 'var(--danger)', border: '0.5px solid rgba(163,45,45,0.2)' }} onClick={() => setDependents(dependents.filter(x=>x.id!==d.id))}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>FULL NAME</label>
                                                <input disabled={isLocked} autoComplete="off" className="input-premium" placeholder="" value={d.name} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, name: e.target.value} : x))} />
                                            </div>
                                            {d.type === 'parent' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>RELATION</label>
                                                    <select disabled={isLocked} className="input-premium" value={d.relation} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, relation: e.target.value} : x))}>
                                                        <option value="">Select</option>
                                                        <option>Father</option><option>Mother</option><option>Father-in-law</option><option>Mother-in-law</option>
                                                    </select>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>GENDER</label>
                                                <select disabled={isLocked} className="input-premium" value={d.gender} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, gender: e.target.value} : x))}>
                                                    <option>Male</option><option>Female</option><option>Other</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>DATE OF BIRTH</label>
                                                <input disabled={isLocked} type="date" className="input-premium" value={d.dob} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, dob: e.target.value} : x))} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {dependents.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', border: '0.5px dashed #DDE3EE', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>No dependents added yet.</div>}
                            </div>
                        </section>
                    )}

                    {/* 4. Document Verification */}
                    {selectedFY.requireDocuments && (
                        <section className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
                            <h2 style={{ marginBottom: '2.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}>
                                <ShieldCheck size={26} color="var(--primary)" /> Required Documents
                            </h2>
                            <div className="responsive-auto-grid" style={{ gap: '2rem' }}>
                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border-glass)' }}>
                                    <div style={{ marginBottom: '1.5rem', opacity: documents.idCard ? 1 : 0.4 }}>
                                        <Shield size={40} color={documents.idCard ? 'var(--primary)' : 'white'} style={{ margin: '0 auto' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.5rem' }}>Government ID</h3>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Upload Aadhar or Institutional ID.</p>
                                    
                                    {documents.idCard ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.7rem', fontWeight: 900 }}>VERIFIED</div>
                                            <button className="btn btn-ghost" style={{ fontSize: '0.7rem' }} onClick={() => setDocuments({ ...documents, idCard: '' })}>REPLACE</button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input disabled={isLocked || uploading.idCard} type="file" accept="image/*,.pdf" style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} onChange={e => handleFileUpload(e, 'idCard')} />
                                            <button className="btn btn-primary" style={{ width: '100%', pointerEvents: 'none' }} disabled={uploading.idCard}>
                                                {uploading.idCard ? <Loader2 className="animate-spin" /> : 'UPLOAD'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '2px dashed var(--border-glass)' }}>
                                    <div style={{ marginBottom: '1.5rem', opacity: documents.photo ? 1 : 0.4 }}>
                                        <User size={40} color={documents.photo ? 'var(--primary)' : 'white'} style={{ margin: '0 auto' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '0.5rem' }}>Passport Photo</h3>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Recent professional photograph (JPG/PNG).</p>
                                    
                                    {documents.photo ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ padding: '0.5rem', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.7rem', fontWeight: 900 }}>UPLOADED</div>
                                            <button className="btn btn-ghost" style={{ fontSize: '0.7rem' }} onClick={() => setDocuments({ ...documents, photo: '' })}>REPLACE</button>
                                        </div>
                                    ) : (
                                        <div style={{ position: 'relative' }}>
                                            <input disabled={isLocked || uploading.photo} type="file" accept="image/*" style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} onChange={e => handleFileUpload(e, 'photo')} />
                                            <button className="btn btn-primary" style={{ width: '100%', pointerEvents: 'none' }} disabled={uploading.photo}>
                                                {uploading.photo ? <Loader2 className="animate-spin" /> : 'UPLOAD'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                        {!isLocked ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                <button className="btn btn-primary" style={{ padding: '12px', width: '100%', maxWidth: '400px', fontSize: '13px' }} onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {existingSubmission ? 'Update My Enrollment' : 'Submit Enrollment'}</>}
                                </button>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center', opacity: 0.8 }}>
                                    * You can update your enrollment details anytime before the cycle deadline.
                                </div>
                            </div>
                        ) : (
                            <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(163, 45, 45, 0.05)', border: '0.5px solid rgba(163, 45, 45, 0.2)', textAlign: 'center', width: '100%' }}>
                                <AlertTriangle size={32} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                                <h3 style={{ color: 'var(--danger)', fontWeight: 500, fontSize: '15px' }}>ENROLLMENT CLOSED</h3>
                                <p style={{ color: 'var(--text-muted)', fontWeight: 400, marginTop: '0.5rem', fontSize: '13px' }}>The submission window for this financial cycle is closed. You can only view your data.</p>
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
