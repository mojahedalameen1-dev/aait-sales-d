import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Clock, Hash, Zap, CheckCircle2, Radio, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { API_URL } from '../utils/apiConfig';
import { Link } from 'react-router-dom';

interface SlackMention {
  id: string;
  text: string;
  channel_id: string;
  message_ts: string;
  created_at: string;
  is_read: boolean;
}

const CHANNEL_NAMES: Record<string, string> = {
  C0910PDMU30: 'sales-team-followup',
  C0911HRQDC6: 'project-managers',
  C091X5UE6HE: 'sales-dev-sync',
};

const CHANNEL_COLORS: Record<string, string> = {
  C0910PDMU30: 'from-indigo-500 to-blue-500',
  C0911HRQDC6: 'from-emerald-500 to-teal-500',
  C091X5UE6HE: 'from-orange-500 to-amber-500',
  C09152K160H: 'from-blue-500 to-cyan-500',
  C09MUFV7GCB: 'from-pink-500 to-rose-500',
  C090S0EM43H: 'from-violet-500 to-purple-500',
};

function parseText(text: string) {
  // Special handling for e.aait.sa links
  const ticketRegex = /<(https:\/\/e\.aait\.sa\/[^|>]+)(\|[^>]+)?>/g;
  let parsed = text.replace(ticketRegex, '<a href="$1" target="_blank" class="text-purple-400 hover:underline font-bold">رابط التكت</a>');
  
  // Standard Slack link cleanup
  parsed = parsed
    .replace(/<@U[A-Z0-9]+>/g, '@مذكور')
    .replace(/<https?:\/\/[^|>]+\|([^>]+)>/g, '$1')
    .replace(/<https?:\/\/[^>]+>/g, 'رابط')
    .replace(/\*([^*]+)\*/g, '$1');

  return parsed;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ar-EG', { 
    day: 'numeric', 
    month: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true 
  }).replace('،', ' -');
}

export default function SlackMentionsBox() {
  const { apiFetch } = useAuth();
  const { socket, connected } = useSocket();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMentions = useCallback(async () => {
    try {
      const res = await apiFetch(API_URL('/api/slack/mentions/me'));
      if (res.ok) {
        const data = await res.json();
        setMentions(data.slice(0, 5));
        setUnreadCount(data.filter((m: SlackMention) => !m.is_read).length);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [apiFetch]);

  const syncMentions = useCallback(async (silent = true) => {
    if (!silent) setSyncing(true);
    try {
      await apiFetch(API_URL('/api/slack/sync-mentions'));
      fetchMentions();
    } catch { /* silent */ }
    finally { if (!silent) setSyncing(false); }
  }, [apiFetch, fetchMentions]);

  useEffect(() => {
    fetchMentions();
    syncMentions(true);
    intervalRef.current = setInterval(() => syncMentions(true), 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchMentions, syncMentions]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_mention', (m: SlackMention) => {
      setMentions(prev => [m, ...prev.slice(0, 4)]);
      setUnreadCount(prev => prev + 1);
    });
    socket.on('mentions_synced', fetchMentions);
    return () => { socket.off('new_mention'); socket.off('mentions_synced'); };
  }, [socket, fetchMentions]);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await apiFetch(API_URL(`/api/slack/mentions/${id}/read`), { method: 'PATCH' });
      if (res.ok) {
        setMentions(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl bg-white/[0.02] backdrop-blur-sm group/box transition-all">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bell size={15} className="text-white" />
            </div>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-amber-500 text-black text-[8px] font-black rounded-full flex items-center justify-center animate-bounce"
              >
                {unreadCount}
              </motion.span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-black text-white leading-none">تنبيهات Slack</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span className="text-[10px] text-slate-500">{connected ? 'مباشر' : 'غير متصل'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.preventDefault(); syncMentions(false); }}
            title="مزامنة الآن"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin text-purple-400' : ''} />
          </button>
          <Link to="/slack-mentions" className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-purple-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
            الكل <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : mentions.length > 0 ? (
            <div className="p-2 space-y-1">
              {mentions.map((mention, idx) => {
                const color = CHANNEL_COLORS[mention.channel_id] || 'from-slate-500 to-slate-600';
                const name = CHANNEL_NAMES[mention.channel_id] || mention.channel_id;
                return (
                  <motion.div
                    key={mention.id}
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`relative group/item flex items-start gap-3 px-3 py-3 rounded-xl transition-all cursor-default ${
                      mention.is_read
                        ? 'hover:bg-white/[0.03]'
                        : 'bg-white/[0.04] hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Unread dot */}
                    {!mention.is_read && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-purple-400" />
                    )}

                    {/* Channel icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
                      <Hash size={13} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <span className="text-[10px] font-black text-slate-400 truncate">
                          {name}
                        </span>
                        <span className="flex items-center gap-0.5 text-[9px] text-slate-600 flex-shrink-0 ml-1">
                          <Clock size={8} />
                          {formatDate(mention.created_at)}
                        </span>
                      </div>
                      <p 
                        className={`text-[12px] leading-snug line-clamp-2 ${mention.is_read ? 'text-slate-500' : 'text-slate-200 font-medium'}`}
                        dangerouslySetInnerHTML={{ __html: parseText(mention.text) }}
                      />
                    </div>

                    {/* Mark as read button */}
                    {!mention.is_read && (
                      <button
                        onClick={(e) => markAsRead(mention.id, e)}
                        className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 w-6 h-6 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                        title="تعليم كمقروء"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Bell size={18} className="text-slate-600" />
              </div>
              <p className="text-[12px] text-slate-600 font-bold">لا توجد إشارات</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5 flex justify-between items-center">
        <div className="flex items-center gap-1.5">
          <Radio size={9} className={connected ? 'text-emerald-400 animate-pulse' : 'text-slate-600'} />
          <span className="text-[9px] text-slate-600 font-bold">{connected ? 'متزامن' : 'انتظار...'}</span>
        </div>
        <span className="text-[9px] text-slate-700">Sales Focus · Slack</span>
      </div>
    </div>
  );
}
