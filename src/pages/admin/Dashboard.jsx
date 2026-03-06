import React, { useState, useEffect } from 'react';
import { Users, FileText, Database, Layers, Calendar as CalendarIcon, Clock, Activity, Target, PieChart, ChevronRight } from 'lucide-react';

// Reusable Stat Card Component
const StatCard = ({ title, value, icon, color, bgColor, trend }) => (
    <div style={{
        background: 'var(--bg-surface)',
        padding: '1.5rem',
        borderRadius: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        border: '1px solid var(--border)',
        transition: 'all 0.3s ease',
        cursor: 'pointer'
    }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.borderColor = color;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.borderColor = 'var(--border)';
        }}
    >
        <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '16px',
            background: bgColor,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
        }}>
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{title}</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</span>
                {trend && <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', paddingBottom: '0.25rem' }}>{trend}</span>}
            </div>
        </div>
    </div>
);

// SVG Pie Chart Component
const CategoryPieChart = ({ data, isLoading }) => {
    if (isLoading || !data || data.length === 0) {
        return <div style={{ height: '200px', display: 'flex', alignItems: 'center' }}>Loading chart data...</div>;
    }

    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <svg viewBox="-1 -1 2 2" style={{ width: '200px', height: '200px', transform: 'rotate(-90deg)' }}>
                {data.map(slice => {
                    const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                    cumulativePercent += slice.value / 100;
                    const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                    const largeArcFlag = slice.value > 50 ? 1 : 0;

                    const pathData = [
                        `M ${startX} ${startY}`,
                        `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `L 0 0`,
                    ].join(' ');

                    return (
                        <path
                            key={slice.label}
                            d={pathData}
                            fill={slice.color}
                            style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                            onMouseLeave={e => e.currentTarget.style.opacity = 1}
                        >
                            <title>{slice.label}: {slice.value}%</title>
                        </path>
                    );
                })}
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                {data.map(slice => (
                    <div key={slice.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: slice.color }}></div>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{slice.label}</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{slice.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const MiniCalendar = ({ data }) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();

    const past = data?.past || [];
    const upcoming = data?.upcoming || [];

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
        <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarIcon size={20} color="var(--primary)" /> Examination Calendar
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '1rem' }}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>{d}</div>
                ))}
                {days.map((day, i) => {
                    let bgColor = 'transparent';
                    let color = 'var(--text-primary)';
                    let fw = 500;
                    if (day === today.getDate()) {
                        bgColor = 'var(--primary-light)';
                        color = 'var(--primary)';
                        fw = 800;
                    } else if (past.includes(day)) {
                        bgColor = 'rgba(239, 68, 68, 0.1)';
                        color = 'var(--error)';
                        fw = 700;
                    } else if (upcoming.includes(day)) {
                        bgColor = 'rgba(16, 185, 129, 0.1)';
                        color = 'var(--success)';
                        fw = 700;
                    }

                    return (
                        <div key={i} style={{
                            padding: '0.5rem',
                            borderRadius: '8px',
                            background: bgColor,
                            color: color,
                            fontWeight: fw,
                            fontSize: '0.875rem',
                            cursor: day ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                        }}
                            onMouseEnter={e => { if (day) { e.currentTarget.style.transform = 'scale(1.1)'; } }}
                            onMouseLeave={e => { if (day) { e.currentTarget.style.transform = 'none'; } }}
                        >
                            {day || ''}
                        </div>
                    );
                })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.3)' }}></div> Upcoming</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(239, 68, 68, 0.3)' }}></div> Past</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary-light)' }}></div> Today</div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const [stats, setStats] = useState({
        totalTests: 0,
        totalQuestions: 0,
        totalCategories: 0,
        studentsCount: 0
    });
    const [categoryPerformance, setCategoryPerformance] = useState([]);
    const [activeTests, setActiveTests] = useState([]);
    const [calendarData, setCalendarData] = useState({ past: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, perfRes, activeRes, calRes] = await Promise.all([
                    fetch('http://localhost:8080/api/dashboard/stats'),
                    fetch('http://localhost:8080/api/dashboard/category-performance'),
                    fetch('http://localhost:8080/api/dashboard/active-tests'),
                    fetch('http://localhost:8080/api/dashboard/calendar')
                ]);

                if (statsRes.ok) setStats(await statsRes.json());
                if (perfRes.ok) setCategoryPerformance(await perfRes.json());
                if (activeRes.ok) setActiveTests(await activeRes.json());
                if (calRes.ok) setCalendarData(await calRes.json());

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>Overview</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.06rem' }}>Welcome back. Here is what's happening today.</p>
                </div>
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.75rem 1.5rem', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={18} /> {today}
                </div>
            </header>

            {/* Section 1: Top Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard title="Total Tests" value={isLoading ? "..." : stats.totalTests} icon={<FileText size={28} />} color="#3b82f6" bgColor="rgba(59, 130, 246, 0.1)" />
                <StatCard title="Total Questions" value={isLoading ? "..." : stats.totalQuestions} icon={<Database size={28} />} color="#8b5cf6" bgColor="rgba(139, 92, 246, 0.1)" />
                <StatCard title="Categories" value={isLoading ? "..." : stats.totalCategories} icon={<Layers size={28} />} color="#f59e0b" bgColor="rgba(245, 158, 11, 0.1)" />
                <StatCard title="Students Count" value={isLoading ? "..." : stats.studentsCount} icon={<Users size={28} />} color="#10b981" bgColor="rgba(16, 185, 129, 0.1)" />
            </div>

            {/* Section 2: Analytics Row (Moved Up) */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>

                {/* Custom SVG Pie Chart */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', padding: '3rem 2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <PieChart size={24} color="var(--primary)" /> Performance by Category Overview
                        </h2>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <CategoryPieChart data={categoryPerformance} isLoading={isLoading} />
                    </div>
                </div>

                {/* Mini Calendar Widget */}
                <MiniCalendar data={calendarData} />

            </div>

            {/* Section 3: Exams (Moved Down) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>

                {/* Active Tests List */}
                <div style={{ background: 'var(--bg-surface)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Activity size={20} color="var(--primary)" /> Active Examinations
                        </h2>
                        <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>View All</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeTests.length === 0 && !isLoading && <div style={{ color: 'var(--text-secondary)' }}>No active examinations currently running.</div>}
                        {isLoading && <div style={{ color: 'var(--text-secondary)' }}>Loading active tests...</div>}
                        {activeTests.map((test, index) => (
                            <div key={index} style={{ padding: '1.25rem', borderRadius: '16px', background: 'var(--bg-app)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                                        {test.name.substring(0, 3).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{test.name}</h4>
                                        <div style={{ background: 'var(--bg-surface)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', display: 'inline-block', border: '1px solid var(--primary-light)' }}>
                                            ID: {test.id}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', textAlign: 'right' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Users</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--success)', fontWeight: 700, justifyContent: 'flex-end' }}><Users size={14} /> {test.students}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>Time Left</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 700, justifyContent: 'flex-end' }}><Clock size={14} /> {test.timeRemaining}</div>
                                    </div>
                                    <ChevronRight size={20} color="var(--text-tertiary)" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
