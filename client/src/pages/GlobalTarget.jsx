import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, RefreshCw, AlertCircle, Search, ChevronUp, ChevronDown,
    ChevronLeft, ChevronRight, Trophy, User, TrendingUp, DollarSign,
    FileText, Briefcase, Filter, X, Calendar, Clock, BarChart2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';

// Import components and utils
import {
    FONT, fmt, fmtSAR, fmtPct, MEDAL, parseDate,
    AnimatedNumber, ProgressBar, DonutChart, BarChart, Badge,
    RepModal, PerformanceProgressChart, FastestDeals, getBadgeColor, Confetti, BestDayWidget
} from './GlobalTargetComponents';

/* ─────────────────────────── CONSTANTS ─────────────────────────── */
const GLOBAL_TARGET = 575000;
const REP_TARGET = 115000;
const PAGE_SIZE = 12;

const MAIN_PUB_URL = 'https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vThOI_pq9C9-AVOqH7vVkNhoe834Op3bMkUnvmF1A7w7AYcy_COHveU-do-wbECug/pubhtml';

/* ─────────────────────────── MAIN COMPONENT ─────────────────────────── */
export default function GlobalTarget() {
    const { isDark } = useTheme();
    const { addToast } = useToast();

    // The single source of truth for all colors
    const C = isDark
        ? { bg: '#080E1B', card: 'rgba(255,255,255,0.025)', border: 'rgba(255,255,255,0.07)', text: '#F0F4FF', muted: '#7A869A', inputBg: 'rgba(255,255,255,0.04)', glow: 'rgba(79,142,247,0.1)' }
        : { bg: '#F8FAFC', card: '#F1F5F9', border: '#E2E8F0', text: '#1E293B', muted: '#475569', inputBg: '#FFFFFF', glow: 'rgba(79,142,247,0.08)' };

    /* ── state ── */
    const [sheets, setSheets] = useState([]);
    const [activeGid, setActiveGid] = useState(null);

    // Core data (Current Tab)
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    // Historic Data for MoM & Modal (cached by Gid)
    const [historicData, setHistoricData] = useState({});

    // Filter state
    const [search, setSearch] = useState('');
    const [filterSales, setFilterSales] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDate, setFilterDate] = useState(null);
    const [sortCol, setSortCol] = useState('المبلغ');
    const [sortDir, setSortDir] = useState('desc');
    const [page, setPage] = useState(1);

    // Modal
    const [selectedRep, setSelectedRep] = useState(null);

    // Source Chart Toggle
    const [sourceMode, setSourceMode] = useState('value'); // 'value' | 'count'

    /* ── FETCHING LOGIC ── */
    const fetchSheet = useCallback(async (gid, isBackground = false) => {
        if (!isBackground) { setRefreshing(true); setError(null); }
        try {
            const url = `https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vThOI_pq9C9-AVOqH7vVkNhoe834Op3bMkUnvmF1A7w7AYcy_COHveU-do-wbECug/pubhtml/sheet?pli=1&headers=false&gid=${gid}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('فشل الاتصال بمصدر البيانات');
            const html = await res.text();

            const doc = new DOMParser().parseFromString(html, 'text/html');
            const rows = Array.from(doc.querySelectorAll('tbody tr'));
            if (!rows.length) throw new Error('لم يتم العثور على بيانات في هذا الشيت');

            const getCellText = (td) => {
                const h = td.innerHTML.replace(/<br\s*\/?>/gi, ' ');
                const t = document.createElement('div'); t.innerHTML = h;
                return t.textContent.trim().replace(/\s+/g, ' ');
            };

            let headerIdx = -1, headers = [];
            for (let i = 0; i < Math.min(rows.length, 20); i++) {
                const cells = Array.from(rows[i].querySelectorAll('td')).map(getCellText);
                if (cells.includes('م') && (cells.includes('اسم العميل حسب العقد') || cells.includes('اسم العميل'))) {
                    headerIdx = i; headers = cells; break;
                }
            }
            if (headerIdx === -1) throw new Error('لم يتم العثور على هيكل الجدول الصحيح');

            // Dynamic detection of keys
            const prioKey = (keys, prioritizedNeedles) => {
                // First pass: look for exact matches
                for (const needle of prioritizedNeedles) {
                    const exact = keys.find(k => k.trim() === needle);
                    if (exact) return exact;
                }
                // Second pass: look for partial matches in order of priority
                for (const needle of prioritizedNeedles) {
                    const partial = keys.find(k => k.includes(needle));
                    if (partial) return partial;
                }
                return null;
            };

            let excludedCount = 0;
            const parsedRows = [];
            for (let i = headerIdx + 1; i < rows.length; i++) {
                const cells = Array.from(rows[i].querySelectorAll('td')).map(getCellText);

                // Exclude mostly empty rows (> 70% empty)
                const emptyCellsCount = cells.filter(c => !c).length;
                if (emptyCellsCount / cells.length > 0.7) {
                    excludedCount++;
                    continue;
                }

                // Check Column M
                const colMIndex = headers.findIndex(h => h.trim() === 'م');
                const valM = colMIndex !== -1 ? cells[colMIndex]?.trim() : '';
                
                // Valid M column must be a number (protects against totals and empty rows)
                if (!valM || !/^\d+$/.test(valM)) {
                    excludedCount++;
                    continue;
                }

                const row = {};
                headers.forEach((h, idx) => { if (h) row[h] = cells[idx] || ''; });

                const keys = Object.keys(row);
                const nameKey = prioKey(keys, ['اسم العميل حسب العقد', 'اسم العميل']);
                const name = row[nameKey]?.trim() || '';

                if (!name || /(^|\s)(المجموع|الإجمالي|اجمالي|مجموع|total)(\s|$)/i.test(name)) {
                    excludedCount++;
                    continue;
                }

                const amountKey = prioKey(keys, ['المبلغ', 'الدفع الاولى']);
                const netAmountKey = prioKey(keys, ['صافي المبلغ', 'صافي']);

                const grossAmount = parseFloat((row[amountKey] || '0').replace(/[^\d.-]/g, '')) || 0;
                let netAmount = parseFloat((row[netAmountKey] || '0').replace(/[^\d.-]/g, '')) || 0;
                if (!netAmount && grossAmount) {
                    netAmount = grossAmount / 1.15;
                }

                if (grossAmount === 0 && netAmount === 0) continue;

                parsedRows.push({
                    '__name': name,
                    '__amount': grossAmount,
                    '__net_amount': netAmount,
                    '__source': row[prioKey(keys, ['المصدر'])] || '',
                    '__type': row[prioKey(keys, ['نوع المشروع'])] || '',
                    '__sales': row[prioKey(keys, ['مطور اعمال', 'المبيعات'])] || '',
                    '__team': row[prioKey(keys, ['الفريق'])] || '',
                    '__date': row[prioKey(keys, ['تاريخ التحويل', 'تاريخ الدفعة', 'تاريخ'])] || '',
                    '__phone': row[prioKey(keys, ['الجوال', 'رقم'])] || '',
                    '__first_contact': row[prioKey(keys, ['تاريخ أول تواصل', 'اول تواصل'])] || '',
                    ...row
                });
            }

            // Exclude outliers (> 3 * average amount)
            let finalRows = parsedRows;
            if (parsedRows.length > 0) {
                const totalAmt = parsedRows.reduce((sum, r) => sum + r.__amount, 0);
                const avgAmt = totalAmt / parsedRows.length;
                const outlierLimit = avgAmt * 3;
                finalRows = parsedRows.filter(r => r.__amount <= outlierLimit);
            }

            if (!isBackground) {
                setAllData(finalRows);
                addToast('success', `تم تحميل ${finalRows.length} عقد بنجاح`);
            }
            return finalRows;
        } catch (e) {
            console.error(e);
            if (!isBackground) { setError(e.message); setAllData([]); addToast('error', 'تعذّر تحميل البيانات'); }
            return [];
        } finally {
            if (!isBackground) { setLoading(false); setRefreshing(false); }
        }
    }, [addToast]);

    // Discovery + Initial load
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Discover Sheets (Tabs) using regex because they are injected via JS
                const res = await fetch(MAIN_PUB_URL);
                const html = await res.text();

                const tabs = [];
                const regex = /\{name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]+",\s*gid:\s*"(\d+)"/g;
                let match;
                while ((match = regex.exec(html)) !== null) {
                    const tabName = match[1].trim();
                    // Exclude non-data tabs (reports, summaries, commissions)
                    if (!['تقرير', 'ملخص', 'عمولات'].some(word => tabName.includes(word))) {
                        tabs.push({ name: tabName, gid: match[2] });
                    }
                }

                if (tabs.length > 0) {

                    setSheets(tabs);
                    const last = tabs[tabs.length - 1].gid;
                    setActiveGid(last);
                } else {
                    throw new Error('لم يتم العثور على أوراق بيانات');
                }
            } catch (e) {
                console.error(e);
                setError('فشل جلب قائمة الشهور');
                setLoading(false);
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (!activeGid) return;
        setLoading(true);
        setSearch(''); setFilterSales(''); setFilterSource(''); setFilterType(''); setFilterDate(null); setPage(1);

        fetchSheet(activeGid).then(data => {
            setHistoricData(prev => ({ ...prev, [activeGid]: data }));

            // Prefetch others for MoM
            sheets.forEach(s => {
                if (s.gid !== activeGid && !historicData[s.gid]) {
                    fetchSheet(s.gid, true).then(d => setHistoricData(prev => ({ ...prev, [s.gid]: d })));
                }
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeGid, sheets]);

    /* ── derived state ── */
    const uniqueSales = useMemo(() => Array.from(new Set(allData.map(d => d.__sales).filter(Boolean))).sort(), [allData]);
    const uniqueSources = useMemo(() => Array.from(new Set(allData.map(d => d.__source).filter(Boolean))).sort(), [allData]);
    const uniqueTypes = useMemo(() => Array.from(new Set(allData.map(d => d.__type).filter(Boolean))).sort(), [allData]);

    const filtered = useMemo(() => {
        let d = allData;
        if (search) {
            const q = search.toLowerCase();
            d = d.filter(r => r.__name.toLowerCase().includes(q) || r.__phone.includes(q) || r.__sales.toLowerCase().includes(q));
        }
        if (filterSales) d = d.filter(r => r.__sales === filterSales);
        if (filterSource) d = d.filter(r => r.__source === filterSource);
        if (filterType) d = d.filter(r => r.__type === filterType);
        if (filterDate) d = d.filter(r => r.__date === filterDate);
        return [...d].sort((a, b) => {
            let va = a[sortCol === 'المبلغ' ? '__amount' : '__date'] || '';
            let vb = b[sortCol === 'المبلغ' ? '__amount' : '__date'] || '';
            if (sortCol === 'المبلغ') { va = Number(va); vb = Number(vb); }
            return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
        });
    }, [allData, search, filterSales, filterSource, filterType, filterDate, sortCol, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('desc'); }
        setPage(1);
    };

    /* ── KPIs & Forecast ── */
    const activeSheetDef = sheets.find(s => s.gid === activeGid);
    const isCurrentMonth = activeSheetDef?.gid === sheets[sheets.length - 1]?.gid; // Dynamically newest month

    const totalAmount = useMemo(() => allData.reduce((s, r) => s + (r.__net_amount || 0), 0), [allData]);
    const totalGrossAmount = useMemo(() => allData.reduce((s, r) => s + (r.__amount || 0), 0), [allData]);
    const achievementPct = (totalAmount / GLOBAL_TARGET) * 100;
    const remaining = Math.max(0, GLOBAL_TARGET - totalAmount);

    let forecast = null;
    let daysElapsed = 0;
    let daysInMonth = 30;
    let historicalAvgRatio = 0;
    let historicalAvgExpectedAmount = 0;
    let momGapPct = 0;
    let momHtml = null;

    const currIdx = sheets.findIndex(s => s.gid === activeGid);

    if (isCurrentMonth) {
        const today = new Date();
        daysElapsed = today.getDate();
        daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        
        let validPastMonthsCount = 0;
        let sumPastUpToDay = 0;
        let sumPastTotals = 0;
        let pastMonthsNames = [];

        // Calculate True Historical Averages
        if (currIdx > 0) {
            for (let j = 0; j < currIdx; j++) {
                const pSheet = sheets[j];
                const pData = historicData[pSheet.gid];
                if (pData && pData.length > 0) {
                    let pUpToDay = 0;
                    let pTotal = 0;
                    pData.forEach(r => {
                        const amt = r.__net_amount || (r.__amount / 1.15) || 0;
                        pTotal += amt;
                        const d = parseDate(r.__date);
                        if (d && d.getDate() <= daysElapsed) {
                            pUpToDay += amt;
                        }
                    });
                    
                    sumPastUpToDay += pUpToDay;
                    sumPastTotals += pTotal;
                    validPastMonthsCount++;
                    pastMonthsNames.push(pSheet.name);
                }
            }
        }

        let projected = 0;
        let usedHistorical = false;

        if (validPastMonthsCount > 0 && sumPastUpToDay > 0) {
            const historicalAvgUpToDay = sumPastUpToDay / validPastMonthsCount;
            const historicalAvgTotal = sumPastTotals / validPastMonthsCount;
            
            if (daysElapsed >= 4) { // Give it at least 4 days to be meaningful
                const performanceRatio = totalAmount / historicalAvgUpToDay;
                projected = performanceRatio * historicalAvgTotal;
                usedHistorical = true;
            }
        }

        // Fallback or early days simple average
        const dailyAvg = totalAmount / Math.max(1, daysElapsed);
        if (!usedHistorical) {
            projected = dailyAvg * daysInMonth;
        }

        // Expose historical avg up to today
        const histAvgUpToDay = (validPastMonthsCount > 0 && sumPastUpToDay > 0) ? (sumPastUpToDay / validPastMonthsCount) : 0;

        forecast = { 
            projected, 
            usedHistorical, 
            daysElapsed, 
            daysInMonth, 
            dailyAvg,
            histAvgUpToDay,
            pastMonthsNames: pastMonthsNames.slice(-2).join(' و ')
        };

        // Apples-to-Apples MoM Comparison
        if (currIdx > 0) {
            const prevSheet = sheets[currIdx - 1];
            const prevData = historicData[prevSheet.gid];
            if (prevData) {
                let prevUpToDay = 0;
                prevData.forEach(r => {
                    const d = parseDate(r.__date);
                    if (d && d.getDate() <= daysElapsed) {
                        prevUpToDay += (r.__net_amount || 0);
                    }
                });

                if (prevUpToDay > 0) {
                    const diff = totalAmount - prevUpToDay;
                    momGapPct = (diff / prevUpToDay) * 100;
                    const color = momGapPct >= 0 ? '#10B981' : '#EF4444';
                    momHtml = (
                        <span style={{ fontSize: 13, fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
                            {momGapPct >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'scaleY(-1)' }} />}
                            {Math.abs(momGapPct).toFixed(1)}% {momGapPct >= 0 ? 'ارتفاع' : 'انخفاض'} عن نفس الفترة في {prevSheet.name.replace(' 2026', '')} (بالصافي)
                        </span>
                    );
                }
            }
        }
    }

    /* ── Leaderboards (BDRs vs Teams) ── */
    const { bdrLeaderboard, teamLeaderboard } = useMemo(() => {
        const bdrSums = {};
        const teamSums = {};

        allData.forEach(r => {
            if (r.__sales) {
                bdrSums[r.__sales] = (bdrSums[r.__sales] || 0) + r.__amount;
            }
            if (r.__team && r.__team !== r.__sales) {
                teamSums[r.__team] = (teamSums[r.__team] || 0) + r.__amount;
            }
        });

        return {
            bdrLeaderboard: Object.entries(bdrSums).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),
            teamLeaderboard: Object.entries(teamSums).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total)
        };
    }, [allData]);

    const motivationalPhrase = useMemo(() => {
        if (!isCurrentMonth) {
            if (achievementPct >= 100) return `🎯 تم تحقيق تارقت المكتب لهذا الشهر!`;
            return `انتهى الشهر بتحقيق ${fmtPct(achievementPct)} من الهدف.`;
        }

        // Priority 1
        if (achievementPct >= 100) return "🎯 تم تحقيق تارقت المكتب لهذا الشهر!";

        // Priority 2
        if (momGapPct > 10) return `↑ أداؤكم أعلى بـ ${fmtPct(momGapPct)} من معدلكم التاريخي — استمروا!`;

        // Priority 3
        const daysLeft = daysInMonth - daysElapsed;
        if (daysLeft < 10 && remaining > (GLOBAL_TARGET * 0.3)) {
            return `⚠️ متبقي ${fmtSAR(remaining)} في ${daysLeft} يوم فقط`;
        }

        // Priority 4
        const histDayAvg = forecast?.histAvgUpToDay > 0 ? forecast.histAvgUpToDay : forecast?.dailyAvg * daysElapsed;
        return `متوسطكم التاريخي لهذا اليوم ${fmtSAR(histDayAvg)} — المتوقع بنهاية الشهر ${fmtSAR(forecast?.projected || 0)}`;

    }, [achievementPct, isCurrentMonth, momGapPct, daysElapsed, daysInMonth, remaining, forecast]);

    /* ── Charts Data ── */
    const chartData = useMemo(() => {
        let d = allData;
        if (filterSales) d = d.filter(r => r.__sales === filterSales);
        if (filterSource) d = d.filter(r => r.__source === filterSource);
        if (filterType) d = d.filter(r => r.__type === filterType);

        const sourceMap = {}, typeMap = {};
        d.forEach(r => {
            if (r.__source) {
                if (!sourceMap[r.__source]) sourceMap[r.__source] = { count: 0, value: 0 };
                sourceMap[r.__source].count += 1;
                sourceMap[r.__source].value += r.__amount;
            }
            if (r.__type) {
                if (!typeMap[r.__type]) typeMap[r.__type] = 0;
                typeMap[r.__type] += r.__amount;
            }
        });

        const sources = Object.entries(sourceMap).map(([name, obj]) => ({ name, count: obj.count, value: obj.value }));
        const sourcesRender = sources.map(s => ({ name: s.name, value: sourceMode === 'value' ? s.value : s.count })).sort((a, b) => b.value - a.value);

        const types = Object.entries(typeMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        let insight = "";
        if (sources.length > 0) {
            const byVal = [...sources].sort((a, b) => b.value - a.value);
            const topVal = byVal[0];
            const avg = topVal.count > 0 ? Math.round(topVal.value / topVal.count) : 0;
            insight = `المصدر الأعلى قيمةً هو **${topVal.name}** بمتوسط ${fmtSAR(avg)} لكل عقد.`;
        }

        return { sources: sourcesRender, types, insight };
    }, [allData, filterSales, filterSource, filterType, sourceMode]);

    const donutColors = ['#4F8EF7', '#10B981', '#F59E0B', '#7C3AED', '#EC4899', '#6366F1'];
    const barColors = ['#7C3AED', '#EC4899', '#F59E0B', '#10B981', '#4F8EF7', '#6366F1'];

    /* ── UI Helpers ── */
    const SortIcon = ({ col }) => col === sortCol
        ? (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
        : <ChevronUp size={14} style={{ opacity: 0.2 }} />;

    const inputStyle = { background: C.inputBg, border: `1px solid ${C.border}`, color: C.text, padding: '9px 16px', borderRadius: 10, outline: 'none', fontFamily: FONT, fontSize: 14, width: '100%' };
    const selectStyle = { ...inputStyle, cursor: 'pointer' };
    const clearFilters = () => { setSearch(''); setFilterSales(''); setFilterSource(''); setFilterType(''); setFilterDate(null); setPage(1); };
    const hasFilters = search || filterSales || filterSource || filterType || filterDate;

    /* ── Loading ── */
    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, fontFamily: FONT }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}>
                <div style={{ width: 48, height: 48, border: '4px solid rgba(79,142,247,0.15)', borderTopColor: '#4F8EF7', borderRadius: '50%' }} />
            </motion.div>
            <p style={{ color: C.muted, fontWeight: 500 }}>جاري تحميل البيانات...</p>
        </div>
    );

    return (
        <div style={{ padding: '28px', direction: 'rtl', minHeight: '100vh', background: C.bg, fontFamily: FONT, color: C.text }}>
            {achievementPct >= 100 && <Confetti />}

            {selectedRep && (
                <RepModal repName={selectedRep} onClose={() => setSelectedRep(null)} allMonthsData={Object.entries(historicData).map(([gid, data]) => ({ name: sheets.find(s => s.gid === gid)?.name, data }))} isDark={isDark} />
            )}

            {/* ── HEADER ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ background: C.glow, padding: '10px', borderRadius: 14, display: 'inline-flex' }}><Target size={30} color="#7C3AED" /></span>
                        التارقت العام للشركة
                    </h1>
                    <p style={{ color: C.muted, marginTop: 8, fontSize: 15 }}>الهدف المالي والمنافسة الإجمالية — الهدف الشهري: <strong style={{ color: '#7C3AED' }}>575,000 ر.س</strong></p>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button onClick={() => fetchSheet(activeGid)} disabled={refreshing} style={{
                        display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', color: 'white',
                        padding: '11px 22px', borderRadius: 12, border: 'none', cursor: refreshing ? 'not-allowed' : 'pointer',
                        fontWeight: 700, fontSize: 15, boxShadow: isDark ? '0 6px 20px rgba(79,142,247,.3)' : '0 4px 14px rgba(79,142,247,.4)', opacity: refreshing ? .7 : 1, fontFamily: FONT, transition: 'opacity .2s'
                    }}>
                        <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ repeat: refreshing ? Infinity : 0, duration: 1 }}><RefreshCw size={17} /></motion.div>
                        تحديث البيانات
                    </button>
                </div>
            </div>

            {/* ── SHEET TABS ── */}
            <div style={{ display: 'flex', overflowX: 'auto', gap: 10, paddingBottom: 16, marginBottom: 28, scrollbarWidth: 'none' }}>
                {sheets.map(s => {
                    const active = activeGid === s.gid;
                    return (
                        <button key={s.gid} onClick={() => setActiveGid(s.gid)} style={{
                            padding: '10px 18px', borderRadius: 12, whiteSpace: 'nowrap',
                            background: active ? (isDark ? 'rgba(79,142,247,.12)' : '#EFF6FF') : C.card,
                            border: `1px solid ${active ? '#4F8EF7' : C.border}`,
                            color: active ? '#4F8EF7' : C.muted,
                            fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: FONT, fontSize: 14, transition: 'all .2s',
                            boxShadow: active ? '0 4px 12px rgba(79,142,247,.1)' : 'none'
                        }}>{s.name}</button>
                    );
                })}
            </div>

            {error && (
                <div style={{ background: isDark ? 'rgba(239,68,68,.1)' : '#FEF2F2', border: `1px solid ${isDark ? 'rgba(239,68,68,.3)' : '#FECACA'}`, color: '#EF4444', padding: '16px 24px', borderRadius: 16, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <AlertCircle size={22} /> <span style={{ fontWeight: 600 }}>{error}</span>
                </div>
            )}

            <AnimatePresence mode="wait">
                <motion.div key={activeGid} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>

                    {/* ── ALERTS ROW ── */}
                    <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                        <div style={{ flex: 2, minWidth: 300, background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', borderRadius: 20, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20, color: 'white', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', right: -10, top: -10, opacity: 0.1 }}><Target size={120} /></div>
                            <div style={{ zIndex: 1, width: '100%' }}>
                                <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.4 }}>{motivationalPhrase}</div>
                            </div>
                        </div>

                        {isCurrentMonth && forecast && (
                            <div style={{ flex: 1, minWidth: 300, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 14, background: forecast.projected >= GLOBAL_TARGET ? (isDark ? 'rgba(16,185,129,.1)' : '#D1FAE5') : (isDark ? 'rgba(245,158,11,.1)' : '#FEF3C7'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Clock size={22} color={forecast.projected >= GLOBAL_TARGET ? '#10B981' : '#F59E0B'} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0', color: C.text }}>التوقع الذكي لنهاية الشهر</h3>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: forecast.projected >= GLOBAL_TARGET ? '#10B981' : '#F59E0B', marginTop: 2 }}>
                                            <AnimatedNumber target={forecast.projected} formatter={fmtSAR} />
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC', padding: 12, borderRadius: 10 }}>
                                    {forecast.usedHistorical ? (
                                        <>بناءً على <b>{forecast.daysElapsed}</b> يوم من أصل <b>{forecast.daysInMonth}</b> يوم — مستند على بيانات <b>{forecast.pastMonthsNames}</b>.</>
                                    ) : forecast.daysElapsed >= 7 ? (
                                        <>بناءً على متوسط يومي بسيط لعدم توفر بيانات تاريخية كافية.</>
                                    ) : (
                                        <>يعتمد على متوسط يومي لأن الشهر لم يتجاوز أسبوعه الأول بعد.</>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── HERO TARGET CARD ── */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32, marginBottom: 28, boxShadow: isDark ? 'none' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                            <div>
                                <div style={{ color: C.muted, fontSize: 15, marginBottom: 6 }}>الهدف الشهري الإجمالي</div>
                                <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-1px', color: C.text }}>
                                    <AnimatedNumber target={totalAmount} formatter={fmtSAR} />
                                </div>
                                <div style={{ color: C.muted, fontSize: 14, marginTop: 4 }}>
                                    من أصل <span style={{ color: '#7C3AED', fontWeight: 700 }}>{fmt(GLOBAL_TARGET)}</span> • {momHtml}
                                </div>
                            </div>
                            <div style={{ textAlign: 'center', background: isDark ? 'rgba(255,255,255,.02)' : '#F8FAFC', padding: '16px 32px', borderRadius: 20, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 48, fontWeight: 900, color: achievementPct >= 100 ? '#10B981' : achievementPct >= 60 ? '#F59E0B' : '#EF4444' }}>
                                    <AnimatedNumber target={achievementPct} formatter={v => fmtPct(v)} />
                                </div>
                                <div style={{ color: C.muted, fontSize: 14, fontWeight: 600 }}>نسبة الإنجاز</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: remaining === 0 ? '#10B981' : C.text }}>
                                    <AnimatedNumber target={remaining} formatter={fmtSAR} />
                                </div>
                                <div style={{ color: C.muted, fontSize: 14 }}>المتبقي لإكمال الهدف</div>
                            </div>
                        </div>
                        <ProgressBar pct={achievementPct} height={16} bg={isDark ? 'rgba(255,255,255,.06)' : '#E2E8F0'} />
                    </div>

                    {/* ── KPI MINI-CARDS ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                        {[
                            { icon: <DollarSign size={22} color="#10B981" />, bg: isDark ? 'rgba(16,185,129,.1)' : '#D1FAE5', label: 'صافي المبيعات', val: totalAmount, fmt: fmtSAR },
                            { icon: <TrendingUp size={22} color="#F59E0B" />, bg: isDark ? 'rgba(245,158,11,.1)' : '#FEF3C7', label: 'المبيعات الشاملة (للفرق)', val: totalGrossAmount, fmt: fmtSAR },
                            { icon: <Briefcase size={22} color="#4F8EF7" />, bg: isDark ? 'rgba(79,142,247,.1)' : '#EFF6FF', label: 'إجمالي العقود', val: allData.length, fmt: v => fmt(Math.round(v)) },
                            { icon: <User size={22} color="#7C3AED" />, bg: isDark ? 'rgba(124,58,237,.1)' : '#F3E8FF', label: 'المندوبين النشطين', val: uniqueSales.length, fmt: v => fmt(Math.round(v)) },
                        ].map((k, i) => (
                            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 14, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{k.icon}</div>
                                    <div>
                                        <div style={{ color: C.muted, fontSize: 13, marginBottom: 4 }}>{k.label}</div>
                                        <div style={{ fontSize: 24, fontWeight: 800 }}><AnimatedNumber target={k.val} formatter={k.fmt} /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── ROW: LEADERBOARD & HEATMAP ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 28 }}>
                        {/* Leaderboards Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* BDR Leaderboard */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 28, flex: 1 }}>
                                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Trophy size={22} color="#F59E0B" /> مبيعات مطوري الأعمال
                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginRight: 'auto', background: isDark ? 'rgba(255,255,255,.05)' : '#F1F5F9', padding: '4px 10px', borderRadius: 8 }}>الهدف الفردي: 115k</span>
                                </h3>
                                {bdrLeaderboard.length === 0 ? <p style={{ color: C.muted, textAlign: 'center' }}>لا توجد عقود بعد</p> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {bdrLeaderboard.map((rep, i) => {
                                            const activeDaysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
                                            const pct = (rep.total / REP_TARGET) * 100;
                                            const needsAlert = isCurrentMonth && activeDaysLeft <= 10 && pct < 40;
                                            const hitTarget = pct >= 100;
                                            return (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ fontSize: 26, width: 32, textAlign: 'center', flexShrink: 0 }}>{MEDAL[i] || <span style={{ fontSize: 16, color: C.muted, fontWeight: 800 }}>{i + 1}</span>}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <button onClick={() => setSelectedRep(rep.name)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, fontWeight: 700, fontSize: 16, color: C.text, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'textDecorationColor .2s' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = C.text} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>{rep.name}</button>
                                                                {hitTarget && <span title="حقق الهدف" style={{ fontSize: 16 }}>🎯</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                                <span style={{ fontSize: 15, color: hitTarget ? '#10B981' : C.text, fontWeight: 700 }}>
                                                                    {fmtSAR(rep.total)} <span style={{ fontSize: 13, opacity: .7 }}>({fmtPct(pct)})</span>
                                                                </span>
                                                                {needsAlert && (
                                                                    <span style={{ fontSize: 11, background: isDark ? 'rgba(239,68,68,.1)' : '#FEF2F2', color: '#EF4444', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>
                                                                        ⚠️ يحتاج {fmt(REP_TARGET - rep.total)} في {activeDaysLeft} يوم
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ProgressBar pct={pct} height={8} bg={isDark ? 'rgba(255,255,255,.05)' : '#E2E8F0'} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Teams Leaderboard */}
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 28, flex: 1 }}>
                                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <User size={22} color="#7C3AED" /> مبيعات الفِرق
                                </h3>
                                {teamLeaderboard.length === 0 ? <p style={{ color: C.muted, textAlign: 'center' }}>لا توجد عقود لفرق المبيعات</p> : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {teamLeaderboard.map((rep, i) => {
                                            const pct = (rep.total / (REP_TARGET * 3)) * 100;
                                            return (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ fontSize: 26, width: 32, textAlign: 'center', flexShrink: 0 }}>{MEDAL[i] || <span style={{ fontSize: 16, color: C.muted, fontWeight: 800 }}>{i + 1}</span>}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <button onClick={() => setSelectedRep(rep.name)} style={{ background: 'none', border: 'none', padding: 0, margin: 0, fontWeight: 700, fontSize: 16, color: C.text, cursor: 'pointer', fontFamily: FONT, textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'textDecorationColor .2s' }} onMouseEnter={e => e.currentTarget.style.textDecorationColor = C.text} onMouseLeave={e => e.currentTarget.style.textDecorationColor = 'transparent'}>{rep.name}</button>
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                                <span style={{ fontSize: 15, color: C.text, fontWeight: 700 }}>
                                                                    {fmtSAR(rep.total)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ProgressBar pct={Math.min(pct, 100)} height={8} bg={isDark ? 'rgba(255,255,255,.05)' : '#E2E8F0'} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mixed Column: Chart + Fastest Deals */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 24, flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><TrendingUp size={20} color="#10B981" /> مسار تحقيق الهدف - {activeSheetDef?.name}</h3>
                                </div>
                                <PerformanceProgressChart currentData={allData} allMonthsData={sheets.map(s => ({ name: s.name, data: historicData[s.gid] || [] }))} totalTarget={GLOBAL_TARGET} isDark={isDark} activeSheetName={activeSheetDef?.name} />
                            </div>
                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 24, flex: 1 }}>
                                <BestDayWidget data={allData} isDark={isDark} />
                                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={20} color="#F59E0B" /> أسرع العقود إغلاقاً</h3>
                                <FastestDeals data={allData} isDark={isDark} />
                            </div>
                        </div>
                    </div>

                    {/* ── ANALYTICS ROW ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, marginBottom: 28 }}>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 28 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} color="#4F8EF7" /> تحليل المصادر</h3>
                                <div style={{ display: 'flex', background: isDark ? 'rgba(255,255,255,.05)' : '#F1F5F9', borderRadius: 8, padding: 4 }}>
                                    <button onClick={() => setSourceMode('value')} style={{ background: sourceMode === 'value' ? '#4F8EF7' : 'transparent', color: sourceMode === 'value' ? 'white' : C.muted, border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>قيمة</button>
                                    <button onClick={() => setSourceMode('count')} style={{ background: sourceMode === 'count' ? '#4F8EF7' : 'transparent', color: sourceMode === 'count' ? 'white' : C.muted, border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}>عدد</button>
                                </div>
                            </div>
                            {chartData.sources.length > 0
                                ? (
                                    <>
                                        <DonutChart data={chartData.sources} colors={donutColors} isDark={isDark} />
                                        {sourceMode === 'value' && chartData.insight && <div style={{ marginTop: 20, padding: 12, background: isDark ? 'rgba(79,142,247,.05)' : '#EFF6FF', borderRadius: 8, color: isDark ? '#93C5FD' : '#1E3A8A', fontSize: 13, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: chartData.insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
                                    </>
                                ) : <p style={{ color: C.muted, textAlign: 'center', padding: '24px 0' }}>لا توجد بيانات</p>}
                        </div>
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 28 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart2 size={20} color="#7C3AED" /> أنواع المشاريع والقيمة</h3>
                            {chartData.types.length > 0
                                ? <BarChart data={chartData.types} colors={barColors} isDark={isDark} />
                                : <p style={{ color: C.muted, textAlign: 'center', padding: '24px 0' }}>لا توجد بيانات</p>}
                        </div>
                    </div>

                    {/* ── ADVANCED DATA GRID ── */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 24, padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>جدول العقود الشامل</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: C.muted, fontSize: 14 }}>{filtered.length} نتيجة</span>
                                    {hasFilters && <button onClick={clearFilters} style={{ color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}><X size={14} /> مسح الفلاتر</button>}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} color={C.muted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <input type="text" placeholder="بحث باسم العميل، جوال..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ ...inputStyle, paddingRight: 38 }} />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Filter size={15} color={C.muted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <select value={filterSales} onChange={e => { setFilterSales(e.target.value); setPage(1); }} style={{ ...selectStyle, paddingRight: 36 }}>
                                        <option value="">تصفية بالمندوب - الكل</option>
                                        {uniqueSales.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Filter size={15} color={C.muted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }} style={{ ...selectStyle, paddingRight: 36 }}>
                                        <option value="">تصفية بالمصدر - الكل</option>
                                        {uniqueSources.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <Filter size={15} color={C.muted} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} style={{ ...selectStyle, paddingRight: 36 }}>
                                        <option value="">نوع المشروع - الكل</option>
                                        {uniqueTypes.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontFamily: FONT, fontSize: 14 }}>
                                <thead>
                                    <tr style={{ background: isDark ? 'rgba(255,255,255,.02)' : '#F8FAFC', borderBottom: `2px solid ${C.border}` }}>
                                        {['#', 'اسم العميل', 'المصدر', 'نوع المشروع', 'المبيعات', 'تاريخ التحويل', 'المبلغ'].map((col, i) => {
                                            const sortable = col === 'المبلغ' || col === 'تاريخ التحويل';
                                            return (
                                                <th key={i} onClick={() => sortable && handleSort(col === 'المبلغ' ? 'المبلغ' : 'تاريخ')}
                                                    style={{ padding: '16px 20px', color: C.muted, fontWeight: 600, fontSize: 13, cursor: sortable ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-start' }}>
                                                        {col} {sortable && <SortIcon col={col === 'المبلغ' ? 'المبلغ' : 'تاريخ'} />}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {pageData.length > 0 ? pageData.map((row, i) => (
                                            <motion.tr key={row.__name + i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                                style={{ borderBottom: `1px solid ${C.border}`, transition: 'background .15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,.015)' : '#F1F5F9'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '16px 20px', color: C.muted, fontWeight: 600, width: 40 }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                                <td style={{ padding: '16px 20px', fontWeight: 700 }}>{row.__name}</td>
                                                <td style={{ padding: '16px 20px' }}>{row.__source ? <Badge label={row.__source} color={getBadgeColor(row.__source)} /> : <span style={{ color: C.muted }}>—</span>}</td>
                                                <td style={{ padding: '16px 20px' }}>{row.__type ? <Badge label={row.__type} color={getBadgeColor(row.__type)} /> : <span style={{ color: C.muted }}>—</span>}</td>
                                                <td style={{ padding: '16px 20px' }}>{row.__sales ? <Badge label={row.__sales} color={getBadgeColor(`__rep_${row.__sales}`)} /> : <span style={{ color: C.muted }}>—</span>}</td>
                                                <td style={{ padding: '16px 20px', color: C.muted, fontSize: 13, whiteSpace: 'nowrap' }}>{row.__date || '—'}</td>
                                                <td style={{ padding: '16px 20px', fontWeight: 800, fontFamily: 'monospace', color: '#10B981', fontSize: 15, whiteSpace: 'nowrap' }}>{fmtSAR(row.__amount)}</td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                                        <Search size={40} color={C.muted} />
                                                        <p style={{ color: C.muted, fontSize: 16, fontWeight: 600, margin: 0 }}>لا توجد نتائج مطابقة لخيارات الفلترة المحددة</p>
                                                        <button onClick={clearFilters} style={{ color: '#4F8EF7', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: FONT, textDecoration: 'underline' }}>مسح الفلاتر وإظهار كل العقود</button>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: `1px solid ${C.border}` }}>
                                <span style={{ color: C.muted, fontSize: 14 }}>صفحة {page} من {totalPages} | إجمالي {filtered.length} عقد</span>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: page === 1 ? C.muted : C.text, cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronRight size={18} /></button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let p = i + 1;
                                        if (totalPages > 5) p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                        return <button key={p} onClick={() => setPage(p)} style={{ padding: '6px 14px', borderRadius: 8, fontFamily: FONT, background: page === p ? '#4F8EF7' : C.card, border: `1px solid ${page === p ? 'transparent' : C.border}`, color: page === p ? 'white' : C.text, cursor: 'pointer', fontWeight: page === p ? 700 : 400 }}>{p}</button>;
                                    })}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 8, background: C.card, border: `1px solid ${C.border}`, color: page === totalPages ? C.muted : C.text, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}><ChevronLeft size={18} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
