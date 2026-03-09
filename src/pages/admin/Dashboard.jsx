import React, { useState, useEffect } from 'react';
import { Users, FileText, Database, Layers, Calendar as CalendarIcon, Clock, Activity, ChevronRight, ChevronLeft, TrendingUp, Search, ChevronDown, X } from 'lucide-react';

// --- Premium UI Components ---

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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
    }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
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
            borderRadius: '18px',
            background: bgColor,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.3s ease'
        }}>
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{title}</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</span>
                {trend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '6px' }}>
                        <TrendingUp size={12} /> {trend}
                    </div>
                )}
            </div>
        </div>
    </div>
);

const PremiumDropdown = ({ value, onChange, options, label, width = 'auto' }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && !event.target.closest('.premium-dropdown')) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const activeOption = options.find(opt => opt.value === value) || options[0];

    return (
        <div className="premium-dropdown" style={{ position: 'relative', width }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '0.6rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'var(--shadow-sm)'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                    if (!isOpen) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.transform = 'none';
                    }
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {label && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{label}:</span>}
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeOption.label}</span>
                </div>
                <ChevronDown size={16} style={{
                    color: 'var(--text-tertiary)',
                    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isOpen ? 'rotate(180deg)' : 'none'
                }} />
            </button>

            {isOpen && (
                <div className="premium-dropdown-menu" style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                    zIndex: 2000,
                    padding: '0.6rem',
                    animation: 'dropdownEntrance 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxHeight: '320px',
                    overflowY: 'auto',
                    backdropFilter: 'blur(30px)',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--primary) transparent'
                }}>
                    <style>{`
                        @keyframes dropdownEntrance {
                            from { opacity: 0; transform: translateY(-15px) scale(0.96); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .premium-dropdown-menu::-webkit-scrollbar { width: 8px; }
                        .premium-dropdown-menu::-webkit-scrollbar-track { background: transparent; }
                        .premium-dropdown-menu::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; border: 2px solid var(--bg-surface); }
                    `}</style>
                    <div>
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: opt.value === value ? 'white' : 'var(--text-primary)',
                                    background: opt.value === value ? 'var(--primary)' : 'transparent',
                                    transition: 'all 0.2s ease',
                                    marginBottom: '2px'
                                }}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};




const CategoryDonutChart = ({ percentage, color, size = 110 }) => {
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="var(--border)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
            </svg>
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)'
            }}>
                {percentage}%
            </div>
        </div>
    );
};

const CategoryAnalyticsCard = ({ category, onSelect, isSelected }) => (
    <div
        onClick={() => onSelect(category)}
        style={{
            background: isSelected ? `${category.color}10` : 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: '20px',
            border: `1px solid ${isSelected ? category.color : 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            boxShadow: isSelected ? `0 8px 16px ${category.color}15` : 'none',
            transform: isSelected ? 'scale(1.02)' : 'none'
        }}
        onMouseEnter={e => {
            if (!isSelected) {
                e.currentTarget.style.borderColor = category.color;
                e.currentTarget.style.background = `${category.color}05`;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }
        }}
        onMouseLeave={e => {
            if (!isSelected) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--bg-surface)';
                e.currentTarget.style.transform = 'none';
            }
        }}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: isSelected ? category.color : 'var(--text-primary)' }}>{category.label}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                {category.totalSubmissions || 0} Submissions
            </span>
        </div>
        <CategoryDonutChart percentage={category.value} color={category.color} />
    </div>
);

const MiniCalendar = ({ activeMonth, setActiveMonth, calendarData }) => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    // Build grid: leading empty cells + actual days
    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
    // Pad to complete the last row
    while (calendarDays.length % 7 !== 0) calendarDays.push(null);

    const nextMonth = () => {
        const d = new Date(activeMonth);
        d.setMonth(d.getMonth() + 1);
        setActiveMonth(d);
    };

    const prevMonth = () => {
        const d = new Date(activeMonth);
        d.setMonth(d.getMonth() - 1);
        setActiveMonth(d);
    };

    // Cell dimensions
    const CELL_SIZE = 36;
    const CELL_GAP = 4;

    return (
        <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            padding: '1.5rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={18} color="var(--primary)" />
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {monthNames[month]} {year}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button onClick={prevMonth} style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-app)',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    ><ChevronLeft size={15} /></button>
                    <button onClick={nextMonth} style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        border: '1px solid var(--border)', background: 'var(--bg-app)',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    ><ChevronRight size={15} /></button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ width: '100%' }}>
                {/* Day Headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                    {days.map(d => (
                        <div key={d} style={{
                            textAlign: 'center',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--text-tertiary)',
                            padding: '6px 0',
                            letterSpacing: '0.03em'
                        }}>{d}</div>
                    ))}
                </div>

                {/* Day Cells */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${CELL_GAP}px` }}>
                    {calendarDays.map((day, i) => {
                        const isToday = isCurrentMonth && day === today.getDate();
                        const isPast = day && calendarData.past?.includes(day);
                        const isUpcoming = day && calendarData.upcoming?.includes(day);

                        let bg = 'transparent';
                        let color = 'var(--text-primary)';
                        let fontWeight = 500;

                        if (isToday) { bg = 'var(--primary)'; color = 'white'; fontWeight = 800; }
                        else if (isPast) { bg = 'rgba(239, 68, 68, 0.1)'; color = 'var(--error)'; fontWeight = 600; }
                        else if (isUpcoming) { bg = 'rgba(16, 185, 129, 0.1)'; color = 'var(--success)'; fontWeight = 600; }

                        return (
                            <div key={i} style={{
                                height: `${CELL_SIZE}px`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                fontWeight,
                                color: day ? color : 'transparent',
                                background: day ? bg : 'transparent',
                                cursor: day ? 'pointer' : 'default',
                                transition: 'all 0.15s',
                                userSelect: 'none',
                                boxShadow: isToday ? '0 4px 10px rgba(99, 102, 241, 0.3)' : 'none'
                            }}
                                onMouseEnter={e => {
                                    if (day && !isToday) {
                                        e.currentTarget.style.background = 'var(--primary-light)';
                                        e.currentTarget.style.color = 'var(--primary)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (day && !isToday) {
                                        e.currentTarget.style.background = bg;
                                        e.currentTarget.style.color = color;
                                    }
                                }}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: 'var(--success)', flexShrink: 0 }} /> Upcoming
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: 'var(--error)', flexShrink: 0 }} /> Past
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: 'var(--primary)', flexShrink: 0 }} /> Today
                </div>
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

const Dashboard = () => {
    const [period, setPeriod] = useState('month'); // today, month, year
    const [activeMonth, setActiveMonth] = useState(new Date());
    const [stats, setStats] = useState({ totalTests: 0, totalQuestions: 0, totalCategories: 0, studentsCount: 0 });
    const [performance, setPerformance] = useState([]);
    const [activeTests, setActiveTests] = useState([]);
    const [calendarData, setCalendarData] = useState({ past: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);


    const fetchData = async () => {
        setIsLoading(true);
        try {
            const baseUrl = 'http://localhost:8080/api/dashboard';
            const [statsRes, perfRes, activeRes, calRes] = await Promise.all([
                fetch(`${baseUrl}/stats?period=${period}`),
                fetch(`${baseUrl}/category-performance?period=${period}`),
                fetch(`${baseUrl}/active-tests`),
                fetch(`${baseUrl}/calendar?month=${activeMonth.getMonth() + 1}&year=${activeMonth.getFullYear()}`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (perfRes.ok) setPerformance(await perfRes.json());
            if (activeRes.ok) setActiveTests(await activeRes.json());
            if (calRes.ok) setCalendarData(await calRes.json());

        } catch (error) {
            console.error("Dashboard error:", error);
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => { fetchData(); }, [period, activeMonth]);

    return (
        <div style={{ animation: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)', padding: '0.5rem' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 500 }}>Real-time assessment intelligence and system analytics.</p>
                </div>

            </div>

            {/* Top Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard title="Total Exams" value={stats.totalTests} icon={<FileText size={24} />} color="#6366f1" bgColor="rgba(99, 102, 241, 0.1)" />
                <StatCard title="Active In Period" value={stats.studentsCount} icon={<Users size={24} />} color="#10b981" bgColor="rgba(16, 185, 129, 0.1)" trend="+12%" />
                <StatCard title="Question Bank" value={stats.totalQuestions} icon={<Database size={24} />} color="#f59e0b" bgColor="rgba(245, 158, 11, 0.1)" />
                <StatCard title="Specialized Categories" value={stats.totalCategories} icon={<Layers size={24} />} color="#ec4899" bgColor="rgba(236, 72, 153, 0.1)" />
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

                {/* Analytics Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Category Performance Grid */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Activity size={22} color="var(--primary)" /> Category Mastery Analysis
                            </h2>
                            <PremiumDropdown
                                value={period}
                                label="Period"
                                onChange={(val) => setPeriod(val)}
                                options={[
                                    { value: 'today', label: 'Today' },
                                    { value: 'month', label: 'Month' },
                                    { value: 'year', label: 'Year' }
                                ]}
                                width="160px"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            {performance.map((cat, i) => (
                                <CategoryAnalyticsCard
                                    key={i}
                                    category={cat}
                                    onSelect={() => { }}
                                    isSelected={false}
                                />
                            ))}
                            {performance.length === 0 && (
                                <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>No assessment data found for this period.</p>
                                </div>
                            )}
                        </div>

                    </section>

                    {/* Active/Recent Exams */}
                    <section style={{ background: 'var(--bg-surface)', borderRadius: '28px', padding: '2rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Clock size={20} color="var(--primary)" /> Recent Exam Deployments
                            </h2>
                            <button style={{ background: 'var(--primary-light)', padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', color: 'var(--primary)', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>Generate Full Report</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {activeTests.map((test, i) => (
                                <div key={i} style={{
                                    padding: '1rem 1.25rem', borderRadius: '18px', background: 'var(--bg-app)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'all 0.2s ease', cursor: 'pointer'
                                }} onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'white', border: '2px solid var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem' }}>
                                            {test.name[0]}
                                        </div>
                                        <div>
                                            <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.1rem' }}>{test.name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Allocation: {test.students} Students</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 800, textTransform: 'uppercase' }}>Time Limit</div>
                                            <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>{test.timeRemaining}</div>
                                        </div>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <MiniCalendar activeMonth={activeMonth} setActiveMonth={setActiveMonth} calendarData={calendarData} />
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
