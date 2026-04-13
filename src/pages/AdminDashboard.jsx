import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import { ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus, Key, ShieldAlert, CheckCircle, Clock, Heart, User, Phone, Briefcase, BarChart3, Activity, ArrowRight, Lock, Unlock, Search, Trash2, Users, Download, FileText, Settings, Loader2, AlertTriangle, Megaphone } from 'lucide-react';

const AdminDashboard = () => {
    const { activeFY, activeTab, isDemoMode, DEMO_FACULTY, socket } = useApp();
    const [years, setYears] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [bulkData, setBulkData] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [showFYModal, setShowFYModal] = useState(false);
    const [showMailModal, setShowMailModal] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState({});

    // Custom Templates State
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedFyForMail, setSelectedFyForMail] = useState(null);
    const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', html: '' });
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [isMailing, setIsMailing] = useState(false);
    const [isSavingFY, setIsSavingFY] = useState(false);
    const [alertConfig, setAlertConfig] = useState(null);
    const [selectedUserToReset, setSelectedUserToReset] = useState(null);
    const [manualPass, setManualPass] = useState({ next: '', confirm: '' });
    const [showManualPass, setShowManualPass] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
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
        requireDocuments: false,
        enabled: false,
        policies: []
    });

    const [tempPolicy, setTempPolicy] = useState({
        id: null, label: '', premium: '',
        maxChildren: 2, maxParents: 4,
        allowSpouse: false, allowChildren: false, allowParents: false, spousePremium: '', childPremium: '', parentPremium: ''
    });

    const fetchData = useCallback(async () => {
        try {
            const [yRes, sRes, fRes, tRes] = await Promise.all([
                api.get('/financialYears'),
                api.get('/claims'),
                api.get('/users/faculty'),
                api.get('/mail/templates').catch(() => ({ data: [] }))
            ]);
            setYears(yRes.data);
            setSubmissions(sRes.data);
            setFaculty(fRes.data);
            setTemplates(tRes.data);
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
            policies: [...newFY.policies, {
                id: tempPolicy.id || ('p' + Date.now()),
                label: tempPolicy.label,
                premium: Number(tempPolicy.premium),
                maxChildren: Number(tempPolicy.maxChildren),
                maxParents: Number(tempPolicy.maxParents),
                allowSpouse: tempPolicy.allowSpouse,
                allowChildren: tempPolicy.allowChildren,
                allowParents: tempPolicy.allowParents,
                spousePremium: tempPolicy.spousePremium === '' ? 0 : Number(tempPolicy.spousePremium),
                childPremium: tempPolicy.childPremium === '' ? 0 : Number(tempPolicy.childPremium),
                parentPremium: tempPolicy.parentPremium === '' ? 0 : Number(tempPolicy.parentPremium),
            }]
        });
        setTempPolicy({
            id: null, label: '', premium: '', maxChildren: 2, maxParents: 4, allowSpouse: false, allowChildren: false, allowParents: false, spousePremium: '', childPremium: '', parentPremium: ''
        });
    };

    const editPolicy = (id) => {
        const planToEdit = newFY.policies.find(p => p.id === id);
        if (!planToEdit) return;
        setTempPolicy({
            id: planToEdit.id,
            label: planToEdit.label,
            premium: planToEdit.premium,
            maxChildren: planToEdit.maxChildren,
            maxParents: planToEdit.maxParents,
            allowSpouse: planToEdit.allowSpouse,
            allowChildren: planToEdit.allowChildren,
            allowParents: planToEdit.allowParents,
            spousePremium: planToEdit.spousePremium,
            childPremium: planToEdit.childPremium,
            parentPremium: planToEdit.parentPremium
        });
        setNewFY({ ...newFY, policies: newFY.policies.filter(p => p.id !== id) });
    };

    const removePolicy = (id) => {
        setNewFY({ ...newFY, policies: newFY.policies.filter(p => p.id !== id) });
    };

    const saveCustomTemplate = async () => {
        if (!newTemplate.name || !newTemplate.subject || !newTemplate.html) return alert('All fields required');
        try {
            await api.post('/mail/templates', newTemplate);
            setNewTemplate({ name: '', subject: '', html: '' });
            fetchData();
            setAlertConfig({ title: 'SAVED', text: 'Template saved successfully.' });
        } catch (err) {
            setAlertConfig({ title: 'ERROR', type: 'danger', text: err.response?.data?.msg || 'Failed to save template.' });
        }
    };
    const deleteCustomTemplate = async (tId) => {
        if (!confirm('Delete this template permanently?')) return;
        try {
            await api.delete(`/mail/templates/${tId}`);
            fetchData();
        } catch (e) { }
    };
    const dispatchCustomMails = async () => {
        if (!selectedTemplateId) return alert('Please select a template to send.');
        if (!selectedFyForMail) return;
        setIsMailing(true);
        try {
            const res = await api.post('/mail/dispatch-custom', {
                fyId: selectedFyForMail._id || selectedFyForMail.id,
                templateId: selectedTemplateId
            });
            setShowTemplateModal(false);
            setTimeout(() => setAlertConfig({ title: 'EMAILS DISPATCHED', text: res.data.message }), 500);
        } catch (err) {
            setAlertConfig({ title: 'ERROR', type: 'danger', text: 'Failed to dispatch custom emails.' });
        } finally { setIsMailing(false); }
    };

    const saveFY = async () => {
        if (!newFY.name || newFY.policies.length === 0) return setAlertConfig({ title: 'Validation Error', text: "Enter year name and at least one policy." });
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
            setAlertConfig({ title: 'SUCCESS', text: `Session ${newFY.name} has been ${editingFYId ? 'updated' : 'initialized'}.` });
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'ERROR', text: err.response?.data?.msg || "Failed to save session configuration." });
        }
        finally { setIsSavingFY(false); }
    };

    const openCreate = () => {
        // Only block if there's already an ENABLED cycle — disabled cycles don't count
        const hasActiveCycle = years.some(y => y.enabled);
        if (hasActiveCycle) {
            setAlertConfig({
                title: 'CYCLE LIMIT REACHED',
                text: 'An active enrollment cycle already exists. Disable or delete it before creating a new one.'
            });
            return;
        }

        setEditingFYId(null);
        const lastYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
        const parts = lastYear.split('-').map(Number);
        const suggestedName = parts.length === 2 ? `${parts[0] + 1}-${parts[1] + 1}` : lastYear;

        setNewFY({
            name: suggestedName,
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
            enabled: false,
            policies: []
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

    const deleteFY = async (id) => {
        try {
            await api.delete(`/financialYears/${id}`);
            fetchData();
        } catch {
            alert("Delete failed.");
        }
    };

    const processBulk = async () => {
        setIsBulkProcessing(true);
        // Split on newlines, keep rows with commas, strip the header row if present
        const rows = bulkData
            .split("\n")
            .map(r => r.replace(/\r/g, '').trim())
            .filter(r => r.includes(","))
            .filter(r => {
                const lower = r.toLowerCase();
                // Skip CSV header rows like "Name,Department,Email"
                return !(lower.startsWith('name,') && lower.includes(',email'));
            });
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
    const exportCSV = (fyId, fyName) => {
        const targetFyId = fyId || (activeFY?._id || activeFY?.id);
        const targetFyName = fyName || activeFY?.name || 'export';
        // Max children across all records for dynamic column generation
        const filteredSubs = submissions.filter(s => !s.archived && s.fyId === targetFyId);
        const maxChildren = Math.max(0, ...filteredSubs.map(s => s.dependents?.filter(d => d.type === 'child').length || 0));
        const maxParents = Math.max(0, ...filteredSubs.map(s => s.dependents?.filter(d => d.type === 'parent').length || 0));

        let childCols = '';
        for (let i = 1; i <= maxChildren; i++) childCols += `,Child ${i},Child ${i} DOB`;
        let parentCols = '';
        for (let i = 1; i <= maxParents; i++) parentCols += `,Parent ${i},Parent ${i} DOB`;

        let headers = `Faculty Name,Email,Coverage,Premium,Spouse Name,Spouse DOB${childCols}${parentCols}\n`;

        let csv = filteredSubs.map(s => {
            const spouse = s.dependents?.find(d => d.type === 'spouse');
            const children = s.dependents?.filter(d => d.type === 'child') || [];
            const parents = s.dependents?.filter(d => d.type === 'parent') || [];

            let childData = '';
            for (let i = 0; i < maxChildren; i++) {
                childData += `,"${children[i]?.name || ''}","${children[i]?.dob || ''}"`;
            }
            let parentData = '';
            for (let i = 0; i < maxParents; i++) {
                parentData += `,"${parents[i]?.name || ''}","${parents[i]?.dob || ''}"`;
            }

            return `"${s.userName}","${s.email}","${s.coverageId}","${s.premium}","${spouse?.name || ''}","${spouse?.dob || ''}"${childData}${parentData}`;
        }).join("\n");

        const blob = new Blob([headers + csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Mediclaim_${targetFyName}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const sendSingleConfirmation = async (submission) => {
        try {
            await api.post('/mail/dispatch-confirmations', { claimIds: [submission._id || submission.id] });
            setAlertConfig({ title: 'EMAIL SENT', text: `Confirmation email dispatched to ${submission.email}.` });
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'EMAIL FAILED', text: 'Could not send confirmation email.' });
        }
    };

    const deleteRecord = async (id) => {
        try {
            await api.delete(`/claims/${id}`);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const toggleFacultyStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
            await api.put(`/users/${id}`, { status: newStatus });
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to update status.");
        }
    };

    const deleteFacultyUser = async (id) => {
        if (!confirm("Delete this faculty account? This action cannot be undone.")) return;
        try {
            await api.delete(`/users/${id}`);
            fetchData();
        } catch (err) {
            console.error(err);
            alert("Failed to delete faculty user.");
        }
    };



    const dispatchBulkEmails = async () => {
        if (!activeFY) return;
        setIsMailing(true);
        try {
            await api.post('/mail/dispatch-confirmations', { fyId: activeFY._id || activeFY.id });
            setAlertConfig({ title: 'BATCH COMPLETE', text: 'All confirmation emails have been queued for dispatch.' });
            setShowMailModal(false);
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'MAIL ERROR', text: 'Failed to initiate batch email dispatch.' });
        } finally {
            setIsMailing(false);
        }
    };

    const registryRows = faculty
        .map((member) => {
            const submission = submissions.find((entry) => !entry.archived && entry.email === member.email);
            if (submission) return { ...submission, rowType: 'submission' };

            return {
                _id: member._id || member.id,
                userName: member.name,
                email: member.email,
                empId: member.empId,
                gender: member.gender,
                doj: member.doj,
                department: member.department,
                designation: member.designation,
                coverageId: 'Not enrolled yet',
                dependents: [],
                premium: 0,
                rowType: 'account'
            };
        })
        .filter((row) => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            return (
                row.userName?.toLowerCase().includes(q) ||
                row.email?.toLowerCase().includes(q) ||
                row.empId?.toLowerCase().includes(q) ||
                row.department?.toLowerCase().includes(q) ||
                row.designation?.toLowerCase().includes(q) ||
                row.phone?.toLowerCase().includes(q) ||
                row.gender?.toLowerCase().includes(q) ||
                row.doj?.toLowerCase().includes(q)
            );
        });

    // Grouping logic for "Folder" sense
    const groupedSubmissions = years.map(fy => {
        const fyId = fy._id || fy.id;
        const fySubs = registryRows.filter(r => r.fyId === fyId || (r.rowType === 'account' && !r.fyId)); // Non-enrolled users are global or attached to active if we want

        // Actually, let's only group SUBMISSIONS here
        const actualSubs = registryRows.filter(r => r.rowType === 'submission' && r.fyId === fyId);

        return {
            ...fy,
            claims: actualSubs
        };
    });

    const toggleFolder = (id) => {
        setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
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
        r.onload = (ev) => {
            // Normalize line endings: strip \r so Windows CSVs parse correctly
            const normalized = ev.target.result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            setBulkData(normalized);
        };
        r.readAsText(f);
    };

    return (
        <div style={{ maxWidth: '1600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <header style={{ marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.22rem)', fontWeight: 900 }}>Administrator Portal</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem' }}>System Management & Enrollment Records</p>
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
                    <div className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 2.2rem)', width: '100%' }}>
                        <div className="responsive-auto-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(120px, 30vw, 160px), 1fr))', gap: '0.75rem' }}>
                            <div className="stat-card-premium hover-blue" style={{ background: 'var(--bg-card)', padding: '0.5rem 0.75rem', border: 'var(--border)' }}>
                                <div className="stat-val" style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>{faculty.length}</div>
                                <div className="stat-lab" style={{ fontSize: '10px', fontWeight: 900, color: '#2563eb', letterSpacing: '0.05em' }}>TOTAL FACULTY</div>
                            </div>
                            <div className="stat-card-premium hover-green" style={{ background: 'var(--bg-card)', padding: '0.5rem 0.75rem', border: 'var(--border)' }}>
                                <div className="stat-val" style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>{submissions.filter(s => !s.archived && s.fyId === (activeFY?._id || activeFY?.id)).length}</div>
                                <div className="stat-lab" style={{ fontSize: '10px', fontWeight: 900, color: '#10b981', letterSpacing: '0.05em' }}>ENROLLED</div>
                            </div>
                            <div className="stat-card-premium hover-amber" style={{ background: 'var(--bg-card)', padding: '0.5rem 0.75rem', border: 'var(--border)' }}>
                                <div className="stat-val" style={{ fontSize: '18px', fontWeight: 900, color: '#f59e0b' }}>
                                    {Math.max(0, faculty.filter(f => f.status !== 'disabled').length - submissions.filter(s => !s.archived && s.fyId === (activeFY?._id || activeFY?.id)).length)}
                                </div>
                                <div className="stat-lab" style={{ fontSize: '10px', fontWeight: 900, color: '#f59e0b', letterSpacing: '0.05em' }}>AWAITING</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: 'clamp(0.75rem, 1.5vw, 1.25rem)', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                            <h2 style={{ fontWeight: 900, fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <Settings size={22} color="var(--primary)" /> Active Enrollment Cycles
                            </h2>
                            <button className="btn btn-primary" onClick={openCreate} style={{ padding: '0.6rem 1rem', fontSize: '12px', fontWeight: 900, boxShadow: '0 8px 20px -5px var(--primary-glow)' }}>
                                <Plus size={16} /> INITIALIZE SESSION
                            </button>
                        </div>

                        {years.some(y => y.enabled) && (
                            <div className="glass-panel" style={{ marginBottom: '1.25rem', padding: '0.75rem 1.2rem', background: 'rgba(245,158,11,0.08)', fontWeight: 800, fontSize: '13px', color: '#f59e0b', border: '0.5px solid rgba(245,158,11,0.2)' }}>
                                <AlertTriangle size={15} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                An active cycle is authorized. Disable it before creating a new session.
                            </div>
                        )}

                        <div className="table-responsive-premium mobile-hide">
                            <table className="data-table-premium">
                                <thead>
                                    <tr>
                                        <th>CYCLE_NAME</th>
                                        <th>STATUS_AUTHORIZATION</th>
                                        <th>COVERAGE_TIERS</th>
                                        <th>DEPENDENCY_LIMITS</th>
                                        <th>DATA_EXPORT</th>
                                        <th>OPERATIONAL_ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {years.sort((a, b) => b.name.localeCompare(a.name)).map(y => (
                                        <tr key={y._id || y.id} style={{ opacity: y.enabled ? 1 : 0.6, transition: 'all 0.3s ease' }}>
                                            <td style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '1px', whiteSpace: 'nowrap', width: '150px' }}>FY {y.name}</td>
                                            <td>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.4rem 1.2rem', background: y.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: y.enabled ? '#22c55e' : '#ef4444', border: '1px solid currentColor', fontWeight: 900, fontSize: '0.7rem', letterSpacing: '1px', height: '40px' }}>
                                                    {y.enabled ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                                                    {y.enabled ? 'ACCEPTING_ENTRIES' : 'DISABLED_SESSION'}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '40px', alignItems: 'center' }}>
                                                    {y.policies?.map(p => (
                                                        <div key={p.id} style={{ fontSize: '0.6rem', fontWeight: 900, background: 'rgba(255,255,255,0.03)', padding: '0.3rem 0.6rem', border: '1px solid var(--border-glass)', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                                            {p.label} (₹{p.premium / 1000}K)
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
                                                {(() => {
                                                    const cycleId = y._id || y.id;
                                                    const count = submissions.filter(s => !s.archived && s.fyId === cycleId).length;
                                                    return (
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', padding: '0 1.2rem', fontSize: '0.7rem', fontWeight: 900, color: count > 0 ? '#22c55e' : 'var(--text-muted)', border: `1px solid ${count > 0 ? '#22c55e40' : 'var(--border-glass)'}`, opacity: count > 0 ? 1 : 0.5, height: '40px', whiteSpace: 'nowrap' }}
                                                            onClick={() => exportCSV(cycleId, y.name)}
                                                            title={`Export ${count} enrollment(s) for FY ${y.name}`}
                                                        >
                                                            <Download size={15} /> {count} RECORDS
                                                        </button>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', height: '40px' }}>
                                                    <button className="btn btn-ghost" style={{ height: '36px', width: '36px', padding: 0, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEdit(y)}><Edit size={16} /></button>
                                                    <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '36px', fontSize: '0.75rem', fontWeight: 900, background: y.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: y.enabled ? '#ef4444' : '#22c55e', border: '1px solid currentColor' }} onClick={() => toggleYear(y._id || y.id, y.enabled)}>
                                                        {y.enabled ? 'DISABLE' : 'ENABLE'}
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ height: '36px', width: '36px', padding: 0, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
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

                        <div className="mobile-only" style={{ flexDirection: 'column', gap: '1.5rem' }}>
                            {years.sort((a, b) => b.name.localeCompare(a.name)).map(y => {
                                const cycleId = y._id || y.id;
                                const count = submissions.filter(s => !s.archived && s.fyId === cycleId).length;
                                return (
                                    <div key={cycleId} className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>FY {y.name}</div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, padding: '0.3rem 0.6rem', background: y.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: y.enabled ? '#22c55e' : '#ef4444', border: '1px solid currentColor' }}>
                                                {y.enabled ? 'ACTIVE' : 'DISABLED'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {y.policies?.map(p => (
                                                <div key={p.id} style={{ fontSize: '0.6rem', fontWeight: 900, opacity: 0.7 }}>{p.label}</div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', gap: '1rem' }}>
                                            <button className="btn btn-ghost" style={{ flex: 1, minHeight: '45px', fontSize: '0.85rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.5rem' }} onClick={() => exportCSV(cycleId, y.name)}>
                                                <Download size={18} style={{ flexShrink: 0 }} />
                                                <span style={{ fontWeight: 900, whiteSpace: 'nowrap' }}>{count} RECORDS</span>
                                            </button>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                                <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '44px', fontSize: '0.75rem', fontWeight: 900, background: y.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: y.enabled ? '#ef4444' : '#22c55e', border: '1px solid currentColor', flexShrink: 0 }} onClick={() => toggleYear(y._id || y.id, y.enabled)}>
                                                    {y.enabled ? 'DISABLE' : 'ENABLE'}
                                                </button>
                                                <button className="btn btn-ghost" style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => openEdit(y)}><Edit size={20} style={{ flexShrink: 0 }} /></button>
                                                <button className="btn btn-ghost" style={{ width: '44px', height: '44px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }} onClick={() => {
                                                    setAlertConfig({
                                                        title: 'HARD_DELETE',
                                                        type: 'danger',
                                                        text: `Permanently destroy session ${y.name}? THIS CANNOT BE UNDONE.`,
                                                        onConfirm: () => deleteFY(y._id || y.id)
                                                    });
                                                }}><Trash2 size={20} style={{ flexShrink: 0 }} /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'registry' && (
                <div className="glass-panel" style={{ padding: 'clamp(1rem, 5vw, 2.5rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '1.2rem 1.2rem 1.2rem 4rem', fontWeight: 700, fontSize: '1rem' }} placeholder="Search enrollment database..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', width: '100%' }}>

                            <button
                                className="btn btn-primary"
                                style={{
                                    padding: '1.2rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    boxShadow: '0 8px 25px -5px rgba(67, 56, 202, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    fontSize: '0.75rem',
                                    fontWeight: 900,
                                    whiteSpace: 'nowrap'
                                }}
                                onClick={() => exportCSV()}
                            >
                                <Download size={18} /> GLOBAL EXPORT
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {years.map(y => ({
                            ...y,
                            claims: (submissions || []).filter(s => s.fyId === (y.id || y._id))
                        })).sort((a, b) => {
                            if (a.enabled && !b.enabled) return -1;
                            if (!a.enabled && b.enabled) return 1;
                            return (new Date(b.createdAt) || 0) - (new Date(a.createdAt) || 0);
                        }).map(fy => (
                            <div key={fy._id || fy.id} className="folder-container">
                                <div
                                    className="folder-header glass-panel"
                                    style={{
                                        padding: 'clamp(1rem, 4vw, 2rem)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        background: expandedFolders[fy._id] ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-glass)',
                                        border: expandedFolders[fy._id] ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                                        transition: 'all 0.3s ease',
                                        flexWrap: 'wrap',
                                        gap: '1.5rem'
                                    }}
                                    onClick={() => toggleFolder(fy._id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.8rem, 3vw, 1.5rem)', flex: 1, minWidth: '200px' }}>
                                        {expandedFolders[fy._id] ? <Unlock size={20} color="var(--primary)" /> : <Lock size={20} color="var(--text-muted)" />}
                                        <div>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px', marginBottom: '4px' }}>FINANCIAL CYCLE</div>
                                            <div style={{ fontSize: 'clamp(1.1rem, 5vw, 1.3rem)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                {fy.name}
                                                {fy.enabled && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#22c55e', color: 'white', fontWeight: 900, borderRadius: '4px' }}>ACTIVE</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 5vw, 2rem)', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                                        <div style={{ textAlign: window.innerWidth < 600 ? 'left' : 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>RECORDS</div>
                                            <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{fy.claims.length} SUBMISSIONS</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <button className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' }} onClick={(e) => { e.stopPropagation(); setSelectedFyForMail(fy); setShowTemplateModal(true); }} title="Send template emails to this cycle">
                                                <Mail size={16} />
                                            </button>
                                            <button className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)' }} onClick={(e) => { e.stopPropagation(); exportCSV(fy._id, fy.name); }} title="Export this cycle">
                                                <Download size={18} />
                                            </button>
                                            <ArrowRight size={20} style={{ transform: expandedFolders[fy._id] ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s ease', color: 'var(--primary)' }} />
                                        </div>
                                    </div>
                                </div>

                                {expandedFolders[fy._id] && (
                                    <div className="folder-content animate-slideDown" style={{ padding: '1rem 0 0 0' }}>
                                        <>
                                            <div className="table-responsive-premium mobile-hide" style={{ border: 'none', background: 'transparent' }}>
                                                <table className="data-table-premium">
                                                    <thead>
                                                        <tr>
                                                            <th>Faculty Member</th>
                                                            <th>ID / Bio</th>
                                                            <th>Dept / Designation</th>
                                                            <th>Coverage Config</th>
                                                            <th style={{ textAlign: 'center' }}>Total Premium</th>
                                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {fy.claims.length === 0 ? (
                                                            <tr>
                                                                <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5, fontWeight: 900 }}>NO ENROLLMENTS FOUND FOR THIS CYCLE</td>
                                                            </tr>
                                                        ) : (
                                                            fy.claims.map(s => (
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
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800 }}>
                                                                            {`+${(s.dependents?.length || 0)} DEPENDENTS`}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.2rem', textAlign: 'center' }}>₹{s.premium?.toLocaleString()}</td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                                            <button
                                                                                className="btn btn-ghost"
                                                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', border: '1px solid var(--primary)30' }}
                                                                                title="Send confirmation email"
                                                                                onClick={() => sendSingleConfirmation(s)}
                                                                            >
                                                                                <Mail size={14} />
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-ghost"
                                                                                style={{ padding: '0.4rem 0.8rem', color: '#ef4444', border: '1px solid #ef444430' }}
                                                                                title="Delete enrollment record"
                                                                                onClick={() => setAlertConfig({
                                                                                    title: 'DELETE RECORD',
                                                                                    type: 'danger',
                                                                                    text: `Delete enrollment record for ${s.userName}? This cannot be undone.`,
                                                                                    onConfirm: () => deleteRecord(s._id || s.id)
                                                                                })}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '1rem', padding: '0 1rem' }}>
                                                {fy.claims.map(s => (
                                                    <div key={s._id} className="glass-panel" style={{ padding: '1.2rem' }}>
                                                        <div style={{ fontWeight: 900 }}>{s.userName}</div>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{s.coverageId} (+{s.dependents?.length} Dept)</div>
                                                        <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ fontWeight: 900, color: 'var(--primary)' }}>₹{s.premium?.toLocaleString()}</div>
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => sendSingleConfirmation(s)}><Mail size={14} /></button>
                                                                <button className="btn btn-ghost" style={{ padding: '0.4rem', color: '#ef4444' }} onClick={() => setAlertConfig({
                                                                    title: 'DELETE RECORD',
                                                                    type: 'danger',
                                                                    text: `Delete enrollment record for ${s.userName}? This cannot be undone.`,
                                                                    onConfirm: () => deleteRecord(s._id || s.id)
                                                                })}><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {(() => {
                                                const unregQuery = searchTerm?.toLowerCase() || '';
                                                const unregistered = faculty.filter(f =>
                                                    f.status !== 'disabled' &&
                                                    !fy.claims.some(c => c.email === f.email) &&
                                                    (!unregQuery ||
                                                        f.name?.toLowerCase().includes(unregQuery) ||
                                                        f.email?.toLowerCase().includes(unregQuery) ||
                                                        (f.empId && f.empId.toLowerCase().includes(unregQuery)) ||
                                                        (f.department && f.department.toLowerCase().includes(unregQuery))
                                                    )
                                                );
                                                if (unregistered.length === 0) return null;
                                                return (
                                                    <div style={{ marginTop: '2rem', padding: '0 1rem' }}>
                                                        <div
                                                            className="glass-panel"
                                                            style={{
                                                                padding: '1rem',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                cursor: 'pointer',
                                                                opacity: 0.8,
                                                                border: '1px solid var(--border-glass)'
                                                            }}
                                                            onClick={() => toggleFolder(`unreg_${fy._id || fy.id}`)}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                <Users size={16} color="var(--text-muted)" />
                                                                <div style={{ fontWeight: 900, fontSize: '0.8rem', color: 'var(--text-muted)' }}>UNREGISTERED ACCOUNTS (NOT YET ENROLLED)</div>
                                                            </div>
                                                            <ArrowRight size={14} style={{ transform: expandedFolders[`unreg_${fy._id || fy.id}`] ? 'rotate(90deg)' : 'none', transition: 'transform 0.3s ease' }} />
                                                        </div>
                                                        {expandedFolders[`unreg_${fy._id || fy.id}`] && (
                                                            <div className="responsive-auto-grid" style={{ gap: '1rem', marginTop: '1rem' }}>
                                                                {unregistered.map(r => (
                                                                    <div key={r._id || r.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-glass)' }}>
                                                                        <div style={{ minWidth: 0 }}>
                                                                            <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{r.email}</div>
                                                                            <div style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, marginTop: '4px' }}>{r.empId || 'NO_ID'} | {r.department || 'NO_DEPT'}</div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '4px' }}>PENDING</div>
                                                                            <button className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.6rem', fontWeight: 900, border: '1px solid var(--primary-blue)', color: 'var(--primary-blue)' }} onClick={() => sendSingleConfirmation({ ...r, userName: r.name, isReminder: true })}>
                                                                                <Send size={10} /> REMIND
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </>
                                    </div>
                                )}
                            </div>
                        ))}
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
                                {isBulkProcessing ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Create Accounts</>}
                            </button>
                        </div>
                    </div>
                    <textarea className="glass-panel" style={{ width: '100%', minHeight: '150px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', color: 'white' }} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Format: Name, Department, Email (Password will be set to Email)" />

                    <div style={{ marginTop: '4rem' }}>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <Search size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3.5rem' }} placeholder="Search Faculty..." value={facultySearch} onChange={e => setFacultySearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="table-responsive-premium">
                            <table className="data-table-premium">
                                <thead><tr><th>Member</th><th>Dept</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                                <tbody>
                                    {faculty.filter(f => f.name?.toLowerCase().includes(facultySearch.toLowerCase()) || f.email?.toLowerCase().includes(facultySearch.toLowerCase())).map(f => (
                                        <tr key={f._id || f.id} style={{ opacity: f.status === 'disabled' ? 0.4 : 1 }}>
                                            <td>{f.name}<div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.email}</div></td>
                                            <td>{f.department || 'N/A'}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ padding: '0.5rem', color: f.status === 'disabled' ? '#22c55e' : '#f59e0b', border: '1px solid currentColor' }}
                                                        onClick={() => toggleFacultyStatus(f._id || f.id, f.status)}
                                                    >
                                                        {f.status === 'disabled' ? <><Unlock size={16} /> Enable</> : <><Lock size={16} /> Disable</>}
                                                    </button>
                                                    <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444', border: '1px solid currentColor' }} onClick={() => setAlertConfig({
                                                        title: 'DELETE FACULTY',
                                                        type: 'danger',
                                                        text: `Are you sure you want to permanently delete this faculty account?`,
                                                        onConfirm: () => deleteFacultyUser(f._id || f.id)
                                                    })}>
                                                        <Trash2 size={16} /> Delete
                                                    </button>
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

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(30px)' }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1rem, 5vw, 3rem)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'clamp(1.5rem, 5vw, 3rem)', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10, padding: '1rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{editingFYId ? 'Update Session Settings' : 'Initialize New Cycle'}</h2>
                            <button className="btn btn-ghost" onClick={() => setShowFYModal(false)}><X /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>CYCLE IDENTIFIER</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '1rem', fontWeight: 700 }} value={newFY.name} onChange={e => setNewFY({ ...newFY, name: e.target.value })} placeholder="e.g. 2026-2027" />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>SUBMISSION DEADLINE</label>
                                <input type="date" className="glass-panel" style={{ width: '100%', padding: '1rem', fontWeight: 700 }} value={newFY.lastSubmissionDate} onChange={e => setNewFY({ ...newFY, lastSubmissionDate: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '3rem', padding: 'clamp(1rem, 4vw, 2.5rem)', background: 'rgba(255,255,255,0.02)', border: '2px solid var(--border-glass)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}><ShieldCheck size={22} color="var(--primary)" /> Coverage Plans & Dependencies</h3>

                            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--primary-blue)', background: 'var(--bg-surface)' }}>
                                <h4 style={{ fontWeight: 900, marginBottom: '1rem', color: 'var(--primary)' }}>{tempPolicy.id ? 'Edit Draft Plan' : 'Draft New Plan'}</h4>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    <input className="glass-panel" style={{ flex: 1, minWidth: '130px', padding: '1rem' }} placeholder="Plan Label (e.g. 5 Lakhs)" value={tempPolicy.label} onChange={e => setTempPolicy({ ...tempPolicy, label: e.target.value })} />
                                    <input type="number" className="glass-panel" style={{ width: '180px', padding: '1rem' }} placeholder="Base Premium" value={tempPolicy.premium} onChange={e => setTempPolicy({ ...tempPolicy, premium: e.target.value })} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', opacity: tempPolicy.allowSpouse ? 1 : 0.5, transition: 'opacity 0.3s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tempPolicy.allowSpouse ? '1.5rem' : 0, alignItems: 'center', transition: 'margin 0.3s' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>SPOUSE / PARTNER</span>
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowSpouse ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowSpouse ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '8px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowSpouse: !tempPolicy.allowSpouse })}>
                                                {tempPolicy.allowSpouse ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                        {tempPolicy.allowSpouse && (
                                            <div className="f-group animate-pop">
                                                <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>SPOUSE PREMIUM</label>
                                                <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={tempPolicy.spousePremium} onChange={e => { const val = e.target.value; setTempPolicy({ ...tempPolicy, spousePremium: val, childPremium: val }); }} disabled={!tempPolicy.allowSpouse} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', opacity: tempPolicy.allowChildren ? 1 : 0.5, transition: 'opacity 0.3s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tempPolicy.allowChildren ? '1.5rem' : 0, alignItems: 'center', transition: 'margin 0.3s' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>DEPENDENT CHILDREN</span>
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowChildren ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowChildren ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '8px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowChildren: !tempPolicy.allowChildren })}>
                                                {tempPolicy.allowChildren ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                        {tempPolicy.allowChildren && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }} className="animate-pop">
                                                <div className="f-group">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>LIMIT</label>
                                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={tempPolicy.maxChildren} onChange={e => setTempPolicy({ ...tempPolicy, maxChildren: Number(e.target.value) })} disabled={!tempPolicy.allowChildren} />
                                                </div>
                                                <div className="f-group">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>PREMIUM</label>
                                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={tempPolicy.childPremium} onChange={e => { const val = e.target.value; setTempPolicy({ ...tempPolicy, childPremium: val, spousePremium: val }); }} disabled={!tempPolicy.allowChildren} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.02)', opacity: tempPolicy.allowParents ? 1 : 0.5, transition: 'opacity 0.3s' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tempPolicy.allowParents ? '1.5rem' : 0, alignItems: 'center', transition: 'margin 0.3s' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>DEPENDENT PARENTS</span>
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowParents ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowParents ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '8px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowParents: !tempPolicy.allowParents })}>
                                                {tempPolicy.allowParents ? 'ENABLED' : 'DISABLED'}
                                            </button>
                                        </div>
                                        {tempPolicy.allowParents && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1rem' }} className="animate-pop">
                                                <div className="f-group">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>LIMIT</label>
                                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={tempPolicy.maxParents} onChange={e => setTempPolicy({ ...tempPolicy, maxParents: Number(e.target.value) })} disabled={!tempPolicy.allowParents} />
                                                </div>
                                                <div className="f-group">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 900, opacity: 0.6 }}>PREMIUM</label>
                                                    <input type="number" className="glass-panel" style={{ width: '100%', padding: '0.8rem', fontWeight: 700 }} value={tempPolicy.parentPremium} onChange={e => setTempPolicy({ ...tempPolicy, parentPremium: e.target.value })} disabled={!tempPolicy.allowParents} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', fontWeight: 900, letterSpacing: '1px' }} onClick={addPolicyToFY}>
                                    {tempPolicy.id ? '✓ UPDATE PLAN' : '+ COMMIT PLAN'}
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                {newFY.policies.map(p => (
                                    <div key={p.id} className="glass-panel" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                                        <div>
                                            <div style={{ fontWeight: 900, color: 'var(--primary)' }}>{p.label}</div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>₹{p.premium?.toLocaleString()} Base</div>
                                            <div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: '8px' }}>
                                                {p.allowSpouse ? '| Spouse ' : ''} {p.allowChildren ? `| Child (x${p.maxChildren}) ` : ''} {p.allowParents ? `| Parents (x${p.maxParents})` : ''}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button className="btn btn-ghost" style={{ padding: '0.5rem', color: 'var(--primary-blue)' }} onClick={() => editPolicy(p.id)}><Edit size={18} /></button>
                                            <button className="btn btn-ghost" style={{ padding: '0.5rem', color: '#ef4444' }} onClick={() => removePolicy(p.id)}><X size={18} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '4rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, minWidth: '150px', padding: '1.2rem', fontWeight: 900 }} onClick={() => setShowFYModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ flex: 2, minWidth: '200px', padding: '1.2rem', fontWeight: 900 }} onClick={saveFY} disabled={isSavingFY}>
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
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setSelectedUserToReset(null)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 2 }} onClick={async () => {
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
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                    <div className="glass-panel animate-pop" style={{ width: '90%', maxWidth: '500px', padding: '3.5rem', textAlign: 'center', border: '2px solid var(--border-glass)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                            <Mail size={40} />
                        </div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>BATCH CONFIRMATION</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: '3rem', lineHeight: 1.6 }}>You are about to dispatch automated enrollment receipts to all selected participants. This action cannot be undone.</p>

                        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, padding: '1.2rem', fontWeight: 900 }} onClick={() => setShowMailModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ flex: 2, padding: '1.2rem', fontWeight: 900, boxShadow: '0 10px 20px -5px var(--primary-glow)' }} onClick={dispatchEmails} disabled={isMailing}>
                                {isMailing ? <><Loader2 className="animate-spin" size={18} /> DISPATCHING...</> : <><Send size={18} /> START DISPATCH</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplateModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(15px)' }}>
                    <div className="glass-panel animate-pop" style={{ width: '95%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: 'clamp(1rem, 4vw, 3rem)', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '12px' }}><Mail /> Email Center: {selectedFyForMail?.name}</h2>
                            <button className="btn btn-ghost" onClick={() => setShowTemplateModal(false)}><X /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                                <h3 style={{ fontWeight: 900, marginBottom: '1rem', color: 'var(--primary)' }}>Dispatch Existing Template</h3>
                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <select className="glass-panel" style={{ flex: 1, padding: '1rem', fontWeight: 700 }} value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                                        <option value="">-- Choose a Saved Template --</option>
                                        {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                    </select>
                                    <button className="btn btn-primary" onClick={dispatchCustomMails} disabled={isMailing || !selectedTemplateId}>
                                        {isMailing ? <Loader2 className="animate-spin" /> : 'SEND TO COHORT'}
                                    </button>
                                </div>
                                {templates.map(t => (
                                    <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-glass)' }}>
                                        <div style={{ fontWeight: 700 }}>{t.name} <span style={{ opacity: 0.5, fontSize: '0.8rem', marginLeft: '10px' }}>{t.subject}</span></div>
                                        <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '0.2rem 0.5rem' }} onClick={() => deleteCustomTemplate(t._id)}><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>

                            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
                                <h3 style={{ fontWeight: 900, marginBottom: '1rem' }}>Create New Template</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Variables available: <code>{`{{userName}}`}</code>, <code>{`{{fyName}}`}</code>, <code>{`{{email}}`}</code>, <code>{`{{coverageId}}`}</code></p>

                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem' }} placeholder="Template Name (e.g. Reject Notice)" value={newTemplate.name} onChange={e => setNewTemplate(n => ({ ...n, name: e.target.value }))} />
                                <input className="glass-panel" style={{ width: '100%', padding: '0.8rem', marginBottom: '1rem' }} placeholder="Email Subject" value={newTemplate.subject} onChange={e => setNewTemplate(n => ({ ...n, subject: e.target.value }))} />
                                <textarea className="glass-panel" style={{ width: '100%', padding: '0.8rem', minHeight: '150px', marginBottom: '1rem', fontFamily: 'monospace', fontSize: '0.85rem' }} placeholder="<p>Hello {{userName}}, your coverage {{coverageId}}...</p>" value={newTemplate.html} onChange={e => setNewTemplate(n => ({ ...n, html: e.target.value }))} />

                                <button className="btn btn-ghost" style={{ width: '100%', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={saveCustomTemplate}>Save Template</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isProcessing && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 className="animate-spin" size={60} color="var(--primary)" />
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;


