import { NavLink, useLocation } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Flame, Clock, PlusCircle, Zap, Presentation, ChevronRight, ChevronLeft, KanbanSquare, FileText, Target
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

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
        const res = await fetch('/api/clients');
        if (res.ok) {
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
            style={{
              position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(4px)'
            }}
          />
        )}
      </AnimatePresence>
      <aside
        style={{
          width: sidebarWidth,
          minHeight: '100vh',
          background: bg,
          borderLeft: `1px solid ${borderColor}`,
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          transform,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s, border-color 0.3s',
          overflow: 'hidden'
        }}
      >
        {/* Toggle Button */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              position: 'absolute',
              top: '32px',
              left: actualCollapsed ? '20px' : '20px',
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
              border: 'none',
              color: textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              transition: 'all 0.2s'
            }}
          >
            {actualCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        )}

        {/* Logo */}
        <div style={{ padding: actualCollapsed ? '32px 16px 24px' : '32px 24px 24px', transition: 'padding 0.3s' }}>
          <motion.div
            style={{ display: 'flex', alignItems: 'center', gap: '14px', direction: 'rtl' }}
          >
            <div
              style={{
                width: '48px', height: '48px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(79,142,247,0.3)',
                flexShrink: 0,
              }}
            >
              <Zap size={24} color="white" fill="white" />
            </div>
            {!actualCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                  Sales Focus
                </div>
                <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '12px', color: textMuted, marginTop: '1px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  أداة المبيعات الذكية
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map(({ to, label, icon: Icon, exact }) => {
            const isActive = exact ? location.pathname === to : location.pathname.startsWith(to) && to !== '/';

            return (
              <NavLink
                key={to}
                to={to}
                className="no-underline"
                style={{ position: 'relative', display: 'block' }}
              >
                <motion.div
                  onClick={() => { if (isMobile) setIsMobileOpen(false); }}
                  whileHover={{ x: actualCollapsed ? 0 : -4 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '13px 16px',
                    borderRadius: '14px',
                    direction: 'rtl',
                    fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    fontSize: '15px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#FFFFFF' : (isDark ? '#8B9CC8' : '#4A5570'),
                    transition: 'color 0.3s, padding 0.3s',
                    zIndex: 2,
                    position: 'relative',
                    justifyContent: actualCollapsed ? 'center' : 'flex-start'
                  }}
                >
                  <Icon size={20} style={{ opacity: isActive ? 1 : 0.7, flexShrink: 0 }} />
                  {!actualCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <motion.span
                        initial={{ opacity: 0, x: 5 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {label}
                      </motion.span>

                      {to === '/pipeline' && overdueDealsCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }}
                          style={{
                            background: '#EF4444', color: 'white', fontSize: '11px', fontWeight: 'bold',
                            padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                          }}
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
                      style={{
                        position: 'absolute', top: '8px', right: '8px', width: '10px', height: '10px',
                        background: '#EF4444', borderRadius: '50%', border: `2px solid ${isDark ? '#0A0F1E' : '#FFFFFF'}`
                      }}
                      title={`${overdueDealsCount} صفقات متأخرة`}
                    />
                  )}

                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(135deg, #4F8EF7 0%, #7C3AED 100%)',
                        borderRadius: '14px',
                        zIndex: -1,
                        boxShadow: '0 4px 15px rgba(79,142,247,0.35)',
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div style={{ padding: isCollapsed ? '16px' : '24px', borderTop: `1px solid ${borderColor}`, transition: 'padding 0.3s' }}>
          <button
            onClick={toggleTheme}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#F1F5F9',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              borderRadius: '50px',
              padding: '4px',
              cursor: 'pointer',
              position: 'relative',
              height: '44px',
              overflow: 'hidden'
            }}
          >
            {/* Background Slider */}
            <motion.div
              initial={false}
              animate={{
                x: actualCollapsed ? 0 : (isDark ? '0%' : '-100%'),
                width: actualCollapsed ? '100%' : '50%'
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute',
                height: 'calc(100% - 8px)',
                background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
                borderRadius: '50px',
                right: '4px',
                zIndex: 0
              }}
            />

            {actualCollapsed ? (
              <div style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 1 }}>
                <motion.span
                  initial={false}
                  animate={{ rotate: isDark ? 360 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ fontSize: '18px' }}
                >
                  {isDark ? '🌙' : '☀️'}
                </motion.span>
              </div>
            ) : (
              <div style={{ display: 'flex', width: '100%', position: 'relative', zIndex: 1 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: isDark ? '#fff' : textMuted, padding: '6px 0', transition: 'color 0.3s' }}>
                  <span style={{ fontSize: '14px' }}>🌙</span>
                  <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '13px', fontWeight: 600 }}>مظلم</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: !isDark ? '#fff' : textMuted, padding: '6px 0', transition: 'color 0.3s' }}>
                  <span style={{ fontSize: '14px' }}>☀️</span>
                  <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '13px', fontWeight: 600 }}>مضيء</span>
                </div>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
