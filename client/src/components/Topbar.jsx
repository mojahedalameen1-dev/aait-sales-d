import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, Calendar, CheckCircle2, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/formatDate';

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
        const res = await fetch('/api/clients');
        if (res.ok) {
          const data = await res.json();
          const today = new Date().toISOString().split('T')[0];
          
          const dueToday = data.filter(client => {
            if (!client.next_action_date) return false;
            // Check if it's strictly due today (or overdue compared to current local time, but mostly matching today's date)
            const nextAction = new Date(client.next_action_date).toISOString().split('T')[0];
            return nextAction === today;
          });
          
          setDueTodayDeals(dueToday);
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
    <div 
      style={{ 
        height: '64px',
        borderBottom: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: isDark ? 'rgba(15, 22, 41, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div className="flex items-center gap-2">
         {isMobile && (
           <button
             onClick={() => setIsMobileOpen(true)}
             style={{
               width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
               background: 'transparent', border: 'none', color: textPrimary, cursor: 'pointer',
               marginRight: '-8px' // Align nicely with edge
             }}
           >
             <Menu size={24} />
           </button>
         )}
         {/* Could place breadcrumbs or page title here if needed */}
      </div>

      <div className="flex items-center gap-4 relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          style={{
            position: 'relative',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
            border: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textPrimary,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => Object.assign(e.currentTarget.style, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' })}
          onMouseOut={(e) => Object.assign(e.currentTarget.style, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9' })}
        >
          <Bell size={20} />
          {dueTodayDeals.length > 0 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              backgroundColor: '#EF4444', color: '#fff',
              fontSize: '10px', fontWeight: 'bold',
              minWidth: '16px', height: '16px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px', border: `2px solid ${isDark ? '#0A0F1E' : '#FFFFFF'}`
            }}>
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
                position: 'absolute',
                top: '52px',
                left: 0, // In RTL context, "left" might mean standard left. Adjusting for layout.
                width: isMobile ? 'calc(100vw - 48px)' : '320px',
                maxWidth: '320px',
                background: isDark ? '#19243E' : '#FFFFFF',
                borderRadius: '16px',
                boxShadow: isDark ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.1)',
                border: `1px solid ${border}`,
                overflow: 'hidden',
                zIndex: 100
              }}
            >
              <div style={{ padding: '16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0 }}>الإشعارات والمتابعات</h4>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                  {dueTodayDeals.length} اليوم
                </div>
              </div>
              
              <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '8px' }} className="custom-scrollbar">
                {dueTodayDeals.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: textMuted }}>
                    <div style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFF', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                       <CheckCircle2 size={24} color="#10B981" />
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, margin: '0 0 4px 0' }}>لا توجد متابعات اليوم</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>أنت تسير بشكل ممتاز!</p>
                  </div>
                ) : (
                  dueTodayDeals.map(deal => (
                    <div 
                      key={deal.id}
                      onClick={() => {
                        navigate('/pipeline');
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        padding: '12px', borderRadius: '12px', cursor: 'pointer',
                        display: 'flex', gap: '12px', alignItems: 'flex-start',
                        transition: 'background 0.2s',
                        marginBottom: '4px'
                      }}
                      onMouseOver={(e) => Object.assign(e.currentTarget.style, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF' })}
                      onMouseOut={(e) => Object.assign(e.currentTarget.style, { backgroundColor: 'transparent' })}
                    >
                       <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '8px', borderRadius: '50%', flexShrink: 0 }}>
                          <AlertCircle size={16} />
                       </div>
                       <div>
                         <div style={{ fontSize: '14px', fontWeight: 700, color: textPrimary, marginBottom: '2px' }}>{deal.client_name}</div>
                         <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>يجب متابعة العميل اليوم!</div>
                         <div style={{ fontSize: '11px', color: textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                           <Calendar size={10} /> {formatDate(deal.next_action_date)}
                         </div>
                       </div>
                    </div>
                  ))
                )}
              </div>
              
              {dueTodayDeals.length > 0 && (
                <div style={{ padding: '12px', borderTop: `1px solid ${border}`, textAlign: 'center' }}>
                  <button 
                    onClick={() => { navigate('/pipeline'); setIsDropdownOpen(false); }}
                    style={{ background: 'transparent', border: 'none', color: '#4F8EF7', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
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
