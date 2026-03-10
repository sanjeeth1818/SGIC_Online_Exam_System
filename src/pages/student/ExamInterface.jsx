import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

// Static helper moved outside to prevent re-creation
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const ExamInterface = () => {
    const navigate = useNavigate();

    // Settings mode: 'scroll' | 'step'
    const [mode, setMode] = useState(sessionStorage.getItem('examMode') || 'scroll');
    const [timeMode, setTimeMode] = useState('full'); // 'full' | 'question'
    const [baseDuration, setBaseDuration] = useState(3600);
    const [timeLeft, setTimeLeft] = useState(3599);
    const [perQuestionTime, setPerQuestionTime] = useState({}); // Tracking time left per question
    const [currentStep, setCurrentStep] = useState(0);

    // Timestamp-based deterministic timer state
    const [startTime, setStartTime] = useState(Date.now());
    const [initialTimeForStep, setInitialTimeForStep] = useState(3600);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [timeSpent, setTimeSpent] = useState({}); // Tracking actual seconds spent per question

    // Use a ref for currentStep and questions to use in timer without restarting it
    const stateRef = useRef({ currentStep, questions, timeMode, isTransitioning, isSubmitting });
    useEffect(() => {
        stateRef.current = { currentStep, questions, timeMode, isTransitioning, isSubmitting };
    }, [currentStep, questions, timeMode, isTransitioning, isSubmitting]);

    const fetchQuestions = useCallback(async () => {
        const code = sessionStorage.getItem('currentExamCode');
        if (!code) {
            navigate('/');
            return;
        }

        try {
            // Fetch test details first for duration and mode
            const testRes = await fetch(`/api/exam-portal/verify/${code}`);
            if (!testRes.ok) {
                const errData = await testRes.json().catch(() => ({}));
                throw new Error(errData.message || 'Test not found or access denied');
            }
            const testData = await testRes.json();

            // Store time settings
            const tMode = testData.timeMode || 'full';
            setTimeMode(tMode);

            // Calculate duration in seconds
            let durationSeconds = 0;
            if (testData.isReopened) {
                // Re-opened exams only use the additional time block
                durationSeconds = (parseInt(testData.additionalTime) || 0) * 60;
            } else {
                durationSeconds = parseInt(testData.timeValue) * (testData.timeUnit === 'secs' ? 1 : 60);
                if (testData.timeUnit === 'hours') durationSeconds *= 3600;

                // Add additional time if granted
                if (testData.additionalTime) {
                    durationSeconds += (parseInt(testData.additionalTime) * 60);
                }
            }

            setBaseDuration(durationSeconds);

            // TIMER PERSISTENCE: Check when the exam actually started
            let effectiveStartTime = Date.now();
            let initialTimeLeft = durationSeconds;

            const serverStartedAt = testData.startedAt || sessionStorage.getItem('examStartedAt');
            if (serverStartedAt) {
                const startTimeMs = new Date(serverStartedAt).getTime();
                const nowMs = Date.now();
                const elapsedSeconds = Math.floor((nowMs - startTimeMs) / 1000);

                initialTimeLeft = Math.max(0, durationSeconds - elapsedSeconds);
                effectiveStartTime = nowMs; // Timer continues from NOW but with reduced initialTimeLeft
                console.log(`Timer Sync: ${elapsedSeconds}s elapsed. Remaining: ${initialTimeLeft}s`);
            }

            setInitialTimeForStep(initialTimeLeft);
            setTimeLeft(initialTimeLeft);
            setStartTime(effectiveStartTime);

            // Force 'step' mode if timing is per question
            if (tMode === 'question') {
                setMode('step');
            } else {
                setMode(testData.examMode || 'scroll');
            }

            // Fetch questions
            const questRes = await fetch(`/api/exam-portal/questions/${code}`);
            if (!questRes.ok) throw new Error('Failed to fetch questions');
            const questData = await questRes.json();

            const questionsList = questData.map(q => ({
                id: q.id,
                type: q.type.toLowerCase(),
                text: q.text,
                options: q.options || []
            }));

            setQuestions(questionsList);

            // Initialize per-question times if in question mode
            if (tMode === 'question') {
                const initialTimes = {};
                questionsList.forEach((_, idx) => {
                    initialTimes[idx] = durationSeconds; // Each question gets full duration initially
                });
                setPerQuestionTime(initialTimes);
            }

            // Initialize time spent
            const initialSpent = {};
            questionsList.forEach(q => { initialSpent[q.id] = 0; });
            setTimeSpent(initialSpent);

            // RESUMPTION LOGIC: Fetch previous answers if any
            try {
                const resumeRes = await fetch(`/api/exam-portal/resume-state/${code}`);
                if (resumeRes.ok) {
                    const resumeData = await resumeRes.json();
                    if (resumeData.answers && Object.keys(resumeData.answers).length > 0) {
                        console.log("Resuming exam: restoring previous answers", resumeData.answers);
                        setAnswers(resumeData.answers);
                    }
                }
            } catch (resumeErr) {
                console.warn("Failed to fetch resume state:", resumeErr);
            }

            // INSTANT PERSISTENCE: Restore locally cached answers (important for immediate refresh)
            const cachedAnswers = sessionStorage.getItem(`examAnswers_${code}`);
            if (cachedAnswers) {
                try {
                    const parsed = JSON.parse(cachedAnswers);
                    setAnswers(prev => ({ ...prev, ...parsed }));
                } catch (e) {
                    console.error("Failed to parse cached answers", e);
                }
            }

            // NAVIGATION PERSISTENCE: Restore question position
            const savedStep = sessionStorage.getItem('examCurrentStep');
            if (savedStep && parseInt(savedStep) < questionsList.length) {
                setCurrentStep(parseInt(savedStep));
            }

            setIsLoading(false);
        } catch (error) {
            console.error(error);
            navigate('/');
        }
    }, [navigate]);

    const handleAnswerChange = useCallback((qId, value) => {
        setAnswers(prev => {
            const next = { ...prev, [qId]: value };
            // Save to local cache immediately
            const code = sessionStorage.getItem('currentExamCode');
            sessionStorage.setItem(`examAnswers_${code}`, JSON.stringify(next));
            return next;
        });
    }, []);

    const saveProgress = useCallback(async (updatedTimeSpent) => {
        const payload = {
            studentName: sessionStorage.getItem('studentName') || 'Guest',
            examCode: sessionStorage.getItem('currentExamCode'),
            testId: sessionStorage.getItem('testId'),
            answers: answers,
            timeSpent: updatedTimeSpent || timeSpent,
            isFinal: false // Intermediate progress save should not trigger emails
        };

        try {
            await fetch('/api/submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }, [answers, timeSpent]);

    const processFinalSubmission = useCallback(async () => {
        if (isLoading || isSubmitting) return;

        setIsSubmitting(true);
        setShowConfirmModal(false);
        const code = sessionStorage.getItem('currentExamCode');

        // Save last question's time spent
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const currentQId = questions[currentStep]?.id;
        const totalSpentOnThis = (timeSpent[currentQId] || 0) + elapsed;
        const finalTimeSpent = { ...timeSpent, [currentQId]: totalSpentOnThis };

        const payload = {
            studentName: sessionStorage.getItem('studentName') || 'Guest',
            examCode: code,
            testId: sessionStorage.getItem('testId'),
            answers: answers,
            timeSpent: finalTimeSpent,
            isFinal: true
        };

        // RETRY LOGIC for final submission
        let attempts = 0;
        const maxAttempts = 3;
        let success = false;

        while (attempts < maxAttempts && !success) {
            try {
                attempts++;
                const res = await fetch('/api/submissions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(errorText || 'Failed to submit');
                }

                const resultData = await res.json();
                success = true;

                // Mark the exam code as USED
                try {
                    await fetch('/api/exam-entry/complete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: code })
                    });
                } catch (error) {
                    console.error('Failed to mark code as used:', error);
                }

                sessionStorage.setItem('lastSubmission', JSON.stringify(resultData));
                sessionStorage.removeItem('examCurrentStep');
                sessionStorage.removeItem('examStartedAt');
                sessionStorage.removeItem('examSessionToken');
                navigate('/complete');

            } catch (error) {
                console.error(`Submission Attempt ${attempts} Failed:`, error);
                if (attempts === maxAttempts) {
                    alert(`Submission Failed after ${maxAttempts} attempts: ${error.message}. Please check your connection and try again.`);
                    setIsSubmitting(false);
                } else {
                    // Wait 1s before retry
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
    }, [isLoading, isSubmitting, startTime, questions, currentStep, timeSpent, answers, navigate]);

    const handleSubmit = useCallback(() => {
        if (isLoading || isSubmitting) return;
        setShowConfirmModal(true);
    }, [isLoading, isSubmitting]);

    const handleStepChange = useCallback((newStep) => {
        if (isTransitioning) return;

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const currentQId = questions[currentStep]?.id;

        // 1. Calculate and save remaining time for current step
        if (timeMode === 'question') {
            const currentRemaining = Math.max(0, initialTimeForStep - elapsed);
            setPerQuestionTime(prev => ({ ...prev, [currentStep]: currentRemaining }));

            // 2. Prepare for next step
            setInitialTimeForStep(perQuestionTime[newStep] ?? baseDuration);
        } else {
            // Whole Test Mode: We MUST carry over the remaining time to the next question
            setInitialTimeForStep(prev => Math.max(0, prev - elapsed));
        }

        // 3. Accumulate time spent
        const updatedSpent = {
            ...timeSpent,
            [currentQId]: (timeSpent[currentQId] || 0) + elapsed
        };
        setTimeSpent(updatedSpent);

        // 4. Persistence & Auto-save
        sessionStorage.setItem('examCurrentStep', newStep.toString());
        saveProgress(updatedSpent);

        // 5. Reset anchors
        setStartTime(Date.now());
        setCurrentStep(newStep);
    }, [isTransitioning, startTime, questions, currentStep, timeMode, initialTimeForStep, perQuestionTime, baseDuration, timeSpent, saveProgress]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Unified Timer Effect (Updates UI and Checks for Timeout)
    useEffect(() => {
        if (isLoading) return;

        const interval = setInterval(() => {
            const { isTransitioning, isSubmitting, currentStep, questions, timeMode } = stateRef.current;
            if (isTransitioning || isSubmitting) return;

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, initialTimeForStep - elapsed);

            setTimeLeft(remaining);

            // AUTO-ADVANCE LOGIC
            if (remaining === 0) {
                if (timeMode === 'question') {
                    if (currentStep < questions.length - 1) {
                        setIsTransitioning(true);
                        handleStepChange(currentStep + 1);
                        setTimeout(() => setIsTransitioning(false), 300);
                    } else {
                        clearInterval(interval);
                        handleSubmit();
                    }
                } else {
                    clearInterval(interval);
                    handleSubmit();
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isLoading, startTime, initialTimeForStep, handleStepChange, handleSubmit]);

    // LIVE TIME UPDATES: Background polling for extra time
    useEffect(() => {
        if (isLoading) return;

        const pollInterval = setInterval(async () => {
            try {
                const code = sessionStorage.getItem('currentExamCode');
                if (!code) return;
                const testRes = await fetch(`/api/exam-portal/verify/${code}`);
                if (!testRes.ok) return;

                const testData = await testRes.json();
                const newAdditionalMinutes = parseInt(testData.additionalTime || 0);

                let baseDur = parseInt(testData.timeValue) * (testData.timeUnit === 'secs' ? 1 : 60);
                if (testData.timeUnit === 'hours') baseDur *= 3600;
                const newTotalDuration = baseDur + (newAdditionalMinutes * 60);

                if (newTotalDuration !== baseDuration) {
                    const diff = newTotalDuration - baseDuration;
                    console.log(`Live Time Sync: Detected ${diff}s of extra time! Updating timer...`);

                    setBaseDuration(newTotalDuration);
                    setInitialTimeForStep(prev => prev + diff);
                }
            } catch (err) {
                console.warn("Live Time Sync checking failed:", err);
            }
        }, 30000);

        return () => clearInterval(pollInterval);
    }, [isLoading, baseDuration]);

    const answeredCount = Object.keys(answers).filter(k => answers[k] !== '' && answers[k] !== null).length;
    const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

    if (isLoading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Loading Exam Questions...</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>

            {/* Background Mask */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '220px',
                background: 'var(--bg-app)',
                zIndex: 30
            }}></div>

            {/* Fixed Progress Bar */}
            <div style={{
                position: 'fixed',
                top: '110px',
                left: '2rem',
                right: '2rem',
                zIndex: 40,
                background: 'var(--bg-surface)',
                padding: '1.5rem',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                maxWidth: 'calc(100vw - 4rem)'
            }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
                        <span>Progress: {answeredCount} / {questions.length} Answered</span>
                        <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--success)', width: `${progressPercent}%`, transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginLeft: '3rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        background: timeLeft < baseDuration * 0.2 ? 'var(--error-bg)' : timeLeft < baseDuration * 0.5 ? 'rgba(245, 158, 11, 0.1)' : 'var(--success-bg)',
                        color: timeLeft < baseDuration * 0.2 ? 'var(--error)' : timeLeft < baseDuration * 0.5 ? 'var(--warning)' : 'var(--success)',
                        padding: '0.75rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        fontSize: '1.25rem',
                        transition: 'all 0.3s ease',
                        border: `1px solid ${timeLeft < baseDuration * 0.2 ? 'var(--error)' : timeLeft < baseDuration * 0.5 ? 'var(--warning)' : 'var(--success)'}`
                    }}>
                        <Clock size={22} className={timeLeft < 10 ? 'animate-pulse' : ''} />
                        <span style={{ fontFamily: 'monospace' }}>{formatTime(timeLeft)}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{
                            padding: '0.75rem 2rem',
                            background: isSubmitting ? 'var(--text-tertiary)' : 'var(--primary)',
                            color: 'white',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 600,
                            border: 'none',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Submitting...
                            </>
                        ) : 'Submit Test'}
                    </button>
                </div>
            </div>

            <div style={{ height: '130px' }}></div>

            {mode === 'scroll' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                    {questions.map((q, index) => (
                        <div key={q.id} style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                    {index + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                        {q.text}
                                    </h3>

                                    {q.type === 'mcq' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {q.options.map((opt, i) => (
                                                <label key={i} style={{
                                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                                    padding: '1rem', borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${answers[q.id] === opt ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: answers[q.id] === opt ? 'var(--primary-light)' : 'transparent',
                                                    cursor: 'pointer', transition: 'all var(--transition-fast)'
                                                }}
                                                    onMouseEnter={e => { if (answers[q.id] !== opt) e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
                                                    onMouseLeave={e => { if (answers[q.id] !== opt) e.currentTarget.style.background = 'transparent' }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        value={opt}
                                                        checked={answers[q.id] === opt}
                                                        onChange={() => handleAnswerChange(q.id, opt)}
                                                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }}
                                                    />
                                                    <span style={{ fontSize: '1rem' }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            rows="5"
                                            placeholder="Type your answer here..."
                                            value={answers[q.id] || ''}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            style={{
                                                width: '100%', padding: '1rem', borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)', fontSize: '1rem', outline: 'none',
                                                fontFamily: 'inherit', resize: 'vertical',
                                                transition: 'border-color var(--transition-fast)'
                                            }}
                                            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ flex: 1, background: 'var(--bg-surface)', padding: '3rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>

                        <div style={{ fontSize: '1rem', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Question {currentStep + 1} of {questions.length}
                        </div>

                        <h3 style={{ fontSize: '1.5rem', fontWeight: 500, lineHeight: 1.5, marginBottom: '3rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                            {questions[currentStep]?.text}
                        </h3>

                        {questions[currentStep]?.type === 'mcq' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, opacity: timeLeft === 0 && timeMode === 'question' ? 0.6 : 1, pointerEvents: (timeLeft === 0 && timeMode === 'question') || isSubmitting ? 'none' : 'auto' }}>
                                {questions[currentStep].options.map((opt, i) => (
                                    <label key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                        padding: '1.25rem', borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${answers[questions[currentStep].id] === opt ? 'var(--primary)' : 'var(--border)'}`,
                                        background: answers[questions[currentStep].id] === opt ? 'var(--primary-light)' : 'transparent',
                                        cursor: 'pointer', transition: 'all var(--transition-fast)'
                                    }}
                                        onMouseEnter={e => { if (answers[questions[currentStep].id] !== opt) e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
                                        onMouseLeave={e => { if (answers[questions[currentStep].id] !== opt) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <input
                                            type="radio"
                                            name={`q-${questions[currentStep].id}`}
                                            checked={answers[questions[currentStep].id] === opt}
                                            onChange={() => handleAnswerChange(questions[currentStep].id, opt)}
                                            style={{ width: '24px', height: '24px', accentColor: 'var(--primary)' }}
                                            disabled={(timeLeft === 0 && timeMode === 'question') || isSubmitting}
                                        />
                                        <span style={{ fontSize: '1.125rem' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <textarea
                                    rows="8"
                                    placeholder="Type your answer here..."
                                    value={answers[questions[currentStep]?.id] || ''}
                                    onChange={(e) => handleAnswerChange(questions[currentStep].id, e.target.value)}
                                    disabled={(timeLeft === 0 && timeMode === 'question') || isSubmitting}
                                    style={{
                                        flex: 1, width: '100%', padding: '1.5rem', borderRadius: 'var(--radius-md)',
                                        border: '2px solid var(--border)', fontSize: '1.125rem', outline: 'none',
                                        fontFamily: 'inherit', resize: 'none',
                                        background: timeLeft === 0 && timeMode === 'question' ? 'var(--bg-app)' : 'transparent',
                                        transition: 'border-color var(--transition-fast)',
                                        opacity: timeLeft === 0 && timeMode === 'question' ? 0.6 : 1
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                />
                                {timeLeft === 0 && timeMode === 'question' && (
                                    <div style={{ color: 'var(--error)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={16} /> Time expired for this question.
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                            <button
                                disabled={currentStep === 0 || isTransitioning || isSubmitting}
                                onClick={() => handleStepChange(currentStep - 1)}
                                style={{ padding: '0.75rem 2rem', background: 'transparent', color: (currentStep === 0 || isTransitioning || isSubmitting) ? 'var(--text-tertiary)' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: (currentStep === 0 || isTransitioning || isSubmitting) ? 'default' : 'pointer' }}
                            >
                                Previous
                            </button>
                            <button
                                disabled={isTransitioning || isSubmitting}
                                onClick={() => {
                                    if (currentStep < questions.length - 1) handleStepChange(currentStep + 1);
                                    else handleSubmit();
                                }}
                                style={{ padding: '0.75rem 2rem', background: isSubmitting ? 'var(--text-tertiary)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: (isTransitioning || isSubmitting) ? 'default' : 'pointer', boxShadow: 'var(--shadow-sm)' }}
                            >
                                {isSubmitting ? 'Processing...' : (currentStep === questions.length - 1 ? 'Finish' : 'Next Question')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <div style={{
                        background: 'var(--bg-surface)',
                        padding: '2.5rem',
                        borderRadius: 'var(--radius-2xl)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border)',
                        width: '100%',
                        maxWidth: '480px',
                        textAlign: 'center',
                        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--primary-light)',
                            color: 'var(--primary)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <AlertCircle size={32} />
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                            Finish Exam?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
                            Are you sure you want to end your exam? You won't be able to change your answers after submitting.
                        </p>

                        {/* Stats Summary */}
                        <div style={{
                            background: 'var(--bg-app)',
                            padding: '1.25rem',
                            borderRadius: 'var(--radius-lg)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '1rem',
                            marginBottom: '2rem',
                            textAlign: 'left'
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Questions</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{questions.length}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Answered</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)' }}>{answeredCount}</div>
                            </div>
                            {questions.length - answeredCount > 0 && (
                                <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--error)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <AlertCircle size={14} /> You have {questions.length - answeredCount} unanswered questions.
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Continue Exam
                            </button>
                            <button
                                onClick={processFinalSubmission}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Yes, Submit
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ExamInterface;
