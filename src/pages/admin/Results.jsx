import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye, Download, PieChart, TrendingUp, Clock, Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Users, BookOpen, FileSpreadsheet, FileText as FilePdf } from 'lucide-react';
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
                    email: s.studentName, // Fallback since email isn't in submission
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
        // Auto-refresh Results every 10 seconds
        const interval = setInterval(() => {
            // Only refresh if no student is currently being viewed in detail to avoid UI shifts
            if (!selectedStudent) {
                fetchData(true); // Silent refresh
            }
        }, 10000);
        return () => clearInterval(interval);
    }, [selectedStudent]);

    const getScoreColor = (score) => {
        if (score >= 90) return '#22c55e'; // Success
        if (score >= 70) return '#6366f1'; // Primary
        if (score >= 50) return '#f59e0b'; // Warning
        return '#ef4444'; // Error
    };

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

    return (
        <div style={{ animation: 'fadeIn 0.3s ease-in-out', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Result Analytics</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Comprehensive performance tracking and granular reporting.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            padding: '1rem 2rem', background: 'white', border: '2px solid var(--border)', borderRadius: '18px',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: 'var(--shadow-sm)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <FileSpreadsheet size={20} color="var(--success)" /> CSV
                    </button>
                    <button
                        onClick={handleExportPDF}
                        style={{
                            padding: '1rem 2rem', background: 'var(--primary)', border: 'none', borderRadius: '18px',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 800, color: 'white', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 30px rgba(99, 102, 241, 0.3)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.2)'; }}
                    >
                        <FilePdf size={20} color="white" /> PDF Report
                    </button>
                </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', borderRadius: '32px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', position: 'relative', overflow: 'visible' }}>
                <div style={{ padding: '1.75rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)', display: 'flex', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 10, overflow: 'visible' }}>
                    {/* Student Search */}
                    <div style={{ flex: '2', minWidth: '300px', display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', border: '2px solid var(--border)', padding: '0.875rem 1.5rem', borderRadius: '20px', transition: 'all 0.3s' }} onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <Search size={20} color="var(--text-tertiary)" />
                        <input
                            type="text"
                            placeholder="Find student results..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}
                        />
                    </div>
                    {/* Exam Dropdown */}
                    <div style={{ flex: '1.5', minWidth: '220px', display: 'flex', alignItems: 'center', gap: '1rem', background: 'white', border: '2px solid var(--border)', padding: '0.875rem 1.5rem', borderRadius: '20px', transition: 'all 0.3s', position: 'relative' }} onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--primary)'} onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <BookOpen size={20} color="var(--text-tertiary)" />
                        <select
                            value={examFilter}
                            onChange={e => setExamFilter(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', appearance: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                            <option value="">All Examinations</option>
                            {uniqueExams.map(exam => (
                                <option key={exam} value={exam}>{exam}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} color="var(--text-tertiary)" style={{ position: 'absolute', right: '1.5rem', pointerEvents: 'none' }} />
                    </div>
                    {/* Custom Calendar Filter */}
                    <div style={{ flex: '1', minWidth: '240px', position: 'relative' }} ref={calendarRef}>
                        <div
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem', background: 'white',
                                border: '2px solid var(--border)', padding: '0.875rem 1.5rem', borderRadius: '20px',
                                transition: 'all 0.3s', cursor: 'pointer',
                                borderColor: isCalendarOpen || filterDate ? 'var(--primary)' : 'var(--border)'
                            }}
                        >
                            <Calendar size={20} color={filterDate ? "var(--primary)" : "var(--text-tertiary)"} />
                            <div style={{ fontSize: '1rem', fontWeight: 600, color: filterDate ? 'var(--text-primary)' : 'var(--text-tertiary)', flex: 1 }}>
                                {filterDate ? new Date(filterDate).toLocaleDateString('en-GB') : "Select Date"}
                            </div>
                            {filterDate && (
                                <XCircle
                                    size={18}
                                    color="var(--text-tertiary)"
                                    onClick={(e) => { e.stopPropagation(); setFilterDate(''); }}
                                    style={{ cursor: 'pointer' }}
                                />
                            )}
                        </div>
                        {isCalendarOpen && <CustomCalendar />}
                    </div>
                </div>

                {/* Table part remains overflow hidden to keep corner curves */}

                <div style={{ overflow: 'hidden', borderRadius: '0 0 32px 32px' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-app)', fontSize: '0.875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                <th style={{ padding: '1.5rem 2rem', fontWeight: 800, textAlign: 'left' }}>Candidate</th>
                                <th style={{ padding: '1.5rem 2rem', fontWeight: 800, textAlign: 'left' }}>Examination Details</th>
                                <th style={{ padding: '1.5rem 2rem', fontWeight: 800, textAlign: 'center' }}>Performance</th>
                                <th style={{ padding: '1.5rem 2rem', fontWeight: 800, textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredResults.map((result) => (
                                <tr key={result.id} style={{ transition: 'all 0.2s', borderBottom: '1px solid var(--border)' }} className="result-row">
                                    <td style={{ padding: '1.5rem 2rem' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.1rem' }}>{result.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                                            <BookOpen size={14} /> ID: {result.email}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.5rem 2rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1rem' }}>{result.testName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} /> {result.participatedDate}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.5rem 2rem', textAlign: 'center' }}>
                                        <div style={{
                                            display: 'inline-flex', padding: '0.5rem 1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 900,
                                            background: `${getScoreColor(result.score)}11`,
                                            color: getScoreColor(result.score),
                                            border: `1.5px solid ${getScoreColor(result.score)}33`
                                        }}>
                                            {result.score}%
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => { setSelectedStudent(result); setExpandedCategories({}); }}
                                            style={{
                                                background: 'var(--bg-app)', border: '1.5px solid var(--border)', padding: '0.6rem 1.4rem', borderRadius: '14px',
                                                color: 'var(--primary)', fontWeight: 800, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', transition: 'all 0.3s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = 'white'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--primary)'; }}
                                        >
                                            <Eye size={18} /> View Report
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed Result Modal Overlay */}
            {selectedStudent && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '2rem', backdropFilter: 'blur(16px)' }}>
                    <div style={{ background: 'var(--bg-surface)', borderRadius: '40px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', animation: 'modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)', width: '100%', maxWidth: '1200px', maxHeight: '94vh', overflow: 'hidden' }}>

                        {/* Modal Header */}
                        <div style={{ padding: '2rem 3rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                                <div style={{ width: '70px', height: '70px', borderRadius: '24px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 950, boxShadow: '0 12px 24px rgba(var(--primary-rgb), 0.3)' }}>
                                    {selectedStudent.name[0]}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>{selectedStudent.name}</h2>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.4rem', fontWeight: 500 }}>{selectedStudent.testName} • Examination Report</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                style={{ background: 'white', border: '2px solid var(--border)', width: '48px', height: '48px', borderRadius: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, transition: 'all 0.3s', color: 'var(--text-tertiary)' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--error)'; e.currentTarget.style.color = 'var(--error)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
                            >✕</button>
                        </div>

                        <div style={{ padding: '3rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                            {/* Summary Performance Benchmarks */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                <div style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Success Rate</div>
                                    <div style={{ fontSize: '2.25rem', fontWeight: 1000, color: getScoreColor(selectedStudent.score) }}>{selectedStudent.score}%</div>
                                </div>
                                <div style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Raw Score</div>
                                    <div style={{ fontSize: '2.25rem', fontWeight: 1000, color: 'var(--text-primary)' }}>{selectedStudent.actualScore}/{selectedStudent.maxScore}</div>
                                </div>
                                <div style={{ background: 'white', padding: '1.5rem 2rem', borderRadius: '24px', border: '1.5px solid var(--border)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Total Duration</div>
                                    <div style={{ fontSize: '2.25rem', fontWeight: 1000, color: '#f59e0b' }}>{selectedStudent.timeTaken}</div>
                                </div>
                            </div>

                            {/* Section breakdown with expandable category cards */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <div style={{ width: '6px', height: '24px', background: 'var(--primary)', borderRadius: '3px' }} />
                                    Detailed Performance Analysis
                                </div>

                                {selectedStudent.categories.map(cat => {
                                    const catAnswers = selectedStudent.answers.filter(a => a.category === cat.name);
                                    const isExpanded = expandedCategories[cat.name];

                                    return (
                                        <div key={cat.name} style={{ background: 'white', borderRadius: '32px', border: `2px solid ${isExpanded ? 'var(--primary)' : 'var(--border)'}`, overflow: 'hidden', transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: isExpanded ? '0 12px 30px rgba(0,0,0,0.08)' : 'none' }}>
                                            {/* Accordion Header */}
                                            <div
                                                onClick={() => toggleCategory(cat.name)}
                                                style={{ padding: '2rem 2.5rem', background: isExpanded ? 'var(--bg-app)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flex: 1 }}>
                                                    <div style={{ minWidth: '180px' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>Category</div>
                                                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-primary)' }}>{cat.name}</div>
                                                    </div>
                                                    <div style={{ flex: 1, maxWidth: '500px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.6rem' }}>
                                                            <span>Accuracy: {cat.score}%</span>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>{cat.correct}/{cat.total} Correct</span>
                                                        </div>
                                                        <div style={{ height: '10px', background: 'rgba(0,0,0,0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${cat.score}%`, height: '100%', background: cat.color, transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ marginLeft: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-secondary)' }}>{catAnswers.length}</div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Items</div>
                                                    </div>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s' }}>
                                                        <ChevronDown size={20} color="var(--text-tertiary)" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Accordion Questions */}
                                            {isExpanded && (
                                                <div style={{ padding: '2.5rem', borderTop: '1px solid var(--border)', background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                                                    {catAnswers.map((q, idx) => (
                                                        <div key={idx} style={{ padding: '2rem', background: 'white', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                                                                <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.5, flex: 1, paddingRight: '2rem' }}>
                                                                    <span style={{ color: 'var(--primary)', fontStyle: 'italic', marginRight: '0.5rem' }}>Q{q.originalIndex}:</span> {q.question}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 1rem', background: 'var(--bg-app)', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                                                    <Clock size={16} /> {q.timeSpent}
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: q.isCorrect ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
                                                                {q.isCorrect ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '18px', border: '2px solid #bbf7d0' }}>
                                                                        <CheckCircle2 size={24} />
                                                                        <div>
                                                                            <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Final Answer</div>
                                                                            <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.studentAnswer}</div>
                                                                        </div>
                                                                        <div style={{ marginLeft: 'auto', background: '#22c55e', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>CORRECT</div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#fef2f2', color: '#dc2626', borderRadius: '18px', border: '2px solid #fecaca' }}>
                                                                            <XCircle size={24} />
                                                                            <div>
                                                                                <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Selected Answer</div>
                                                                                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.studentAnswer || 'NO RESPONSE'}</div>
                                                                            </div>
                                                                        </div>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.75rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '18px', border: '2px dashed #22c55e' }}>
                                                                            <CheckCircle2 size={24} />
                                                                            <div>
                                                                                <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.2rem', opacity: 0.8 }}>Correct Answer</div>
                                                                                <div style={{ fontWeight: 900, fontSize: '1.1rem' }}>{q.correctAnswer}</div>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Overall Hollistic Category Chart */}
                            <div style={{ marginTop: '2rem', padding: '3.5rem', background: 'linear-gradient(135deg, var(--bg-app), #f8fafc)', borderRadius: '40px', border: '1.5px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
                                        <div style={{ width: '50px', height: '50px', background: 'white', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                                            <PieChart size={24} color="var(--primary)" />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.75rem', fontWeight: 1000, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Holistic Performance Chart</h3>
                                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-tertiary)', fontWeight: 600 }}>Statistical distribution across all test domains</p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                                        {selectedStudent.categories.map(cat => (
                                            <div key={cat.name}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-end' }}>
                                                    <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{cat.name}</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <span style={{ fontWeight: 1000, color: cat.color, fontSize: '1.5rem' }}>{cat.score}%</span>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>ACCURACY</span>
                                                    </div>
                                                </div>
                                                <div style={{
                                                    height: '18px',
                                                    background: 'white',
                                                    borderRadius: '9px',
                                                    overflow: 'hidden',
                                                    border: '2px solid rgba(0,0,0,0.04)',
                                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                                                }}>
                                                    <div style={{
                                                        width: `${cat.score}%`,
                                                        height: '100%',
                                                        background: cat.color,
                                                        boxShadow: `4px 0 12px ${cat.color}66`,
                                                        transition: 'width 2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                                    }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '200px', height: '200px', background: 'var(--primary)', opacity: 0.03, borderRadius: '50%' }} />
                            </div>
                        </div>

                        {/* Modal Footer Controls */}
                        <div style={{ padding: '2rem 3.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'flex-end', gap: '1.25rem' }}>
                            <button
                                onClick={handleExportCSV}
                                style={{ padding: '1rem 2rem', borderRadius: '18px', background: 'white', border: '2px solid var(--border)', fontWeight: 800, cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <FileSpreadsheet size={20} color="var(--success)" /> CSV
                            </button>
                            <button
                                onClick={handleExportPDF}
                                style={{ padding: '1rem 2rem', borderRadius: '18px', background: 'var(--primary)', border: 'none', fontWeight: 800, cursor: 'pointer', color: 'white', transition: 'all 0.3s', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <FilePdf size={20} color="white" /> PDF Report
                            </button>
                            <button
                                onClick={() => setSelectedStudent(null)}
                                style={{ padding: '1rem 3rem', borderRadius: '18px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 24px rgba(var(--primary-rgb), 0.3)', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
                            >Exit Assessment</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeInUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { transform: translateY(40px) scale(0.96); opacity: 0; }
                    to { transform: translateY(0) scale(1); opacity: 1; }
                }
                .result-row:hover {
                    background: rgba(99, 102, 241, 0.03);
                    transform: translateX(4px);
                }
                :root {
                    --primary-rgb: 99, 102, 241;
                }
            `}</style>
        </div>
    );
};

export default Results;
