import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, Loader2, AlertCircle, LogOut } from 'lucide-react';

// Static helper moved outside to prevent re-creation
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 && h > 0 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
};

const scrollToQuestion = (index) => {
    const element = document.getElementById(`question-card-${index}`);
    if (element) {
        const headerOffset = 130;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
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
    const [showExitModal, setShowExitModal] = useState(false);
    const [isDuplicateTab, setIsDuplicateTab] = useState(false);
    const [isTimedOut, setIsTimedOut] = useState(false);

    // Multi-tab Management
    const channelRef = useRef(null);
    const tabIdRef = useRef(Date.now().toString() + Math.random().toString());

    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeSpent, setTimeSpent] = useState({}); // Tracking actual seconds spent per question

    // Use a ref for currentStep and questions to use in timer without restarting it
    const [visitStartTime, setVisitStartTime] = useState(Date.now()); // For timeSpent tracking

    // Proctoring State
    const MAX_WARNINGS = 3;
    const [warnings, setWarnings] = useState(() => {
        const code = sessionStorage.getItem('currentExamCode');
        return parseInt(sessionStorage.getItem(`examWarnings_${code}`) || '0', 10);
    });
    const [showWarningModal, setShowWarningModal] = useState(false);
    const lastStrikeTimeRef = useRef(0);

    // Use a ref for all critical state to use in event listeners and timers without closures
    const stateRef = useRef({ currentStep, questions, timeMode, isTransitioning, isSubmitting, perQuestionTime, visitStartTime, answers, timeSpent, startTime, warnings });
    useEffect(() => {
        stateRef.current = { currentStep, questions, timeMode, isTransitioning, isSubmitting, perQuestionTime, visitStartTime, answers, timeSpent, startTime, warnings };
    }, [currentStep, questions, timeMode, isTransitioning, isSubmitting, perQuestionTime, visitStartTime, answers, timeSpent, startTime, warnings]);

    // Initialize BroadcastChannel for cross-tab communication
    useEffect(() => {
        const code = sessionStorage.getItem('currentExamCode');
        if (!code) return;

        const channelName = `exam_channel_${code}`;
        const channel = new BroadcastChannel(channelName);
        channelRef.current = channel;

        // When this newly opened tab loads, ask if any other tab is already running the exam
        channel.postMessage({ type: 'CHECK_EXISTING', tabId: tabIdRef.current });

        channel.onmessage = (event) => {
            if (event.data.type === 'CHECK_EXISTING' && event.data.tabId !== tabIdRef.current) {
                // We are the older, active tab. Tell the new tab access is denied.
                channel.postMessage({ type: 'ACCESS_DENIED', targetTabId: event.data.tabId });
            } else if (event.data.type === 'ACCESS_DENIED' && event.data.targetTabId === tabIdRef.current) {
                // We are the new tab, and an older tab just denied our access
                setIsDuplicateTab(true);
                sessionStorage.removeItem('currentExamCode');
                sessionStorage.removeItem('examStartedAt');
                sessionStorage.removeItem('examSessionToken');
            }
        };

        return () => {
            channel.close();
        };
    }, [navigate]);

    const fetchQuestions = useCallback(async () => {
        if (isDuplicateTab) return; // Silent stop if this tab is denied access

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
                const timeVal = parseInt(testData.timeValue) || 0;
                if (testData.timeUnit === 'secs') {
                    durationSeconds = timeVal;
                } else if (testData.timeUnit === 'hours') {
                    durationSeconds = timeVal * 3600;
                } else {
                    // Default to mins
                    durationSeconds = timeVal * 60;
                }

                // Add additional time if granted
                if (testData.additionalTime) {
                    durationSeconds += (parseInt(testData.additionalTime) * 60);
                }
            }

            setBaseDuration(durationSeconds);

            // Fetch questions FIRST to know length
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

            // NAVIGATION PERSISTENCE: Restore question position FIRST (so timers map correctly)
            let activeStepIndex = 0;
            const savedStep = sessionStorage.getItem(`examCurrentStep_${code}`);
            if (savedStep && parseInt(savedStep) < questionsList.length) {
                activeStepIndex = parseInt(savedStep);
                setCurrentStep(activeStepIndex);
            }

            // TIMER PERSISTENCE
            let effectiveStartTime = Date.now();
            let initialTimeLeft = durationSeconds;

            if (tMode === 'question') {
                // Per-Question Mode Timer Logic
                let initialTimes = {};
                const cachedTimes = sessionStorage.getItem(`examPerQuestionTime_${code}`);
                
                if (cachedTimes) {
                    try { initialTimes = JSON.parse(cachedTimes); } 
                    catch (e) { console.error("Could not parse cached times", e); }
                }

                // Fill any missing questions with max duration
                questionsList.forEach((_, idx) => {
                    if (initialTimes[idx] === undefined) {
                        initialTimes[idx] = durationSeconds;
                    }
                });

                setPerQuestionTime(initialTimes);
                
                // STABLE ANCHOR: Restore the exact moment the active question started
                const activeStartedAt = sessionStorage.getItem(`examActiveQuestionStartedAt_${code}`);
                let anchorTime = Date.now();

                if (activeStartedAt) {
                    anchorTime = parseInt(activeStartedAt);
                } else {
                    sessionStorage.setItem(`examActiveQuestionStartedAt_${code}`, anchorTime.toString());
                }

                setStartTime(anchorTime);
                setVisitStartTime(Date.now()); // Tracking starts NOW
                setInitialTimeForStep(initialTimes[activeStepIndex]);
                
                // Calculate current timeLeft for immediate UI update
                const elapsedSinceAnchor = Math.floor((Date.now() - anchorTime) / 1000);
                setTimeLeft(Math.max(0, initialTimes[activeStepIndex] - elapsedSinceAnchor));

                setMode('step'); // Force step mode
            } else {
                // Global Mode Timer Logic
                const serverStartedAt = sessionStorage.getItem(`examStartedAt_${code}`) || testData.startedAt;
                let anchorTime = Date.now();

                if (serverStartedAt) {
                    anchorTime = new Date(serverStartedAt).getTime();
                    // Ensure session storage matches
                    if (!sessionStorage.getItem(`examStartedAt_${code}`)) {
                        sessionStorage.setItem(`examStartedAt_${code}`, new Date(anchorTime).toISOString());
                    }
                } else {
                    const now = new Date().toISOString();
                    sessionStorage.setItem(`examStartedAt_${code}`, now);
                    anchorTime = new Date(now).getTime();
                }

                setStartTime(anchorTime);
                setVisitStartTime(Date.now()); // Tracking starts NOW
                setInitialTimeForStep(durationSeconds);
                
                const elapsedSinceAnchor = Math.floor((Date.now() - anchorTime) / 1000);
                setTimeLeft(Math.max(0, durationSeconds - elapsedSinceAnchor));
                
                setMode(testData.examMode || 'scroll');
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

            // (Navigation persistence moved to top of block)

            setIsLoading(false);
        } catch (error) {
            console.error('Exam Verification Error:', error);
            setError(`Admission Error: ${error.message}. Please contact your administrator or check your examination code.`);
            setIsLoading(false);
        }
    }, [isDuplicateTab, navigate]);

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

    const processFinalSubmission = useCallback(async (redirectPath = '/complete') => {
        if (isLoading || isSubmitting) return;

        setIsSubmitting(true);
        setShowConfirmModal(false);
        setShowExitModal(false);
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
                sessionStorage.removeItem(`examCurrentStep_${code}`);
                sessionStorage.removeItem(`examStartedAt_${code}`);
                sessionStorage.removeItem('examSessionToken');
                navigate(redirectPath);

            } catch (error) {
                console.error(`Submission Attempt ${attempts} Failed:`, error);
                if (attempts === maxAttempts) {
                    setError(`Submission Failed after ${maxAttempts} attempts: ${error.message}. Please check your connection and try again.`);
                    setIsSubmitting(false);
                } else {
                    // Wait 1s before retry
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
    }, [isLoading, isSubmitting, startTime, questions, currentStep, timeSpent, answers, navigate]);

    const handleTimeout = useCallback(() => {
        if (isTimedOut || isSubmitting) return;
        setIsTimedOut(true);
        // We trigger the final submission immediately
        processFinalSubmission();
    }, [isTimedOut, isSubmitting, processFinalSubmission]);

    const handleSubmit = useCallback(() => {
        if (isLoading || isSubmitting) return;
        setShowConfirmModal(true);
    }, [isLoading, isSubmitting]);

    const handleStepChange = useCallback((newStep) => {
        if (isTransitioning) return;
        
        // Block navigation to timed-out questions in per-question mode
        if (timeMode === 'question' && perQuestionTime[newStep] === 0) {
            console.log(`Navigation blocked: Question ${newStep + 1} has already timed out.`);
            return;
        }

        const now = Date.now();
        const elapsedSinceVisit = Math.floor((now - visitStartTime) / 1000);
        const currentQId = questions[currentStep]?.id;

        // 1. Calculate and save remaining time for current step
        if (timeMode === 'question') {
            const elapsedSinceAnchor = Math.floor((now - startTime) / 1000);
            const currentRemaining = Math.max(0, initialTimeForStep - elapsedSinceAnchor);
            
            // Atomically update perQuestionTime immediately in session storage
            const updatedTimes = { ...perQuestionTime, [currentStep]: currentRemaining };
            setPerQuestionTime(updatedTimes);
            sessionStorage.setItem(`examPerQuestionTime_${sessionStorage.getItem('currentExamCode')}`, JSON.stringify(updatedTimes));

            // 2. Prepare for next step
            setInitialTimeForStep(updatedTimes[newStep] ?? baseDuration);
            
            // Update anchor for NEXT question
            setStartTime(now);
            sessionStorage.setItem(`examActiveQuestionStartedAt_${sessionStorage.getItem('currentExamCode')}`, now.toString());
        }

        // 3. Accumulate time spent (using visit anchor for precision)
        const updatedSpent = {
            ...timeSpent,
            [currentQId]: (timeSpent[currentQId] || 0) + elapsedSinceVisit
        };
        setTimeSpent(updatedSpent);

        // 4. Persistence & Reset
        sessionStorage.setItem(`examCurrentStep_${sessionStorage.getItem('currentExamCode')}`, newStep.toString());
        saveProgress(updatedSpent);
        setVisitStartTime(now);
        setCurrentStep(newStep);
    }, [isTransitioning, timeMode, perQuestionTime, currentStep, questions, visitStartTime, startTime, initialTimeForStep, baseDuration, timeSpent, saveProgress]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    // Listen for Exit request from header
    useEffect(() => {
        const handleExitRequest = () => setShowExitModal(true);
        window.addEventListener('requestExamExit', handleExitRequest);
        return () => window.removeEventListener('requestExamExit', handleExitRequest);
    }, []);

    // AUTO-SUBMIT ON BROWSER CLOSE/TAB CLOSE
    useEffect(() => {
        const handlePageHide = () => {
            const { isSubmitting, isTransitioning, questions, currentStep, answers, timeSpent, startTime, perQuestionTime } = stateRef.current;
            
            // If already submitting or if we haven't loaded questions yet, don't do anything
            if (isSubmitting || questions.length === 0) return;

            const code = sessionStorage.getItem('currentExamCode');
            if (!code) return;

            // Final time spent calculation for the current question
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const currentQId = questions[currentStep]?.id;
            const finalTimeSpent = { ...timeSpent };
            if (currentQId) {
                finalTimeSpent[currentQId] = (timeSpent[currentQId] || 0) + elapsed;
            }

            const payload = {
                studentName: sessionStorage.getItem('studentName') || 'Guest',
                examCode: code,
                testId: sessionStorage.getItem('testId'),
                answers: answers,
                timeSpent: finalTimeSpent,
                isFinal: true
            };

            // Use navigator.sendBeacon for reliable background submission
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('/api/submissions', blob);
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => window.removeEventListener('pagehide', handlePageHide);
    }, []);

    // ACTIVE PROCTORING (Anti-Cheat: Tab Switching)
    useEffect(() => {
        const handleVisibilityChange = () => {
            const { isSubmitting, questions, timeSpent, startTime, currentStep, answers, warnings } = stateRef.current;
            
            // If already submitting or haven't loaded questions, do nothing
            if (isSubmitting || questions.length === 0) return;

            if (document.hidden) {
                const now = Date.now();
                // Throttle: Don't allow multiple strikes within 3 seconds 
                // to prevent rapid-fire triggers from browser event quirks
                if (now - lastStrikeTimeRef.current < 3000) return;
                lastStrikeTimeRef.current = now;

                const code = sessionStorage.getItem('currentExamCode');
                const newWarnings = warnings + 1;
                
                if (code) {
                    sessionStorage.setItem(`examWarnings_${code}`, newWarnings.toString());
                }
                setWarnings(newWarnings);

                if (newWarnings >= MAX_WARNINGS) {
                    // Auto-submit on max warnings
                    if (!code) return;

                    const now = Date.now();
                    const elapsed = Math.floor((now - startTime) / 1000);
                    const currentQId = questions[currentStep]?.id;
                    const finalTimeSpent = { ...timeSpent };
                    if (currentQId) {
                        finalTimeSpent[currentQId] = (timeSpent[currentQId] || 0) + elapsed;
                    }

                    const payload = {
                        studentName: sessionStorage.getItem('studentName') || 'Guest',
                        examCode: code,
                        testId: sessionStorage.getItem('testId'),
                        answers: answers,
                        timeSpent: finalTimeSpent,
                        isFinal: true
                    };

                    // We need to capture the results, so we use a regular fetch instead of just sendBeacon.
                    // If the page is being hidden, fetch might still work for the brief moment before the redirect.
                    const autoSubmit = async () => {
                        try {
                            const res = await fetch('/api/submissions', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload)
                            });
                            
                            if (res.ok) {
                                const resultData = await res.json();
                                sessionStorage.setItem('lastSubmission', JSON.stringify(resultData));
                                
                                // Mark used
                                await fetch('/api/exam-entry/complete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ code: code })
                                });
                            }
                        } catch (err) {
                            console.error("Auto-submit fetch failed, falling back to beacon", err);
                            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                            navigator.sendBeacon('/api/submissions', blob);
                            
                            const markUsedBlob = new Blob([JSON.stringify({ code: code })], { type: 'application/json' });
                            navigator.sendBeacon('/api/exam-entry/complete', markUsedBlob);
                        } finally {
                            sessionStorage.removeItem(`examCurrentStep_${code}`);
                            sessionStorage.removeItem(`examStartedAt_${code}`);
                            sessionStorage.removeItem('examSessionToken');
                            window.location.href = '/result'; // Redirect to /result instead of /complete
                        }
                    };
                    
                    autoSubmit();
                } else {
                    setShowWarningModal(true);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, []);

    // Unified Timer Effect (Updates UI and Checks for Timeout)
    useEffect(() => {
        if (isLoading) return;

        const interval = setInterval(() => {
            const { isTransitioning, isSubmitting, currentStep, questions, timeMode } = stateRef.current;

            if (isTransitioning || isSubmitting) return;

            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = Math.max(0, initialTimeForStep - elapsed);

            setTimeLeft(remaining);

            // AUTO-ADVANCE / KICK-BACK LOGIC
            if (remaining === 0) {
                if (timeMode === 'question') {
                    // Update perQuestionTime for current step to 0 immediately
                    const currentCode = sessionStorage.getItem('currentExamCode');
                    const currentTimesMap = stateRef.current.perQuestionTime;
                    const updatedTimes = { ...currentTimesMap, [currentStep]: 0 };
                    
                    // We need to find if ANY OTHER question has time remaining
                    let nextAvailableIdx = -1;
                    // First check from current + 1 onwards
                    for (let i = 1; i < questions.length; i++) {
                        const checkIdx = (currentStep + i) % questions.length;
                        if (updatedTimes[checkIdx] > 0) {
                            nextAvailableIdx = checkIdx;
                            break;
                        }
                    }

                    if (nextAvailableIdx !== -1) {
                        // Kick back to the next available question
                        setIsTransitioning(true);
                        handleStepChange(nextAvailableIdx);
                        setTimeout(() => setIsTransitioning(false), 300);
                    } else {
                        // All questions are finished!
                        clearInterval(interval);
                        handleTimeout();
                    }
                } else {
                    clearInterval(interval);
                    handleTimeout();
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

    // --- RENDER LAYERS ---

    // 1. DUPLICATE TAB BLOCKER (Highest Priority)
    if (isDuplicateTab) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000,
                animation: 'fadeIn 0.5s ease'
            }}>
                <div style={{
                    background: 'var(--bg-surface)',
                    padding: '3.5rem',
                    borderRadius: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--border)',
                    width: '100%',
                    maxWidth: '540px',
                    textAlign: 'center',
                    animation: 'modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{
                        width: '96px', height: '96px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--error)',
                        borderRadius: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 2.5rem auto',
                        boxShadow: '0 10px 20px rgba(239, 68, 68, 0.15)'
                    }}>
                        <AlertCircle size={48} />
                    </div>

                    <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                        Access Restricted
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.7, fontSize: '1.15rem' }}>
                        Examination is already running in another tab. This duplicate session has been blocked to ensure examination integrity.
                    </p>

                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            borderRadius: '20px',
                            border: 'none',
                            background: 'var(--primary)',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                            boxShadow: '0 10px 30px rgba(var(--primary-rgb), 0.4)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                    >
                        Return to Portal Home
                    </button>
                </div>
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes modalSlideUp { 
                        from { opacity: 0; transform: translateY(40px) scale(0.95); } 
                        to { opacity: 1; transform: translateY(0) scale(1); } 
                    }
                `}</style>
            </div>
        );
    }

    // 1.5. TIME OUT OVERLAY (Prevents any further interaction)
    if (isTimedOut) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.98)',
                backdropFilter: 'blur(20px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10001,
                animation: 'fadeIn 0.5s ease'
            }}>
                <div style={{
                    background: 'var(--bg-surface)',
                    padding: '3.5rem',
                    borderRadius: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '2px solid var(--primary)',
                    width: '100%',
                    maxWidth: '540px',
                    textAlign: 'center',
                    animation: 'modalSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{
                        width: '96px', height: '96px',
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        color: 'var(--primary)',
                        borderRadius: '28px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 2.5rem auto',
                        boxShadow: '0 10px 20px rgba(var(--primary-rgb), 0.15)',
                        animation: 'palse 2s infinite'
                    }}>
                        <Clock size={48} />
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                        Time Expired!
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', lineHeight: 1.7, fontSize: '1.25rem' }}>
                        Your examination time has concluded. Your answers are being submitted automatically. Please wait...
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <span style={{ fontWeight: 600, color: 'var(--text-tertiary)' }}>Finalizing Submission</span>
                    </div>
                </div>
                <style>{`
                    @keyframes palse {
                        0% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes modalSlideUp { 
                        from { opacity: 0; transform: translateY(40px) scale(0.95); } 
                        to { opacity: 1; transform: translateY(0) scale(1); } 
                    }
                `}</style>
            </div>
        );
    }

    // 1.75. WARNING MODAL (Proctoring)
    if (showWarningModal) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10002,
                animation: 'fadeIn 0.3s ease'
            }}>
                <div style={{
                    background: 'var(--bg-surface)',
                    padding: '3rem',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid var(--error)',
                    width: '100%',
                    maxWidth: '500px',
                    textAlign: 'center',
                    animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{
                        width: '80px', height: '80px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--error)',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 2rem auto'
                    }}>
                        <AlertCircle size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        Security Warning
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6, fontSize: '1.1rem' }}>
                        You navigated away from the examination tab. This is a violation of examination rules.
                    </p>
                    <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', border: '1px dashed var(--error)' }}>
                        <div style={{ fontWeight: 800, color: 'var(--error)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>Warning {warnings} of {MAX_WARNINGS}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Your examination will be automatically submitted if you reach {MAX_WARNINGS} warnings.</div>
                    </div>
                    <button
                        onClick={() => setShowWarningModal(false)}
                        style={{
                            width: '100%', padding: '1rem', borderRadius: '14px', border: 'none',
                            background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: '1.1rem',
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 4px 15px rgba(var(--primary-rgb), 0.3)'
                        }}
                    >
                        I Understand, Return to Exam
                    </button>
                </div>
            </div>
        );
    }

    // 2. ERROR STATE
    if (error) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{
                    maxWidth: '500px', width: '100%', background: 'var(--bg-surface)',
                    padding: '2.5rem', borderRadius: '24px', textAlign: 'center',
                    boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)'
                }}>
                    <div style={{ color: 'var(--error)', marginBottom: '1.5rem' }}>
                        <AlertCircle size={56} style={{ margin: '0 auto' }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Admission Conflict</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.6 }}>{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            width: '100%', padding: '1rem', borderRadius: '12px',
                            background: 'var(--primary)', color: 'white', fontWeight: 700,
                            border: 'none', cursor: 'pointer'
                        }}
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    // 3. LOADING STATE
    if (isLoading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={48} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1.5rem auto' }} />
                    <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Preparing Examination...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ maxWidth: '100%', padding: '0 3rem', margin: '0 auto', width: '100%', display: 'flex', gap: '2rem', paddingBottom: '3rem', alignItems: 'flex-start' }}>

                {/* Left Sidebar: Progress & Navigation (Sticky) */}
                <div style={{
                    width: '300px',
                    flexShrink: 0,
                    position: 'sticky',
                    top: '130px',
                    background: 'var(--bg-surface)',
                    padding: '1.5rem',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-md)',
                    border: '1px solid var(--border)',
                    maxHeight: 'calc(100vh - 160px)',
                    overflowY: 'auto'
                }}>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                            Progress
                        </div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {answeredCount} <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: '1rem' }}>of {questions.length} answered</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-app)', borderRadius: '3px', marginTop: '1rem', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--success)', width: `${progressPercent}%`, transition: 'width 0.3s ease' }}></div>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                        Questions
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                        {questions.map((q, idx) => {
                            const isCurrent = mode === 'step' ? currentStep === idx : false;
                            const isTimedOut = timeMode === 'question' && perQuestionTime[idx] === 0;
                            const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';

                            return (
                                <button
                                    key={q.id}
                                    disabled={isTimedOut && !isCurrent}
                                    onClick={() => {
                                        if (mode === 'scroll') {
                                            scrollToQuestion(idx);
                                        } else {
                                            if (!isTimedOut) handleStepChange(idx);
                                        }
                                    }}
                                    style={{
                                        aspectRatio: '1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600,
                                        fontSize: '0.875rem',
                                        cursor: isTimedOut ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s ease',
                                        background: isCurrent ? 'var(--primary)' : isTimedOut ? 'var(--bg-app)' : isAnswered ? 'var(--success-bg)' : 'transparent',
                                        color: isCurrent ? 'white' : isTimedOut ? 'var(--text-tertiary)' : isAnswered ? 'var(--success)' : 'var(--text-secondary)',
                                        border: `1px solid ${isCurrent ? 'var(--primary)' : isTimedOut ? 'var(--border)' : isAnswered ? 'var(--success)' : 'var(--border)'}`,
                                        boxShadow: isCurrent ? 'var(--shadow-sm)' : 'none',
                                        opacity: isTimedOut ? 0.6 : 1
                                    }}
                                    title={isTimedOut ? `Question ${idx + 1} (Timed Out)` : isAnswered ? `Question ${idx + 1} (Answered)` : `Question ${idx + 1}`}
                                >
                                    {isTimedOut ? <Clock size={12} /> : idx + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ flex: 1, maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {mode === 'scroll' ? (
                        // Scroll Mode: All questions in a list
                        questions.map((q, index) => (
                            <div
                                key={q.id}
                                id={`question-card-${index}`}
                                style={{
                                    background: 'var(--bg-surface)',
                                    padding: '2.5rem',
                                    borderRadius: 'var(--radius-xl)',
                                    boxShadow: 'var(--shadow-md)',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '1.5rem' }}>
                                    <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '50%', background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        {index + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '1.5rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                            {q.text}
                                        </h3>

                                        {q.type === 'mcq' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {q.options.map((opt, i) => (
                                                    <label key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: '1rem',
                                                        padding: '1rem', borderRadius: 'var(--radius-md)',
                                                        border: `2px solid ${answers[q.id] === opt ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: answers[q.id] === opt ? 'var(--primary-light)' : 'transparent',
                                                        cursor: 'pointer', transition: 'all var(--transition-fast)'
                                                    }}
                                                        onMouseEnter={e => { if (answers[q.id] !== opt) e.currentTarget.style.background = 'var(--bg-surface-hover)' }}
                                                        onMouseLeave={e => { if (answers[q.id] !== opt) e.currentTarget.style.background = 'transparent' }}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`q-${q.id}`}
                                                            checked={answers[q.id] === opt}
                                                            onChange={() => handleAnswerChange(q.id, opt)}
                                                            style={{ width: '22px', height: '22px', accentColor: 'var(--primary)', flexShrink: 0 }}
                                                        />
                                                        <span style={{ fontSize: '1.0625rem', flex: 1 }}>{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <textarea
                                                placeholder="Type your answer here..."
                                                rows="5"
                                                value={answers[q.id] || ''}
                                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                style={{
                                                    width: '100%', padding: '1.25rem', borderRadius: 'var(--radius-md)',
                                                    border: '2px solid var(--border)', fontSize: '1rem', outline: 'none',
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
                        ))
                    ) : (
                        // Step Mode: Current question only
                        <div style={{
                            background: 'var(--bg-surface)',
                            padding: '2.5rem',
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow-md)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '400px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    Question {currentStep + 1} of {questions.length}
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.25rem', fontWeight: 500, lineHeight: 1.6, marginBottom: '2rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                                {questions[currentStep]?.text}
                            </h3>

                            <div style={{ marginBottom: '2.5rem', flex: 1 }}>
                                {questions[currentStep]?.type === 'mcq' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: timeLeft === 0 && timeMode === 'question' ? 0.6 : 1, pointerEvents: (timeLeft === 0 && timeMode === 'question') || isSubmitting ? 'none' : 'auto' }}>
                                        {questions[currentStep].options.map((opt, i) => (
                                            <label key={i} style={{
                                                display: 'flex', alignItems: 'center', gap: '1rem',
                                                padding: '1rem', borderRadius: 'var(--radius-md)',
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
                                                    style={{ width: '22px', height: '22px', accentColor: 'var(--primary)', flexShrink: 0 }}
                                                    disabled={(timeLeft === 0 && timeMode === 'question') || isSubmitting}
                                                />
                                                <span style={{ fontSize: '1.0625rem', flex: 1 }}>{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <textarea
                                            placeholder="Type your answer here..."
                                            value={answers[questions[currentStep]?.id] || ''}
                                            onChange={(e) => handleAnswerChange(questions[currentStep].id, e.target.value)}
                                            disabled={(timeLeft === 0 && timeMode === 'question') || isSubmitting}
                                            style={{
                                                width: '100%', padding: '1.25rem', borderRadius: 'var(--radius-md)',
                                                border: '2px solid var(--border)', fontSize: '1rem', outline: 'none',
                                                fontFamily: 'inherit', resize: 'vertical', minHeight: '150px',
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
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                <button
                                    disabled={currentStep === 0 || isTransitioning || isSubmitting}
                                    onClick={() => handleStepChange(currentStep - 1)}
                                    style={{ padding: '0.75rem 2rem', background: 'transparent', color: (currentStep === 0 || isTransitioning || isSubmitting) ? 'var(--text-tertiary)' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: (currentStep === 0 || isTransitioning || isSubmitting) ? 'default' : 'pointer' }}
                                >
                                    Previous
                                </button>
                                {currentStep === questions.length - 1 ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        style={{
                                            padding: '0.75rem 2rem', background: isSubmitting ? 'var(--text-tertiary)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: 'var(--shadow-sm)'
                                        }}
                                    >
                                        Finish Exam
                                    </button>
                                ) : (
                                    <button
                                        disabled={isTransitioning || isSubmitting}
                                        onClick={() => handleStepChange(currentStep + 1)}
                                        style={{ padding: '0.75rem 2rem', background: isSubmitting ? 'var(--text-tertiary)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: (isTransitioning || isSubmitting) ? 'default' : 'pointer', boxShadow: 'var(--shadow-sm)' }}
                                    >
                                        Next Question
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Sidebar: Timer & Actions (Sticky) */}
                <div style={{
                    width: '300px',
                    flexShrink: 0,
                    position: 'sticky',
                    top: '130px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                }}>

                    {/* Timer Card */}
                    <div style={{ background: 'var(--bg-surface)', padding: '2rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>
                            Time Remaining
                        </div>

                        <div style={{ position: 'relative', width: '180px', height: '180px' }}>
                            <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                                {/* Track */}
                                <circle
                                    cx="90" cy="90" r="80"
                                    fill="none"
                                    stroke="var(--bg-app)"
                                    strokeWidth="12"
                                />
                                {/* Progress */}
                                <circle
                                    cx="90" cy="90" r="80"
                                    fill="none"
                                    stroke={timeLeft < baseDuration * 0.2 ? 'var(--error)' : timeLeft < baseDuration * 0.5 ? 'var(--warning)' : 'var(--success)'}
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray={2 * Math.PI * 80}
                                    strokeDashoffset={(2 * Math.PI * 80) * (1 - (timeLeft / baseDuration))}
                                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
                                />
                            </svg>

                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2rem', fontWeight: 800,
                                color: timeLeft < baseDuration * 0.2 ? 'var(--error)' : 'var(--text-primary)',
                                fontFamily: 'monospace',
                                transition: 'color 0.3s ease'
                            }}>
                                {formatTime(timeLeft)}
                            </div>
                        </div>
                    </div>

                    {/* Submit Action Card */}
                    <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: isSubmitting ? 'var(--text-tertiary)' : 'var(--primary)',
                                color: 'white',
                                fontSize: '1.125rem',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 700,
                                border: 'none',
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                boxShadow: 'var(--shadow-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    Processing...
                                </>
                            ) : 'Finish Exam'}
                        </button>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '1rem' }}>
                            Ensure all questions are answered before submitting.
                        </div>
                    </div>

                </div>
            </div>

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
                                onClick={() => processFinalSubmission()}
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

            {/* Exit Confirmation Modal */}
            {showExitModal && (
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
                        border: '1px solid var(--error)',
                        width: '100%',
                        maxWidth: '480px',
                        textAlign: 'center',
                        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--error-bg)',
                            color: 'var(--error)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem auto'
                        }}>
                            <LogOut size={32} />
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                            Exit Early?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
                            Are you sure you want to stop and exit? Your progress will be saved, but you won't be able to re-enter this exam later.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setShowExitModal(false)}
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
                                Stay Here
                            </button>
                            <button
                                onClick={() => processFinalSubmission('/')}
                                style={{
                                    flex: 1,
                                    padding: '0.875rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: 'none',
                                    background: 'var(--error)',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                Exit & Move On
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ExamInterface;
