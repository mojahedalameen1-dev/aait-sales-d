import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, User, X } from 'lucide-react';

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
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, background: `${color}1A`, color, border: `1px solid ${color}33`, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: FONT }}>
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
export function ProgressBar({ pct, height = 10, bg = 'rgba(148,163,184,0.1)' }) {
    const color = pct >= 100 ? '#10B981' : pct >= 60 ? '#F59E0B' : '#EF4444';
    return (
        <div style={{ width: '100%', height, background: bg, borderRadius: 999, overflow: 'hidden' }}>
            <motion.div
                initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                style={{ height: '100%', background: color, borderRadius: 999 }}
            />
        </div>
    );
}

/* ─────────────────────────── SVG DONUT ─────────────────────────── */
export function DonutChart({ data, colors, isDark }) {
    const [hovered, setHovered] = useState(null);
    const S = 220, R = 80, SW = 30, C = S / 2;
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
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
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
                <text x={C} y={C - 8} textAnchor="middle" fontSize="11" fill={isDark ? "#94A3B8" : "#64748B"} fontFamily={FONT}>الإجمالي</text>
                <text x={C} y={C + 14} textAnchor="middle" fontSize="18" fontWeight="800" fill={isDark ? "white" : "#0F172A"} fontFamily={FONT}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: colors[i % colors.length], flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: hovered === i ? (isDark ? 'white' : '#0F172A') : (isDark ? '#94A3B8' : '#64748B'), fontFamily: FONT }}>{d.name}</span>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: isDark ? '#E2E8F0' : '#334155', fontFamily: FONT }}>{d.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colors[i % colors.length], fontFamily: FONT }}>{fmtSAR(d.value)}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: 999, overflow: 'hidden' }}>
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
    const C = {
        bg: isDark ? '#0F172A' : '#ffffff', text: isDark ? '#F8FAFC' : '#0F172A', muted: isDark ? '#94A3B8' : '#64748B',
        border: isDark ? '#334155' : '#E2E8F0', overlay: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
        cardInner: isDark ? '#1E293B' : '#F8FAFC'
    };

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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: C.overlay, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: FONT }} onClick={onClose}>
            <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }}
                onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 24, padding: 32, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}`, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', direction: 'rtl' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(79, 142, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={24} color="#4F8EF7" /></div>
                        أداء: {repName}
                    </h2>
                    <button onClick={onClose} style={{ background: C.cardInner, border: `1px solid ${C.border}`, width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted }}><X size={18} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    <div style={{ background: C.cardInner, padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>الإجمالي الكلي</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>{fmtSAR(totalAllTime)}</div>
                    </div>
                    <div style={{ background: C.cardInner, padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>المتوسط الشهري</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#4F8EF7' }}>{fmtSAR(avgPerMonth)}</div>
                    </div>
                    <div style={{ background: C.cardInner, padding: 20, borderRadius: 16, border: `1px solid ${C.border}` }}>
                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>أفضل شهر</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>{bestMonth.name}</div>
                    </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>الأداء عبر الشهور المتاحة</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 12, marginBottom: 32, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
                    {repDataAcrossMonths.map((m, idx) => (
                        <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{fmt(m.total)}</div>
                            <div style={{ width: '100%', maxWidth: 40, height: `${(m.total / maxVal) * 100}px`, background: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%234F8EF7\' fill-opacity=\'0.2\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E") #4F8EF7', borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height .3s' }} />
                            <div style={{ color: C.muted, fontSize: 11, textAlign: 'center', whiteSpace: 'pre-line' }}>{m.name.replace(' 202', '\n202')}</div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}

/* ─────────────────────────── PROGRESS PROGRESS CHART ─────────────────────────── */
export function PerformanceProgressChart({ data, totalTarget, isDark, activeSheetName }) {
    const C = {
        bg: isDark ? '#0F172A' : '#F1F5F9',
        border: isDark ? '#1E293B' : '#E2E8F0',
        text: isDark ? '#F8FAFC' : '#1E293B',
        muted: isDark ? '#94A3B8' : '#64748B',
        target: '#7C3AED',
        actual: '#10B981',
        today: '#F59E0B'
    };

    const daysInMonth = 31; // Simplified for UI
    const today = new Date();
    const currentDay = today.getDate();
    const isCurrentMonth = activeSheetName?.includes(today.toLocaleDateString('ar-SA', { month: 'long' })) || false;

    // Calculate daily cumulative data
    const dailyData = useMemo(() => {
        const days = new Array(daysInMonth).fill(0);
        data.forEach(r => {
            const d = parseDate(r.__date);
            if (d) {
                const dayIdx = d.getDate() - 1;
                if (dayIdx >= 0 && dayIdx < daysInMonth) {
                    days[dayIdx] += r.__amount;
                }
            }
        });

        let cumulative = 0;
        return days.map((amt, i) => {
            cumulative += amt;
            return { day: i + 1, amount: amt, cumulative };
        });
    }, [data]);

    const maxVal = Math.max(totalTarget, ...dailyData.map(d => d.cumulative));
    const W = 600, H = 200, P = 30; // Width, Height, Padding
    const getX = (item) => P + ((item.day - 1) / (daysInMonth - 1)) * (W - 2 * P);
    const getY = (val) => (H - P) - (val / maxVal) * (H - 2 * P);

    // Paths
    const targetPath = `M ${getX({ day: 1 })} ${getY(0)} L ${getX({ day: daysInMonth })} ${getY(totalTarget)}`;
    const actualPoints = dailyData
        .filter(d => !isCurrentMonth || d.day <= currentDay)
        .map(d => `${getX(d)},${getY(d.cumulative)}`)
        .join(' ');
    const actualPath = `M ${getX({ day: 1 })} ${getY(0)} L ${actualPoints}`;

    return (
        <div style={{ direction: 'rtl', fontFamily: FONT }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 13, fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 3, background: C.target, borderRadius: 2 }} /> المستهدف التراكمي</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 3, background: C.actual, borderRadius: 2 }} /> الإنجاز الفعلي</div>
            </div>

            <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
                {/* Grid Lines */}
                <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke={C.border} strokeWidth="1" />
                <line x1={P} y1={P} x2={P} y2={H - P} stroke={C.border} strokeWidth="1" />

                {/* Target Line */}
                <path d={targetPath} fill="none" stroke={C.target} strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />

                {/* Actual Line */}
                <motion.path
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeOut" }}
                    d={actualPath} fill="none" stroke={C.actual} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                />

                {/* Today Marker */}
                {isCurrentMonth && (
                    <g>
                        <line x1={getX({ day: currentDay })} y1={P} x2={getX({ day: currentDay })} y2={H - P} stroke={C.today} strokeWidth="1" strokeDasharray="2 2" />
                        <circle cx={getX({ day: currentDay })} cy={H - P + 5} r="3" fill={C.today} />
                        <text x={getX({ day: currentDay })} y={P - 5} textAnchor="middle" fontSize="10" fill={C.today} fontWeight="700">اليوم</text>
                    </g>
                )}

                {/* Legend Days */}
                {[1, 10, 20, 31].map(d => (
                    <text key={d} x={getX({ day: d })} y={H - 10} textAnchor="middle" fontSize="10" fill={C.muted}>{d}</text>
                ))}

                {/* Labels */}
                <text x={W - P + 5} y={getY(totalTarget)} fontSize="10" fill={C.target} fontWeight="700" alignmentBaseline="middle">{fmt(totalTarget)}</text>
                <text x={P - 5} y={H - P} textAnchor="end" fontSize="10" fill={C.muted}>0</text>
            </svg>

            <div style={{ marginTop: 12, padding: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                يظهر هذا المخطط **نمو المبيعات التراكمي**. الخط المقطع يمثل المسار المثالي للوصول للهدف ({fmtSAR(totalTarget)}) بنهاية الشهر.
            </div>
        </div>
    );
}

/* ─────────────────────────── FASTEST DEALS ─────────────────────────── */
export function FastestDeals({ data, isDark }) {
    const C = { border: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#64748B' };

    const deals = useMemo(() => {
        return data.map(r => {
            const d1 = parseDate(r['تاريخ أول تواصل']);
            const d2 = parseDate(r.__date);
            if (d1 && d2) {
                const diffTime = Math.abs(d2 - d1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...r, __daysToClose: diffDays };
            }
            return null;
        }).filter(Boolean).sort((a, b) => a.__daysToClose - b.__daysToClose).slice(0, 5);
    }, [data]);

    const avg = deals.length ? deals.reduce((s, d) => s + d.__daysToClose, 0) / deals.length : 0;
    if (!deals.length) return <p style={{ color: C.muted, textAlign: 'center', padding: '24px 0', fontFamily: FONT }}>لا توفر تواريخ كافية للحساب</p>;

    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deals.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderRadius: 12, border: `1px solid ${C.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? 'rgba(245,158,11,0.2)' : (isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i === 0 ? <Trophy size={16} color="#F59E0B" /> : <span style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>{i + 1}</span>}
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: FONT }}>{d.__name}</div>
                                <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, marginTop: 2 }}>{d.__sales} • {d.__type}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#10B981', fontFamily: FONT }}>{fmtSAR(d.__amount)}</div>
                            <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT, marginTop: 2 }}>في {d.__daysToClose} أيام</div>
                        </div>
                    </div>
                ))}
            </div>
            {deals.length > 0 && <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: C.muted, fontFamily: FONT }}>متوسط الإغلاق في هذه القائمة: {Math.round(avg)} يوم</div>}
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
