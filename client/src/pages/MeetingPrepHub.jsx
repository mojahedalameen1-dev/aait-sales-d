import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Presentation, Search, Plus, Calendar, MapPin, Briefcase,
  Sparkles, CheckCircle2, ChevronRight, Filter, ExternalLink, Printer,
  ListChecks, Map as MapIcon, CalendarDays, Trash2, Edit3, Users
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';
import SkeletonLoader from '../components/SkeletonLoader';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatDate } from '../utils/formatDate';

const SECTORS = ['تجارة', 'مطاعم وضيافة', 'خدمات', 'تعليم', 'صحي', 'عقارات', 'صناعي', 'حكومي', 'أخرى'];
const STATUSES = ['مسودة', 'جاهز', 'منتهي'];
const STATUS_COLORS = { 'مسودة': '#4A5570', 'جاهز': '#7C3AED', 'منتهي': '#10B981' };

// --- HELPERS ---

function debounce(func, wait) {
  let timeout;
  const executedFunction = function (...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
  executedFunction.cancel = () => clearTimeout(timeout);
  return executedFunction;
}

export default function MeetingPrepHub() {
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [preps, setPreps] = useState([]);

  const [loadingList, setLoadingList] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const [activePrepId, setActivePrepId] = useState(null);
  const [prepData, setPrepData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Tabs State
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'questions', 'journey', 'strategy'

  // Form states (synced with prepData)
  const [formData, setFormData] = useState({});

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const textMuted = isDark ? '#4A5A82' : '#94A3B8';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';
  const elevated = isDark ? '#1A2540' : '#F0F7FF';

  // --- DATA FETCHING ---

  useEffect(() => {
    fetchPreps();
  }, []);

  async function fetchPreps() {
    try {
      const res = await fetch(API_URL('/api/meeting-preps'));
      const data = await res.json();
      if (Array.isArray(data)) {
        setPreps(data);
        if (data.length > 0 && !activePrepId) {
          handleSelectPrep(data[0].id);
        }
      } else {
        console.error('API returned non-array:', data);
        setPreps([]);
        addToast(data.error || 'خطأ في استلام البيانات من الخادم', 'error');
      }
    } catch (e) {
      addToast('خطأ في تحميل قائمة التحضيرات', 'error');
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSelectPrep(id) {
    setActivePrepId(id);
    setPrepData(null); // triggers skeleton
    try {
      const res = await fetch(API_URL(`/api/meeting-preps/${id}`));
      const data = await res.json();
      setPrepData(data);
      setFormData({
        title: data.title,
        client_name: data.client_name,
        sector: data.sector,
        meeting_date: data.meeting_date,
        status: data.status,
        idea_raw: data.idea_raw,
        tags: data.tags
      });
    } catch (e) {
      addToast('خطأ في تحميل تفاصيل الاجتماع', 'error');
    }
  }

  // --- AUTO-SAVE LOGIC ---

  const performAutoSave = async (id, payload) => {
    if (!id) return;
    try {
      await fetch(API_URL(`/api/meeting-preps/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // silently update local list view without full refetch
      setPreps(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
    } catch (e) {
      console.error('AutoSave failed', e);
    }
  };

  const debouncedSaveInfo = useCallback(debounce((id, payload) => performAutoSave(id, payload), 1500), []);
  const debouncedSaveIdea = useCallback(debounce((id, payload) => performAutoSave(id, payload), 2500), []);

  useEffect(() => {
    return () => {
      debouncedSaveInfo.cancel();
      debouncedSaveIdea.cancel();
    };
  }, [debouncedSaveInfo, debouncedSaveIdea]);

  function handleInfoChange(field, value) {
    const newData = { [field]: value };
    setFormData(prev => {
      const updated = { ...prev, ...newData };
      setPrepData(p => ({ ...p, ...newData }));
      debouncedSaveInfo(activePrepId, { ...newData, tags: updated.tags });
      return updated;
    });
  }

  function handleIdeaChange(value) {
    setFormData(prev => ({ ...prev, idea_raw: value }));
    setPrepData(prev => ({ ...prev, idea_raw: value }));
    debouncedSaveIdea(activePrepId, { idea_raw: value });
  }

  // --- ACTIONS ---

  async function handleCreateNew() {
    try {
      const res = await fetch(API_URL('/api/meeting-preps'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'تحضير اجتماع جديد' })
      });
      const data = await res.json();
      await fetchPreps(); // Refresh list
      handleSelectPrep(data.id); // Select new
      addToast('تم إنشاء مسودة مبدئية', 'success');
    } catch (e) {
      addToast('فشل إنشاء الاجتماع', 'error');
    }
  }

  async function handleDelete() {
    try {
      await fetch(API_URL(`/api/meeting-preps/${activePrepId}`), { method: 'DELETE' });
      addToast('تم الحذف بنجاح', 'success');
      setShowDelete(false);
      const nextId = preps.find(p => p.id !== activePrepId)?.id || null;
      await fetchPreps();
      if (nextId) handleSelectPrep(nextId);
      else { setActivePrepId(null); setPrepData(null); }
    } catch (e) {
      addToast('فشل الحذف', 'error');
    }
  }

  async function handleAnalyze() {
    if (!formData.idea_raw?.trim() || !formData.title?.trim()) {
      return addToast('يرجى إدخال عنوان الاجتماع وفكرة العميل أولاً', 'info');
    }

    setIsAnalyzing(true);
    console.log('Starting AI Analysis for prep:', activePrepId);

    // Force immediate save of pending idea
    try {
      await performAutoSave(activePrepId, { idea_raw: formData.idea_raw });
    } catch (e) {
      console.warn('Pre-analysis save failed, continuing anyway...', e);
    }

    try {
      const res = await fetch(API_URL('/api/analyze-prep'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prep_id: activePrepId,
          title: formData.title,
          client_name: formData.client_name,
          sector: formData.sector,
          idea_raw: formData.idea_raw
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Analysis API Error:', errorData);
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      console.log('AI Analysis Result:', data);

      // Update local state with the result stringified for the renderer block
      setPrepData(prev => ({ ...prev, analysis_result: JSON.stringify(data) }));
      addToast('تم التوليد بنجاح ✨', 'success');
    } catch (e) {
      console.error('handleAnalyze Catch:', e);
      addToast(e.message || 'فشل التحليل. تأكد من اتصال الإنترنت ومن إعدادات المفتاح.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handlePrint() {
    if (!prepData?.analysis_result || prepData.analysis_result === '{}') {
      return addToast('لا يمكن طباعة التقرير قبل إكمال تحليل الفكرة.', 'info');
    }

    // Open the new print route in a new tab
    const printUrl = `/meeting-preps/${activePrepId}/print`;
    window.open(printUrl, '_blank');
  }

  // --- RENDER HELPERS ---

  const filteredPreps = preps.filter(p => {
    const matchSearch = p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-80px)] lg:h-[calc(100vh-80px)] overflow-visible lg:overflow-hidden w-full relative print:block print:h-auto print:overflow-visible print:bg-white" style={{ direction: 'rtl' }}>

      {/* --- LEFT PANEL: List --- */}
      <div
        className="glass-card flex-shrink-0 w-full lg:w-[340px] flex flex-col gap-5 p-5 lg:p-6 lg:border-l h-[40vh] lg:h-full overflow-y-auto custom-scrollbar print:hidden no-print"
        style={{
          background: isDark ? 'rgba(15, 22, 41, 0.4)' : '#F9FBFF',
          borderColor: isDark ? border : '#E2E8F0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Presentation size={22} color="#4F8EF7" /> التحضيرات
          </h2>
          <button className="btn-primary" onClick={handleCreateNew} style={{ padding: '8px 16px', fontSize: '13px' }}>
            <Plus size={16} /> جديد
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', right: '14px', top: '14px', color: textSecondary }} />
          <input
            className="form-input"
            placeholder="بحث..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingRight: '40px', height: '44px', fontSize: '14px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'مسودة', 'جاهز', 'منتهي'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                flex: 1, padding: '6px', fontSize: '11px', fontWeight: 600, borderRadius: '8px', cursor: 'pointer',
                background: filterStatus === s ? (isDark ? '#4F8EF7' : '#E0E7FF') : 'transparent',
                color: filterStatus === s ? (isDark ? '#fff' : '#4F8EF7') : textSecondary,
                border: filterStatus === s ? 'none' : `1px solid ${border}`
              }}
            >
              {s === 'all' ? 'الكل' : s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {loadingList ? (
            <SkeletonLoader type="list" count={4} />
          ) : filteredPreps.map(p => (
            <motion.div
              key={p.id}
              whileHover={{ x: -4 }}
              onClick={() => handleSelectPrep(p.id)}
              style={{
                padding: '16px', borderRadius: '14px', cursor: 'pointer',
                background: activePrepId === p.id
                  ? (isDark ? 'linear-gradient(135deg, rgba(79,142,247,0.1), rgba(124,58,237,0.1))' : '#EFF6FF')
                  : (isDark ? 'rgba(255,255,255,0.02)' : '#fff'),
                border: `1px solid ${activePrepId === p.id ? '#4F8EF7' : border}`,
                boxShadow: activePrepId === p.id ? '0 4px 15px rgba(79,142,247,0.1)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.title || 'بدون عنوان'}
                </div>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[p.status], flexShrink: 0, marginTop: '6px' }} />
              </div>
              <div style={{ fontSize: '12px', color: textSecondary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Users size={12} /> {p.client_name || 'بدون عميل'}
              </div>
              {p.meeting_date && (
                <div style={{ fontSize: '11px', color: textMuted, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} /> {formatDate(p.meeting_date)}
                </div>
              )}
            </motion.div>
          ))}
          {filteredPreps.length === 0 && !loadingList && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: textMuted, fontSize: '14px' }}>
              {preps.length === 0 ? 'لا توجد مسودات اجتماعات حالياً' : 'لا توجد نتائج بحث'}
            </div>
          )}
        </div>
      </div>

      {/* --- MAIN CANVAS: Right Side --- */}
      <div className="flex-1 w-full h-auto lg:h-full overflow-visible lg:overflow-y-auto custom-scrollbar p-4 md:p-6 lg:p-8 pb-32 rounded-[24px] print:p-0 print:overflow-visible print:bg-white print:text-black print:h-auto print:m-0" style={{
        background: isDark ? 'transparent' : '#fff'
      }}>
        <AnimatePresence mode="wait">
          {!activePrepId ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: textMuted }}>
              <Presentation size={64} style={{ opacity: 0.2, marginBottom: '24px' }} />
              <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 700, color: textPrimary }}>مركز تحضير الاجتماعات</h3>
              <p style={{ marginTop: '8px' }}>اختر تحضيراً من القائمة أو قم بإنشاء واحد جديد للبدء.</p>
            </motion.div>
          ) : !prepData ? (
            <SkeletonLoader type="client_detail" />
          ) : (
            <motion.div key={prepData.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="printable-results">

              {/* Toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="badge no-print" style={{ background: `${STATUS_COLORS[formData.status]}22`, color: STATUS_COLORS[formData.status], fontSize: '13px' }}>{formData.status}</span>
                  <span style={{ fontSize: '12px', color: textMuted }} className="no-print">اخر تحديث: {formatDate(prepData.updated_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }} className="no-print">
                  <button
                    className={`btn-secondary ${(!prepData?.analysis_result || prepData.analysis_result === '{}') ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handlePrint}
                    disabled={!prepData?.analysis_result || prepData.analysis_result === '{}'}
                  >
                    <Printer size={16} /> طباعة التقرير
                  </button>
                  <button className="btn-secondary" onClick={() => setShowDelete(true)} style={{ color: '#EF4444', borderColor: '#EF444422' }}><Trash2 size={16} /> حذف</button>
                </div>
              </div>

              {/* Section A: Info */}
              <div className="glass-card no-print p-4 md:p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mb-5">
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-semibold mb-2" style={{ color: textSecondary }}>عنوان الاجتماع</label>
                    <input className="form-input text-lg font-bold" value={formData.title} onChange={e => handleInfoChange('title', e.target.value)} placeholder="مثال: ورشة عمل مع وزارة الصحة" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: textSecondary }}>الحالة</label>
                    <select className="form-input font-bold" value={formData.status} onChange={e => handleInfoChange('status', e.target.value)} style={{ color: STATUS_COLORS[formData.status] }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: textSecondary, marginBottom: '8px', fontWeight: 600 }}>تاريخ الاجتماع</label>
                    <input type="date" className="form-input" value={formData.meeting_date} onChange={e => handleInfoChange('meeting_date', e.target.value)} />
                  </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: textSecondary }}>اسم العميل (خياري)</label>
                    <input className="form-input" value={formData.client_name} onChange={e => handleInfoChange('client_name', e.target.value)} placeholder="اسم الشركة أو الجهة" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: textSecondary }}>القطاع</label>
                    <select className="form-input" value={formData.sector} onChange={e => handleInfoChange('sector', e.target.value)}>
                      <option value="">غير محدد</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2" style={{ color: textSecondary }}>وسوم (Tags)</label>
                    <input className="form-input" value={formData.tags} onChange={e => handleInfoChange('tags', e.target.value)} placeholder="تطبيق، موقع، ERP..." />
                  </div>
                </div>
              </div>


              {/* Section B: Idea Input */}
              <div className="glass-card no-print" style={{ padding: '32px', marginBottom: '32px', background: isDark ? 'linear-gradient(135deg, rgba(79,142,247,0.05), rgba(124,58,237,0.05))' : '#F5F9FF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Sparkles size={20} />
                  </div>
                  <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800 }}>بيانات العميل والفكرة</h3>
                </div>
                <textarea
                  className="form-input"
                  placeholder="اكتب هنا كل ما تعرفه عن الفكرة والمشروع كما أوضحها العميل..."
                  value={formData.idea_raw}
                  onChange={e => handleIdeaChange(e.target.value)}
                  rows={5}
                  style={{ fontSize: '16px', lineHeight: '1.7', marginBottom: '24px', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }}
                />
                <button className="btn-primary" onClick={handleAnalyze} disabled={isAnalyzing} style={{ minWidth: '220px', height: '54px', fontSize: '16px', fontWeight: 700 }}>
                  {isAnalyzing ? 'جاري التحليل بعناية...' : 'توليد خطة الاجتماع ✨'}
                </button>
              </div>

              {isAnalyzing && <div className="no-print"><SkeletonLoader type="ai_analysis" /></div>}

              {/* TABS NAVIGATION */}
              {prepData.analysis_result && !isAnalyzing && prepData.analysis_result !== '{}' && (
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 mb-6 no-print" style={{ borderBottom: `1px solid ${border}` }}>
                  {[
                    { id: 'info', label: '📋 معلومات الاجتماع' },
                    { id: 'strategy', label: '📝 الرسالة الاستراتيجية' },
                    { id: 'questions', label: '❓ الأسئلة الاستكشافية' },
                    { id: 'journey', label: '🗺️ رحلة المستخدم' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: '12px 20px',
                        background: activeTab === tab.id ? (isDark ? 'rgba(79, 142, 247, 0.1)' : '#EFF6FF') : 'transparent',
                        color: activeTab === tab.id ? '#4F8EF7' : textSecondary,
                        border: 'none',
                        borderBottom: activeTab === tab.id ? '2px solid #4F8EF7' : '2px solid transparent',
                        cursor: 'pointer',
                        fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                        fontSize: '15px',
                        fontWeight: activeTab === tab.id ? 800 : 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        transition: 'all 0.2s'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Section C: Analysis Result (TAB-BASED VIEW) */}
              {prepData.analysis_result && !isAnalyzing && (() => {
                try {
                  const analysis = typeof prepData.analysis_result === 'string'
                    ? JSON.parse(prepData.analysis_result)
                    : prepData.analysis_result;

                  if (!analysis || Object.keys(analysis).length === 0) return null;
                  return (
                    <div className="printable-results" id="report-print-container">
                      {/* ======================= PAGE 0: COVER PAGE (LEGENDARY) ======================= */}
                      <div className="print-cover-page">
                        <div className="print-cover-logo-section">
                          <div className="print-cover-title">SALES FOCUS</div>
                          <div className="print-cover-subtitle">Intelligence Hub</div>
                        </div>

                        <div className="print-cover-main-header">
                          <h1 className="print:text-[36pt] print:font-black print:m-0">{formData.title || 'تقرير تحضير استراتيجي'}</h1>
                          <div className="print:text-[18pt] print:font-bold print:mt-4">تحضير اجتماع استراتيجي</div>
                        </div>

                        <div className="print-cover-details">
                          <div className="print-detail-row">
                            <span className="print-detail-label">العميل المستهدف:</span>
                            <span>{formData.client_name || 'غير محدد'}</span>
                          </div>
                          <div className="print-detail-row">
                            <span className="print-detail-label">القطاع:</span>
                            <span>{formData.sector || 'غير محدد'}</span>
                          </div>
                          <div className="print-detail-row">
                            <span className="print-detail-label">تاريخ الاجتماع:</span>
                            <span>{formData.meeting_date ? formatDate(formData.meeting_date) : 'غير محدد'}</span>
                          </div>
                        </div>

                        <div className="print-cover-footer">
                          هذا التقرير سري وخاص بمنتسبي منظومة Sales Focus AI فقط.
                        </div>
                      </div>


                      {/* PAGE 1: EXECUTIVE STRATEGY (Tab: info / strategy) */}
                      {(activeTab === 'info' || activeTab === 'strategy') && (
                        <>
                          <div className="print-header print:flex print:justify-between print:items-end print:border-b-[4pt] print:border-black print:pb-6 print:mb-10 print:mt-10 hidden print:block">
                            <div>
                              <div className="print:text-[24pt] print:font-black print:tracking-tighter">SALES FOCUS</div>
                              <div className="print:text-[14pt] print:font-bold print:mt-1">تقرير تحضير اجتماع استراتيجي (Strategic Dossier)</div>
                            </div>
                            <div className="print:text-left print:text-[10pt] print:flex print:flex-col print:items-end">
                              <div className="print:font-black print:bg-black print:text-white print:px-2 print:py-1 print:mb-1">PREP ID: {String(prepData.id).padStart(4, '0')}</div>
                              <div className="print:font-bold">{`${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}</div>
                              <div className="print:text-[8pt] print:mt-1 print:opacity-70 font-mono">CONFIDENTIAL / نظام سيلز فوكس</div>
                            </div>
                          </div>

                          {/* Strategic Message (Hero Section) */}
                          <div className="glass-card mb-8 avoid-break print:border-[3pt] print:border-black print:p-8 print:my-8" style={{ border: '4pt solid #000', padding: '30px' }}>
                            <h4 className="print:text-[12pt] print:font-black print:text-black print:mb-4 print:uppercase">الرسالة الاستراتيجية الكبرى (Main Strategy)</h4>
                            <p className="print:text-[22pt] print:font-black print:leading-tight print:text-black">{analysis.meeting_plan?.key_message}</p>
                          </div>

                          {/* Business Summary & Platforms */}
                          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8 print:grid-cols-2 print:gap-8 avoid-break">
                            <div className="glass-card avoid-break p-6 md:p-7 xl:col-span-3 print:col-span-1 print:border-none print:shadow-none print:p-0">
                              <h4 className="text-lg font-extrabold mb-5 flex items-center gap-2" style={{ color: '#4F8EF7' }}>
                                <Briefcase size={20} /> فهم المشروع والأهداف
                              </h4>
                              <div className="flex flex-col gap-5">
                                <div className="p-4 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFF' }}>
                                  <span className="font-extrabold block mb-2" style={{ color: textPrimary }}>الهدف التجاري:</span>
                                  <span className="text-sm leading-relaxed" style={{ color: textSecondary }}>{analysis.business_analysis?.main_goal}</span>
                                </div>
                                <div>
                                  <span className="font-extrabold block mb-2" style={{ color: textPrimary }}>المشكلة الحالية:</span>
                                  <span className="text-sm leading-relaxed" style={{ color: textSecondary }}>{analysis.business_analysis?.current_problem}</span>
                                </div>
                              </div>
                            </div>

                            <div className="glass-card avoid-break p-6 md:p-7 xl:col-span-2 print:col-span-1 print:border-none print:shadow-none print:p-0">
                              <h4 className="text-lg font-extrabold mb-5 flex items-center gap-2" style={{ color: '#7C3AED' }}>
                                <Users size={20} /> الفئات والمنصات
                              </h4>
                              <div className="flex flex-col gap-6">
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '12px' }}>المستخدمون المستهدفون</span>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {analysis.business_analysis?.target_users?.map((u, i) => <span key={i} className="badge" style={{ background: isDark ? 'rgba(124,58,237,0.1)' : '#EDE9FE', color: '#7C3AED', padding: '6px 12px' }}>{u}</span>)}
                                  </div>
                                </div>
                                <div>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: textMuted, display: 'block', marginBottom: '12px' }}>المنصات المتوقعة</span>
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {analysis.business_analysis?.expected_platforms?.map((p, i) => <span key={i} className="badge" style={{ background: isDark ? 'rgba(79,142,247,0.1)' : '#EFF6FF', color: '#4F8EF7', padding: '6px 12px' }}>{p}</span>)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Strategic Steps & Plan */}
                          <div className="avoid-break mb-8" style={{
                            padding: '32px',
                            background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.05))' : 'linear-gradient(135deg, #F0FDF4, #F8FAFC)',
                            border: '2px solid #10B981',
                            borderRadius: '24px',
                            boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)',
                            position: 'relative'
                          }}>
                            <div style={{ position: 'absolute', top: '-16px', right: '32px', background: '#10B981', color: '#fff', padding: '8px 20px', borderRadius: '50px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }}>
                              <CalendarDays size={18} /> أهم ما يجب قوله في الاجتماع
                            </div>

                            <h4 className="text-xl font-extrabold mb-8 mt-2 text-emerald-600 dark:text-emerald-400">
                              خطة تسيير الاجتماع
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                              <div>
                                <div style={{ marginBottom: '24px' }}>
                                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: '12px' }}>جملة الافتتاح المقترحة</span>
                                  <p style={{ fontSize: '20px', fontWeight: 700, color: textPrimary, lineHeight: '1.7', fontStyle: 'italic', paddingRight: '16px', borderRight: '4px solid #10B981' }}>"{analysis.meeting_plan?.opening}"</p>
                                </div>
                              </div>
                              <div>
                                <div style={{ padding: '24px', background: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5', borderRadius: '16px', border: '1px dashed #10B981' }}>
                                  <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', marginBottom: '12px' }}>الخطوة القادمة (Call to Action)</span>
                                  <p style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>{analysis.meeting_plan?.next_step}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* PAGE 2: DISCOVERY & QUESTIONS (Tab: questions) */}
                      {activeTab === 'questions' && (
                        <>
                          <div className="page-break-before hidden print:block"></div>
                          <div className="glass-card avoid-break overflow-hidden mb-8 p-0 mt-4">
                            <div className="px-6 py-5 md:px-8 md:py-6 border-b" style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FBFF', borderColor: border }}>
                              <h4 className="text-lg md:text-xl font-extrabold flex items-center gap-3" style={{ color: '#7C3AED' }}>
                                <ListChecks size={24} /> الأسئلة الاستكشافية الموصى بها
                              </h4>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse" style={{ borderColor: border }}>
                              {[
                                { key: 'business', label: 'الوعي بالبزنس', color: '#4F8EF7' },
                                { key: 'technical', label: 'المتطلبات التقنية', color: '#7C3AED' },
                                { key: 'scope', label: 'النطاق والميزانية', color: '#F59E0B' }
                              ].map((cat, idx) => (
                                <div key={cat.key} style={{ padding: '32px', borderLeft: idx !== 2 ? `1px solid ${border}` : 'none' }}>
                                  <h5 style={{ fontSize: '16px', fontWeight: 800, color: cat.color, marginBottom: '24px', paddingBottom: '12px', borderBottom: `2px solid ${cat.color}22` }}>
                                    {cat.label}
                                  </h5>
                                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {analysis.discovery_questions?.[cat.key]?.map((q, i) => (
                                      <li key={i} style={{ display: 'flex', gap: '16px', fontSize: '15px', lineHeight: '1.6', color: textSecondary }}>
                                        <span style={{ color: cat.color, fontWeight: 900, background: `${cat.color}15`, padding: '4px 8px', borderRadius: '8px', height: 'fit-content' }}>Q</span>
                                        <span style={{ paddingTop: '2px' }}>{q}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      {/* PAGE 3: USER JOURNEYS (Tab: journey) */}
                      {activeTab === 'journey' && (
                        <>
                          <div className="page-break-before hidden print:block"></div>
                          <div className="flex items-center gap-3 text-xl md:text-2xl font-black mb-6 mt-4 avoid-break" style={{ color: textPrimary }}>
                            <MapIcon size={28} color="#F59E0B" /> مخططات رحلة المستخدم (نظرة شاملة)
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 print:grid-cols-2 print:gap-8 avoid-break">
                            {analysis.user_journeys?.map((j, idx) => (
                              <div key={idx} className="glass-card avoid-break p-6 md:p-8" style={{ background: isDark ? 'rgba(245, 158, 11, 0.02)' : '#FFFEFA', borderTop: '4px solid #F59E0B' }}>
                                <div style={{ display: 'inline-block', padding: '8px 16px', background: '#F59E0B15', color: '#F59E0B', borderRadius: '8px', fontSize: '14px', fontWeight: 800, marginBottom: '28px' }}>
                                  {j.user_type}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  {j.steps?.map((step, sidx) => (
                                    <div key={sidx} style={{ display: 'flex', gap: '20px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px' }}>
                                        <div style={{ width: '28px', height: '28px', background: isDark ? '#1A2540' : '#fff', border: '3px solid #F59E0B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#F59E0B' }}>{sidx + 1}</span>
                                        </div>
                                        {sidx !== j.steps.length - 1 && <div style={{ width: '3px', flex: 1, background: 'linear-gradient(to bottom, #F59E0B, #F59E0B22)', margin: '-2px 0' }} />}
                                      </div>
                                      <div style={{ paddingBottom: sidx !== j.steps.length - 1 ? '32px' : '0', paddingTop: '2px', fontSize: '16px', color: textSecondary, fontWeight: 600, lineHeight: '1.6' }}>
                                        {step}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}


                      {/* Model Signature & Footer */}
                      <div className="mt-12 pt-6 border-t border-dashed avoid-break" style={{ borderColor: border }}>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: textSecondary }}>
                            <Sparkles size={16} className="text-blue-500" />
                            <span>تم إنشاء هذه الاستراتيجية بواسطة المحرك:</span>
                            <span className="font-black text-emerald-500 bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/10">Google / Gemini 2.0 Flash</span>
                          </div>
                          <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#f8f9fa', color: textMuted, border: `1px solid ${border}` }}>
                            إصدار المحرك: V2.0.0 - Gemini Flash Engine
                          </div>
                        </div>
                      </div>

                      {/* Print Footer */}
                      <div className="print-footer print-only">
                        هذا التقرير تم توليده بواسطة Sales Focus AI - مدعوم بمحرك Gemini 2.0 Flash - سرية المعلومات محفوظة.
                      </div>
                    </div>
                  );
                } catch (e) {
                  console.error("Error parsing analysis result:", e);
                  return <div className="no-print" style={{ color: '#EF4444', padding: '20px' }}>تعذر عرض النتائج. يبدو أن هناك خطأ في تحليل البيانات.</div>;
                }
              })()}

              {/* Section D: Tools / Notes */}
              {(activeTab === 'info' || activeTab === 'strategy') && (
                <div className="glass-card no-print" style={{ padding: '24px', marginTop: '32px' }}>
                  <h4 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '18px', fontWeight: 800, color: textPrimary, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Edit3 size={20} /> مسودة ملاحظات خاصة (محرر نصي مبسط للملاحظات الداخلية)
                  </h4>
                  <div style={{ border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', borderBottom: `1px solid ${border}`, padding: '8px', display: 'flex', gap: '8px' }}>
                      <button style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 'bold', color: textPrimary }}>B</button>
                      <button style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', fontStyle: 'italic', color: textPrimary }}>I</button>
                      <button style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline', color: textPrimary }}>U</button>
                    </div>
                    <textarea
                      className="form-input"
                      placeholder="اكتب أي معلومات تسعيرية، جهات اتصال، أو تفاصيل خاصة لا ترغب بإرسالها للتحليل..."
                      rows={6}
                      style={{ background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFBEB', border: 'none', borderRadius: '0', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}


            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="حذف الاجتماع؟"
        message="هل أنت متأكد من حذف تحضير الاجتماع؟ لا يمكن استرجاع البيانات."
      />
    </div>
  );
}
