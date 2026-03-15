import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const StudentResult = () => {
    const navigate = useNavigate();
    const data = JSON.parse(sessionStorage.getItem('lastSubmission') || '{}');
    const submission = data.submission || {};
    const breakdown = data.breakdown || [];
    const studentName = submission.studentName || 'Student';

    const [gradingScales, setGradingScales] = useState([]);

    useEffect(() => {
        const fetchGradingScales = async () => {
            try {
                const res = await fetch('/api/settings/grading');
                if (res.ok) {
                    const scales = await res.json();
                    setGradingScales(scales.sort((a, b) => b.minScore - a.minScore));
                }
            } catch (err) {
                console.error("Failed to fetch grading scales", err);
            }
        };
        fetchGradingScales();
    }, []);

    const scorePercent = submission.totalQuestions > 0
        ? Math.round((submission.score / submission.totalQuestions) * 100)
        : 0;

    const getGradeInfo = (percent) => {
        if (!gradingScales || gradingScales.length === 0) {
            // Fallback to legacy hardcoded grading if no scales are configured
            if (percent >= 75) return { label: 'A', color: '#16a34a' };
            if (percent >= 60) return { label: 'B', color: '#2563eb' };
            if (percent >= 45) return { label: 'C', color: '#d97706' };
            return { label: 'S', color: '#dc2626' };
        }

        const match = gradingScales.find(s => percent >= s.minScore);
        return match ? { label: match.gradeLabel, color: match.colorHex } : { label: 'N/A', color: 'var(--text-tertiary)' };
    };

    const activeGrade = getGradeInfo(scorePercent);

    const showAnswers = data.showAnswers !== undefined ? data.showAnswers : true;

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{
                    width: '80px', height: '80px',
                    background: 'var(--success)', color: 'white',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <Award size={40} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{submission.testName || 'Examination Result'}</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>{studentName} • Completed on {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}</p>
                </div>
            </div>

            {/* High-level Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Final Score</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--success)', lineHeight: 1 }}>{scorePercent}%</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{submission.score} / {submission.totalQuestions} Points</div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Performance</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: activeGrade.color, lineHeight: 1 }}>
                        {activeGrade.label}
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Based on your score</div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Time Taken</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>{submission.timeTaken || 'N/A'}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Exam Duration Result</div>
                </div>
            </div>

            {/* Questions Review - Flat List */}
            {showAnswers && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '4rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ width: '6px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }} />
                        Review Responses
                    </div>

                    {breakdown.map((q, i) => {
                        // Resilient Matching Logic: If they look identical visually, show as correct
                        // even if the backend isCorrect flag is false (to handle historical inconsistencies)
                        const normalize = (str) => (str || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
                        const isVisualCorrect = q.isCorrect || (normalize(q.studentAnswer) === normalize(q.correctAnswer));

                        return (
                            <div key={i} style={{ padding: '2.5rem', background: 'white', borderRadius: '32px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1, paddingRight: '2rem' }}>
                                        <span style={{ color: 'var(--primary)', fontStyle: 'italic', marginRight: '0.5rem' }}>Q{i + 1}:</span>
                                        {q.categoryName && <span style={{ color: 'var(--text-tertiary)', marginRight: '0.5rem', fontSize: '1rem' }}>[{q.categoryName}]</span>}
                                        <div style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>{q.questionText}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', background: 'var(--bg-app)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        <Clock size={16} /> {q.timeSpent !== undefined ? (q.timeSpent < 60 ? `${q.timeSpent}s` : `${Math.floor(q.timeSpent / 60)}m ${q.timeSpent % 60}s`) : '0s'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
                                    {isVisualCorrect ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '14px', border: '1px solid #bbf7d0', fontWeight: 900, fontSize: '1.1rem' }}>
                                            <CheckCircle size={20} />
                                            <span style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 700 }}>You:</span>
                                            {q.studentAnswer}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', background: '#fef2f2', color: '#dc2626', borderRadius: '14px', border: '1px solid #fecaca', fontWeight: 900, fontSize: '1.1rem' }}>
                                                <XCircle size={20} />
                                                <span style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 700 }}>You:</span>
                                                {q.studentAnswer || 'NO RESPONSE'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.5rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '14px', border: '1px dashed #22c55e', fontWeight: 900, fontSize: '1.1rem' }}>
                                                <CheckCircle size={20} />
                                                <span style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 700 }}>Correct Answer:</span>
                                                {q.correctAnswer}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '4rem' }}>
                <button
                    onClick={() => {
                        sessionStorage.removeItem('lastSubmission');
                        navigate('/');
                    }}
                    style={{ padding: '1rem 3rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-xl)', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.2)', transition: 'all 0.3s' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    Return to Portal Home <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default StudentResult;
