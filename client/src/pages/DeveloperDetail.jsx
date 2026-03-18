import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { motion } from 'framer-motion';

const DeveloperDetail = () => {
    const { id } = useParams();
    const { apiFetch } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats');
    const [passwordModal, setPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const navigate = useNavigate();
    
    useEffect(() => {
        fetchDeveloperDetails();
    }, [id]);

    const fetchDeveloperDetails = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(API_URL(`/api/admin/developers/${id}`));
            const jsonData = await res.json();
            if (res.ok) {
                setData(jsonData);
            }
        } catch (err) {
            console.error('Fetch developer details error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async () => {
        try {
            const res = await apiFetch(API_URL(`/api/admin/developers/${id}/toggle-active`), {
                method: 'PATCH'
            });
            if (res.ok) {
                fetchDeveloperDetails();
            }
        } catch (err) {
            console.error('Toggle active error:', err);
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword) return;
        try {
            const res = await apiFetch(API_URL(`/api/admin/developers/${id}/reset-password`), {
                method: 'PATCH',
                body: JSON.stringify({ password: newPassword })
            });
            if (res.ok) {
                setPasswordModal(false);
                setNewPassword('');
                alert('تم تغيير كلمة المرور بنجاح');
            }
        } catch (err) {
            console.error('Reset password error:', err);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    if (!data) return <div className="text-center text-red-400 p-8 glass-card">المطوّر غير موجود</div>;

    const { 
        developer, 
        activityLogs = [], 
        clients = [], 
        deals = [], 
        proposals = [], 
        meetingPreps = [] 
    } = data;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}/${m}/${d}`;
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Breadcrumb & Navigation */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                    العودة للوحة التحكم
                </button>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">
                    تفاصيل مطوّر الأعمال: <span className="text-blue-500">{developer.full_name || developer.username}</span>
                </h1>
            </div>

            {/* Actions Bar */}
            <div className="flex gap-4">
                <button 
                    onClick={handleToggleActive}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        developer.is_active 
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' 
                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                    }`}
                >
                    {developer.is_active ? 'تعطيل الحساب' : 'تنشيط الحساب'}
                </button>
                <button 
                    onClick={() => setPasswordModal(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all"
                >
                    إعادة تعيين كلمة المرور
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2 pb-0.5">
                {[
                    { id: 'stats', label: 'إحصائيات' },
                    { id: 'clients', label: 'العملاء' },
                    { id: 'deals', label: 'الصفقات' },
                    { id: 'proposals', label: 'العروض الفنية' },
                    { id: 'meetingPreps', label: 'تحضير الاجتماعات' },
                    { id: 'activity', label: 'سجل النشاطات' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-black transition-all relative ${
                            activeTab === tab.id ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                        }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-8">
                    {activeTab === 'stats' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <MiniStatCard title="إجمالي العملاء" value={developer.client_count} color="blue" />
                                <MiniStatCard title="إجمالي الصفقات" value={developer.deal_count} color="purple" />
                                <MiniStatCard title="إجمالي المبيعات" value={`${(developer.total_sales || 0).toLocaleString()} ر.س`} color="green" />
                                <MiniStatCard title="نسبة الإغلاق" value={`${Math.round(developer.conversion_rate || 0)}%`} color="orange" />
                            </div>
                            
                            {/* Comparison placeholder or chart could go here */}
                            <div className="glass-card p-12 text-center text-slate-400 dark:text-gray-500 font-bold">
                                لا يوجد بيانات مقارنة كافية حالياً
                            </div>
                        </div>
                    )}

                    {activeTab === 'clients' && (
                        <div className="glass-card overflow-hidden">
                        <div className="p-4 bg-slate-50/50 dark:bg-white/2 flex justify-between items-center">
                                <h3 className="font-bold text-slate-900 dark:text-white">العملاء المرتبطين ({clients.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4 font-bold">العميل</th>
                                            <th className="px-6 py-4 font-bold text-center">القطاع</th>
                                            <th className="px-6 py-4 font-bold text-center">عدد الصفقات</th>
                                            <th className="px-6 py-4 font-bold text-center">المرحلة</th>
                                            <th className="px-6 py-4 font-bold">تاريخ الإضافة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="">
                                        {clients.map(client => (
                                            <tr key={client.id} className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all group">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{client.client_name}</td>
                                                <td className="px-6 py-4 text-center text-slate-500 dark:text-gray-400 font-medium">{client.sector || '-'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/5 text-blue-600 dark:text-blue-400 font-black text-xs">
                                                        {client.deals_count || 0}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        client.latest_stage === 'فاز' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                        client.latest_stage === 'خسر' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                                                        'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                        {client.latest_stage || 'جديد'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 dark:text-gray-500 font-mono text-xs">
                                                    {formatDate(client.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        {clients.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-12 text-center text-gray-500">لا يوجد عملاء حالياً</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'deals' && (
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 bg-white/2">
                                <h3 className="font-bold text-white">سجل الصفقات ({deals.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3">مسمى الصفقة</th>
                                            <th className="px-4 py-3">المرحلة</th>
                                            <th className="px-4 py-3">القيمة</th>
                                            <th className="px-4 py-3">آخر تحديث</th>
                                        </tr>
                                    </thead>
                                    <tbody className="">
                                        {deals.map(deal => (
                                            <tr key={deal.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white">{deal.deal_name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${
                                                        deal.stage === 'فاز' ? 'bg-emerald-500/10 text-emerald-400' : 
                                                        deal.stage === 'خسر' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                        {deal.stage}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-emerald-400">{(deal.expected_value || 0).toLocaleString()} ر.س</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                    {formatDate(deal.updated_at || deal.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                        {deals.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-12 text-center text-gray-500">لا يوجد صفقات حالياً</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {activeTab === 'proposals' && (
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 bg-white/2">
                                <h3 className="font-bold text-white">العروض الفنية ({proposals.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3">الرقم المرجعي</th>
                                            <th className="px-4 py-3">العميل</th>
                                            <th className="px-4 py-3">التاريخ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="">
                                        {proposals.map(prop => (
                                            <tr key={prop.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-blue-400 font-bold">{prop.proposal_id || prop.id}</td>
                                                <td className="px-4 py-3 text-white">{prop.client_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{formatDate(prop.created_at)}</td>
                                            </tr>
                                        ))}
                                        {proposals.length === 0 && (
                                            <tr><td colSpan="3" className="px-4 py-12 text-center text-gray-500">لا توجد عروض فنية</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'meetingPreps' && (
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 bg-white/2">
                                <h3 className="font-bold text-white">تحضير الاجتماعات ({meetingPreps.length})</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3">العميل</th>
                                            <th className="px-4 py-3">تاريخ التحضير</th>
                                        </tr>
                                    </thead>
                                    <tbody className="">
                                        {meetingPreps.map(prep => (
                                            <tr key={prep.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white">{prep.client_name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{formatDate(prep.created_at)}</td>
                                            </tr>
                                        ))}
                                        {meetingPreps.length === 0 && (
                                            <tr><td colSpan="2" className="px-4 py-12 text-center text-gray-500">لا يوجد تحضير اجتماعات</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="glass-card flex flex-col h-[600px]">
                            <div className="p-4 bg-white/2">
                                <h3 className="font-bold text-white flex items-center gap-2">سجل النشاطات الكامل</h3>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
                                {activityLogs.map((log, index) => {
                                    const isLogin = log.action_type?.includes('دخول') || false;
                                    const isClient = log.description?.includes('عميل') || false;
                                    const isDeal = (log.description?.includes('صفقة') || log.description?.includes('قيمة')) || false;
                                    
                                    return (
                                        <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            key={log.id} 
                                            className="p-4 rounded-xl bg-white/2 flex gap-4"
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                                isLogin ? 'bg-emerald-500/10 text-emerald-500' :
                                                isClient ? 'bg-blue-500/10 text-blue-500' :
                                                isDeal ? 'bg-purple-500/10 text-purple-500' : 
                                                'bg-gray-500/10 text-gray-500'
                                            }`}>
                                                {isLogin ? '🟢' : isClient ? '📋' : isDeal ? '💼' : '📝'}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-gray-500 font-mono tracking-tighter">
                                                        {formatDate(log.created_at)} | {new Date(log.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{log.action_type}</span>
                                                </div>
                                                <p className="text-sm text-gray-200">{log.description}</p>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {activityLogs.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">لا يوجد نشاطات مسجلة بعد</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Account Info */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <div className="flex items-center gap-3 pb-3">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl font-black">
                                {developer.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{developer.full_name || developer.username}</h4>
                                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-0.5">Business Developer</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <InfoRow label="اسم المستخدم" value={developer.username} />
                            <InfoRow label="تاريخ الانضمام" value={formatDate(developer.created_at)} />
                            <InfoRow label="آخر نشاط" value={developer.last_login_at ? `${formatDate(developer.last_login_at)} ${new Date(developer.last_login_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : 'لا يوجد'} />
                            <div className="flex justify-between items-center py-1">
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">الحالة</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${developer.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {developer.is_active ? 'نشط' : 'معطّل'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {passwordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card max-w-md w-full p-6 space-y-6 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white">إعادة تعيين كلمة المرور</h3>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold">كلمة المرور الجديدة</label>
                            <input 
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                placeholder="أدخل كلمة المرور الجديدة"
                            />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={handleResetPassword}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                حفظ التغييرات
                            </button>
                            <button 
                                onClick={() => setPasswordModal(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
                            >
                                إلغاء
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between items-center py-1">
        <span className="text-[11px] text-slate-400 dark:text-gray-500 font-black uppercase tracking-wider">{label}</span>
        <span className="text-sm text-slate-700 dark:text-gray-200 font-bold">{value}</span>
    </div>
);

const MiniStatCard = ({ title, value, color }) => {
    const colors = {
        blue: 'text-blue-500 bg-blue-500/5',
        purple: 'text-purple-500 bg-purple-500/5',
        green: 'text-emerald-500 bg-emerald-500/5',
        orange: 'text-orange-500 bg-orange-500/5'
    };
    return (
        <div className="glass-card p-6 flex flex-col items-center text-center group border-0">
            <span className="text-[10px] text-slate-500 dark:text-gray-500 uppercase font-black mb-2 tracking-[0.1em]">{title}</span>
            <span className={`text-2xl font-black tabular-nums ${colors[color].split(' ')[0]}`}>{value}</span>
            <div className={`mt-3 w-8 h-1 rounded-full ${colors[color].split(' ')[1]} opacity-0 group-hover:opacity-100 transition-all`} />
        </div>
    );
};

export default DeveloperDetail;
