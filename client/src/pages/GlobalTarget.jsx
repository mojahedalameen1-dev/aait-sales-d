import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target, RefreshCw, AlertCircle, Search, ChevronUp, ChevronDown,
    ChevronLeft, ChevronRight, Trophy, User, Users, TrendingUp, DollarSign,
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

    // The single source of truth for all colors - aligned with global tokens
    const C = useMemo(() => ({
        bg: 'var(--bg-main)',
        card: 'var(--bg-card)',
        border: 'var(--border-color)',
        text: 'var(--text-main)',
        muted: 'var(--text-muted)',
        accent: 'var(--accent-color)',
        secondary: '#7C3AED',
        inputBg: 'var(--bg-card)',
        glow: 'var(--accent-glow)'
    }), []);

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
            /*
            if (parsedRows.length > 0) {
                const totalAmt = parsedRows.reduce((sum, r) => sum + r.__amount, 0);
                const avgAmt = totalAmt / parsedRows.length;
                const outlierLimit = avgAmt * 3;
                finalRows = parsedRows.filter(r => r.__amount <= outlierLimit);
            }
            */

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

    const totalAmount = useMemo(() => allData.reduce((s, r) => s + (r.__amount || 0), 0), [allData]);
    const totalNetAmount = useMemo(() => allData.reduce((s, r) => s + (r.__net_amount || 0), 0), [allData]);
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
                        const amt = r.__amount || (r.__net_amount * 1.15) || 0;
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
                        prevUpToDay += (r.__amount || 0);
                    }
                });

                if (prevUpToDay > 0) {
                    const diff = totalAmount - prevUpToDay;
                    momGapPct = (diff / prevUpToDay) * 100;
                    const color = momGapPct >= 0 ? '#10B981' : '#EF4444';
                    momHtml = (
                        <span style={{ fontSize: 13, fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
                            {momGapPct >= 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'scaleY(-1)' }} />}
                            {Math.abs(momGapPct).toFixed(1)}% {momGapPct >= 0 ? 'ارتفاع' : 'انخفاض'} عن نفس الفترة في {prevSheet.name.replace(' 2026', '')} (بالشامل)
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

    const inputStyle = { background: C.inputBg, border: 'none', color: C.text, padding: '10px 16px', borderRadius: 10, outline: 'none', fontFamily: FONT, fontSize: 14, width: '100%', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' };
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
        <div className="p-4 md:p-7 min-h-screen bg-white dark:bg-[#080E1B] font-['IBM_Plex_Sans_Arabic'] text-slate-900 dark:text-[#F0F4FF] direction-rtl">
            {achievementPct >= 100 && <Confetti />}

            {selectedRep && (
                <RepModal repName={selectedRep} onClose={() => setSelectedRep(null)} allMonthsData={Object.entries(historicData).map(([gid, data]) => ({ name: sheets.find(s => s.gid === gid)?.name, data }))} isDark={isDark} />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black m-0 flex items-center gap-3 text-slate-900 dark:text-white tracking-tight">
                        <div className="bg-blue-500/10 p-2.5 rounded-xl">
                            <Target size={28} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        تطوير الأعمال | التارقت العام
                    </h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-2 text-xs md:text-sm font-medium">الهدف المالي والمنافسة الإجمالية — الهدف الشهري: <strong className="text-blue-600 dark:text-blue-400 font-black">575,000 ر.س</strong></p>
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto">
                    <button 
                        onClick={() => fetchSheet(activeGid)} 
                        disabled={refreshing} 
                        className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-2xl w-full md:w-auto shadow-lg shadow-blue-500/20"
                    >
                        <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ repeat: refreshing ? Infinity : 0, duration: 1 }}>
                            <RefreshCw size={18} />
                        </motion.div>
                        تحديث البيانات
                    </button>
                </div>
            </div>

            {/* ── SHEET TABS ── */}
            <div className="flex overflow-x-auto gap-3 pb-6 mb-8 custom-scrollbar">
                {sheets.map(s => {
                    const active = activeGid === s.gid;
                    return (
                        <button 
                            key={s.gid} 
                            onClick={() => setActiveGid(s.gid)}
                            className={`px-5 py-2.5 rounded-xl whitespace-nowrap text-sm font-black transition-all outline-none cursor-pointer border-none ${
                                active
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white dark:bg-white/5 text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/10'
                            }`}
                        >
                            {s.name}
                        </button>
                    );
                })}
            </div>

            <AnimatePresence mode="wait">
                <motion.div key={activeGid} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>

                    {/* ── ALERTS ROW ── */}
                    <div className="flex flex-col lg:flex-row gap-4 mb-6">
                        <div className="flex-1 lg:flex-[2] min-w-[300px] bg-gradient-to-br from-[#1E293B] to-[#0F172A] dark:from-[#1e293b] dark:to-[#020617] rounded-3xl p-6 md:p-8 flex items-center justify-center text-center gap-5 text-white relative overflow-hidden shadow-2xl">
                            <div className="absolute -right-4 -top-4 opacity-10"><Target size={120} /></div>
                            <div className="relative z-10 w-full">
                                <div className="text-xl md:text-2xl font-black leading-relaxed">{motivationalPhrase}</div>
                            </div>
                        </div>

                        {isCurrentMonth && forecast && (
                            <div className="flex-1 min-w-[300px] bg-blue-50/30 dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] p-6 flex flex-col justify-center border border-blue-100/50 dark:border-white/5 shadow-xl shadow-blue-500/5 dark:shadow-black/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${forecast.projected >= GLOBAL_TARGET ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                                        <Clock size={24} className={forecast.projected >= GLOBAL_TARGET ? 'text-emerald-500' : 'text-amber-500'} />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-1">التوقع الذكي لنهاية الشهر</h3>
                                        <div className={`text-2xl font-black ${forecast.projected >= GLOBAL_TARGET ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'} tracking-tight`}>
                                            <AnimatedNumber target={forecast.projected} formatter={fmtSAR} />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed font-bold bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                                    {forecast.usedHistorical ? (
                                        <>بناءً على <b>{forecast.daysElapsed}</b> يوم من أصل <b>{forecast.daysInMonth}</b> يوم — مستند على بيانات <b>{forecast.pastMonthsNames}</b>.</>
                                    ) : (
                                        <>يعتمد على متوسط يومي للبيانات الحالية لعدم اكتمال الأسبوع الأول.</>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── HERO TARGET CARD ── */}
                    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-md rounded-[28px] p-6 md:p-8 mb-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none"></div>
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 relative z-10">
                            <div>
                                <div className="text-slate-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">الهدف الشهري الإجمالي</div>
                                <div className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                                    <AnimatedNumber target={totalAmount} formatter={fmtSAR} />
                                </div>
                                <div className="flex items-center gap-2.5 text-slate-500 dark:text-gray-400 text-xs font-bold bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                                    <span>باقي <span className="text-blue-600 dark:text-blue-400 font-black">{fmt(GLOBAL_TARGET)}</span></span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-gray-600"></span>
                                    {momHtml}
                                </div>
                            </div>
                            <div className="flex gap-6 items-center bg-slate-50/50 dark:bg-white/5 p-4 rounded-[20px] w-full lg:w-auto shadow-inner">
                                <div className="text-center">
                                    <div className={`text-3xl md:text-4xl font-black ${achievementPct >= 100 ? 'text-emerald-500' : achievementPct >= 60 ? 'text-amber-500' : 'text-red-500'} tracking-tighter`}>
                                        <AnimatedNumber target={achievementPct} formatter={v => fmtPct(v)} />
                                    </div>
                                    <div className="text-slate-400 dark:text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1">نسبة الإنجاز</div>
                                </div>
                                <div className="w-px h-10 bg-slate-200 dark:bg-white/10 hidden md:block"></div>
                                <div className="text-center">
                                    <div className={`text-2xl font-black ${remaining === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                        <AnimatedNumber target={remaining} formatter={fmtSAR} />
                                    </div>
                                    <div className="text-slate-400 dark:text-gray-500 text-[9px] font-black uppercase tracking-widest mt-1">المتبقي للإنجاز</div>
                                </div>
                            </div>
                        </div>
                        <ProgressBar pct={achievementPct} height={16} />
                    </div>

                    {/* ── KPI MINI-CARDS ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { icon: <DollarSign size={20} className="text-emerald-500" />, transition: 'emerald', label: 'المبيعات الشاملة', val: totalAmount, fmt: fmtSAR },
                            { icon: <TrendingUp size={20} className="text-amber-500" />, transition: 'amber', label: 'صافي المبيعات', val: totalNetAmount, fmt: fmtSAR },
                            { icon: <Briefcase size={20} className="text-blue-500" />, transition: 'blue', label: 'إجمالي العقود', val: allData.length, fmt: v => fmt(Math.round(v)) },
                            { icon: <User size={20} className="text-purple-500" />, transition: 'purple', label: 'المندوبين النشطين', val: uniqueSales.length, fmt: v => fmt(Math.round(v)) },
                        ].map((k, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[20px] p-5 shadow-lg shadow-slate-200/50 dark:shadow-black/20 group hover:-translate-y-1 transition-all duration-300">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-${k.transition}-500/10 group-hover:scale-110 transition-transform shadow-inner`}>{k.icon}</div>
                                    <div>
                                        <div className="text-slate-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">{k.label}</div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight"><AnimatedNumber target={k.val} formatter={k.fmt} /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                        {/* Leaderboards Column */}
                        <div className="flex flex-col gap-6">
                            {/* BDR Leaderboard */}
                            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 text-slate-900 dark:text-white">
                                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                                    <Trophy size={20} className="text-amber-500" /> مبيعات مطوري الأعمال
                                    <span className="text-[9px] font-black text-slate-400 dark:text-gray-500 mr-auto bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-wider uppercase">الهدف: 115k</span>
                                </h3>
                                {bdrLeaderboard.length === 0 ? <p className="text-slate-400 text-center py-10 font-bold">لا توجد عقود مسجلة بعد</p> : (
                                    <div className="flex flex-col gap-5">
                                        {bdrLeaderboard.map((rep, i) => {
                                            const pct = (rep.total / REP_TARGET) * 100;
                                            const hitTarget = pct >= 100;
                                            return (
                                                <div key={i} className="flex items-center gap-4 transition-all hover:translate-x-[-4px] group">
                                                    <div className="text-2xl w-8 text-center shrink-0 drop-shadow-sm font-black">{MEDAL[i] || <span className="text-base text-slate-300 dark:text-gray-600">{(i + 1).toString().padStart(2, '0')}</span>}</div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-end mb-2 flex-wrap gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setSelectedRep(rep.name)} className="bg-transparent border-none p-0 m-0 font-black text-sm text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 transition-colors outline-none">{rep.name}</button>
                                                                {hitTarget && <Badge label="بطل الشهر" color="#10B981" />}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`text-sm font-black ${hitTarget ? 'text-emerald-500' : 'text-slate-900 dark:text-white'} tracking-tight`}>
                                                                    {fmtSAR(rep.total)} <span className="text-[10px] opacity-50 font-bold mr-1">({fmtPct(pct)})</span>
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ProgressBar pct={pct} height={6} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Team Leaderboard */}
                            <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 text-slate-900 dark:text-white">
                                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                                    <Users size={20} className="text-blue-500" /> مبيعات الفرق
                                    <span className="text-[9px] font-black text-slate-400 dark:text-gray-500 mr-auto bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-wider uppercase">الإنجاز الجماعي</span>
                                </h3>
                                {teamLeaderboard.length === 0 ? <p className="text-slate-400 text-center py-10 font-bold">لا توجد بيانات متاحة حالياً</p> : (
                                    <div className="flex flex-col gap-5">
                                        {teamLeaderboard.map((t, i) => {
                                            const teamTarget = t.name === 'MIX' ? 345000 : 230000;
                                            const pct = (t.total / teamTarget) * 100;
                                            return (
                                                <div key={i} className="flex items-center gap-4 transition-all hover:translate-x-[-4px] group">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-inner ${t.name === 'MIX' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>{t.name[0]}</div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-sm text-slate-800 dark:text-white">{t.name}</span>
                                                                {pct >= 100 && <Badge label="فريق ذهبي" color="#F59E0B" />}
                                                            </div>
                                                            <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                                                                {fmtSAR(t.total)} <span className="text-[10px] opacity-50 font-bold mr-1">({fmtPct(pct)})</span>
                                                            </span>
                                                        </div>
                                                        <ProgressBar pct={pct} height={6} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Best Day Widget & Fastest Deals */}
                        <div className="flex flex-col gap-6">
                            <BestDayWidget data={allData} isDark={isDark} />
                            <FastestDeals data={allData} isDark={isDark} />
                        </div>
                    </div>

                    {/* ── ANALYTICS ROW ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-white">
                                    <TrendingUp size={18} className="text-emerald-500" /> تحليل مبيعات المندوبين
                                </h3>
                                <span className="text-[9px] font-black text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg tracking-wider uppercase">أعلى 10</span>
                            </div>
                            <DonutChart data={bdrLeaderboard.slice(0, 10).map(r => ({ name: r.name, value: r.total }))} colors={donutColors} isDark={isDark} />
                        </div>
                        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-base font-black flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Briefcase size={18} className="text-blue-500" /> مبيعات التصنيفات
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setSourceMode('value')} className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${sourceMode === 'value' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>القيمة</button>
                                    <button onClick={() => setSourceMode('count')} className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${sourceMode === 'count' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>العدد</button>
                                </div>
                            </div>
                            <BarChart data={chartData.types.slice(0, 5)} colors={barColors} isDark={isDark} />
                        </div>
                    </div>

                    {/* ── ADVANCED DATA GRID ── */}
                    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-black/20">
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white m-0 tracking-tight">سجل العقود التفصيلي</h3>
                                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1 font-bold">عرض وتصفية جميع العمليات المسجلة لهذا الشهر</p>
                                </div>
                                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-80">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="بحث عن عميل، مندوب أو رقم..." 
                                            value={search}
                                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                                            className="w-full bg-slate-50 dark:bg-white/5 p-4 pr-12 rounded-2xl outline-none text-sm font-bold shadow-inner"
                                        />
                                    </div>
                                    <button onClick={clearFilters} className={`p-4 rounded-2xl transition-all ${hasFilters ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400 opacity-50'}`}>
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 p-6 bg-slate-50/50 dark:bg-white/[0.02] rounded-3xl shadow-inner">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">المندوب</label>
                                    <select value={filterSales} onChange={e => { setFilterSales(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 rounded-xl outline-none text-sm font-bold cursor-pointer transition-all shadow-sm border-none">
                                        <option value="">جميع المندوبين</option>
                                        {uniqueSales.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">المصدر</label>
                                    <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 rounded-xl outline-none text-sm font-bold cursor-pointer transition-all shadow-sm border-none">
                                        <option value="">جميع المصادر</option>
                                        {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2">التصنيف</label>
                                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-3 rounded-xl outline-none text-sm font-bold cursor-pointer transition-all shadow-sm border-none">
                                        <option value="">جميع التصنيفات</option>
                                        {uniqueTypes.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full border-collapse min-w-[1000px] text-right">
                                <thead>
                                    <tr className="bg-slate-50/50 dark:bg-white/[0.02] text-slate-400 dark:text-gray-500 text-[11px] font-black uppercase tracking-widest">
                                        <th className="px-8 py-5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('__name')}>العميل <SortIcon col="__name" /></th>
                                        <th className="px-8 py-5">المندوب</th>
                                        <th className="px-8 py-5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('المبلغ')}>المبلغ <SortIcon col="المبلغ" /></th>
                                        <th className="px-8 py-5">المصدر</th>
                                        <th className="px-8 py-5">التصنيف</th>
                                        <th className="px-8 py-5 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors" onClick={() => handleSort('__date')}>تاريخ التحويل <SortIcon col="__date" /></th>
                                    </tr>
                                </thead>
                                <tbody className="">
                                    {pageData.length > 0 ? pageData.map((row, i) => (
                                        <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="font-black text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">{row.__name}</div>
                                                <div className="text-[10px] text-slate-400 font-bold mt-1">Ref: {row.__row_id || 'N/A'}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <Badge label={row.__sales} color={getBadgeColor(row.__sales)} />
                                            </td>
                                            <td className="px-8 py-5 font-black text-slate-900 dark:text-blue-400">
                                                {fmtSAR(row.__amount)}
                                            </td>
                                            <td className="px-8 py-5">
                                                <Badge label={row.__source} color={getBadgeColor(row.__source)} />
                                            </td>
                                            <td className="px-8 py-5">
                                                <Badge label={row.__type} color={getBadgeColor(row.__type)} />
                                            </td>
                                            <td className="px-8 py-5 text-sm font-bold text-slate-400 dark:text-gray-500 whitespace-nowrap">
                                                {row.__date}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center text-slate-400 font-bold">
                                                لا توجد عقود تطابق خيارات البحث الحالية
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="px-8 py-6 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col sm:flex-row justify-between items-center gap-4">
                                <span className="text-slate-400 text-sm font-bold">صفحة {page} من {totalPages}</span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => setPage(p => Math.max(1, p - 1))} 
                                        disabled={page === 1}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm disabled:opacity-30 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 outline-none border-none"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                    <button 
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                        disabled={page === totalPages}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 shadow-sm disabled:opacity-30 transition-all hover:bg-slate-50 dark:hover:bg-slate-700 outline-none border-none"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
