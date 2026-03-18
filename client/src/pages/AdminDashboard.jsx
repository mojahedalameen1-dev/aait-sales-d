import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Target, Trophy } from 'lucide-react';

const AdminDashboard = () => {
    const { apiFetch } = useAuth();
    const [stats, setStats] = useState(null);
    const [developers, setDevelopers] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const time = date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        return `${y}/${m}/${d} ${time}`;
    };

    const getActionIcon = (actionType) => {
        switch (actionType) {
            case 'login': return '🟢';
            case 'add_client': return '📋';
            case 'add_deal': return '💼';
            case 'update_stage': return '🎯';
            case 'proposal': return '📄';
            case 'meeting_prep': return '🤝';
            default: return '⚡';
        }
    };
    const navigate = useNavigate();

    useEffect(() => {
        fetchOverviewData();
    }, []);

    const fetchOverviewData = async () => {
        setLoading(true);
        try {
            const [statsRes, devsRes, activityRes] = await Promise.all([
                apiFetch(API_URL('/api/admin/stats')),
                apiFetch(API_URL('/api/admin/developers')),
                apiFetch(API_URL('/api/admin/activities'))
            ]);

            if (statsRes.ok) setStats(await statsRes.json());
            if (devsRes.ok) setDevelopers(await devsRes.json());
            if (activityRes.ok) setActivities(await activityRes.json());
        } catch (err) {
            console.error('Fetch overview error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            {/* KPI Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="إجمالي الإيرادات" 
                    value={`${(stats?.totalRevenue || 0).toLocaleString()} ر.س`} 
                    icon={<DollarSign size={24} />} 
                    color="green" 
                />
                <StatCard 
                    title="عملاء جدد" 
                    value={stats?.totalClients || 0} 
                    icon={<Users size={24} />} 
                    color="blue" 
                />
                <div onClick={() => navigate('/global-target')} className="cursor-pointer">
                    <StatCard 
                        title="صفقات نشطة" 
                        value={stats?.activeDeals || 0} 
                        icon={<Target size={24} />} 
                        color="orange" 
                    />
                </div>
                <StatCard 
                    title="نجم الشهر" 
                    value={stats?.bestDeveloper || 'جاري الحساب...'} 
                    icon={<Trophy size={24} />} 
                    color="purple" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Developers Comparison */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">أداء مطوري الأعمال</h2>
                        <button onClick={() => navigate('/admin/team')} className="text-blue-500 hover:text-blue-600 text-[13px] font-extrabold bg-blue-500/10 px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95">إدارة الفريق</button>
                    </div>
                    
                    <div className="glass-card overflow-hidden shadow-xl shadow-blue-500/5">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50/80 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-5 font-bold font-['IBM_Plex_Sans_Arabic']">المطور</th>
                                    <th className="px-6 py-5 font-bold font-['IBM_Plex_Sans_Arabic']">المبيعات</th>
                                    <th className="px-6 py-5 font-bold text-center font-['IBM_Plex_Sans_Arabic']">الصفقات</th>
                                    <th className="px-6 py-5 font-bold text-center font-['IBM_Plex_Sans_Arabic']">العملاء</th>
                                    <th className="px-6 py-5 font-bold text-center font-['IBM_Plex_Sans_Arabic']">الإنجاز</th>
                                </tr>
                            </thead>
                            <tbody className="">
                                {developers.slice(0, 5).map((dev) => (
                                    <tr key={dev.id} onClick={() => navigate(`/admin/developer/${dev.id}`)} className="hover:bg-blue-50/50 dark:hover:bg-white/5 cursor-pointer transition-colors group">
                                        <td className="px-6 py-5 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{dev.fullName || dev.username}</td>
                                        <td className="px-6 py-5 text-emerald-600 dark:text-emerald-400 font-extrabold tabular-nums">{(parseFloat(dev.total_sales) || 0).toLocaleString()} ر.س</td>
                                        <td className="px-6 py-5 text-center text-slate-600 dark:text-slate-300 font-bold tabular-nums">{dev.deal_count}</td>
                                        <td className="px-6 py-5 text-center text-slate-600 dark:text-slate-300 font-bold tabular-nums">{dev.client_count}</td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className={`text-xs font-black ${parseFloat(dev.conversion_rate) >= 50 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    {Math.round(dev.conversion_rate)}%
                                                </span>
                                                <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${parseFloat(dev.conversion_rate) >= 50 ? 'bg-emerald-500' : 'bg-amber-500'} transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]`} 
                                                        style={{ width: `${Math.min(dev.conversion_rate, 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Live Activity Feed */}
                <div className="space-y-4">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white px-2 tracking-tight">آخر النشاطات</h2>
                    <div className="glass-card p-2 space-y-1 max-h-[520px] overflow-y-auto custom-scrollbar shadow-xl shadow-blue-500/5">
                        {activities.length > 0 ? activities.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-4 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-all rounded-2xl group border-0">
                                <div className="shrink-0 w-11 h-11 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">
                                    {getActionIcon(activity.action_type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                                        <span className="text-blue-500 dark:text-blue-400 font-mono text-[10px] font-black tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg">
                                            {formatDate(activity.created_at)}
                                        </span>
                                        <span className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">{activity.userFullName}</span>
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 text-[13px] font-semibold leading-relaxed">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-3xl opacity-50">📡</div>
                                <p className="text-slate-500 dark:text-slate-400 font-bold">لا توجد نشاطات مؤخراً</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600 shadow-blue-500/20 text-blue-500 bg-blue-500',
        purple: 'from-purple-500 to-purple-600 shadow-purple-500/20 text-purple-500 bg-purple-500',
        green: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20 text-emerald-500 bg-emerald-500',
        orange: 'from-orange-500 to-orange-600 shadow-orange-500/20 text-orange-500 bg-orange-500'
    };

    return (
        <motion.div whileHover={{ y: -6, scale: 1.02 }} className="glass-card p-6 overflow-hidden relative group border-0 shadow-xl shadow-blue-500/5">
            {/* Background Accent */}
            <div className={`absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br ${colors[color].split(' ').slice(0,2).join(' ')} opacity-[0.05] dark:opacity-[0.1] rounded-full blur-2xl transition-all group-hover:scale-125`} />
            
            <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{title}</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">{value}</h3>
                </div>
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 shadow-lg ${colors[color].split(' ').pop().replace('bg-', 'bg-')}/10 ${colors[color].split(' ').pop().replace('bg-', 'text-')}`}>
                    {React.cloneElement(icon, { size: 24, strokeWidth: 2.5 })}
                </div>
            </div>
        </motion.div>
    );
};

export default AdminDashboard;
