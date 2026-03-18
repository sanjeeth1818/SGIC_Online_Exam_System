import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';

const StudentLayout = () => {
    const location = useLocation();
    // Strictly hide the header profile on the root code entry page
    const isLoginPage = location.pathname === '/';
    
    // Lazy initialize from sessionStorage to ensure the latest value is grabbed on mount
    const [studentName, setStudentName] = useState(() => sessionStorage.getItem('studentName') || 'Guest');

    useEffect(() => {
        document.title = 'SGIC Exam Portal';
        const handleNameUpdate = () => {
            setStudentName(sessionStorage.getItem('studentName') || 'Guest');
        };
        window.addEventListener('studentNameUpdated', handleNameUpdate);
        return () => window.removeEventListener('studentNameUpdated', handleNameUpdate);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-app)' }}>
            {/* Top Navigation */}
            <header style={{
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                padding: '0.100rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100
            }}>
                {/* Logo */}
                <img src="/SGIC.png" alt="SGIC Logo" style={{ height: '90px', objectFit: 'contain' }} />

                {!isLoginPage && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', animation: 'fadeIn 0.3s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={18} />
                            </div>
                            <span style={{ fontWeight: 500 }}>{studentName}</span>
                        </div>

                        <div
                            onClick={(e) => {
                                if (window.location.pathname === '/exam') {
                                    e.preventDefault();
                                    window.dispatchEvent(new Event('requestExamExit'));
                                } else {
                                    sessionStorage.removeItem('studentName');
                                    window.dispatchEvent(new Event('studentNameUpdated'));
                                    window.location.href = '/';
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-tertiary)',
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'color var(--transition-fast)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                        >
                            <LogOut size={18} />
                            Exit
                        </div>
                    </div>
                )}
            </header>

            {/* Main Content Area */}
            <main style={{ flex: 1, padding: '110px 2rem 2rem 2rem', display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default StudentLayout;
