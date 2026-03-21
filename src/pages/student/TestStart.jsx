import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, AlertCircle, Check, User, ArrowRight } from 'lucide-react';

const TestStart = () => {
    const navigate = useNavigate();
    const [examCode, setExamCode] = useState('');
    const [isCodeVerified, setIsCodeVerified] = useState(false);
    const [testDetails, setTestDetails] = useState(null);
    const [studentName, setStudentName] = useState('');
    const [error, setError] = useState('');
    const [isStarting, setIsStarting] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        let timer;
        if (isStarting && countdown > 0) {
            timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        } else if (isStarting && countdown === 0) {
            navigate('/exam');
        }
        return () => clearTimeout(timer);
    }, [isStarting, countdown, navigate]);

    const handleVerifyCode = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setIsValidating(true);

        const code = examCode.trim();
        if (code.length !== 4) {
            setError('Please enter your unique 4-digit examination code.');
            setIsValidating(false);
            return;
        }

        try {
            const res = await fetch('/api/exam-entry/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    sessionToken: sessionStorage.getItem('examSessionToken')
                })
            });

            const data = await res.json();
            if (!data.success) {
                setError(data.message || 'Verification failed.');
                setIsValidating(false);
                return;
            }

            // Fetch Student Name
            const studentRes = await fetch(`/api/students/${data.studentId}`);
            if (studentRes.ok) {
                const studentData = await studentRes.json();
                setStudentName(studentData.name);
            }

            setTestDetails({
                id: data.testId,
                name: data.testName,
                studentId: data.studentId,
                additionalTime: data.additionalTime || 0,
                isReopened: data.isReopened
            });

            // Fetch extra test config if needed (duration etc)
            const testRes = await fetch(`/api/tests/${data.testId}`);
            if (testRes.ok) {
                const fullTest = await testRes.json();
                setTestDetails(prev => ({
                    ...prev,
                    duration: fullTest.timeValue,
                    timeUnit: fullTest.timeUnit || 'mins',
                    timeMode: fullTest.timeMode || 'full',
                    additionalTime: data.additionalTime || fullTest.additionalTime || 0
                }));
            }

            setIsCodeVerified(true);
            sessionStorage.setItem('currentExamCode', code);
            sessionStorage.setItem('studentId', data.studentId);
            sessionStorage.setItem('testId', data.testId);
        } catch (error) {
            console.error(error);
            setError('Could not connect to the examination server.');
        } finally {
            setIsValidating(false);
        }
    };

    const handleStart = async () => {
        const code = sessionStorage.getItem('currentExamCode');
        if (!isCodeVerified || !code) return;

        setError('');
        setIsStarting(true);
        setCountdown(3);

        try {
            const res = await fetch('/api/exam-entry/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: sessionStorage.getItem('currentExamCode'),
                    studentId: sessionStorage.getItem('studentId'),
                    sessionToken: sessionStorage.getItem('examSessionToken') // Send existing token if any
                })
            });

            const data = await res.json();
            if (!data.success) {
                setError(data.message || 'Failed to start exam.');
                setIsStarting(false);
                setIsCodeVerified(false);
                setExamCode('');
                sessionStorage.removeItem('currentExamCode');
                return;
            }

            // Store the Session Token (Device Lock)
            if (data.sessionToken) {
                sessionStorage.setItem('examSessionToken', data.sessionToken);
            }

            // Clear old exam state to ensure total isolation
            const keysToClear = [
                'examWarnings', 'examStartedAt', 'examCurrentStep', 'lastSubmission',
                `examWarnings_${code}`, `examStartedAt_${code}`, `examCurrentStep_${code}`,
                `examAnswers_${code}`, `examPerQuestionTime_${code}`, `examActiveQuestionStartedAt_${code}`
            ];
            keysToClear.forEach(key => sessionStorage.removeItem(key));

            // Save startedAt for timer persistence in ExamInterface
            if (data.startedAt) {
                sessionStorage.setItem(`examStartedAt_${code}`, data.startedAt);
            }

            sessionStorage.setItem('studentName', studentName);
            window.dispatchEvent(new Event('studentNameUpdated'));
            // Countdown effect will handle navigation
        } catch (error) {
            console.error(error);
            setError('System error while starting exam.');
            setIsStarting(false);
        }
    };

    if (isStarting) {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Preparing your examination environment...</div>
                <div style={{ fontSize: '6rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1, textShadow: 'var(--shadow-md)' }}>
                    {countdown}
                </div>
                <div style={{ marginTop: '2rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Good luck, {studentName}!</div>
            </div>
        );
    }

    const getTimeUnitLabel = () => {
        if (testDetails?.timeUnit === 'secs') return 'Seconds';
        if (testDetails?.timeUnit === 'hours') return 'Hours';
        return 'Minutes';
    };

    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div style={{
                width: '100%', maxWidth: '480px', background: 'var(--bg-surface)', borderRadius: '32px',
                padding: '2.5rem', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', border: '1px solid var(--border)',
                position: 'relative', overflow: 'hidden'
            }}>
                {/* Decorative background element */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '200px', height: '200px', borderRadius: '50%', background: 'var(--primary-light)', opacity: 0.5, zIndex: 0 }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ width: '120px', height: '120px', borderRadius: '24px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                            <img src="/SGIC 2.png" alt="SGIC Logo" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                        </div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Examination Portal</h1>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.94rem', fontWeight: 600 }}>Secure Assessment System</p>
                    </div>

                    {!isCodeVerified ? (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Enter your unique 4-digit code sent to your email.</p>
                            </div>

                            {error && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--error)', padding: '1rem', borderRadius: '16px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={examCode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setExamCode(val);
                                            setError('');
                                        }}
                                        placeholder="0000"
                                        required
                                        style={{
                                            width: '100%', padding: '1.25rem', borderRadius: '20px', border: `3px solid ${error ? 'var(--error)' : 'var(--border)'}`,
                                            fontSize: '2.5rem', outline: 'none', transition: 'all 0.2s', textAlign: 'center',
                                            letterSpacing: '0.5em', fontWeight: 900, color: 'var(--primary)', background: 'var(--bg-app)'
                                        }}
                                        onFocus={e => { if (!error) e.currentTarget.style.borderColor = 'var(--primary)'; }}
                                        onBlur={e => { if (!error) e.currentTarget.style.borderColor = 'var(--border)'; }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={examCode.length !== 4 || isValidating}
                                    style={{
                                        width: '100%', padding: '1.125rem', borderRadius: '20px', fontWeight: 800, fontSize: '1.125rem',
                                        color: 'white', background: examCode.length === 4 ? 'var(--primary)' : 'var(--text-tertiary)',
                                        border: 'none', cursor: examCode.length === 4 ? 'pointer' : 'not-allowed',
                                        boxShadow: examCode.length === 4 ? '0 10px 25px rgba(var(--primary-rgb), 0.3)' : 'none',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                                    }}
                                >
                                    {isValidating ? 'Verifying...' : 'Access Examination'} <ArrowRight size={20} />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{ display: 'inline-flex', background: 'var(--success-light)', color: 'var(--success)', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 800, marginBottom: '1.25rem', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--success-border)' }}>
                                    <Check size={16} /> Verified Access
                                </div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Welcome, {studentName}</h2>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 600 }}>Authorized for: <span style={{ color: 'var(--primary)' }}>{testDetails?.name}</span></p>
                            </div>

                            <div style={{ background: 'var(--bg-app)', padding: '1.5rem', borderRadius: '24px', marginBottom: '2rem', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                        <Clock size={18} color="var(--primary)" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Available Time</div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {testDetails?.isReopened ? (
                                                <span style={{ color: 'var(--primary)' }}>{testDetails.additionalTime} Minutes (Remaining Session)</span>
                                            ) : (
                                                <>
                                                    {testDetails?.duration} {getTimeUnitLabel()}
                                                    {testDetails?.timeMode === 'question' ? ' (Per Question)' : ''}
                                                    {testDetails?.additionalTime > 0 && (
                                                        <span style={{ fontSize: '0.75rem', background: 'var(--success-light)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                                                            + {testDetails.additionalTime} mins Extra
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <button
                                    onClick={handleStart}
                                    style={{
                                        width: '100%', padding: '1.25rem', borderRadius: '20px', fontWeight: 800, fontSize: '1.25rem',
                                        color: 'white', background: 'var(--primary)', border: 'none', cursor: 'pointer',
                                        boxShadow: '0 10px 30px rgba(var(--primary-rgb), 0.3)', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                                >
                                    Start Examination
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCodeVerified(false);
                                        setExamCode('');
                                        setStudentName('');
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    Not {studentName}? Re-enter code
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default TestStart;
