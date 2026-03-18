import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import logoLight from '../assets/logo-light.svg';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, error } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await login(username, password);
        setIsSubmitting(false);

        if (result.success) {
            if (result.isAdmin) {
                navigate('/admin');
            } else {
                navigate('/');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-[#020617] transition-colors duration-500">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50">
                <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-2xl bg-white dark:bg-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 text-slate-600 dark:text-yellow-400 hover:scale-110 active:scale-95 transition-all border border-slate-100 dark:border-white/10"
                >
                    {isDark ? <Sun size={24} /> : <Moon size={24} />}
                </button>
            </div>

            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 dark:bg-purple-500/10 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md glass-card p-8 relative z-10"
            >
                <div className="flex items-center justify-center gap-4 mb-8">
                    <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="shrink-0"
                    >
                        <img src={isDark ? logo : logoLight} alt="Logo" className="w-20 h-20 object-contain" />
                    </motion.div>
                    <div className="flex flex-col items-start text-right">
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5 tracking-tight">تطوير <span className="text-blue-500 dark:text-[#06B6D4]">الأعمال</span></h1>
                        <p className="text-emerald-500 dark:text-[#4ADE80] font-black text-xs uppercase tracking-widest">إدارة أوامر الشبكة</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-4 rounded-xl bg-red-500/10 text-red-400 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mr-1">اسم المستخدم</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-right shadow-inner border border-transparent dark:border-white/5"
                                placeholder="أدخل اسم المستخدم"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-gray-500 mr-1">كلمة المرور</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-white/5 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-right shadow-inner border border-transparent dark:border-white/5"
                                placeholder="••••••••"
                                required
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/20">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full btn-primary justify-center relative overflow-hidden group py-4 h-14"
                    >
                        {isSubmitting ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <span className="flex items-center gap-2">
                                دخول للنظام
                                <svg className="w-5 h-5 transform rotate-180 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </span>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center text-slate-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    &copy; {new Date().getFullYear()} تطوير الأعمال. جميع الحقوق محفوظة
                </div>
            </motion.div>
        </div>
    );
};

export default LoginPage;
