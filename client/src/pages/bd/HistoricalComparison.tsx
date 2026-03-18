import React from 'react';
import { TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface HistoricalComparisonProps {
    ytdActual: number;
    currentMonthActual: number;
    previousMonthActual: number;
    previousMonthName: string;
}

const fmt = (v: number) => v.toLocaleString('en-US') + ' ر.س';

export default function HistoricalComparison({ ytdActual, currentMonthActual, previousMonthActual, previousMonthName }: HistoricalComparisonProps) {
    const diff = currentMonthActual - previousMonthActual;
    const pctChange = previousMonthActual > 0 ? (diff / previousMonthActual) * 100 : 0;
    const isUp = pctChange >= 0;

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-center bg-slate-50 dark:bg-white/5 p-4 rounded-3xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-4 px-6 py-2 border-l border-slate-200 dark:border-white/10 w-full lg:w-auto">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <Layers size={20} />
                </div>
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">إجمالي السنة (YTD)</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{fmt(ytdActual)}</div>
                </div>
            </div>

            <div className="flex items-center gap-4 px-6 py-2 w-full lg:w-auto">
                <div className={`px-4 py-2 rounded-2xl flex items-center gap-3 font-black text-sm ${isUp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {isUp ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    <span>
                        {isUp ? '+' : '-'}{Math.abs(pctChange).toFixed(1)}% 
                        <span className="opacity-70 mr-1.5 text-xs">مقارنة بـ {previousMonthName}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
