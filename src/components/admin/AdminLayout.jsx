import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderTree, FileQuestion, FilePlus, ClipboardList, Settings, LogOut, Users } from 'lucide-react';

const AdminLayout = () => {
    const location = useLocation();

    const navItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
        { name: 'Create Test', path: '/admin/create-test', icon: <FilePlus size={20} /> },
        { name: 'Results', path: '/admin/results', icon: <ClipboardList size={20} /> },
        { name: 'Students', path: '/admin/students', icon: <Users size={20} /> },
        { name: 'Question Bank', path: '/admin/questions', icon: <FileQuestion size={20} /> },
        { name: 'Categories', path: '/admin/categories', icon: <FolderTree size={20} /> },
        { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'var(--bg-surface)',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                zIndex: 100
            }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <img
                        src="/SGIC 2.png"
                        alt="SGIC Logo"
                        style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                    />
                    <div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>Admin Panel</div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '4px' }}>SGIC Exam Portal</div>
                    </div>
                </div>

                <nav style={{ padding: '1.5rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: 'var(--radius-md)',
                                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                                    background: isActive ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: isActive ? 600 : 500,
                                    transition: 'all var(--transition-fast)',
                                    textDecoration: 'none'
                                }}
                            >
                                {item.icon}
                                {item.name}
                            </NavLink>
                        );
                    })}
                </nav>

                <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid var(--border)' }}>
                    <NavLink to="/admin/login" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '12px',
                        background: 'var(--error)',
                        color: 'white',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)'; }}
                    >
                        <LogOut size={20} />
                        Logout
                    </NavLink>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '2rem 3rem', marginLeft: '260px', overflowY: 'auto' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
