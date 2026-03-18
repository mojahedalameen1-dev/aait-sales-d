import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Flame, Clock, PlusCircle, Zap, Presentation, ChevronRight, ChevronLeft, KanbanSquare, FileText, Target
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';
import { LogOut, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.svg';
import logoLight from '../assets/logo-light.svg';

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { to: '/pipeline', label: 'بورد التقفيل', icon: KanbanSquare },
  { to: '/proposals', label: 'العروض الفنية', icon: FileText },
  { to: '/global-target', label: 'التارقت العام', icon: Target },
  { to: '/meeting-preps', label: 'تحضير الاجتماعات', icon: Presentation },
];

const adminNavItems = [
  { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, exact: true },
  { to: '/admin/team', label: 'إدارة الفريق', icon: Users },
  { to: '/global-target', label: 'التارقت العام', icon: Target },
  { to: '/admin/settings', label: 'الإعدادات', icon: ShieldCheck },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobile, isMobileOpen, setIsMobileOpen }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, isAdmin, apiFetch } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [overdueDealsCount, setOverdueDealsCount] = useState(0);

  const dynamicNavItems = isAdmin ? [...adminNavItems] : [...navItems];

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      try {
        const res = await apiFetch(API_URL('/api/clients'));
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            const staleThreshold = new Date();
            staleThreshold.setDate(staleThreshold.getDate() - 5);

            let staleCount = 0;
            data.forEach(client => {
              if (client.stage === 'تفاوض') {
                const lastContact = client.last_contact_date ? new Date(client.last_contact_date) : new Date(client.created_at);
                if (lastContact < staleThreshold) {
                  staleCount++;
                }
              }
            });
            setOverdueDealsCount(staleCount);
          } else {
             console.warn('Sidebar expected JSON from /api/clients, received:', contentType);
          }
        }
      } catch (err) {
        console.error('Error fetching stats for sidebar:', err);
      }
    };
    fetchStats();

    // Refresh stats every minute just in case
    const intervalId = setInterval(fetchStats, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const bg = isDark ? '#0F1629' : '#FFFFFF';
  const borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';
  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textMuted = isDark ? '#4A5A82' : '#94A3B8';

  const sidebarWidth = isMobile ? '280px' : (isCollapsed ? '80px' : '280px');
  const actualCollapsed = isMobile ? false : isCollapsed;
  const transform = isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(100%)') : 'translateX(0)';

  return (
    <>
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90]"
          />
        )}
      </AnimatePresence>
      <aside
        className={`fixed right-0 top-0 bottom-0 z-[100] flex flex-col bg-white dark:bg-[#0F1629] transition-all duration-300 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.02)]`}
        style={{
          width: sidebarWidth,
          transform,
        }}
      >
        {/* Toggle Button - Redesigned to be floating and not overlap logo */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-24 -left-4 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-[#1E2D4A] text-slate-600 dark:text-slate-300 shadow-xl hover:text-blue-500 transition-all z-[110]"
            aria-label={actualCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
          >
            {actualCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        <div className={`transition-all duration-300 ${actualCollapsed ? 'pt-8 pb-8 px-4 flex justify-center' : 'pt-8 pb-8 px-4'}`}>
          <motion.div className="flex items-center gap-0.5">
            {/* Logo on the right (first child in RTL) */}
            <div className={`shrink-0 transition-all duration-300 ${actualCollapsed ? 'w-12 h-12' : 'w-20 h-20'}`}>
              <img 
                src={isDark ? logo : logoLight} 
                alt="Logo" 
                className="w-full h-full object-contain" 
              />
            </div>
            {!actualCollapsed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="flex flex-col items-start justify-center overflow-hidden"
              >
                <div className="font-['IBM_Plex_Sans_Arabic'] text-[18px] font-black text-slate-900 dark:text-white leading-none tracking-tight whitespace-nowrap">
                  تطوير <span className="text-[#06B6D4]">الأعمال</span>
                </div>
                <div className="font-['IBM_Plex_Sans_Arabic'] text-[9px] text-[#469d1a] dark:text-[#4ADE80] font-bold tracking-tight mt-1 whitespace-nowrap">
                  إدارة أوامر الشبكة
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {dynamicNavItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';

            return (
              <NavLink key={`${to}-${label}`} to={to} className="relative block group" aria-label={label}>
                <motion.div
                  onClick={() => { if (isMobile) setIsMobileOpen(false); }}
                  whileHover={{ x: actualCollapsed ? 0 : -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] direction-rtl font-['IBM_Plex_Sans_Arabic'] text-[15px] transition-all duration-300 relative z-10 ${isActive ? 'font-bold text-white shadow-lg shadow-blue-500/25' : 'font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'} ${actualCollapsed ? 'justify-center' : 'justify-start'}`}
                >
                  <Icon size={20} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100 group-hover:text-blue-500 transition-all'}`} aria-hidden="true" />
                  {!actualCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <motion.span initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} className="whitespace-nowrap">
                        {label}
                      </motion.span>

                      {to === '/pipeline' && overdueDealsCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center shadow-[0_2px_5px_rgba(239,68,68,0.4)]"
                          title="صفقات متأخرة يجب متابعتها"
                        >
                          {overdueDealsCount}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {isCollapsed && to === '/pipeline' && overdueDealsCount > 0 && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-[#0F1629]"
                      title={`${overdueDealsCount} صفقات متأخرة`}
                    />
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-[14px] -z-10 shadow-[0_4px_15px_rgba(14,165,233,0.35)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className={`transition-all duration-300 ${actualCollapsed ? 'p-4' : 'p-6'}`}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center bg-slate-100 dark:bg-slate-800/60 rounded-full p-1 cursor-pointer relative h-11 overflow-hidden"
            aria-label={isDark ? 'التبديل إلى الوضع المضيء' : 'التبديل إلى الوضع المظلم'}
          >
            {/* Background Slider */}
            <motion.div
              initial={false}
              animate={{
                x: actualCollapsed ? 0 : (isDark ? '0%' : '-100%'),
                width: actualCollapsed ? '100%' : '50%'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute h-[calc(100%-8px)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full right-1 z-0 shadow-sm"
            />

            {actualCollapsed ? (
              <div className="w-full flex justify-center z-10">
                <motion.span initial={false} animate={{ rotate: isDark ? 360 : 0 }} transition={{ duration: 0.5 }} className="text-lg">
                  {isDark ? '🌙' : '☀️'}
                </motion.span>
              </div>
            ) : (
              <div className="flex w-full relative z-10">
                <div className={`flex-1 flex items-center justify-center gap-2 py-1.5 transition-colors duration-300 ${isDark ? 'text-white' : 'text-slate-500'}`}>
                  <span className="text-sm">🌙</span>
                  <span className="font-['IBM_Plex_Sans_Arabic'] text-[13px] font-semibold">مظلم</span>
                </div>
                <div className={`flex-1 flex items-center justify-center gap-2 py-1.5 transition-colors duration-300 ${!isDark ? 'text-white' : 'text-slate-500'}`}>
                  <span className="text-sm">☀️</span>
                  <span className="font-['IBM_Plex_Sans_Arabic'] text-[13px] font-semibold">مضيء</span>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* User & Logout */}
        <div className={`mt-auto ${actualCollapsed ? 'p-4' : 'p-6'}`}>
          <div 
            className={`flex items-center gap-3 mb-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-2xl transition-all ${actualCollapsed ? 'justify-center' : ''}`}
            onClick={() => navigate('/profile')}
          >
             <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold overflow-hidden border border-blue-500/20">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl.startsWith('http') ? user.profileImageUrl : API_URL(user.profileImageUrl)} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (user?.fullName || user?.username || 'U').charAt(0).toUpperCase()
                )}
             </div>
             {!actualCollapsed && (
               <div className="overflow-hidden">
                 <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                   م {user?.fullName || user?.username}
                 </div>
                 <div className="text-[10px] text-slate-500 uppercase tracking-widest">{user?.role || (isAdmin ? 'مدير' : 'مطور أعمال')}</div>
               </div>
             )}
          </div>
          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-300 font-['IBM_Plex_Sans_Arabic'] ${actualCollapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={20} />
            {!actualCollapsed && <span className="font-bold">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
