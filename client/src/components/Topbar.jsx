import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Calendar, CheckCircle2, Menu, PlusCircle, Hash, MessageSquare } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { formatDate } from '../utils/formatDate';
import { API_URL } from '../utils/apiConfig';
import playChime from '../utils/audioNotification';

export default function Topbar({ isMobile, setIsMobileOpen }) {
  const { isDark } = useTheme();
  const { apiFetch, user, isAdmin } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dueTodayDeals, setDueTodayDeals] = useState([]);
  const [slackUnread, setSlackUnread] = useState(0);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  
  const fetchCounts = useCallback(async () => {
    if (!user || isAdmin) return;
    try {
      // 1. Fetch Followups
      const clientRes = await apiFetch(API_URL('/api/clients'));
      if (clientRes.ok) {
        const data = await clientRes.json();
        const today = new Date().toISOString().split('T')[0];
        const dueToday = data.filter(client => {
          if (!client.next_action_date) return false;
          const nextAction = new Date(client.next_action_date).toISOString().split('T')[0];
          return nextAction === today;
        });
        setDueTodayDeals(dueToday);
      }

      // 2. Fetch Slack Mentions
      const slackRes = await apiFetch(API_URL('/api/slack/mentions/stats'));
      if (slackRes.ok) {
        const stats = await slackRes.json();
        setSlackUnread(stats.summary.unread || 0);
      }
    } catch (err) {
      console.error('Error fetching Topbar data:', err);
    }
  }, [user, isAdmin, apiFetch]);

  useEffect(() => {
    fetchCounts();
    const intervalId = setInterval(fetchCounts, 60000);
    return () => clearInterval(intervalId);
  }, [fetchCounts]);

  useEffect(() => {
    if (!socket || !user) return;
    
    const handleNewMention = () => {
      setSlackUnread(prev => prev + 1);
      playChime('mention'); // Added premium sound feedback
    };

    socket.on('new_mention', handleNewMention);
    socket.on('mentions_synced', fetchCounts);
    
    return () => {
      socket.off('new_mention', handleNewMention);
      socket.off('mentions_synced', fetchCounts);
    };
  }, [socket, user, fetchCounts]);

  const totalNotifications = dueTodayDeals.length + slackUnread;

  return (
    <div className="h-16 flex items-center justify-between px-4 md:px-6 bg-white/80 dark:bg-[#0F1629]/80 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300 shadow-sm">
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={() => setIsMobileOpen(true)}
            style={{
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', color: textPrimary, cursor: 'pointer',
              marginRight: '-8px'
            }}
            aria-label="فتح القائمة الجانبية"
          >
            <Menu size={24} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 relative">
        {!isAdmin && (
          <button
            onClick={() => navigate('/clients/new')}
            className="flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white border-none cursor-pointer font-['IBM_Plex_Sans_Arabic'] text-sm md:text-[15px] font-extrabold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            <PlusCircle size={20} className="shrink-0" />
            <span className="hidden sm:inline">إضافة صفقة سريعة</span>
          </button>
        )}

        {!isAdmin && (
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-slate-800 dark:text-slate-200 cursor-pointer transition-colors duration-200"
            aria-label="عرض الإشعارات"
          >
            <Bell size={20} />
            {totalNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-[#0F1629]">
                {totalNotifications}
              </span>
            )}
          </button>
        )}

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-[52px] left-0 w-[320px] bg-white dark:bg-[#19243E] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden z-[100]"
            >
              <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center">
                <h4 className="font-['IBM_Plex_Sans_Arabic'] text-[15px] font-extrabold text-slate-900 dark:text-slate-100 m-0">مركز التنبيهات</h4>
                <div className="bg-purple-500/10 text-purple-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                  {totalNotifications} جديد
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar space-y-1">
                {/* Slack Notifications Section */}
                {slackUnread > 0 && (
                  <div
                    onClick={() => { 
                      navigate('/slack-mentions'); 
                      setIsDropdownOpen(false);
                      setSlackUnread(0); // Clear local count on navigation
                    }}
                    className="p-3 rounded-xl cursor-pointer flex gap-3 items-start transition-all bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 mb-2 group"
                  >
                    <div className="bg-purple-500 text-white p-2 rounded-full shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-purple-600 dark:text-purple-400 mb-0.5">منشنات Slack جديدة</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">لديك {slackUnread} منشن جديد ينتظر ردك في Slack</div>
                    </div>
                  </div>
                )}

                {/* Due Today Section */}
                {dueTodayDeals.length === 0 && slackUnread === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-bold text-slate-400">لا توجد تنبيهات جديدة</p>
                  </div>
                ) : (
                  dueTodayDeals.map(deal => (
                    <div
                      key={deal.id}
                      onClick={() => { navigate('/pipeline'); setIsDropdownOpen(false); }}
                      className="p-3 rounded-xl cursor-pointer flex gap-3 items-start transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-white/5 group border border-transparent hover:border-slate-200 dark:hover:border-white/5"
                    >
                      <div className="bg-red-500/10 text-red-500 p-2 rounded-full shrink-0 group-hover:bg-red-500/20 transition-colors">
                        <AlertCircle size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-0.5">{deal.client_name}</div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mb-1">يجب متابعة العميل اليوم!</div>
                        <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(deal.next_action_date)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                <button
                  onClick={() => { navigate('/pipeline'); setIsDropdownOpen(false); }}
                  className="w-full py-2 text-blue-500 hover:text-blue-600 dark:text-[#4F8EF7] dark:hover:text-purple-400 text-xs font-black transition-colors"
                >
                  عرض كافة الصفقات والمتابعات &larr;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
