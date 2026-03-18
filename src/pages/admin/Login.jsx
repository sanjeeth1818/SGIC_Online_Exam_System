import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
    const navigate = useNavigate();

    // If already authenticated, redirect to dashboard
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    if (token && user) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    // Login States
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Forgot Password Flow States
    const [view, setView] = useState('login'); // 'login', 'forgot-email', 'forgot-otp', 'forgot-reset', 'forgot-success'
    const [email, setEmail] = useState('');
    const [otpArray, setOtpArray] = useState(['', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [statusMsg, setStatusMsg] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

    // Timer effect for Resend OTP
    React.useEffect(() => {
        document.title = 'SGIC Exam Portal - Admin';
        let interval = null;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (!username.trim() || !password.trim()) {
            setErrorMsg('Username and password are required.');
            return;
        }

        setIsLoading(true);
        setStatusMsg('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Login failed.');

            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.admin));
            navigate('/admin/dashboard');
        } catch (err) {
            setErrorMsg(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestOtp = async (e, isResend = false) => {
        if (e) e.preventDefault();
        setErrorMsg('');
        if (isResend && resendTimer > 0) return;

        if (isResend) {
            setIsResending(true);
        } else {
            setIsLoading(true);
        }

        setStatusMsg('');

        try {
            const res = await fetch('/api/auth/forgot-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to send OTP.');

            setStatusMsg(isResend ? 'OTP resent successfully!' : data.message);
            setResendTimer(60); // Start 60s cooldown
            if (!isResend) {
                setOtpArray(['', '', '', '']);
                setView('forgot-otp');
            }
        } catch (err) {
            setErrorMsg(err.message);
            setStatusMsg('');
        } finally {
            setIsLoading(false);
            setIsResending(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setStatusMsg('');
        const otp = otpArray.join('');
        if (otp.length < 4) {
            setErrorMsg('Please enter the full 4-digit code.');
            return;
        }

        setIsVerifying(true);
        try {
            const res = await fetch('/api/auth/forgot-password/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Verification failed.');

            setView('forgot-reset');
        } catch (err) {
            setErrorMsg(err.message);
            setStatusMsg('');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleOtpChange = (value, index) => {
        if (value && isNaN(value)) return;
        const newArray = [...otpArray];
        newArray[index] = value ? value.substring(value.length - 1) : '';
        setOtpArray(newArray);

        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        setStatusMsg('');
        try {
            const res = await fetch('/api/auth/forgot-password/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpArray.join(''), newPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Reset failed.');

            setView('forgot-success');
        } catch (err) {
            setErrorMsg(err.message);
            setStatusMsg('');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to render shared UI elements
    const Header = ({ title, subtitle }) => (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ width: '120px', height: '120px', margin: '0 auto 0.5rem auto' }}>
                <img src="/SGIC 2.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>{title}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{subtitle}</p>
        </div>
    );

    const Alert = ({ type, message }) => (
        <div style={{
            background: type === 'error' ? '#fee2e2' : '#dcfce7',
            color: type === 'error' ? '#ef4444' : '#16a34a',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            border: `1px solid ${type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(22, 163, 74, 0.2)'}`,
            textAlign: 'center'
        }}>
            {message}
        </div>
    );

    const inputStyle = {
        width: '100%',
        padding: '0.75rem 1rem 0.75rem 3rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s'
    };

    const buttonStyle = (disabled) => ({
        width: '100%',
        padding: '0.875rem',
        background: 'var(--primary)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        boxShadow: 'var(--shadow-md)',
        transition: 'all 0.2s',
        opacity: disabled ? 0.7 : 1,
        marginTop: '1rem'
    });

    return (
        <div style={{
            position: 'fixed', inset: 0, overflow: 'hidden', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', padding: '2rem'
        }}>
            <div style={{
                width: '100%', maxWidth: '420px', background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-2xl)', padding: '2.5rem',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                border: '1px solid var(--border)'
            }}>

                {view === 'login' && (
                    <>
                        <Header title="Admin Panel" subtitle="SGIC Exam Portal" />
                        {errorMsg && <Alert type="error" message={errorMsg} />}
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Username</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin_user" required style={inputStyle} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <button type="button" onClick={() => setView('forgot-email')} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}>Forgot password?</button>
                            </div>
                            <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
                                {isLoading ? 'Signing in...' : 'Sign In'} {!isLoading && <ArrowRight size={18} />}
                            </button>
                        </form>
                    </>
                )}

                {view === 'forgot-email' && (
                    <>
                        <Header title="Trouble signing in?" subtitle="Enter your email to receive a 4-digit OTP" />
                        {errorMsg && <Alert type="error" message={errorMsg} />}
                        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@sgic.com" required style={inputStyle} />
                            </div>
                            <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
                                {isLoading ? 'Sending...' : 'Send OTP'}
                            </button>
                            <button type="button" onClick={() => setView('login')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>Return to Login</button>
                        </form>
                    </>
                )}

                {view === 'forgot-otp' && (
                    <>
                        <Header title="Check your email" subtitle={`We've sent a code to ${email}`} />
                        {statusMsg && <Alert type="success" message={statusMsg} />}
                        {errorMsg && <Alert type="error" message={errorMsg} />}
                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                {otpArray.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`otp-${idx}`}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={e => handleOtpChange(e.target.value, idx)}
                                        onKeyDown={e => handleOtpKeyDown(e, idx)}
                                        autoFocus={idx === 0}
                                        style={{
                                            width: '64px',
                                            height: '72px',
                                            textAlign: 'center',
                                            fontSize: '1.75rem',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-lg)',
                                            border: '2px solid var(--border)',
                                            outline: 'none',
                                            transition: 'all 0.2s',
                                            color: 'var(--text-primary)',
                                            background: '#f8fafc'
                                        }}
                                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    />
                                ))}
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                {resendTimer > 0 ? (
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        Resend code in <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{resendTimer}s</span>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={(e) => handleRequestOtp(e, true)}
                                        disabled={isResending}
                                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}
                                    >
                                        {isResending ? 'Sending...' : 'Resend OTP Code'}
                                    </button>
                                )}
                            </div>

                            <button type="submit" disabled={isVerifying} style={buttonStyle(isVerifying)}>
                                {isVerifying ? 'Verifying...' : 'Verify OTP'}
                            </button>
                            <button type="button" onClick={() => setView('forgot-email')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem' }}>Change Email</button>
                        </form>
                    </>
                )}

                {view === 'forgot-reset' && (
                    <>
                        <Header title="Reset Password" subtitle="Choose a strong new password" />
                        {errorMsg && <Alert type="error" message={errorMsg} />}
                        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" required style={inputStyle} />
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" required style={inputStyle} />
                            </div>
                            <button type="submit" disabled={isLoading} style={buttonStyle(isLoading)}>
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </>
                )}

                {view === 'forgot-success' && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '2rem' }}>✓</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Password Updated</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Your password has been changed successfully. You can now log in with your new password.</p>
                        <button onClick={() => setView('login')} style={buttonStyle(false)}>Sign In Now</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogin;
