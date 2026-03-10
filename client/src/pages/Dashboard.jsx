import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Flame, Wallet, TrendingUp, Calendar, ArrowUpRight, CheckCircle2, ChevronLeft, Zap, PlusCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { formatSAR } from '../utils/formatSAR';
import { formatDate, isToday, isOverdue, daysDiff } from '../utils/formatDate';
import { getScoreLabel, getAvatarColor, getSectorColor } from '../utils/scoreColor';
import ScoreRing from '../components/ScoreRing';
import SkeletonLoader from '../components/SkeletonLoader';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { isDark } = useTheme();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const textMuted = isDark ? '#4A5A82' : '#94A3B8';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';

  // Default targets from local DB or constants
  const [targets, setTargets] = useState({ monthly: 114380, yearly: 460620 });
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState('');

  const [monthlyTarget, setMonthlyTarget] = useState(() => {
    return parseInt(localStorage.getItem('monthlyTarget')) || parseInt(targets.monthly) || 115000;
  });
  const [targetInput, setTargetInput] = useState(monthlyTarget);

  const currentMonthName = new Date().toLocaleString('ar-SA', { month: 'long' });

  useEffect(() => {
    fetchData();
    const stored = localStorage.getItem('mix_sales_targets');
    if (stored) setTargets(JSON.parse(stored));
  }, []);

  async function fetchData() {
    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch('/api/dashboard/stats').then(r => r.json()),
        fetch('/api/clients').then(r => r.json())
      ]);
      setStats(statsRes);
      setClients(clientsRes);
    } catch (e) {
      addToast('خطأ في تحميل بيانات لوحة القيادة', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function markContacted(clientId) {
    try {
      await fetch(`/api/clients/${clientId}/contacted`, { method: 'PATCH' });
      addToast('تم تسجيل التواصل بنجاح ✓', 'success');
      fetchData(); // Refresh all data
    } catch (e) {
      addToast('خطأ في التحديث', 'error');
    }
  }

  if (loading || !stats) {
    return <SkeletonLoader type="dashboard" />;
  }

  // Derive metrics straight from the backend stats object
  const {
    totalClients,
    hotClientsCount,
    activeValue,
    targetProgress,
    weightedActiveValue,
    topActiveToClose = [],
    todayFollowups = [],
    topHotClients = [],
    todayAddedValue
  } = stats;

  const targetPercentage = targets.monthly > 0 ? Math.round(Math.min(100, ((targetProgress || 0) / targets.monthly) * 100)) : 0;
  const totalForecast = (targetProgress || 0) + (weightedActiveValue || 0);
  const targetGap = Math.max(0, targets.monthly - totalForecast);


  const StatCard = ({ label, value, icon: Icon, color, isText }) => (
    <motion.div
      variants={item}
      whileHover={{ y: -6, boxShadow: `0 12px 30px ${color}15` }}
      className="glass-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: '-10px', left: '-10px', width: '80px', height: '80px',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        zIndex: 0
      }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '14px',
          background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: color,
        }}>
          <Icon size={24} />
        </div>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={16} color={color} />
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '13px', color: textSecondary, fontWeight: 500 }}>{label}</div>
        <div style={{
          fontFamily: "'IBM Plex Sans Arabic', sans-serif",
          fontSize: isText ? '20px' : '32px',
          fontWeight: 800,
          color: textPrimary,
          marginTop: '4px',
          letterSpacing: isText ? '0' : '-1px'
        }}>
          {value}
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      style={{ direction: 'rtl' }}
    >
      {/* Header */}
      <motion.header variants={item} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '32px', fontWeight: 800, color: textPrimary, letterSpacing: '-0.5px' }}>
          مرحباً بك في لوحة التحكم 👋
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginTop: '4px' }}>
          إليك ملخص سريع لنشاط مبيعاتك وأداء العملاء لليوم
        </p>
      </motion.header>

      {/* Target Progress Section */}
      <motion.div variants={item} className="glass-card" style={{ padding: '24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-10">
          <div>
            <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎯 التارجت الشهري
            </h2>
            <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', color: textSecondary, marginTop: '4px' }}>
              متابعة هدف المبيعات لهذا الشهر
            </p>
          </div>
          <div className="text-right md:text-left flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            {isEditingTarget ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  className="form-input"
                  style={{ width: '120px', padding: '4px 8px', fontSize: '14px', textAlign: 'center' }}
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseInt(targetInput) || 500000;
                    setMonthlyTarget(val);
                    localStorage.setItem('monthlyTarget', val);
                    setIsEditingTarget(false);
                  }}
                  className="btn-primary"
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >حفظ</button>
              </div>
            ) : monthlyTarget > 0 ? (
              <div style={{ cursor: 'pointer' }} onClick={() => setIsEditingTarget(true)} title="انقر لتعديل الهدف شهري">
                <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '24px', fontWeight: 900, color: '#10B981' }}>
                  {formatSAR(targetProgress)} <span style={{ fontSize: '14px', color: textMuted, fontWeight: 500 }}>/ {formatSAR(monthlyTarget)}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 600, color: textSecondary }}>
                  🎯 حدد تارجتك الشهري للبدء
                </span>
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', border: 'none' }}
                >
                  تحديد التارجت
                </button>
              </div>
            )}
            <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 700, color: textPrimary, marginTop: '4px' }}>
              نسبة الإنجاز: {targetPercentage}%
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div style={{ width: '100%', height: '12px', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(targetPercentage, 100)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: targetPercentage >= 100
                ? 'linear-gradient(90deg, #10B981, #34D399)'
                : 'linear-gradient(90deg, #4F8EF7, #7C3AED)',
              borderRadius: '10px',
              position: 'relative'
            }}
          >
            {/* Shimmer Effect */}
            <div className="shimmer" style={{ width: '100%', height: '100%', opacity: 0.5 }}></div>
          </motion.div>
        </div>
      </motion.div>

      {/* Forecasting Analysis Section */}
      <motion.div variants={item} className="glass-card" style={{ padding: '24px', marginBottom: '24px', border: `1px solid ${border}`, background: isDark ? 'rgba(30, 45, 74, 0.4)' : 'rgba(255, 255, 255, 0.5)' }}>
        <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📈 التحليل التنبؤي لإغلاق الصفقات
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div style={{ padding: '16px', borderRadius: '14px', background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', border: '1px solid #10B98155' }}>
            <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 600, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>الإيراد المحقق (الدفعة الأولى)</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>{formatSAR(targetProgress)}</div>
          </div>
          <div style={{ padding: '16px', borderRadius: '14px', background: isDark ? 'rgba(79, 142, 247, 0.1)' : '#EFF6FF', border: '1px solid #4F8EF755' }}>
            <div style={{ fontSize: '13px', color: textSecondary, fontWeight: 600, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>الإيراد المتوقع إضافته</div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#4F8EF7', marginTop: '4px' }}>{formatSAR(weightedActiveValue)}</div>
          </div>
        </div>

        {/* Recommendation Engine Message */}
        <div className="flex flex-col sm:flex-row gap-4 items-start p-5 rounded-2xl" style={{ background: targetGap <= 0 ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5') : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7') }}>
          <div style={{ background: targetGap <= 0 ? '#10B981' : '#F59E0B', color: 'white', padding: '8px', borderRadius: '50%' }}>
            {targetGap <= 0 ? <CheckCircle2 size={24} /> : <Zap size={24} />}
          </div>
          <div>
            <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '16px', fontWeight: 800, color: targetGap <= 0 ? '#047857' : '#B45309', marginBottom: '6px' }}>
              {targetGap <= 0 ? 'نجاح إستراتيجي' : 'توصية الذكاء الاصطناعي'}
            </h3>
            <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', lineHeight: '1.6', color: isDark ? '#E2E8F0' : '#1E293B', fontWeight: 500 }}>
              {targetGap <= 0
                ? "مسارك ممتاز! الصفقات الحالية تكفي لتحقيق التارجت 🚀"
                : topActiveToClose.length > 0
                  ? `لتعويض الفارق للوصول للتارجت، ركز على إغلاق صفقة [${topActiveToClose[0].client_name}] (الدفعة الأولى المتوقعة: ${formatSAR(topActiveToClose[0].rawTargetValue)} ريال)${topActiveToClose[1] ? ` أو [${topActiveToClose[1].client_name}].` : '.'}`
                  : `لتعويض الفارق (${formatSAR(targetGap)} ريال)، تحتاج إلى إدخال فرص بيعية جديدة لبورد المبيعات عاجلاً!`
              }
            </p>
          </div>
        </div>
      </motion.div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard label="إجمالي العملاء" value={totalClients} icon={Users} color="#4F8EF7" />
        <div title="العملاء الذين تواصلت معهم خلال آخر 48 ساعة" style={{ cursor: 'help' }}>
          <StatCard label="عملاء جادون" value={hotClientsCount} icon={Flame} color="#EF4444" />
        </div>
        <StatCard label="التارجت المضاف اليوم" value={todayAddedValue} icon={CheckCircle2} color="#10B981" />
        <StatCard label="الفرص النشطة" value={formatSAR(activeValue)} icon={Wallet} color="#7C3AED" isText />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Hot Clients Scroll */}
        <motion.div variants={item} className="glass-card lg:col-span-3" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Flame size={22} color="#EF4444" /> العملاء الأكثر جدية
            </h2>
            <Link
              to="/hot-clients"
              style={{ color: '#4F8EF7', textDecoration: 'none', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              عرض الكل <ChevronLeft size={16} />
            </Link>
          </div>

          <div className="scroll-x" style={{ display: 'flex', gap: '16px', paddingBottom: '16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {topHotClients.map((client) => {
              const score = client.total_score || 0;
              const sectorColor = getSectorColor(client.sector);
              return (
                <motion.div
                  key={client.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="glass-card"
                  style={{
                    minWidth: '220px', padding: '24px',
                    background: isDark ? 'rgba(30, 45, 74, 0.4)' : 'rgba(255, 255, 255, 0.5)',
                    cursor: 'pointer', border: `1px solid ${border}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <ScoreRing score={score} size={88} strokeWidth={8} />
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '16px', fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {client.client_name}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: '10px', padding: '4px 12px', borderRadius: '8px',
                    background: `${sectorColor}15`, color: sectorColor, fontSize: '12px', fontWeight: 600, fontFamily: "'IBM Plex Sans Arabic', sans-serif"
                  }}>
                    {client.sector}
                  </div>
                  <div style={{ marginTop: '14px', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', fontWeight: 700, color: '#4F8EF7' }}>
                    {formatSAR(client.expected_value)}
                  </div>
                </motion.div>
              );
            })}
            {topHotClients.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', width: '100%', color: textMuted, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                لا يوجد عملاء جادين حالياً
              </div>
            )}
          </div>
        </motion.div>

        {/* Reminders Section */}
        <motion.div variants={item} className="glass-card lg:col-span-2" style={{ padding: '24px' }}>
          <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 700, color: textPrimary, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={22} color="#F59E0B" /> متابعات اليوم
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayFollowups.length > 0 ? todayFollowups.map(client => {
              const over = isOverdue(client.next_followup_date);
              const days = over ? daysDiff(client.next_followup_date) : 0;
              const avatarColor = getAvatarColor(client.client_name);
              return (
                <motion.div
                  key={client.id}
                  whileHover={{ x: -6 }}
                  style={{
                    padding: '16px', borderRadius: '18px', background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF',
                    border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="letter-avatar" style={{ background: avatarColor, width: '40px', height: '40px', fontSize: '16px' }}>
                      {client.client_name?.charAt(0) || '؟'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 700, color: textPrimary }}>
                        {client.client_name}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '12px', color: over ? '#EF4444' : '#F59E0B', marginTop: '2px', fontWeight: 500 }}>
                        {over ? `متأخر ${days} يوم` : 'يستحق اليوم'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => markContacted(client.id)}
                    style={{
                      padding: '8px 12px', borderRadius: '10px', background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                      color: '#10B981', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '12px', fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s'
                    }}
                  >
                    <CheckCircle2 size={14} /> تم
                  </button>
                </motion.div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px', filter: 'grayscale(0.5)', opacity: 0.3 }}>✅</div>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '16px', fontWeight: 700, color: textPrimary }}>لا توجد متابعات مجدولة اليوم 🎉</p>
                <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '13px', color: textSecondary, marginTop: '4px' }}>خذ قسطاً من الراحة أو أضف عملاء جدد!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05, boxShadow: '0 8px 30px rgba(79,142,247,0.4)', y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/clients/new')}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50"
        style={{
          padding: '14px 24px', borderRadius: '50px',
          background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
          color: 'white', border: 'none', cursor: 'pointer',
          fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(79,142,247,0.3)',
        }}
      >
        <PlusCircle size={24} fill="white" color="rgba(79, 142, 247, 0.5)" /> إضافة صفقة سريعة
      </motion.button>
    </motion.div>
  );
}
