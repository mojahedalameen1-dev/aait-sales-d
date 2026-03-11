import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Flame, Wallet, TrendingUp, Calendar, ArrowUpRight, CheckCircle2, ChevronLeft, Zap, PlusCircle
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../utils/apiConfig';
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

  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  useEffect(() => {
    fetchData();
    const stored = localStorage.getItem('mix_sales_targets');
    if (stored) setTargets(JSON.parse(stored));
  }, []);

  async function fetchData() {
    try {
      const [statsRes, clientsRes] = await Promise.all([
        fetch(API_URL('/api/dashboard/stats')).then(r => r.json()),
        fetch(API_URL('/api/clients')).then(r => r.json())
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
      await fetch(API_URL(`/api/clients/${clientId}/contacted`), { method: 'PATCH' });
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
      className="glass-card flex flex-col gap-3 relative overflow-hidden p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#151D2F]"
    >
      <div 
        className="absolute -top-2.5 -left-2.5 w-20 h-20 z-0 rounded-full blur-2xl"
        style={{ background: color, opacity: 0.15 }}
      />
      <div className="flex items-center justify-between relative z-10">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}15`, color: color }}
        >
          <Icon size={24} />
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
          <TrendingUp size={16} color={color} />
        </div>
      </div>
      <div className="relative z-10">
        <div className="font-['IBM_Plex_Sans_Arabic'] text-[13px] text-slate-500 dark:text-slate-400 font-medium">{label}</div>
        <div 
          className="font-['IBM_Plex_Sans_Arabic'] font-extrabold text-slate-900 dark:text-white mt-1"
          style={{ fontSize: isText ? '20px' : '32px', letterSpacing: isText ? '0' : '-1px' }}
        >
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
      className="direction-rtl"
    >
      {/* Header */}
      <motion.header variants={item} className="mb-8">
        <h1 className="font-['IBM_Plex_Sans_Arabic'] text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          مرحباً بك في لوحة التحكم 👋
        </h1>
        <p className="font-['IBM_Plex_Sans_Arabic'] text-[15px] text-slate-500 dark:text-slate-400 mt-1.5">
          إليك ملخص سريع لنشاط مبيعاتك وأداء العملاء لليوم
        </p>
      </motion.header>

      {/* Target Progress Section */}
      <motion.div variants={item} className="p-6 mb-6 relative overflow-hidden bg-white dark:bg-[#151D2F] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 relative z-10">
          <div>
            <h2 className="font-['IBM_Plex_Sans_Arabic'] text-lg md:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              🎯 التارجت الشهري
            </h2>
            <p className="font-['IBM_Plex_Sans_Arabic'] text-sm text-slate-500 dark:text-slate-400 mt-1">
              متابعة هدف المبيعات لهذا الشهر
            </p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            {isEditingTarget ? (
              <div className="flex gap-2 w-full md:w-auto">
                <input
                  type="number"
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  className="form-input w-full md:w-32 px-3 py-1.5 text-sm text-center bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-blue-500 transition-colors"
                  autoFocus
                />
                <button
                  onClick={() => {
                    const val = parseInt(targetInput) || 500000;
                    setMonthlyTarget(val);
                    localStorage.setItem('monthlyTarget', val);
                    setIsEditingTarget(false);
                  }}
                  className="btn-primary px-4 py-1.5 text-xs whitespace-nowrap"
                >حفظ</button>
              </div>
            ) : monthlyTarget > 0 ? (
              <div className="cursor-pointer group flex flex-col items-start md:items-end w-full" onClick={() => setIsEditingTarget(true)} title="انقر لتعديل الهدف شهري">
                <div className="font-['IBM_Plex_Sans_Arabic'] text-2xl font-black text-emerald-500 group-hover:text-emerald-400 transition-colors">
                  {formatSAR(targetProgress)} <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">/ {formatSAR(monthlyTarget)}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full flex-wrap">
                <span className="font-['IBM_Plex_Sans_Arabic'] text-sm font-semibold text-slate-600 dark:text-slate-400">
                  🎯 حدد تارجتك الشهري للبدء
                </span>
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  تحديد التارجت
                </button>
              </div>
            )}
            <div className="font-['IBM_Plex_Sans_Arabic'] text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
              نسبة الإنجاز: {targetPercentage}%
            </div>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative z-10">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(targetPercentage, 100)}%` }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className={`h-full rounded-full relative ${targetPercentage >= 100 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
          >
            {/* Shimmer Effect */}
            <div className="shimmer w-full h-full opacity-50"></div>
          </motion.div>
        </div>
      </motion.div>

      {/* Forecasting Analysis Section */}
      <motion.div variants={item} className="p-6 mb-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm">
        <h2 className="font-['IBM_Plex_Sans_Arabic'] text-lg md:text-xl font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          📈 التحليل التنبؤي لإغلاق الصفقات
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="p-4 rounded-[14px] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-xs md:text-[13px] text-slate-600 dark:text-emerald-400 font-semibold font-['IBM_Plex_Sans_Arabic']">الإيراد المحقق (الدفعة الأولى)</div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600 dark:text-emerald-500 mt-1">{formatSAR(targetProgress)}</div>
          </div>
          <div className="p-4 rounded-[14px] bg-blue-50 dark:bg-blue-500/10 border border-blue-500/30">
            <div className="text-xs md:text-[13px] text-slate-600 dark:text-blue-400 font-semibold font-['IBM_Plex_Sans_Arabic']">الإيراد المتوقع إضافته</div>
            <div className="text-xl md:text-2xl font-extrabold text-blue-600 dark:text-blue-500 mt-1">{formatSAR(weightedActiveValue)}</div>
          </div>
        </div>

        {/* Recommendation Engine Message */}
        <div className={`flex flex-col sm:flex-row gap-4 items-start p-5 rounded-2xl ${targetGap <= 0 ? 'bg-emerald-100 dark:bg-emerald-500/15' : 'bg-amber-100 dark:bg-amber-500/15'}`}>
          <div className={`p-2 rounded-full text-white shrink-0 ${targetGap <= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {targetGap <= 0 ? <CheckCircle2 size={24} /> : <Zap size={24} />}
          </div>
          <div>
            <h3 className={`font-['IBM_Plex_Sans_Arabic'] text-base font-extrabold mb-1.5 ${targetGap <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
              {targetGap <= 0 ? 'نجاح إستراتيجي' : 'توصية الذكاء الاصطناعي'}
            </h3>
            <p className="font-['IBM_Plex_Sans_Arabic'] text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-8">
        <StatCard label="إجمالي العملاء" value={totalClients} icon={Users} color="#4F8EF7" />
        <div title="العملاء الذين تواصلت معهم خلال آخر 48 ساعة" style={{ cursor: 'help' }}>
          <StatCard label="عملاء جادون" value={hotClientsCount} icon={Flame} color="#EF4444" />
        </div>
        <StatCard label="التارجت المضاف اليوم" value={todayAddedValue} icon={CheckCircle2} color="#10B981" />
        <StatCard label="الفرص النشطة" value={formatSAR(activeValue)} icon={Wallet} color="#7C3AED" isText />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Hot Clients Scroll */}
        <motion.div variants={item} className="glass-card lg:col-span-3 p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#151D2F]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-['IBM_Plex_Sans_Arabic'] text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame size={22} className="text-red-500" /> العملاء الأكثر جدية
            </h2>
            <Link
              to="/hot-clients"
              className="text-sm font-bold text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              عرض الكل <ChevronLeft size={16} />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 custom-scrollbar snap-x">
            {topHotClients.map((client) => {
              const score = client.total_score || 0;
              const sectorColor = getSectorColor(client.sector);
              return (
                <motion.div
                  key={client.id}
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="min-w-[220px] p-6 rounded-2xl bg-white dark:bg-[#1E2D4A]/40 border border-slate-200 dark:border-white/5 cursor-pointer text-center shadow-sm hover:shadow-md transition-all flex flex-col items-center"
                >
                  <div className="flex justify-center mb-5">
                    <ScoreRing score={score} size={88} strokeWidth={8} />
                  </div>
                  <div className="font-['IBM_Plex_Sans_Arabic'] text-base font-extrabold text-slate-900 dark:text-white truncate w-full">
                    {client.client_name}
                  </div>
                  <div 
                    className="inline-block mt-2.5 px-3 py-1 rounded-lg text-xs font-semibold font-['IBM_Plex_Sans_Arabic']"
                    style={{ background: `${sectorColor}15`, color: sectorColor }}
                  >
                    {client.sector}
                  </div>
                  <div className="mt-3.5 font-['IBM_Plex_Sans_Arabic'] text-[15px] font-extrabold text-[#4F8EF7]">
                    {formatSAR(client.expected_value)}
                  </div>
                </motion.div>
              );
            })}
            {topHotClients.length === 0 && (
              <div className="p-10 text-center w-full text-slate-500 font-['IBM_Plex_Sans_Arabic']">
                لا يوجد عملاء جادين حالياً
              </div>
            )}
          </div>
        </motion.div>

        {/* Reminders Section */}
        <motion.div variants={item} className="glass-card lg:col-span-2 p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#151D2F]">
          <h2 className="font-['IBM_Plex_Sans_Arabic'] text-xl font-extrabold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Calendar size={22} className="text-amber-500" /> متابعات اليوم
          </h2>
          <div className="flex flex-col gap-3">
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
              <div className="text-center py-12 px-5">
                <div className="text-5xl mb-4 grayscale opacity-30">✅</div>
                <p className="font-['IBM_Plex_Sans_Arabic'] text-base font-extrabold text-slate-900 dark:text-white">لا توجد متابعات مجدولة اليوم 🎉</p>
                <p className="font-['IBM_Plex_Sans_Arabic'] text-[13px] text-slate-500 dark:text-slate-400 mt-1">خذ قسطاً من الراحة أو أضف عملاء جدد!</p>
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
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 px-6 py-3.5 rounded-full bg-gradient-to-br from-[#4F8EF7] to-[#7C3AED] text-white border-none cursor-pointer font-['IBM_Plex_Sans_Arabic'] text-[15px] font-extrabold flex items-center gap-2 shadow-[0_4px_20px_rgba(79,142,247,0.3)] transition-all"
      >
        <PlusCircle size={24} className="text-white/80" /> إضافة صفقة سريعة
      </motion.button>
    </motion.div>
  );
}
