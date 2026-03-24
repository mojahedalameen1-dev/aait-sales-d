import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hash, MessageSquare, Clock, ExternalLink, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../utils/apiConfig';

interface SlackMention {
  id: string;
  text: string;
  channel_id: string;
  message_ts: string;
  thread_ts?: string;
  created_at: string;
}

export default function SlackMentionsBox() {
  const { apiFetch } = useAuth();
  const [mentions, setMentions] = useState<SlackMention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentions = async () => {
      try {
        const res = await apiFetch(API_URL('/api/slack/mentions/me'));
        if (res.ok) {
          const data = await res.json();
          setMentions(data);
        }
      } catch (err) {
        console.error('Error fetching Slack mentions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMentions();
    // Refresh every 2 minutes
    const interval = setInterval(fetchMentions, 120000);
    return () => clearInterval(interval);
  }, [apiFetch]);

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `قبل ${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `قبل ${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `قبل ${Math.floor(diffInSeconds / 86400)} يوم`;
  };

  if (loading && mentions.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 animate-pulse">
        <div className="h-6 w-48 bg-white/20 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/10 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl"
    >
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-purple-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Bell size={20} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">منشنات Slack الموجهة لك</h2>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
          {mentions.length} منشن
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {mentions.length > 0 ? (
            mentions.map((mention, index) => (
              <motion.div
                key={mention.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                      <Hash size={18} />
                    </div>
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <MessageSquare size={14} className="text-purple-500" />
                        {mention.channel_id}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        {getRelativeTime(mention.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed bg-slate-50/50 dark:bg-slate-800/20 p-2 rounded-lg border border-slate-100/50 dark:border-slate-700/30">
                      {mention.text.replace(/<@U[A-Z0-9]+>/g, '').trim()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Bell size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">لا توجد منشنات جديدة حالياً</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="p-3 bg-slate-50 dark:bg-slate-800/30 text-center">
        <button className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline flex items-center gap-1 mx-auto">
          مشاهدة الكل في Slack <ExternalLink size={12} />
        </button>
      </div>
    </motion.div>
  );
}
