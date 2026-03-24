import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Calendar, 
  Clock, 
  Filter, 
  Hash, 
  MessageSquare, 
  Search,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  PieChart,
  UserCheck,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { API_URL } from '../utils/apiConfig';

interface SlackMention {
  id: string;
  text: string;
  channel_id: string;
  message_ts: string;
  thread_ts?: string;
  created_at: string;
  is_read: boolean;
}

interface Stats {
  summary: { total: number; unread: number };
  trends: { day: string; count: number }[];
  topChannels: { channel_id: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
}

const filterOptions = [
  { id: 'all', label: 'الكل' },
  { id: 'unread', label: 'غير مقروء' },
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'custom', label: 'مخصص' }
];

export default function SlackMentionsPage() {
  const { apiFetch, user } = useAuth();
  const { socket, connected } = useSocket();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(API_URL('/api/slack/mentions/stats'));
      if (res.ok) setStats(await res.json());
    } catch (err) { console.error('Stats error:', err); }
  }, [apiFetch]);

  const fetchMentions = useCallback(async (filter: string, from?: string, to?: string) => {
    setLoading(true);
    try {
      let queryParams = '';
      if (filter === 'unread') {
        queryParams = '?unreadOnly=true';
      } else if (filter !== 'all') {
        const now = new Date();
        let fromDate = new Date();
        let toDate = new Date();

        if (filter === 'today') {
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
        } else if (filter === 'week') {
          fromDate.setDate(now.getDate() - 7);
        } else if (filter === 'custom' && from && to) {
          fromDate = new Date(from);
          toDate = new Date(to);
        }
        queryParams = `?fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`;
      }

      const res = await apiFetch(API_URL(`/api/slack/mentions/me${queryParams}`));
      if (res.ok) {
        setMentions(await res.json());
      }
    } catch (err) {
      console.error('Error fetching Slack mentions:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchMentions(activeFilter);
    fetchStats();
  }, [activeFilter, fetchMentions, fetchStats]);

  // Real-time listener
  useEffect(() => {
    if (socket) {
      socket.on('new_mention', (newMention: SlackMention) => {
        setMentions(prev => [newMention, ...prev]);
        setNotification('لديك منشن جديد في Slack!');
        fetchStats();
        setTimeout(() => setNotification(null), 5000);
      });
      return () => { socket.off('new_mention'); };
    }
  }, [socket, fetchStats]);

  const markAsRead = async (id: string) => {
    try {
      const res = await apiFetch(API_URL(`/api/slack/mentions/${id}/read`), { method: 'PATCH' });
      if (res.ok) {
        setMentions(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        fetchStats();
      }
    } catch (err) { console.error('Error marking as read:', err); }
  };

  const markAllAsRead = async () => {
    const unreadIds = mentions.filter(m => !m.is_read).map(m => m.id);
    for (const id of unreadIds) {
      await markAsRead(id);
    }
  };

  const filteredMentions = mentions.filter(m => 
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.channel_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `قبل ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 84600) return `قبل ${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `قبل ${Math.floor(diffInSeconds / 84600)} يوم`;
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Real-time Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-purple-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold"
          >
            <Zap className="animate-pulse" size={20} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <Bell className="text-purple-500" size={32} />
              صندوق المنشنات المتطور
            </h1>
            {connected && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-full border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                متصل مباشر
              </span>
            )}
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-2">نظام إدارة وتتبع الإشارات من Slack بلحظة وقوعها مع تحليلات ذكية.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={markAllAsRead} className="px-4 py-2 text-slate-500 hover:text-purple-500 text-sm font-bold transition-all">
            تم قراءة الكل
          </button>
          <button onClick={() => { fetchMentions(activeFilter); fetchStats(); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-sm font-bold transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-600"><TrendingUp size={20} /></div>
            <span className="text-xs font-bold text-slate-400">الإجمالي</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stats?.summary.total || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">إجمالي الإشارات المسجلة</div>
        </div>
        <div className="glass-card p-5 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600"><AlertCircle size={20} /></div>
            <span className="text-xs font-bold text-slate-400">غير مقروء</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">{stats?.summary.unread || 0}</div>
          <div className="text-[10px] text-slate-500 mt-1">تنتظر مراجعتك</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-600"><BarChart3 size={20} /></div>
            <span className="text-xs font-bold text-slate-400">النشاط الأسبوعي</span>
          </div>
          <div className="flex items-end gap-1 h-10 mt-2">
            {stats?.trends.slice(-7).map((t, i) => (
              <div key={i} className="flex-1 bg-blue-500/20 rounded-t-sm relative group" style={{ height: `${(t.count / (Math.max(...stats.trends.map(x => x.count)) || 1)) * 100}%` }}>
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-all">{t.count}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-green-500/20 rounded-lg text-green-600"><UserCheck size={20} /></div>
            <span className="text-xs font-bold text-slate-400">أكثر القنوات</span>
          </div>
          <div className="space-y-1.5 mt-2">
            {stats?.topChannels.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 truncate max-w-[80px]">#{c.channel_id}</span>
                <span className="font-bold text-green-600">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-4 flex flex-wrap items-center gap-2">
            <Filter size={18} className="text-slate-400 ml-2" />
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setActiveFilter(opt.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeFilter === opt.id 
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                    : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <div className="flex-1 min-w-[200px] relative ml-auto">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="بحث في المحتوى..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-purple-500/50 rounded-xl pr-10 py-2.5 outline-none transition-all"
              />
            </div>
          </div>

          <AnimatePresence>
            {activeFilter === 'custom' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <form onSubmit={(e) => { e.preventDefault(); fetchMentions('custom', customDates.from, customDates.to); }} className="glass-card p-4 flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-bold text-slate-500 block">من تاريخ</label>
                    <input type="date" value={customDates.from} onChange={(e) => setCustomDates({...customDates, from: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-2 outline-none" required />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-bold text-slate-500 block">إلى تاريخ</label>
                    <input type="date" value={customDates.to} onChange={(e) => setCustomDates({...customDates, to: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-4 py-2 outline-none" required />
                  </div>
                  <button type="submit" className="btn-primary h-[42px] px-8">تطبيق</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 glass-card animate-pulse" />)}</div>
            ) : filteredMentions.length > 0 ? (
              filteredMentions.map((mention, idx) => (
                <motion.div
                  key={mention.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className={`glass-card p-6 group relative overflow-hidden transition-all ${!mention.is_read ? 'border-r-4 border-r-purple-500 bg-purple-500/[0.02]' : ''}`}
                >
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 mt-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${!mention.is_read ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                        <Hash size={24} />
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                            <MessageSquare size={14} className="text-purple-500" />
                            {mention.channel_id}
                          </span>
                          {!mention.is_read && (
                            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded uppercase">جديد</span>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                            <Clock size={12} />
                            {getRelativeTime(mention.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100/50 dark:border-white/5 mb-3">
                        <p className="text-slate-700 dark:text-slate-300 leading-loose text-sm">
                          {mention.text.split(/(<@U[A-Z0-9]+>)/g).map((part, i) => 
                            part.startsWith('<@U') ? <span key={i} className="font-bold text-purple-500 bg-purple-500/10 px-1 rounded">@Mention</span> : part
                          )}
                        </p>
                      </div>

                      {!mention.is_read && (
                        <button onClick={() => markAsRead(mention.id)} className="flex items-center gap-2 text-[11px] font-bold text-purple-600 hover:text-purple-700 transition-colors">
                          <CheckCircle2 size={14} /> تم الاطلاع
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="glass-card p-20 text-center">
                <Bell size={40} className="mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-bold text-slate-400">لا توجد نتائج</h3>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-purple-600 text-white border-none shadow-xl shadow-purple-500/20 relative overflow-hidden">
            <Zap className="absolute -right-4 -bottom-4 text-white/10" size={120} />
            <h3 className="text-xl font-black mb-2 relative z-10">تحليلات ذكية</h3>
            <p className="text-white/80 text-xs leading-relaxed relative z-10">تتبع نشاطك على Slack وحلل أوقات ذروة التواصل لتحسين إنتاجيتك.</p>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold text-slate-700 dark:text-white mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-purple-500" /> توزيع الساعات
            </h3>
            <div className="space-y-3">
              {[8, 12, 16, 20].map(h => {
                const count = stats?.hourlyDistribution.find(x => x.hour === h)?.count || 0;
                const max = Math.max(...(stats?.hourlyDistribution.map(x => x.count) || [1]));
                return (
                  <div key={h} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-500">{h}:00</span>
                      <span className="text-purple-500">{count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${(count/max)*100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
