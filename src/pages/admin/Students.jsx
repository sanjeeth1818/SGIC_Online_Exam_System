import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Users, Search, Mail, Phone, MapPin, CreditCard, Calendar, Edit2, Trash2, X, AlertCircle, CheckCircle, Clock, UserX, RefreshCw, BookOpen, Clock3, History, FileText, UserCheck, ChevronRight, Hash, Filter } from 'lucide-react';

const Students = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [deleteModal, setDeleteModal] = useState({ show: false, id: null, name: '' });

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        mobileNumber: '',
        nic: '',
        email: '',
        registeredDate: new Date().toISOString().split('T')[0],
        status: 'Pending To Exam',
        statusComment: '',
        examName: '',
        examDate: '',
        examTime: '',
        rescheduledExamName: '',
        rescheduledExamDate: '',
        rescheduledExamTime: '',
        statusHistory: ''
    });

    const VALIDATION_PATTERNS = {
        nic: /^(?:[0-9]{9}[vVxX]|[0-9]{12})$/,
        mobileNumber: /^[0-9]{10}$/
    };

    const validateForm = () => {
        const errors = [];
        if (!VALIDATION_PATTERNS.nic.test(formData.nic)) {
            errors.push("Invalid NIC format (9 digits + V/X or 12 digits)");
        }
        if (!VALIDATION_PATTERNS.mobileNumber.test(formData.mobileNumber)) {
            errors.push("Invalid Contact number (e.g., 0771234567 or 0112345678)");
        }
        if (!formData.email || formData.email.trim() === '') {
            errors.push("Email address is required");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.push("Invalid email format");
        }

        const today = new Date().toISOString().split('T')[0];
        if (formData.registeredDate > today) {
            errors.push("Registered date cannot be in the future");
        }

        // Local uniqueness check (NIC only)
        const duplicateNic = students.find(s => s.nic === formData.nic && s.id !== editingId);
        if (duplicateNic) errors.push("NIC already registered for " + duplicateNic.name);

        return errors;
    };

    const [statusData, setStatusData] = useState({
        id: null,
        name: '',
        status: '',
        statusComment: '',
        examName: '',
        examDate: '',
        examTime: '',
        rescheduledExamName: '',
        rescheduledExamDate: '',
        rescheduledExamTime: ''
    });

    const [historyData, setHistoryData] = useState({
        name: '',
        history: '',
        registeredDate: ''
    });

    // Calculated Stats
    const stats = useMemo(() => {
        return {
            total: students.length,
            Pending: students.filter(s => s.status === 'Pending To Exam').length,
            completed: students.filter(s => s.status === 'Took Exam').length,
            rescheduled: students.filter(s => s.status === 'Rescheduled').length,
            critical: students.filter(s => s.status === 'Blacklisted' || s.status === 'Absent').length
        };
    }, [students]);



    const HistoryModal = () => {
        let historyLines = historyData.history ? historyData.history.split('\n') : [];

        // Synthesize initial registration status if it's not already in the history
        const hasInitialStatus = historyLines.some(line =>
            line.toLowerCase().includes('initial registration') ||
            line.toLowerCase().includes('Pending To Exam')
        );

        if (!hasInitialStatus && historyData.registeredDate) {
            // Append to the end as the starting point (assuming latest-first order)
            historyLines.push(`[${historyData.registeredDate} 08:30:00] Initial Registration - Status set to Pending To Exam`);
        }

        const handleOverlayClick = (e) => {
            if (e.target === e.currentTarget) closeModal();
        };

        return (
            <div className="modal-overlay" onClick={handleOverlayClick}>
                <div className="modal-content" style={{ maxWidth: '600px' }}>
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '10px' }}>
                                <History size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Activity Timeline</h3>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>{historyData.name}</p>
                            </div>
                        </div>
                        <button onClick={closeModal} style={{ color: 'var(--text-tertiary)', padding: '0.5rem', borderRadius: '50%' }} className="table-row-hover">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        {historyLines.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-tertiary)' }}>
                                <div style={{ width: '80px', height: '80px', background: 'var(--bg-app)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <FileText size={40} style={{ opacity: 0.2 }} />
                                </div>
                                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No history records</h4>
                                <p style={{ fontSize: '0.875rem' }}>This student hasn't had any status changes yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '7px', top: '5px', bottom: '5px', width: '2px', background: 'var(--border)' }}></div>
                                {historyLines.map((line, idx) => {
                                    const timestamp = line.match(/\[(.*?)\]/)?.[1] || '';
                                    const content = line.replace(/\[.*?\]/, '').trim();

                                    return (
                                        <div key={idx} style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: idx === 0 ? 'var(--primary)' : 'white', border: `3px solid ${idx === 0 ? 'var(--primary-light)' : 'var(--border)'}`, marginTop: '4px', boxShadow: '0 0 0 4px white' }}></div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{timestamp}</div>
                                                <div style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.6, background: idx === 0 ? 'var(--primary-light)' : 'var(--bg-app)', padding: '1rem', borderRadius: '14px', border: idx === 0 ? '1px solid rgba(30, 64, 175, 0.1)' : '1px solid var(--border)' }}>
                                                    {content}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button onClick={closeModal} className="btn-primary">Close View</button>
                    </div>
                </div>
            </div>
        );
    };

    const Toast = () => {
        if (!toast.show) return null;

        const bgColor = toast.type === 'success' ? 'var(--success-light)' : 'var(--error-light)';
        const textColor = toast.type === 'success' ? 'var(--success)' : 'var(--error)';
        const Icon = toast.type === 'success' ? CheckCircle : AlertCircle;

        return (
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                background: bgColor,
                color: textColor,
                padding: '1rem 1.5rem',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                zIndex: 1000,
                animation: 'slideInFromRight 0.3s ease-out forwards'
            }}>
                <Icon size={20} />
                <span style={{ fontWeight: 600 }}>{toast.message}</span>
            </div>
        );
    };

    const DeleteConfirmationModal = () => {
        if (!deleteModal.show) return null;

        const handleOverlayClick = (e) => {
            if (e.target === e.currentTarget) setDeleteModal({ show: false, id: null, name: '' });
        };

        return (
            <div className="modal-overlay" onClick={handleOverlayClick}>
                <div className="modal-content" style={{ maxWidth: '400px' }}>
                    <div className="modal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: 'var(--error-light)', color: 'var(--error)', borderRadius: '10px' }}>
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Confirm Deletion</h3>
                            </div>
                        </div>
                        <button onClick={() => setDeleteModal({ show: false, id: null, name: '' })} style={{ color: 'var(--text-tertiary)', padding: '0.5rem', borderRadius: '50%' }} className="table-row-hover">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                            Are you sure you want to delete <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{deleteModal.name}</span>?
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            onClick={() => setDeleteModal({ show: false, id: null, name: '' })}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => confirmDelete(deleteModal.id)}
                            className="btn-danger"
                            disabled={submitting}
                        >
                            {submitting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

    useEffect(() => {
        const isOpen = isModalOpen || isStatusModalOpen || isHistoryModalOpen || deleteModal.show;
        setIsAnyModalOpen(isOpen);

        if (isOpen) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }

        return () => {
            document.body.classList.remove('no-scroll');
        };
    }, [isModalOpen, isStatusModalOpen, isHistoryModalOpen, deleteModal.show]);

    useEffect(() => {
        fetchStudents();
    }, []);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
    };

    const fetchStudents = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const response = await fetch('/api/students');
            if (response.ok) {
                const data = await response.json();
                setStudents(data);
            } else {
                setMessage({ text: 'Failed to fetch students. Is backend running?', type: 'error' });
                showToast('Failed to fetch students', 'error');
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            setMessage({ text: 'Error connecting to the server.', type: 'error' });
            showToast('Error connecting to server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        let sanitizedValue = value;

        // Block numbers and special characters from Full Name
        if (name === 'name') {
            sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
        }

        // Block letters and symbols, and enforce max 10 digits for Contact Number
        if (name === 'mobileNumber') {
            sanitizedValue = value.replace(/\D/g, '').slice(0, 10);
        }

        setFormData(prev => {
            const newData = { ...prev, [name]: sanitizedValue };
            // Clear comment whenever the status is changed to ensure isolation
            if (name === 'status') {
                newData.statusComment = '';
            }
            return newData;
        });
    };

    const handleStatusInputChange = (e) => {
        const { name, value } = e.target;
        setStatusData(prev => {
            const newData = { ...prev, [name]: value };
            // Clear comment whenever the status is changed to ensure isolation
            if (name === 'status') {
                newData.statusComment = '';
            }
            return newData;
        });
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({
            name: '',
            address: '',
            mobileNumber: '',
            nic: '',
            email: '',
            registeredDate: new Date().toISOString().split('T')[0],
            status: 'Pending To Exam',
            statusComment: '',
            examName: '',
            examDate: '',
            examTime: '',
            rescheduledExamName: '',
            rescheduledExamDate: '',
            rescheduledExamTime: '',
            statusHistory: `[${new Date().toLocaleString()}] Initial Registration - Status set to Pending To Exam`
        });
        setMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (student) => {
        setEditingId(student.id);
        setFormData({
            name: student.name || '',
            address: student.address || '',
            mobileNumber: student.mobileNumber || '',
            nic: student.nic || '',
            email: student.email || '',
            registeredDate: student.registeredDate || new Date().toISOString().split('T')[0],
            status: student.status || 'Pending To Exam',
            statusComment: student.statusComment || '',
            examName: student.examName || '',
            examDate: student.examDate || '',
            examTime: student.examTime || '',
            rescheduledExamName: student.rescheduledExamName || '',
            rescheduledExamDate: student.rescheduledExamDate || '',
            rescheduledExamTime: student.rescheduledExamTime || '',
            statusHistory: student.statusHistory || ''
        });
        setMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const openStatusModal = (student) => {
        setStatusData({
            id: student.id,
            name: student.name,
            status: student.status || 'Pending To Exam',
            statusComment: student.statusComment || '',
            examName: student.examName || '',
            examDate: student.examDate || '',
            examTime: student.examTime || '',
            rescheduledExamName: student.rescheduledExamName || '',
            rescheduledExamDate: student.rescheduledExamDate || '',
            rescheduledExamTime: student.rescheduledExamTime || ''
        });
        setIsStatusModalOpen(true);
    };

    const openHistoryModal = (student) => {
        setHistoryData({
            name: student.name,
            history: student.statusHistory || '',
            registeredDate: student.registeredDate || ''
        });
        setIsHistoryModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsStatusModalOpen(false);
        setIsHistoryModalOpen(false);
        setDeleteModal({ show: false, id: null, name: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage({ text: '', type: '' });

        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            setMessage({ text: validationErrors[0], type: 'error' });
            setSubmitting(false);
            return;
        }

        const url = editingId
            ? `/api/students/${editingId}`
            : '/api/students';

        const method = editingId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const updatedStudent = await response.json();
                setStudents(prev => {
                    const exists = prev.find(s => s.id === updatedStudent.id);
                    if (exists) {
                        return prev.map(s => s.id === updatedStudent.id ? updatedStudent : s);
                    } else {
                        return [updatedStudent, ...prev];
                    }
                });
                showToast(`Student ${editingId ? 'updated' : 'registered'} successfully!`);
                fetchStudents(); // Background refresh
                closeModal();
            } else {
                const errorData = await response.json().catch(() => ({}));
                setMessage({
                    text: errorData.message || 'Failed to save student. Please check inputs.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setMessage({ text: 'Error connecting to the server.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusUpdate = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const response = await fetch(`/api/students/${statusData.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: statusData.status,
                    statusComment: statusData.statusComment,
                    examName: statusData.examName,
                    examDate: statusData.examDate,
                    examTime: statusData.examTime,
                    rescheduledExamName: statusData.rescheduledExamName,
                    rescheduledExamDate: statusData.rescheduledExamDate,
                    rescheduledExamTime: statusData.rescheduledExamTime
                }),
            });

            if (response.ok) {
                const updatedStudent = await response.json();
                setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
                showToast('Status updated successfully');
                fetchStudents(); // Background refresh
                closeModal();
            } else {
                const errorData = await response.json().catch(() => ({}));
                showToast(errorData.message || 'Failed to update status', 'error');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showToast('Error connecting to server', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (id, name) => {
        setDeleteModal({ show: true, id, name });
    };

    const confirmDelete = async (id) => {
        setSubmitting(true);
        try {
            const response = await fetch(`/api/students/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setStudents(prev => prev.filter(s => s.id !== id));
                showToast('Student deleted successfully');
                setDeleteModal({ show: false, id: null, name: '' });
            } else {
                const errorData = await response.json().catch(() => ({}));
                showToast(errorData.message || 'Failed to delete student', 'error');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            showToast('Error connecting to server', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            'Pending To Exam': { bg: 'var(--primary-light)', color: 'var(--primary)', icon: <Clock3 size={12} />, label: 'Pending' },
            'Allocated': { bg: 'rgba(139, 92, 246, 0.1)', color: '#7c3aed', icon: <Calendar size={12} />, label: 'Allocated' },
            'Took Exam': { bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', icon: <CheckCircle size={12} />, label: 'Completed' },
            'Absent': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', icon: <UserX size={12} />, label: 'Absent' },
            'Rescheduled': { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', icon: <RefreshCw size={12} />, label: 'Rescheduled' },
            'Blacklisted': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', icon: <AlertCircle size={12} />, label: 'Blacklisted' },
            'Have to Reschedule': { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', icon: <Clock size={12} />, label: 'Have to Reschedule' }
        };

        const current = styles[status] || styles['Pending To Exam'];

        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: current.bg,
                color: current.color,
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.675rem',
                fontWeight: 700,
                letterSpacing: '0.04em'
            }}>
                {current.icon}
                {current.label}
            </div>
        );
    };

    const isCriticalStatus = (status) => ['Absent', 'Blacklisted', 'Rescheduled'].includes(status);

    const filteredStudents = students.filter(student => {
        const matchesSearch =
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.nic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' ||
            (statusFilter === 'Critical' ? ['Blacklisted', 'Absent'].includes(student.status) : student.status === statusFilter);

        return matchesSearch && matchesStatus;
    }).sort((a, b) => b.id - a.id); // Sort descending to put newest at the top

    return (
        <>
            <div className="animate-fade-in" style={{ maxWidth: '1450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem' }}>

                {/* Dashboard Header */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Student Directory</h1>

                    </div>
                    <button
                        onClick={openAddModal}
                        style={{
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '0.875rem 1.75rem',
                            borderRadius: '16px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-md)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        <UserPlus size={20} />
                        Register Student
                    </button>
                </header>

                {/* Content Section */}
                <div
                    style={{
                        background: 'var(--bg-surface)',
                        borderRadius: '24px',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Search & Filter Bar */}
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
                                <Search size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Search students by name, NIC, or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem 0.875rem 3.25rem',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-app)',
                                        outline: 'none',
                                        fontSize: '0.9375rem',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = 'var(--primary)';
                                        e.target.style.background = 'white';
                                        e.target.style.boxShadow = '0 0 0 4px var(--primary-light)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = 'var(--border)';
                                        e.target.style.background = 'var(--bg-app)';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                            {(searchTerm || statusFilter !== 'All') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('All');
                                    }}
                                    style={{
                                        padding: '0.875rem 1.25rem',
                                        borderRadius: '14px',
                                        background: 'var(--bg-app)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.875rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'white'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    <X size={16} />
                                    Clear
                                </button>
                            )}
                            <div style={{ position: 'relative' }}>
                                <Filter size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        padding: '0.875rem 1rem 0.875rem 2.75rem',
                                        borderRadius: '14px',
                                        border: '1px solid var(--border)',
                                        background: 'white',
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        outline: 'none',
                                        appearance: 'none',
                                        minWidth: '160px'
                                    }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending To Exam">Pending</option>
                                    <option value="Allocated">Allocated</option>
                                    <option value="Took Exam">Completed</option>
                                    <option value="Rescheduled">Rescheduled</option>
                                    <option value="Absent">Absent</option>
                                    <option value="Blacklisted">Blacklisted</option>
                                    <option value="Have to Reschedule">Have to Reschedule</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div style={{ flex: 1, overflowX: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '6rem', textAlign: 'center' }}>
                                <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem' }}></div>
                                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Fetching data from server...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div style={{ padding: '8rem 2rem', textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', background: 'var(--bg-app)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    <Search size={40} style={{ opacity: 0.1 }} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No results found</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>Try adjusting your search filters or add a new record.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-app)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Profile</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NIC</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Examination Status</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registered Date</th>
                                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s ease' }} className="table-row-hover">
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ width: '44px', height: '44px', minWidth: '44px', flexShrink: 0, borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.125rem' }}>
                                                        {student.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem', lineHeight: '1.2' }}>{student.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{student.nic}</span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{student.email || '-'}</span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>{student.mobileNumber}</span>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    {getStatusBadge(student.status)}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', whiteSpace: 'nowrap' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                    <Calendar size={14} style={{ opacity: 0.6 }} /> {student.registeredDate}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button
                                                        onClick={() => openStatusModal(student)}
                                                        style={{ padding: '0.5rem', borderRadius: '10px', background: 'transparent', color: 'var(--success)', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        title="Change Status"
                                                    >
                                                        <UserCheck size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => openHistoryModal(student)}
                                                        style={{ padding: '0.5rem', borderRadius: '10px', background: 'transparent', color: 'var(--primary)', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        title="View Activity History"
                                                    >
                                                        <History size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(student)}
                                                        style={{ padding: '0.5rem', borderRadius: '10px', background: 'transparent', color: 'var(--warning)', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        title="Edit Student"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(student.id, student.name)}
                                                        style={{ padding: '0.5rem', borderRadius: '10px', background: 'transparent', color: 'var(--error)', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.1)'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                                        title="Delete Student"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div >

            {/* Render Component Modals */}
            {isHistoryModalOpen && <HistoryModal />}
            {
                isStatusModalOpen && (
                    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                        <div className="modal-content" style={{ maxWidth: '520px' }}>
                            <div className="modal-header">
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Update Conditions</h3>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>Modifying: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{statusData.name}</span></p>
                                </div>
                                <button onClick={closeModal} style={{ color: 'var(--text-tertiary)', padding: '0.5rem', borderRadius: '50%' }} className="table-row-hover"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleStatusUpdate}>
                                <div className="modal-body">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status Designation</label>
                                            <select
                                                name="status"
                                                value={statusData.status}
                                                onChange={handleStatusInputChange}
                                                style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontWeight: 600, fontSize: '0.9375rem' }}
                                            >
                                                <option value="Pending To Exam">Pending To Exam</option>
                                                <option value="Allocated">Allocated</option>
                                                <option value="Took Exam">Completed</option>
                                                <option value="Absent">Absent</option>
                                                <option value="Rescheduled">Rescheduled</option>
                                                <option value="Blacklisted">Blacklisted</option>
                                                <option value="Have to Reschedule">Have to Reschedule</option>
                                            </select>
                                        </div>


                                        {['Absent', 'Rescheduled', 'Blacklisted', 'Have to Reschedule'].includes(statusData.status) && (
                                            <div className="animate-fade-in">
                                                <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                    Administrative Log Entry / Rationale
                                                </label>
                                                <textarea
                                                    name="statusComment"
                                                    value={statusData.statusComment}
                                                    onChange={handleStatusInputChange}
                                                    placeholder="Provide details about this status update or modification..."
                                                    rows="3"
                                                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', resize: 'vertical', fontSize: '0.9375rem' }}
                                                ></textarea>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={closeModal} className="btn-secondary">Discard</button>
                                    <button type="submit" disabled={submitting} className="btn-primary">
                                        {submitting ? 'Processing...' : 'Commit Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {
                isModalOpen && (
                    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                        <div className="modal-content" style={{ maxWidth: '640px' }}>
                            <div className="modal-header" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {editingId ? <Edit2 size={24} /> : <UserPlus size={24} />}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{editingId ? 'Modify Credentials' : 'Enrollment Portal'}</h2>

                                    </div>
                                </div>
                                <button onClick={closeModal} style={{ color: 'var(--text-tertiary)', padding: '0.5rem', borderRadius: '50%' }} className="table-row-hover"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    {message.text && (
                                        <div className="animate-fade-in" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', borderRadius: '12px', background: message.type === 'success' ? 'var(--success-bg)' : 'var(--error-bg)', color: message.type === 'success' ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '0.9rem', border: `1px solid ${message.type === 'success' ? '#10b98120' : '#ef444420'}` }}>
                                            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            {message.text}
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Full Name *</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.9375rem' }}
                                                placeholder="Enter student's full name"
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Email Address *</label>
                                            <div style={{ position: 'relative' }}>
                                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    required
                                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.9375rem' }}
                                                    placeholder="contact@institute.lk"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Contact Number *</label>
                                            <div style={{ position: 'relative' }}>
                                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                                <input
                                                    type="text"
                                                    name="mobileNumber"
                                                    value={formData.mobileNumber}
                                                    onChange={handleInputChange}
                                                    required
                                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.9375rem' }}
                                                    placeholder="0XXXXXXXXX (10 digits)"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>National Identity *</label>
                                            <div style={{ position: 'relative' }}>
                                                <Hash size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                                <input
                                                    type="text"
                                                    name="nic"
                                                    value={formData.nic}
                                                    onChange={handleInputChange}
                                                    required
                                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.9375rem' }}
                                                    placeholder="NIC / Passport Number"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Registered Date *</label>
                                            <div style={{ position: 'relative' }}>
                                                <Calendar size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                                <input
                                                    type="date"
                                                    name="registeredDate"
                                                    value={formData.registeredDate}
                                                    onChange={handleInputChange}
                                                    required
                                                    max={new Date().toISOString().split('T')[0]}
                                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.9375rem' }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Permanent Residence</label>
                                            <div style={{ position: 'relative' }}>
                                                <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-tertiary)' }} />
                                                <textarea
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleInputChange}
                                                    rows="2"
                                                    style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', resize: 'vertical', fontSize: '0.9375rem', marginBottom: '1.5rem' }}
                                                    placeholder="House number, street, city..."
                                                ></textarea>
                                            </div>
                                        </div>

                                        {editingId && (
                                            <div>
                                                <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Status Designation</label>
                                                <select
                                                    name="status"
                                                    value={formData.status}
                                                    onChange={handleInputChange}
                                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontWeight: 600, fontSize: '0.9375rem' }}
                                                >
                                                    <option value="Pending To Exam">Pending To Exam</option>
                                                    <option value="Allocated">Allocated</option>
                                                    <option value="Took Exam">Completed</option>
                                                    <option value="Absent">Absent</option>
                                                    <option value="Rescheduled">Rescheduled</option>
                                                    <option value="Blacklisted">Blacklisted</option>
                                                    <option value="Have to Reschedule">Have to Reschedule</option>
                                                </select>
                                            </div>
                                        )}

                                        {editingId && ['Absent', 'Rescheduled', 'Blacklisted', 'Have to Reschedule'].includes(formData.status) && (
                                            <div style={{ gridColumn: '1 / -1' }}>
                                                <label style={{ display: 'block', marginBottom: '0.625rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Administrative Log / Status Reason</label>
                                                <div style={{ position: 'relative' }}>
                                                    <FileText size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', color: 'var(--text-tertiary)' }} />
                                                    <textarea
                                                        name="statusComment"
                                                        value={formData.statusComment}
                                                        onChange={handleInputChange}
                                                        rows="3"
                                                        style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', outline: 'none', resize: 'vertical', fontSize: '0.9375rem' }}
                                                        placeholder="Add a reason or note for the current status..."
                                                    ></textarea>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" onClick={closeModal} className="btn-secondary">Discard</button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn-primary"
                                        style={{ padding: '0.75rem 2.5rem' }}
                                    >
                                        {submitting ? 'Registering...' : (editingId ? 'Update Identity' : 'Add Student')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            <Toast />
            <DeleteConfirmationModal />
        </>
    );
};

export default Students;
