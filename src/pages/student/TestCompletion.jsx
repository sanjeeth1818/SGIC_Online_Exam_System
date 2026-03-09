import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const TestCompletion = () => {
    const navigate = useNavigate();

    const data = JSON.parse(sessionStorage.getItem('lastSubmission') || '{}');
    const showResult = data.showResult !== undefined ? data.showResult : true;

    useEffect(() => {
        // Automatically redirect
        const timer = setTimeout(() => {
            if (showResult) {
                navigate('/result');
            } else {
                // If results are hidden, clear EVERYTHING
                sessionStorage.removeItem('lastSubmission');
                sessionStorage.removeItem('studentName');
                sessionStorage.removeItem('currentExamCode');
                window.dispatchEvent(new Event('studentNameUpdated'));
                navigate('/');
            }
        }, 3000);

        // Even if showing results, clear the "session" (name/code) so they can't resume or show as logged in
        if (showResult) {
            sessionStorage.removeItem('studentName');
            sessionStorage.removeItem('currentExamCode');
            window.dispatchEvent(new Event('studentNameUpdated'));
        }

        return () => clearTimeout(timer);
    }, [navigate, showResult]);

    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '100px', height: '100px',
                    borderRadius: '50%', background: 'var(--success-bg)',
                    color: 'var(--success)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 2rem auto',
                    animation: 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}>
                    <CheckCircle size={56} />
                </div>

                <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    Test Submitted Successfully!
                </h1>
                <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
                    Your answers have been securely saved. {showResult ? 'You will be redirected to your results shortly.' : 'Thank you for participating.'}
                </p>
            </div>

            <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default TestCompletion;
