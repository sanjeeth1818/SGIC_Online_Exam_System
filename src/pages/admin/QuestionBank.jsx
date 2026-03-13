import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, ChevronLeft, Folder, HelpCircle, Check, X, AlertTriangle, Upload, FileText, Download, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

const QuestionBank = () => {
    const [categories, setCategories] = useState([]);
    const [questions, setQuestions] = useState([]);

    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Active', 'Inactive'

    const [questionForm, setQuestionForm] = useState({
        type: 'MCQ',
        categoryId: '',
        text: '',
        options: ['', '', '', ''],
        correct: ''
    });

    const [notification, setNotification] = useState(null);

    // Bulk Upload State
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedExportCategories, setSelectedExportCategories] = useState([]);

    const fetchData = async () => {
        try {
            const [catRes, questRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/questions')
            ]);

            if (!catRes.ok || !questRes.ok) throw new Error('Failed to fetch data');

            const catData = await catRes.json();
            const questData = await questRes.json();

            setCategories(catData);
            // Transform backend Question (with category object) to frontend mapping
            setQuestions(questData.map(q => ({
                id: q.id,
                categoryId: q.category.id,
                type: q.type,
                text: q.text,
                options: q.options,
                correct: q.correctAnswer,
                status: q.status || 'Active'
            })));
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Could not connect to database.' });
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (isAddModalOpen || isDeleteModalOpen || isBulkUploadOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isAddModalOpen, isDeleteModalOpen, isBulkUploadOpen]);

    const handleAddQuestion = () => {
        setEditingQuestion(null);
        setQuestionForm({
            type: 'MCQ',
            categoryId: selectedCategory ? selectedCategory.id : '',
            text: '',
            options: ['', '', '', ''],
            correct: ''
        });
        setIsAddModalOpen(true);
    };

    const handleEditQuestion = (q) => {
        setEditingQuestion(q);
        setQuestionForm({
            type: q.type,
            categoryId: q.categoryId,
            text: q.text,
            options: q.type === 'MCQ' ? [...q.options] : ['', '', '', ''],
            correct: q.correct
        });
        setIsAddModalOpen(true);
    };

    const handleSaveQuestion = async () => {
        if (!questionForm.text || !questionForm.categoryId || !questionForm.correct) return;

        const backendPayload = {
            categoryId: parseInt(questionForm.categoryId),
            text: questionForm.text,
            type: questionForm.type,
            options: questionForm.type === 'MCQ' ? questionForm.options : [],
            correctAnswer: questionForm.correct
        };

        try {
            if (editingQuestion) {
                const res = await fetch(`/api/questions/${editingQuestion.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backendPayload)
                });
                if (!res.ok) throw new Error('Failed to update');
                setNotification({ type: 'success', message: 'Question updated successfully!' });
            } else {
                const res = await fetch('/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(backendPayload)
                });
                if (res.status === 409) {
                    const errData = await res.json();
                    setNotification({ type: 'error', message: errData.message || 'Duplicate question detected in this category.' });
                    return; // Keep the modal open so admin can correct
                }
                if (!res.ok) throw new Error('Failed to create');
                setNotification({ type: 'success', message: 'Question added successfully!' });
            }
            fetchData();
            setIsAddModalOpen(false);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to save question.' });
        }
    };

    const confirmDeleteQuestion = (q) => {
        setQuestionToDelete(q);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteQuestion = async () => {
        try {
            const res = await fetch(`/api/questions/${questionToDelete.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete');
            setNotification({ type: 'success', message: 'Question deleted successfully!' });
            fetchData();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to delete question.' });
        }
    };

    const toggleQuestionStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
            const res = await fetch(`/api/questions/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'text/plain' },
                body: newStatus
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchData();
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to update question status.' });
        }
    };

    const handleBulkUpload = async () => {
        if (!uploadFile) return;
        setIsUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', uploadFile);

        try {
            const res = await fetch('/api/questions/bulk-upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setUploadResult(data);
            if (data.successCount > 0) {
                fetchData();
                setNotification({ type: 'success', message: `${data.successCount} questions uploaded!` });
            }
        } catch (error) {
            console.error(error);
            setUploadResult({ success: false, message: 'Failed to upload file.' });
        } finally {
            setIsUploading(false);
        }
    };

    const downloadTemplate = () => {
        const header = 'categoryName,type,text,optionA,optionB,optionC,optionD,correctAnswer';
        const example1 = 'Physics,MCQ,What is Newton\'s first law?,Inertia,Gravity,Friction,Momentum,Inertia';
        const example2 = 'IT,Short,What does CPU stand for?,,,,,Central Processing Unit';
        const csvContent = [header, example1, example2].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'questions_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownload = async () => {
        try {
            let url = '/api/questions/export';
            if (selectedExportCategories.length > 0) {
                const ids = selectedExportCategories.join(',');
                url += `?categoryIds=${ids}`;
            }

            const res = await fetch(url);
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            
            let filename = 'question_bank.csv';
            if (selectedExportCategories.length === 1) {
                const cat = categories.find(c => c.id === selectedExportCategories[0]);
                if (cat) filename = `${cat.name.replace(/\s+/g, '_')}_questions.csv`;
            } else if (selectedExportCategories.length > 1 && selectedExportCategories.length < categories.length) {
                filename = 'selected_categories_questions.csv';
            }

            a.download = filename;
            a.click();
            URL.revokeObjectURL(objectUrl);
            setNotification({ type: 'success', message: 'Question bank exported successfully!' });
            setIsExportModalOpen(false);
        } catch (error) {
            setNotification({ type: 'error', message: 'Failed to export questions.' });
        }
    };

    const openBulkUpload = () => {
        setUploadFile(null);
        setUploadResult(null);
        setIsUploading(false);
        setIsBulkUploadOpen(true);
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredQuestions = questions.filter(q => {
        const cat = categories.find(c => c.id === q.categoryId);
        const matchesCategory = selectedCategory ? q.categoryId === selectedCategory.id : true;
        const matchesSearch = q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cat && cat.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'All' ? true : q.status === statusFilter;
        return matchesCategory && matchesSearch && matchesStatus;
    });

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', position: 'relative' }}>
            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem',
                    background: 'var(--success)', color: 'white',
                    padding: '1rem 2rem', borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <Check size={20} />
                    <span style={{ fontWeight: 500 }}>{notification.message}</span>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    {selectedCategory && (
                        <button
                            onClick={() => {
                                setSelectedCategory(null);
                                setSearchTerm('');
                                setStatusFilter('All');
                            }}
                            style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                border: '1px solid var(--border)', background: 'var(--bg-surface)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s',
                                color: 'var(--text-secondary)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                            <ChevronLeft size={22} />
                        </button>
                    )}
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {selectedCategory ? selectedCategory.name : 'Question Bank'}
                        </h1>

                    </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{
                        position: 'relative', display: 'flex', alignItems: 'center'
                    }}>
                        <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder={selectedCategory ? `Search questions in ${selectedCategory.name}...` : "Search categories..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '0.75rem 1rem 0.75rem 2.75rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-surface)',
                                width: '280px',
                                outline: 'none',
                                fontSize: '0.875rem',
                                transition: 'all 0.2s'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        />
                    </div>
                    <button
                        id="download-question-bank-btn"
                        onClick={() => {
                            if (selectedCategory) {
                                setSelectedExportCategories([selectedCategory.id]);
                            } else {
                                setSelectedExportCategories(categories.map(c => c.id));
                            }
                            setIsExportModalOpen(true);
                        }}
                        title="Download Question Bank"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            background: 'var(--bg-surface)', color: 'var(--text-primary)',
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                            fontWeight: 700, transition: 'all 0.2s',
                            border: '1px solid var(--border)', cursor: 'pointer'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.color = '#10b981'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    >
                        <Download size={18} />
                        Download CSV
                    </button>
                    <button
                        onClick={openBulkUpload}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            background: 'var(--bg-surface)', color: 'var(--text-primary)',
                            padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                            fontWeight: 700, transition: 'all 0.2s',
                            border: '1px solid var(--border)', cursor: 'pointer'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                    >
                        <Upload size={18} />
                        Upload CSV
                    </button>
                    <button
                        onClick={handleAddQuestion}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.625rem',
                            background: 'var(--primary)', color: 'white',
                            padding: '0.75rem 1.75rem', borderRadius: 'var(--radius-md)',
                            fontWeight: 700, transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
                    >
                        <Plus size={20} />
                        Add Question
                    </button>
                </div>
            </div>

            {/* Main Content View */}
            {!selectedCategory ? (
                // Category Cards Landing
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {filteredCategories.map(cat => (
                        <div
                            key={cat.id}
                            onClick={() => {
                                setSelectedCategory(cat);
                                setSearchTerm('');
                            }}
                            style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '24px',
                                padding: '1.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1.5rem',
                                height: '180px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.06)';
                                e.currentTarget.style.borderColor = cat.color;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            }}
                        >
                            <div style={{
                                width: '72px', height: '72px',
                                background: `${cat.color}15`,
                                color: cat.color, borderRadius: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.3s ease'
                            }}>
                                <Folder size={32} fill="currentColor" fillOpacity={0.1} />
                            </div>

                            <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
                                <h3 style={{
                                    fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem',
                                    color: 'var(--text-primary)', lineHeight: 1.2,
                                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                }}>
                                    {cat.name}
                                </h3>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    background: `${cat.color}08`,
                                    padding: '0.4rem 0.9rem',
                                    borderRadius: '100px',
                                    width: 'fit-content',
                                    marginBottom: '0.5rem'
                                }}>
                                    <span style={{
                                        color: `${cat.color}aa`,
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.03em'
                                    }}>
                                        {cat.questionCount} Total
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            {questions.filter(q => q.categoryId === cat.id && q.status === 'Active').length} Active
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                            {questions.filter(q => q.categoryId === cat.id && q.status === 'Inactive').length} Inactive
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Detailed Question List for Category
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Status Filter Buttons */}
                    <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.5rem' }}>
                        {['All', 'Active', 'Inactive'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                style={{
                                    padding: '0.45rem 1.1rem',
                                    borderRadius: '999px',
                                    border: statusFilter === f
                                        ? `1.5px solid ${f === 'Active' ? '#22c55e' : f === 'Inactive' ? '#ef4444' : 'var(--primary)'}`
                                        : '1.5px solid var(--border)',
                                    background: statusFilter === f
                                        ? f === 'Active' ? '#f0fdf4' : f === 'Inactive' ? '#fef2f2' : 'var(--primary-light)'
                                        : 'var(--bg-surface)',
                                    color: statusFilter === f
                                        ? f === 'Active' ? '#16a34a' : f === 'Inactive' ? '#dc2626' : 'var(--primary)'
                                        : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem'
                                }}
                            >
                                {f !== 'All' && (
                                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: f === 'Active' ? '#22c55e' : '#ef4444' }}></div>
                                )}
                                {f}
                                <span style={{ opacity: 0.7 }}>
                                    ({questions.filter(q => q.categoryId === selectedCategory?.id && (f === 'All' || q.status === f)).length})
                                </span>
                            </button>
                        ))}
                    </div>

                    {filteredQuestions.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '5rem', background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-xl)', border: '1px dashed var(--border)'
                        }}>
                            <HelpCircle size={48} color="var(--text-tertiary)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ color: 'var(--text-secondary)' }}>
                                {statusFilter === 'All'
                                    ? 'No questions found in this category'
                                    : `No ${statusFilter.toLowerCase()} questions in this category`}
                            </h3>
                            {statusFilter === 'All' && (
                                <button
                                    onClick={handleAddQuestion}
                                    style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', marginTop: '1rem', cursor: 'pointer' }}
                                >
                                    Add your first question
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredQuestions.map(q => (
                            <div
                                key={q.id}
                                style={{
                                    background: 'var(--bg-surface)',
                                    borderStyle: 'solid',
                                    borderWidth: '1px 1px 1px 5px',
                                    borderColor: `var(--border) var(--border) var(--border) ${selectedCategory.color}`,
                                    borderRadius: 'var(--radius-xl)', padding: '1.75rem',
                                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)', animation: 'slideUp 0.3s ease-out'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem', background: q.type === 'MCQ' ? 'var(--primary-light)' : 'var(--accent-light)',
                                            color: q.type === 'MCQ' ? 'var(--primary)' : 'var(--accent)',
                                            borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600
                                        }}>
                                            {q.type === 'MCQ' ? 'Multiple Choice' : 'Short Answer'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {/* Active/Inactive Toggle */}
                                        <div
                                            onClick={() => toggleQuestionStatus(q.id, q.status)}
                                            title={q.status === 'Active' ? 'Click to deactivate' : 'Click to activate'}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.35rem 0.75rem',
                                                borderRadius: '999px',
                                                border: `1px solid ${q.status === 'Active' ? '#bbf7d0' : '#fecaca'}`,
                                                background: q.status === 'Active' ? '#f0fdf4' : '#fef2f2',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                userSelect: 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '28px', height: '14px',
                                                background: q.status === 'Active' ? '#22c55e' : '#ef4444',
                                                borderRadius: '999px', position: 'relative',
                                                transition: 'background 0.3s'
                                            }}>
                                                <div style={{
                                                    width: '10px', height: '10px', background: 'white', borderRadius: '50%',
                                                    position: 'absolute', top: '2px',
                                                    left: q.status === 'Active' ? '16px' : '2px',
                                                    transition: 'left 0.3s',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: '0.725rem', fontWeight: 700,
                                                color: q.status === 'Active' ? '#16a34a' : '#dc2626'
                                            }}>
                                                {q.status === 'Active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <button onClick={() => handleEditQuestion(q)} style={{ padding: '0.5rem', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)', border: 'none', background: 'none', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none'; }}><Edit2 size={18} /></button>
                                        <button onClick={() => confirmDeleteQuestion(q)} style={{ padding: '0.5rem', color: 'var(--text-tertiary)', borderRadius: 'var(--radius-md)', border: 'none', background: 'none', cursor: 'pointer' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'var(--error-bg)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none'; }}><Trash2 size={18} /></button>
                                    </div>
                                </div>
                                <h4 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.4, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{q.text}</h4>

                                {q.type === 'MCQ' ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        {q.options.map((opt, idx) => (
                                            <div key={idx} style={{
                                                padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)',
                                                background: opt === q.correct ? 'var(--success-bg)' : 'var(--bg-app)',
                                                border: `1px solid ${opt === q.correct ? 'var(--success)' : 'var(--border)'}`,
                                                display: 'flex', alignItems: 'center', gap: '0.75rem'
                                            }}>
                                                <div style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    background: opt === q.correct ? 'var(--success)' : 'var(--border)',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 700
                                                }}>
                                                    {String.fromCharCode(65 + idx)}
                                                </div>
                                                <span style={{ color: opt === q.correct ? 'var(--success-text)' : 'var(--text-primary)', fontWeight: opt === q.correct ? 600 : 400 }}>{opt}</span>
                                                {opt === q.correct && <Check size={16} color="var(--success)" style={{ marginLeft: 'auto' }} />}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ padding: '1rem 1.25rem', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>Correct Answer:</span>
                                        <span style={{ fontWeight: 500 }}>{q.correct}</span>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )
            }

            {/* Add/Edit Modal */}
            {
                isAddModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div
                            className="hide-scrollbar"
                            style={{
                                background: 'var(--bg-surface)', width: '100%', maxWidth: '650px',
                                borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)',
                                padding: '2.5rem', animation: 'scaleUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingQuestion ? 'Edit Question' : 'Add New Question'}</h2>
                                <button onClick={() => setIsAddModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Visual Selectors */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem', alignItems: 'start' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {[
                                                { id: 'MCQ', label: 'MCQ' },
                                                { id: 'Short', label: 'SHORT' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setQuestionForm({ ...questionForm, type: type.id })}
                                                    style={{
                                                        flex: 1, padding: '0.625rem 0.25rem', borderRadius: '12px',
                                                        border: `2px solid ${questionForm.type === type.id ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: questionForm.type === type.id ? 'var(--primary-light)' : 'transparent',
                                                        color: questionForm.type === type.id ? 'var(--primary)' : 'var(--text-tertiary)',
                                                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    {type.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                                        <div style={{ position: 'relative' }}>
                                            <select
                                                value={questionForm.categoryId}
                                                onChange={e => setQuestionForm({ ...questionForm, categoryId: e.target.value })}
                                                style={{
                                                    width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                                                    border: '2px solid var(--border)', outline: 'none',
                                                    appearance: 'none', background: 'var(--bg-app)',
                                                    fontSize: '0.94rem', fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">Select Category</option>
                                                {categories.map(c => (
                                                    <option key={c.id} value={c.id} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }}>
                                                <ChevronLeft size={18} style={{ transform: 'rotate(-90deg)' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Question Text</label>
                                    <textarea
                                        value={questionForm.text}
                                        onChange={e => setQuestionForm({ ...questionForm, text: e.target.value })}
                                        rows="3"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none', resize: 'none' }}
                                        placeholder="Enter your question here..."
                                    />
                                </div>

                                {questionForm.type === 'MCQ' ? (
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 700, fontSize: '1rem' }}>Options & Correct Answer</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {questionForm.options.map((opt, idx) => (
                                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ width: '24px', fontWeight: 700, color: 'var(--text-tertiary)' }}>{String.fromCharCode(65 + idx)}.</div>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={e => {
                                                                const newOpts = [...questionForm.options];
                                                                newOpts[idx] = e.target.value;
                                                                setQuestionForm({ ...questionForm, options: newOpts });
                                                            }}
                                                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                            style={{ flex: 1, padding: '0.625rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }}
                                                        />
                                                    </div>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', paddingLeft: '2rem', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name="correct-ans"
                                                            checked={questionForm.correct === opt && opt !== ''}
                                                            onChange={() => setQuestionForm({ ...questionForm, correct: opt })}
                                                        />
                                                        Correct Answer
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>Correct Answer</label>
                                        <input
                                            type="text"
                                            value={questionForm.correct}
                                            onChange={e => setQuestionForm({ ...questionForm, correct: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }}
                                            placeholder="Enter the expected answer..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveQuestion}
                                    style={{
                                        flex: 2, padding: '1rem', borderRadius: '16px', border: 'none',
                                        background: 'var(--primary)', color: 'white', fontWeight: 800, cursor: 'pointer',
                                        boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    {editingQuestion ? 'Update Question' : 'Create Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Modal */}
            {
                isDeleteModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1010, animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            background: 'var(--bg-surface)', width: '100%', maxWidth: '400px',
                            borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)',
                            padding: '2rem', textAlign: 'center', animation: 'scaleUp 0.3s ease-out'
                        }}>
                            <div style={{ width: '64px', height: '64px', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                                <AlertTriangle size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Delete Question?</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                                This question will be permanently removed.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={() => setIsDeleteModalOpen(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleDeleteQuestion} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--error)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Upload Modal */}
            {
                isBulkUploadOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div
                            className="hide-scrollbar"
                            style={{
                                background: 'var(--bg-surface)', width: '100%', maxWidth: '600px',
                                borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)',
                                padding: '2.5rem', animation: 'scaleUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Upload size={24} color="var(--primary)" /> Bulk Upload Questions
                                </h2>
                                <button onClick={() => setIsBulkUploadOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            {/* CSV Format Guide */}
                            <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <FileText size={16} color="var(--primary)" />
                                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>CSV Format</span>
                                </div>
                                <code style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    categoryName, type, text, optionA, optionB, optionC, optionD, correctAnswer
                                </code>
                                <button
                                    onClick={downloadTemplate}
                                    style={{
                                        marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)',
                                        padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.8125rem',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--primary)'; }}
                                >
                                    <Download size={14} /> Download Template
                                </button>
                            </div>

                            {/* Drag & Drop Zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setIsDragOver(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                                        setUploadFile(file);
                                        setUploadResult(null);
                                    }
                                }}
                                style={{
                                    border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--border)'}`,
                                    borderRadius: '16px', padding: '2.5rem',
                                    textAlign: 'center', cursor: 'pointer',
                                    background: isDragOver ? 'var(--primary-light)' : 'var(--bg-app)',
                                    transition: 'all 0.2s', marginBottom: '1.5rem'
                                }}
                                onClick={() => document.getElementById('csv-file-input').click()}
                            >
                                <input
                                    id="csv-file-input"
                                    type="file"
                                    accept=".csv"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        if (e.target.files[0]) {
                                            setUploadFile(e.target.files[0]);
                                            setUploadResult(null);
                                        }
                                    }}
                                />
                                <Upload size={36} color={isDragOver ? 'var(--primary)' : 'var(--text-tertiary)'} style={{ marginBottom: '0.75rem' }} />
                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    {uploadFile ? uploadFile.name : 'Drag & drop your CSV file here'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : 'or click to browse'}
                                </div>
                            </div>

                            {/* Upload Result */}
                            {uploadResult && (
                                <div style={{
                                    background: uploadResult.successCount > 0 ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                    border: `1px solid ${uploadResult.successCount > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                    borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        {uploadResult.successCount > 0 ? <CheckCircle2 size={20} color="var(--success)" /> : <XCircle size={20} color="var(--error)" />}
                                        <span style={{ fontWeight: 700 }}>{uploadResult.message}</span>
                                    </div>
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.8125rem', color: 'var(--error)' }}>
                                            {uploadResult.errors.map((err, i) => (
                                                <div key={i} style={{ padding: '0.25rem 0' }}>• {err}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setIsBulkUploadOpen(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={!uploadFile || isUploading}
                                    style={{
                                        flex: 2, padding: '1rem', borderRadius: '16px', border: 'none',
                                        background: !uploadFile || isUploading ? 'var(--border)' : 'var(--primary)',
                                        color: !uploadFile || isUploading ? 'var(--text-tertiary)' : 'white',
                                        fontWeight: 800, cursor: !uploadFile || isUploading ? 'not-allowed' : 'pointer',
                                        boxShadow: uploadFile && !isUploading ? '0 10px 20px rgba(var(--primary-rgb), 0.2)' : 'none',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {isUploading ? 'Uploading...' : <><Upload size={18} /> Upload Questions</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isExportModalOpen && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div
                            className="hide-scrollbar"
                            style={{
                                background: 'var(--bg-surface)', width: '100%', maxWidth: '500px',
                                borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)',
                                padding: '2.5rem', animation: 'scaleUp 0.3s ease-out', maxHeight: '90vh', overflowY: 'auto'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Download size={24} color="#10b981" /> Export Question Bank
                                </h2>
                                <button onClick={() => setIsExportModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.94rem' }}>
                                Choose the categories you wish to export as a CSV file.
                            </p>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Categories ({selectedExportCategories.length}/{categories.length})</span>
                                    <button 
                                        onClick={() => {
                                            if (selectedExportCategories.length === categories.length) {
                                                setSelectedExportCategories([]);
                                            } else {
                                                setSelectedExportCategories(categories.map(c => c.id));
                                            }
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer' }}
                                    >
                                        {selectedExportCategories.length === categories.length ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                <div style={{ 
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem', 
                                    maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem',
                                    padding: '0.5rem', background: 'var(--bg-app)', borderRadius: '12px',
                                    border: '1px solid var(--border)'
                                }} className="hide-scrollbar">
                                    {categories.map(cat => (
                                        <div 
                                            key={cat.id}
                                            onClick={() => {
                                                if (selectedExportCategories.includes(cat.id)) {
                                                    setSelectedExportCategories(selectedExportCategories.filter(id => id !== cat.id));
                                                } else {
                                                    setSelectedExportCategories([...selectedExportCategories, cat.id]);
                                                }
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '0.75rem 1rem', borderRadius: '10px',
                                                background: selectedExportCategories.includes(cat.id) ? 'white' : 'transparent',
                                                border: `1.5px solid ${selectedExportCategories.includes(cat.id) ? cat.color : 'transparent'}`,
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: selectedExportCategories.includes(cat.id) ? '0 4px 12px rgba(0,0,0,0.04)' : 'none'
                                            }}
                                        >
                                            <div style={{
                                                width: '20px', height: '20px', borderRadius: '6px',
                                                border: `2px solid ${selectedExportCategories.includes(cat.id) ? cat.color : 'var(--text-tertiary)'}`,
                                                background: selectedExportCategories.includes(cat.id) ? cat.color : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', transition: 'all 0.2s'
                                            }}>
                                                {selectedExportCategories.includes(cat.id) && <Check size={14} strokeWidth={4} />}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{cat.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{cat.questionCount} Questions</div>
                                            </div>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setIsExportModalOpen(false)}
                                    style={{ flex: 1, padding: '1rem', borderRadius: '16px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownload}
                                    disabled={selectedExportCategories.length === 0}
                                    style={{
                                        flex: 2, padding: '1rem', borderRadius: '16px', border: 'none',
                                        background: selectedExportCategories.length === 0 ? 'var(--border)' : '#10b981',
                                        color: 'white', fontWeight: 800, cursor: selectedExportCategories.length === 0 ? 'not-allowed' : 'pointer',
                                        boxShadow: selectedExportCategories.length === 0 ? 'none' : '0 10px 20px rgba(16, 185, 129, 0.2)',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    <Download size={18} /> Export CSV
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <style>{`
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div >
    );
};

export default QuestionBank;

