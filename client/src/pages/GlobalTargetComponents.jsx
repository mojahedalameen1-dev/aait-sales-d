import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, User, X, Clock, Calendar, Target } from 'lucide-react';

/* ─────────────────────────── CONSTANTS & UTILS ─────────────────────────── */
export const FONT = "'IBM Plex Sans Arabic', sans-serif";

export const fmt = (v) => new Intl.NumberFormat('en-US').format(Math.round(v || 0));
export const fmtSAR = (v) => `${fmt(v)} ر.س`;
export const fmtPct = (v) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(v)}%`;
export const MEDAL = ['🥇', '🥈', '🥉'];

export const parseDate = (dStr) => {
    if (!dStr) return null;
    const parts = dStr.split(/[/-]/);
    if (parts.length < 3) return null;
    let y, m, d;
    if (parts[0].length === 4) { y = parts[0]; m = parts[1]; d = parts[2]; }
    else { d = parts[0]; m = parts[1]; y = parts[2]; }
    const date = new Date(`${y}-${m}-${d}`);
    return isNaN(date.getTime()) ? null : date;
};

/* ─────────────────────────── BADGE ─────────────────────────── */
export function Badge({ label, color }) {
    return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black tracking-wide font-['IBM_Plex_Sans_Arabic'] transition-all hover:scale-105" 
            style={{ 
                background: `${color}15`, 
                color: color
            }}>
            {label}
        </span>
    );
}

const BADGE_COLORS = [
    '#4F8EF7', '#7C3AED', '#10B981', '#F59E0B', '#EC4899',
    '#6366F1', '#14B8A6', '#F97316', '#8B5CF6', '#EF4444'
];
let colorIndex = 0;
const colorMap = {};
export const getBadgeColor = (val) => {
    if (!val) return '#6B7280';
    if (!colorMap[val]) { colorMap[val] = BADGE_COLORS[colorIndex % BADGE_COLORS.length]; colorIndex++; }
    return colorMap[val];
};

/* ─────────────────────────── ANIMATED NUMBER ─────────────────────────── */
export function AnimatedNumber({ target, formatter = fmt, duration = 1400 }) {
    const [display, setDisplay] = useState(0);
    const raf = useRef(null);
    const start = useRef(0);
    useEffect(() => {
        start.current = display;
        let t0 = null;
        const tick = (ts) => {
            if (!t0) t0 = ts;
            const p = Math.min((ts - t0) / duration, 1);
            const e = 1 - Math.pow(1 - p, 3);
            setDisplay(start.current + (target - start.current) * e);
            if (p < 1) raf.current = requestAnimationFrame(tick);
            else setDisplay(target);
        };
        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);
    return <>{formatter(display)}</>;
}

/* ─────────────────────────── PROGRESS BAR ─────────────────────────── */
export function ProgressBar({ pct, height = 6 }) {
    const isSuccess = pct >= 100;
    const isWarning = pct >= 60 && pct < 100;
    const color = isSuccess ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';
    
    return (
        <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden" style={{ height }}>
            <motion.div
                initial={{ width: 0 }} 
                animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="h-full rounded-full shadow-sm"
                style={{ 
                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                    boxShadow: isSuccess ? '0 0 12px rgba(16, 185, 129, 0.3)' : 'none'
                }}
            />
        </div>
    );
}

/* ─────────────────────────── SVG DONUT ─────────────────────────── */
export function DonutChart({ data, colors, isDark }) {
    const [hovered, setHovered] = useState(null);
    const S = 180, R = 65, SW = 24, C = S / 2;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const slices = [];
    let acc = -Math.PI / 2;
    data.forEach((d, i) => {
        const angle = (d.value / total) * 2 * Math.PI;
        const x1 = C + R * Math.cos(acc), y1 = C + R * Math.sin(acc);
        const x2 = C + R * Math.cos(acc + angle), y2 = C + R * Math.sin(acc + angle);
        slices.push({ d, i, x1, y1, x2, y2, angle, startAngle: acc });
        acc += angle;
    });
    return (
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ flexShrink: 0 }}>
                {slices.map(({ d, i, x1, y1, x2, y2, angle }) => {
                    const isHov = hovered === i;
                    const strokeW = isHov ? SW + 8 : SW;
                    return (
                        <motion.path
                            key={i}
                            d={`M ${x1} ${y1} A ${R} ${R} 0 ${angle > Math.PI ? 1 : 0} 1 ${x2} ${y2}`}
                            fill="none" stroke={colors[i % colors.length]} strokeWidth={strokeW} strokeLinecap="butt"
                            style={{ cursor: 'pointer', transition: 'stroke-width .2s' }}
                            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, delay: i * 0.08 }}
                            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                        />
                    );
                })}
                <text x={C} y={C - 6} textAnchor="middle" fontSize="10" fill={isDark ? "#94A3B8" : "#64748B"} fontFamily={FONT}>الإجمالي</text>
                <text x={C} y={C + 12} textAnchor="middle" fontSize="16" fontWeight="800" fill={isDark ? "white" : "#0F172A"} fontFamily={FONT}>
                    {hovered != null ? fmt(data[hovered].value) : fmt(total)}
                </text>
                {hovered != null && (
                    <text x={C} y={C + 34} textAnchor="middle" fontSize="12" fontWeight="600" fill={colors[hovered % colors.length]} fontFamily={FONT}>
                        {fmtPct((data[hovered].value / total) * 100)}
                    </text>
                )}
            </svg>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                {data.map((d, i) => (
                    <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, cursor: 'pointer',
                            background: hovered === i ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)') : 'transparent', transition: 'background .15s'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: hovered === i ? (isDark ? 'white' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'), fontFamily: FONT }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors[i % colors.length], fontFamily: FONT }}>{fmt(d.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────── HORIZONTAL BAR CHART ─────────────────────────── */
export function BarChart({ data, colors, isDark }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.map((d, i) => (
                <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#334155', fontFamily: FONT }}>{d.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: colors[i % colors.length], fontFamily: FONT }}>{fmtSAR(d.value)}</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 999, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ duration: 1.2, delay: i * 0.08, ease: 'easeOut' }}
                            style={{ height: '100%', background: colors[i % colors.length], borderRadius: 999 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────── REP MODAL ─────────────────────────── */
export function RepModal({ repName, onClose, allMonthsData, isDark }) {
    const repDataAcrossMonths = useMemo(() => {
        return allMonthsData.map(m => {
            const total = m.data.filter(r =>
                (r.__sales && r.__sales.trim() === repName.trim()) ||
                (r.__team && r.__team.trim() === repName.trim())
            ).reduce((sum, r) => sum + r.__amount, 0);
            return { name: m.name, total };
        });
    }, [allMonthsData, repName]);

    const totalAllTime = repDataAcrossMonths.reduce((s, m) => s + m.total, 0);
    const avgPerMonth = totalAllTime / (repDataAcrossMonths.length || 1);
    const bestMonth = [...repDataAcrossMonths].sort((a, b) => b.total - a.total)[0] || { name: '-', total: 0 };
    const maxVal = Math.max(...repDataAcrossMonths.map(m => m.total), 1);

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 dark:bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, y: 30, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={e => e.stopPropagation()} 
                className="bg-white dark:bg-slate-900 rounded-[28px] p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative direction-rtl font-['IBM_Plex_Sans_Arabic']"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white m-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <User size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        أداء: {repName}
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-xl">
                        <div className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-1">الإجمالي الكلي</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{fmtSAR(totalAllTime)}</div>
                    </div>
                    <div className="bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-xl">
                        <div className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider mb-1">المتوسط الشهري</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{fmtSAR(avgPerMonth)}</div>
                    </div>
                    <div className="bg-amber-50/50 dark:bg-amber-500/5 p-4 rounded-xl">
                        <div className="text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">أفضل شهر</div>
                        <div className="text-xl font-black text-slate-900 dark:text-white">{bestMonth.name}</div>
                    </div>
                </div>

                <h3 className="text-base font-black text-slate-900 dark:text-white mb-4">الأداء عبر الشهور المتاحة</h3>
                <div className="flex items-end h-40 gap-3 mb-4 pb-4 overflow-x-auto min-w-full">
                    {repDataAcrossMonths.map((m, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-3 min-w-[60px]">
                            <div className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">{fmt(m.total)}</div>
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${(m.total / maxVal) * 100}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className="w-full max-w-[40px] bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg min-h-[4px]" 
                                style={{
                                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 2px, transparent 2px), linear-gradient(90deg, rgba(255,255,255,0.1) 2px, transparent 2px)',
                                    backgroundSize: '8px 8px'
                                }}
                            />
                            <div className="text-[10px] text-slate-400 dark:text-gray-500 font-bold text-center whitespace-pre-line leading-tight">{m.name.replace(' 202', '\n202')}</div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

/* ─────────────────────────── PROGRESS PROGRESS CHART ─────────────────────────── */
export function PerformanceProgressChart({ data, target, isDark }) {
    const C = {
        bg: 'var(--bg-main)',
        border: 'var(--border-color)',
        text: 'var(--text-main)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent-color)',
        secondary: '#7C3AED',
        warning: '#F59E0B',
        success: '#10B981'
    };

    const datasets = useMemo(() => {
        return Object.entries(data).map(([gid, entries]) => {
            const days = new Array(31).fill(0);
            entries.forEach(r => {
                const d = parseDate(r.__date);
                if (d) {
                    const dayIdx = d.getDate() - 1;
                    if (dayIdx >= 0 && dayIdx < 31) days[dayIdx] += (r.__amount || 0);
                }
            });
            let cumulative = 0;
            return {
                gid,
                points: days.map(amt => { cumulative += amt; return cumulative; })
            };
        });
    }, [data]);

    const maxVal = Math.max(target, ...datasets.flatMap(d => d.points), 1);
    const W = 800, H = 220, P = 30, PL = 60;
    const getX = (day) => PL + ((day - 1) / 30) * (W - P - PL);
    const getY = (val) => (H - P) - (val / maxVal) * (H - 2 * P);

    const [hoverIdx, setHoverIdx] = useState(null);

    return (
        <div style={{ direction: 'rtl', fontFamily: FONT }}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Target size={20} className="text-blue-500" /> مسار المبيعات التراكمي
                </h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الشهر الحالي</span>
                    </div>
                </div>
            </div>

            <div className="relative group/chart" onMouseLeave={() => setHoverIdx(null)}>
                <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
                    {/* Grid */}
                    <line x1={PL} y1={H - P} x2={W - P} y2={H - P} stroke="var(--border-color)" opacity="0.5" strokeWidth="1" />
                    {[0.25, 0.5, 0.75, 1].map(p => (
                        <g key={p}>
                            <line x1={PL} y1={getY(maxVal * p)} x2={W - P} y2={getY(maxVal * p)} stroke="var(--border-color)" opacity="0.1" strokeDasharray="4 4" />
                            <text x={PL - 10} y={getY(maxVal * p)} textAnchor="end" alignmentBaseline="middle" fontSize="10" fontWeight="900" fill="var(--text-muted)">{fmt(maxVal * p)}</text>
                        </g>
                    ))}

                    {/* Target Line */}
                    <line x1={PL} y1={getY(target)} x2={W - P} y2={getY(target)} stroke={C.warning} strokeWidth="2" strokeDasharray="6 4" opacity="0.4" />
                    <text x={W - P + 5} y={getY(target)} alignmentBaseline="middle" fontSize="10" fontWeight="900" fill={C.warning}>Target {fmt(target)}</text>

                    {/* Paths */}
                    {datasets.map((d, i) => {
                        const isLast = i === datasets.length - 1;
                        if (d.points.length === 0) return null;
                        const path = `M ${getX(1)} ${getY(0)} L ` + d.points.map((v, day) => `${getX(day + 1)},${getY(v)}`).join(' ');
                        return (
                            <motion.path
                                key={d.gid}
                                d={path}
                                fill="none"
                                stroke={isLast ? '#3B82F6' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}
                                strokeWidth={isLast ? 4 : 2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, delay: i * 0.1 }}
                                style={{
                                    filter: isLast ? 'drop-shadow(0 0 8px rgba(59,130,246,0.3))' : 'none'
                                }}
                            />
                        );
                    })}

                    {/* Interactive Indicator Line */}
                    {hoverIdx !== null && (
                        <g>
                            <line 
                                x1={getX(hoverIdx + 1)} y1={P} 
                                x2={getX(hoverIdx + 1)} y2={H - P} 
                                stroke="#3B82F6" strokeWidth="2" 
                                strokeDasharray="none"
                                style={{ filter: 'drop-shadow(0 0 4px rgba(59,130,246,0.8))' }}
                            />
                            <circle 
                                cx={getX(hoverIdx + 1)} 
                                cy={getY(datasets[datasets.length-1].points[hoverIdx])} 
                                r="6" fill="#3B82F6" 
                                stroke="white" strokeWidth="2" 
                                style={{ filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.5))' }}
                            />
                        </g>
                    )}

                    {/* Hover Area Segments */}
                    {new Array(31).fill(0).map((_, i) => (
                        <rect 
                            key={i} 
                            x={getX(i+1) - 10} y={0} 
                            width={20} height={H} 
                            fill="transparent" 
                            style={{ cursor: 'crosshair' }} 
                            onMouseEnter={() => setHoverIdx(i)} 
                        />
                    ))}
                </svg>

                {hoverIdx !== null && (
                    <div className="absolute top-[-20px] pointer-events-none bg-white/90 dark:bg-slate-900/90 p-5 rounded-2xl shadow-2xl backdrop-blur-xl z-10 min-w-[200px] border border-slate-100 dark:border-white/10" 
                         style={{ 
                             left: hoverIdx > 15 ? 'auto' : `${(getX(hoverIdx + 1) / W) * 100}%`,
                             right: hoverIdx > 15 ? `${100 - (getX(hoverIdx + 1) / W) * 100}%` : 'auto',
                             transform: 'translateY(-50%)',
                             margin: '0 15px'
                         }}>
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-white/5">
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">تتبع المسار</span>
                            <span className="text-[10px] font-black text-slate-400">يوم {hoverIdx + 1} للشهر</span>
                        </div>
                        
                        {datasets.map((d, i) => {
                            const isCurrent = i === datasets.length - 1;
                            return (
                                <div key={i} className={`flex justify-between items-end gap-4 ${isCurrent ? 'mt-3 pt-3 border-t border-slate-100 dark:border-white/5' : 'mb-2 opacity-60'}`}>
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>
                                            {isCurrent ? 'الإجمالي الحالي' : 'الأداء التاريخي'}
                                        </span>
                                        <span className={`text-sm font-black transition-all ${isCurrent ? 'text-slate-900 dark:text-white text-lg scale-110 origin-left' : 'text-slate-500'}`}>
                                            {fmtSAR(d.points[hoverIdx])}
                                        </span>
                                    </div>
                                    {isCurrent && (
                                        <div className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                                            {fmtPct(d.points[hoverIdx] / target)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────────────────── FASTEST DEALS ─────────────────────────── */
export function FastestDeals({ data, isDark }) {
    const [activeTab, setActiveTab] = useState('deals');
    const C = { border: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#64748B' };

    const { deals, repStats, typeStats, globalAvg } = useMemo(() => {
        let validDeals = 0;
        let totalDays = 0;
        const repMap = {};
        const typeMap = {};

        const processedDeals = data.map(r => {
            const d1 = parseDate(r.__first_contact);
            const d2 = parseDate(r.__date);
            if (d1 && d2) {
                // Ensure date difference is strictly positive and valid
                const diffTime = d2.getTime() - d1.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 0) {
                    validDeals++;
                    totalDays += diffDays;

                    if (r.__sales) {
                        if (!repMap[r.__sales]) repMap[r.__sales] = { sum: 0, count: 0, deals: 0 };
                        repMap[r.__sales].sum += diffDays;
                        repMap[r.__sales].count++;
                        repMap[r.__sales].deals++;
                    }
                    if (r.__type) {
                        if (!typeMap[r.__type]) typeMap[r.__type] = { sum: 0, count: 0, deals: 0 };
                        typeMap[r.__type].sum += diffDays;
                        typeMap[r.__type].count++;
                        typeMap[r.__type].deals++;
                    }

                    return { ...r, __daysToClose: diffDays };
                }
            }
            return null;
        }).filter(Boolean);

        const sortedDeals = [...processedDeals].sort((a, b) => a.__daysToClose - b.__daysToClose).slice(0, 5);

        const reps = Object.entries(repMap).map(([name, stat]) => ({
            name,
            avg: stat.sum / stat.count,
            dealsCount: stat.deals
        })).sort((a, b) => a.avg - b.avg).slice(0, 5);

        const types = Object.entries(typeMap).map(([name, stat]) => ({
            name,
            avg: stat.sum / stat.count,
            dealsCount: stat.deals
        })).sort((a, b) => a.avg - b.avg).slice(0, 5);

        return {
            deals: sortedDeals,
            repStats: reps,
            typeStats: types,
            globalAvg: validDeals > 0 ? totalDays / validDeals : 0
        };
    }, [data]);

    if (deals.length < 2) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.02)' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={24} color={C.muted} opacity={0.5} />
                </div>
                <div style={{ color: C.muted, fontFamily: FONT, fontSize: 14, fontWeight: 600 }}>لا توجد بيانات كافية هذا الشهر</div>
            </div>
        );
    }

    const tabs = [
        { id: 'deals', label: 'العقود' },
        { id: 'reps', label: 'المتصدريين' },
        { id: 'types', label: 'التصنيفات' }
    ];

    const formatDays = (d) => {
        const rounded = Math.round(d);
        if (rounded === 1) return 'يوم';
        if (rounded === 2) return 'يومين';
        if (rounded <= 10) return `${rounded} أيام`;
        return `${rounded} يوم`;
    };

    return (
        <div>
            {/* Tabs Header */}
            <div style={{ display: 'flex', background: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        style={{
                            flex: 1, padding: '8px', border: 'none', borderRadius: 8,
                            background: activeTab === t.id ? (isDark ? 'rgba(79,142,247,0.2)' : 'white') : 'transparent',
                            color: activeTab === t.id ? '#4F8EF7' : C.muted,
                            fontWeight: activeTab === t.id ? 700 : 500,
                            fontSize: 13, fontFamily: FONT, cursor: 'pointer',
                            boxShadow: activeTab === t.id && !isDark ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div style={{ minHeight: 330 }}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                        {activeTab === 'deals' && deals.map((d, i) => (
                            <div key={`d-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: i === 0 ? 'rgba(245,158,11,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : '#E2E8F0'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {i === 0 ? <Trophy size={16} color="#F59E0B" /> : <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>{i + 1}</span>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: FONT }}>{d.__name}</div>
                                        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, marginTop: 3 }}>{d.__sales} {d.__type && `• ${d.__type}`}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left', minWidth: 80 }}>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981', fontFamily: FONT, letterSpacing: '-0.5px' }}>{fmtSAR(d.__amount)}</div>
                                    <div style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700, fontFamily: FONT, marginTop: 3 }}>في {formatDays(d.__daysToClose)}</div>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'reps' && repStats.map((r, i) => (
                            <div key={`r-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: i === 0 ? 'rgba(16,185,129,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : '#E2E8F0'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {i === 0 ? <Trophy size={16} color="#10B981" /> : <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>{i + 1}</span>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: FONT }}>{r.name}</div>
                                        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, marginTop: 3 }}>أغلق {r.dealsCount} عقد</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left', minWidth: 80 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#10B981' : C.text, fontFamily: FONT }}>{formatDays(r.avg)}</div>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, fontFamily: FONT, marginTop: 2 }}>كمتوسط إغلاق</div>
                                </div>
                            </div>
                        ))}

                        {activeTab === 'types' && typeStats.map((t, i) => (
                            <div key={`t-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: '10px', background: i === 0 ? 'rgba(79,142,247,0.15)' : (isDark ? 'rgba(255,255,255,0.04)' : '#E2E8F0'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Target size={18} color={i === 0 ? "#4F8EF7" : C.muted} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text, fontFamily: FONT }}>{t.name}</div>
                                        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, marginTop: 3 }}>{t.dealsCount} مشاريع مباعة</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'left', minWidth: 80 }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? '#4F8EF7' : C.text, fontFamily: FONT }}>{formatDays(t.avg)}</div>
                                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, fontFamily: FONT, marginTop: 2 }}>كمتوسط إغلاق</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, padding: '12px 16px', borderRadius: 12, background: isDark ? 'rgba(79, 142, 247, 0.05)' : '#EFF6FF', border: isDark ? '1px solid rgba(79, 142, 247, 0.1)' : 'none' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#93C5FD' : '#1E3A8A', fontFamily: FONT }}>متوسط الإغلاق التنافسي (إجمالي):</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#4F8EF7', fontFamily: FONT }}>{formatDays(globalAvg)}</span>
            </div>
        </div>
    );
}

/* ─────────────────────────── BEST DAY WIDGET ─────────────────────────── */
export function BestDayWidget({ data, isDark }) {
    const C = { border: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#64748B' };

    const bestDay = useMemo(() => {
        const days = {};
        data.forEach(r => {
            const dateStr = r.__date;
            if (!dateStr) return;
            if (!days[dateStr]) days[dateStr] = 0;
            days[dateStr] += r.__amount;
        });
        
        const sorted = Object.entries(days).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return null;
        return { date: sorted[0][0], amount: sorted[0][1] };
    }, [data]);

    if (!bestDay) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))' : 'linear-gradient(135deg, #ECFDF5, #F8FAFC)', borderRadius: 16, marginBottom: 20, fontFamily: FONT, boxShadow: '0 4px 12px rgba(16,185,129,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: isDark ? 'rgba(16,185,129,0.2)' : '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={20} color="#10B981" />
                </div>
                <div>
                    <div style={{ fontSize: 13, color: isDark ? '#A7F3D0' : '#047857', fontWeight: 700, marginBottom: 2 }}>أفضل يوم كحجم مبيعات</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{bestDay.date}</div>
                </div>
            </div>
            <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#10B981' }}>{fmtSAR(bestDay.amount)}</div>
            </div>
        </div>
    );
}

/* ─────────────────────────── CONFETTI ─────────────────────────── */
export function Confetti() {
    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
            {Array.from({ length: 50 }).map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        top: -20,
                        left: `${Math.random() * 100}%`,
                        scale: Math.random() * 0.5 + 0.5,
                        rotate: 0,
                        opacity: 1
                    }}
                    animate={{
                        top: '120%',
                        left: `${Math.random() * 100}%`,
                        rotate: 720,
                        opacity: 0
                    }}
                    transition={{
                        duration: Math.random() * 2 + 3,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 5
                    }}
                    style={{
                        position: 'absolute',
                        width: 10, height: 10,
                        background: BADGE_COLORS[i % BADGE_COLORS.length],
                        borderRadius: i % 2 === 0 ? '50%' : '0%'
                    }}
                />
            ))}
        </div>
    );
}
