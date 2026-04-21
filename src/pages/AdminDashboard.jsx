import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../api';
import DefaultRoleAvatar from '../components/DefaultRoleAvatar';
import { ShieldCheck, Plus, X, Edit, Mail, Info, Send, Save, UserMinus, Key, ShieldAlert, CheckCircle, Clock, Heart, User, Phone, Briefcase, BarChart3, Activity, ArrowRight, Lock, Unlock, Search, Trash2, Users, Download, FileText, Settings, Loader2, AlertTriangle, Megaphone } from 'lucide-react';

const AdminDashboard = () => {
    const { activeFY, activeTab, setActiveTab, isDemoMode, DEMO_FACULTY, socket, departments, setDepartments } = useApp();
    const [newDeptName, setNewDeptName] = useState('');
    const [years, setYears] = useState([]);
    const [userSubmissions, setUserSubmissions] = useState({});
    const [mailingProgress, setMailingProgress] = useState({ current: 0, total: 0, active: false, message: '' });
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
    const [mailDropdownAnchor, setMailDropdownAnchor] = useState(null);

    const systemTemplates = [
        { id: 'remind-early', name: 'Early Bird Alert', subject: '[ACTION] Enrollment Open: FY {{fyName}}', html: '<h2>Enrollment is Live!</h2><p>Dear {{userName}}, the portal is now open for FY {{fyName}}. Please log in to secure your coverage early.</p>' },
        { id: 'remind-urgent', name: 'Urgent Deadline (48h)', subject: '[URGENT] 48 Hours Left: FY {{fyName}}', html: '<h2>Missing Enrollment!</h2><p>Dear {{userName}}, only 48 hours remain to enroll for FY {{fyName}}. Failure to act will result in loss of coverage.</p>' },
        { id: 'policy-update', name: 'Policy Update Notice', subject: 'Important: Policy Updates for FY {{fyName}}', html: '<h2>Updates to your Policy</h2><p>Dear {{userName}}, we have updated the coverage options for FY {{fyName}}. Please review them in the portal.</p>' }
    ];
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const [quickResetEmail, setQuickResetEmail] = useState('');

    const [editingFYId, setEditingFYId] = useState(null);
    const [facultySearch, setFacultySearch] = useState('');
    const [unregSearch, setUnregSearch] = useState('');
    const [unregDeptFilter, setUnregDeptFilter] = useState('');
    const [mailFilters, setMailFilters] = useState({
        fyId: activeFY?._id || '',
        audience: 'all',
        excludeDisabled: true
    });
    const [mailDraft, setMailDraft] = useState({ subject: '', html: '', name: '' });

    useEffect(() => {
        if (!selectedTemplateId) {
            setMailDraft({ subject: '', html: '', name: '' });
            return;
        }
        const t = systemTemplates.find(st => st.id === selectedTemplateId) || templates.find(ut => ut._id === selectedTemplateId);
        if (t) {
            setMailDraft({ subject: t.subject || '', html: t.html || '', name: t.name || '' });
        }
    }, [selectedTemplateId, templates]);

    const getTargetAudience = () => {
        let list = [...faculty];
        if (mailFilters.excludeDisabled) {
            list = list.filter(f => f.status !== 'disabled');
        }

        if (mailFilters.fyId) {
            const fySubmissions = (submissions || []).filter(s => s.fyId === mailFilters.fyId);
            if (mailFilters.audience === 'enrolled') {
                list = list.filter(f => fySubmissions.some(s => s.email === f.email));
            } else if (mailFilters.audience === 'pending') {
                list = list.filter(f => !fySubmissions.some(s => s.email === f.email));
            }
        }

        return list;
    };
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
            console.error("Error fetching data:", err);
        }
    }, []);

    const addDepartment = async () => {
        if (!newDeptName.trim()) return;
        try {
            const res = await api.post('/departments', { name: newDeptName.trim() });
            setDepartments([...departments, res.data]);
            setNewDeptName('');
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.msg || "Failed to add department");
        }
    };

    const deleteDepartment = async (id) => {
        try {
            await api.delete(`/departments/${id}`);
            setDepartments(departments.filter(d => d._id !== id));
        } catch (err) {
            console.error(err);
            alert("Failed to delete department");
        }
    };

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
            socket.on('MAIL_PROGRESS', (data) => {
                setMailingProgress({ ...data, active: true });
            });
            return () => {
                socket.off('CLAIM_UPDATED', fetchData);
                socket.off('USER_UPDATED', fetchData);
                socket.off('FY_UPDATED', fetchData);
                socket.off('MAIL_PROGRESS');
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
     const dispatchCustomMails = async (templateIdOverride) => {
        const tId = templateIdOverride || selectedTemplateId;
        if (!tId) return alert('Please select a template to send.');
        if (!selectedFyForMail) return;
        setIsMailing(true);
        setMailingProgress({ current: 0, total: 10, active: true, message: 'Preparing custom batch dispatches...' }); // Approximate start
        try {
            const res = await api.post('/mail/dispatch-custom', {
                fyId: selectedFyForMail._id || selectedFyForMail.id,
                templateId: tId
            });
            setShowTemplateModal(false);
            setMailDropdownAnchor(null);
            // Don't set alertConfig immediately if progress bar is active and handles completion
        } catch (err) {
            setMailingProgress(prev => ({ ...prev, active: false }));
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
                // Skip CSV header rows
                return !(lower.includes('name') && lower.includes('email'));
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
        if (!confirm("Confirm Batch Deletion? All personnel listed below will be purged from the registry.")) return;
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        const emails = rows.map(row => {
            const parts = row.split(",").map(s => s.trim());
            // Email is usually the last part in Name,Email or Name,Dept,Email
            return parts.length > 2 ? parts[2] : parts[1];
        }).filter(e => e && e.includes("@"));
        try {
            await api.post('/users/bulk-delete', { emails });
            alert("Purge complete."); setBulkData(""); fetchData();
        } catch (err) { console.error(err); }
        finally { setIsProcessing(false); }
    };

    const processBulkStatus = async (statusValue) => {
        if (!confirm(`Confirm Batch Status Update? All listed personnel will be set to ${statusValue}.`)) return;
        setIsProcessing(true);
        const rows = bulkData.split("\n").filter(r => r.includes(","));
        const emails = rows.map(row => {
            const parts = row.split(",").map(s => s.trim());
            return parts.length > 2 ? parts[2] : parts[1];
        }).filter(e => e && e.includes("@"));
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
        
        const filteredSubs = submissions
            .filter(s => !s.archived && s.fyId === targetFyId)
            .sort((a, b) => (a.department || '').localeCompare(b.department || ''));

        // Columns: Department, Employee ID, Name, Relation, Gender, DOB, Coverage, Total Premium
        let headers = "Department,Employee ID,Member Name,Relation,Gender,DOB,Coverage,Total Premium\n";

        let csvData = filteredSubs.map(s => {
            // Main row (Faculty)
            let rows = [`"${s.department || ''}","${s.empId || ''}","${s.userName || ''}","Self","${s.gender || ''}","${s.doj || ''}","${s.coverageId || ''}","${s.premium || 0}"`];

            // Dependents
            if (s.dependents && s.dependents.length > 0) {
                s.dependents.forEach(d => {
                    const rel = d.type === 'parent' ? (d.relation || 'Parent') : d.type;
                    rows.push(`"${s.department || ''}","","${d.name || ''}","${rel || ''}","${d.gender || ''}","${d.dob || ''}","",""`);
                });
            }
            return rows.join("\n");
        }).join("\n");

        const blob = new Blob([headers + csvData], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Enrollment_${targetFyName}_Stacked.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const sendSingleConfirmation = async (submission) => {
        try {
            if (submission.isReminder) {
                // For un-enrolled staff reminders
                const activeFYId = activeFY?._id || activeFY?.id;
                if (!activeFYId) return alert("Select an active cycle first.");
                await api.post('/mail/dispatch-reminder', { 
                    userId: submission._id || submission.id,
                    fyId: activeFYId 
                });
                setAlertConfig({ title: 'REMINDER SENT', text: `Enrollment reminder dispatched to ${submission.email}.` });
            } else {
                // For existing enrollment confirmations
                await api.post('/mail/dispatch-confirmations', { claimIds: [submission._id || submission.id] });
                setAlertConfig({ title: 'Email Sent', text: `Confirmation email dispatched to ${submission.email}.` });
            }
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'Email Dispatch Failed', text: 'The system could not send the email. Ensure SMTP or Resend API credentials are correctly configured in the .env file.' });
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
        try {
            await api.delete(`/users/${id}`);
            fetchData();
            setAlertConfig({ title: 'USER REMOVED', text: 'The faculty account has been permanently deleted.' });
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'ERROR', type: 'danger', text: err.response?.data?.msg || "Failed to delete faculty user from database." });
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
        setMailingProgress({ current: 0, total: selectedIds.length, active: true, message: 'Initialising confirmation batch...' });
        try {
            await api.post('/mail/dispatch-confirmations', {
                fyId: activeFY?.id || activeFY?._id,
                claimIds: selectedIds
            });
            setShowMailModal(false);
            setSelectedIds([]); // Reset selection after dispatch
        } catch (err) {
            console.error(err);
            setAlertConfig({ title: 'Dispatch Alert', text: 'Email dispatch encountered an issue. Check server logs.', type: 'danger' });
            setMailingProgress(prev => ({ ...prev, active: false }));
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
             {activeTab === 'mail' && (
                <div className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 2.5rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ fontWeight: 900, fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <Megaphone color="var(--primary)" size={30} /> Email Center
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', marginTop: '5px' }}>Automated Campus-Wide Messaging Hub</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
                        {/* Filters Card */}
                        <div className="glass-panel" style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Settings size={18} /> Select Recipients
                            </h3>

                            <div className="f-group-premium" style={{ marginBottom: '1.5rem' }}>
                                <label>Target Session cycle</label>
                                <select className="glass-panel" style={{ width: '100%', padding: '1rem' }} value={mailFilters.fyId} onChange={e => setMailFilters({ ...mailFilters, fyId: e.target.value })}>
                                    <option value="">Global (All Records)</option>
                                    {years.map(y => <option key={y._id} value={y._id}>FY {y.name} {y.enabled ? '(Active)' : ''}</option>)}
                                </select>
                            </div>

                            <div className="f-group-premium" style={{ marginBottom: '1.5rem' }}>
                                <label>Enrollment Status</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                    {['all', 'enrolled', 'pending'].map(opt => (
                                        <button 
                                            key={opt}
                                            className="btn btn-ghost" 
                                            style={{ 
                                                fontSize: '0.7rem', 
                                                fontWeight: 900, 
                                                background: mailFilters.audience === opt ? 'var(--primary)' : 'transparent',
                                                color: mailFilters.audience === opt ? 'white' : 'inherit',
                                                border: mailFilters.audience === opt ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
                                            }}
                                            onClick={() => setMailFilters({ ...mailFilters, audience: opt })}
                                        >
                                            {opt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '10px' }}>
                                <input type="checkbox" checked={mailFilters.excludeDisabled} onChange={e => setMailFilters({ ...mailFilters, excludeDisabled: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                <span style={{ fontSize: '0.85rem', fontWeight: 900 }}>Exclude Disabled Accounts</span>
                            </label>

                            <div style={{ marginTop: '2.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>TARGET AUDIENCE ({getTargetAudience().length})</div>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>ACTIVE PREVIEW</div>
                                </div>
                                <div className="glass-panel" style={{ maxHeight: '350px', overflowY: 'auto', padding: '0.5rem', background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--border-glass)' }}>
                                    {getTargetAudience().length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4, fontSize: '0.8rem', fontWeight: 700 }}>
                                            No members match these filters
                                        </div>
                                    ) : (
                                        getTargetAudience().map(target => (
                                            <div key={target._id || target.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem', borderBottom: '1px solid rgba(0,0,0,0.05)', lastChild: { borderBottom: 'none' } }}>
                                                <DefaultRoleAvatar role={target.role} name={target.name} seed={target.email} size={32} />
                                                <div style={{ overflow: 'hidden' }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.name}</div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.email}</div>
                                                </div>
                                                <div style={{ marginLeft: 'auto' }}>
                                                    <span style={{ fontSize: '0.55rem', fontWeight: 900, padding: '2px 8px', borderRadius: '20px', background: target.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: target.status === 'active' ? '#22c55e' : '#ef4444' }}>
                                                        {target.status?.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Template Card */}
                        <div className="glass-panel" style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Mail size={18} /> Compose Email
                                </h3>
                            </div>

                            <div className="f-group-premium" style={{ marginBottom: '1.5rem' }}>
                                <label>Selection Template</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select className="glass-panel" style={{ flex: 1, padding: '1rem' }} value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
                                        <option value="">-- Start from Blank Draft --</option>
                                        <optgroup label="System Presets">
                                            {systemTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </optgroup>
                                        <optgroup label="Saved Presets">
                                            {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                                        </optgroup>
                                    </select>
                                    {selectedTemplateId && !systemTemplates.some(st => st.id === selectedTemplateId) && (
                                        <button className="btn btn-ghost" style={{ padding: '0 1rem', color: '#ef4444', border: '1px solid currentColor' }} onClick={() => {
                                            deleteCustomTemplate(selectedTemplateId);
                                            setSelectedTemplateId('');
                                            setMailDraft({ subject: '', html: '', name: '' });
                                        }}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="animate-pop" style={{ display: 'grid', gap: '1rem' }}>
                                <div className="f-group-premium">
                                    <label>Preset Draft Name (For Saving)</label>
                                    <input 
                                        type="text" 
                                        className="glass-panel" 
                                        style={{ width: '100%', padding: '1rem', fontWeight: 700 }} 
                                        value={mailDraft.name} 
                                        onChange={e => setMailDraft({ ...mailDraft, name: e.target.value })} 
                                        placeholder="e.g. Critical Update Preset"
                                    />
                                </div>
                                <div className="f-group-premium">
                                    <label>Email Subject</label>
                                    <input 
                                        type="text" 
                                        className="glass-panel" 
                                        style={{ width: '100%', padding: '1rem', fontWeight: 700 }} 
                                        value={mailDraft.subject} 
                                        onChange={e => setMailDraft({ ...mailDraft, subject: e.target.value })} 
                                        placeholder="e.g. Critical Update: {{fyName}} Cycle"
                                    />
                                </div>
                                <div className="f-group-premium">
                                    <label>Email Content (HTML Supported)</label>
                                    <textarea 
                                        className="glass-panel" 
                                        style={{ width: '100%', padding: '1rem', minHeight: '250px', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6 }} 
                                        value={mailDraft.html} 
                                        onChange={e => setMailDraft({ ...mailDraft, html: e.target.value })} 
                                        placeholder="<p>Hello {{userName}}...</p>"
                                    />
                                </div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, borderTop: '1px dashed var(--border-glass)', paddingTop: '1rem' }}>
                                    Available Fields: <code>{`{{userName}}`}</code>, <code>{`{{fyName}}`}</code>, <code>{`{{email}}`}</code>, <code>{`{{coverageId}}`}</code>
                                </div>
                            </div>

                            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                                {selectedTemplateId && (
                                    <button 
                                        className="btn btn-ghost" 
                                        style={{ flex: 1, color: 'var(--primary)', borderColor: 'var(--primary)' }}
                                        onClick={async () => {
                                            if (!mailDraft.subject || !mailDraft.html) return;
                                            await api.post('/mail/templates', {
                                                name: `${mailDraft.name} (Copy)`,
                                                subject: mailDraft.subject,
                                                html: mailDraft.html
                                            });
                                            await fetchData(); // Refresh templates from backend
                                            setAlertConfig({ title: 'PRESET SAVED', text: 'Draft has been added to your permanent presets.' });
                                        }}
                                    >
                                        <Save size={16} /> Save New Template
                                    </button>
                                )}
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 2, padding: '1rem', background: 'var(--primary)', boxShadow: '0 10px 30px -10px var(--primary-glow)' }}
                                    disabled={!mailDraft.html || getTargetAudience().length === 0 || isMailing}
                                    onClick={() => {
                                        setAlertConfig({
                                            title: 'INITIATE CAMPAIGN',
                                            type: 'primary',
                                            text: `You are about to send this customized email to ${getTargetAudience().length} members. Send now?`,
                                            onConfirm: async () => {
                                                const audienceCount = getTargetAudience().length;
                                                setIsMailing(true);
                                                setMailingProgress({ current: 0, total: audienceCount, active: true, message: 'Initiating institutional email campaign...' });
                                                try {
                                                    const res = await api.post('/mail/dispatch-custom', {
                                                        templateId: selectedTemplateId, // Still pass ID for reference if exists
                                                        subject: mailDraft.subject,
                                                        html: mailDraft.html,
                                                        userIds: getTargetAudience().map(f => f._id || f.id),
                                                        fyId: mailFilters.fyId
                                                    });
                                                } catch (err) {
                                                    setMailingProgress(prev => ({ ...prev, active: false }));
                                                    setAlertConfig({ title: 'DISPATCH FAILED', type: 'danger', text: err.response?.data?.msg || err.message || 'System failed to process batch mailing.' });
                                                } finally { setIsMailing(false); }
                                            }
                                        });
                                    }}
                                >
                                    {isMailing ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Send Emails</>}
                                </button>
                            </div>
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
                                <div className="stat-lab" style={{ fontSize: '10px', fontWeight: 900, color: '#2563eb', letterSpacing: '0.05em' }}>TOTAL STAFF</div>
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
                                <Plus size={16} /> Create New Cycle
                            </button>
                        </div>

                        {years.some(y => y.enabled) && (
                            <div className="glass-panel" style={{ marginBottom: '1.25rem', padding: '0.75rem 1.2rem', background: 'rgba(245,158,11,0.08)', fontWeight: 800, fontSize: '13px', color: '#f59e0b', border: '0.5px solid rgba(245,158,11,0.2)' }}>
                                <AlertTriangle size={15} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                An active cycle is authorized. Disable it before creating a new session.
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {years.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(y => {
                                const cycleId = y._id || y.id;
                                const count = submissions.filter(s => !s.archived && s.fyId === cycleId).length;
                                return (
                                    <div key={cycleId} className="glass-panel animate-pop item-hover" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', border: y.enabled ? '1px solid var(--primary)30' : 'var(--border)', opacity: y.enabled ? 1 : 0.8, background: y.enabled ? 'var(--bg-card)' : 'var(--bg-surface)', flexWrap: 'wrap' }}>
                                        {/* 1. Basic Info */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', minWidth: '220px' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)' }}>FY {y.name}</div>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.8rem', borderRadius: '8px', background: y.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)', color: y.enabled ? '#22c55e' : 'var(--text-muted)', border: '1px solid currentColor', fontWeight: 900, fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                                                {y.enabled ? 'ACTIVE' : 'CLOSED'}
                                            </div>
                                        </div>

                                        {/* 2. Stats (Row style) */}
                                        <div style={{ display: 'flex', gap: '2rem', flex: 1, minWidth: '300px', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>INITIALIZED</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{y.createdAt ? new Date(y.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>RECORDS</div>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: count > 0 ? '#10b981' : 'var(--text-main)' }}>{count}</div>
                                            </div>
                                            <div style={{ flex: 1, display: 'flex', gap: '1rem', borderLeft: '1px solid var(--border-glass)', paddingLeft: '1.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>KIDS</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{y.maxChildren}</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>PARENTS</div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{y.maxParents}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3. Actions Row */}
                                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ height: '40px', padding: '0 1rem', fontSize: '0.7rem', fontWeight: 900, color: count > 0 ? '#22c55e' : 'var(--text-muted)', border: '1px solid currentColor', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                onClick={() => exportCSV(cycleId, y.name)}
                                                disabled={count === 0}
                                            >
                                                <Download size={15} /> EXPORT
                                            </button>
                                            <button className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => openEdit(y)}><Edit size={16} /></button>
                                            <button className={`btn ${y.enabled ? 'btn-ghost' : 'btn-primary'}`} style={{ padding: '0 1rem', height: '40px', fontSize: '0.7rem', fontWeight: 900, border: '1px solid currentColor' }} onClick={() => toggleYear(y._id || y.id, y.enabled)}>
                                                {y.enabled ? 'DISABLE' : 'ENABLE'}
                                            </button>
                                            <button className="btn btn-ghost" style={{ width: '40px', height: '40px', padding: 0, color: '#ef4444', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
                                                setAlertConfig({ title: 'DELETE SESSION', type: 'danger', text: `Remove FY ${y.name}?`, onConfirm: () => deleteFY(y._id || y.id) });
                                            }}><Trash2 size={16} /></button>
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
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ padding: '8px 16px', background: 'var(--primary-glow)', borderRadius: '12px', border: '1px solid var(--primary)30' }}>
                                <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Total Cycles</div>
                                <div style={{ fontSize: '18px', fontWeight: 900 }}>{years.length}</div>
                            </div>
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
                                                {fy.enabled && <span style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', background: '#22c55e', color: 'white', fontWeight: 900, borderRadius: '12px' }}>ACTIVE</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 5vw, 2rem)', flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
                                        <div style={{ textAlign: window.innerWidth < 600 ? 'left' : 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)' }}>RECORDS</div>
                                            <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{fy.claims.length} SUBMISSIONS</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                            <button 
                                                className="btn btn-ghost" 
                                                style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)' }} 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setMailFilters({ fyId: fy._id || fy.id, audience: 'all', excludeDisabled: true });
                                                    setActiveTab('mail'); 
                                                }} 
                                                title="Compose emails for this cycle"
                                            >
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
                                    <div className="folder-content animate-slideDown" style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.04)', borderRadius: '0 0 16px 16px' }}>
                                        {/* Unified Filter Bar for Cycle */}
                                        <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                                <input 
                                                    className="glass-panel" 
                                                    style={{ width: '100%', padding: '0.7rem 1rem 0.7rem 2.5rem', fontSize: '0.85rem', fontWeight: 600 }} 
                                                    placeholder="Search personnel in this cycle..." 
                                                    value={unregSearch} 
                                                    onChange={e => setUnregSearch(e.target.value)} 
                                                />
                                            </div>
                                            <select 
                                                className="glass-panel" 
                                                style={{ padding: '0.7rem 1rem', fontSize: '0.85rem', fontWeight: 600, minWidth: '200px' }} 
                                                value={unregDeptFilter} 
                                                onChange={e => setUnregDeptFilter(e.target.value)}
                                            >
                                                <option value="">All Departments</option>
                                                {departments.map(d => (
                                                    <option key={d._id} value={d.name}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {(() => {
                                            const query = unregSearch.toLowerCase();
                                            const dept = unregDeptFilter;

                                            const enrolled = fy.claims.map(c => ({ 
                                                ...c, 
                                                _type: 'enrolled', 
                                                name: c.userName,
                                                _id: c._id || c.id 
                                            }));
                                            
                                            const pending = faculty.filter(f => 
                                                f.status !== 'disabled' && 
                                                !fy.claims.some(c => c.email === f.email)
                                            ).map(f => ({ 
                                                ...f, 
                                                _type: 'pending' 
                                            }));

                                            const combined = [...enrolled, ...pending].filter(m => 
                                                (m.name?.toLowerCase().includes(query) || m.email?.toLowerCase().includes(query) || m.empId?.toLowerCase().includes(query)) &&
                                                (!dept || m.department === dept)
                                            ).sort((a, b) => a.name.localeCompare(b.name));

                                            if (combined.length === 0) {
                                                return (
                                                    <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5, border: '2px dashed var(--border-glass)', borderRadius: '16px' }}>
                                                        <Users size={40} style={{ marginBottom: '1rem', display: 'block', margin: '0 auto' }} />
                                                        <div style={{ fontWeight: 900 }}>NO PERSONNEL MATCHING CRITERIA</div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="table-responsive-premium" style={{ border: 'none', background: 'transparent' }}>
                                                    <table className="data-table-premium">
                                                        <thead>
                                                            <tr>
                                                                <th>STAFF</th>
                                                                <th>ID</th>
                                                                <th>DEPARTMENT</th>
                                                                <th>STATUS</th>
                                                                <th style={{ textAlign: 'center' }}>PREMIUM</th>
                                                                <th style={{ textAlign: 'right' }}>ACTIONS</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {combined.map(m => (
                                                                <tr key={`${m._type}_${m._id || m.id}`} style={{ background: m._type === 'pending' ? 'rgba(245,158,11,0.01)' : 'transparent' }}>
                                                                    <td>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                            <DefaultRoleAvatar role="faculty" name={m.name} seed={m.email} size={36} />
                                                                            <div style={{ minWidth: 0 }}>
                                                                                <div style={{ fontWeight: 900, fontSize: '0.95rem' }}>{m.name}</div>
                                                                                <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900 }}>{m.email}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 900, letterSpacing: '0.5px' }}>{(m.empId && !m.empId.startsWith('PENDING-')) ? m.empId : ''}</div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{(m.gender && m.gender !== 'Male' && m.gender !== 'Not Specified') ? m.gender : ''}</div>
                                                                    </td>
                                                                    <td>
                                                                        <div style={{ fontWeight: 900, fontSize: '0.85rem' }}>{(m.department && m.department !== 'Awaiting Assignment') ? m.department : ''}</div>
                                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>{m._type === 'enrolled' ? m.designation : ''}</div>
                                                                    </td>
                                                                    <td>
                                                                        {m._type === 'enrolled' ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 900, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 10px', borderRadius: '12px', width: 'fit-content' }}>
                                                                                    <CheckCircle size={10} /> ENROLLED
                                                                                </div>
                                                                                <div style={{ fontSize: '0.75rem', fontWeight: 900 }}>{m.coverageId}</div>
                                                                            </div>
                                                                        ) : (
                                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 900, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 10px', borderRadius: '12px' }}>
                                                                                <Clock size={10} /> PENDING ACTION
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {m._type === 'enrolled' ? (
                                                                            <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{m.premium?.toLocaleString()}</div>
                                                                        ) : (
                                                                            <div style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5 }}>Awaiting Enrollment</div>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                                            {m._type === 'enrolled' ? (
                                                                                <>
                                                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', color: 'var(--primary)', border: '1px solid var(--primary)30' }} onClick={() => sendSingleConfirmation(m)} title="Resend confirmation">
                                                                                        <Mail size={14} />
                                                                                    </button>
                                                                                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.8rem', color: '#ef4444', border: '1px solid #ef444430' }} onClick={() => setAlertConfig({
                                                                                        title: 'DELETE ENROLLMENT',
                                                                                        type: 'danger',
                                                                                        text: `Permanently remove enrollment data for ${m.name}?`,
                                                                                        onConfirm: () => deleteRecord(m._id)
                                                                                    })} title="Delete enrollment record">
                                                                                        <Trash2 size={14} />
                                                                                    </button>
                                                                                </>
                                                                            ) : (
                                                                                <button 
                                                                                    className="btn btn-ghost remind-btn" 
                                                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 900, border: '1px solid var(--primary-blue)', color: 'var(--primary-blue)', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }} 
                                                                                    onClick={() => sendSingleConfirmation({ ...m, userName: m.name, isReminder: true })}
                                                                                >
                                                                                    <Send size={12} /> REMIND
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })()}
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
                    <textarea className="glass-panel" style={{ width: '100%', minHeight: '150px', padding: '1.5rem', background: 'rgba(0,0,0,0.2)', color: 'white' }} value={bulkData} onChange={e => setBulkData(e.target.value)} placeholder="Format: Name, Email (Password will be set to Email)" />

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
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <DefaultRoleAvatar role={f.role} name={f.name} seed={f.email} size={36} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{f.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{f.department && f.department !== 'Awaiting Assignment' ? f.department : ''}</td>
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
                                                        title: 'Delete Staff Account',
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
            {activeTab === 'departments' && (
                <div className="glass-panel" style={{ padding: 'clamp(1rem, 3vw, 1.6rem)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                        <div>
                            <h2 style={{ fontWeight: 900, fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                                <Settings size={22} color="var(--primary)" /> Department Management
                            </h2>
                            <p style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.78rem', marginTop: '4px', marginBottom: 0 }}>Configure authorized departments for faculty enrollment</p>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                            {departments.length} configured
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0 }}>Add Department</h3>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>Shorter card layout for faster scanning</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <input 
                                className="glass-panel" 
                                style={{ flex: '1 1 260px', padding: '0.85rem 1rem', fontWeight: 700, minWidth: '220px' }} 
                                placeholder="e.g. Computer Science & Engineering" 
                                value={newDeptName} 
                                onChange={e => setNewDeptName(e.target.value)} 
                                onKeyPress={e => e.key === 'Enter' && addDepartment()}
                            />
                            <button className="btn btn-primary" style={{ padding: '0 1.25rem', minHeight: '44px' }} onClick={addDepartment}>
                                <Plus size={18} /> ADD
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {departments.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', opacity: 0.5, fontWeight: 900, border: '2px dashed var(--border-glass)' }}>
                                No Departments Configured
                            </div>
                        ) : (
                            departments.map(dept => (
                                <div key={dept._id} className="glass-panel" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                                        <div style={{ width: '34px', height: '34px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                            <Briefcase size={17} />
                                        </div>
                                        <div style={{ fontWeight: 900, fontSize: '0.92rem', lineHeight: 1.25, wordBreak: 'break-word' }}>{dept.name}</div>
                                    </div>
                                    <button 
                                        className="btn btn-ghost" 
                                        style={{ color: '#ef4444', border: '1px solid #ef444430', padding: '0.5rem', minWidth: '40px', height: '40px', flexShrink: 0 }} 
                                        onClick={() => setAlertConfig({
                                            title: 'Delete Department',
                                            type: 'danger',
                                            text: `Are you sure you want to delete ${dept.name}? This will not affect existing claims but new faculty won't be able to select it.`,
                                            onConfirm: () => deleteDepartment(dept._id)
                                        })}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showFYModal && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(30px)' }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '1200px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        {/* Fixed Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 3rem', background: 'var(--bg-card)', zIndex: 10, borderBottom: '1px solid var(--border-glass)' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>{editingFYId ? 'Update Session Settings' : 'Initialize New Cycle'}</h2>
                            <button className="btn btn-ghost" onClick={() => setShowFYModal(false)}><X /></button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="modal-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: 'clamp(1rem, 5vw, 3rem)' }}>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>Cycle Identifier</label>
                                <input className="glass-panel" style={{ width: '100%', padding: '1rem', fontWeight: 700 }} value={newFY.name} onChange={e => setNewFY({ ...newFY, name: e.target.value })} placeholder="e.g. 2026-2027" />
                            </div>
                            <div className="f-group">
                                <label style={{ fontSize: '0.75rem', fontWeight: 900, marginBottom: '0.8rem', display: 'block' }}>Submission Deadline</label>
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
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowSpouse ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowSpouse ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '12px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowSpouse: !tempPolicy.allowSpouse })}>
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
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowChildren ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowChildren ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '12px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowChildren: !tempPolicy.allowChildren })}>
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
                                            <button className="btn btn-ghost" style={{ padding: '0 0.8rem', height: '32px', fontSize: '0.65rem', fontWeight: 900, background: tempPolicy.allowParents ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: tempPolicy.allowParents ? '#22c55e' : '#ef4444', border: '1px solid currentColor', borderRadius: '12px' }} onClick={() => setTempPolicy({ ...tempPolicy, allowParents: !tempPolicy.allowParents })}>
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
                                    {tempPolicy.id ? '✓ UPDATE PLAN' : '+ ADD PLAN'}
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

                        </div> {/* End modal-scroll-area */}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', padding: '1.5rem 3rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border-glass)', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, maxWidth: '150px', padding: '1rem', fontWeight: 900 }} onClick={() => setShowFYModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ flex: 2, maxWidth: '300px', padding: '1rem', fontWeight: 900 }} onClick={saveFY} disabled={isSavingFY}>
                                {isSavingFY ? <Loader2 className="animate-spin" /> : 'Save Cycle Details'}
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
                        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-1px' }}>Batch Confirmation</h2>
                        <p style={{ color: 'var(--text-muted)', fontWeight: 700, marginBottom: '3rem', lineHeight: 1.6 }}>You are about to dispatch automated enrollment receipts to all selected participants. This action cannot be undone.</p>

                        <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-ghost" style={{ flex: 1, padding: '1.2rem', fontWeight: 900 }} onClick={() => setShowMailModal(false)}>CANCEL</button>
                            <button className="btn btn-primary" style={{ flex: 2, padding: '1.2rem', fontWeight: 900, boxShadow: '0 10px 20px -5px var(--primary-glow)' }} onClick={dispatchEmails} disabled={isMailing}>
                                {isMailing ? <><Loader2 className="animate-spin" size={18} /> Sending...</> : <><Send size={18} /> Send Emails</>}
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

            {mailingProgress.active && (
                <div className="overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 10001, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(20px)' }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', padding: '3rem', textAlign: 'center', border: '1px solid var(--primary)40' }}>
                        <div style={{ width: '64px', height: '64px', background: 'var(--primary-glow)', borderRadius: '16px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', border: '1px solid var(--primary)30' }}>
                            <Mail className={ mailingProgress.current < mailingProgress.total ? "animate-pulse" : "" } size={32} />
                        </div>
                        
                        <h2 style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                            {mailingProgress.current >= mailingProgress.total && mailingProgress.total > 0 ? 'DISPATCH COMPLETE' : 'SENDING NOTIFICATIONS'}
                        </h2>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '2.5rem' }}>{mailingProgress.message}</p>
                        
                        <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid var(--border-glass)' }}>
                            <div style={{ 
                                width: `${mailingProgress.total > 0 ? (mailingProgress.current / mailingProgress.total) * 100 : 0}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #6366f1 0%, #4338ca 100%)',
                                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                borderRadius: '6px'
                            }} />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-muted)' }}>
                                PROCESSED: <b style={{ color: 'var(--text-main)' }}>{mailingProgress.current} / {mailingProgress.total}</b>
                            </div>
                            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>
                                {mailingProgress.total > 0 ? Math.round((mailingProgress.current / mailingProgress.total) * 100) : 0}%
                            </div>
                        </div>

                        {mailingProgress.current >= mailingProgress.total && mailingProgress.total > 0 && (
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: '2.5rem', padding: '1.2rem', fontWeight: 900 }} onClick={() => setMailingProgress({ ...mailingProgress, active: false })}>
                                DISMISS REPORT
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div >
    );
};

export default AdminDashboard;

