import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft } from 'lucide-react';

interface SaleRecord {
    amount: number;
    client: string;
    date: string;
}

interface RecentSalesProps {
    sales: SaleRecord[];
    developerName: string;
    monthName: string;
}

const fmt = (v: number) => (v || 0).toLocaleString('en-US') + ' ر.س';

export default function RecentSales({ sales, developerName, monthName }: RecentSalesProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2 px-2">
                <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
                    <ShoppingBag size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    مبيعات م {developerName} لشهر {monthName}
                </h2>
            </div>

            <div className="bg-white dark:bg-slate-900/40 rounded-[32px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <th className="px-8 py-4">التاريخ</th>
                            <th className="px-8 py-4">العميل</th>
                            <th className="px-8 py-4 text-center">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {sales.length > 0 ? sales.map((sale, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-5 text-xs font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                                    {sale.date || 'N/A'}
                                </td>
                                <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-white">
                                    {sale.client}
                                </td>
                                <td className="px-8 py-5 text-center">
                                    <div className="inline-block px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-xl text-sm font-black tabular-nums">
                                        {fmt(sale.amount)}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="px-8 py-12 text-center text-slate-500 font-bold">
                                    لا توجد مبيعات مسجلة لهذا الشهر حتى الآن.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
