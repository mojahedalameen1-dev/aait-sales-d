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
import { useTheme } from '../context/ThemeContext';
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

const CHANNEL_NAMES: Record<string, string> = {
  C0910PDMU30: 'sales-team-followup',
  C0911HRQDC6: 'project-managers',
  C091X5UE6HE: 'sales-dev-sync',
};

const CHANNEL_COLORS: Record<string, string> = {
  C0910PDMU30: 'from-indigo-500 to-blue-400',
  C0911HRQDC6: 'from-emerald-500 to-teal-400',
  C091X5UE6HE: 'from-orange-500 to-amber-400',
  C09152K160H: 'from-blue-500 to-cyan-400',
  C09MUFV7GCB: 'from-pink-500 to-rose-400',
  C090S0EM43H: 'from-violet-500 to-purple-400',
};

// Parse Slack mrkdwn to readable text / JSX
function parseSlackText(text: string): React.ReactNode[] {
  if (!text) return [''];
  
  // Special handling for e.aait.sa links
  const ticketRegex = /(<https:\/\/e\.aait\.sa\/[^|>]+(\|[^>]+)?>)/g;
  
  const parts = text.split(/(<@U[A-Z0-9]+>|<https?:\/\/[^>]+>|\*[^*]+\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('<@U')) {
      return <span key={i} className="font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md text-[13px]">@مذكور</span>;
    }
    if (part.startsWith('<http')) {
      const url = part.slice(1, -1).split('|')[0];
      const label = part.slice(1, -1).split('|')[1];
      
      const isTicket = url.includes('e.aait.sa');
      const finalLabel = isTicket ? 'رابط التكت' : (label || 'رابط');
      
      return (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
          className={`${isTicket ? 'text-purple-400 font-black decoration-purple-500/30' : 'text-blue-400'} hover:underline underline-offset-4 inline-flex items-center gap-0.5`}>
          {finalLabel}<ArrowUpRight size={10} />
        </a>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-bold text-white">{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ar-EG', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true 
  }).replace('،', ' -');
}

function formatMentionCount(n: number): string {
  if (n === 0) return 'لا توجد منشنات';
  if (n === 1 || n === 2) return `${n} منشن`;
  if (n >= 3 && n <= 10) return `${n} منشنات`;
  return `${n} منشن`;
}

function TimelineChart({ data, isDark }: { data: { day: string; count: number }[]; isDark: boolean }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 5);
  const width = 800;
  const height = 120;
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (d.count / max) * height
  }));

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="relative w-full h-[140px] mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaD} fill="url(#chartGradient)"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
        />
        <motion.path
          d={pathD} fill="none" stroke="#8B5CF6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        {points.map((p, i) => (
          <motion.circle
            key={i} cx={p.x} cy={p.y} r="4"
            fill={isDark ? '#0F1629' : '#FFFFFF'} stroke="#8B5CF6" strokeWidth="2"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 1 + i * 0.05 }}
          />
        ))}
      </svg>
      <div className="flex justify-between mt-2 px-1">
        {data.filter((_, i) => i % 3 === 0).map((d, i) => (
          <span key={i} className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
            {new Date(d.day).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}

function ChannelActivityChart({ channels, isDark }: { channels: any[]; isDark: boolean }) {
  if (!channels?.length) return null;
  const max = Math.max(...channels.map(c => c.count), 1);
  return (
    <div className="space-y-5">
      {channels.slice(0, 4).map((ch, i) => {
        const pct = (ch.count / max) * 100;
        const color = Object.values(CHANNEL_COLORS)[i % 6];
        const name = CHANNEL_NAMES[ch.channel_id] || ch.channel_id;
        return (
          <div key={ch.channel_id} className="space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className={`font-black ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{name}</span>
              <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{ch.count}</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                className={`h-full bg-gradient-to-r ${color} rounded-full`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MentionCard({ mention, onMarkRead, idx }: { mention: SlackMention; onMarkRead: (id: string) => void; idx: number }) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const color = CHANNEL_COLORS[mention.channel_id] || 'from-slate-500 to-slate-600';
  const name = CHANNEL_NAMES[mention.channel_id] || mention.channel_id;
  const isLong = mention.text.length > 200;

  return (
    <motion.article
      key={mention.id}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: idx * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      className={`group relative rounded-2xl transition-all duration-300 ${
        mention.is_read
          ? isDark ? 'bg-white/[0.01] border border-white/5 hover:bg-white/[0.03]' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
          : isDark ? 'bg-white/[0.04] border border-white/10 hover:bg-white/[0.06] shadow-2xl shadow-black/20' : 'bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:border-purple-200'
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex gap-4">
          {/* Channel avatar */}
          <div className="hidden sm:flex flex-shrink-0">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg shadow-black/20`}>
              <Hash size={18} className="text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg bg-gradient-to-r ${color} text-white`}>
                  {name}
                </span>
                {!mention.is_read && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-amber-500 text-black rounded-full"
                  >
                    <Sparkles size={8} /> جديد
                  </motion.span>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock size={10} />
                  {formatFullDate(mention.created_at)}
                </span>
                <div className="flex items-center gap-2">
                  {!mention.is_read ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkRead(mention.id); }}
                      className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-black text-purple-400 hover:text-purple-300 transition-all px-2 py-1 rounded-lg hover:bg-white/5"
                    >
                      <Eye size={12} /> قراءة
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> تم الاطلاع
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className={`relative text-sm leading-7 ${isDark ? 'text-slate-300' : 'text-slate-600'} ${!expanded && isLong ? 'line-clamp-3' : ''}`}
              dir="auto">
              {parseSlackText(mention.text)}
            </div>

            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={`mt-3 flex items-center gap-1 text-[11px] font-bold transition-colors ${isDark ? 'text-slate-500 hover:text-purple-400' : 'text-slate-400 hover:text-purple-600'}`}
              >
                <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                {expanded ? 'طي الرسالة' : 'توسيع الرسالة'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function SlackMentionsPage() {
  const { isDark } = useTheme();
  const { apiFetch } = useAuth();
  const { socket, connected } = useSocket();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' | 'error' } | null>(null);
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
    fetchMentions(activeFilter).then(() => {
      setIsInitialLoaded(true);
      setLoading(false);
    });
    fetchStats();
    handleSync(true);
    syncIntervalRef.current = setInterval(() => handleSync(true), 45000); // Increased interval to reduce flicker
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [activeFilter, fetchMentions, fetchStats, handleSync]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_mention', (m: SlackMention) => {
      setMentions(prev => [m, ...prev]);
      showToast('🔔 لديك إشارة جديدة في Slack!', 'success');
      fetchStats();
    });
    socket.on('mentions_synced', () => { fetchMentions(activeFilter); fetchStats(); });
    return () => { socket.off('new_mention'); socket.off('mentions_synced'); };
  }, [socket, activeFilter, fetchMentions, fetchStats, showToast]);

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
    <div className="min-h-screen space-y-6 pb-20 px-4 sm:px-0" dir="rtl">

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
      <div className={`p-8 rounded-[40px] relative overflow-hidden transition-all duration-500 ${
        isDark ? 'bg-white/[0.02] border border-white/5' : 'bg-white border border-slate-200 shadow-2xl shadow-slate-200/40'
      }`}>
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-purple-500/30 group-hover:scale-105 transition-transform duration-500">
                <Bell size={32} className="text-white animate-bounce-slow" />
              </div>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-2 -left-2 w-7 h-7 bg-amber-500 text-black text-[11px] font-black rounded-full flex items-center justify-center border-4 border-white dark:border-[#0a0a0a]"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </div>
            <div>
              <h1 className={`text-3xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>صندوق الإشارات</h1>
              <div className="flex items-center gap-2">
                {connected ? (
                  <span className={`flex items-center gap-1.5 text-xs font-black ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> متصل بـ Slack
                  </span>
                ) : isInitialLoaded ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> وضع القراءة (تحديث تلقائي)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin" /> جاري المزامنة...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 text-xs font-black rounded-2xl transition-all ${
                  isDark ? 'text-slate-400 hover:text-white border border-white/5 hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
                }`}>
                <EyeOff size={16} /> قرأت الكل
              </button>
            )}
            <button
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-purple-600/20 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'يتم التحديث...' : 'تحديث البيانات'}
            </button>
          </div>
        </div>

        {/* ── Trend Chart Integration ── */}
        {stats?.trends && <TimelineChart data={stats.trends} isDark={isDark} />}
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الإشارات', value: totalCount, icon: <TrendingUp size={16}/>, color: 'purple' },
          { label: 'غير مقروء', value: unreadCount, icon: <AlertCircle size={16}/>, color: 'amber' },
          { label: 'نسبة الإنجاز', value: `${readRate}%`, icon: <Star size={16}/>, color: 'emerald' },
          { label: 'القنوات النشطة', value: stats?.topChannels.length || 0, icon: <Layers size={16}/>, color: 'blue' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`rounded-2xl p-5 backdrop-blur-3xl group transition-all ${
            isDark 
              ? 'bg-white/[0.01] border border-white/5 hover:bg-white/[0.03]' 
              : 'bg-white border border-slate-200 shadow-sm hover:border-purple-200 shadow-slate-200/50'
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${
              isDark ? `bg-${color}-500/10 text-${color}-400` : `bg-${color}-50 text-${color}-600`
            }`}>
              {icon}
            </div>
            <div className={`text-2xl font-black mb-1 tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</div>
            <div className="text-[11px] font-bold text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ── Main Content ── */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Controls */}
          <div className={`rounded-2xl p-3 flex flex-wrap items-center gap-3 ${
            isDark ? 'bg-white/[0.01] border border-white/5' : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className="flex gap-1">
              {FILTERS.map(f => (
                <button key={f.id} onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeFilter === f.id
                      ? isDark ? 'bg-white/10 text-white' : 'bg-white text-purple-600 shadow-sm ring-1 ring-slate-200'
                      : isDark ? 'text-slate-500 hover:text-white hover:bg-white/[0.03]' : 'text-slate-500 hover:text-purple-600 hover:bg-white/50'
                  }`}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[240px] relative">
              <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
              <input
                type="text" placeholder="ابحث في المنشنات..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                dir="rtl"
                className={`w-full text-xs rounded-xl pr-10 pl-4 py-3 outline-none transition-all ${
                  isDark 
                    ? 'bg-white/[0.02] border border-white/5 text-white focus:bg-white/[0.04]' 
                    : 'bg-slate-100 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-200'
                }`}
              />
            </div>
          </div>

          {/* List */}
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-white/[0.01] border border-white/5 animate-pulse" />
                ))
              ) : filtered.length > 0 ? (
                filtered.map((m, i) => (
                  <MentionCard key={m.id} mention={m} onMarkRead={markAsRead} idx={i} />
                ))
              ) : (
                <div className="rounded-3xl bg-white/[0.01] border border-dashed border-white/10 py-24 text-center max-w-md mx-auto">
                  <Bell size={40} className="text-slate-800 mx-auto mb-4" />
                  <p className="text-slate-500 font-bold">لا توجد نتائج مطابقة</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-purple-600/10 to-transparent border border-purple-500/10 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className={`text-xs font-black mb-4 tracking-widest uppercase flex items-center gap-2 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                <Activity size={14} /> موجز الحالة
              </h3>
              <div className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formatMentionCount(unreadCount)}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-bold">
                {unreadCount > 0 
                  ? 'لديك إشعارات معلقة تحتاج لمتابعة فورية' 
                  : 'لقد اطلعت على كافة الإشارات بنجاح'}
              </p>
            </div>
            <Activity className="absolute -right-6 -bottom-6 text-purple-500/5 rotate-12" size={140} />
          </div>

          {/* Channels */}
          {stats?.topChannels && stats.topChannels.length > 0 && (
            <div className={`rounded-3xl p-6 ${isDark ? 'bg-white/[0.01] border border-white/5' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <h3 className={`text-[11px] font-black mb-6 flex items-center gap-2 uppercase tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <Hash size={14} className={isDark ? 'text-slate-600' : 'text-slate-400'} /> القنوات الأكثر تأثيراً
              </h3>
              <ChannelActivityChart channels={stats.topChannels} isDark={isDark} />
            </div>
          )}

          {/* Activity Chart */}
          {stats?.hourlyDistribution && (
            <div className={`rounded-3xl p-6 ${isDark ? 'bg-white/[0.01] border border-white/5' : 'bg-white border border-slate-200 shadow-sm'}`}>
              <h3 className={`text-[11px] font-black mb-6 flex items-center gap-2 uppercase tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <BarChart3 size={14} className={isDark ? 'text-slate-600' : 'text-slate-400'} /> النشاط الساعي
              </h3>
              <div className="flex items-end gap-1 h-20">
                {Array.from({ length: 24 }, (_, h) => {
                  const data = stats.hourlyDistribution.find(x => x.hour === h);
                  const count = data?.count || 0;
                  const maxH = Math.max(...stats.hourlyDistribution.map(x => x.count), 1);
                  const pct = (count / maxH) * 100;
                  return (
                    <div key={h} className="flex-1 flex flex-col justify-end h-full group relative">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${count > 0 ? 'bg-purple-500/40 group-hover:bg-purple-400' : 'bg-white/5'}`}
                        style={{ height: `${Math.max(pct, 5)}%` }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] text-white opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 px-1 rounded-sm">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-3 text-[9px] font-black text-slate-700">
                <span>12ص</span><span>12م</span><span>11م</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
