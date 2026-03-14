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

    // The single source of truth for all colors - aligned with tailwind.config.js
    const C = useMemo(() => isDark
        ? {
            bg: '#080E1B',
            card: 'rgba(255,255,255,0.025)',
            border: 'rgba(255,255,255,0.07)',
            text: '#F0F4FF',
            muted: '#7A869A',
            accent: '#4F8EF7',
            secondary: '#7C3AED',
            inputBg: 'rgba(255,255,255,0.04)',
            glow: 'rgba(79,142,247,0.1)'
        }
        : {
            bg: '#F8FAFC',
            card: '#F1F5F9',
            border: '#E2E8F0',
            text: '#1E293B',
            muted: '#475569',
            accent: '#4F8EF7',
            secondary: '#7C3AED',
            inputBg: '#FFFFFF',
            glow: 'rgba(79,142,247,0.08)'
        }, [isDark]);

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
        <div className="p-4 md:p-7 min-h-screen bg-white dark:bg-[#080E1B] font-['IBM_Plex_Sans_Arabic'] text-slate-900 dark:text-[#F0F4FF] direction-rtl">
            {achievementPct >= 100 && <Confetti />}

            {selectedRep && (
                <RepModal repName={selectedRep} onClose={() => setSelectedRep(null)} allMonthsData={Object.entries(historicData).map(([gid, data]) => ({ name: sheets.find(s => s.gid === gid)?.name, data }))} isDark={isDark} />
            )}

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold m-0 flex items-center gap-3">
                        <span className="bg-blue-500/10 dark:bg-[#4F8EF7]/10 p-2.5 rounded-2xl inline-flex"><Target size={30} className="text-[#7C3AED]" /></span>
                        التارقت العام للشركة
                    </h1>
                    <p className="text-slate-500 dark:text-[#7A869A] mt-2 text-sm md:text-[15px]">الهدف المالي والمنافسة الإجمالية — الهدف الشهري: <strong className="text-[#7C3AED]">575,000 ر.س</strong></p>
                </div>
                <div className="flex gap-3 flex-wrap items-center w-full md:w-auto">
                    <button onClick={() => fetchSheet(activeGid)} disabled={refreshing} 
                        className={`flex items-center justify-center gap-2 bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-white px-5 py-2.5 rounded-xl border-none font-bold text-[15px] shadow-[0_4px_14px_rgba(79,142,247,0.4)] dark:shadow-[0_6px_20px_rgba(79,142,247,0.3)] transition-all w-full md:w-auto ${refreshing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'}`}
                    >
                        <motion.div animate={{ rotate: refreshing ? 360 : 0 }} transition={{ repeat: refreshing ? Infinity : 0, duration: 1 }}><RefreshCw size={17} /></motion.div>
                        تحديث البيانات
                    </button>
                </div>
            </div>

            {/* ── SHEET TABS ── */}
            <div className="flex overflow-x-auto gap-2.5 pb-4 mb-7 custom-scrollbar">
                {sheets.map(s => {
                    const active = activeGid === s.gid;
                    return (
                        <button key={s.gid} onClick={() => setActiveGid(s.gid)}
                            className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-sm transition-all border outline-none cursor-pointer ${
                                active
                                ? 'bg-blue-50 dark:bg-[#4F8EF7]/10 border-[#4F8EF7] text-[#4F8EF7] font-bold shadow-[0_4px_12px_rgba(79,142,247,0.1)]'
                                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-white/10'
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
                    <div className="flex flex-col lg:flex-row gap-4 mb-7">
                        <div className="flex-1 lg:flex-[2] min-w-[300px] bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] rounded-3xl p-6 md:p-8 flex items-center justify-center text-center gap-5 text-white relative overflow-hidden shadow-lg">
                            <div className="absolute -right-4 -top-4 opacity-10"><Target size={120} /></div>
                            <div className="relative z-10 w-full">
                                <div className="text-2xl md:text-3xl font-black leading-relaxed">{motivationalPhrase}</div>
                            </div>
                        </div>

                        {isCurrentMonth && forecast && (
                            <div className="flex-1 min-w-[300px] bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-center shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${forecast.projected >= GLOBAL_TARGET ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10'}`}>
                                        <Clock size={22} className={forecast.projected >= GLOBAL_TARGET ? 'text-emerald-500' : 'text-amber-500'} />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-bold m-0 text-slate-900 dark:text-white">التوقع الذكي لنهاية الشهر</h3>
                                        <div className={`text-2xl font-black mt-0.5 ${forecast.projected >= GLOBAL_TARGET ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            <AnimatedNumber target={forecast.projected} formatter={fmtSAR} />
                                        </div>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
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
                    <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-6 md:p-8 mb-7 shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                            <div>
                                <div className="text-slate-500 dark:text-[#7A869A] text-[15px] mb-1.5 font-medium">الهدف الشهري الإجمالي</div>
                                <div className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                                    <AnimatedNumber target={totalAmount} formatter={fmtSAR} />
                                </div>
                                <div className="text-slate-500 dark:text-[#7A869A] text-sm mt-1 font-medium">
                                    من أصل <span className="text-[#7C3AED] font-bold">{fmt(GLOBAL_TARGET)}</span> • {momHtml}
                                </div>
                            </div>
                            <div className="flex gap-4 lg:gap-6 items-center bg-slate-50 dark:bg-white/5 p-4 md:py-4 md:px-8 rounded-2xl border border-slate-200 dark:border-white/5 w-full lg:w-auto justify-between lg:justify-start">
                                <div className="text-center">
                                    <div className={`text-4xl md:text-[48px] font-black ${achievementPct >= 100 ? 'text-emerald-500' : achievementPct >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                        <AnimatedNumber target={achievementPct} formatter={v => fmtPct(v)} />
                                    </div>
                                    <div className="text-slate-500 dark:text-[#7A869A] text-sm font-bold">نسبة الإنجاز</div>
                                </div>
                                <div className="w-px h-16 bg-slate-200 dark:bg-white/10 hidden md:block"></div>
                                <div className="text-center">
                                    <div className={`text-3xl md:text-[32px] font-extrabold ${remaining === 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                        <AnimatedNumber target={remaining} formatter={fmtSAR} />
                                    </div>
                                    <div className="text-slate-500 dark:text-[#7A869A] text-sm font-medium">المتبقي لإكمال الهدف</div>
                                </div>
                            </div>
                        </div>
                        <ProgressBar pct={achievementPct} height={16} bg={isDark ? 'rgba(255,255,255,.06)' : '#E2E8F0'} />
                    </div>

                    {/* ── KPI MINI-CARDS ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                        {[
                            { icon: <DollarSign size={22} className="text-emerald-500" />, bgClass: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'المبيعات الشاملة', val: totalAmount, fmt: fmtSAR },
                            { icon: <TrendingUp size={22} className="text-amber-500" />, bgClass: 'bg-amber-50 dark:bg-amber-500/10', label: 'صافي المبيعات (بدون ضريبة)', val: totalNetAmount, fmt: fmtSAR },
                            { icon: <Briefcase size={22} className="text-blue-500" />, bgClass: 'bg-blue-50 dark:bg-blue-500/10', label: 'إجمالي العقود', val: allData.length, fmt: v => fmt(Math.round(v)) },
                            { icon: <User size={22} className="text-purple-500" />, bgClass: 'bg-purple-50 dark:bg-purple-500/10', label: 'المندوبين النشطين', val: uniqueSales.length, fmt: v => fmt(Math.round(v)) },
                        ].map((k, i) => (
                            <div key={i} className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${k.bgClass}`}>{k.icon}</div>
                                    <div>
                                        <div className="text-slate-500 dark:text-[#7A869A] text-[13px] mb-1 font-medium">{k.label}</div>
                                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white"><AnimatedNumber target={k.val} formatter={k.fmt} /></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-7">
                        {/* Leaderboards Column */}
                        <div className="flex flex-col gap-5">
                            {/* BDR Leaderboard */}
                            <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-7 shadow-sm">
                                <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Trophy size={22} className="text-amber-500" /> مبيعات مطوري الأعمال
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-auto bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">الهدف الفردي: 115k</span>
                                </h3>
                                {bdrLeaderboard.length === 0 ? <p className="text-slate-400 text-center">لا توجد عقود بعد</p> : (
                                    <div className="flex flex-col gap-4">
                                        {bdrLeaderboard.map((rep, i) => {
                                            const activeDaysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
                                            const pct = (rep.total / REP_TARGET) * 100;
                                            const needsAlert = isCurrentMonth && activeDaysLeft <= 10 && pct < 40;
                                            const hitTarget = pct >= 100;
                                            return (
                                                <div key={i} className="flex items-center gap-4">
                                                    <div className="text-2xl w-8 text-center shrink-0">{MEDAL[i] || <span className="text-base text-slate-400 dark:text-slate-500 font-extrabold">{i + 1}</span>}</div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setSelectedRep(rep.name)} className="bg-transparent border-none p-0 m-0 font-bold text-base text-slate-900 dark:text-white cursor-pointer hover:underline transition-all">{rep.name}</button>
                                                                {hitTarget && <span title="حقق الهدف">🎯</span>}
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className={`text-[15px] font-bold ${hitTarget ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                                                    {fmtSAR(rep.total)} <span className="text-[13px] opacity-70">({fmtPct(pct)})</span>
                                                                </span>
                                                                {needsAlert && (
                                                                    <span className="text-[11px] bg-red-50 dark:bg-red-500/10 text-red-500 px-2 py-0.5 rounded-md font-semibold">
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
                            <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-7 shadow-sm">
                                <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <User size={22} className="text-purple-500" /> مبيعات الفِرَق
                                </h3>
                                {teamLeaderboard.length === 0 ? <p className="text-slate-400 text-center">لا توجد عقود لفرق المبيعات</p> : (
                                    <div className="flex flex-col gap-4">
                                        {teamLeaderboard.map((rep, i) => {
                                            const pct = (rep.total / (REP_TARGET * 3)) * 100;
                                            return (
                                                <div key={i} className="flex items-center gap-4">
                                                    <div className="text-2xl w-8 text-center shrink-0">{MEDAL[i] || <span className="text-base text-slate-400 dark:text-slate-500 font-extrabold">{i + 1}</span>}</div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-2 flex-wrap gap-1">
                                                            <button onClick={() => setSelectedRep(rep.name)} className="bg-transparent border-none p-0 m-0 font-bold text-base text-slate-900 dark:text-white cursor-pointer hover:underline">{rep.name}</button>
                                                            <span className="text-[15px] font-bold text-slate-900 dark:text-white">{fmtSAR(rep.total)}</span>
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
                        <div className="flex flex-col gap-5">
                            <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex-1">
                                <h3 className="text-lg font-extrabold mb-5 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <TrendingUp size={20} className="text-emerald-500" /> مسار تحقيق الهدف - {activeSheetDef?.name}
                                </h3>
                                <PerformanceProgressChart currentData={allData} allMonthsData={sheets.map(s => ({ name: s.name, data: historicData[s.gid] || [] }))} totalTarget={GLOBAL_TARGET} isDark={isDark} activeSheetName={activeSheetDef?.name} />
                            </div>
                            <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm flex-1">
                                <BestDayWidget data={allData} isDark={isDark} />
                                <h3 className="text-lg font-extrabold mb-5 flex items-center gap-2 text-slate-900 dark:text-white">
                                    <Clock size={20} className="text-amber-500" /> أسرع العقود إغلاقاً
                                </h3>
                                <FastestDeals data={allData} isDark={isDark} />
                            </div>
                        </div>
                    </div>


                    {/* ── ANALYTICS ROW ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-7">
                        <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-7 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-extrabold m-0 flex items-center gap-2 text-slate-900 dark:text-white"><FileText size={20} className="text-blue-500" /> تحليل المصادر</h3>
                                <div className="flex bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                                    <button onClick={() => setSourceMode('value')} className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer border-none transition-all ${sourceMode === 'value' ? 'bg-[#4F8EF7] text-white' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}>قيمة</button>
                                    <button onClick={() => setSourceMode('count')} className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer border-none transition-all ${sourceMode === 'count' ? 'bg-[#4F8EF7] text-white' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}>عدد</button>
                                </div>
                            </div>
                            {chartData.sources.length > 0
                                ? (
                                    <>
                                        <DonutChart data={chartData.sources} colors={donutColors} isDark={isDark} />
                                        {sourceMode === 'value' && chartData.insight && <div className="mt-5 p-3 bg-blue-50 dark:bg-blue-500/5 rounded-xl text-blue-800 dark:text-blue-300 text-xs leading-relaxed border border-blue-100 dark:border-blue-500/10" dangerouslySetInnerHTML={{ __html: chartData.insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />}
                                    </>
                                ) : <p className="text-slate-400 text-center py-6">لا توجد بيانات</p>}
                        </div>
                        <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl p-7 shadow-sm">
                            <h3 className="text-lg font-extrabold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><BarChart2 size={20} className="text-purple-500" /> أنواع المشاريع والقيمة</h3>
                            {chartData.types.length > 0
                                ? <BarChart data={chartData.types} colors={barColors} isDark={isDark} />
                                : <p className="text-slate-400 text-center py-6">لا توجد بيانات</p>}
                        </div>
                    </div>

                    {/* ── ADVANCED DATA GRID ── */}
                    <div className="bg-white dark:bg-[#151D2F] border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/5">
                            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                                <h3 className="text-xl font-extrabold m-0 text-slate-900 dark:text-white">جدول العقود الشامل</h3>
                                <div className="flex items-center gap-2.5">
                                    <span className="text-slate-400 text-sm">{filtered.length} نتيجة</span>
                                    {hasFilters && <button onClick={clearFilters} className="text-red-500 bg-none bg-transparent border-none cursor-pointer text-[13px] inline-flex items-center gap-1 hover:underline"><X size={14} /> مسح الفلاتر</button>}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="relative">
                                    <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input type="text" placeholder="بحث باسم العميل، جوال..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pr-10 pl-3 py-2 rounded-xl outline-none text-sm focus:border-blue-400 transition-colors" />
                                </div>
                                <div className="relative">
                                    <Filter size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select value={filterSales} onChange={e => { setFilterSales(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pr-9 pl-3 py-2 rounded-xl outline-none text-sm cursor-pointer focus:border-blue-400 transition-colors">
                                        <option value="">تصفية بالمندوب - الكل</option>
                                        {uniqueSales.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <Filter size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pr-9 pl-3 py-2 rounded-xl outline-none text-sm cursor-pointer focus:border-blue-400 transition-colors">
                                        <option value="">تصفية بالمصدر - الكل</option>
                                        {uniqueSources.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="relative">
                                    <Filter size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }} className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white pr-9 pl-3 py-2 rounded-xl outline-none text-sm cursor-pointer focus:border-blue-400 transition-colors">
                                        <option value="">نوع المشروع - الكل</option>
                                        {uniqueTypes.map(s => <option key={s} value={s} style={{ color: '#0f172a' }}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-right text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-white/[0.02] border-b-2 border-slate-200 dark:border-white/5">
                                        {['#', 'اسم العميل', 'المصدر', 'نوع المشروع', 'المبيعات', 'تاريخ التحويل', 'المبلغ'].map((col, i) => {
                                            const sortable = col === 'المبلغ' || col === 'تاريخ التحويل';
                                            return (
                                                <th key={i} onClick={() => sortable && handleSort(col === 'المبلغ' ? 'المبلغ' : 'تاريخ')}
                                                    className={`px-5 py-4 text-slate-500 dark:text-slate-400 font-semibold text-[13px] whitespace-nowrap ${sortable ? 'cursor-pointer hover:text-slate-700 dark:hover:text-slate-200' : ''}`}>
                                                    <div className="flex items-center gap-1.5">
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
                                                className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.015] transition-colors"
                                            >
                                                <td className="px-5 py-4 text-slate-400 dark:text-slate-500 font-semibold w-10">{(page - 1) * PAGE_SIZE + i + 1}</td>
                                                <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{row.__name}</td>
                                                <td className="px-5 py-4">{row.__source ? <Badge label={row.__source} color={getBadgeColor(row.__source)} /> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                                                <td className="px-5 py-4">{row.__type ? <Badge label={row.__type} color={getBadgeColor(row.__type)} /> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                                                <td className="px-5 py-4">{row.__sales ? <Badge label={row.__sales} color={getBadgeColor(`__rep_${row.__sales}`)} /> : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                                                <td className="px-5 py-4 text-slate-400 dark:text-slate-500 text-[13px] whitespace-nowrap">{row.__date || '—'}</td>
                                                <td className="px-5 py-4 font-extrabold font-mono text-emerald-500 text-[15px] whitespace-nowrap">{fmtSAR(row.__amount)}</td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center">
                                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                                                        <Search size={40} className="text-slate-300 dark:text-slate-600" />
                                                        <p className="text-slate-400 text-base font-semibold m-0">لا توجد نتائج مطابقة لخيارات الفلترة المحددة</p>
                                                        <button onClick={clearFilters} className="text-[#4F8EF7] bg-none bg-transparent border-none cursor-pointer text-sm underline hover:no-underline">مسح الفلاتر وإظهار كل العقود</button>
                                                    </motion.div>
                                                </td>
                                            </tr>
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-white/5">
                                <span className="text-slate-400 text-sm">صفحة {page} من {totalPages} | إجمالي {filtered.length} عقد</span>
                                <div className="flex gap-2">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`p-1.5 rounded-lg border transition-all ${page === 1 ? 'border-slate-200 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer'}`}><ChevronRight size={18} /></button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let p = i + 1;
                                        if (totalPages > 5) p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                        return <button key={p} onClick={() => setPage(p)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${page === p ? 'bg-[#4F8EF7] border-transparent text-white font-bold shadow-sm' : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>{p}</button>;
                                    })}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`p-1.5 rounded-lg border transition-all ${page === totalPages ? 'border-slate-200 dark:border-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer'}`}><ChevronLeft size={18} /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
