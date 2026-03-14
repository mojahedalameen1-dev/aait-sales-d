import { NavLink, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Flame, Clock, PlusCircle, Zap, Presentation, ChevronRight, ChevronLeft, KanbanSquare, FileText, Target
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../utils/apiConfig';

const navItems = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { to: '/pipeline', label: 'بورد التقفيل', icon: KanbanSquare },
  { to: '/proposals', label: 'العروض الفنية', icon: FileText },
  { to: '/global-target', label: 'التارقت العام', icon: Target },
  { to: '/meeting-preps', label: 'تحضير الاجتماعات', icon: Presentation },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobile, isMobileOpen, setIsMobileOpen }) {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [overdueDealsCount, setOverdueDealsCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(API_URL('/api/clients'));
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
        className={`fixed right-0 top-0 bottom-0 z-[100] flex flex-col bg-white dark:bg-[#0F1629] border-l border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out`}
        style={{
          width: sidebarWidth,
          transform,
        }}
      >
        {/* Toggle Button */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute top-8 left-4 w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors z-10"
            aria-label={actualCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية'}
          >
            {actualCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}

        {/* Logo */}
        <div className={`transition-all duration-300 ${actualCollapsed ? 'pt-8 pb-6 px-4' : 'pt-8 pb-6 px-6'}`}>
          <motion.div className="flex items-center gap-3.5 rtl">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] flex items-center justify-center shadow-lg shadow-[#4F8EF7]/30 shrink-0" title="Sales Focus Logo">
              <Zap size={24} color="white" fill="white" />
            </div>
            {!actualCollapsed && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="font-['IBM_Plex_Sans_Arabic'] text-xl font-extrabold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                  Sales Focus
                </div>
                <div className="font-['IBM_Plex_Sans_Arabic'] text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap mt-0.5">
                  أداة المبيعات الذكية
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';

            return (
              <NavLink key={to} to={to} className="relative block group" aria-label={label}>
                <motion.div
                  onClick={() => { if (isMobile) setIsMobileOpen(false); }}
                  whileHover={{ x: actualCollapsed ? 0 : -4 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] direction-rtl font-['IBM_Plex_Sans_Arabic'] text-[15px] transition-all duration-300 relative z-10 ${isActive ? 'font-semibold text-white' : 'font-medium text-slate-600 dark:text-slate-400 group-hover:bg-slate-50 dark:group-hover:bg-white/5'} ${actualCollapsed ? 'justify-center' : 'justify-start'}`}
                >
                  <Icon size={20} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} aria-hidden="true" />
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
                      className="absolute inset-0 bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] rounded-[14px] -z-10 shadow-[0_4px_15px_rgba(79,142,247,0.35)]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className={`transition-all duration-300 border-t border-slate-200 dark:border-white/5 ${actualCollapsed ? 'p-4' : 'p-6'}`}>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-full p-1 cursor-pointer relative h-11 overflow-hidden"
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
              className="absolute h-[calc(100%-8px)] bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] rounded-full right-1 z-0 shadow-sm"
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
      </aside>
    </>
  );
}
