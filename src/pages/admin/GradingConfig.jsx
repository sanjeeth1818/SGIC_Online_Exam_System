import React, { useState, useEffect } from 'react';
import { LayoutGrid, Save, Plus, Trash2 } from 'lucide-react';

const GradingConfig = () => {
    const [notification, setNotification] = useState(null);
    const [gradingScales, setGradingScales] = useState([
        { gradeLabel: 'A', minScore: 75, colorHex: '#16a34a' },
        { gradeLabel: 'B', minScore: 60, colorHex: '#2563eb' },
        { gradeLabel: 'C', minScore: 45, colorHex: '#d97706' },
        { gradeLabel: 'S', minScore: 0, colorHex: '#dc2626' }
    ]);

    useEffect(() => {
        const fetchGradingSettings = async () => {
            try {
                const res = await fetch('/api/settings/grading');
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        setGradingScales(data.sort((a, b) => b.minScore - a.minScore));
                    }
                }
            } catch (error) {
                console.error('Failed to fetch grading settings:', error);
            }
        };
        fetchGradingSettings();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleGradingSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/settings/grading', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gradingScales)
            });
            if (res.ok) {
                showNotification('Grading configurations saved successfully!');
            } else {
                showNotification('Failed to save grading configurations.', 'error');
            }
        } catch (error) {
            console.error('Error saving grading settings:', error);
            showNotification('Server Error. Please check backend connection.', 'error');
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem',
        borderRadius: '12px',
        border: '2px solid var(--border)',
        background: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        fontSize: '0.95rem',
        transition: 'all 0.2s ease',
        outline: 'none'
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '1000px', margin: '0 auto' }}>
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem', zIndex: 5000,
                    padding: '1rem 2rem', borderRadius: '12px', background: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
                    color: 'white', fontWeight: 600, boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem', animation: 'slideIn 0.3s forwards'
                }}>
                    {notification.message}
                </div>
            )}

            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Grading Configuration</h1>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '2.5rem', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <form onSubmit={handleGradingSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 50px', gap: '1.25rem', padding: '0 1rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div>Grade Label</div>
                            <div>Min Percentage (%)</div>
                            <div>Theme Color</div>
                            <div></div>
                        </div>

                        {gradingScales.map((scale, index) => (
                            <div key={index} style={{
                                display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 50px', gap: '1.25rem',
                                alignItems: 'center', background: 'var(--bg-app)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border)',
                                transition: 'all 0.2s ease'
                            }}>
                                <input
                                    type="text"
                                    value={scale.gradeLabel}
                                    onChange={e => {
                                        const updated = [...gradingScales];
                                        updated[index].gradeLabel = e.target.value;
                                        setGradingScales(updated);
                                    }}
                                    style={inputStyle}
                                    placeholder="e.g. A"
                                    required
                                />
                                <input
                                    type="number"
                                    value={scale.minScore}
                                    onChange={e => {
                                        const updated = [...gradingScales];
                                        updated[index].minScore = parseInt(e.target.value) || 0;
                                        setGradingScales(updated);
                                    }}
                                    style={inputStyle}
                                    min="0" max="100"
                                    required
                                />
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="color"
                                        value={scale.colorHex || '#6366f1'}
                                        onChange={e => {
                                            const updated = [...gradingScales];
                                            updated[index].colorHex = e.target.value;
                                            setGradingScales(updated);
                                        }}
                                        style={{
                                            width: '100%', height: '42px', padding: '4px', borderRadius: '10px',
                                            border: '2px solid var(--border)', background: 'transparent', cursor: 'pointer'
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setGradingScales(gradingScales.filter((_, i) => i !== index))}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--error)',
                                        cursor: 'pointer', padding: '0.6rem', borderRadius: '10px', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => setGradingScales([...gradingScales, { gradeLabel: '', minScore: 0, colorHex: '#6366f1' }])}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '1rem', borderRadius: '16px',
                            background: 'transparent', color: 'var(--primary)',
                            border: '2px dashed var(--primary)', fontWeight: 700,
                            cursor: 'pointer', marginBottom: '2.5rem', width: '100%',
                            justifyContent: 'center', transition: 'all 0.2s', fontSize: '1rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <Plus size={20} /> Add New Grade Level
                    </button>

                    <div style={{ borderTop: '2px solid var(--border)', paddingTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '1.125rem 3rem', borderRadius: '16px',
                                background: 'var(--primary)', color: 'white',
                                fontWeight: 700, border: 'none', cursor: 'pointer',
                                boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)',
                                transition: 'all 0.2s', fontSize: '1.05rem'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 25px rgba(99, 102, 241, 0.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.3)'; }}
                        >
                            <Save size={20} /> Save Configuration
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                `}</style>
        </div>
    );
};

export default GradingConfig;

