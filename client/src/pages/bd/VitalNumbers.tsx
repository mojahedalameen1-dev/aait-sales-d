import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CalendarCheck, TrendingUp, Award } from 'lucide-react';

interface VitalNumbersProps {
    monthActual: number;      // المحقق الحالي
    achievementRatio: number; // نسبة الإنجاز %
    ytdActual: number;       // تراكمي السنة
    bestMonthGap: number;    // الفجوة عن أفضل أداء
}

const fmt = (v: number) => (v || 0).toLocaleString('en-US');

export default function VitalNumbers({ monthActual, achievementRatio, ytdActual, bestMonthGap }: VitalNumbersProps) {
    const cards = [
        { label: 'المحقق هذا الشهر', value: fmt(monthActual), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        { label: 'نسبة تحقيق الهدف', value: `${Math.round(achievementRatio * 100)}%`, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'التراكمي السنوي', value: fmt(ytdActual), icon: Briefcase, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'الفجوة عن أفضل شهر', value: fmt(bestMonthGap), icon: CalendarCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, idx) => (
                <motion.div 
                    key={idx}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white dark:bg-slate-900/40 p-6 rounded-[28px] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow group"
                >
                    <div className={`w-12 h-12 ${card.bg} rounded-2xl flex items-center justify-center ${card.color} mb-4 group-hover:scale-110 transition-transform`}>
                        <card.icon size={24} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                        {card.value}
                    </div>
                    <div className="text-xs font-black text-slate-400 dark:text-gray-500">
                        {card.label}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
