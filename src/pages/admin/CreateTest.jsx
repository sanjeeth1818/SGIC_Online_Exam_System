import React, { useState, useEffect, useMemo } from 'react';
import {
    Search, Plus, Filter, Calendar, Clock, Copy, Edit2, Trash2,
    Play, XCircle, Eye, FileText, Check, Users, List, Settings,
    ArrowLeft, ArrowRight, Layers, Globe, Key, FilePlus, LayoutDashboard
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
    const [editCategories, setEditCategories] = useState([]);
    const [expandedCategory, setExpandedCategory] = useState(null); // To track which folder is open

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
        }
    };

    const fetchData = async () => {
        try {
            const [catRes, testRes] = await Promise.all([
                fetch('http://localhost:8080/api/categories'),
                fetch('http://localhost:8080/api/tests')
            ]);

            if (!catRes.ok || !testRes.ok) throw new Error('Failed to fetch data');

            const catData = await catRes.json();
            const testDataFromBackend = await testRes.json();

            setCategories(catData.map(c => ({
                id: c.id,
                name: c.name,
                available: c.questionCount || 0,
                selected: false,
                count: Math.min(c.questionCount || 0, 10)
            })));

            setPastTests(testDataFromBackend.map(t => {
                const groups = t.studentGroups || [];
                const examDates = groups.map(g => g.examDate).filter(Boolean).sort();
                let displayDate = 'N/A';
                if (examDates.length === 1) displayDate = examDates[0];
                else if (examDates.length > 1) displayDate = 'Multiple Dates';

                return {
                    id: (t.id || '').toString(),
                    testCode: t.testCode,
                    name: t.name,
                    description: t.description || '',
                    date: displayDate,
                    studentGroups: groups,
                    status: t.status,
                    totalQuestions: t.totalQuestions,
                    duration: `${t.timeValue} ${t.timeUnit}`,
                    studentCount: t.studentCount || 0,
                    config: {
                        selectionMode: t.selectionMode,
                        manualQuestions: t.manualQuestions || [],
                        timeMode: t.timeMode,
                        timeValue: t.timeValue,
                        timeUnit: t.timeUnit,
                        examMode: t.examMode,
                        showResult: t.showResult,
                        showAnswers: t.showAnswers,
                        categories: t.categoryConfigs.map(cc => ({
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
            const res = await fetch('http://localhost:8080/api/questions');
            if (res.ok) {
                const data = await res.json();
                setAllQuestions(data);
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
            const res = await fetch('http://localhost:8080/api/students');
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter(s =>
                    (s.status || '').toUpperCase() === 'PENDING EXAM' ||
                    (s.status || '').toUpperCase() === 'HAVE TO RESCHEDULE'
                );
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
        } else {
            setStudentCodes([]);
        }
    }, [showDetailsModal]);

    const fetchStudentCodes = async (testId) => {
        setFetchingCodes(true);
        try {
            const res = await fetch(`http://localhost:8080/api/tests/${testId}/student-codes`);
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
            t.date.toLowerCase().includes(manageSearchTerm.toLowerCase()) ||
            (t.testCode && t.testCode.toLowerCase().includes(manageSearchTerm.toLowerCase()))
        )
        .sort((a, b) => {
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
            const res = await fetch(`http://localhost:8080/api/tests/${id}/status`, {
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

    const handleDeleteTest = async (id) => {
        if (!window.confirm('Are you sure you want to delete this test?')) return;
        try {
            const res = await fetch(`http://localhost:8080/api/tests/${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            setNotification({ type: 'success', message: 'Test deleted successfully!' });
            fetchData();
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to delete test.' });
        }
    };

    const handleEditTest = (t) => {
        // Open edit modal with test data
        setEditModalData({
            id: t.id,
            name: t.name,
            description: t.description || '',
            selectionMode: t.selectionMode || 'random',
            manualQuestionIds: t.manualQuestions ? t.manualQuestions.map(q => q.id) : [],
            studentGroups: t.studentGroups ? t.studentGroups.map(g => ({
                id: g.id,
                examDate: g.examDate,
                students: g.students || []
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
    };

    const handleUpdateTest = async () => {
        if (!editModalData) return;
        const selectedQuestionsCount = editModalData.selectionMode === 'random'
            ? editCategories.filter(c => c.selected).reduce((sum, c) => sum + c.count, 0)
            : editModalData.manualQuestionIds?.length || 0;

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
            const res = await fetch(`http://localhost:8080/api/tests/${editModalData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update test');
            setNotification({ type: 'success', message: 'Test Updated Successfully!' });
            fetchData();
            setEditModalData(null);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to update test.' });
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
            status: testData.activateImmediately ? 'Published' : 'Draft',
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
            const res = await fetch('http://localhost:8080/api/tests', {
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
                setNotification({ type: 'error', message: 'Failed to create examination.' });
            }
        } catch (error) {
            console.error('Error publishing test:', error);
            setNotification({ type: 'error', message: 'An error occurred while publishing.' });
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
                    background: 'var(--success)', color: 'white',
                    padding: '1rem 2rem', borderRadius: '18px',
                    boxShadow: '0 10px 30px rgba(34, 197, 94, 0.3)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <Check size={20} />
                    <span style={{ fontWeight: 600 }}>{notification.message}</span>
                </div>
            )}

            {/* Header and Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Examinations</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.06rem' }}>Create results-driven tests or manage existing ones.</p>
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
                                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test Name</label>
                                        <input
                                            type="text"
                                            value={testData.name}
                                            onChange={e => setTestData({ ...testData, name: e.target.value })}
                                            placeholder="e.g. Midterm Physics Examination"
                                            style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '14px', border: '2px solid var(--border)', fontSize: '1rem', outline: 'none', transition: 'all 0.2s', background: 'var(--bg-app)' }}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                                        <textarea
                                            rows="4"
                                            value={testData.description}
                                            onChange={e => setTestData({ ...testData, description: e.target.value })}
                                            placeholder="Briefly describe the test objectives..."
                                            style={{ width: '100%', padding: '0.875rem 1.25rem', borderRadius: '14px', border: '2px solid var(--border)', fontSize: '1rem', outline: 'none', resize: 'none', fontFamily: 'inherit', transition: 'all 0.2s', background: 'var(--bg-app)' }}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div style={{ animation: 'fadeIn 0.3s ease-in-out', flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}><List size={24} color="var(--primary)" /> Question Selection</h2>
                                        <div style={{ display: 'flex', background: 'var(--bg-app)', padding: '0.375rem', borderRadius: '12px', border: '1px solid var(--border)', marginTop: '1rem', width: 'fit-content' }}>
                                            <button
                                                onClick={() => setTestData({ ...testData, selectionMode: 'random' })}
                                                style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: testData.selectionMode === 'random' ? 'var(--primary)' : 'transparent', color: testData.selectionMode === 'random' ? 'white' : 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                            >Random Pick</button>
                                            <button
                                                onClick={() => setTestData({ ...testData, selectionMode: 'manual' })}
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
                                                                        else setSelectedQuestionIds(prev => [...prev, q.id]);
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
                                                                        <div style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4 }}>{q.text}</div>
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

                                            <div style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--bg-surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                                <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exam Date</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Calendar size={18} color="var(--primary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                                    <input
                                                        type="date"
                                                        value={group.examDate}
                                                        onChange={e => {
                                                            const newGroups = [...studentGroups];
                                                            newGroups[groupIndex].examDate = e.target.value;
                                                            setStudentGroups(newGroups);
                                                        }}
                                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '2px solid var(--border)', outline: 'none', fontSize: '0.94rem', fontWeight: 600 }}
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                                    <label style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ASSIGN STUDENTS ({group.studentIds.length})</label>
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
                                                                        <div style={{ display: 'inline-flex', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, background: student.status === 'HAVE TO RESCHEDULE' ? 'var(--error-light)' : 'var(--primary-light)', color: student.status === 'HAVE TO RESCHEDULE' ? 'var(--error)' : 'var(--primary)' }}>{student.status?.toUpperCase()}</div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
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
                                    {/* Time Configuration Card */}
                                    <div style={{ border: '1px solid var(--border)', padding: '2rem', borderRadius: '20px', background: 'var(--bg-app)', position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Time Limitation</h3>
                                            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.375rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                {['mins', 'secs', 'hours'].map(u => (
                                                    <button
                                                        key={u}
                                                        onClick={() => setTestData({ ...testData, timeUnit: u })}
                                                        style={{
                                                            padding: '0.375rem 0.75rem', borderRadius: '8px', border: 'none',
                                                            background: testData.timeUnit === u ? 'var(--primary)' : 'transparent',
                                                            color: testData.timeUnit === u ? 'white' : 'var(--text-tertiary)',
                                                            fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {u.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.94rem', fontWeight: 600 }}>
                                                    <input type="radio" name="time" checked={testData.timeMode === 'full'} onChange={() => setTestData({ ...testData, timeMode: 'full' })} style={{ width: '18px', height: '18px' }} />
                                                    Whole Test Duration
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.94rem', fontWeight: 600 }}>
                                                    <input
                                                        type="radio"
                                                        name="time"
                                                        checked={testData.timeMode === 'question'}
                                                        onChange={() => setTestData({
                                                            ...testData,
                                                            timeMode: 'question',
                                                            examMode: 'step' // Force step mode
                                                        })}
                                                        style={{ width: '18px', height: '18px' }}
                                                    />
                                                    Limit Per Question
                                                </label>
                                            </div>
                                            <div style={{ width: '140px' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={testData.timeValue}
                                                        onChange={e => setTestData({ ...testData, timeValue: e.target.value })}
                                                        style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '14px', border: '2px solid var(--border)', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', color: 'var(--primary)', outline: 'none' }}
                                                    />
                                                    <div style={{ position: 'absolute', bottom: '-20px', left: 0, right: 0, textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{testData.timeUnit}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visibility Card */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', background: 'var(--bg-app)' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Eye size={18} color="var(--primary)" /> Results & Visibility</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Reveal Result Immediately</span>
                                                    <div
                                                        onClick={() => {
                                                            const newVal = !testData.showResult;
                                                            setTestData({
                                                                ...testData,
                                                                showResult: newVal,
                                                                showAnswers: newVal ? testData.showAnswers : false
                                                            });
                                                        }}
                                                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: testData.showResult ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', padding: '2px' }}
                                                    >
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', left: testData.showResult ? '22px' : '2px', transition: 'all 0.2s' }} />
                                                    </div>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: testData.showResult ? 'pointer' : 'not-allowed', opacity: testData.showResult ? 1 : 0.5 }}>
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Show Correct Answers</span>
                                                    <div
                                                        onClick={() => testData.showResult && setTestData({ ...testData, showAnswers: !testData.showAnswers })}
                                                        style={{ width: '44px', height: '24px', borderRadius: '12px', background: testData.showAnswers ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', padding: '2px' }}
                                                    >
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', left: testData.showAnswers ? '22px' : '2px', transition: 'all 0.2s' }} />
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <div style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', background: 'var(--bg-app)' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={18} color="var(--primary)" /> Activation</h3>
                                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                                <div>
                                                    <div style={{ fontWeight: 800, color: testData.activateImmediately ? 'var(--success)' : 'var(--text-secondary)' }}>ACTIVATE NOW</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Students can take test right after publishing</div>
                                                </div>
                                                <div
                                                    onClick={() => setTestData({ ...testData, activateImmediately: !testData.activateImmediately })}
                                                    style={{ width: '44px', height: '24px', borderRadius: '12px', background: testData.activateImmediately ? 'var(--success)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'white', position: 'absolute', left: testData.activateImmediately ? '22px' : '2px', transition: 'all 0.2s' }} />
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Layout Card */}
                                    <div style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', background: 'var(--bg-app)' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers size={18} color="var(--primary)" /> Layout Strategy</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <button
                                                onClick={() => testData.timeMode !== 'question' && setTestData({ ...testData, examMode: 'scroll' })}
                                                disabled={testData.timeMode === 'question'}
                                                style={{
                                                    padding: '1rem', borderRadius: '14px', border: `2px solid ${testData.examMode === 'scroll' ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: testData.examMode === 'scroll' ? 'var(--primary-light)' : 'transparent',
                                                    color: testData.examMode === 'scroll' ? 'var(--primary)' : 'var(--text-secondary)',
                                                    fontWeight: 700, fontSize: '0.875rem', cursor: testData.timeMode === 'question' ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: testData.timeMode === 'question' ? 0.5 : 1
                                                }}
                                            >
                                                Scroll Mode (Full Page)
                                            </button>
                                            <button
                                                onClick={() => setTestData({ ...testData, examMode: 'step' })}
                                                style={{ padding: '1rem', borderRadius: '14px', border: `2px solid ${testData.examMode === 'step' ? 'var(--primary)' : 'var(--border)'}`, background: testData.examMode === 'step' ? 'var(--primary-light)' : 'transparent', color: testData.examMode === 'step' ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
                                            >
                                                Step Mode (Pagination)
                                            </button>
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
                                    if (step < 4) setStep(s => s + 1);
                                    else handlePublish();
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '1rem 2.5rem', borderRadius: '16px',
                                    fontWeight: 800, color: 'white', background: step === 4 ? 'var(--success)' : 'var(--primary)',
                                    border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                {step === 4 ? 'Publish Examination' : 'Save & Continue'} {step < 4 && <ArrowRight size={20} />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Filters and Search Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                {['All', 'Published', 'Draft', 'Expired'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilterStatus(status)}
                                        style={{
                                            padding: '0.625rem 1.25rem',
                                            borderRadius: '12px',
                                            border: `2px solid ${filterStatus === status ? 'var(--primary)' : 'transparent'}`,
                                            background: filterStatus === status ? 'var(--primary-light)' : 'var(--bg-app)',
                                            color: filterStatus === status ? 'var(--primary)' : 'var(--text-secondary)',
                                            fontWeight: 700,
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={e => { if (filterStatus !== status) e.currentTarget.style.borderColor = 'var(--border)' }}
                                        onMouseLeave={e => { if (filterStatus !== status) e.currentTarget.style.borderColor = 'transparent' }}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-app)', padding: '0.375rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
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
                                                padding: '0.5rem 0.875rem',
                                                borderRadius: '10px',
                                                border: 'none',
                                                background: sortBy === sort ? 'var(--bg-surface)' : 'transparent',
                                                color: sortBy === sort ? 'var(--primary)' : 'var(--text-tertiary)',
                                                fontWeight: 800,
                                                fontSize: '0.8125rem',
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
                                <div style={{ position: 'relative', width: '280px' }}>
                                    <Search size={18} color="var(--text-tertiary)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or code..."
                                        value={manageSearchTerm}
                                        onChange={e => setManageSearchTerm(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '14px', border: '2px solid var(--border)', background: 'var(--bg-app)', outline: 'none', fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s' }}
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
                                <div key={t.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                                <div style={{
                                                    padding: '0.25rem 0.625rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    background: t.status === 'Published' ? 'rgba(34, 197, 94, 0.1)' : t.status === 'Expired' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(107, 114, 128,0.1)',
                                                    color: t.status === 'Published' ? 'var(--success)' : t.status === 'Expired' ? 'var(--error)' : 'var(--text-tertiary)'
                                                }}>
                                                    {t.status}
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={16} color="var(--primary)" />
                                            <div>
                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Duration</div>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.duration}</div>
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
                                            Unique Student Codes Only
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.375rem' }}>
                                            {t.status === 'Draft' && (
                                                <button
                                                    onClick={() => handleStatusChange(t.id, 'Published')}
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
                                                    onClick={() => handleStatusChange(t.id, 'Expired')}
                                                    title="Expire Test"
                                                    style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = 'white'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = 'var(--error)'; }}
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleEditTest(t)}
                                                title="Edit Test"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--bg-app)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setShowDetailsModal(t)}
                                                title="View Details"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTest(t.id)}
                                                title="Delete Test"
                                                style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: 'var(--bg-app)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--error)'; e.currentTarget.style.color = 'white'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--error)'; }}
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
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px dashed var(--border)', fontSize: '0.875rem' }}>
                                                        <span style={{ fontWeight: 600 }}>{group.examDate || 'No Date'}</span>
                                                        <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{group.studentIds?.length || 0} Students</span>
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
                                                onChange={e => setQuestionSearchTerm(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', background: 'var(--bg-surface)' }}
                                            />
                                        </div>
                                        <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-surface)' }} className="hide-scrollbar">
                                            {allQuestions
                                                .filter(q => q.text.toLowerCase().includes(questionSearchTerm.toLowerCase()))
                                                .map(q => (
                                                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => {
                                                        const current = editModalData.manualQuestionIds || [];
                                                        const updated = current.includes(q.id) ? current.filter(id => id !== q.id) : [...current, q.id];
                                                        setEditModalData({ ...editModalData, manualQuestionIds: updated });
                                                    }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${editModalData.manualQuestionIds?.includes(q.id) ? 'var(--primary)' : 'var(--border)'}`, background: editModalData.manualQuestionIds?.includes(q.id) ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {editModalData.manualQuestionIds?.includes(q.id) && <Check size={14} color="white" />}
                                                        </div>
                                                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>{q.text}</div>
                                                    </div>
                                                ))}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)', textAlign: 'right' }}>
                                            {editModalData.manualQuestionIds?.length || 0} Questions Selected
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
                                                    <input
                                                        type="date"
                                                        value={group.examDate}
                                                        onChange={e => {
                                                            const newGroups = [...editModalData.studentGroups];
                                                            newGroups[gIdx].examDate = e.target.value;
                                                            setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                        }}
                                                        style={{ border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const newGroups = editModalData.studentGroups.filter((_, i) => i !== gIdx);
                                                        setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                    }}
                                                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                                {group.students?.map((s, sIdx) => (
                                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600 }}>
                                                        {s.name}
                                                        <XCircle size={14} color="var(--text-tertiary)" style={{ cursor: 'pointer' }} onClick={() => {
                                                            const newGroups = [...editModalData.studentGroups];
                                                            newGroups[gIdx].students = newGroups[gIdx].students.filter((_, i) => i !== sIdx);
                                                            setEditModalData({ ...editModalData, studentGroups: newGroups });
                                                        }} />
                                                    </div>
                                                ))}
                                            </div>

                                            <select
                                                onChange={e => {
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
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '0.8125rem', background: 'var(--bg-app)' }}
                                            >
                                                <option value="">+ Add Student to this batch...</option>
                                                {availableStudents
                                                    .filter(s => !group.students.some(gs => gs.id === s.id))
                                                    .map(s => (
                                                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                                    ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Configuration Section */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.75rem', border: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}><Settings size={18} color="var(--primary)" /> Configuration</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    {/* Time */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Limit</label>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input type="number" value={editModalData.timeValue} onChange={e => setEditModalData({ ...editModalData, timeValue: e.target.value })} style={{ width: '70px', padding: '0.625rem', borderRadius: '10px', border: '2px solid var(--border)', fontSize: '1.06rem', fontWeight: 800, textAlign: 'center', color: 'var(--primary)', outline: 'none', background: 'var(--bg-surface)' }} />
                                            <div style={{ display: 'flex', background: 'var(--bg-surface)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                                {['mins', 'secs', 'hours'].map(u => (
                                                    <button key={u} onClick={() => setEditModalData({ ...editModalData, timeUnit: u })} style={{ padding: '0.375rem 0.625rem', borderRadius: '7px', border: 'none', background: editModalData.timeUnit === u ? 'var(--primary)' : 'transparent', color: editModalData.timeUnit === u ? 'white' : 'var(--text-tertiary)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                                                        {u.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                <input type="radio" name="editTime" checked={editModalData.timeMode === 'full'} onChange={() => setEditModalData({ ...editModalData, timeMode: 'full' })} style={{ width: '16px', height: '16px' }} />
                                                Whole Test
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                                                <input
                                                    type="radio"
                                                    name="editTime"
                                                    checked={editModalData.timeMode === 'question'}
                                                    onChange={() => setEditModalData({
                                                        ...editModalData,
                                                        timeMode: 'question',
                                                        examMode: 'step' // Force step mode in edit modal too
                                                    })}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                Per Question
                                            </label>
                                        </div>
                                    </div>

                                    {/* Layout & Toggles */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        <label style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Layout Mode</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {['scroll', 'step'].map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => (mode === 'step' || editModalData.timeMode !== 'question') && setEditModalData({ ...editModalData, examMode: mode })}
                                                    style={{
                                                        flex: 1, padding: '0.625rem',
                                                        borderRadius: '10px',
                                                        border: `2px solid ${editModalData.examMode === mode ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: editModalData.examMode === mode ? 'var(--primary-light)' : 'transparent',
                                                        color: editModalData.examMode === mode ? 'var(--primary)' : 'var(--text-tertiary)',
                                                        fontWeight: 700, fontSize: '0.8125rem',
                                                        cursor: (mode === 'scroll' && editModalData.timeMode === 'question') ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        opacity: (mode === 'scroll' && editModalData.timeMode === 'question') ? 0.5 : 1
                                                    }}
                                                >
                                                    {mode === 'scroll' ? 'Scroll' : 'Step'}
                                                </button>
                                            ))}
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.5rem' }}>
                                            <div
                                                onClick={() => {
                                                    const newVal = !editModalData.showResult;
                                                    setEditModalData({
                                                        ...editModalData,
                                                        showResult: newVal,
                                                        showAnswers: newVal ? editModalData.showAnswers : false
                                                    });
                                                }}
                                                style={{ width: '40px', height: '22px', borderRadius: '11px', background: editModalData.showResult ? 'var(--primary)' : 'var(--border)', position: 'relative', transition: 'all 0.2s', cursor: 'pointer', padding: '2px' }}
                                            >
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', left: editModalData.showResult ? '20px' : '2px', transition: 'all 0.2s' }} />
                                            </div>
                                            Show Results
                                        </label>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            cursor: editModalData.showResult ? 'pointer' : 'not-allowed',
                                            fontSize: '0.8125rem',
                                            fontWeight: 600,
                                            opacity: editModalData.showResult ? 1 : 0.5
                                        }}>
                                            <div
                                                onClick={() => editModalData.showResult && setEditModalData({ ...editModalData, showAnswers: !editModalData.showAnswers })}
                                                style={{
                                                    width: '40px',
                                                    height: '22px',
                                                    borderRadius: '11px',
                                                    background: editModalData.showAnswers ? 'var(--primary)' : 'var(--border)',
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                    cursor: editModalData.showResult ? 'pointer' : 'not-allowed',
                                                    padding: '2px'
                                                }}
                                            >
                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', left: editModalData.showAnswers ? '20px' : '2px', transition: 'all 0.2s' }} />
                                            </div>
                                            Show Answers
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div style={{ background: 'var(--bg-app)', borderRadius: '20px', padding: '1.25rem 1.75rem', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>Status</div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['Published', 'Draft', 'Expired'].map(s => (
                                        <button key={s} onClick={() => setEditModalData({ ...editModalData, status: s })} style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: `2px solid ${editModalData.status === s ? (s === 'Published' ? 'var(--success)' : s === 'Expired' ? 'var(--error)' : 'var(--border)') : 'var(--border)'}`, background: editModalData.status === s ? (s === 'Published' ? 'rgba(34,197,94,0.08)' : s === 'Expired' ? 'rgba(239,68,68,0.08)' : 'var(--bg-surface)') : 'transparent', color: editModalData.status === s ? (s === 'Published' ? 'var(--success)' : s === 'Expired' ? 'var(--error)' : 'var(--text-primary)') : 'var(--text-tertiary)', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                                            {s}
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
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, animation: 'fadeIn 0.2s' }}>
                    <div style={{ background: 'var(--bg-surface)', width: '90%', maxWidth: '600px', borderRadius: '28px', padding: '2.5rem', boxShadow: 'var(--shadow-2xl)', border: '1px solid var(--border)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{showDetailsModal.name}</h3>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
                                    <span>ID: {showDetailsModal.id}</span>
                                    <span>•</span>
                                    <span>{showDetailsModal.status}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowDetailsModal(null)} style={{ background: 'var(--bg-app)', border: 'none', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                                <div style={{ background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        <Clock size={14} /> Time
                                    </div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        {showDetailsModal.config.timeValue} {showDetailsModal.config.timeUnit.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                        {showDetailsModal.config.timeMode === 'full' ? 'Total' : 'Per Q'}
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        <Layers size={14} /> Layout
                                    </div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        {showDetailsModal.config.examMode === 'scroll' ? 'SCROLL' : 'STEP'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                        Mode
                                    </div>
                                </div>
                                <div style={{ background: 'var(--primary-light)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--primary-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                        <Users size={14} /> Assigned
                                    </div>
                                    <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)' }}>
                                        {showDetailsModal.studentCount}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>
                                        Total Students
                                    </div>
                                </div>
                            </div>

                            {/* Batches & Access Codes Section */}
                            <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Key size={16} color="var(--primary)" /> STUDENT ACCESS CODES
                                </h4>
                                <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {fetchingCodes ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading codes...</div>
                                    ) : studentCodes.length > 0 ? (
                                        studentCodes.map((codeData, idx) => (
                                            <div key={idx} style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.94rem', color: 'var(--text-primary)' }}>{codeData.studentName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{codeData.studentEmail}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>Scheduled: {codeData.examDate}</div>
                                                </div>
                                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.05em', background: 'var(--primary-light)', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid var(--primary-border)' }}>
                                                        {codeData.examCode}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.6rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px',
                                                        background: codeData.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : codeData.status === 'USED' ? 'rgba(107,114,128,0.1)' : 'rgba(239,68,68,0.1)',
                                                        color: codeData.status === 'ACTIVE' ? 'var(--success)' : codeData.status === 'USED' ? 'var(--text-tertiary)' : 'var(--error)'
                                                    }}>
                                                        {codeData.status.toUpperCase()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>No student codes available.</div>
                                    )}
                                </div>
                            </div>

                            {/* Questions Section */}
                            <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                <h4 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <List size={16} color="var(--primary)" /> EXAMINATION QUESTIONS
                                </h4>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {showDetailsModal.config.selectionMode === 'manual' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {showDetailsModal.config.manualQuestions?.map((q, idx) => (
                                                <div key={idx} style={{ background: 'var(--bg-surface)', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.875rem' }}>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>{q.category?.name || 'Uncategorized'}</div>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{q.text}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {showDetailsModal.config.categories?.map((cat, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.875rem', background: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{cat.name}</span>
                                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{cat.count} Questions</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-tertiary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                                    <List size={14} /> Categories Included
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    {showDetailsModal.config.categories.map(c => (
                                        <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'white', padding: '0.75rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>{c.name}</span>
                                            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.125rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>{c.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                                <button
                                    onClick={() => setShowDetailsModal(null)}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)' }}
                                >
                                    Close Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default CreateTest;
