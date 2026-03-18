import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PacingHeaderProps {
    userName: string;
    excelActual: number;
    excelTarget: number;
}

export default function PacingHeader({ userName, excelActual, excelTarget }: PacingHeaderProps) {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysElapsed = today.getDate();
    const daysRemaining = daysInMonth - daysElapsed;

    const timeProgress = (daysElapsed / daysInMonth) * 100;
    const achievementProgress = (excelActual / excelTarget) * 100;
    const isAhead = achievementProgress >= timeProgress;

    const firstName = userName.split(' ')[0];
    const hour = today.getHours();
    let greeting = 'صباح الخير';
    if (hour >= 12 && hour < 18) greeting = 'مساء الخير';
    else if (hour >= 18) greeting = 'مساء الأنوار';

    return (
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
            {/* Welcome Message */}
            <div className="flex-1 bg-white dark:bg-slate-900/50 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-200 dark:border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none" />
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                    {greeting} مهندس {firstName} 👋
                </h1>
                <p className="text-slate-500 dark:text-gray-400 font-bold mb-6">
                    إليك لمحة سريعة عن أدائك ومعدل إنجازك لهذا الشهر.
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${isAhead ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    {isAhead ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {isAhead ? 'أنت متقدم على جدولك الزمني لهذا الشهر!' : 'تحتاج إلى تسريع الإغلاق لتجاوز التارقت هذا الأسبوع.'}
                </div>
            </div>

            {/* Countdown / Pacing Card */}
            <div className="w-full md:w-80 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="flex justify-between items-start mb-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                        <Clock size={24} />
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">متبقي على نهاية الشهر</div>
                        <div className="text-3xl font-black">{daysRemaining} يوم</div>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex justify-between text-xs font-black">
                        <span>الوقت المنقضي</span>
                        <span>{Math.round(timeProgress)}%</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${timeProgress}%` }}
                            className="h-full bg-white rounded-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
