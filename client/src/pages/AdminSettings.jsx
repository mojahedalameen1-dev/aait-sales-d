import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const AdminSettings = () => {
    const { user, apiFetch } = useAuth();
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'كلمات المرور الجديدة غير متطابقة' });
            return;
        }
        setLoading(true);
        setMessage({ type: '', text: '' });
        try {
            // Placeholder for admin password change logic
            // Assuming we use the same reset-password endpoint or a specialized one
            // For now, it's just a UI placeholder
            setTimeout(() => {
                setMessage({ type: 'success', text: 'تم تحديث الإعدادات بنجاح (تجريبي)' });
                setLoading(false);
                setPasswords({ current: '', new: '', confirm: '' });
            }, 1000);
        } catch (err) {
            setMessage({ type: 'error', text: 'فشل تحديث الإعدادات' });
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-12">
            <h1 className="text-2xl font-bold text-white mb-8">إعدادات النظام</h1>
            
            <div className="glass-card p-6 space-y-6">
                <div className="flex items-center gap-2 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white">تغيير كلمة مرور المدير</h2>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    {message.text && (
                        <div className={`p-4 rounded-xl shadow-lg ${message.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            {message.text}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">كلمة المرور الحالية</label>
                                <input 
                                    type="password" 
                                    value={passwords.current}
                                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                                    className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">كلمة المرور الجديدة</label>
                                <input 
                                    type="password" 
                                    value={passwords.new}
                                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                    className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">تأكيد كلمة المرور الجديدة</label>
                                <input 
                                    type="password" 
                                    value={passwords.confirm}
                                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                    className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
                                />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all mt-4"
                    >
                        {loading ? 'جاري التحميل...' : 'تحديث كلمة المرور'}
                    </button>
                </form>
            </div>

            <div className="glass-card p-6 bg-transparent">
                <p className="text-center text-gray-500 text-sm italic">
                    إعدادات النظام الإضافية قيد التطوير...
                </p>
            </div>
        </div>
    );
};

export default AdminSettings;
