import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Clock, 
  ExternalLink, 
  MessageSquare,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { API_URL } from '../utils/apiConfig';
import { Link } from 'react-router-dom';

interface SlackMention {
  id: string;
  text: string;
  channel_id: string;
  message_ts: string;
  thread_ts?: string;
  created_at: string;
  is_read: boolean;
}

export default function SlackMentionsBox() {
  const { apiFetch, user } = useAuth();
  const { socket, connected } = useSocket();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchMentions = useCallback(async () => {
    try {
      const res = await apiFetch(API_URL('/api/slack/mentions/me?unreadOnly=false'));
      if (res.ok) {
        const data = await res.json();
        setMentions(data.slice(0, 5)); // Only show top 5 in the box
        setUnreadCount(data.filter((m: any) => !m.is_read).length);
      }
    } catch (err) {
      console.error('Error fetching Slack mentions:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const syncMentions = useCallback(async () => {
    try {
      await apiFetch(API_URL('/api/slack/sync-mentions'));
      fetchMentions();
    } catch (err) {
      console.error('Auto-sync error:', err);
    }
  }, [apiFetch, fetchMentions]);

  useEffect(() => {
    fetchMentions();
    // Initial sync
    syncMentions();

    // Auto-sync every 30 seconds
    const interval = setInterval(syncMentions, 30000);
    return () => clearInterval(interval);
  }, [fetchMentions, syncMentions]);

  // Real-time listener for socket notifications
  useEffect(() => {
    if (socket) {
      socket.on('new_mention', (newMention: SlackMention) => {
        setMentions(prev => [newMention, ...prev.slice(0, 4)]);
        setUnreadCount(prev => prev + 1);
      });
      // Also listen for general sync event
      socket.on('mentions_synced', () => {
        fetchMentions();
      });
      return () => { 
        socket.off('new_mention'); 
        socket.off('mentions_synced');
      };
    }
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
    } catch (err) { console.error('Error marking as read:', err); }
  };

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}د`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}س`;
    return `${Math.floor(diffInSeconds / 86400)}ي`;
  };

  return (
    <div className="glass-card flex flex-col h-full overflow-hidden border-purple-500/10 hover:border-purple-500/20 transition-all group/box">
      <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/[0.03] to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="text-purple-500" size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-['IBM_Plex_Sans_Arabic'] font-black text-slate-800 dark:text-white">تنبيهات Slack</h3>
          {connected && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" title="متصل مباشر" />}
        </div>
        <Link to="/slack-mentions" className="text-xs font-bold text-slate-400 hover:text-purple-500 flex items-center gap-1 transition-all">
          عرض الكل
          <ExternalLink size={12} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : mentions.length > 0 ? (
            <div className="space-y-1">
              {mentions.map((mention, idx) => (
                <motion.div
                  key={mention.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-white/[0.02] flex items-start gap-3 relative group/item ${!mention.is_read ? 'bg-purple-500/[0.02]' : ''}`}
                >
                  <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!mention.is_read ? 'bg-purple-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                    {mention.text.includes('<@U') ? <Zap size={14} /> : <MessageSquare size={14} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-400 truncate">#{mention.channel_id}</span>
                      <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Clock size={8} /> {getRelativeTime(mention.created_at)}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed truncate ${!mention.is_read ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                      {mention.text.replace(/<@U[A-Z0-9]+>/g, '@Mention')}
                    </p>
                  </div>

                  {!mention.is_read && (
                    <button 
                      onClick={(e) => markAsRead(mention.id, e)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1.5 bg-white dark:bg-slate-800 shadow-md rounded-lg text-green-500 hover:scale-110 transition-all"
                      title="تعليم كمقروء"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Bell size={24} className="text-slate-200 mb-2" />
              <div className="text-xs font-bold text-slate-400">لا توجد منشنات</div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 bg-slate-50/50 dark:bg-white/[0.01] border-t border-slate-100 dark:border-white/5">
        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-2">
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
            {connected ? 'متصل' : 'جارِ الاتصال...'}
          </div>
          <div>Sales Focus Slack Bot v1.2</div>
        </div>
      </div>
    </div>
  );
}
