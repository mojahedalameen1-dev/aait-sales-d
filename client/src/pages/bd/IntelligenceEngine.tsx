import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Star, AlertCircle, TrendingUp, Briefcase } from 'lucide-react';
import { ExcelStats } from '../../utils/excelData';

interface IntelligenceEngineProps {
    stats: ExcelStats;
    neonStats: any;
}

const fmt = (v: number) => (v || 0).toLocaleString('en-US') + ' ر.س';

export default function IntelligenceEngine({ stats, neonStats }: IntelligenceEngineProps) {
    const target = stats.currentMonth?.target || 115000;
    const currentActual = stats.currentMonth?.actual || 0;
    const forecast = stats.forecast || 0;
    const bestMonth = stats.bestMonth;
    const consistencyScore = stats.consistencyScore;
    
    // Dynamic KPI Logic (Fallbacks for Zero values)
    const coldDeals = neonStats.coldDealsCount || 0;
    const pipelineValue = neonStats.activeValue || 0;
    const weightedForecast = neonStats.weightedActiveValue || 0;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                    <Cpu size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">تحليل الأداء الذكي</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 1. التوقع الشهري */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group border-r-4 border-r-indigo-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                    <Zap className="mb-4 text-indigo-600 dark:text-indigo-400" size={24} />
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">توقع الإغلاق الشهري</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{fmt(forecast)}</div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400/80">
                        {forecast >= target ? 'أداء ممتاز، في طريقك لتجاوز المستهدف!' : 'تحتاج لزيادة وتيرة الإغلاق لتحقيق الهدف'}
                    </div>
                </div>

                {/* 2. أفضل شهر أو الرقم القياسي */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <Star className="text-amber-500 mb-4" size={24} />
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الرقم القياسي الشخصي</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                        {bestMonth ? fmt(bestMonth.actual).replace(' ر.س', '') : '--'}
                    </div>
                    <div className="text-xs font-black text-emerald-500">
                        {bestMonth ? `تم تحقيقه في ${bestMonth.name}` : 'لم يتم تسجيل بيانات كافية'}
                    </div>
                </div>

                {/* 3. تنبيه الصفقات أو إحصائية العمليات */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                    {coldDeals > 0 ? (
                        <>
                            <AlertCircle className="text-red-500 mb-4" size={24} />
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">تنبيه المتابعات المتوقفة</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{coldDeals} صفقات</div>
                            <div className="text-xs font-black text-slate-400">تحتاج لتحديث فوري خلال 24 ساعة</div>
                        </>
                    ) : (
                        <>
                            <TrendingUp className="text-emerald-500 mb-4" size={24} />
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">إجمالي عمليات الشهر</div>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">{stats.currentMonth?.rows.length || 0} عملية</div>
                            <div className="text-xs font-black text-emerald-500">مكتملة ومسجلة في السجل</div>
                        </>
                    )}
                </div>

                {/* 4. رصيد الاستمرارية */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden">
                    <TrendingUp className="text-blue-500 mb-4" size={24} />
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">رصيد الاستمرارية</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                        {consistencyScore} <span className="text-sm opacity-50">أشهر</span>
                    </div>
                    <div className="text-xs font-black text-blue-500">معدل إنجاز فوق 80% من الهدف</div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-12 mb-2 px-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                    <TrendingUp size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">تحليل تدفقات السيولة</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {/* 5. قيمة المحفظة أو متوسط المبيعات */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                        <Briefcase className={`${pipelineValue > 0 ? 'text-blue-500' : 'text-slate-400'}`} size={24} />
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {pipelineValue > 0 ? 'القيمة المالية للمحفظة' : 'متوسط مبيعاتك الشهري'}
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        {fmt(pipelineValue > 0 ? pipelineValue : stats.avgMonthlyActual)}
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                        {pipelineValue > 0 ? 'للمشاريع النشطة في النظام حالياً' : 'بناءً على أدائك في الأشهر الماضية'}
                    </div>
                </div>

                {/* 6. الإغلاق المتوقع أو المتبقي للهدف */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm relative overflow-hidden group border-r-4 border-r-indigo-500">
                    <div className="flex items-center justify-between mb-4">
                        <Star className={`${weightedForecast > 0 ? 'text-indigo-500' : 'text-slate-400'}`} size={24} />
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {weightedForecast > 0 ? 'الإغلاق المتوقع (الموزون)' : 'المتبقي لتحقيق المستهدف'}
                        </div>
                    </div>
                    <div className={`text-3xl font-black mb-2 ${weightedForecast > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                        {fmt(weightedForecast > 0 ? weightedForecast : Math.max(0, target - currentActual))}
                    </div>
                    <div className="text-xs font-bold text-slate-400">
                        {weightedForecast > 0 ? 'بناءً على نسب نجاح إغلاق صفقاتك' : 'المبلغ المطلوب منك لإغلاق الشهر بنجاح'}
                    </div>
                </div>
            </div>
        </div>
    );
}
