import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, Target, ChevronRight, CheckCircle, XCircle } from 'lucide-react';

const StudentResult = () => {
    const navigate = useNavigate();
    const data = JSON.parse(localStorage.getItem('lastSubmission') || '{}');
    const submission = data.submission || {};
    const breakdown = data.breakdown || [];
    const studentName = submission.studentName || 'Student';

    const scorePercent = submission.totalQuestions > 0
        ? Math.round((submission.score / submission.totalQuestions) * 100)
        : 0;

    // Calculate Category Breakdown
    const categoryStats = breakdown.reduce((acc, q) => {
        if (!acc[q.categoryName]) acc[q.categoryName] = { correct: 0, total: 0 };
        acc[q.categoryName].total++;
        if (q.isCorrect) acc[q.categoryName].correct++;
        return acc;
    }, {});

    const categoryList = Object.keys(categoryStats).map(name => ({
        name,
        score: Math.round((categoryStats[name].correct / categoryStats[name].total) * 100),
        color: (categoryStats[name].correct / categoryStats[name].total) >= 0.8 ? 'var(--success)' : (categoryStats[name].correct / categoryStats[name].total) >= 0.5 ? 'var(--primary)' : 'var(--error)'
    }));


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
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>
                        {scorePercent >= 75 ? 'A' : scorePercent >= 60 ? 'B' : scorePercent >= 45 ? 'C' : 'S'}
                    </div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Based on your score</div>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Time Taken</div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--warning)', lineHeight: 1 }}>{submission.timeTaken || 'N/A'}</div>
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Exam Duration Result</div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div style={{ display: 'grid', gridTemplateColumns: showAnswers ? '1fr 2fr' : '1fr', gap: '2rem' }}>

                {/* Category Performance */}
                <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', alignSelf: 'start' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Target size={20} color="var(--primary)" /> Category Analysis</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {categoryList.map(cat => (
                            <div key={cat.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    <span>{cat.name}</span>
                                    <span>{cat.score}%</span>
                                </div>
                                <div style={{ height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${cat.score}%`, height: '100%', background: cat.color, borderRadius: '4px' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                        <button
                            onClick={() => {
                                localStorage.removeItem('lastSubmission');
                                navigate('/');
                            }}
                            style={{ width: '100%', padding: '0.875rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            Return to Home <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Question Review */}
                {showAnswers && (
                    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Question Review</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {breakdown.map((q, i) => (
                                <div key={i} style={{ padding: '2rem', borderBottom: i < breakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ marginTop: '0.25rem' }}>
                                            {q.isCorrect ? <CheckCircle size={24} color="var(--success)" /> : <XCircle size={24} color="var(--error)" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                                                <span style={{ color: 'var(--text-tertiary)', marginRight: '0.5rem' }}>{i + 1}.</span>
                                                {q.questionText}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <div style={{
                                                    padding: '1rem', borderRadius: 'var(--radius-md)',
                                                    background: q.isCorrect ? 'var(--success-bg)' : 'var(--error-bg)',
                                                    border: `1px solid ${q.isCorrect ? 'var(--success)' : 'var(--error)'}`,
                                                    display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                                                }}>
                                                    <span style={{ fontWeight: 600, color: q.isCorrect ? 'var(--success)' : 'var(--error)', width: '60px' }}>You:</span>
                                                    <span style={{ color: q.isCorrect ? 'var(--success)' : 'var(--text-primary)', fontWeight: q.isCorrect ? 700 : 400 }}>{q.studentAnswer || 'No Answer'}</span>
                                                </div>

                                                {!q.isCorrect && (
                                                    <div style={{
                                                        padding: '1rem', borderRadius: 'var(--radius-md)',
                                                        background: 'var(--success-bg)', border: '1px dashed var(--success)',
                                                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                                                    }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--success)', width: '60px' }}>Correct:</span>
                                                        <span style={{ color: 'var(--text-primary)' }}>{q.correctAnswer}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default StudentResult;
