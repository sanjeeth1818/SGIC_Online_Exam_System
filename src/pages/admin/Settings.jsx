import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Save, AlertCircle, CheckCircle } from 'lucide-react';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [notification, setNotification] = useState(null);

    // State Data Setup
    const [profileData, setProfileData] = useState({ name: 'System Admin', username: 'admin_user', email: 'admin@sgic.com' });
    const [securityData, setSecurityData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [emailData, setEmailData] = useState({
        smtpServer: '',
        smtpPort: '',
        senderEmail: '',
        senderName: '',
        username: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isEmailEditable, setIsEmailEditable] = useState(false);
    const [showVerifyModal, setShowVerifyModal] = useState(false);
    const [verificationPassword, setVerificationPassword] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    // Fetch profile and security on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                // Get username from localStorage if available, else default to 'admin_user'
                let savedAdmin = localStorage.getItem('adminUser');
                let currentUsername = 'admin_user';
                if (savedAdmin) {
                    const parsed = JSON.parse(savedAdmin);
                    currentUsername = parsed.username || currentUsername;
                }

                const res = await fetch(`/api/admin/profile/${currentUsername}`);
                if (res.ok) {
                    const data = await res.json();
                    setProfileData({
                        name: data.name || '',
                        username: data.username || '',
                        email: data.email || ''
                    });
                }
            } catch (err) {
                console.error("Failed to fetch profile settings", err);
            }
        };

        const fetchEmailSettings = async () => {
            try {
                const res = await fetch('/api/settings/email');
                if (res.ok) {
                    const data = await res.json();
                    setEmailData({
                        smtpServer: data.smtpServer || '',
                        smtpPort: (data.smtpPort || '').toString(),
                        senderEmail: data.senderEmail || '',
                        senderName: data.senderName || '',
                        username: data.username || '',
                        password: data.password ? '************' : ''
                    });
                } else {
                    // If fetching fails, ensure all fields are empty strings
                    setEmailData({
                        smtpServer: '',
                        smtpPort: '',
                        senderEmail: '',
                        username: '',
                        password: ''
                    });
                }
            } catch (error) {
                console.error('Failed to fetch email settings:', error);
                // On network error, ensure all fields are empty strings
                setEmailData({
                    smtpServer: '',
                    smtpPort: '',
                    senderEmail: '',
                    username: '',
                    password: ''
                });
            }
        };

        fetchProfile();
        fetchEmailSettings();
    }, []);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        try {
            // Get current username that we used to log in
            let savedAdmin = localStorage.getItem('adminUser');
            let currentUsername = 'admin_user'; // fallback
            if (savedAdmin) {
                const parsed = JSON.parse(savedAdmin);
                currentUsername = parsed.username || currentUsername;
            }

            const res = await fetch(`/api/admin/profile/${currentUsername}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileData.name,
                    username: profileData.username,
                    email: profileData.email
                })
            });

            const data = await res.json();

            if (res.ok) {
                showNotification('Profile updated successfully!');
                // Update localStorage with new username
                if (savedAdmin) {
                    let parsed = JSON.parse(savedAdmin);
                    parsed.username = profileData.username;
                    parsed.name = profileData.name;
                    localStorage.setItem('adminUser', JSON.stringify(parsed));
                } else {
                    localStorage.setItem('adminUser', JSON.stringify(data.admin));
                }
            } else {
                showNotification(data.message || 'Failed to update profile', 'error');
            }

        } catch (err) {
            console.error(err);
            showNotification('Server Error. Please check backend connection.', 'error');
        }
    };

    const handleSecuritySubmit = async (e) => {
        e.preventDefault();

        if (!securityData.currentPassword || !securityData.newPassword) {
            showNotification('All fields are required!', 'error');
            return;
        }

        if (securityData.newPassword !== securityData.confirmPassword) {
            showNotification('New passwords do not match!', 'error');
            return;
        }

        try {
            // Get current username that we used to log in
            let savedAdmin = localStorage.getItem('adminUser');
            let currentUsername = 'admin_user'; // fallback
            if (savedAdmin) {
                const parsed = JSON.parse(savedAdmin);
                currentUsername = parsed.username || currentUsername;
            }

            const res = await fetch(`/api/admin/change-password/${currentUsername}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: securityData.currentPassword,
                    newPassword: securityData.newPassword
                })
            });

            const data = await res.json();

            if (res.ok) {
                showNotification('Password changed successfully!');
                setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } else {
                showNotification(data.message || 'Failed to change password', 'error');
            }

        } catch (err) {
            console.error(err);
            showNotification('Server Error. Please check backend connection.', 'error');
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();

        // Clean up password: Gmail app passwords shouldn't have spaces
        let finalEmailData = { ...emailData };
        if (finalEmailData.password && finalEmailData.password !== '************') {
            finalEmailData.password = finalEmailData.password.replace(/\s/g, '');
        }

        try {
            const res = await fetch('/api/settings/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalEmailData)
            });
            if (res.ok) {
                showNotification('Email configurations saved successfully!');
            } else {
                showNotification('Failed to save configurations.', 'error');
            }
        } catch (error) {
            console.error('Error saving email settings:', error);
            showNotification('Server Error. Please check backend connection.', 'error');
        } finally {
            setIsEmailEditable(false);
        }
    };

    const [isTesting, setIsTesting] = useState(false);

    const handleTestConnection = async () => {
        if (isTesting) return;
        setIsTesting(true);
        showNotification('Testing connection...', 'success');

        let finalEmailData = { ...emailData };
        if (finalEmailData.password && finalEmailData.password !== '************') {
            finalEmailData.password = finalEmailData.password.replace(/\s/g, '');
        }

        try {
            const res = await fetch('/api/settings/email/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalEmailData)
            });

            let data;
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            } else {
                const text = await res.text();
                data = { message: text.substring(0, 100) };
            }

            if (res.ok && data.success !== false) {
                showNotification(data.message || 'Test connection successful!');
            } else {
                showNotification(data.message || 'Test connection failed.', 'error');
                console.error('SMTP Test Failed:', data);
            }
        } catch (error) {
            console.error('Error testing email connection:', error);
            showNotification('Server error while testing connection.', 'error');
        } finally {
            setIsTesting(false);
        }
    };

    const handleVerifyPassword = async (e) => {
        e.preventDefault();
        if (isVerifying) return;
        setIsVerifying(true);

        try {
            // Get current username
            let savedAdmin = localStorage.getItem('adminUser');
            let currentUsername = 'admin_user';
            if (savedAdmin) {
                const parsed = JSON.parse(savedAdmin);
                currentUsername = parsed.username || currentUsername;
            }

            const res = await fetch(`/api/admin/verify-password/${currentUsername}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: verificationPassword })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setIsEmailEditable(true);
                setShowVerifyModal(false);
                setVerificationPassword('');
                showNotification('Identity verified. You can now edit configurations.');
            } else {
                showNotification(data.message || 'Incorrect password.', 'error');
            }
        } catch (error) {
            console.error('Verification error:', error);
            showNotification('Server error during verification.', 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profile Settings', icon: <User size={20} /> },
        { id: 'security', label: 'Security', icon: <Lock size={20} /> },
        { id: 'email', label: 'Email Configuration', icon: <Mail size={20} /> },
    ];

    const inputStyle = {
        width: '100%',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        border: '2px solid var(--border)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s',
        background: 'var(--bg-app)',
        fontWeight: 500,
        color: 'var(--text-primary)'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
    };

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
            {/* Notification Toast */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '2rem', right: '2rem',
                    background: notification.type === 'success' ? 'var(--success)' : 'var(--error)',
                    color: 'white', padding: '1rem 2rem', borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)', zIndex: 2000,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span style={{ fontWeight: 600 }}>{notification.message}</span>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>Settings</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.06rem' }}>Manage your profile, security, and administrative configurations.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '3rem' }}>
                {/* Sidemenu Tabs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '1rem 1.5rem', borderRadius: '16px',
                                border: 'none', cursor: 'pointer',
                                background: activeTab === tab.id ? 'var(--primary-light)' : 'transparent',
                                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                                fontWeight: activeTab === tab.id ? 700 : 600,
                                transition: 'all 0.2s', textAlign: 'left'
                            }}
                            onMouseEnter={e => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.background = 'var(--bg-surface)';
                                    e.currentTarget.style.color = 'var(--text-primary)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (activeTab !== tab.id) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Panel */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', padding: '2.5rem', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', minHeight: '500px' }}>

                    {/* Profile Settings */}
                    {activeTab === 'profile' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                <User size={24} color="var(--primary)" /> Profile Settings
                            </h2>
                            <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>Full Name</label>
                                    <input
                                        type="text"
                                        value={profileData.name}
                                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                        style={inputStyle}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Administrator Username</label>
                                    <input
                                        type="text"
                                        value={profileData.username}
                                        onChange={e => setProfileData({ ...profileData, username: e.target.value })}
                                        style={inputStyle}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>This username acts as your primary login identifier.</p>
                                </div>
                                <div>
                                    <label style={labelStyle}>Administrator Email</label>
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                                        style={inputStyle}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>This email acts as your primary contact identifier.</p>
                                </div>
                                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '2rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2.5rem', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        <Save size={18} /> Update Profile
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeTab === 'security' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                <Lock size={24} color="var(--primary)" /> Change Password
                            </h2>
                            <form onSubmit={handleSecuritySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={labelStyle}>Current Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={securityData.currentPassword}
                                        onChange={e => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                        style={inputStyle}
                                        placeholder="Enter current password"
                                        required
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>New Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={securityData.newPassword}
                                        onChange={e => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                        style={inputStyle}
                                        placeholder="Enter new password"
                                        required
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Confirm New Password</label>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={securityData.confirmPassword}
                                        onChange={e => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                        style={{ ...inputStyle, borderColor: securityData.confirmPassword && securityData.newPassword !== securityData.confirmPassword ? 'var(--error)' : 'var(--border)' }}
                                        placeholder="Confirm new password"
                                        required
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = securityData.confirmPassword && securityData.newPassword !== securityData.confirmPassword ? 'var(--error)' : 'var(--border)'}
                                    />
                                    {securityData.confirmPassword && securityData.newPassword !== securityData.confirmPassword && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.5rem' }}>Passwords do not match.</p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="showPassword"
                                        checked={showPassword}
                                        onChange={() => setShowPassword(!showPassword)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                                    />
                                    <label htmlFor="showPassword" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        Show Passwords
                                    </label>
                                </div>
                                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '2rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2.5rem', borderRadius: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                        <Save size={18} /> Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Email Configuration */}
                    {activeTab === 'email' && (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                <Mail size={24} color="var(--primary)" /> Email Configuration
                            </h2>

                            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={labelStyle}>SMTP Server</label>
                                        <input
                                            type="text"
                                            value={emailData.smtpServer}
                                            onChange={e => setEmailData({ ...emailData, smtpServer: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            required
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>SMTP Port</label>
                                        <input
                                            type="text"
                                            value={emailData.smtpPort}
                                            onChange={e => setEmailData({ ...emailData, smtpPort: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            required
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={labelStyle}>Sender Email (From Address)</label>
                                        <input
                                            type="email"
                                            value={emailData.senderEmail}
                                            onChange={e => setEmailData({ ...emailData, senderEmail: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            required
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                            placeholder="sanjeeth@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Display Name (Sender Name)</label>
                                        <input
                                            type="text"
                                            value={emailData.senderName}
                                            onChange={e => setEmailData({ ...emailData, senderName: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            placeholder="e.g. SGIC Academy"
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                            <label style={labelStyle}>Username</label>
                                            {isEmailEditable && (
                                                <button
                                                    type="button"
                                                    onClick={() => setEmailData({ ...emailData, username: emailData.senderEmail })}
                                                    style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                                >
                                                    Same as Sender Email
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={emailData.username}
                                            onChange={e => setEmailData({ ...emailData, username: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            placeholder="SMTP Username"
                                            required
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>For Gmail, this must be your full email address.</p>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Password / App Password</label>
                                        <input
                                            type="password"
                                            value={emailData.password}
                                            onChange={e => setEmailData({ ...emailData, password: e.target.value })}
                                            style={{ ...inputStyle, opacity: isEmailEditable ? 1 : 0.7, cursor: isEmailEditable ? 'text' : 'not-allowed' }}
                                            placeholder="Enter password"
                                            required
                                            disabled={!isEmailEditable}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    </div>
                                </div>
                                <div style={{ borderTop: '2px solid var(--border)', paddingTop: '2rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        onClick={handleTestConnection}
                                        disabled={isTesting}
                                        style={{
                                            padding: '1rem 2.5rem',
                                            borderRadius: '14px',
                                            background: isTesting ? 'var(--bg-app)' : 'var(--bg-app)',
                                            color: isTesting ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                            fontWeight: 700,
                                            border: '2px solid var(--border)',
                                            cursor: isTesting ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem'
                                        }}
                                        onMouseEnter={e => {
                                            if (!isTesting) {
                                                e.currentTarget.style.borderColor = 'var(--primary)';
                                                e.currentTarget.style.color = 'var(--primary)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isTesting) {
                                                e.currentTarget.style.borderColor = 'var(--border)';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }
                                        }}
                                    >
                                        {isTesting ? 'Testing...' : 'Test Connection'}
                                    </button>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {!isEmailEditable ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowVerifyModal(true)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '1rem 2.5rem',
                                                    borderRadius: '14px',
                                                    background: 'var(--bg-app)',
                                                    color: 'var(--primary)',
                                                    fontWeight: 700,
                                                    border: '2px solid var(--primary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    boxShadow: 'var(--shadow-sm)'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'var(--primary)';
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'var(--bg-app)';
                                                    e.currentTarget.style.color = 'var(--primary)';
                                                }}
                                            >
                                                <Lock size={18} /> Edit Configurations
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEmailEditable(false)}
                                                    style={{
                                                        padding: '1rem 2rem',
                                                        borderRadius: '14px',
                                                        background: 'transparent',
                                                        color: 'var(--text-secondary)',
                                                        fontWeight: 700,
                                                        border: '2px solid var(--border)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.75rem',
                                                        padding: '1rem 2.5rem',
                                                        borderRadius: '14px',
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                                >
                                                    <Save size={18} /> Update Configurations
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Password Verification Modal */}
            {showVerifyModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 3000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-surface)', padding: '2.5rem', borderRadius: '24px',
                        width: '100%', maxWidth: '450px', boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)', animation: 'slideUp 0.3s ease-out'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '64px', height: '64px', background: 'var(--primary-light)',
                                borderRadius: '20px', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--primary)'
                            }}>
                                <Lock size={32} />
                            </div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Security Check</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                Please enter your administrator password to unlock email configurations.
                            </p>
                        </div>

                        <form onSubmit={handleVerifyPassword}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={labelStyle}>Admin Password</label>
                                <input
                                    type="password"
                                    autoFocus
                                    value={verificationPassword}
                                    onChange={e => setVerificationPassword(e.target.value)}
                                    style={inputStyle}
                                    placeholder="********"
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowVerifyModal(false);
                                        setVerificationPassword('');
                                    }}
                                    style={{
                                        padding: '0.875rem', borderRadius: '12px', border: '2px solid var(--border)',
                                        background: 'transparent', color: 'var(--text-secondary)',
                                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isVerifying}
                                    style={{
                                        padding: '0.875rem', borderRadius: '12px', border: 'none',
                                        background: 'var(--primary)', color: 'white',
                                        fontWeight: 700, cursor: isVerifying ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', opacity: isVerifying ? 0.7 : 1
                                    }}
                                >
                                    {isVerifying ? 'Verifying...' : 'Verify & Unlock'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Settings;

