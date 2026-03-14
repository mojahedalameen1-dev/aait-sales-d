import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Calendar, CheckCircle2, Menu, PlusCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';
import { API_URL } from '../utils/apiConfig';

export default function Topbar({ isMobile, setIsMobileOpen }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dueTodayDeals, setDueTodayDeals] = useState([]);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const textMuted = isDark ? '#4A5A82' : '#94A3B8';
  const border = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';

  useEffect(() => {
    const fetchTodayFollowups = async () => {
      try {
        const res = await fetch(API_URL('/api/clients'));
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            const today = new Date().toISOString().split('T')[0];

            const dueToday = data.filter(client => {
              if (!client.next_action_date) return false;
              // Check if it's strictly due today (or overdue compared to current local time, but mostly matching today's date)
              const nextAction = new Date(client.next_action_date).toISOString().split('T')[0];
              return nextAction === today;
            });

            setDueTodayDeals(dueToday);
          } else {
             console.warn('Topbar expected JSON from /api/clients, received:', contentType);
          }
        }
      } catch (err) {
        console.error('Error fetching today followups for topbar:', err);
      }
    };

    fetchTodayFollowups();
    const intervalId = setInterval(fetchTodayFollowups, 60000); // 1 min update
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="h-16 border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-[#0F1629]/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(true)}
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: textPrimary, cursor: 'pointer',
              marginRight: '-8px' // Align nicely with edge
            }}
            aria-label="فتح القائمة الجانبية"
          >
            <Menu size={24} />
          </button>
        )}
        {/* Could place breadcrumbs or page title here if needed */}
      </div>

      <div className="flex items-center gap-4 relative">
        {/* Quick Deal Button */}
        <button
          onClick={() => navigate('/clients/new')}
          className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-white border-none cursor-pointer font-['IBM_Plex_Sans_Arabic'] text-sm md:text-[15px] font-extrabold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
        >
          <PlusCircle size={20} className="shrink-0" />
          <span className="hidden sm:inline">إضافة صفقة سريعة</span>
        </button>

        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-800 dark:text-slate-200 cursor-pointer transition-colors duration-200"
          aria-label="عرض الإشعارات"
        >
          <Bell size={20} />
          {dueTodayDeals.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-[#0F1629]">
              {dueTodayDeals.length}
            </span>
          )}
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                top: '52px',
                left: 0,
                width: isMobile ? 'calc(100vw - 48px)' : '320px',
              }}
              className="absolute max-w-[320px] bg-white dark:bg-[#19243E] rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/5 overflow-hidden z-[100]"
            >
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                <h4 className="font-['IBM_Plex_Sans_Arabic'] text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0">الإشعارات والمتابعات</h4>
                <div className="bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-xs font-bold">
                  {dueTodayDeals.length} اليوم
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto p-2 custom-scrollbar">
                {dueTodayDeals.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-500 dark:text-slate-400">
                    <div className="bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">لا توجد متابعات اليوم</p>
                    <p className="text-xs m-0">أنت تسير بشكل ممتاز!</p>
                  </div>
                ) : (
                  dueTodayDeals.map(deal => (
                    <div
                      key={deal.id}
                      onClick={() => {
                        navigate('/pipeline');
                        setIsDropdownOpen(false);
                      }}
                      className="p-3 rounded-xl cursor-pointer flex gap-3 items-start transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-white/5 mb-1 group"
                    >
                      <div className="bg-red-500/10 text-red-500 p-2 rounded-full shrink-0 group-hover:bg-red-500/20 transition-colors">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{deal.client_name}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">يجب متابعة العميل اليوم!</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-500 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(deal.next_action_date)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {dueTodayDeals.length > 0 && (
                <div className="p-3 border-t border-slate-200 dark:border-white/5 text-center">
                  <button
                    onClick={() => { navigate('/pipeline'); setIsDropdownOpen(false); }}
                    className="bg-transparent border-none text-blue-500 hover:text-blue-600 dark:text-[#4F8EF7] dark:hover:text-[#7C3AED] text-[13px] font-bold cursor-pointer transition-colors"
                  >
                    عرض كل الصفقات في بورد التقفيل &larr;
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
