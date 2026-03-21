import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Search, Plus, Filter, Calendar, Clock, Copy, Edit2, Trash2, Lock,
    Play, XCircle, Eye, FileText, Check, Users, List, Settings,
    ArrowLeft, ArrowRight, Layers, Globe, Key, FilePlus, LayoutDashboard, Hash,
    AlertCircle
} from 'lucide-react';

const CreateTest = () => {
    const [view, setView] = useState('create'); // 'create' or 'manage'
    const [step, setStep] = useState(1);
    const [showDetailsModal, setShowDetailsModal] = useState(null);
    const [manageSearchTerm, setManageSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [editModalData, setEditModalData] = useState(null); // null = closed, otherwise test data object
    const [addTimeModal, setAddTimeModal] = useState(null); // { testId, studentIds: [], extraTime: 15, comment: '' }
    const [editCategories, setEditCategories] = useState([]);
    const [expandedCategory, setExpandedCategory] = useState(null); // To track which folder is open
    const [deleteConfirm, setDeleteConfirm] = useState(null); // null or test object to delete

    // Test Configuration State
    const [testData, setTestData] = useState({
        name: '',
        description: '',
        timeMode: 'full',
        timeValue: '60',
        timeUnit: 'mins',
        examMode: 'scroll',
        showResult: true,
        showAnswers: false,
        activateImmediately: true,
        selectionMode: 'random', // 'random' or 'manual'
        manualQuestionIds: []
    });

    const [allQuestions, setAllQuestions] = useState([]);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
    const [questionSearchTerm, setQuestionSearchTerm] = useState('');
    const [fetchingQuestions, setFetchingQuestions] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    // Student Scheduling State
    const [studentGroups, setStudentGroups] = useState([
        { id: Date.now(), studentIds: [], examDate: '' }
    ]);
    const [availableStudents, setAvailableStudents] = useState([]);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [fetchingStudents, setFetchingStudents] = useState(false);

    const [studentCodes, setStudentCodes] = useState([]);
    const [fetchingCodes, setFetchingCodes] = useState(false);

    const [notification, setNotification] = useState(null);
    const [errors, setErrors] = useState({});

    // Modal Refs for click-outside-to-close functionality
    const detailsModalRef = useRef(null);
    const editModalRef = useRef(null);

    // Click outside to close modals logic
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDetailsModal && detailsModalRef.current && !detailsModalRef.current.contains(event.target)) {
                // If there's a nested modal like addTimeModal, don't close if clicking inside it
                // and don't close if the click originated from inside the details modal but ended outside
                setShowDetailsModal(null);
            }
            if (editModalData && editModalRef.current && !editModalRef.current.contains(event.target)) {
                setEditModalData(null);
            }
        };

        if (showDetailsModal || editModalData) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDetailsModal, editModalData]);

    // Group questions by category name for manual selection
    const groupedQuestions = allQuestions.reduce((acc, q) => {
        let cat = 'Uncategorized';
        if (q.category) {
            cat = typeof q.category === 'string' ? q.category : q.category.name || 'Uncategorized';
        }
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(q);
        return acc;
    }, {});

    const toggleAllInCategory = (categoryName, questions) => {
        const catQuestionIds = questions.map(q => q.id);
        const allSelected = catQuestionIds.every(id => selectedQuestionIds.includes(id));

        if (allSelected) {
            // Deselect all in this category
            setSelectedQuestionIds(prev => prev.filter(id => !catQuestionIds.includes(id)));
        } else {
            // Select all in this category
            const newSelection = [...new Set([...selectedQuestionIds, ...catQuestionIds])];
            setSelectedQuestionIds(newSelection);
            if (errors.questions) setErrors({ ...errors, questions: '' });
        }
    };

    const formatDurationDetailed = (value, unit) => {
        let seconds = String(unit).startsWith('sec') ? value : value * 60;
        if (!seconds || seconds <= 0) return '0 min';
        
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        
        let parts = [];
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m} min`);
        if (s > 0 && h === 0) parts.push(`${s} sec`);
        
        return parts.join(' ') || '0 min';
    };

    const fetchData = async (isSilent = false) => {
        try {
            const [catRes, testRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/tests')
            ]);

            if (!catRes.ok || !testRes.ok) throw new Error('Failed to fetch data');

            const catData = await catRes.json();
            const testDataFromBackend = await testRes.json();

            let activeQCounts = {};
            if (view === 'create' && !isSilent) {
                try {
                    const qRes = await fetch('/api/questions');
                    if (qRes.ok) {
                        const allQ = await qRes.json();
                        const activeQ = allQ.filter(q => q.status !== 'Inactive');
                        setAllQuestions(activeQ);
                        activeQ.forEach(q => {
                            let cat = 'Uncategorized';
                            if (q.category) {
                                cat = typeof q.category === 'string' ? q.category : q.category.name || 'Uncategorized';
                            }
                            activeQCounts[cat] = (activeQCounts[cat] || 0) + 1;
                        });
                    }
                } catch (e) {
                    console.error('Error fetching questions for counts:', e);
                }
            }

            setCategories(catData.filter(c => c.status !== 'Inactive').map(c => {
                const availableCount = (view === 'create' && !isSilent) ? (activeQCounts[c.name] || 0) : (c.questionCount || 0);
                return {
                    id: c.id,
                    name: c.name,
                    available: availableCount,
                    selected: false,
                    count: Math.min(availableCount, 10)
                };
            }));

            setPastTests(testDataFromBackend.map(t => {
                const groups = t.studentGroups || [];
                const examDates = groups.map(g => g.examDate).filter(Boolean).sort();
                let displayDate = 'N/A';
                if (examDates.length === 1) displayDate = examDates[0];
                else if (examDates.length > 1) displayDate = 'Multiple Dates';

                const perQuestionSeconds = String(t.timeUnit).startsWith('sec') ? t.timeValue : t.timeValue * 60;
                const totalSeconds = t.timeMode === 'question' ? (t.totalQuestions * perQuestionSeconds) : perQuestionSeconds;
                
                let durationStr = formatDurationDetailed(t.timeValue, t.timeUnit);
                if (t.timeMode === 'question') {
                    const totalStr = formatDurationDetailed(totalSeconds, 'sec');
                    durationStr = `Totally ${totalStr} (${t.totalQuestions} questions x ${t.timeValue}${t.timeUnit}/per question)`;
                }

                return {
                    id: (t.id || '').toString(),
                    name: t.name,
                    description: t.description || '',
                    date: displayDate,
                    studentGroups: groups,
                    status: t.status,
                    totalQuestions: t.totalQuestions,
                    studentCount: t.studentCount || 0,
                    duration: durationStr,
                    hasActiveStudents: t.hasActiveStudents,
                    config: {
                        selectionMode: t.selectionMode,
                        manualQuestions: t.manualQuestions || [],
                        timeMode: t.timeMode,
                        timeValue: t.timeValue,
                        timeUnit: t.timeUnit,
                        examMode: t.examMode,
                        showResult: t.showResult,
                        showAnswers: t.showAnswers,
                        categories: (t.categoryConfigs || []).map(cc => ({
                            name: cc.categoryName,
                            count: cc.questionCount
                        }))
                    }
                };
            }));
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to connect to backend.' });
        }
    };

    const fetchQuestions = async () => {
        setFetchingQuestions(true);
        try {
            const res = await fetch('/api/questions');
            if (res.ok) {
                const data = await res.json();
                setAllQuestions(data.filter(q => q.status !== 'Inactive'));
            }
        } catch (error) {
            console.error('Error fetching questions:', error)
        } finally {
            setFetchingQuestions(false);
        }
    };

    const fetchAvailableStudents = async () => {
        setFetchingStudents(true);
        try {
            const res = await fetch('/api/students');
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter(s => {
                    const status = (s.status || '').toUpperCase();
                    return status === 'PENDING TO EXAM' || status === 'HAVE TO RESCHEDULE';
                });
                setAvailableStudents(filtered);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setFetchingStudents(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (step === 2 && testData.selectionMode === 'manual' && allQuestions.length === 0) {
            fetchQuestions();
        }
        if (step === 3 && availableStudents.length === 0) {
            fetchAvailableStudents();
        }
    }, [step, testData.selectionMode]);

    useEffect(() => {
        if (editModalData) {
            if (allQuestions.length === 0) fetchQuestions();
            if (availableStudents.length === 0) fetchAvailableStudents();
        }
    }, [editModalData]);

    useEffect(() => {
        if (showDetailsModal) {
            fetchStudentCodes(showDetailsModal.id);
            // Silent background refresh every 10s while modal is open
            const interval = setInterval(() => {
                fetchStudentCodes(showDetailsModal.id, true);
            }, 10000);
            return () => clearInterval(interval);
        } else {
            setStudentCodes([]);
        }
    }, [showDetailsModal]);

    const fetchStudentCodes = async (testId, isSilent = false) => {
        if (!isSilent) setFetchingCodes(true);
        try {
            const res = await fetch(`/api/tests/${testId}/student-codes`);
            if (res.ok) {
                const data = await res.json();
                setStudentCodes(data);
            }
        } catch (error) {
            console.error('Error fetching student codes:', error);
        } finally {
            setFetchingCodes(false);
        }
    };

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const [categories, setCategories] = useState([]);
    const [pastTests, setPastTests] = useState([]);

    const filteredAndSortedTests = pastTests
        .filter(t => filterStatus === 'All' || t.status === filterStatus)
        .filter(t =>
            t.name.toLowerCase().includes(manageSearchTerm.toLowerCase()) ||
            t.date.toLowerCase().includes(manageSearchTerm.toLowerCase())
        )
        .sort((a, b) => {
            // First Priority: Published Status
            if (a.status === 'Published' && b.status !== 'Published') return -1;
            if (a.status !== 'Published' && b.status === 'Published') return 1;

            // Second Priority: User Selected Sort
            let comparison = 0;
            if (sortBy === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else if (sortBy === 'questions') {
                comparison = (a.totalQuestions || 0) - (b.totalQuestions || 0);
            } else {
                // date
                const dateA = new Date(a.date).getTime() || 0;
                const dateB = new Date(b.date).getTime() || 0;
                comparison = dateA - dateB;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const handleCategoryToggle = (id) => {
        setCategories(categories.map(cat =>
            cat.id === id ? { ...cat, selected: !cat.selected } : cat
        ));
        if (errors.questions) setErrors({ ...errors, questions: '' });
    };

    const handleCategoryCountChange = (id, count) => {
        setCategories(categories.map(cat =>
            cat.id === id ? { ...cat, count: Math.min(cat.available, Math.max(0, parseInt(count) || 0)) } : cat
        ));
    };

    const totalSelectedQuestions = categories
        .filter(c => c.selected)
        .reduce((sum, c) => sum + c.count, 0);

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await fetch(`/api/tests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newStatus)
            });
            if (!res.ok) throw new Error('Failed to update status');

            setNotification({
                type: 'success',
                message: `Test ${newStatus === 'Published' ? 'Published' : 'Expired'} successfully!`
            });
            fetchData();
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to update test status.' });
        }
    };

    const handleAddTime = async () => {
        if (!addTimeModal || !addTimeModal.extraTime || addTimeModal.extraTime <= 0) {
            setNotification({ type: 'error', message: 'Please enter a valid amount of extra time.' });
            return;
        }
        try {
            const res = await fetch(`/api/tests/${addTimeModal.testId}/add-time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: addTimeModal.studentIds,
                    extraTime: parseInt(addTimeModal.extraTime),
                    comment: addTimeModal.comment
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to add time');
            }

            setNotification({ type: 'success', message: 'Extra time added successfully.' });
            setAddTimeModal(null);

            // Refresh codes to show updated time
            if (showDetailsModal) {
                fetchStudentCodes(showDetailsModal.id);
            }
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Failed to add extra time.' });
        }
    };

    const handleDeleteTest = async (id) => {
        try {
            const res = await fetch(`/api/tests/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete');
            }
            setNotification({ type: 'success', message: 'Examination deleted successfully!' });
            setDeleteConfirm(null);
            fetchData();
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Failed to delete test.' });
        }
    };

    const handleEditTest = (t) => {
        // Open edit modal with test data
        setEditModalData({
            id: t.id,
            name: t.name,
            description: t.description || '',
            selectionMode: t.config.selectionMode || 'random',
            manualQuestionIds: t.config.manualQuestions ? t.config.manualQuestions.map(q => q.id) : [],
            studentGroups: t.studentGroups ? t.studentGroups.map(g => ({
                id: g.id,
                examDate: g.examDate,
                isPersisted: true,
                students: (g.students || []).map(s => ({ ...s, isPersisted: true }))
            })) : [],
            timeMode: t.config.timeMode || 'full',
            timeValue: t.config.timeValue || '60',
            timeUnit: t.config.timeUnit || 'mins',
            examMode: t.config.examMode || 'scroll',
            showResult: t.config.showResult !== undefined ? t.config.showResult : true,
            showAnswers: t.config.showAnswers !== undefined ? t.config.showAnswers : false,
            status: t.status
        });

        // Build edit categories from current categories + test config
        setEditCategories(categories.map(cat => {
            const matchedConfig = t.config.categories.find(cc => cc.categoryId === cat.id || cc.name === cat.name);
            return {
                ...cat,
                selected: !!matchedConfig,
                count: matchedConfig ? matchedConfig.questionCount || matchedConfig.count : Math.min(cat.available, 10)
            };
        }));

        // Fetch student codes/statuses to identify locked students
        fetchStudentCodes(t.id, true);
    };

    const handleUpdateTest = async () => {
        if (!editModalData) return;
        const selectedQuestionsCount = editModalData.selectionMode === 'random'
            ? editCategories.filter(c => c.selected).reduce((sum, c) => sum + c.count, 0)
            : editModalData.manualQuestionIds?.length || 0;

        // Duplicate Date Check
        const groups = editModalData.studentGroups || [];
        for (let i = 0; i < groups.length; i++) {
            for (let j = 0; j < i; j++) {
                if (groups[i].examDate && groups[i].examDate === groups[j].examDate && groups[i].examDate !== '') {
                    setNotification({ type: 'error', message: `One exam cannot have multiple batches on the same date: ${groups[i].examDate}` });
                    return;
                }
            }
        }

        const payload = {
            name: editModalData.name,
            description: editModalData.description,
            selectionMode: editModalData.selectionMode,
            timeMode: editModalData.timeMode,
            timeValue: parseInt(editModalData.timeValue) || 60,
            timeUnit: editModalData.timeUnit,
            examMode: editModalData.examMode,
            showResult: editModalData.showResult,
            showAnswers: editModalData.showAnswers,
            status: editModalData.status,
            totalQuestions: selectedQuestionsCount,
            manualQuestionIds: editModalData.selectionMode === 'manual' ? editModalData.manualQuestionIds : [],
            studentGroups: (editModalData.studentGroups || []).map(g => ({
                examDate: g.examDate,
                studentIds: g.students ? g.students.map(s => s.id) : (g.studentIds || [])
            })),
            categoryConfigs: editModalData.selectionMode === 'random'
                ? editCategories
                    .filter(c => c.selected && c.count > 0)
                    .map(c => ({ categoryId: c.id, categoryName: c.name, questionCount: c.count }))
                : []
        };

        try {
            const res = await fetch(`/api/tests/${editModalData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update test');
            }
            setNotification({ type: 'success', message: 'Test Updated Successfully!' });
            fetchData();
            setEditModalData(null);
        } catch (error) {
            console.error(error);
            const errorMessage = error.message || 'Failed to update test.';
            setNotification({
                type: 'error',
                message: errorMessage
            });
        }
    };

    const handlePublish = async () => {
        // Validation
        if (!testData.name) {
            setNotification({ type: 'error', message: 'Please provide an exam name.' });
            setStep(1);
            return;
        }

        if (testData.selectionMode === 'manual' && selectedQuestionIds.length === 0) {
            setNotification({ type: 'error', message: 'Please select at least one question.' });
            setStep(2);
            return;
        }

        const payload = {
            name: testData.name,
            description: testData.description,
            timeValue: parseInt(testData.timeValue),
            timeUnit: testData.timeUnit,
            timeMode: testData.timeMode,
            examMode: testData.examMode,
            showResult: testData.showResult,
            showAnswers: testData.showAnswers,
            status: testData.activateImmediately ? 'Published' : 'Pending',
            selectionMode: testData.selectionMode,
            activateImmediately: testData.activateImmediately,
            totalQuestions: testData.selectionMode === 'random' ? totalSelectedQuestions : selectedQuestionIds.length,
            manualQuestionIds: testData.selectionMode === 'manual' ? selectedQuestionIds : [],
            categoryConfigs: testData.selectionMode === 'random' ? categories.filter(c => c.selected).map(c => ({
                categoryId: c.id,
                categoryName: c.name,
                questionCount: c.count
            })) : [],
            studentGroups: studentGroups.filter(g => g.studentIds.length > 0).map(g => ({
                examDate: g.examDate,
                studentIds: g.studentIds
            }))
        };

        try {
            const res = await fetch('/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNotification({ type: 'success', message: 'Examination published and students assigned successfully!' });
                setView('manage');
                fetchData();
                setStep(1);
                // Reset test data
                setTestData({
                    name: '', description: '', timeValue: 60, timeUnit: 'mins',
                    timeMode: 'full', examMode: 'scroll', showResult: true,
                    showAnswers: false, activateImmediately: true,
                    selectionMode: 'random', manualQuestionIds: []
                });
                setSelectedQuestionIds([]);
                setStudentGroups([{ id: Date.now(), studentIds: [], examDate: '' }]);
            } else {
                const errorData = await res.json().catch(() => ({}));
                setNotification({ type: 'error', message: errorData.message || 'Failed to create examination.' });
            }
        } catch (error) {
            console.error('Error publishing test:', error);
            setNotification({ type: 'error', message: 'An error occurred while publishing.' });
        } finally {
            setIsPublishing(false);
        }
    };

    const StepIndicator = ({ number, title, active, completed, isLast }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: isLast ? 'none' : 1 }}>
            <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                background: completed ? 'var(--success)' : active ? 'var(--primary)' : 'var(--bg-surface)',
                border: completed || active ? 'none' : '2px solid var(--border)',
                color: completed || active ? 'white' : 'var(--text-tertiary)',
                fontWeight: 600, transition: 'all var(--transition-normal)'
            }}>
                {completed ? <Check size={16} /> : number}
            </div>
            <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: active || completed ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Step {number}</div>
            </div>
            {!isLast && <div style={{ flex: 1, height: '2px', background: completed ? 'var(--success)' : 'var(--border)', margin: '0 1rem' }} />}
        </div>
    );

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem',
                    background: notification.type === 'error' ? 'var(--error)' : 'var(--success)',
                    color: 'white',
                    padding: '1rem 2rem', borderRadius: '18px',
                    boxShadow: notification.type === 'error' 
                        ? '0 10px 30px rgba(239, 68, 68, 0.3)' 
                        : '0 10px 30px rgba(34, 197, 94, 0.3)',
                    zIndex: 5000,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.type === 'error' ? <AlertCircle size={20} /> : <Check size={20} />}
                    <span style={{ fontWeight: 600 }}>{notification.message}</span>
                </div>
            )}

            {/* Header and Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Examinations</h1>

                </div>
                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <button
                        onClick={() => setView('create')}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '15px', border: 'none', background: view === 'create' ? 'var(--primary)' : 'transparent', color: view === 'create' ? 'white' : 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FilePlus size={18} /> Create New
                    </button>
                    <button
                        onClick={() => setView('manage')}
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '15px', border: 'none', background: view === 'manage' ? 'var(--primary)' : 'transparent', color: view === 'manage' ? 'white' : 'var(--text-tertiary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <LayoutDashboard size={18} /> Manage Tests
                    </button>
                </div>
            </div>

            {view === 'create' ? (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                    {/* Wizard Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', padding: '1.25rem', background: 'var(--bg-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                        <StepIndicator number={1} title="Exam" active={step === 1} completed={step > 1} />
                        <StepIndicator number={2} title="Questions" active={step === 2} completed={step > 2} />
                        <StepIndicator number={3} title="Students" active={step === 3} completed={step > 3} />
                        <StepIndicator number={4} title="Settings" active={step === 4} completed={step > 4} isLast />
                    </div>

                    {/* Wizard Body */}
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 4px 25px rgba(0,0,0,0.03)', border: '1px solid var(--border)', minHeight: '450px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

                        {step === 1 && (
                            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1 }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FileText size={24} color="var(--primary)" /> Basic Information</h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.875rem', color: errors.name ? 'var(--error)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Test Name <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={testData.name}
                                            onChange={e => {
                                                setTestData({ ...testData, name: e.target.value });
                                                if (errors.name) setErrors({ ...errors, name: '' });
                                            }}
                                            placeholder="e.g. Midterm Physics Examination"
                                            style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '14px', border: `2px solid ${errors.name ? 'var(--error)' : 'var(--border)'}`, fontSize: '1rem', outline: 'none', transition: 'all 0.2s', background: 'var(--bg-app)' }}
                                            onFocus={e => e.currentTarget.style.borderColor = errors.name ? 'var(--error)' : 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = errors.name ? 'var(--error)' : 'var(--border)'}
                                        />
                                        {errors.name && <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> {errors.name}</div>}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.875rem', color: errors.description ? 'var(--error)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Description <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <textarea
                                            rows="4"
                                            value={testData.description}
                                            onChange={e => {
                                                setTestData({ ...testData, description: e.target.value });
                                                if (errors.description) setErrors({ ...errors, description: '' });
                                            }}
                                            placeholder="Briefly describe the test objectives..."
                                            style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '14px', border: `2px solid ${errors.description ? 'var(--error)' : 'var(--border)'}`, fontSize: '1rem', outline: 'none', resize: 'none', fontFamily: 'inherit', transition: 'all 0.2s', background: 'var(--bg-app)' }}
                                            onFocus={e => e.currentTarget.style.borderColor = errors.description ? 'var(--error)' : 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = errors.description ? 'var(--error)' : 'var(--border)'}
                                        ></textarea>
                                        {errors.description && <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> {errors.description}</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}><List size={24} color="var(--primary)" /> Question Selection</h2>
                                        {errors.questions && <div style={{ color: 'var(--error)', fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem', padding: '0.75rem 1rem', background: 'var(--error-light)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><XCircle size={16} /> {errors.questions}</div>}
                                        <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '0.375rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem', width: 'fit-content' }}>
                                            <button
                                                onClick={() => {
                                                    setTestData({ ...testData, selectionMode: 'random' });
                                                    if (errors.questions) setErrors({ ...errors, questions: '' });
                                                }}
                                                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: testData.selectionMode === 'random' ? 'var(--primary)' : 'transparent', color: testData.selectionMode === 'random' ? 'white' : 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                            >Random Pick</button>
                                            <button
                                                onClick={() => {
                                                    setTestData({ ...testData, selectionMode: 'manual' });
                                                    if (errors.questions) setErrors({ ...errors, questions: '' });
                                                }}
                                                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: testData.selectionMode === 'manual' ? 'var(--primary)' : 'transparent', color: testData.selectionMode === 'manual' ? 'white' : 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                            >Manual Selection</button>
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.75rem 1.25rem', borderRadius: '16px', textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Selected</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{testData.selectionMode === 'random' ? totalSelectedQuestions : selectedQuestionIds.length}</div>
                                    </div>
                                </div>

                                {testData.selectionMode === 'random' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '1.25rem 1.5rem', border: cat.selected ? `2px solid var(--primary)` : '2px solid var(--border)',
                                                    borderRadius: '18px', background: cat.selected ? 'var(--bg-app)' : 'var(--bg-surface)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                                    <div
                                                        onClick={() => handleCategoryToggle(cat.id)}
                                                        style={{
                                                            width: '24px', height: '24px', borderRadius: '6px',
                                                            border: `2px solid ${cat.selected ? 'var(--primary)' : 'var(--border)'}`,
                                                            background: cat.selected ? 'var(--primary)' : 'transparent',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            cursor: 'pointer', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {cat.selected && <Check size={16} color="white" />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '1.06rem', color: 'var(--text-primary)' }}>{cat.name}</div>
                                                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{cat.available} Questions Available</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', opacity: cat.selected ? 1 : 0.4, pointerEvents: cat.selected ? 'auto' : 'none' }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Select:</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                        <input
                                                            type="number"
                                                            value={cat.count}
                                                            onChange={(e) => handleCategoryCountChange(cat.id, e.target.value)}
                                                            min="0" max={cat.available}
                                                            style={{ width: '60px', padding: '0.5rem', background: 'transparent', border: 'none', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)', outline: 'none' }}
                                                        />
                                                        <span style={{ paddingRight: '0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>/ {cat.available}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                            <Search size={20} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)' }} />
                                            <input
                                                type="text"
                                                placeholder="Search by question text or category..."
                                                value={questionSearchTerm}
                                                onChange={e => setQuestionSearchTerm(e.target.value)}
                                                style={{ width: '100%', padding: '0.875rem 1.25rem 0.875rem 3.25rem', borderRadius: '16px', border: '2px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '1rem', transition: 'all 0.2s' }}
                                            />
                                        </div>

                                        {Object.entries(groupedQuestions).map(([catName, questions]) => {
                                            const filteredQs = questions.filter(q =>
                                                q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
                                                catName.toLowerCase().includes(questionSearchTerm.toLowerCase())
                                            );
                                            if (filteredQs.length === 0 && questionSearchTerm) return null;

                                            const isExpanded = expandedCategory === catName;
                                            const catQuestionIds = filteredQs.map(q => q.id);
                                            const allSelected = catQuestionIds.length > 0 && catQuestionIds.every(id => selectedQuestionIds.includes(id));

                                            return (
                                                <div key={catName} style={{ border: isExpanded ? '1px solid var(--border)' : '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', background: 'white', marginBottom: '1rem', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}>
                                                    <div
                                                        style={{
                                                            padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem',
                                                            cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                                                        }}
                                                        onClick={() => setExpandedCategory(isExpanded ? null : catName)}
                                                    >
                                                        <div
                                                            style={{
                                                                width: '24px', height: '24px', borderRadius: '6px',
                                                                border: `2px solid ${allSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                                background: allSelected ? 'var(--primary)' : 'transparent',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleAllInCategory(catName, filteredQs);
                                                            }}
                                                        >
                                                            {allSelected && <Check size={16} color="white" />}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{catName}</div>
                                                            <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{filteredQs.length} Questions Available</div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <div style={{ padding: '0.75rem', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            {filteredQs.map(q => (
                                                                <div
                                                                    key={q.id}
                                                                    onClick={() => {
                                                                        const isSelected = selectedQuestionIds.includes(q.id);
                                                                        if (isSelected) setSelectedQuestionIds(prev => prev.filter(id => id !== q.id));
                                                                        else {
                                                                            setSelectedQuestionIds(prev => [...prev, q.id]);
                                                                            if (errors.questions) setErrors({ ...errors, questions: '' });
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
                                                                        borderRadius: '14px', cursor: 'pointer', transition: 'all 0.2s',
                                                                        background: selectedQuestionIds.includes(q.id) ? 'white' : 'transparent',
                                                                        border: selectedQuestionIds.includes(q.id) ? '1px solid var(--primary-border)' : '1px solid transparent',
                                                                        boxShadow: selectedQuestionIds.includes(q.id) ? 'var(--shadow-sm)' : 'none'
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        width: '24px', height: '24px', borderRadius: '7px',
                                                                        border: `2.5px solid ${selectedQuestionIds.includes(q.id) ? 'var(--primary)' : 'var(--border)'}`,
                                                                        background: selectedQuestionIds.includes(q.id) ? 'var(--primary)' : 'transparent',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                    }}>
                                                                        {selectedQuestionIds.includes(q.id) && <Check size={14} color="white" />}
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{q.text}</div>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--bg-surface)', padding: '0.125rem 0.5rem', borderRadius: '5px' }}>{q.type}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1 }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Users size={24} color="var(--primary)" /> Student Selection & Scheduling
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {studentGroups.map((group, groupIndex) => (
                                        <div key={group.id} style={{ border: '2px solid var(--border)', padding: '2rem', borderRadius: '24px', background: 'var(--bg-app)', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 800 }}>{groupIndex + 1}</div>
                                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Batch Configuration</h3>
                                                </div>
                                                {studentGroups.length > 1 && (
                                                    <button
                                                        onClick={() => setStudentGroups(studentGroups.filter(g => g.id !== group.id))}
                                                        style={{ background: 'var(--error-light)', border: 'none', color: 'var(--error)', padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 700, fontSize: '0.75rem' }}
                                                    >
                                                        <Trash2 size={16} /> Delete Batch
                                                    </button>
                                                )}
                                            </div>

                                            {errors[`batch_${groupIndex}_general`] && <div style={{ color: 'var(--error)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1.5rem', padding: '0.75rem 1rem', background: 'var(--error-light)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><XCircle size={16} /> {errors[`batch_${groupIndex}_general`]}</div>}
                                            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', border: `1px solid ${errors[`batch_${groupIndex}_date`] ? 'var(--error)' : 'var(--border)'}` }}>
                                                <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.75rem', color: errors[`batch_${groupIndex}_date`] ? 'var(--error)' : 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Exam Date <span style={{ color: 'var(--error)' }}>*</span>
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <Calendar size={18} color={errors[`batch_${groupIndex}_date`] ? 'var(--error)' : 'var(--primary)'} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                                    <input
                                                        type="date"
                                                        value={group.examDate}
                                                        min={new Date().toISOString().split('T')[0]}
                                                         onChange={e => {
                                                             const selectedDate = e.target.value;
                                                             const newGroups = [...studentGroups];
                                                             newGroups[groupIndex].examDate = selectedDate;
                                                             setStudentGroups(newGroups);

                                                             const newErrors = { ...errors };
                                                             // Re-evaluate all batches for duplicates (flag only subsequent occurrences)
                                                             newGroups.forEach((g, idx) => {
                                                                 const isDup = newGroups.some((otherG, otherIdx) => 
                                                                     otherIdx < idx && otherG.examDate === g.examDate && g.examDate !== ''
                                                                 );
                                                                 if (isDup) {
                                                                     newErrors[`batch_${idx}_date`] = 'This date is already assigned to another batch.';
                                                                 } else {
                                                                     delete newErrors[`batch_${idx}_date`];
                                                                     delete newErrors[`batch_${idx}_general`];
                                                                 }
                                                             });
                                                             setErrors(newErrors);
                                                         }}
                                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: `2px solid ${errors[`batch_${groupIndex}_date`] ? 'var(--error)' : 'var(--border)'}`, outline: 'none', fontSize: '0.94rem', fontWeight: 600 }}
                                                    />
                                                </div>
                                                {errors[`batch_${groupIndex}_date`] && <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> {errors[`batch_${groupIndex}_date`]}</div>}
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                                    <label style={{ fontWeight: 800, fontSize: '0.875rem', color: errors[`batch_${groupIndex}_students`] ? 'var(--error)' : 'var(--text-secondary)' }}>
                                                        ASSIGN STUDENTS ({group.studentIds.length}) <span style={{ color: 'var(--error)' }}>*</span>
                                                    </label>
                                                    <div style={{ position: 'relative', width: '250px' }}>
                                                        <Search size={16} color="var(--text-tertiary)" style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)' }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Search available students..."
                                                            value={studentSearchTerm}
                                                            onChange={e => setStudentSearchTerm(e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.8125rem' }}
                                                        />
                                                    </div>
                                                </div>

                                                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--bg-surface)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                                                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 5 }}>
                                                            <tr style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Select</th>
                                                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Student Details</th>
                                                                <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {fetchingStudents ? (
                                                                <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>Loading students...</td></tr>
                                                            ) : availableStudents.filter(s =>
                                                                !studentGroups.some((g, idx) => idx !== groupIndex && g.studentIds.includes(s.id)) &&
                                                                ((s.name || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) || (s.nic || '').toLowerCase().includes(studentSearchTerm.toLowerCase()))
                                                            ).map(student => (
                                                                <tr key={student.id} style={{ transition: 'all 0.2s' }}>
                                                                    <td style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                                                                        <div
                                                                            onClick={() => {
                                                                                const newGroups = [...studentGroups];
                                                                                const currentGroup = newGroups[groupIndex];
                                                                                if (currentGroup.studentIds.includes(student.id)) {
                                                                                    currentGroup.studentIds = currentGroup.studentIds.filter(id => id !== student.id);
                                                                                } else {
                                                                                    currentGroup.studentIds.push(student.id);
                                                                                }
                                                                                setStudentGroups(newGroups);
                                                                                if (errors[`batch_${groupIndex}_students`] || errors[`batch_${groupIndex}_general`]) {
                                                                                    const newErrors = { ...errors };
                                                                                    delete newErrors[`batch_${groupIndex}_students`];
                                                                                    delete newErrors[`batch_${groupIndex}_general`];
                                                                                    setErrors(newErrors);
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                width: '20px', height: '20px', borderRadius: '5px',
                                                                                border: `2px solid ${group.studentIds.includes(student.id) ? 'var(--primary)' : 'var(--border)'}`,
                                                                                background: group.studentIds.includes(student.id) ? 'var(--primary)' : 'transparent',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                cursor: 'pointer', transition: 'all 0.2s'
                                                                            }}
                                                                        >
                                                                            {group.studentIds.includes(student.id) && <Check size={14} color="white" />}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                                                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{student.name}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>NIC: {student.nic} | Mobile: {student.mobileNumber}</div>
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                                                                        {(() => {
                                                                            const styles = {
                                                                                'Pending To Exam': { bg: 'var(--primary-light)', color: 'var(--primary)', label: 'Pending' },
                                                                                'Have to Reschedule': { bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', label: 'Have to Reschedule' }
                                                                            };
                                                                            const current = styles[student.status] || { bg: 'var(--bg-app)', color: 'var(--text-tertiary)', label: student.status };
                                                                            return (
                                                                                <div style={{
                                                                                    display: 'inline-flex',
                                                                                    padding: '0.25rem 0.6rem',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '0.675rem',
                                                                                    fontWeight: 800,
                                                                                    background: current.bg,
                                                                                    color: current.color,
                                                                                    letterSpacing: '0.02em'
                                                                                }}>
                                                                                    {current.label}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {errors[`batch_${groupIndex}_students`] && <div style={{ color: 'var(--error)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={12} /> {errors[`batch_${groupIndex}_students`]}</div>}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => setStudentGroups([...studentGroups, { id: Date.now(), studentIds: [], examDate: '' }])}
                                        style={{ width: '100%', padding: '1.5rem', borderRadius: '24px', border: '2px dashed var(--border)', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', transition: 'all 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    >
                                        <Plus size={20} /> Add Another Batch / Schedule
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1 }}>
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Settings size={24} color="var(--primary)" /> Settings & Rules</h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>

                                        {/* Column 1: Time Constraints */}
                                        <div style={{ border: '1px solid var(--border)', padding: '1.75rem', borderRadius: '24px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Clock size={20} color="var(--primary)" />
                                                </div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Time Limit</h3>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                                                <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                    {['mins', 'secs', 'hours'].map(u => (
                                                        <button
                                                            key={u}
                                                            onClick={() => setTestData({ ...testData, timeUnit: u })}
                                                            style={{
                                                                flex: 1, padding: '0.5rem', borderRadius: '9px', border: 'none',
                                                                background: testData.timeUnit === u ? 'var(--primary)' : 'transparent',
                                                                color: testData.timeUnit === u ? 'white' : 'var(--text-tertiary)',
                                                                fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                                                                textTransform: 'uppercase'
                                                            }}
                                                        >
                                                            {u}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div
                                                    style={{
                                                        position: 'relative',
                                                        background: '#ffffff',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                        borderRadius: '16px',
                                                        border: '2px solid var(--primary-border)',
                                                        padding: '1rem',
                                                        textAlign: 'center',
                                                        transition: 'all 0.2s',
                                                        cursor: 'text'
                                                    }}
                                                    onClick={() => document.getElementById('wizard-time-input').focus()}
                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--primary-border)'}
                                                >
                                                    <input
                                                        id="wizard-time-input"
                                                        type="number"
                                                        min="1"
                                                        value={testData.timeValue}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                setTestData({ ...testData, timeValue: '' });
                                                                return;
                                                            }
                                                            const num = Math.max(1, parseInt(val) || 1);
                                                            setTestData({ ...testData, timeValue: num.toString() });
                                                        }}
                                                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '2rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)', outline: 'none', cursor: 'text' }}
                                                    />
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', opacity: 0.6, textTransform: 'uppercase', marginTop: '-0.25rem' }}>Set {testData.timeUnit}</div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: 'auto' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                                                        <input type="radio" name="time" checked={testData.timeMode === 'full'} onChange={() => setTestData({ ...testData, timeMode: 'full' })} style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                                                        Whole Test
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                                                        <input
                                                            type="radio"
                                                            name="time"
                                                            checked={testData.timeMode === 'question'}
                                                            onChange={() => setTestData({
                                                                ...testData,
                                                                timeMode: 'question',
                                                                examMode: 'step'
                                                            })}
                                                            style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                                                        />
                                                        Per Question
                                                    </label>
                                                </div>

                                                {/* Duration Preview */}
                                                <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px dashed var(--primary-border)' }}>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Duration Preview</div>
                                                    <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                                                        {(() => {
                                                            const val = parseInt(testData.timeValue) || 0;
                                                            const unit = testData.timeUnit;
                                                            const questions = testData.selectionMode === 'manual' ? selectedQuestionIds.length : totalSelectedQuestions;

                                                            if (testData.timeMode === 'question') {
                                                                const totalSecs = val * questions * (unit === 'hours' ? 3600 : (unit === 'secs' ? 1 : 60));
                                                                return `Totally ${formatDurationDetailed(totalSecs, 'sec')} (${questions} Qs x ${val}${unit}/each)`;
                                                            } else {
                                                                const totalSecs = val * (unit === 'hours' ? 3600 : (unit === 'secs' ? 1 : 60));
                                                                return formatDurationDetailed(totalSecs, 'sec');
                                                            }
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Results & Privacy */}
                                        <div style={{ border: '1px solid var(--border)', padding: '1.75rem', borderRadius: '24px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Eye size={20} color="var(--success)" />
                                                </div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Candidate View</h3>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                                                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Reveal Results</span>
                                                        <div
                                                            onClick={() => {
                                                                const newVal = !testData.showResult;
                                                                setTestData({
                                                                    ...testData,
                                                                    showResult: newVal,
                                                                    showAnswers: newVal ? testData.showAnswers : false
                                                                });
                                                            }}
                                                            style={{ width: '40px', height: '22px', borderRadius: '11px', background: testData.showResult ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: 'pointer', padding: '2px' }}
                                                        >
                                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', left: testData.showResult ? '20px' : '2px', transition: 'all 0.2s' }} />
                                                        </div>
                                                    </div>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, margin: 0 }}>Allow candidates to see their score immediately after submission.</p>
                                                </div>

                                                <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', opacity: testData.showResult ? 1 : 0.5, cursor: testData.showResult ? 'default' : 'not-allowed' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <span style={{ fontWeight: 800, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>Show Answers</span>
                                                        <div
                                                            onClick={() => testData.showResult && setTestData({ ...testData, showAnswers: !testData.showAnswers })}
                                                            style={{ width: '40px', height: '22px', borderRadius: '11px', background: testData.showAnswers ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: testData.showResult ? 'pointer' : 'not-allowed', padding: '2px' }}
                                                        >
                                                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', left: testData.showAnswers ? '20px' : '2px', transition: 'all 0.2s' }} />
                                                        </div>
                                                    </div>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600, margin: 0 }}>Displays correct answers alongside candidate responses.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 3: Layout Strategy */}
                                        <div style={{ border: '1px solid var(--border)', padding: '1.75rem', borderRadius: '24px', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Layers size={20} color="#3b82f6" />
                                                </div>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Exam Flow</h3>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                                <button
                                                    onClick={() => testData.timeMode !== 'question' && setTestData({ ...testData, examMode: 'scroll' })}
                                                    disabled={testData.timeMode === 'question'}
                                                    style={{
                                                        padding: '1.25rem', borderRadius: '20px', textAlign: 'left',
                                                        border: `2px solid ${testData.examMode === 'scroll' ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: testData.examMode === 'scroll' ? 'var(--primary-light)' : 'var(--bg-surface)',
                                                        transition: 'all 0.2s', opacity: testData.timeMode === 'question' ? 0.5 : 1, cursor: testData.timeMode === 'question' ? 'not-allowed' : 'pointer',
                                                        position: 'relative', overflow: 'hidden'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: testData.examMode === 'scroll' ? 'var(--primary)' : 'var(--text-primary)', marginBottom: '0.25rem' }}>Scroll Mode</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>All questions on a single page</div>
                                                    {testData.examMode === 'scroll' && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                                </button>

                                                <button
                                                    onClick={() => setTestData({ ...testData, examMode: 'step' })}
                                                    style={{
                                                        padding: '1.25rem', borderRadius: '20px', textAlign: 'left',
                                                        border: `2px solid ${testData.examMode === 'step' ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: testData.examMode === 'step' ? 'var(--primary-light)' : 'var(--bg-surface)',
                                                        transition: 'all 0.2s', cursor: 'pointer',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 800, fontSize: '0.875rem', color: testData.examMode === 'step' ? 'var(--primary)' : 'var(--text-primary)', marginBottom: '0.25rem' }}>Step Mode</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>One question per page (Recommended)</div>
                                                    {testData.examMode === 'step' && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                                </button>

                                                <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '14px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                                    <p style={{ fontSize: '0.65rem', color: '#1d4ed8', fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                                                        {testData.timeMode === 'question' ? "Step mode is strictly required for 'Per Question' timing." : "Choose how candidates navigate through the examination."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2.5rem', borderTop: '2px solid var(--border)' }}>
                            <button
                                disabled={step === 1}
                                onClick={() => setStep(s => Math.max(1, s - 1))}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2rem', borderRadius: '16px', fontWeight: 700, color: step === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)', background: 'var(--bg-app)', border: '2px solid var(--border)', cursor: step === 1 ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                            >
                                <ArrowLeft size={20} /> Previous
                            </button>

                            <button
                                onClick={() => {
                                    if (isPublishing) return;
                                    const newErrors = {};

                                    if (step === 1) {
                                        if (!testData.name.trim()) {
                                            newErrors.name = 'Test Name is required.';
                                        } else {
                                            const isDuplicate = pastTests.some(t => t.name.trim().toLowerCase() === testData.name.trim().toLowerCase());
                                            if (isDuplicate) {
                                                newErrors.name = 'An examination with this name already exists. Please use a unique name.';
                                            }
                                        }

                                        if (!testData.description.trim()) newErrors.description = 'Description is required.';

                                        if (Object.keys(newErrors).length > 0) {
                                            setErrors(newErrors);
                                            return;
                                        }
                                    } else if (step === 2) {
                                        if (testData.selectionMode === 'manual' && selectedQuestionIds.length === 0) {
                                            newErrors.questions = 'Please select at least one question to proceed.';
                                        }
                                        if (testData.selectionMode === 'random' && totalSelectedQuestions === 0) {
                                            newErrors.questions = 'Please select at least one question from the categories to proceed.';
                                        }

                                        if (Object.keys(newErrors).length > 0) {
                                            setErrors(newErrors);
                                            return;
                                        }
                                    } else if (step === 3) {
                                        let hasValidBatch = false;

                                         studentGroups.forEach((group, idx) => {
                                             if (!group.examDate && group.studentIds.length === 0) {
                                                 newErrors[`batch_${idx}_general`] = 'Please assign an exam date and select students for this batch.';
                                             } else if (!group.examDate) {
                                                 newErrors[`batch_${idx}_date`] = 'Exam date is required.';
                                             } else if (group.studentIds.length === 0) {
                                                 newErrors[`batch_${idx}_students`] = 'Please assign at least one student.';
                                             }

                                             // Check for duplicate dates
                                             const isDuplicate = studentGroups.some((g, gIdx) => gIdx !== idx && g.examDate === group.examDate && group.examDate !== '');
                                             if (isDuplicate) {
                                                 newErrors[`batch_${idx}_date`] = 'This date is already assigned to another batch.';
                                             }

                                             if (group.examDate && group.studentIds.length > 0 && !isDuplicate) {
                                                 hasValidBatch = true;
                                             }
                                         });

                                        if (!hasValidBatch) {
                                            setErrors(newErrors);
                                            return;
                                        }
                                    }

                                    setErrors({}); // clear errors if proceeding successfully

                                    if (step < 4) setStep(s => s + 1);
                                    else handlePublish();
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2.5rem', borderRadius: '16px',
                                    fontWeight: 800, color: 'white', background: isPublishing ? 'var(--text-tertiary)' : (step === 4 ? 'var(--success)' : 'var(--primary)'),
                                    border: 'none', cursor: isPublishing ? 'not-allowed' : 'pointer', boxShadow: isPublishing ? 'none' : '0 10px 20px rgba(0,0,0,0.1)', transition: 'all 0.2s',
                                    opacity: isPublishing ? 0.8 : 1
                                }}
                                onMouseEnter={e => !isPublishing && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => !isPublishing && (e.currentTarget.style.transform = 'none')}
                            >
                                {isPublishing ? (
                                    <>
                                        <div className="spinner-small" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        {step === 4 ? 'Create' : 'Continue'} {step < 4 && <ArrowRight size={20} />}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Filters and Search Bar */}
                    <div style={{ background: 'var(--bg-surface)', padding: '1.25rem 1.5rem', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                            {/* Status Filter Row */}
                            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {['All', 'Published', 'Pending', 'Expired'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        style={{
                                            padding: '0.5rem 1.125rem',
                                            borderRadius: '12px',
                                            border: `2px solid ${filterStatus === status ? 'var(--primary)' : 'transparent'}`,
                                            background: filterStatus === status ? 'var(--primary-light)' : 'var(--bg-app)',
                                            color: filterStatus === status ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontWeight: 700,
                                            fontSize: '0.8125rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { if (filterStatus !== status) e.currentTarget.style.borderColor = 'var(--border)' }}
                                        onMouseLeave={e => { if (filterStatus !== status) e.currentTarget.style.borderColor = 'transparent' }}
                                    >
                                        {status === 'Pending' ? 'Pending' : status}
                                    </button>
                                ))}
                            </div>

                            {/* Sorting and Search Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                                {/* Sorting Group */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.25rem', 
                                    background: 'var(--bg-app)', 
                                    padding: '0.25rem', 
                                    borderRadius: '14px', 
                                    border: '1px solid var(--border)',
                                    height: '44px' 
                                }}>
                                    {['date', 'name', 'questions'].map(sort => (
                                        <button
                                            key={sort}
                                            onClick={() => {
                                                if (sortBy === sort) {
                                                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                                } else {
                                                    setSortBy(sort);
                                                    setSortOrder('desc');
                                                }
                                            }}
                                            style={{
                                                padding: '0 0.875rem',
                                                height: '100%',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: sortBy === sort ? 'var(--bg-surface)' : 'transparent',
                                                color: sortBy === sort ? 'var(--primary)' : 'var(--text-tertiary)',
                                                fontWeight: 800,
                                                fontSize: '0.75rem',
                                                textTransform: 'capitalize',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.375rem',
                                                boxShadow: sortBy === sort ? 'var(--shadow-sm)' : 'none',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {sort} {sortBy === sort && <span style={{ fontSize: '10px', opacity: 0.7 }}>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
                                        </button>
                                    ))}
                                </div>

                                {/* Search Bar */}
                                <div style={{ position: 'relative', width: '300px' }}>
                                    <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or code..."
                                        value={manageSearchTerm}
                                        onChange={e => setManageSearchTerm(e.target.value)}
                                        style={{ 
                                            width: '100%', 
                                            height: '44px',
                                            padding: '0 1rem 0 2.75rem', 
                                            borderRadius: '14px', 
                                            border: '2px solid var(--border)', 
                                            background: 'var(--bg-app)', 
                                            outline: 'none', 
                                            fontSize: '0.875rem', 
                                            fontWeight: 600, 
                                            transition: 'all 0.2s' 
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Test List */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.25rem' }}>
                        {filteredAndSortedTests.length === 0 ? (
                            <div style={{ gridColumn: '1 / -1', padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--text-tertiary)' }}>
                                    <Search size={32} />
                                </div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No examinations found</h3>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.94rem' }}>Try adjusting your filters or search terms.</p>
                            </div>
                        ) : (
                            filteredAndSortedTests.map(t => (
                                <div key={t.id}
                                    onClick={() => setShowDetailsModal(t)}
                                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{
                                                    padding: '0.25rem 0.625rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    background: t.status === 'Published' ? 'rgba(34, 197, 94, 0.1)' : t.status === 'Expired' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(107, 114, 128,0.1)',
                                                    color: t.status === 'Published' ? 'var(--success)' : t.status === 'Expired' ? 'var(--error)' : 'var(--text-tertiary)',
                                                    border: t.status === 'Expired' ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                                }}>
                                                    {t.status === 'Pending' ? 'Pending' : t.status}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>ID: {t.id}</div>
                                            </div>
                                            <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: '0.25rem' }}>{t.name}</h4>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', padding: '1rem', background: 'var(--bg-app)', borderRadius: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Schedule</div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.date}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Layers size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Questions</div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.totalQuestions} Items</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: t.duration.includes('Totally') ? '1 / -1' : 'auto' }}>
                                            <Clock size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Duration</div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{t.duration}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Users size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Participated</div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.studentCount} Students</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                                        <div
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: '8px', background: 'var(--bg-app)', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, border: '1px solid var(--border)' }}
                                        >

                                        </div>

                                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                                            {t.status === 'Pending' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'Published'); }}
                                                    title="Publish Test"
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--success)'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.1)'; e.currentTarget.style.color = 'var(--success)'; }}
                                                >
                                                    <Play size={18} fill="currentColor" />
                                                </button>
                                            )}
                                            {t.status === 'Published' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, 'Expired'); }}
                                                    title="Expire Test"
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--error)'; }}
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { 
                                                    if (t.hasActiveStudents) return e.stopPropagation();
                                                    e.stopPropagation(); 
                                                    handleEditTest(t); 
                                                }}
                                                title={t.hasActiveStudents ? "Editing disabled: Students are currently taking this exam" : "Edit Test"}
                                                style={{ 
                                                    width: '36px', height: '36px', borderRadius: '10px', border: 'none', 
                                                    background: t.hasActiveStudents ? 'rgba(0,0,0,0.05)' : 'var(--bg-app)', 
                                                    color: t.hasActiveStudents ? 'var(--text-tertiary)' : 'var(--primary)', 
                                                    cursor: t.hasActiveStudents ? 'not-allowed' : 'pointer', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    transition: 'all 0.2s',
                                                    opacity: t.hasActiveStudents ? 0.6 : 1
                                                }}
                                                onMouseEnter={e => { 
                                                    if (!t.hasActiveStudents) {
                                                        e.currentTarget.style.background = 'var(--primary)'; 
                                                        e.currentTarget.style.color = 'white'; 
                                                    }
                                                }}
                                                onMouseLeave={e => { 
                                                    if (!t.hasActiveStudents) {
                                                        e.currentTarget.style.background = 'var(--bg-app)'; 
                                                        e.currentTarget.style.color = 'var(--primary)'; 
                                                    }
                                                }}
                                            >
                                                {t.hasActiveStudents ? <Lock size={16} /> : <Edit2 size={16} />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowDetailsModal(t); }}
                                                title="View Details"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => { 
                                                    if (t.hasActiveStudents) return e.stopPropagation();
                                                    e.stopPropagation(); 
                                                    setDeleteConfirm(t); 
                                                }}
                                                title={t.hasActiveStudents ? "Deletion disabled: Students are currently taking this exam" : "Delete Test"}
                                                style={{ 
                                                    width: '36px', height: '36px', borderRadius: '10px', border: 'none', 
                                                    background: t.hasActiveStudents ? 'rgba(0,0,0,0.05)' : 'var(--bg-app)', 
                                                    color: t.hasActiveStudents ? 'var(--text-tertiary)' : 'var(--error)', 
                                                    cursor: t.hasActiveStudents ? 'not-allowed' : 'pointer', 
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                                    transition: 'all 0.2s',
                                                    opacity: t.hasActiveStudents ? 0.6 : 1
                                                }}
                                                onMouseEnter={e => { 
                                                    if (!t.hasActiveStudents) {
                                                        e.currentTarget.style.background = 'var(--error)'; 
                                                        e.currentTarget.style.color = 'white'; 
                                                    }
                                                }}
                                                onMouseLeave={e => { 
                                                    if (!t.hasActiveStudents) {
                                                        e.currentTarget.style.background = 'var(--bg-app)'; 
                                                        e.currentTarget.style.color = 'var(--error)'; 
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Edit Test Modal */}
            {editModalData && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, animation: 'fadeIn 0.2s' }}>
                    <div
                        ref={editModalRef}
                        className="hide-scrollbar"
                        style={{
                            background: 'var(--bg-surface)', width: '95%', maxWidth: '750px',
                            borderRadius: '28px', padding: '2.5rem',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.15)', border: '1px solid var(--border)',
                            maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.3s ease-out'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Edit2 size={24} color="var(--primary)" /> Edit Examination
                                </h2>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Modify test settings and save</p>
                            </div>
                            <button onClick={() => setEditModalData(null)} style={{ background: 'var(--bg-app)', border: 'none', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-tertiary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}>
                                ✕
                            </button>
                        </div>

                        {/* Basic Info Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.75rem', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><FileText size={18} color="var(--primary)" /> Basic Information</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Name</label>
                                            <input type="text" value={editModalData.name} onChange={e => setEditModalData({ ...editModalData, name: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '0.94rem', fontWeight: 600, outline: 'none', background: 'var(--bg-surface)', transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                        <textarea rows="2" value={editModalData.description} onChange={e => setEditModalData({ ...editModalData, description: e.target.value })} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '2px solid var(--border)', fontSize: '0.94rem', outline: 'none', resize: 'none', fontFamily: 'inherit', background: 'var(--bg-surface)', transition: 'all 0.2s' }} onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'} />
                                    </div>
                                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}><Calendar size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem', color: 'var(--primary)' }} /> Scheduled Batches</label>
                                        {editModalData.studentGroups && editModalData.studentGroups.length > 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {editModalData.studentGroups.map((group, idx) => (
                                                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px dashed var(--border)', fontSize: '0.875rem' }}>
                                                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                             <span style={{ fontWeight: 600 }}>{group.examDate || 'No Date'}</span>
                                                             <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>{(group.students?.length || group.studentIds?.length) || 0} Students</span>
                                                         </div>
                                                         <button
                                                             onClick={() => {
                                                                const newGroups = [...editModalData.studentGroups];
                                                                newGroups.splice(idx, 1);
                                                                setEditModalData({...editModalData, studentGroups: newGroups});
                                                             }}
                                                             title="Remove Batch"
                                                             style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                                                             onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                             onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                         >
                                                             <Trash2 size={16} />
                                                         </button>
                                                     </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px dashed var(--border)' }}>No batches scheduled. To add new batches, recreate the examination.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Question Selection Section */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.75rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <List size={18} color="var(--primary)" /> Question Management
                                    </h3>
                                    <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        {['random', 'manual'].map(mode => (
                                            <button
                                                key={mode}
                                                onClick={() => setEditModalData({ ...editModalData, selectionMode: mode })}
                                                style={{
                                                    padding: '0.5rem 1rem', borderRadius: '10px', border: 'none',
                                                    background: editModalData.selectionMode === mode ? 'var(--primary)' : 'transparent',
                                                    color: editModalData.selectionMode === mode ? 'white' : 'var(--text-tertiary)',
                                                    fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                {mode.toUpperCase()}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {editModalData.selectionMode === 'random' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {editCategories.map(cat => (
                                            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', border: cat.selected ? '2px solid var(--primary)' : '2px solid var(--border)', borderRadius: '14px', background: cat.selected ? 'rgba(59,130,246,0.03)' : 'var(--bg-surface)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div
                                                        onClick={() => setEditCategories(editCategories.map(c => c.id === cat.id ? { ...c, selected: !c.selected } : c))}
                                                        style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${cat.selected ? 'var(--primary)' : 'var(--border)'}`, background: cat.selected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                                    >
                                                        {cat.selected && <Check size={14} color="white" />}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>{cat.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{cat.available} available</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: cat.selected ? 1 : 0.3, pointerEvents: cat.selected ? 'auto' : 'none' }}>
                                                    <input type="number" value={cat.count} onChange={e => setEditCategories(editCategories.map(c => c.id === cat.id ? { ...c, count: Math.min(c.available, Math.max(0, parseInt(e.target.value) || 0)) } : c))} min="0" max={cat.available} style={{ width: '55px', padding: '0.375rem', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center', fontWeight: 800, fontSize: '0.94rem', color: 'var(--primary)', outline: 'none' }} />
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>/ {cat.available}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} size={16} />
                                            <input
                                                type="text"
                                                placeholder="Search manual questions..."
                                                value={questionSearchTerm}
                                                onChange={e => {
                                                    setQuestionSearchTerm(e.target.value);
                                                    if (e.target.value) {
                                                        // Auto-expand categories that match search
                                                        const matchedCat = Object.entries(groupedQuestions).find(([catName, questions]) =>
                                                            catName.toLowerCase().includes(e.target.value.toLowerCase()) ||
                                                            questions.some(q => q.text.toLowerCase().includes(e.target.value.toLowerCase()))
                                                        );
                                                        if (matchedCat) setExpandedCategory(matchedCat[0]);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-surface)' }}
                                            />
                                        </div>

                                        <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '0.5rem 0.75rem 0.5rem 0.5rem', margin: '0 -0.5rem', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }} className="fine-scrollbar">
                                            {Object.entries(groupedQuestions).map(([catName, questions]) => {
                                                const filteredQs = questions.filter(q =>
                                                    q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
                                                    catName.toLowerCase().includes(questionSearchTerm.toLowerCase())
                                                );
                                                if (filteredQs.length === 0 && questionSearchTerm) return null;

                                                const isExpanded = expandedCategory === catName;
                                                const catQuestionIds = filteredQs.map(q => q.id);
                                                const selectedInCat = (editModalData.manualQuestionIds || []).filter(id => catQuestionIds.includes(id));
                                                const allSelected = catQuestionIds.length > 0 && catQuestionIds.length === selectedInCat.length;

                                                return (
                                                    <div key={catName} style={{ border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', background: 'white', transition: 'all 0.2s' }}>
                                                        <div
                                                            style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--border)' : 'none', background: isExpanded ? 'rgba(59,130,246,0.02)' : 'white' }}
                                                            onClick={() => setExpandedCategory(isExpanded ? null : catName)}
                                                        >
                                                            <div
                                                                style={{ width: '22px', height: '22px', borderRadius: '6px', border: `2px solid ${allSelected ? 'var(--primary)' : 'var(--border)'}`, background: allSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const current = editModalData.manualQuestionIds || [];
                                                                    let updated;
                                                                    if (allSelected) {
                                                                        updated = current.filter(id => !catQuestionIds.includes(id));
                                                                    } else {
                                                                        updated = [...new Set([...current, ...catQuestionIds])];
                                                                    }
                                                                    setEditModalData({ ...editModalData, manualQuestionIds: updated });
                                                                }}
                                                            >
                                                                {allSelected && <Check size={14} color="white" />}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{catName}</div>
                                                                    {selectedInCat.length > 0 && (
                                                                        <div style={{ background: 'var(--primary)', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 900 }}>
                                                                            {selectedInCat.length} Selected
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{filteredQs.length} Questions Available</div>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <ArrowRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-tertiary)' }} />
                                                            </div>
                                                        </div>

                                                        {isExpanded && (
                                                            <div
                                                                style={{
                                                                    padding: '0.5rem',
                                                                    background: 'var(--bg-app)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.4rem',
                                                                    borderTop: '1px solid var(--border)',
                                                                    maxHeight: '320px',
                                                                    overflowY: 'auto'
                                                                }}
                                                                className="fine-scrollbar"
                                                            >
                                                                {filteredQs.map(q => {
                                                                    const isSelected = (editModalData.manualQuestionIds || []).includes(q.id);
                                                                    return (
                                                                        <div
                                                                            key={q.id}
                                                                            onClick={() => {
                                                                                const current = editModalData.manualQuestionIds || [];
                                                                                const updated = isSelected ? current.filter(id => id !== q.id) : [...current, q.id];
                                                                                setEditModalData({ ...editModalData, manualQuestionIds: updated });
                                                                            }}
                                                                            style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderRadius: '10px', cursor: 'pointer', background: isSelected ? 'white' : 'transparent', border: isSelected ? '1px solid var(--primary-border)' : '1px solid transparent', boxShadow: isSelected ? 'var(--shadow-xs)' : 'none', transition: 'all 0.1s' }}
                                                                        >
                                                                            <div style={{ width: '18px', height: '18px', borderRadius: '5px', border: `2.5px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`, background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                                {isSelected && <Check size={12} color="white" />}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.text}</div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--primary-border)' }}>
                                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>Selection Status</span>
                                            <span style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--primary)' }}>{editModalData.manualQuestionIds?.length || 0} Questions Selected</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Batch Management Section */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.75rem', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                        <Users size={18} color="var(--primary)" /> Batch Management
                                    </h3>
                                    <button
                                        onClick={() => {
                                            const newBatch = { id: Date.now(), examDate: '', students: [] };
                                            setEditModalData({ ...editModalData, studentGroups: [...(editModalData.studentGroups || []), newBatch] });
                                        }}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '10px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /> Add Batch
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {(editModalData.studentGroups || []).map((group, gIdx) => (
                                        <div key={group.id} style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <Calendar size={16} color="var(--primary)" />
                                                    {(() => {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const examDate = new Date(group.examDate);
                                                        examDate.setHours(0, 0, 0, 0);

                                                        const isDateLocked = group.examDate && examDate <= today;
                                                        const hasStudentStarted = group.students?.some(s => {
                                                            const codeEntry = studentCodes.find(c => c.studentId === s.id);
                                                            return codeEntry && (codeEntry.status === 'STARTED' || codeEntry.status === 'USED');
                                                        });

                                                        const isEditLocked = isDateLocked || hasStudentStarted;
                                                        const lockReason = isDateLocked
                                                            ? "Cannot change date: Batch is scheduled for today or in the past"
                                                            : "Cannot change date: Students have already started or taken the exam";

                                                        return (
                                                            <input
                                                                type="date"
                                                                value={group.examDate}
                                                                min={new Date().toISOString().split('T')[0]}
                                                                readOnly={isEditLocked}
                                                                title={isEditLocked ? lockReason : ""}
                                                                  onChange={e => {
                                                                     if (isEditLocked) return;
                                                                     const selectedDate = e.target.value;
                                                                     const newGroups = [...editModalData.studentGroups];
                                                                     newGroups[gIdx].examDate = selectedDate;
                                                                     setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                                 }}
                                                                style={{
                                                                    border: 'none',
                                                                    outline: 'none',
                                                                    background: 'transparent',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.875rem',
                                                                    color: isEditLocked ? 'var(--text-tertiary)' : (
                                                                        (editModalData.studentGroups || []).some((otherG, otherIdx) =>
                                                                            otherIdx < gIdx && otherG.examDate === group.examDate && group.examDate !== ''
                                                                        ) ? 'var(--error)' : 'var(--text-primary)'
                                                                    ),
                                                                    cursor: isEditLocked ? 'not-allowed' : 'text'
                                                                }}
                                                            />
                                                        );
                                                    })()}
                                                </div>

                                                {/* Calculate if the batch is locked safely before rendering the button */}
                                                {(() => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const examDate = new Date(group.examDate);
                                                    examDate.setHours(0, 0, 0, 0);

                                                    const isDateLocked = group.examDate && examDate <= today;
                                                    const hasStudentStarted = group.students?.some(s => {
                                                        const codeEntry = studentCodes.find(c => c.studentId === s.id);
                                                        return codeEntry && (codeEntry.status === 'STARTED' || codeEntry.status === 'USED');
                                                    });

                                                    const isBatchLocked = (isDateLocked && group.isPersisted) || hasStudentStarted;
                                                    const isOnlyBatch = (editModalData.studentGroups || []).length <= 1;

                                                    let lockReason = "";
                                                    if (isOnlyBatch) lockReason = "Cannot delete the only batch of an examination";
                                                    else if (isDateLocked) lockReason = "Cannot delete batch: Existing batch date is today or in the past";
                                                    else if (hasStudentStarted) lockReason = "Cannot delete batch: One or more students have already started or taken the exam";

                                                    return (isBatchLocked || isOnlyBatch) ? (
                                                        <div title={lockReason} style={{ cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                                                            <Trash2 size={16} color="var(--border)" />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newGroups = editModalData.studentGroups.filter((_, i) => i !== gIdx);
                                                                setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                                            title="Delete Batch"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    );
                                                })()}
                                            </div>

                                            {/* Duplicate Date Error Message (only for subsequent occurrences) */}
                                            {(() => {
                                                const isDuplicate = (editModalData.studentGroups || []).some((otherG, otherIdx) =>
                                                    otherIdx < gIdx && otherG.examDate === group.examDate && group.examDate !== ''
                                                );
                                                if (isDuplicate) {
                                                    return (
                                                        <div style={{
                                                            marginTop: '-0.5rem',
                                                            marginBottom: '1rem',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--error)',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.4rem',
                                                            background: 'rgba(239, 68, 68, 0.05)',
                                                            padding: '0.5rem 0.75rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(239, 68, 68, 0.1)'
                                                        }}>
                                                            <AlertCircle size={14} /> This date is already assigned to another batch in this examination.
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                                {group.students?.map((s, sIdx) => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const examDate = new Date(group.examDate);
                                                    examDate.setHours(0, 0, 0, 0);
                                                    const isDateLocked = group.examDate && examDate <= today;

                                                    const codeEntry = studentCodes.find(c => c.studentId === s.id);
                                                    const hasStarted = codeEntry && (codeEntry.status === 'STARTED' || codeEntry.status === 'USED');
                                                    const isLocked = hasStarted || (isDateLocked && s.isPersisted);
                                                    const lockReason = hasStarted
                                                        ? "Cannot remove: Exam session in progress or completed"
                                                        : "Cannot remove: Existing student in a batch scheduled for today or in the past";

                                                    return (
                                                        <div key={s.id} style={{
                                                            display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem',
                                                            background: isLocked ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-app)',
                                                            borderRadius: '8px', border: isLocked ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border)',
                                                            fontSize: '0.75rem', fontWeight: 600, color: isLocked ? 'var(--error)' : 'inherit'
                                                        }}>
                                                            {isLocked && <Lock size={12} color="var(--error)" style={{ opacity: 0.8 }} />}
                                                            {s.name}
                                                            {!isLocked ? (
                                                                <XCircle size={14} color="var(--text-tertiary)" style={{ cursor: 'pointer' }} onClick={() => {
                                                                    const newGroups = [...editModalData.studentGroups];
                                                                    newGroups[gIdx].students = newGroups[gIdx].students.filter((_, i) => i !== sIdx);
                                                                    setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                                }} />
                                                            ) : (
                                                                <div title={lockReason} style={{ cursor: 'not-allowed', display: 'flex', alignItems: 'center' }}>
                                                                    <XCircle size={14} color="var(--border)" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {(() => {
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const examDate = new Date(group.examDate);
                                                examDate.setHours(0, 0, 0, 0);
                                                const isPastDate = group.examDate && examDate < today;

                                                return (
                                                    <select
                                                        disabled={isPastDate}
                                                        title={isPastDate ? "Cannot add students to a past batch" : ""}
                                                        onChange={e => {
                                                            if (isPastDate) return;
                                                            const studentId = parseInt(e.target.value);
                                                            if (!studentId) return;
                                                            const student = availableStudents.find(s => s.id === studentId);
                                                            if (student) {
                                                                const newGroups = [...editModalData.studentGroups];
                                                                if (!newGroups[gIdx].students.some(s => s.id === studentId)) {
                                                                    newGroups[gIdx].students = [...newGroups[gIdx].students, student];
                                                                    setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                                }
                                                            }
                                                            e.target.value = '';
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            borderRadius: '8px',
                                                            border: '1px solid var(--border)',
                                                            outline: 'none',
                                                            fontSize: '0.8125rem',
                                                            background: isPastDate ? 'var(--bg-surface)' : 'var(--bg-app)',
                                                            cursor: isPastDate ? 'not-allowed' : 'pointer',
                                                            opacity: isPastDate ? 0.7 : 1
                                                        }}
                                                    >
                                                        <option value="">{isPastDate ? 'Cannot add students to past batch' : '+ Add Student to this batch...'}</option>
                                                        {!isPastDate && availableStudents
                                                            .filter(s => !group.students.some(gs => gs.id === s.id))
                                                            .map(s => (
                                                                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                                            ))}
                                                    </select>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Configuration Section */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '24px', padding: '1.75rem', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-primary)' }}>
                                    <Settings size={20} color="var(--primary)" /> Configuration
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                                    {/* Column 1: Time */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            <Clock size={14} /> Time Settings
                                        </div>

                                        <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                            {['mins', 'secs', 'hours'].map(u => (
                                                <button key={u} onClick={() => setEditModalData({ ...editModalData, timeUnit: u })} style={{ flex: 1, padding: '0.375rem', borderRadius: '7px', border: 'none', background: editModalData.timeUnit === u ? 'var(--primary)' : 'transparent', color: editModalData.timeUnit === u ? 'white' : 'var(--text-tertiary)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase' }}>
                                                    {u}
                                                </button>
                                            ))}
                                        </div>

                                        <div
                                            style={{
                                                position: 'relative',
                                                background: '#ffffff',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                borderRadius: '14px',
                                                border: '2px solid var(--primary-border)',
                                                padding: '0.75rem',
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                cursor: 'text'
                                            }}
                                            onClick={() => document.getElementById('edit-time-input').focus()}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--primary-border)'}
                                        >
                                            <input
                                                id="edit-time-input"
                                                type="number"
                                                min="1"
                                                value={editModalData.timeValue}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '') {
                                                        setEditModalData({ ...editModalData, timeValue: '' });
                                                        return;
                                                    }
                                                    const num = Math.max(1, parseInt(val) || 1);
                                                    setEditModalData({ ...editModalData, timeValue: num.toString() });
                                                }}
                                                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '1.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)', outline: 'none', cursor: 'text' }}
                                            />
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                <input type="radio" name="editTime" checked={editModalData.timeMode === 'full'} onChange={() => setEditModalData({ ...editModalData, timeMode: 'full' })} style={{ accentColor: 'var(--primary)' }} />
                                                Whole Test
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                <input type="radio" name="editTime" checked={editModalData.timeMode === 'question'} onChange={() => setEditModalData({ ...editModalData, timeMode: 'question', examMode: 'step' })} style={{ accentColor: 'var(--primary)' }} />
                                                Per Question
                                            </label>
                                        </div>

                                        {/* Duration Preview */}
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-app)', borderRadius: '12px', border: '1px dashed var(--primary-border)' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Duration Preview</div>
                                            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1.4 }}>
                                                {(() => {
                                                    const val = parseInt(editModalData.timeValue) || 0;
                                                    const unit = editModalData.timeUnit;
                                                    const questions = editModalData.selectionMode === 'manual' 
                                                        ? (editModalData.manualQuestionIds?.length || 0)
                                                        : editCategories.filter(c => c.selected).reduce((sum, c) => sum + (c.count || 0), 0);

                                                    if (editModalData.timeMode === 'question') {
                                                        const totalSecs = val * questions * (unit === 'hours' ? 3600 : (unit === 'secs' ? 1 : 60));
                                                        return `Totally ${formatDurationDetailed(totalSecs, 'sec')} (${questions} Qs x ${val}${unit}/each)`;
                                                    } else {
                                                        const totalSecs = val * (unit === 'hours' ? 3600 : (unit === 'secs' ? 1 : 60));
                                                        return formatDurationDetailed(totalSecs, 'sec');
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Column 2: Visibility */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            <Eye size={14} /> Visibility
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Show Result</span>
                                                <div
                                                    onClick={() => {
                                                        const newVal = !editModalData.showResult;
                                                        setEditModalData({ ...editModalData, showResult: newVal, showAnswers: newVal ? editModalData.showAnswers : false });
                                                    }}
                                                    style={{ width: '36px', height: '20px', borderRadius: '10px', background: editModalData.showResult ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', left: editModalData.showResult ? '18px' : '2px', transition: 'all 0.2s' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: editModalData.showResult ? 1 : 0.5 }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>Show Answers</span>
                                                <div
                                                    onClick={() => editModalData.showResult && setEditModalData({ ...editModalData, showAnswers: !editModalData.showAnswers })}
                                                    style={{ width: '36px', height: '20px', borderRadius: '10px', background: editModalData.showAnswers ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: editModalData.showResult ? 'pointer' : 'not-allowed', padding: '2px' }}
                                                >
                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', left: editModalData.showAnswers ? '18px' : '2px', transition: 'all 0.2s' }} />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 'auto', fontSize: '0.65rem', color: 'var(--text-tertiary)', fontWeight: 600, fontStyle: 'italic' }}>
                                            Candidates see feedback after submission.
                                        </div>
                                    </div>

                                    {/* Column 3: Layout */}
                                    <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                            <Layers size={14} /> Flow
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                            {['scroll', 'step'].map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => (mode === 'step' || editModalData.timeMode !== 'question') && setEditModalData({ ...editModalData, examMode: mode })}
                                                    style={{
                                                        width: '100%', padding: '0.625rem', borderRadius: '12px', textAlign: 'left',
                                                        border: `2px solid ${editModalData.examMode === mode ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: editModalData.examMode === mode ? 'var(--primary-light)' : 'var(--bg-app)',
                                                        color: editModalData.examMode === mode ? 'var(--primary)' : 'var(--text-secondary)',
                                                        fontWeight: 800, fontSize: '0.75rem', cursor: (mode === 'scroll' && editModalData.timeMode === 'question') ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                                        opacity: (mode === 'scroll' && editModalData.timeMode === 'question') ? 0.5 : 1
                                                    }}
                                                >
                                                    {mode === 'scroll' ? 'Scroll' : 'Step'} Mode
                                                </button>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: 'auto', background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem', borderRadius: '8px', fontSize: '0.6rem', color: '#1d4ed8', fontWeight: 700 }}>
                                            Navigation strategy for the candidate.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Status */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.25rem 1.75rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Status</div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['Published', 'Pending', 'Expired'].map(s => (
                                        <button key={s} onClick={() => setEditModalData({ ...editModalData, status: s })} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: `2px solid ${editModalData.status === s ? (s === 'Published' ? 'var(--success)' : s === 'Expired' ? 'var(--error)' : 'var(--border)') : 'var(--border)'}`, background: editModalData.status === s ? (s === 'Published' ? 'rgba(34,197,94,0.08)' : s === 'Expired' ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)') : 'transparent', color: editModalData.status === s ? (s === 'Published' ? 'var(--success)' : s === 'Expired' ? 'var(--error)' : 'var(--text-primary)') : 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {s === 'Pending' ? 'Pending' : s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                                <button
                                    onClick={() => setEditModalData(null)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTest}
                                    style={{ flex: 2, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    <Check size={18} /> Update Examination
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, animation: 'fadeIn 0.2s' }}>
                    <div ref={detailsModalRef} style={{ background: 'var(--bg-surface)', width: '95%', maxWidth: '1100px', borderRadius: '32px', padding: '2.5rem', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} className="hide-scrollbar">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{showDetailsModal.name}</h3>
                                <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hash size={16} /> ID: {showDetailsModal.id}</span>
                                    <span>•</span>
                                    <span style={{
                                        padding: '0.2rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem',
                                        background: showDetailsModal.status === 'Published' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                        color: showDetailsModal.status === 'Published' ? 'var(--success)' : 'var(--text-tertiary)'
                                    }}>{showDetailsModal.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailsModal(null)} style={{ background: 'var(--bg-app)', border: 'none', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text-tertiary)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
                            {/* Left Column: Stats and Questions */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Stats Row */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            <Clock size={14} /> Time
                                        </div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                                            {showDetailsModal.config.timeMode === 'question' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '1.1rem' }}>Totally {formatDurationDetailed(showDetailsModal.totalQuestions * (showDetailsModal.config.timeUnit === 'sec' ? showDetailsModal.config.timeValue : showDetailsModal.config.timeValue * 60), 'sec')}</span>
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({showDetailsModal.totalQuestions} questions x {showDetailsModal.config.timeValue} {showDetailsModal.config.timeUnit.toUpperCase()} /per question)</span>
                                                </div>
                                            ) : (
                                                `${showDetailsModal.config.timeValue} ${showDetailsModal.config.timeUnit.toUpperCase()}`
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                            {showDetailsModal.config.timeMode === 'full' ? 'Total Duration' : 'Layout-Based Duration'}
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                            <Layers size={14} /> Layout
                                        </div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                                            {showDetailsModal.config.examMode === 'scroll' ? 'SCROLL' : 'STEP'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                            Layout Mode
                                        </div>
                                    </div>
                                    <div style={{ background: 'var(--primary-light)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--primary-border)', gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}>
                                            <Users size={24} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
                                                {showDetailsModal.studentCount}
                                            </div>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>
                                                Candidates Total
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Batch Overview Section */}
                                <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={18} color="var(--primary)" /> SCHEDULED BATCHES
                                    </h4>
                                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }} className="hide-scrollbar">
                                        {showDetailsModal.studentGroups?.map((group, idx) => (
                                            <div key={idx} style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                        <Calendar size={16} color="var(--primary)" /> {group.examDate || 'No Date Set'}
                                                    </div>
                                                    <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.625rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                        {(group.students?.length || group.studentIds?.length) || 0} Students
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    {group.students?.map((s, sIdx) => (
                                                        <span key={sIdx} style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-app)', padding: '0.25rem 0.625rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                            {s.name}
                                                        </span>
                                                    )) || <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, fontStyle: 'italic' }}>No detailed student names available in this batch view.</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {(!showDetailsModal.studentGroups || showDetailsModal.studentGroups.length === 0) && (
                                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>No batches scheduled yet.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Examination Questions Section */}
                                <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <List size={18} color="var(--primary)" /> EXAMINATION QUESTIONS
                                    </h4>
                                    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }} className="hide-scrollbar">
                                        {showDetailsModal.config.selectionMode === 'manual' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {showDetailsModal.config.manualQuestions?.map((q, idx) => (
                                                    <div key={idx} style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{q.categoryName || 'Uncategorized'}</div>
                                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{q.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {showDetailsModal.config.categories?.map((cat, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'var(--bg-surface)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                                        <span style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--text-primary)' }}>{cat.name}</span>
                                                        <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 900 }}>{cat.count} Questions</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Student Access Codes */}
                            <div style={{ background: 'var(--bg-app)', padding: '1.75rem', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                        <Key size={20} color="var(--primary)" /> STUDENT ACCESS CODES
                                    </h4>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <button
                                            onClick={() => setAddTimeModal({
                                                testId: showDetailsModal.id,
                                                studentIds: studentCodes.map(c => c.studentId).filter(Boolean),
                                                extraTime: 15,
                                                comment: '',
                                                isUsedStatus: studentCodes.some(c => c.status === 'USED')
                                            })}
                                            style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.4rem 0.75rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800, border: '1px solid var(--primary-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        >
                                            <Clock size={14} /> Add Time to All
                                        </button>
                                        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-tertiary)', padding: '0.4rem 0.75rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 800 }}>
                                            {studentCodes.length} Generated
                                        </div>
                                    </div>
                                </div>

                                <div style={{ flex: 1, maxHeight: '600px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }} className="hide-scrollbar">
                                    {fetchingCodes ? (
                                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ width: '32px', height: '32px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                            <span style={{ fontWeight: 600 }}>Fetching Secure Access Codes...</span>
                                        </div>
                                    ) : studentCodes.length > 0 ? (
                                        studentCodes.map((codeData, idx) => (
                                            <div key={idx} style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-border)'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.15rem' }}>{codeData.studentName}</div>
                                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.4rem' }}>{codeData.studentEmail}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                        <Calendar size={12} /> Scheduled: {codeData.examDate}
                                                    </div>
                                                    {codeData.additionalTime > 0 && (
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                            <Clock size={12} /> +{codeData.additionalTime} mins extra
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.625rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAddTimeModal({
                                                                    testId: showDetailsModal.id,
                                                                    studentIds: [codeData.studentId],
                                                                    extraTime: 15,
                                                                    comment: '',
                                                                    isUsedStatus: codeData.status === 'USED'
                                                                });
                                                            }}
                                                            title="Add Extra Time"
                                                            style={{ border: 'none', background: 'var(--bg-app)', color: 'var(--primary)', padding: '0.5rem 0.75rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)' }}
                                                        >
                                                            <Clock size={14} /> <Plus size={12} />
                                                        </button>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em', background: 'var(--primary-light)', padding: '0.4rem 1rem', borderRadius: '12px', border: '1px solid var(--primary-border)', minWidth: '100px', textAlign: 'center' }}>
                                                            {codeData.examCode}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.65rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '6px', textTransform: 'uppercase',
                                                        background: codeData.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : codeData.status === 'USED' ? 'rgba(107,114,128,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: codeData.status === 'ACTIVE' ? 'var(--success)' : codeData.status === 'USED' ? 'var(--text-tertiary)' : 'var(--error)',
                                                        border: `1px solid ${codeData.status === 'ACTIVE' ? 'rgba(34,197,94,0.2)' : 'transparent'}`
                                                    }}>
                                                        {codeData.status}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.94rem', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px dashed var(--border)' }}>
                                            <Key size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                            <div>No student codes available for this examination.</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Add Time Modal (Nested/Overlay) */}
                        {addTimeModal && (
                            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
                                <div style={{ background: 'white', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={24} color="var(--primary)" /> Add Extra Time
                                    </h3>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
                                        Grant additional minutes to {addTimeModal.studentIds.length === 1 ? 'this student' : `${addTimeModal.studentIds.length} students`}.
                                    </p>

                                    {addTimeModal.isUsedStatus && (
                                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', color: 'var(--primary)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, fontSize: '0.8125rem' }}>
                                                <XCircle size={16} /> RE-OPENING NOTICE
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.9 }}>
                                                This will professionally re-activate the finished exam session for this student.
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Extra Minutes</label>
                                            <input
                                                type="number"
                                                value={addTimeModal.extraTime}
                                                onChange={e => setAddTimeModal({ ...addTimeModal, extraTime: e.target.value })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '2px solid var(--border)', outline: 'none', fontSize: '1rem', fontWeight: 700 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Comment / Reason</label>
                                            <textarea
                                                rows="3"
                                                value={addTimeModal.comment}
                                                onChange={e => setAddTimeModal({ ...addTimeModal, comment: e.target.value })}
                                                placeholder="e.g., Technical issue delay"
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '2px solid var(--border)', outline: 'none', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                        <button onClick={() => setAddTimeModal(null)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--bg-app)', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                                        <button onClick={handleAddTime} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Apply Time</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem' }}>
                            <button
                                onClick={() => setShowDetailsModal(null)}
                                style={{ flex: 1, padding: '1.125rem', borderRadius: '18px', background: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: 800, border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    handleEditTest(showDetailsModal);
                                    setShowDetailsModal(null);
                                }}
                                style={{ flex: 2, padding: '1.125rem', borderRadius: '18px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(var(--primary-rgb), 0.25)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <Edit2 size={18} /> Modify Examination
                            </button>
                        </div>
                    </div>
                </div>
            )
            }
            {/* Delete Confirmation Modal */}
            {
                deleteConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, animation: 'fadeIn 0.2s' }}>
                        <div style={{ background: 'var(--bg-surface)', width: '90%', maxWidth: '400px', borderRadius: '24px', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '1px solid var(--border)', textAlign: 'center', animation: 'scaleUp 0.3s ease-out' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <Trash2 size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Delete Examination?</h3>
                            <p style={{ fontSize: '0.94rem', color: 'var(--text-tertiary)', marginBottom: '2rem', lineHeight: 1.5 }}>
                                Are you sure you want to delete <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>"{deleteConfirm.name}"</span>? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{ flex: 1, padding: '0.875rem', borderRadius: '14px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleDeleteTest(deleteConfirm.id)}
                                    style={{ flex: 1, padding: '0.875rem', borderRadius: '14px', border: 'none', background: 'var(--error)', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    Delete Test
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div >
    );
};

export default CreateTest;
