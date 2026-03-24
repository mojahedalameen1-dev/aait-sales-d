import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Clock, Filter, Hash, MessageSquare, Search,
  AlertCircle, RefreshCw, CheckCircle2, TrendingUp, BarChart3,
  Zap, Radio, Inbox, Eye, EyeOff, ChevronDown, Star,
  Activity, Layers, ArrowUpRight, Sparkles
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

type FilterType = 'all' | 'unread' | 'today' | 'week' | 'custom';

const FILTERS: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'الكل', icon: <Inbox size={14} /> },
  { id: 'unread', label: 'غير مقروء', icon: <AlertCircle size={14} /> },
  { id: 'today', label: 'اليوم', icon: <Activity size={14} /> },
  { id: 'week', label: 'الأسبوع', icon: <BarChart3 size={14} /> },
  { id: 'custom', label: 'مخصص', icon: <Filter size={14} /> },
];

// Parse Slack mrkdwn to readable text / JSX
function parseSlackText(text: string): React.ReactNode[] {
  if (!text) return [''];
  const parts = text.split(/(<@U[A-Z0-9]+>|<https?:\/\/[^>]+>|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<@U')) {
      return <span key={i} className="font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md text-[13px]">@مذكور</span>;
    }
    if (part.startsWith('<http')) {
      const url = part.slice(1, -1).split('|')[0];
      const label = part.slice(1, -1).split('|')[1] || 'رابط';
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 inline-flex items-center gap-0.5">
          {label}<ArrowUpRight size={10} />
        </a>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-bold text-white">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function getRelativeTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دق`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`;
  return `قبل ${Math.floor(diff / 86400)} يوم`;
}

const CHANNEL_COLORS: Record<string, string> = {
  C09152K160H: 'from-blue-500 to-cyan-400',
  C0911HRQDC6: 'from-emerald-500 to-teal-400',
  C091X5UE6HE: 'from-orange-500 to-amber-400',
  C09MUFV7GCB: 'from-pink-500 to-rose-400',
  C090S0EM43H: 'from-violet-500 to-purple-400',
  C0910PDMU30: 'from-indigo-500 to-blue-400',
};

function MentionCard({ mention, onMarkRead, idx }: { mention: SlackMention; onMarkRead: (id: string) => void; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = CHANNEL_COLORS[mention.channel_id] || 'from-purple-500 to-indigo-400';
  const isLong = mention.text.length > 180;

  return (
    <motion.article
      key={mention.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: idx * 0.04, type: 'spring', stiffness: 260, damping: 22 }}
      className={`group relative rounded-2xl border transition-all duration-300 ${
        mention.is_read
          ? 'bg-white/[0.02] border-white/8 hover:bg-white/[0.04] hover:border-white/12'
          : 'bg-purple-500/[0.05] border-purple-500/25 hover:bg-purple-500/[0.08] shadow-lg shadow-purple-500/5'
      }`}
    >
      {/* Unread accent bar */}
      {!mention.is_read && (
        <div className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-purple-400 to-indigo-500" />
      )}

      <div className="p-5">
        <div className="flex gap-4">
          {/* Channel avatar */}
          <div className="flex-shrink-0">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
              <Hash size={18} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg bg-gradient-to-r ${color} text-white shadow-sm`}>
                  #{mention.channel_id.slice(-8)}
                </span>
                {!mention.is_read && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-amber-500 text-black rounded-full uppercase tracking-wider"
                  >
                    <Sparkles size={8} /> جديد
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-500 dark:text-slate-500 flex items-center gap-1">
                  <Clock size={10} />
                  {getRelativeTime(mention.created_at)}
                </span>
                {!mention.is_read ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkRead(mention.id); }}
                    className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-all px-2 py-1 rounded-lg hover:bg-purple-500/10"
                  >
                    <Eye size={12} /> قراءة
                  </button>
                ) : (
                  <span className="text-[10px] text-green-500/70 flex items-center gap-1">
                    <CheckCircle2 size={10} /> مقروء
                  </span>
                )}
              </div>
            </div>

            {/* Message body */}
            <div className={`relative text-sm leading-7 text-slate-300 dark:text-slate-300 ${!expanded && isLong ? 'line-clamp-3' : ''}`}
              dir="auto">
              {parseSlackText(mention.text)}
            </div>

            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-purple-400 transition-colors"
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {expanded ? 'عرض أقل' : 'عرض المزيد'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function SlackMentionsPage() {
  const { apiFetch } = useAuth();
  const { socket, connected } = useSocket();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [selectedMention, setSelectedMention] = useState<SlackMention | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await apiFetch(API_URL('/api/slack/mentions/stats'));
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, [apiFetch]);

  const fetchMentions = useCallback(async (filter: FilterType, from?: string, to?: string) => {
    setLoading(true);
    try {
      let q = '';
      const now = new Date();
      if (filter === 'unread') q = '?unreadOnly=true';
      else if (filter === 'today') {
        const s = new Date(now); s.setHours(0, 0, 0, 0);
        const e = new Date(now); e.setHours(23, 59, 59, 999);
        q = `?fromDate=${s.toISOString()}&toDate=${e.toISOString()}`;
      } else if (filter === 'week') {
        const s = new Date(now); s.setDate(now.getDate() - 7);
        q = `?fromDate=${s.toISOString()}&toDate=${now.toISOString()}`;
      } else if (filter === 'custom' && from && to) {
        q = `?fromDate=${new Date(from).toISOString()}&toDate=${new Date(to).toISOString()}`;
      }
      const res = await apiFetch(API_URL(`/api/slack/mentions/me${q}`));
      if (res.ok) setMentions(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [apiFetch]);

  const handleSync = useCallback(async (silent = false) => {
    if (!silent) setSyncing(true);
    try {
      const res = await apiFetch(API_URL('/api/slack/sync-mentions'));
      if (res.ok) {
        const data = await res.json();
        if (data.newMentions > 0) showToast(`✨ ${data.newMentions} منشن جديد وصل!`, 'success');
        fetchMentions(activeFilter);
        fetchStats();
      }
    } catch { /* silent */ }
    finally { if (!silent) setSyncing(false); }
  }, [apiFetch, fetchMentions, fetchStats, activeFilter, showToast]);

  useEffect(() => {
    fetchMentions(activeFilter);
    fetchStats();
    handleSync(true);
    syncIntervalRef.current = setInterval(() => handleSync(true), 60000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [activeFilter]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_mention', (m: SlackMention) => {
      setMentions(prev => [m, ...prev]);
      showToast('🔔 لديك إشارة جديدة في Slack!', 'success');
      fetchStats();
    });
    socket.on('mentions_synced', () => { fetchMentions(activeFilter); fetchStats(); });
    return () => { socket.off('new_mention'); socket.off('mentions_synced'); };
  }, [socket, activeFilter]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(API_URL(`/api/slack/mentions/${id}/read`), { method: 'PATCH' });
      if (res.ok) {
        setMentions(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        fetchStats();
      }
    } catch { /* silent */ }
  }, [apiFetch, fetchStats]);

  const markAllAsRead = useCallback(async () => {
    const unread = mentions.filter(m => !m.is_read);
    for (const m of unread) await markAsRead(m.id);
    showToast('تم تمييز الكل كمقروء ✓', 'success');
  }, [mentions, markAsRead, showToast]);

  const filtered = mentions.filter(m =>
    m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.channel_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const maxTrend = Math.max(...(stats?.trends.map(t => t.count) || [1]), 1);
  const unreadCount = stats?.summary.unread || 0;
  const totalCount = stats?.summary.total || 0;
  const readRate = totalCount > 0 ? Math.round(((totalCount - unreadCount) / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen space-y-6 pb-20" dir="rtl">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3 rounded-2xl font-bold text-sm backdrop-blur-xl shadow-2xl border ${
              toast.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300' :
              toast.type === 'error'   ? 'bg-red-900/80 border-red-500/30 text-red-300' :
                                         'bg-indigo-900/80 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <Zap size={16} className="animate-pulse" />
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Bell size={20} className="text-white" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-amber-500 text-black text-[9px] font-black rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">صندوق الإشارات</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {connected ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                    <Radio size={10} className="animate-pulse" /> مباشر
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500">غير متصل</span>
                )}
                <span className="text-slate-600">·</span>
                <span className="text-[11px] text-slate-500">{totalCount} إشارة إجمالية</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all hover:bg-white/5">
              <EyeOff size={14} /> قرأت الكل
            </button>
          )}
          <button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الإشارات', value: totalCount, icon: <TrendingUp size={16}/>, color: 'purple', sub: 'كل الوقت' },
          { label: 'غير مقروء', value: unreadCount, icon: <AlertCircle size={16}/>, color: 'amber', sub: 'يحتاج اهتماماً' },
          { label: 'نسبة القراءة', value: `${readRate}%`, icon: <Star size={16}/>, color: 'emerald', sub: 'من الإجمالي' },
          { label: 'القنوات النشطة', value: stats?.topChannels.length || 0, icon: <Layers size={16}/>, color: 'blue', sub: 'قناة' },
        ].map(({ label, value, icon, color, sub }) => (
          <div key={label} className={`relative overflow-hidden rounded-2xl p-5 border border-white/8 bg-white/[0.02] backdrop-blur-sm group hover:border-white/15 transition-all`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-${color}-500/5 to-transparent`} />
            <div className={`w-8 h-8 rounded-lg bg-${color}-500/15 flex items-center justify-center text-${color}-400 mb-3`}>
              {icon}
            </div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-[11px] font-bold text-white/50 mt-0.5">{label}</div>
            <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Left: Mentions Feed ── */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Filter + Search bar */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-sm p-3 flex flex-wrap items-center gap-2">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                  activeFilter === f.id
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                {f.icon} {f.label}
                {f.id === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded-full">{unreadCount}</span>
                )}
              </button>
            ))}
            <div className="flex-1 min-w-[180px] relative mr-auto">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" placeholder="ابحث في الرسائل..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm bg-white/5 border border-white/8 focus:border-purple-500/50 rounded-xl pr-9 py-2 outline-none text-white placeholder:text-slate-600 transition-all"
              />
            </div>
          </div>

          {/* Custom date range */}
          <AnimatePresence>
            {activeFilter === 'custom' && (
              <motion.form
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                onSubmit={e => { e.preventDefault(); fetchMentions('custom', customDates.from, customDates.to); }}
                className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 flex flex-wrap items-end gap-4 overflow-hidden"
              >
                {['from', 'to'].map(k => (
                  <div key={k} className="flex-1 min-w-[140px] space-y-1">
                    <label className="text-xs font-bold text-slate-500">{k === 'from' ? 'من' : 'إلى'}</label>
                    <input type="date" required
                      value={customDates[k as 'from' | 'to']}
                      onChange={e => setCustomDates(p => ({ ...p, [k]: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2 text-sm outline-none text-white" />
                  </div>
                ))}
                <button type="submit" className="h-10 px-8 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all">تطبيق</button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Mentions List */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-28 rounded-2xl bg-white/[0.03] border border-white/8 animate-pulse" />
                ))
              ) : filtered.length > 0 ? (
                filtered.map((m, i) => (
                  <MentionCard key={m.id} mention={m} onMarkRead={markAsRead} idx={i} />
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] py-20 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
                    <Bell size={24} className="text-slate-600" />
                  </div>
                  <p className="text-slate-500 font-bold">لا توجد إشارات في هذا الفلتر</p>
                  <p className="text-slate-600 text-sm">جرب "مزامنة الآن" لاستيراد الإشارات الجديدة</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right: Sidebar ── */}
        <div className="space-y-4">
          {/* Live status card */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-indigo-900/20 p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(139,92,246,0.15),transparent_60%)]" />
            <Zap className="absolute -right-4 -bottom-4 text-white/5" size={100} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Radio size={14} className="text-purple-400 animate-pulse" />
                <span className="text-xs font-bold text-purple-400">الحالة المباشرة</span>
              </div>
              <div className="text-2xl font-black text-white mb-1">
                {unreadCount > 0 ? `${unreadCount} إشارة` : 'لا جديد'}
              </div>
              <p className="text-xs text-white/40">
                {unreadCount > 0 ? 'تنتظر مراجعتك الآن' : 'أنت محدّث على كل شيء 🎉'}
              </p>
              {syncing && (
                <div className="mt-3 flex items-center gap-2 text-xs text-purple-400">
                  <RefreshCw size={10} className="animate-spin" /> جاري المزامنة...
                </div>
              )}
            </div>
          </div>

          {/* Top Channels */}
          {stats?.topChannels && stats.topChannels.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <Layers size={14} className="text-purple-400" /> أكثر القنوات نشاطاً
              </h3>
              <div className="space-y-3">
                {stats.topChannels.slice(0, 5).map((ch, i) => {
                  const pct = Math.round((ch.count / stats.topChannels[0].count) * 100);
                  const color = Object.values(CHANNEL_COLORS)[i % 6];
                  return (
                    <div key={ch.channel_id} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400 font-bold truncate">#{ch.channel_id.slice(-8)}</span>
                        <span className="text-white font-black">{ch.count}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.6 }}
                          className={`h-full bg-gradient-to-r ${color} rounded-full`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hourly activity mini chart */}
          {stats?.hourlyDistribution && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <Activity size={14} className="text-indigo-400" /> النشاط خلال اليوم
              </h3>
              <div className="flex items-end gap-1 h-14">
                {Array.from({ length: 24 }, (_, h) => {
                  const count = stats.hourlyDistribution.find(x => x.hour === h)?.count || 0;
                  const maxH = Math.max(...stats.hourlyDistribution.map(x => x.count), 1);
                  const pct = (count / maxH) * 100;
                  return (
                    <div key={h} title={`${h}:00 — ${count} إشارة`}
                      className="flex-1 group relative cursor-default">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${count > 0 ? 'bg-purple-500/60 group-hover:bg-purple-400' : 'bg-white/5'}`}
                        style={{ height: `${Math.max(pct, 4)}%` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] px-1.5 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-10">
                        {h}:00 · {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                <span>12م</span><span>6ص</span><span>12ص</span><span>6م</span><span>12م</span>
              </div>
            </div>
          )}

          {/* Trend mini sparkline */}
          {stats?.trends && stats.trends.length > 0 && (
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" /> الاتجاه الأسبوعي
              </h3>
              <div className="flex items-end gap-1.5 h-10">
                {stats.trends.slice(-7).map((t, i) => {
                  const pct = (t.count / maxTrend) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-emerald-500/30 hover:bg-emerald-400/50 rounded-t-sm transition-all cursor-default"
                        style={{ height: `${Math.max(pct, 8)}%` }}
                        title={`${t.day}: ${t.count}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[9px] text-slate-600">
                {stats.trends.slice(-7).map((t, i) => (
                  <span key={i}>{new Date(t.day).toLocaleDateString('ar', { weekday: 'narrow' })}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
