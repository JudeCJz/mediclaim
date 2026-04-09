import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api, { toApiAssetUrl } from '../api';
import { Heart, UserPlus, Trash2, CheckCircle, ShieldCheck, Loader2, Save, Printer, User, Briefcase, X, AlertTriangle, ArrowLeft, Download } from 'lucide-react';
import { generateEnrollmentPDF } from '../utils/pdfGenerator';

const FacultyDashboard = () => {
    const { user, isDemoMode, activeFY, socket, activeTab } = useApp();
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
                empId: sub.empId || '', 
                phone: sub.phone || user.phone || '', 
                department: sub.department || user.department || '', 
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
                empId: user?.empId || '', 
                phone: user?.phone || '', 
                department: (user?.department || '').toUpperCase(), 
                designation: user?.designation || '',
                doj: user?.doj || '',
                gender: user?.gender || 'Male'
            });
            setDocuments({ idCard: '', photo: '' });
        }
    }, [userSubmissions, user]);

    // Disable auto-select of previous FY to respect user's overview request
    useEffect(() => {
        // We used to enterYear(saved) here, but now we stay in overview.
        // localStorage.removeItem('faculty_selected_fy'); // Optional: clear it
    }, []);

    const isAfterDeadline = selectedFY?.deadline && new Date() > new Date(selectedFY.deadline);
    const isLocked = !selectedFY?.enabled || isAfterDeadline;

    const addDep = (type) => {
        if (!selectedFY) return;
        
        const counts = {
            spouse: dependents.filter(d => d.type === 'spouse').length,
            child: dependents.filter(d => d.type === 'child').length,
            parent: dependents.filter(d => d.type === 'parent').length
        };

        if (type === 'spouse' && (counts.spouse >= 1 || !selectedFY.allowSpouse)) return;
        if (type === 'child' && (counts.child >= (selectedFY.maxChildren || 0) || !selectedFY.allowChildren)) return;
        if (type === 'parent' && (counts.parent >= (selectedFY.maxParents || 0) || !selectedFY.allowParents)) return;

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
        const spouse = spouseCount > 0 ? Number(selectedFY.spousePremium || 0) : 0;
        const children = childrenCount * Number(selectedFY.childPremium || 0);
        const parents = parentCount * Number(selectedFY.parentPremium || 0);

        return base + spouse + children + parents;
    }, [selectedPolicy, selectedFY, dependents]);

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
        const spouse = spouseCount > 0 ? Number(selectedFY.spousePremium || 0) : 0;
        const children = childrenCount * Number(selectedFY.childPremium || 0);
        const parents = parentCount * Number(selectedFY.parentPremium || 0);

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
        <div style={{ width: '100%', margin: '0 auto' }}>
            <header style={{ marginBottom: '3.5rem', borderLeft: '12px solid var(--primary)', paddingLeft: 'clamp(1rem, 5vw, 2.5rem)' }}>
                <h1 style={{ fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', fontWeight: 900, lineHeight: 1.1 }}>Health Insurance Enrollment</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem', fontSize: '0.9rem' }}>Select an active session to manage your medical policy details.</p>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
                {years.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '8rem', textAlign: 'center', opacity: 0.5, border: '2px dashed var(--border-glass)' }}>
                        <AlertTriangle size={80} style={{ marginBottom: '2rem' }} />
                        <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Nothing here</h2>
                        <p style={{ fontWeight: 800 }}>Institutional enrollment cycles are currently offline or de-authorized.</p>
                    </div>
                ) : years.map(y => {
                    const yId = y.id || y._id;
                    const sub = userSubmissions[yId];
                    const expired = y.deadline && new Date() > new Date(y.deadline);
                    const locked = !y.enabled || expired || y.isArchived;
                    const color = locked ? '#94a3b8' : sub ? 'var(--primary)' : '#22c55e';
                    
                    return (
                        <div key={yId} className="glass-panel" onClick={() => enterYear(y)} style={{ 
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
                                <div style={{ width: '40px', height: '40px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
                                    <Briefcase size={20} color={color} />
                                </div>
                                <div style={{ 
                                    padding: '0.3rem 0.8rem', 
                                    background: `${color}10`, 
                                    border: `1px solid ${color}40`, 
                                    fontSize: '0.6rem', 
                                    fontWeight: 900, 
                                    color: color,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px'
                                }}>
                                    {locked ? 'CLOSED' : sub ? 'ENROLLED' : 'AVAILABLE'}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '1px' }}>FINANCIAL CYCLE</div>
                                <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '0.1rem' }}>FY {y.name}</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>DEADLINE: <span style={{ color: expired ? '#ef4444' : 'var(--text-main)' }}>{y.deadline || 'NO_LIMIT'}</span></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: sub ? '1fr 1fr' : '1fr', gap: '0.6rem' }}>
                                    {sub && (
                                        <button 
                                            className="btn btn-ghost" 
                                            style={{ height: '38px', padding: '0 0.8rem', fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', border: '1px solid var(--primary)30', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            onClick={(e) => { e.stopPropagation(); generateEnrollmentPDF({ submission: sub, activeFY: y }); }}
                                        >
                                            <Printer size={12} /> RECEIPT
                                        </button>
                                    )}
                                    <div 
                                        style={{ height: '38px', padding: '0 0.8rem', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: color, fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' }}
                                        onClick={() => enterYear(y)}
                                    >
                                        {locked ? <ShieldCheck size={14} /> : sub ? <Save size={14} /> : <UserPlus size={14} />}
                                        {locked ? 'VIEW' : sub ? 'EDIT' : 'ENTER'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '6rem' }}>
                <header style={{ marginBottom: '2.5rem', borderLeft: '12px solid var(--border-glass)', paddingLeft: 'clamp(1rem, 5vw, 2.5rem)' }}>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontWeight: 900 }}>My Enrollment History</h2>
                    <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem' }}>Past cycle records and historical enrollment snapshots.</p>
                </header>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {loadingAll ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={30} color="var(--primary)" />
                        </div>
                    ) : allHistory.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
                            <p style={{ fontWeight: 900 }}>No historical snapshots available yet.</p>
                        </div>
                    ) : (
                        allHistory.map(item => (
                            <div key={item._id || item.id} className="glass-panel" style={{ padding: '1.5rem 2rem', border: '2px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                        <div style={{ fontWeight: 900, fontSize: '0.8rem' }}>{new Date(item.createdAt || item.timestamp).toLocaleDateString() || 'ARCHIVED'}</div>
                                    </div>
                                </div>
                                <button className="btn btn-ghost" style={{ padding: '0.4rem 1rem', border: '1px solid var(--primary)', color: 'var(--primary)', fontWeight: 900, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => generateEnrollmentPDF({ submission: item, activeFY: { name: item.fyName || item.fyId } })}>
                                    <Download size={14} /> DOWNLOAD_PDF
                                </button>
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
            <div className="flex-adaptive-header" style={{ marginBottom: '3rem', borderLeft: '12px solid var(--primary)', paddingLeft: '2rem' }}>
                <div className="header-info">
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900 }}>SESSION {selectedFY.name}</h1>
                    <p style={{ color: isLocked ? '#ef4444' : '#22c55e', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>{isLocked ? 'VIEW_ONLY_ACCESS' : 'ENROLLMENT_SYNCHRONIZED'}</p>
                </div>
            </div>

            {success ? (
                <div className="glass-panel" style={{ padding: '8rem', textAlign: 'center', borderTop: '12px solid #22c55e' }}>
                    <CheckCircle size={100} color="#22c55e" style={{ marginBottom: '2rem' }} className="animate-pulse" />
                    <h2 style={{ fontSize: '3rem', fontWeight: 900 }}>Update Finalized!</h2>
                    <p style={{ opacity: 0.7, fontWeight: 700, fontSize: '1.2rem', marginBottom: '3rem' }}>Your records for FY {selectedFY.name} have been synchronized. Redirecting...</p>
                    <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary" onClick={() => generateEnrollmentPDF({ submission: existingSubmission || userSubmissions[selectedFY.id || selectedFY._id], activeFY: selectedFY })} style={{ padding: '1.2rem 3rem', fontSize: '1rem', fontWeight: 900 }}>
                            <Download size={20} /> DOWNLOAD RECEIPT
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {/* 1. Profile Section */}
                    <section className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h2 style={{ marginBottom: '1.5rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)', fontSize: '1.2rem' }}>
                            <User size={24} color="var(--primary)" /> Member Profile
                        </h2>
                        <div className="responsive-auto-grid" style={{ gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>FULL NAME <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>EMPLOYEE ID <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={profile.empId} onChange={e => setProfile({...profile, empId: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>PHONE NUMBER <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DEPARTMENT <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.8rem', textTransform: 'uppercase', fontWeight: 900 }} value={profile.department} onChange={e => setProfile({...profile, department: e.target.value.toUpperCase()})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DESIGNATION <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} autoComplete="off" className="glass-panel" style={{ width: '100%', padding: '0.8rem' }} value={profile.designation} onChange={e => setProfile({...profile, designation: e.target.value})} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>GENDER <span style={{ color: '#ef4444' }}>*</span></label>
                                <select disabled={isLocked} className="glass-panel" style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={profile.gender} onChange={e => setProfile({...profile, gender: e.target.value})}>
                                    <option style={{ background: 'var(--bg-main)' }}>Male</option>
                                    <option style={{ background: 'var(--bg-main)' }}>Female</option>
                                    <option style={{ background: 'var(--bg-main)' }}>Other</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>DATE OF JOINING <span style={{ color: '#ef4444' }}>*</span></label>
                                <input disabled={isLocked} type="date" className="glass-panel" style={{ width: '100%', padding: '0.8rem', color: 'var(--text-main)' }} value={profile.doj} onChange={e => setProfile({...profile, doj: e.target.value})} />
                            </div>
                        </div>
                    </section>

                    {/* 2. Policy Section */}
                    <section className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.03)', border: '2px dashed var(--primary)30' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                            <h2 style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem' }}><Heart size={26} color="var(--primary)" /> Choose Your Plan</h2>
                            <div style={{ background: 'var(--bg-main)', padding: '0.8rem 1.5rem', border: '3px solid var(--primary)', boxShadow: '6px 6px 0px var(--primary)' }}>
                                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>ESTIMATED_PREMIUM</div>
                                <div style={{ fontSize: '2rem', fontWeight: 900 }}>₹{calculatePremium().toLocaleString()}</div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
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
                    {(selectedFY.allowSpouse || selectedFY.allowChildren || selectedFY.allowParents) && (
                        <section className="glass-panel" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <h2 style={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'clamp(1.1rem, 4vw, 1.5rem)' }}><UserPlus size={26} color="var(--primary)" /> Family Members (Dependents)</h2>
                                {!isLocked && (
                                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        {selectedFY.allowSpouse && (
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: '0.65rem', border: '1px solid var(--border-glass)', padding: '0.8rem 1.2rem', fontWeight: 900 }} 
                                                onClick={() => addDep('spouse')}
                                                disabled={dependents.filter(d => d.type === 'spouse').length >= 1}
                                            >
                                                <div style={{ opacity: 0.6 }}>SPOUSE SLOTS:</div>
                                                <div style={{ color: dependents.filter(d => d.type === 'spouse').length >= 1 ? '#ef4444' : 'var(--primary)' }}>
                                                    {dependents.filter(d => d.type === 'spouse').length}/1
                                                </div>
                                            </button>
                                        )}
                                        {selectedFY.allowChildren && (
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: '0.65rem', border: '1px solid var(--border-glass)', padding: '0.8rem 1.2rem', fontWeight: 900 }} 
                                                onClick={() => addDep('child')}
                                                disabled={dependents.filter(d => d.type === 'child').length >= (selectedFY.maxChildren || 0)}
                                            >
                                                <div style={{ opacity: 0.6 }}>CHILD SLOTS:</div>
                                                <div style={{ color: dependents.filter(d => d.type === 'child').length >= (selectedFY.maxChildren || 0) ? '#ef4444' : 'var(--primary)' }}>
                                                    {dependents.filter(d => d.type === 'child').length}/{selectedFY.maxChildren}
                                                </div>
                                            </button>
                                        )}
                                        {selectedFY.allowParents && (
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ fontSize: '0.65rem', border: '1px solid var(--border-glass)', padding: '0.8rem 1.2rem', fontWeight: 900 }} 
                                                onClick={() => addDep('parent')}
                                                disabled={dependents.filter(d => d.type === 'parent').length >= (selectedFY.maxParents || 0)}
                                            >
                                                <div style={{ opacity: 0.6 }}>PARENT SLOTS:</div>
                                                <div style={{ color: dependents.filter(d => d.type === 'parent').length >= (selectedFY.maxParents || 0) ? '#ef4444' : 'var(--primary)' }}>
                                                    {dependents.filter(d => d.type === 'parent').length}/{selectedFY.maxParents}
                                                </div>
                                            </button>
                                        )}
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
                                            {d.type === 'parent' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>RELATION</label>
                                                    <select disabled={isLocked} className="glass-panel" style={{ width: '100%', padding: '1rem', background: 'var(--bg-glass)', color: 'var(--text-main)', border: '1px solid var(--border-glass)' }} value={d.relation} onChange={e => setDependents(dependents.map(x=>x.id===d.id ? {...x, relation: e.target.value} : x))}>
                                                        <option value="">Select Relation</option>
                                                        <option style={{ background: 'var(--bg-main)' }}>Father</option>
                                                        <option style={{ background: 'var(--bg-main)' }}>Mother</option>
                                                        <option style={{ background: 'var(--bg-main)' }}>Father-in-law</option>
                                                        <option style={{ background: 'var(--bg-main)' }}>Mother-in-law</option>
                                                    </select>
                                                </div>
                                            )}
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
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '0.2rem 0.8rem', border: '1px solid var(--primary-glow)', borderRadius: '4px' }}>
                                                            {Math.floor((new Date() - new Date(d.dob)) / (365.25 * 24 * 60 * 60 * 1000))} YEARS OLD
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

                    <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
                        {!isLocked ? (
                            <button className="btn btn-primary" style={{ padding: '1.5rem 6rem', width: '100%', maxWidth: '600px', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }} onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save size={24} /> {existingSubmission ? 'Update My Enrollment' : 'Submit Enrollment'}</>}
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
