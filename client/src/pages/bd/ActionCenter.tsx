import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Target, ArrowRight } from 'lucide-react';
import { ExcelStats } from '../../utils/excelData';

interface Followup {
    id: number;
    client_name: string;
    next_followup_date: string;
}

interface TopDeal {
    id: number;
    client_name: string;
    forecastValue: number;
    rawTargetValue: number;
    total_score: number;
}

interface ActionCenterProps {
    followups: Followup[];
    topDeals: TopDeal[];
    stats: ExcelStats;
}

const fmt = (v: number) => (v || 0).toLocaleString('en-US') + ' ر.س';

export default function ActionCenter({ followups, topDeals, stats }: ActionCenterProps) {
    const navigate = useNavigate();
    
    // Sort excel rows by value to show "Achievements" if no "Live Ops"
    const topExcelRows = [...(stats.currentMonth?.rows || [])]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

    return (
        <div className="grid grid-cols-1 gap-8">
            {/* 2. Top High-Probability Deals (Now Full Width) */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                            <Target size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                            {topDeals.length > 0 ? 'أهم الفرص للإغلاق' : 'أبرز إنجازات الشهر'}
                        </h3>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden group">
                    {topDeals.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {topDeals.map((deal) => (
                                <div 
                                    key={deal.id} 
                                    className="p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                                    onClick={() => navigate(`/client/${deal.id}`)}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                                            {deal.client_name}
                                        </div>
                                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black">
                                            احتمالية {Math.round(deal.total_score)}%
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">القيمة المتوافقة مع الهدف</div>
                                            <div className="text-lg font-black text-slate-900 dark:text-white">{fmt(deal.rawTargetValue)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">العائد الموزون</div>
                                            <div className="text-sm font-black text-indigo-500">{fmt(deal.forecastValue)}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : topExcelRows.length > 0 ? (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                             <div className="p-4 bg-emerald-500/5 text-center">
                                <div className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                    أعلى عمليات مكتملة تم رصدها في السجل
                                </div>
                            </div>
                            {topExcelRows.map((row, idx) => (
                                <div key={idx} className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center text-xs font-black text-slate-400">
                                            #{idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-slate-900 dark:text-white">
                                                {row.client || 'صفقة سابقة مكتملة'}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">حالة الصفقة: مكتملة بنجاح</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-emerald-500">{fmt(row.amount)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center text-slate-400 font-bold">
                            <div className="text-4xl mb-4 grayscale opacity-30">💼</div>
                            <p className="text-slate-500 dark:text-slate-400">لا توجد صفقات نشطة حالياً</p>
                            <p className="text-[10px] text-slate-400 mt-1 font-medium italic">ابدأ بإضافة صفقاتك الجديدة لتظهر هنا وتحصل على تحليلات دقيقة</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
