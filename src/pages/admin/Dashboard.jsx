import React, { useState, useEffect, useRef } from 'react';
import { Users, FileText, Database, Layers, Calendar as CalendarIcon, Activity, ChevronRight, ChevronLeft, TrendingUp, Search, ChevronDown, X, Download, Loader } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

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

const TrendLineChart = ({ data, color }) => {
    if (!data || data.length === 0) {
        return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontWeight: 600 }}>No trend data available for this range.</div>;
    }

    const height = 400; // Increased chart height
    const width = 1000; // Increased width scaling
    const padding = 50;
    const paddingBottom = 60; // Extra padding for rotated labels

    const maxVal = 100; // Since it's percentage
    const minVal = 0;

    // Scale functions
    const scaleX = (index) => padding + (index * (width - 2 * padding)) / Math.max(1, data.length - 1);
    const scaleY = (val) => height - paddingBottom - ((val - minVal) / (maxVal - minVal)) * (height - padding - paddingBottom);

    // Path generator
    const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`).join(' ');

    // Gradient for area under line
    const areaD = `${pathD} L ${scaleX(data.length - 1)} ${height - paddingBottom} L ${scaleX(0)} ${height - paddingBottom} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(tick => (
                <g key={tick}>
                    <line x1={padding} y1={scaleY(tick)} x2={width - padding} y2={scaleY(tick)} stroke="var(--border)" strokeDasharray="4 4" />
                    <text x={padding - 10} y={scaleY(tick) + 4} textAnchor="end" fill="var(--text-tertiary)" fontSize="12px" fontFamily="monospace">{tick}%</text>
                </g>
            ))}

            {/* Area */}
            <path d={areaD} fill={`url(#gradient-${color.replace('#', '')})`} />

            {/* Line */}
            <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data points */}
            {data.map((d, i) => (
                <g key={i}>
                    <circle cx={scaleX(i)} cy={scaleY(d.value)} r="5" fill="var(--bg-surface)" stroke={color} strokeWidth="2" style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                        onMouseEnter={e => { e.currentTarget.setAttribute('r', '7'); e.currentTarget.setAttribute('fill', color); }}
                        onMouseLeave={e => { e.currentTarget.setAttribute('r', '5'); e.currentTarget.setAttribute('fill', 'var(--bg-surface)'); }}
                    />
                    {/* X-axis labels */}
                    <text x={scaleX(i)} y={height - paddingBottom + 20} textAnchor="end" transform={`rotate(-45 ${scaleX(i)} ${height - paddingBottom + 20})`} fill="var(--text-secondary)" fontSize="11px" fontWeight="600" style={{ pointerEvents: 'none' }}>{d.time}</text>
                    {/* Value label on top of point */}
                    <text x={scaleX(i)} y={scaleY(d.value) - 15} textAnchor="middle" fill={color} fontSize="12px" fontWeight="bold">{d.value}%</text>
                </g>
            ))}
        </svg>
    );
};

const CategoryTrendModal = ({ category, onClose }) => {
    const [filterType, setFilterType] = useState('Specific Year'); // 'Specific Year', 'Specific Month', 'Year Range', 'Month Range'
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [startYear, setStartYear] = useState(new Date().getFullYear() - 1);
    const [endYear, setEndYear] = useState(new Date().getFullYear());
    const [startMonth, setStartMonth] = useState(1);
    const [endMonth, setEndMonth] = useState(12);

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const contentRef = useRef(null);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const handleExportPDF = async () => {
        if (!contentRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(contentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            pdf.save(`${category.label}_Mastery_Analysis.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const fetchTrend = async () => {
            setIsLoading(true);
            try {
                let url = `/api/dashboard/trend?category=${encodeURIComponent(category.label)}`;
                if (filterType === 'Specific Year') {
                    url += `&period=year&year=${year}`;
                } else if (filterType === 'Specific Month') {
                    url += `&period=month&year=${year}&month=${month}`;
                } else if (filterType === 'Year Range') {
                    url += `&period=year_range&startYear=${startYear}&endYear=${endYear}`;
                } else if (filterType === 'Month Range') {
                    url += `&period=month_range&year=${year}&startMonth=${startMonth}&endMonth=${endMonth}`;
                }

                const res = await fetch(url);
                if (res.ok) {
                    setData(await res.json());
                }
            } catch (error) {
                console.error("Failed to fetch trend", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTrend();
    }, [category, filterType, year, month, startYear, endYear, startMonth, endMonth]);

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
        }} onClick={onClose}>
            <div ref={contentRef} style={{
                background: 'var(--bg-surface)', width: '95%', maxWidth: '1200px', // Increased maximum width
                borderRadius: '28px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${category.color}10` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: category.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={28} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{category.label} Mastery Analysis</h2>
                            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Historical performance tracking</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }} data-html2canvas-ignore="true">
                        <button 
                            onClick={handleExportPDF} 
                            disabled={isExporting}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                padding: '0.6rem 1.25rem', borderRadius: '14px', 
                                background: 'white', color: category.color, 
                                fontWeight: 700, fontSize: '0.9rem',
                                border: `1px solid ${category.color}40`,
                                cursor: isExporting ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                opacity: isExporting ? 0.7 : 1
                            }}
                            onMouseEnter={e => !isExporting && (e.currentTarget.style.transform = 'translateY(-2px)', e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)')}
                            onMouseLeave={e => !isExporting && (e.currentTarget.style.transform = 'none', e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)')}
                        >
                            {isExporting ? <Loader size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={18} />} 
                            {isExporting ? 'Exporting...' : 'Download PDF'}
                        </button>

                        <button onClick={onClose} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'none' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-app)' }}>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                        <option>Specific Year</option>
                        <option>Specific Month</option>
                        <option>Year Range</option>
                        <option>Month Range</option>
                    </select>

                    <div style={{ width: '1px', height: '30px', background: 'var(--border)' }} />

                    {filterType === 'Specific Year' && (
                        <input type="number" value={year} onChange={e => setYear(e.target.value)} min="2000" max="2100" style={{ padding: '0.6rem 1rem', width: '100px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
                    )}

                    {filterType === 'Specific Month' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} min="2000" max="2100" style={{ padding: '0.6rem 1rem', width: '100px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
                            <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                    )}

                    {filterType === 'Year Range' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input type="number" value={startYear} onChange={e => setStartYear(e.target.value)} min="2000" max="2100" style={{ padding: '0.6rem 1rem', width: '100px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>to</span>
                            <input type="number" value={endYear} onChange={e => setEndYear(e.target.value)} min="2000" max="2100" style={{ padding: '0.6rem 1rem', width: '100px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
                        </div>
                    )}

                    {filterType === 'Month Range' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <input type="number" value={year} onChange={e => setYear(e.target.value)} min="2000" max="2100" style={{ padding: '0.6rem 1rem', width: '100px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', boxShadow: 'var(--shadow-sm)' }} />
                            <select value={startMonth} onChange={e => setStartMonth(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>to</span>
                            <select value={endMonth} onChange={e => setEndMonth(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontWeight: 600, outline: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}>
                                {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* Chart Area */}
                <div style={{ padding: '2.5rem', height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isLoading ? (
                        <div style={{ color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="loader" style={{ width: '20px', height: '20px', border: `3px solid ${category.color}40`, borderTopColor: category.color, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            Loading analytics data...
                        </div>
                    ) : (
                        <TrendLineChart data={data} color={category.color} />
                    )}
                </div>
            </div>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const MiniCalendar = ({ activeMonth, setActiveMonth, calendarData }) => {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const year = activeMonth.getFullYear();
    const month = activeMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    const [pickerMode, setPickerMode] = useState(null); // null | 'month' | 'year'
    const pickerRef = React.useRef(null);

    // Close picker on outside click
    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setPickerMode(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
    while (calendarDays.length % 7 !== 0) calendarDays.push(null);

    const navigate = (dir) => {
        const d = new Date(activeMonth);
        d.setMonth(d.getMonth() + dir);
        setActiveMonth(d);
    };

    const selectMonth = (m) => {
        const d = new Date(activeMonth);
        d.setMonth(m);
        setActiveMonth(d);
        setPickerMode(null);
    };

    const selectYear = (y) => {
        const d = new Date(activeMonth);
        d.setFullYear(y);
        setActiveMonth(d);
        setPickerMode(null);
    };

    const CELL_SIZE = 36;
    const CELL_GAP = 4;
    const currentYear = today.getFullYear();
    const yearRange = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);

    return (
        <div ref={pickerRef} style={{
            background: 'var(--bg-surface)',
            borderRadius: '24px',
            padding: '1.5rem',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <style>{`
                @keyframes calPickerIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .cal-year-scroll::-webkit-scrollbar { width: 5px; }
                .cal-year-scroll::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 10px; }
                .cal-year-scroll::-webkit-scrollbar-track { background: transparent; }
            `}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CalendarIcon size={18} color="var(--primary)" />

                    {/* Month button */}
                    <button
                        onClick={() => setPickerMode(pickerMode === 'month' ? null : 'month')}
                        style={{
                            fontSize: '1rem', fontWeight: 800,
                            color: pickerMode === 'month' ? 'var(--primary)' : 'var(--text-primary)',
                            background: pickerMode === 'month' ? 'var(--primary-light)' : 'transparent',
                            border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '10px',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { if (pickerMode !== 'month') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    >
                        {monthNames[month]} <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: pickerMode === 'month' ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {/* Year button */}
                    <button
                        onClick={() => setPickerMode(pickerMode === 'year' ? null : 'year')}
                        style={{
                            fontSize: '1rem', fontWeight: 800,
                            color: pickerMode === 'year' ? 'var(--primary)' : 'var(--text-primary)',
                            background: pickerMode === 'year' ? 'var(--primary-light)' : 'transparent',
                            border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: '10px',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
                        onMouseLeave={e => { if (pickerMode !== 'year') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    >
                        {year} <ChevronDown size={14} style={{ transition: 'transform 0.3s', transform: pickerMode === 'year' ? 'rotate(180deg)' : 'none' }} />
                    </button>
                </div>

                {/* Prev / Next */}
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {[{ dir: -1, Icon: ChevronLeft }, { dir: 1, Icon: ChevronRight }].map(({ dir, Icon }) => (
                        <button key={dir} onClick={() => navigate(dir)} style={{
                            width: '30px', height: '30px', borderRadius: '8px',
                            border: '1px solid var(--border)', background: 'var(--bg-app)',
                            cursor: 'pointer', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        ><Icon size={15} /></button>
                    ))}
                </div>
            </div>

            {/* Body: calendar grid always rendered; picker overlays on top */}
            <div style={{ width: '100%', position: 'relative' }}>

                {/* ── CALENDAR GRID (always in DOM, sets fixed card height) ── */}
                <div style={{ width: '100%' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                        {days.map(d => (
                            <div key={d} style={{
                                textAlign: 'center', fontSize: '0.7rem', fontWeight: 700,
                                color: 'var(--text-tertiary)', padding: '6px 0', letterSpacing: '0.03em'
                            }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: `${CELL_GAP}px` }}>
                        {calendarDays.map((day, i) => {
                            const isToday = isCurrentMonth && day === today.getDate();
                            const pastEntry = day && calendarData.past?.find(e => e.day === day);
                            const upcomingEntry = day && calendarData.upcoming?.find(e => e.day === day);
                            const isPast = !!pastEntry;
                            const isUpcoming = !!upcomingEntry;
                            const dayExams = isPast ? pastEntry.exams : isUpcoming ? upcomingEntry.exams : [];
                            const isHighlighted = (isPast || isUpcoming);

                            let bg = 'transparent', color = 'var(--text-primary)', fontWeight = 500;
                            if (isToday) { bg = 'var(--primary)'; color = 'white'; fontWeight = 800; }
                            else if (isPast) { bg = 'rgba(239,68,68,0.1)'; color = 'var(--error)'; fontWeight = 600; }
                            else if (isUpcoming) { bg = 'rgba(16,185,129,0.1)'; color = 'var(--success)'; fontWeight = 600; }

                            return (
                                <div key={i} style={{ position: 'relative' }}>
                                    <div style={{
                                        height: `${CELL_SIZE}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '10px', fontSize: '0.8rem', fontWeight,
                                        color: day ? color : 'transparent', background: day ? bg : 'transparent',
                                        cursor: day ? 'pointer' : 'default', transition: 'all 0.15s', userSelect: 'none',
                                        boxShadow: isToday ? '0 4px 10px rgba(99,102,241,0.3)' : 'none',
                                        position: 'relative'
                                    }}
                                        onMouseEnter={e => {
                                            if (day && !isToday) { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }
                                            if (isHighlighted) {
                                                const tip = e.currentTarget.parentElement.querySelector('.exam-tip');
                                                if (tip) tip.style.display = 'block';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (day && !isToday) { e.currentTarget.style.background = bg; e.currentTarget.style.color = color; }
                                            if (isHighlighted) {
                                                const tip = e.currentTarget.parentElement.querySelector('.exam-tip');
                                                if (tip) tip.style.display = 'none';
                                            }
                                        }}
                                    >
                                        <span>{day}</span>
                                        {isToday && isHighlighted && (
                                            <div style={{
                                                width: '4px', height: '4px', borderRadius: '50%',
                                                background: 'white', marginTop: '2px', position: 'absolute', bottom: '4px'
                                            }} />
                                        )}
                                    </div>

                                    {/* Exam Tooltip */}
                                    {isHighlighted && dayExams.length > 0 && (
                                        <div className="exam-tip" style={{
                                            display: 'none',
                                            position: 'absolute',
                                            bottom: 'calc(100% + 8px)',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            zIndex: 999,
                                            background: 'var(--bg-surface)',
                                            border: `1px solid ${isPast ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                            borderRadius: '12px',
                                            padding: '0.6rem 0.75rem',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                            whiteSpace: 'nowrap',
                                            minWidth: '140px',
                                            pointerEvents: 'none'
                                        }}>
                                            <div style={{
                                                fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                                letterSpacing: '0.05em', color: isToday ? 'var(--primary)' : isPast ? 'var(--error)' : 'var(--success)',
                                                marginBottom: '0.4rem'
                                            }}>
                                                {isToday ? '🎯 Today\'s Exams' : isPast ? '📋 Past Exams' : '🗓️ Upcoming Exams'}
                                            </div>
                                            {dayExams.map((name, idx) => (
                                                <div key={idx} style={{
                                                    fontSize: '0.78rem', fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                    padding: '0.2rem 0',
                                                    borderTop: idx > 0 ? '1px solid var(--border)' : 'none'
                                                }}>
                                                    {name}
                                                </div>
                                            ))}
                                            {/* Arrow */}
                                            <div style={{
                                                position: 'absolute', bottom: '-5px', left: '50%',
                                                transform: 'translateX(-50%) rotate(45deg)',
                                                width: '9px', height: '9px',
                                                background: 'var(--bg-surface)',
                                                border: `1px solid ${isPast ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                                                borderTop: 'none', borderLeft: 'none'
                                            }} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── PICKER OVERLAY (absolute, floats over the grid, card stays same size) ── */}
                {pickerMode && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'var(--bg-surface)',
                        borderRadius: '16px',
                        animation: 'calPickerIn 0.2s ease',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        padding: '0.5rem 0'
                    }}>
                        {/* Month picker grid */}
                        {pickerMode === 'month' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {monthShort.map((m, i) => (
                                    <button key={i} onClick={() => selectMonth(i)} style={{
                                        padding: '0.8rem 0.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.875rem', fontWeight: 700,
                                        background: i === month ? 'var(--primary)' : 'var(--bg-app)',
                                        color: i === month ? 'white' : 'var(--text-primary)',
                                        transition: 'all 0.15s',
                                        boxShadow: i === month ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                                    }}
                                        onMouseEnter={e => { if (i !== month) { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; } }}
                                        onMouseLeave={e => { if (i !== month) { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                                    >{m}</button>
                                ))}
                            </div>
                        )}

                        {/* Year picker grid */}
                        {pickerMode === 'year' && (
                            <div className="cal-year-scroll" style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                                overflowY: 'auto', maxHeight: '100%',
                                scrollbarWidth: 'thin', scrollbarColor: 'var(--primary) transparent'
                            }}>
                                {yearRange.map(y => (
                                    <button key={y} onClick={() => selectYear(y)} style={{
                                        padding: '0.7rem 0.25rem', borderRadius: '14px', border: 'none', cursor: 'pointer',
                                        fontSize: '0.875rem', fontWeight: 700, textAlign: 'center',
                                        background: y === year ? 'var(--primary)' : y === currentYear ? 'var(--primary-light)' : 'var(--bg-app)',
                                        color: y === year ? 'white' : y === currentYear ? 'var(--primary)' : 'var(--text-primary)',
                                        transition: 'all 0.15s',
                                        boxShadow: y === year ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                                    }}
                                        onMouseEnter={e => { if (y !== year) { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; } }}
                                        onMouseLeave={e => { if (y !== year) { e.currentTarget.style.background = y === currentYear ? 'var(--primary-light)' : 'var(--bg-app)'; e.currentTarget.style.color = y === currentYear ? 'var(--primary)' : 'var(--text-primary)'; } }}
                                    >{y}</button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Legend — always visible */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                {[{ color: 'var(--success)', label: 'Upcoming' }, { color: 'var(--error)', label: 'Past' }, { color: 'var(--primary)', label: 'Today' }].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '3px', background: color, flexShrink: 0 }} /> {label}
                    </div>
                ))}
            </div>
        </div>
    );
};


// --- Main Dashboard Component ---

const Dashboard = () => {
    const [period, setPeriod] = useState('month'); // today, month, year
    const [selectedCategoryModal, setSelectedCategoryModal] = useState(null);
    const [activeMonth, setActiveMonth] = useState(new Date());
    const [stats, setStats] = useState({ totalTests: 0, totalQuestions: 0, totalCategories: 0, studentsCount: 0 });
    const [performance, setPerformance] = useState([]);
    const [calendarData, setCalendarData] = useState({ past: [], upcoming: [] });
    const [isLoading, setIsLoading] = useState(true);


    const fetchData = async () => {
        setIsLoading(true);
        try {
            const baseUrl = '/api/dashboard';
            const [statsRes, perfRes, calRes] = await Promise.all([
                fetch(`${baseUrl}/stats?period=${period}`),
                fetch(`${baseUrl}/category-performance?period=${period}`),
                fetch(`${baseUrl}/calendar?month=${activeMonth.getMonth() + 1}&year=${activeMonth.getFullYear()}`)
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (perfRes.ok) setPerformance(await perfRes.json());
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

                </div>

            </div>

            {/* Top Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <StatCard title="Total Exams" value={stats.totalTests} icon={<FileText size={24} />} color="#6366f1" bgColor="rgba(99, 102, 241, 0.1)" />
                <StatCard title="Total Students" value={stats.totalStudents} icon={<Users size={24} />} color="#10b981" bgColor="rgba(16, 185, 129, 0.1)" />
                <StatCard title="Question Bank" value={stats.totalQuestions} icon={<Database size={24} />} color="#f59e0b" bgColor="rgba(245, 158, 11, 0.1)" />
                <StatCard title="Total Categories" value={stats.totalCategories} icon={<Layers size={24} />} color="#ec4899" bgColor="rgba(236, 72, 153, 0.1)" />
            </div>

            {/* Main Content Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

                {/* Analytics Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Category Performance Grid */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Activity size={22} color="var(--primary)" /> Category Analysis
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
                                    onSelect={() => setSelectedCategoryModal(cat)}
                                    isSelected={selectedCategoryModal?.label === cat.label}
                                />
                            ))}
                            {performance.length === 0 && (
                                <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
                                    <p style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>No assessment data found for this period.</p>
                                </div>
                            )}
                        </div>

                    </section>
                </div>

                {/* Sidebar Section */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <MiniCalendar activeMonth={activeMonth} setActiveMonth={setActiveMonth} calendarData={calendarData} />
                </div>

            </div>
            {selectedCategoryModal && (
                <CategoryTrendModal
                    category={selectedCategoryModal}
                    onClose={() => setSelectedCategoryModal(null)}
                />
            )}
        </div >
    );
};

export default Dashboard;
