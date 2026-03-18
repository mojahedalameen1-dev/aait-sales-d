import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const TeamManagement = () => {
    const { apiFetch, user: authUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ fullName: '', username: '', password: '', role: 'developer' });
    const [formError, setFormError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiFetch(API_URL('/api/admin/developers'));
            if (res.ok) {
                const data = await res.json();
                setUsers(Array.isArray(data) ? data : []);
            } else {
                setError('فشل في تحميل قائمة المطورين');
            }
        } catch (err) {
            console.error('Fetch developers error:', err);
            setError('حدث خطأ أثناء تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setFormError('');
        try {
            const res = await apiFetch(API_URL('/api/admin/developers'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setUsers([data.user, ...users]);
            setIsAddUserOpen(false);
            setNewUser({ fullName: '', username: '', password: '', role: 'developer' });
        } catch (err) {
            setFormError(err.message);
        }
    };

    const handleToggleUser = async (id) => {
        try {
            const res = await apiFetch(API_URL(`/api/admin/developers/${id}/toggle-active`), { method: 'PATCH' });
            if (res.ok) {
                setUsers(users.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
            }
        } catch (err) {
            console.error('Toggle user error:', err);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟ سيتم حذف جميع بياناته المرتبطة.')) return;
        try {
            const res = await apiFetch(API_URL(`/api/admin/developers/${id}`), { method: 'DELETE' });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            }
        } catch (err) {
            console.error('Delete user error:', err);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white font-['IBM_Plex_Sans_Arabic'] tracking-tight">إدارة الفريق</h1>
                    <p className="text-slate-500 dark:text-gray-400 mt-1.5 text-sm font-medium">إدارة حسابات مطوري الأعمال ومتابعة نشاطهم بكل سهولة</p>
                </div>
                <button 
                    onClick={() => setIsAddUserOpen(true)}
                    className="btn-primary"
                >
                    <PlusIcon />
                    إضافة مطوّر جديد
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-400 text-xs uppercase tracking-[0.1em] font-black">
                                <th className="px-8 py-5">المستخدم</th>
                                <th className="px-8 py-5 text-center">الدور الموظيفي</th>
                                <th className="px-8 py-5 text-center">الإجراءات والتحكم</th>
                            </tr>
                        </thead>
                        <tbody className="">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-blue-50/50 dark:hover:bg-white/5 transition-all group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black shadow-sm transition-transform group-hover:scale-110">
                                                {user.fullName?.charAt(0) || user.username.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{user.fullName || user.username}</div>
                                                <div className="text-xs text-slate-400 dark:text-gray-500 font-mono mt-0.5">@{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase ${
                                            user.role === 'admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                        }`}>
                                            {user.is_primary_admin ? 'مدير عام للنظام' : (user.role === 'admin' ? 'مدير ثاني (أدمن)' : 'مطوّر أعمال')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={() => navigate(`/admin/developer/${user.id}`)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-colors"
                                                title="عرض الملف الشخصي"
                                            >
                                                <ExternalLinkIcon />
                                            </button>
                                            
                                            {user.id !== authUser?.id && (authUser?.isPrimaryAdmin || user.role !== 'admin') && (
                                                <>
                                                    <button 
                                                        onClick={() => handleToggleUser(user.id)}
                                                        className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${user.is_active ? 'text-orange-400' : 'text-emerald-400'}`}
                                                        title={user.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}
                                                    >
                                                        {user.is_active ? <PauseIcon /> : <PlayIcon />}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-colors"
                                                        title="حذف الحساب"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            <AnimatePresence>
                {isAddUserOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAddUserOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md glass-card p-6 relative z-10"
                        >
                            <h3 className="text-xl font-bold text-white mb-6">إضافة عضو جديد للفريق</h3>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                {formError && (
                                    <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm text-center">
                                        {formError}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 block">الاسم الكامل</label>
                                    <input 
                                        type="text"
                                        value={newUser.fullName}
                                        onChange={(e) => setNewUser({...newUser, fullName: e.target.value})}
                                        className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        placeholder="الاسم الثلاثي"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 block">اسم المستخدم</label>
                                    <input 
                                        type="text"
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                                        className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        placeholder="اسم الدخول"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 block">كلمة المرور</label>
                                    <input 
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                        className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-400 block mb-1">الصلاحية</label>
                                    <select 
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        className="w-full bg-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
                                        required
                                    >
                                        <option value="developer">مطوّر أعمال</option>
                                        <option value="admin">مدير ثاني (أدمن)</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 mt-8">
                                    <button 
                                        type="submit"
                                        className="flex-1 btn-primary justify-center font-bold"
                                    >
                                        إضافة الحساب
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setIsAddUserOpen(false)}
                                        className="px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:bg-white/10 transition-colors"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Icons (same as in AdminDashboard for consistency)
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const ExternalLinkIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const TrashIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PauseIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlayIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default TeamManagement;
