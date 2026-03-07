import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Eye, Download, PieChart, TrendingUp, Clock, Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Users, BookOpen, FileSpreadsheet, FileText as FilePdf, Mail, Trophy, ArrowLeft, AlertTriangle, BarChart2, UserX } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Results = () => {
    const [expandedCategories, setExpandedCategories] = useState({});
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [examFilter, setExamFilter] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = React.useRef(null);

    const [resultsData, setResultsData] = useState([]);
    const [stats, setStats] = useState({ totalAttempts: 0, averageScore: 0, passRate: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [isClosing, setIsClosing] = useState(false);

    // Exam-level dashboard state
    const [selectedExam, setSelectedExam] = useState(null); // null = exam list, string = exam name
    const [examStudentCodes, setExamStudentCodes] = useState([]);
    const [loadingCodes, setLoadingCodes] = useState(false);
    const [expandedStudentRow, setExpandedStudentRow] = useState(null);
    const [expandedCategoryBreakdown, setExpandedCategoryBreakdown] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setIsCalendarOpen(false);
            }
        };
        if (isCalendarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCalendarOpen]);

    const fetchData = async (isSilent = false) => {
        try {
            if (!isSilent) setIsLoading(true);
            const [resSub, resStats] = await Promise.all([
                fetch('http://localhost:8080/api/submissions'),
                fetch('http://localhost:8080/api/submissions/stats')
            ]);

            const subs = await resSub.json();
            const statData = await resStats.json();

            const formattedData = subs.map(s => {
                let breakdown = [];
                try {
                    breakdown = s.detailedBreakdownJson ? JSON.parse(s.detailedBreakdownJson) : [];
                } catch (e) { console.error(e); }

                // Group by category for analysis
                const categoryStats = {};
                breakdown.forEach(q => {
                    const isQCorrect = q.correct !== undefined ? q.correct : q.isCorrect;

                    const catName = q.categoryName || 'Uncategorized';
                    if (!categoryStats[catName]) {
                        categoryStats[catName] = { total: 0, correct: 0 };
                    }
                    categoryStats[catName].total++;
                    if (isQCorrect) categoryStats[catName].correct++;
                });

                const categories = Object.keys(categoryStats).map(name => ({
                    name,
                    score: Math.round((categoryStats[name].correct / categoryStats[name].total) * 100),
                    color: getScoreColor(Math.round((categoryStats[name].correct / categoryStats[name].total) * 100)),
                    correct: categoryStats[name].correct,
                    total: categoryStats[name].total
                }));

                const totalTimeSeconds = breakdown.reduce((acc, q) => acc + (q.timeSpent || 0), 0);

                return {
                    id: s.id,
                    name: s.studentName,
                    email: s.studentEmail || (s.studentName?.includes('@') ? s.studentName : 'No Email Registered'),
                    score: Math.round((s.score / s.totalQuestions) * 100),
                    actualScore: s.score,
                    maxScore: s.totalQuestions,
                    date: new Date(s.submittedAt).toISOString().split('T')[0],
                    rawSubmittedAt: new Date(s.submittedAt),
                    testName: s.testName,
                    participatedDate: new Date(s.submittedAt).toLocaleString(),
                    timeTaken: formatDuration(totalTimeSeconds),
                    answers: breakdown.map((b, index) => ({
                        id: b.questionId,
                        originalIndex: index + 1,
                        question: b.questionText,
                        category: b.categoryName || 'Uncategorized',
                        studentAnswer: b.studentAnswer,
                        correctAnswer: b.correctAnswer,
                        isCorrect: b.correct !== undefined ? b.correct : b.isCorrect,
                        timeSpent: formatDuration(b.timeSpent || 0)
                    })),
                    categories: categories
                };
            });

            // Sort by most recent first
            formattedData.sort((a, b) => b.rawSubmittedAt - a.rawSubmittedAt);

            setResultsData(formattedData);
            setStats(statData);
            setIsLoading(false);
        } catch (error) {
            console.error(error);
        }
    };

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const getScoreColor = (score) => {
        if (score >= 90) return '#22c55e'; // Success
        if (score >= 70) return '#6366f1'; // Primary
        if (score >= 50) return '#f59e0b'; // Warning
        return '#ef4444'; // Error
    };

    const closeModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setSelectedStudent(null);
            setIsClosing(false);
            setExpandedCategories({});
        }, 300); // Match animation duration
    };

    // Body scroll lock
    useEffect(() => {
        if (selectedStudent) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }
        return () => document.body.classList.remove('no-scroll');
    }, [selectedStudent]);

    const toggleCategory = (catName) => {
        setExpandedCategories(prev => ({
            ...prev,
            [catName]: !prev[catName]
        }));
    };

    const filteredResults = resultsData.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesExam = !examFilter || r.testName === examFilter;
        const matchesDate = !filterDate || r.date === filterDate;
        return matchesSearch && matchesExam && matchesDate;
    });

    const uniqueExams = Array.from(new Set(resultsData.map(r => r.testName)));
    const examDates = Array.from(new Set(resultsData.map(r => r.date)));

    // Group results by exam name
    const examGroups = resultsData.reduce((acc, r) => {
        if (!acc[r.testName]) acc[r.testName] = [];
        acc[r.testName].push(r);
        return acc;
    }, {});

    const fetchExamStudentCodes = async (testName) => {
        setLoadingCodes(true);
        try {
            // Find a testId from submissions for this exam
            const examSub = resultsData.find(r => r.testName === testName);
            if (!examSub) { setLoadingCodes(false); return; }
            // Fetch all tests to find the matching test id
            const testsRes = await fetch('http://localhost:8080/api/tests');
            if (testsRes.ok) {
                const tests = await testsRes.json();
                const match = tests.find(t => t.name === testName);
                if (match) {
                    const codesRes = await fetch(`http://localhost:8080/api/tests/${match.id}/student-codes`);
                    if (codesRes.ok) {
                        const data = await codesRes.json();
                        setExamStudentCodes(data);
                    }
                }
            }
        } catch (e) { console.error(e); }
        setLoadingCodes(false);
    };

    const openExam = (examName) => {
        setSelectedExam(examName);
        setExamStudentCodes([]);
        setExpandedStudentRow(null);
        setExpandedCategoryBreakdown(null);
        fetchExamStudentCodes(examName);
    };

    const closeExam = () => {
        setSelectedExam(null);
        setExamStudentCodes([]);
        setExpandedStudentRow(null);
        setExpandedCategoryBreakdown(null);
    };

    const CustomCalendar = () => {
        const today = new Date();
        const [viewMonth, setViewMonth] = useState(today.getMonth());
        const [viewYear, setViewYear] = useState(today.getFullYear());

        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const firstDay = new Date(viewYear, viewMonth, 1).getDay();
        const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(i);

        const handlePrevMonth = (e) => {
            e.stopPropagation();
            if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear(viewYear - 1);
            } else {
                setViewMonth(viewMonth - 1);
            }
        };

        const handleNextMonth = (e) => {
            e.stopPropagation();
            if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear(viewYear + 1);
            } else {
                setViewMonth(viewMonth + 1);
            }
        };

        return (
            <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '1rem',
                background: 'white', borderRadius: '24px', padding: '1.5rem',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border)',
                zIndex: 1000, minWidth: '320px', animation: 'fadeInUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                    <button onClick={handlePrevMonth} style={{ background: 'var(--bg-app)', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ChevronDown size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                    <div style={{ display: 'flex', gap: '0.4rem', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <select
                            value={viewMonth}
                            onChange={e => setViewMonth(parseInt(e.target.value))}
                            style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '10px', padding: '0.4rem 0.5rem', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', outline: 'none', color: 'var(--text-primary)', textAlign: 'center' }}
                        >
                            {Array.from({ length: 12 }).map((_, i) => (
                                <option key={i} value={i}>{new Date(2000, i).toLocaleString('default', { month: 'short' })}</option>
                            ))}
                        </select>
                        <select
                            value={viewYear}
                            onChange={e => setViewYear(parseInt(e.target.value))}
                            style={{ border: 'none', background: 'var(--bg-app)', borderRadius: '10px', padding: '0.4rem 0.5rem', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', outline: 'none', color: 'var(--text-primary)', textAlign: 'center' }}
                        >
                            {Array.from({ length: 11 }).map((_, i) => {
                                const y = today.getFullYear() - 5 + i;
                                return <option key={y} value={y}>{y}</option>
                            })}
                        </select>
                    </div>
                    <button onClick={handleNextMonth} style={{ background: 'var(--bg-app)', border: 'none', width: '32px', height: '32px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center' }}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                        <div key={d} style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', paddingBottom: '0.5rem' }}>{d}</div>
                    ))}
                    {days.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} />;
                        const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const hasExams = examDates.includes(dateStr);
                        const isSelected = filterDate === dateStr;

                        return (
                            <button
                                key={day}
                                onClick={() => {
                                    setFilterDate(isSelected ? '' : dateStr);
                                    setIsCalendarOpen(false);
                                }}
                                style={{
                                    padding: '0.6rem 0', borderRadius: '12px', border: 'none',
                                    background: isSelected ? 'var(--primary)' : hasExams ? 'var(--primary-light)' : 'transparent',
                                    color: isSelected ? 'white' : hasExams ? 'var(--primary)' : 'var(--text-primary)',
                                    fontWeight: (hasExams || isSelected) ? 800 : 500,
                                    fontSize: '0.875rem', cursor: 'pointer', position: 'relative',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-app)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = hasExams ? 'var(--primary-light)' : 'transparent'; }}
                            >
                                {day}
                                {hasExams && !isSelected && (
                                    <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary)' }} />
                                )}
                            </button>
                        );
                    })}
                </div>
                {(filterDate) && (
                    <button
                        onClick={() => { setFilterDate(''); setIsCalendarOpen(false); }}
                        style={{ marginTop: '1.25rem', width: '100%', padding: '0.75rem', borderRadius: '12px', border: 'none', background: 'var(--bg-app)', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                    >Clear Selection</button>
                )}
            </div>
        );
    };

    const handleExportCSV = () => {
        const timestamp = new Date().toLocaleString();
        const csvRows = [];

        // 1. Professional Header
        csvRows.push(["SAMUEL GNANAM IT CENTRE - PERFORMANCE ANALYTICS REPORT"]);
        csvRows.push([`Generated On: ${timestamp}`]);
        csvRows.push([`Total Records Exported: ${filteredResults.length}`]);
        csvRows.push([]); // Spacer

        // 2. Student Performance Summary Section
        csvRows.push(["STUDENT PERFORMANCE SUMMARY"]);
        csvRows.push(["Student Name", "Examination", "Correct Answers", "Total Questions", "Accuracy (%)", "Final Score (%)", "Status", "Submission Date"]);

        filteredResults.forEach(r => {
            const totalQ = r.answers.length;
            const correctQ = r.answers.filter(a => a.isCorrect).length;
            csvRows.push([
                r.name,
                r.testName,
                correctQ,
                totalQ,
                `${Math.round((correctQ / totalQ) * 100)}%`,
                `${r.score}%`,
                r.score >= 50 ? "PASSED" : "FAILED",
                r.participatedDate
            ]);
        });

        csvRows.push([]); // Spacer
        csvRows.push([]); // Spacer

        // 3. Granular Question Analytics Section
        csvRows.push(["GRANULAR QUESTION ANALYTICS"]);
        csvRows.push(["Student Name", "ID / Email", "Question #", "Category", "Question", "Student Answer", "Correct Answer", "Result", "Time Spent"]);

        filteredResults.forEach(r => {
            r.answers.forEach((q, idx) => {
                csvRows.push([
                    r.name,
                    `="${r.email}"`, // Excel trick to preserve leading zeros/formatting
                    idx + 1,
                    q.category,
                    `"${q.question.replace(/"/g, '""')}"`,
                    `"${(q.studentAnswer || 'Skipped').replace(/"/g, '""')}"`,
                    `"${(q.correctAnswer || '').replace(/"/g, '""')}"`,
                    q.isCorrect ? "CORRECT" : "INCORRECT",
                    q.timeSpent
                ]);
            });
        });

        // Convert to CSV string with proper escaping
        const csvString = csvRows.map(row => row.join(",")).join("\n");
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `SGIC_Professional_Data_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const drawPieChart = (correct, total) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const radius = 180;
        const centerX = 200;
        const centerY = 200;

        const incorrect = total - correct;
        const correctAngle = (correct / total) * 2 * Math.PI;
        const incorrectAngle = (incorrect / total) * 2 * Math.PI;

        // Draw Incorrect Slice (Light Gray)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, 0, incorrectAngle);
        ctx.fillStyle = '#f1f5f9';
        ctx.fill();

        // Draw Correct Slice (Blue)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, incorrectAngle, incorrectAngle + correctAngle);
        ctx.fillStyle = '#6366f1';
        ctx.fill();

        // Inner Circle for Donut effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        return canvas.toDataURL('image/png');
    };

    const handleExportPDF = () => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const timestamp = new Date().toLocaleString();
        const logoUrl = '/SGIC 2.png';

        const addHeader = () => {
            // Minimalist Header Bar
            doc.setFillColor(99, 102, 241);
            doc.rect(14, 10, 182, 0.5, 'F');

            // Logo
            try {
                doc.addImage(logoUrl, 'PNG', 14, 15, 30, 16);
            } catch (e) { }

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Performance Report', 196, 25, { align: 'right' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Generated: ${timestamp}`, 196, 30, { align: 'right' });
        };

        const groupedByExam = filteredResults.reduce((acc, result) => {
            if (!acc[result.testName]) acc[result.testName] = [];
            acc[result.testName].push(result);
            return acc;
        }, {});

        let isFirstPage = true;

        Object.keys(groupedByExam).forEach((examName) => {
            if (!isFirstPage) doc.addPage();
            addHeader();
            isFirstPage = false;

            doc.setTextColor(30, 41, 59);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Exam: ${examName}`, 14, 45);

            const examResults = groupedByExam[examName];

            autoTable(doc, {
                startY: 50,
                head: [['Student', 'Score', 'Status', 'Date']],
                body: examResults.map(r => [
                    r.name,
                    `${r.score}%`,
                    { content: r.score >= 50 ? 'PASSED' : 'FAILED', styles: { textColor: r.score >= 50 ? [22, 163, 74] : [220, 38, 38], fontStyle: 'bold' } },
                    r.participatedDate
                ]),
                theme: 'striped',
                headStyles: { fillColor: [99, 102, 241], fontSize: 10 },
                styles: { fontSize: 9 }
            });

            examResults.forEach((student) => {
                doc.addPage();
                addHeader();

                // Student Branding Section
                doc.setFillColor(248, 250, 252);
                doc.rect(14, 40, 182, 45, 'F');

                doc.setTextColor(30, 41, 59);
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(student.name, 20, 52);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(71, 85, 105);
                doc.text(`ID: ${student.email}`, 20, 58);
                doc.text(`Participated: ${student.participatedDate}`, 20, 63);

                // Detailed Metrics
                const totalQ = student.answers.length;
                const correctQ = student.answers.filter(a => a.isCorrect).length;

                doc.setTextColor(99, 102, 241);
                doc.setFontSize(12);
                doc.text('Performance Metrics', 20, 75);
                doc.setTextColor(30, 41, 59);
                doc.text(`Questions: ${correctQ} / ${totalQ} Correct`, 20, 80);

                // Pie Chart
                try {
                    const chartData = drawPieChart(correctQ, totalQ);
                    doc.addImage(chartData, 'PNG', 155, 42, 35, 35);
                } catch (e) { }

                // Score Display
                doc.setFontSize(22);
                doc.setTextColor(99, 102, 241);
                doc.text(`${student.score}%`, 145, 65, { align: 'right' });
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text('FINAL SCORE', 145, 69, { align: 'right' });

                // Categories
                const categories = student.answers.reduce((acc, q) => {
                    if (!acc[q.category]) acc[q.category] = { total: 0, correct: 0 };
                    acc[q.category].total++;
                    if (q.isCorrect) acc[q.category].correct++;
                    return acc;
                }, {});

                doc.setTextColor(30, 41, 59);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('Category Proficiency', 14, 98);

                autoTable(doc, {
                    startY: 102,
                    head: [['Category', 'Correct', 'Total', 'Accuracy']],
                    body: Object.keys(categories).map(cat => [
                        cat, categories[cat].correct, categories[cat].total, `${Math.round((categories[cat].correct / categories[cat].total) * 100)}%`
                    ]),
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 9 }
                });

                // Detail Table
                doc.text('Question-by-Question Analytics', 14, doc.lastAutoTable.finalY + 12);
                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 15,
                    head: [['#', 'Question', 'Student Answer', 'Result']],
                    body: student.answers.map((q, idx) => [
                        idx + 1, { content: q.question, styles: { cellWidth: 100 } }, q.studentAnswer || 'Skipped',
                        { content: q.isCorrect ? 'Correct' : 'Incorrect', styles: { halign: 'center', textColor: q.isCorrect ? [22, 163, 74] : [220, 38, 38] } }
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [99, 102, 241] },
                    styles: { fontSize: 8 }
                });
            });
        });

        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        }

        doc.save(`SGIC_Professional_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (isLoading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>Loading Results Data...</div>
            </div>
        );
    }

    // ── Level 2: Exam Detail View ──────────────────────────────────────────────
    if (selectedExam) {
        const examResults = examGroups[selectedExam] || [];
        const avgScore = examResults.length ? Math.round(examResults.reduce((s, r) => s + r.score, 0) / examResults.length) : 0;
        const passCount = examResults.filter(r => r.score >= 50).length;

        // Category breakdown for whole exam
        const catMap = {};
        examResults.forEach(r => {
            if (r.answers) {
                r.answers.forEach(a => {
                    const catName = a.category || 'Uncategorized';
                    if (!catMap[catName]) {
                        catMap[catName] = {
                            correctAttempts: 0,
                            totalAttempts: 0,
                            uniqueQuestions: new Set(),
                            questionStats: {}
                        };
                    }
                    catMap[catName].correctAttempts += a.isCorrect ? 1 : 0;
                    catMap[catName].totalAttempts += 1;
                    catMap[catName].uniqueQuestions.add(a.question);

                    if (!catMap[catName].questionStats[a.question]) {
                        catMap[catName].questionStats[a.question] = { correct: 0, total: 0 };
                    }
                    catMap[catName].questionStats[a.question].correct += a.isCorrect ? 1 : 0;
                    catMap[catName].questionStats[a.question].total += 1;
                });
            }
        });
        const examCategories = Object.entries(catMap).map(([name, d]) => {
            const pct = d.totalAttempts > 0 ? Math.round((d.correctAttempts / d.totalAttempts) * 100) : 0;
            const questions = Object.entries(d.questionStats).map(([qName, qStats]) => ({
                question: qName,
                correct: qStats.correct,
                total: qStats.total,
                pct: qStats.total > 0 ? Math.round((qStats.correct / qStats.total) * 100) : 0
            })).sort((a, b) => b.pct - a.pct);

            return {
                name,
                uniqueTotal: d.uniqueQuestions.size,
                pct: pct,
                questions
            };
        }).sort((a, b) => b.pct - a.pct);

        // Absent / not-submitted students: allocated (examStudentCodes) but NOT in examResults
        const submittedIds = new Set(examResults.map(r => r.email?.toLowerCase()));
        const absentStudents = examStudentCodes.filter(c => {
            const status = (c.status || '').toUpperCase();
            return status !== 'USED';
        });

        return (
            <div style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={closeExam}
                            style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'white', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'inherit'; }}
                        ><ArrowLeft size={20} /></button>
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>{selectedExam}</h1>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, marginTop: '0.2rem' }}>{examResults.length} submissions · Avg {avgScore}% · {passCount}/{examResults.length} passed</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handleExportCSV} style={{ padding: '0.875rem 1.5rem', background: 'white', border: '2px solid var(--border)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer' }}><FileSpreadsheet size={18} color="var(--success)" /> CSV</button>
                        <button onClick={handleExportPDF} style={{ padding: '0.875rem 1.5rem', background: 'var(--primary)', border: 'none', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, color: 'white', cursor: 'pointer' }}><FilePdf size={18} /> PDF Report</button>
                    </div>
                </div>

                {/* ── Section A: Student Results Table ── */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '28px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-app)' }}>
                        <Users size={20} color="var(--primary)" />
                        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Student Results</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>{examResults.length} participants</span>
                    </div>
                    {examResults.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No submissions yet for this exam.</div>
                    ) : (
                        <div>
                            {examResults.map((r) => (
                                <div key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div
                                        style={{ padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onClick={() => setExpandedStudentRow(expandedStudentRow === r.id ? null : r.id)}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-app)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', flexShrink: 0 }}>{r.name[0]}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{r.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}><Mail size={12} />{r.email}</div>
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: getScoreColor(r.score) }}>{r.score}%</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Score</div>
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                            <div style={{ fontWeight: 800 }}>{r.actualScore}/{r.maxScore}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Correct</div>
                                        </div>
                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                            <div style={{ fontWeight: 800, color: '#f59e0b' }}>{r.timeTaken}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase' }}>Time</div>
                                        </div>
                                        <button
                                            onClick={e => { e.stopPropagation(); setSelectedStudent(r); setExpandedCategories({}); }}
                                            style={{ padding: '0.5rem 1.2rem', borderRadius: '12px', background: 'var(--bg-app)', border: '1.5px solid var(--border)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                        ><Eye size={16} /> View Report</button>
                                        <div style={{ transform: expandedStudentRow === r.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><ChevronDown size={18} color="var(--text-tertiary)" /></div>
                                    </div>

                                    {/* Inline category breakdown */}
                                    {expandedStudentRow === r.id && (
                                        <div style={{ padding: '1rem 2rem 1.5rem 4rem', background: 'var(--bg-app)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {r.categories.map(c => (
                                                <div key={c.name} style={{ flex: '1', minWidth: '180px', background: 'white', borderRadius: '16px', padding: '1rem 1.25rem', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{c.name}</div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <div style={{ flex: 1, height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${c.score}%`, height: '100%', background: c.color, borderRadius: '4px' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 900, color: c.color, minWidth: '38px', textAlign: 'right' }}>{c.score}%</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>{c.correct}/{c.total} correct</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Section B: Category Performance Breakdown ── */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '28px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <BarChart2 size={20} color="var(--primary)" />
                            <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Category Performance Breakdown</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>{examCategories.length} categories analyzed</span>
                    </div>

                    <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {examCategories.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', background: 'var(--bg-app)', borderRadius: '20px' }}>No category data available.</div>
                        ) : examCategories.map(c => {
                            const isStrength = c.pct >= 75;
                            const isWeakness = c.pct < 50;

                            return (
                                <div key={c.name} style={{
                                    background: 'white', borderRadius: '24px', border: expandedCategoryBreakdown === c.name ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                                    overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: expandedCategoryBreakdown === c.name ? '0 12px 30px rgba(99,102,241,0.08)' : 'none'
                                }}>
                                    {/* Category Row */}
                                    <div
                                        onClick={() => setExpandedCategoryBreakdown(expandedCategoryBreakdown === c.name ? null : c.name)}
                                        style={{ padding: '1.5rem 2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2rem', background: expandedCategoryBreakdown === c.name ? 'rgba(99,102,241,0.02)' : 'white' }}
                                    >
                                        <div style={{ flex: '1', minWidth: '200px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                                <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{c.name}</div>
                                                {isStrength && <span style={{ padding: '2px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Strength</span>}
                                                {isWeakness && <span style={{ padding: '2px 10px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase' }}>Needs Focus</span>}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{c.uniqueTotal} unique questions used</div>
                                        </div>

                                        <div style={{ flex: '1.5', minWidth: '300px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 800 }}>
                                                <span style={{ color: 'var(--text-tertiary)' }}>Category Mastery</span>
                                                <span style={{ color: getScoreColor(c.pct) }}>{c.pct}%</span>
                                            </div>
                                            <div style={{ height: '12px', background: 'rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.02)' }}>
                                                <div style={{ width: `${c.pct}%`, height: '100%', background: getScoreColor(c.pct), borderRadius: '6px', transition: 'width 1s ease' }} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', transform: expandedCategoryBreakdown === c.name ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                                            <ChevronDown size={22} color="var(--text-tertiary)" />
                                        </div>
                                    </div>

                                    {/* Question Breakdown Details */}
                                    {expandedCategoryBreakdown === c.name && (
                                        <div style={{ padding: '0 2rem 2rem 2rem', background: 'white', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1rem', opacity: 0.6 }} />
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Question-Level Performance</div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
                                                {c.questions.map((q, idx) => (
                                                    <div key={idx} style={{ padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1 }}>{q.question}</div>
                                                        <div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)' }}>{q.correct} / {q.total} correct</span>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: 900, color: getScoreColor(q.pct) }}>{q.pct}%</span>
                                                            </div>
                                                            <div style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${q.pct}%`, height: '100%', background: getScoreColor(q.pct), borderRadius: '3px' }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Section C: Absent / Pending Students ── */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '28px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <UserX size={20} color="var(--error)" />
                        <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>Absent / Not Submitted Students</span>
                        <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', padding: '2px 10px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800 }}>
                            {loadingCodes ? '...' : absentStudents.length}
                        </span>
                    </div>
                    {loadingCodes ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Loading allocated students...</div>
                    ) : absentStudents.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            {examStudentCodes.length === 0 ? 'No student allocation data found for this exam.' : '✅ All allocated students have submitted.'}
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-app)', fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Student Name</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Email</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Exam Date</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: 800 }}>Code Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {absentStudents.map((c, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>{(c.studentName || '?')[0]}</div>
                                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.studentName || 'Unknown'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{c.studentEmail || '—'}</td>
                                            <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{c.examDate || '—'}</td>
                                            <td style={{ padding: '1rem 1.5rem' }}>
                                                <span style={{
                                                    padding: '3px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800,
                                                    background: c.status === 'STARTED' ? 'rgba(245,158,11,0.1)' : c.status === 'EXPIRED' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                                                    color: c.status === 'STARTED' ? '#f59e0b' : c.status === 'EXPIRED' ? 'var(--error)' : 'var(--primary)'
                                                }}>{c.status || 'PENDING'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Report Modal stays mounted on top */}
                {selectedStudent && createPortal(
                    <div onClick={closeModal} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem', backdropFilter: 'blur(16px)', animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards' }}>
                        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', animation: isClosing ? 'modalSlideDown 0.3s cubic-bezier(0.4,0,0.2,1) forwards' : 'modalSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards', width: '100%', maxWidth: '1200px', maxHeight: '94vh', overflow: 'hidden' }}>
                            <div style={{ padding: '2rem 3rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                                    <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 950 }}>{selectedStudent.name[0]}</div>
                                    <div>
                                        <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{selectedStudent.name}</h2>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.4rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={18} /> {selectedStudent.email}</p>
                                    </div>
                                </div>
                                <button onClick={closeModal} style={{ background: 'white', border: '2px solid var(--border)', width: '48px', height: '48px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, transition: 'all 0.3s', color: 'var(--text-tertiary)' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)'; }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}>✕</button>
                            </div>
                            <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                    <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center' }}><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Success Rate</div><div style={{ fontSize: '2rem', fontWeight: 1000, color: getScoreColor(selectedStudent.score) }}>{selectedStudent.score}%</div></div>
                                    <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center' }}><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Raw Score</div><div style={{ fontSize: '2rem', fontWeight: 1000, color: 'var(--text-primary)' }}>{selectedStudent.actualScore}/{selectedStudent.maxScore}</div></div>
                                    <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center' }}><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Duration</div><div style={{ fontSize: '2rem', fontWeight: 1000, color: '#f59e0b' }}>{selectedStudent.timeTaken}</div></div>
                                </div>
                                <div style={{ padding: '2rem 2.5rem', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)', borderRadius: '32px', border: '1.5px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'nowrap' }}>
                                        <div style={{ flex: '1', minWidth: '200px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}><div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Trophy size={20} color="white" /></div><h3 style={{ fontSize: '1.4rem', fontWeight: 1000, color: 'var(--text-primary)', margin: 0 }}>Achievement Analysis</h3></div>
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Candidate's mastery across all assessment categories.</p>
                                        </div>
                                        <div style={{ position: 'relative', width: '190px', height: '190px', flexShrink: 0 }}>
                                            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                                                <circle cx="50" cy="50" r="42" fill="transparent" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
                                                {(() => { const circum = 2 * Math.PI * 42; return <circle cx="50" cy="50" r="42" fill="transparent" stroke="var(--success)" strokeWidth="10" strokeDasharray={`${(selectedStudent.actualScore / selectedStudent.maxScore) * circum} ${circum}`} strokeLinecap="round" style={{ transition: 'all 1.5s cubic-bezier(0.16,1,0.3,1)' }} />; })()}
                                            </svg>
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: '2.5rem', fontWeight: 1000, color: 'var(--text-primary)', lineHeight: 1 }}>{selectedStudent.score}%</div><div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.2rem' }}>Accuracy</div></div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: '220px' }}>
                                            <div style={{ padding: '1.25rem 1.5rem', background: 'white', borderRadius: '20px', border: '1.2px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ecfdf5', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={24} /></div><div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Correct</div><div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedStudent.actualScore} Items</div></div></div>
                                            <div style={{ padding: '1.25rem 1.5rem', background: 'white', borderRadius: '20px', border: '1.2px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}><div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#fef2f2', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><XCircle size={24} /></div><div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Incorrect</div><div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{selectedStudent.maxScore - selectedStudent.actualScore} Items</div></div></div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}><div style={{ width: '6px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }} />Detailed Performance Analysis</div>
                                    {selectedStudent.categories.map(cat => {
                                        const catAnswers = selectedStudent.answers.filter(a => a.category === cat.name);
                                        const isExpanded = expandedCategories[cat.name];
                                        return (
                                            <div key={cat.name} style={{ background: 'white', borderRadius: '32px', border: `2px solid ${isExpanded ? 'var(--primary)' : 'var(--border)'}`, overflow: 'hidden', transition: 'all 0.4s', boxShadow: isExpanded ? '0 12px 30px rgba(0,0,0,0.08)' : 'none' }}>
                                                <div onClick={() => toggleCategory(cat.name)} style={{ padding: '2rem 2.5rem', background: isExpanded ? 'var(--bg-app)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flex: 1 }}>
                                                        <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                                                            <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}><circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="12" /><circle cx="50" cy="50" r="40" fill="transparent" stroke={cat.color} strokeWidth="12" strokeDasharray={`${(cat.score / 100) * 2 * Math.PI * 40} ${2 * Math.PI * 40}`} strokeLinecap="round" /></svg>
                                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{cat.score}%</div>
                                                        </div>
                                                        <div style={{ minWidth: '160px' }}><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Category</div><div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)' }}>{cat.name}</div></div>
                                                        <div style={{ flex: 1, maxWidth: '500px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem' }}><span>Accuracy: {cat.score}%</span><span style={{ color: 'var(--text-tertiary)' }}>{cat.correct}/{cat.total} Correct</span></div>
                                                            <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: `${cat.score}%`, height: '100%', background: cat.color, transition: 'width 1.5s cubic-bezier(0.34,1.56,0.64,1)' }} /></div>
                                                        </div>
                                                    </div>
                                                    <div style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{catAnswers.length}</div><div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Items</div></div>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}><ChevronDown size={20} color="var(--text-tertiary)" /></div>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div style={{ padding: '2.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                                        {catAnswers.map((q, idx) => (
                                                            <div key={idx} style={{ padding: '2rem', background: 'white', borderRadius: '24px', border: '1px solid var(--border)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                                                                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1, paddingRight: '2rem' }}><span style={{ color: 'var(--primary)', fontStyle: 'italic', marginRight: '0.5rem' }}>Q{q.originalIndex}:</span>{q.question}</div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', background: 'var(--bg-app)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}><Clock size={16} />{q.timeSpent}</div>
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: q.isCorrect ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                                                                    {q.isCorrect ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '18px', border: '2px solid #bbf7d0' }}><CheckCircle2 size={24} /><div><div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Final Answer</div><div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.studentAnswer}</div></div><div style={{ marginLeft: 'auto', background: '#22c55e', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>CORRECT</div></div>
                                                                    ) : (<><div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '18px', border: '2px solid #fecaca' }}><XCircle size={24} /><div><div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Selected Answer</div><div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.studentAnswer || 'NO RESPONSE'}</div></div></div><div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '18px', border: '2px dashed #22c55e' }}><CheckCircle2 size={24} /><div><div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Correct Answer</div><div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.correctAnswer}</div></div></div></>)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div style={{ padding: '2rem 3.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'flex-end', gap: '1.25rem' }}>
                                <button onClick={handleExportCSV} style={{ padding: '1rem 2rem', borderRadius: '18px', background: 'white', border: '2px solid var(--border)', fontWeight: 800, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FileSpreadsheet size={20} color="var(--success)" /> CSV</button>
                                <button onClick={handleExportPDF} style={{ padding: '1rem 2rem', borderRadius: '18px', background: 'var(--primary)', border: 'none', fontWeight: 800, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}><FilePdf size={20} /> PDF Report</button>
                                <button onClick={closeModal} style={{ padding: '1rem 3rem', borderRadius: '18px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>Exit Assessment</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                    @keyframes modalSlideUp { from { transform: translateY(40px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                    @keyframes modalSlideDown { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(40px) scale(0.96); opacity: 0; } }
                    :root { --primary-rgb: 99, 102, 241; }
                `}</style>
            </div>
        );
    }

    // ── Level 1: Exam Cards Grid ──────────────────────────────────────────────
    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Result Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Click an exam to view detailed results and category breakdowns.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleExportCSV} style={{ padding: '1rem 2rem', background: 'white', border: '2px solid var(--border)', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, cursor: 'pointer' }}><FileSpreadsheet size={20} color="var(--success)" /> CSV</button>
                    <button onClick={handleExportPDF} style={{ padding: '1rem 2rem', background: 'var(--primary)', border: 'none', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: 'white', cursor: 'pointer' }}><FilePdf size={20} /> PDF Report</button>
                </div>
            </div>

            {/* Stats Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={24} color="white" /></div>
                    <div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Exams</div><div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{Object.keys(examGroups).length}</div></div>
                </div>
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} color="white" /></div>
                    <div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Total Submissions</div><div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{resultsData.length}</div></div>
                </div>
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', border: '1px solid var(--border)', padding: '1.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trophy size={24} color="white" /></div>
                    <div><div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Avg Pass Rate</div><div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.passRate}%</div></div>
                </div>
            </div>

            {/* Exam Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {Object.keys(examGroups).length === 0 ? (
                    <div style={{ gridColumn: '1/-1', padding: '6rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '28px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                        <h3 style={{ fontWeight: 800, color: 'var(--text-primary)' }}>No results yet</h3>
                        <p style={{ color: 'var(--text-tertiary)' }}>Student submissions will appear here once exams are completed.</p>
                    </div>
                ) : Object.entries(examGroups).map(([examName, results]) => {
                    const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
                    const passed = results.filter(r => r.score >= 50).length;
                    const dates = [...new Set(results.map(r => r.date))].sort();
                    return (
                        <div
                            key={examName}
                            onClick={() => openExam(examName)}
                            style={{ background: 'var(--bg-surface)', borderRadius: '28px', border: '1.5px solid var(--border)', padding: '2rem', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'flex', flexDirection: 'column' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(99,102,241,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOpen size={24} color="white" /></div>
                                <div style={{ background: `${getScoreColor(avg)}15`, color: getScoreColor(avg), padding: '4px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '1rem' }}>{avg}% avg</div>
                            </div>
                            <h3 style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>{examName}</h3>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1.5rem', flex: 1 }}>{dates.length === 1 ? dates[0] : `${dates[0]} – ${dates[dates.length - 1]}`}</div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ flex: 1, background: 'var(--bg-app)', borderRadius: '14px', padding: '0.875rem', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{results.length}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Submitted</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', borderRadius: '14px', padding: '0.875rem', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: '#10b981' }}>{passed}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Passed</div>
                                </div>
                                <div style={{ flex: 1, background: 'rgba(239,68,68,0.06)', borderRadius: '14px', padding: '0.875rem', textAlign: 'center' }}>
                                    <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--error)' }}>{results.length - passed}</div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Failed</div>
                                </div>
                            </div>

                            <button
                                style={{
                                    width: '100%', padding: '1rem', borderRadius: '16px', background: 'var(--bg-app)', border: '1.5px solid var(--border)',
                                    color: 'var(--primary)', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            >
                                View Results Breakdown <ArrowLeft size={18} style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes modalSlideUp { from { transform: translateY(40px) scale(0.96); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
                @keyframes modalSlideDown { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(40px) scale(0.96); opacity: 0; } }
                :root { --primary-rgb: 99, 102, 241; }
            `}</style>
        </div>
    );
};

export default Results;
