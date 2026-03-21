import React, { useState, useEffect } from 'react';
import { Folder, Plus, Edit2, Trash2, Search, X, Check, AlertTriangle } from 'lucide-react';

const Categories = () => {
    const [categories, setCategories] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '', color: '#1e40af' });
    const [notification, setNotification] = useState(null);

    const [searchTerm, setSearchTerm] = useState('');

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/categories');
            if (!res.ok) throw new Error('Failed to fetch categories');
            const data = await res.json();
            setCategories(data);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Could not connect to database.' });
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setCategoryForm({ name: category.name, color: category.color || '#1e40af' });
        } else {
            setEditingCategory(null);
            setCategoryForm({ name: '', color: '#1e40af' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!categoryForm.name.trim()) {
            setNotification({ type: 'error', message: 'Category name is required.' });
            return;
        }

        try {
            if (editingCategory) {
                const res = await fetch(`/api/categories/${editingCategory.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...categoryForm,
                        status: editingCategory.status,
                        questionCount: editingCategory.questionCount
                    })
                });
                if (!res.ok) {
                    let errMsg = 'Failed to update category.';
                    try {
                        const errData = await res.json();
                        errMsg = errData.message || errMsg;
                    } catch (e) {
                        const text = await res.text();
                        errMsg = text || errMsg;
                    }
                    throw new Error(errMsg);
                }
                setNotification({ type: 'success', message: 'Category updated successfully!' });
            } else {
                const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...categoryForm, status: 'Active', questionCount: 0 })
                });
                if (!res.ok) {
                    let errMsg = 'Failed to create category.';
                    try {
                        const errData = await res.json();
                        errMsg = errData.message || errMsg;
                    } catch (e) {
                        const text = await res.text();
                        errMsg = text || errMsg;
                    }
                    throw new Error(errMsg);
                }
                setNotification({ type: 'success', message: 'Category created successfully!' });
            }
            fetchCategories();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Failed to save category.' });
        }
    };

    const confirmDelete = (category) => {
        setCategoryToDelete(category);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/categories/${categoryToDelete.id}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                let errMsg = 'Failed to delete category.';
                try {
                    const errData = await res.json();
                    errMsg = errData.message || errMsg;
                } catch (e) {
                    const text = await res.text();
                    errMsg = text || errMsg;
                }
                throw new Error(errMsg);
            }
            setNotification({ type: 'success', message: 'Category deleted successfully!' });
            fetchCategories();
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: error.message || 'Failed to delete category.' });
        }
    };

    const toggleStatus = async (id, currentStatus) => {
        try {
            const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
            const res = await fetch(`/api/categories/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'text/plain' },
                body: newStatus
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchCategories();
        } catch (error) {
            console.error(error);
            setNotification({ type: 'error', message: 'Failed to update status.' });
        }
    };

    const filteredCategories = categories.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', position: 'relative' }}>
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem',
                    background: notification.type === 'success' ? 'var(--success)' : 'var(--error)', 
                    color: 'white',
                    padding: '1rem 2rem', borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
                    <span style={{ fontWeight: 500 }}>{notification.message}</span>
                </div>
            )}

            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', marginBottom: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Categories</h1>

                </div>
                <button
                    onClick={() => handleOpenModal()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        background: 'var(--primary)', color: 'white',
                        padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)',
                        fontWeight: 600, transition: 'all 0.2s',
                        boxShadow: 'var(--shadow-md)', border: 'none', cursor: 'pointer'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
                >
                    <Plus size={20} />
                    New Category
                </button>
            </div>

            {/* Content Section */}
            <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                        width: '320px', display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'var(--bg-app)', border: '1px solid var(--border)',
                        padding: '0.625rem 1rem', borderRadius: 'var(--radius-md)'
                    }}>
                        <Search size={18} color="var(--text-tertiary)" />
                        <input
                            type="text"
                            placeholder="Search categories..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.875rem' }}
                        />
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Category Name</th>
                                <th style={{ padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCategories.map((cat, idx) => (
                                <tr key={cat.id} style={{ borderBottom: idx === filteredCategories.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '40px', height: '40px', borderRadius: 'var(--radius-md)',
                                                background: `${cat.color}15`, color: cat.color,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <Folder size={20} fill="currentColor" fillOpacity={0.2} />
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => handleOpenModal(cat)}
                                                style={{ padding: '0.5rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none'; }}
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(cat)}
                                                style={{ padding: '0.5rem', color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'var(--error-bg)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.background = 'none'; }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* New / Edit Category Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-surface)', width: '100%', maxWidth: '500px',
                        borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)',
                        padding: '2rem', animation: 'scaleUp 0.3s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                                    Category Name <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', outline: 'none' }}
                                    placeholder="e.g. Mathematics"
                                />
                            </div>


                            <div>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.875rem' }}>Folder Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <input
                                        type="color"
                                        value={categoryForm.color}
                                        onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}
                                        style={{
                                            width: '50px', height: '50px', border: 'none',
                                            borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            background: 'none'
                                        }}
                                    />
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                        Selected: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{categoryForm.color}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                style={{
                                    padding: '0.75rem 2rem', borderRadius: 'var(--radius-md)', border: 'none',
                                    background: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer',
                                    boxShadow: 'var(--shadow-md)'
                                }}
                            >
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
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
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>Delete Category?</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                            Are you sure you want to delete <strong>{categoryToDelete?.name}</strong>? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}
                            >
                                No, Keep it
                            </button>
                            <button
                                onClick={handleDelete}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--error)', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes scaleUp {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Categories;


