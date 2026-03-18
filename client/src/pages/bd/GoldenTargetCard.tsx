import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, DollarSign } from 'lucide-react';

interface GoldenTargetCardProps {
    actual: number;
    target: number;
}

const fmt = (v: number) => v.toLocaleString('en-US') + ' ر.س';

export default function GoldenTargetCard({ actual, target }: GoldenTargetCardProps) {
    const pct = Math.min(100, (actual / target) * 100);
    const remaining = Math.max(0, target - actual);

    return (
        <div className="bg-white dark:bg-slate-900/40 rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-200 dark:border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-10 relative z-10">
                <div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <DollarSign size={14} /> التارقت الذهبي للشهر الحالي
                    </div>
                    <div className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-3">
                        {fmt(actual)}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-bold flex items-center gap-2 bg-slate-100/50 dark:bg-white/5 px-4 py-2 rounded-xl w-fit">
                        الهدف المطلوب: <span className="text-slate-900 dark:text-white font-black">{fmt(target)}</span>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl min-w-[240px] shadow-sm text-center border border-slate-100 dark:border-white/5">
                    <div className="text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tighter mb-1">
                        {fmt(remaining)}
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        متبقي لتحقيق الهدف
                    </div>
                </div>
            </div>

            {/* Glowing Professional Progress Bar */}
            <div className="relative h-6 bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden p-1 shadow-inner">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 rounded-full relative"
                    style={{ 
                        boxShadow: pct > 0 ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none'
                    }}
                >
                    <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                </motion.div>
            </div>
            
            <div className="flex justify-between items-center mt-5 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-slate-600 dark:text-slate-400">معدل الإنجاز: {Math.round(pct)}%</span>
                </div>
                <span className="text-xs font-black text-slate-500 dark:text-slate-400">المستهدف: 100%</span>
            </div>
        </div>
    );
}
