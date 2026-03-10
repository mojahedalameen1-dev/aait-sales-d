import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Edit3, Trash2, Calendar, MapPin, Briefcase, 
  ChevronDown, ChevronUp, FileText, Download, Trash, 
  Sparkles, ListChecks, Map as MapIcon, CalendarDays, Printer, UploadCloud
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import ScoreRing from '../components/ScoreRing';
import ConfirmDialog from '../components/ConfirmDialog';
import SkeletonLoader from '../components/SkeletonLoader';
import { formatSAR } from '../utils/formatSAR';
import { formatDate, isOverdue } from '../utils/formatDate';
import { getScoreLabel, getAvatarColor, getStageClass } from '../utils/scoreColor';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { addToast } = useToast();

  const [client, setClient] = useState(null);
  const [activeTab, setActiveTab] = useState('deal');
  const [idea, setIdea] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFileDeleteId, setShowFileDeleteId] = useState(null);
  const [files, setFiles] = useState([]);

  const fileInputRef = useRef(null);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const textMuted = isDark ? '#4A5A82' : '#94A3B8';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';
  const elevated = isDark ? '#1A2540' : '#F0F7FF';

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      const [cRes, fRes, aRes] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/files/${id}`),
        fetch(`/api/analyze-idea/${id}`)
      ]);
      const [cData, fData, aData] = await Promise.all([cRes.json(), fRes.json(), aRes.json()]);
      
      setClient(cData);
      setFiles(fData);
      if (Array.isArray(aData) && aData.length > 0) {
        setAnalysis(aData[0]);
      } else if (!aData.error && !Array.isArray(aData)) {
        setAnalysis(aData);
      }
    } catch (e) {
      addToast('خطأ في تحميل البيانات', 'error');
    }
  }

  async function handleDeleteClient() {
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      addToast('تم حذف العميل بنجاح', 'success');
      navigate('/clients');
    } catch (e) {
      addToast('فشل الحذف', 'error');
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', id);

    try {
      const res = await fetch(`/api/files/${id}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.id) {
        addToast('تم الرفع بنجاح', 'success');
        setFiles(prev => [...prev, data]);
      }
    } catch (e) {
      addToast('فشل الرفع', 'error');
    }
  }

  async function handleAnalyze() {
    if (!idea.trim()) return addToast('يرجى إدخال فكرة العميل أولاً', 'info');
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: id, client_idea: idea, client_name: client.client_name, sector: client.sector })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);

      setAnalysis(data.analysis || data);
      addToast('اكتمل التحليل الذكي ✨', 'success');
    } catch (e) {
      addToast('فشل التحليل', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (!client) return <SkeletonLoader type="client_detail" />; // Corrected skeleton name based on previous implementation or standard

  const { label: scoreLabel, textColor: scoreColor } = getScoreLabel(client.total_score || 0);
  const avatarColor = getAvatarColor(client.client_name);

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '14px',
        background: activeTab === id ? 'linear-gradient(135deg, #4F8EF7, #7C3AED)' : 'transparent',
        color: activeTab === id ? '#fff' : textSecondary,
        border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontWeight: 600,
        transition: 'all 0.3s', position: 'relative'
      }}
    >
      <Icon size={18} />
      {label}
      {activeTab === id && (
         <motion.div layoutId="tabActive" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', borderRadius: '14px', zIndex: -1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
      )}
    </button>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ direction: 'rtl' }}>
      {/* Header Card */}
      <div className="glass-card flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 mb-8">
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div className="letter-avatar" style={{ background: avatarColor, width: '88px', height: '88px', fontSize: '36px', borderRadius: '24px', boxShadow: '0 12px 24px -10px rgba(0,0,0,0.3)' }}>
            {client.client_name?.charAt(0) || '؟'}
          </div>
          <div>
            <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '32px', fontWeight: 800, color: textPrimary, letterSpacing: '-0.5px' }}>{client.client_name}</h1>
            <div style={{ display: 'flex', gap: '20px', marginTop: '10px', color: textSecondary, fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={18} color="#4F8EF7" /> {client.city}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={18} color="#7C3AED" /> {client.sector}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between w-full md:w-auto gap-6 md:gap-10">
          <div style={{ textAlign: 'center' }}>
            <ScoreRing score={client.total_score || 0} size={100} strokeWidth={9} />
            <div style={{ marginTop: '10px', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 800, color: scoreColor }}>{scoreLabel}</div>
          </div>
          <div className="flex flex-row sm:flex-col gap-3 md:gap-4 w-full sm:w-auto">
            <button className="btn-primary w-full sm:w-auto" onClick={() => navigate(`/clients/${id}/edit`)} style={{ padding: '12px 24px' }}>
              <Edit3 size={16} /> تعديل البيانات
            </button>
            <button className="btn-secondary" onClick={() => setShowDeleteConfirm(true)} style={{ padding: '12px 24px', color: '#EF4444', borderColor: '#EF444422' }}>
              <Trash2 size={16} /> حــذف العميل
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar gap-2 p-1.5 rounded-[18px] mb-8 w-full sm:w-fit" style={{ background: isDark ? 'rgba(15, 22, 41, 0.4)' : '#F0F4FF', border: `1px solid ${border}` }}>
        <TabButton id="deal" label="نظرة عالمة" icon={Briefcase} />
        <TabButton id="files" label="المرفقات والملفات" icon={FileText} />
        <TabButton id="prep" label="تجهيز الاجتماع ✨" icon={Sparkles} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'deal' && (
          <motion.div key="deal" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-6">
              {/* Score Breakdown */}
              <div className="glass-card" style={{ padding: '28px' }}>
                <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '19px', fontWeight: 700, color: textPrimary, marginBottom: '24px', borderBottom: `1px solid ${border}`, paddingBottom: '16px' }}>تفاصيل التقييم</h3>
                <motion.div variants={container} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                   {[
                     { l: 'الميزانية', v: client.budget_score, icon: '💰' },
                     { l: 'صاحب القرار', v: client.authority_score, icon: '👑' },
                     { l: 'الحاجة الماسة', v: client.need_score, icon: '🎯' },
                     { l: 'الجدول الزمني', v: client.timeline_score, icon: '⏰' },
                     { l: 'ملاءمة الحل', v: client.fit_score, icon: '✅' }
                   ].map((s, idx) => (
                     <motion.div key={idx} variants={item} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FBFF', borderRadius: '14px', border: `1px solid ${border}` }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                         <span style={{ fontSize: '20px' }}>{s.icon}</span>
                         <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, fontWeight: 500 }}>{s.l}</span>
                       </div>
                       <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', fontWeight: 800, color: s.v >= 15 ? '#10B981' : s.v >= 10 ? '#F59E0B' : '#EF4444' }}>
                         {s.v} <span style={{ fontSize: '12px', opacity: 0.6 }}>نقطة</span>
                       </div>
                     </motion.div>
                   ))}
                </motion.div>
              </div>

              {/* Deal Info */}
              <div className="glass-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                  <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '19px', fontWeight: 700, color: textPrimary }}>حالة الصفقة</h3>
                  <div className={`badge ${getStageClass(client.stage)}`} style={{ padding: '10px 18px', fontSize: '15px', fontWeight: 700 }}>{client.stage}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                  <div style={{ padding: '20px', background: elevated, borderRadius: '20px', border: `1px solid ${border}` }}>
                    <div style={{ color: textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>القيمة التقديرية</div>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#4F8EF7', letterSpacing: '-0.5px' }}>{formatSAR(client.expected_value)}</div>
                  </div>
                  <div style={{ padding: '20px', background: elevated, borderRadius: '20px', border: `1px solid ${border}` }}>
                    <div style={{ color: textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>اسم الصفقة</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: textPrimary }}>{client.deal_name || 'غير محدد'}</div>
                  </div>
                </div>

                <h4 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginBottom: '18px', fontWeight: 600 }}>المواعيد والتواريخ الهامة</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: isDark ? 'rgba(255,255,255,0.01)' : 'transparent', borderRadius: '12px', borderBottom: isDark ? 'none' : `1px solid ${border}` }}>
                    <span style={{ color: textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> تاريخ آخر تواصل</span>
                    <span style={{ fontWeight: 700, color: textPrimary }}>{formatDate(client.last_contact_date)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: isDark ? 'rgba(255,255,255,0.01)' : 'transparent', borderRadius: '12px', borderBottom: isDark ? 'none' : `1px solid ${border}` }}>
                    <span style={{ color: textSecondary, display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays size={16} /> موعد المتابعة القادم</span>
                    <span style={{ fontWeight: 700, color: isOverdue(client.next_followup_date) ? '#EF4444' : '#10B981' }}>{formatDate(client.next_followup_date)}</span>
                  </div>
                </div>

                {client.notes && (
                  <div style={{ marginTop: '28px' }}>
                    <h4 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginBottom: '12px', fontWeight: 600 }}>ملاحظات العميل</h4>
                    <div style={{ padding: '16px', borderRadius: '14px', background: elevated, color: textSecondary, fontSize: '14px', lineHeight: '1.6' }}>{client.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <motion.div key="files" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}>
            <div 
              className="glass-card" 
              style={{ padding: '48px', textAlign: 'center', border: `2px dashed ${border}`, cursor: 'pointer', transition: 'border-color 0.3s' }} 
              onClick={() => fileInputRef.current.click()}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#4F8EF7'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = border}
            >
              <input type="file" hidden ref={fileInputRef} onChange={handleFileUpload} />
              <div style={{ width: '72px', height: '72px', background: '#4F8EF715', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#4F8EF7' }}>
                <UploadCloud size={36} />
              </div>
              <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 700, color: textPrimary }}>اضغط هنا لرفع المرفقات</h3>
              <p style={{ color: textSecondary, marginTop: '10px', fontSize: '15px' }}>يدعم ملفات الصور و PDF وتصاميم النظام (حتى 20 ميجا للملف)</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginTop: '32px' }}>
              {files.map(file => (
                <motion.div key={file.id} whileHover={{ y: -4 }} className="glass-card" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                   <div style={{ width: '48px', height: '48px', background: isDark ? '#1a2540' : '#f0f4ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F8EF7', flexShrink: 0 }}>
                     <FileText size={24} />
                   </div>
                   <div style={{ flex: 1, overflow: 'hidden' }}>
                     <div style={{ fontSize: '14px', fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.file_name}</div>
                     <div style={{ fontSize: '12px', color: textSecondary, marginTop: '4px' }}>{formatDate(file.uploaded_at)}</div>
                   </div>
                   <div style={{ display: 'flex', gap: '6px' }}>
                     <a href={`/api/files/download/${file.id}`} download className="btn-secondary" style={{ padding: '10px', borderRadius: '10px' }}><Download size={16} /></a>
                     <button className="btn-secondary" style={{ padding: '10px', borderRadius: '10px', color: '#EF4444', borderColor: '#EF444422' }} onClick={(e) => {
                       e.stopPropagation();
                       setShowFileDeleteId(file.id);
                     }}>
                       <Trash size={16} />
                     </button>
                   </div>
                </motion.div>
              ))}
              {files.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: textMuted, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                  لا توجد ملفات مرفوعة حالياً
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Prep Tab - AI Integration */}
        {activeTab === 'prep' && (
          <motion.div key="prep" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="glass-card" style={{ padding: '32px', marginBottom: '32px', border: `1px solid transparent`, background: isDark ? 'linear-gradient(135deg, rgba(79,142,247,0.05), rgba(124,58,237,0.05))' : '#F5F9FF' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
                 <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #4F8EF7, #7C3AED)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 20px rgba(79,142,247,0.3)' }}>
                   <Sparkles size={24} />
                 </div>
                 <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '22px', fontWeight: 800, color: textPrimary }}>مساعد الاجتماعات الذكي</h3>
               </div>
               <textarea
                 className="form-input"
                 placeholder="اكتب هنا فكرة العميل أو المشكلة التي يريد حلها بالتفصيل... سأقوم بتحليلها وبناء خطة اجتماع كاملة لك."
                 value={idea}
                 onChange={e => setIdea(e.target.value)}
                 rows={4}
                 style={{ fontSize: '16px', lineHeight: '1.7', marginBottom: '24px', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff' }}
               />
               <div className="flex flex-col sm:flex-row gap-4 mb-3">
                <button className="btn-primary" onClick={handleAnalyze} disabled={isAnalyzing} style={{ minWidth: '220px', height: '54px', fontSize: '16px', fontWeight: 700 }}>
                  {isAnalyzing ? 'جاري التحليل بعناية...' : 'ابدأ التحليل الذكي ✨'}
                </button>
                {analysis && <button className="btn-secondary" onClick={() => window.print()} style={{ height: '54px' }}><Printer size={18} /> طباعة التقرير</button>}
               </div>
            </div>

            {isAnalyzing && <SkeletonLoader type="ai_analysis" />}

            {analysis && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="printable-results">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-7">
                  <motion.div variants={item} initial="hidden" animate="show" className="glass-card" style={{ padding: '28px', borderRight: '4px solid #4F8EF7' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, marginBottom: '18px', color: '#4F8EF7', fontSize: '18px' }}><Briefcase size={20} /> تحليل البزنس والقيمة</h4>
                    <p style={{ lineHeight: '1.9', fontSize: '15px', color: textSecondary }}>
                      {typeof analysis.business_analysis === 'object' ? analysis.business_analysis?.main_goal || analysis.business_analysis?.current_problem : analysis.business_analysis}
                    </p>
                  </motion.div>
                  <motion.div variants={item} initial="hidden" animate="show" className="glass-card" style={{ padding: '28px', borderRight: '4px solid #10B981' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, marginBottom: '18px', color: '#10B981', fontSize: '18px' }}><CalendarDays size={20} /> خطة الاجتماع المقترحة</h4>
                    <p style={{ lineHeight: '1.9', fontSize: '15px', color: textSecondary }}>
                      {typeof analysis.meeting_plan === 'object' ? analysis.meeting_plan?.opening || analysis.meeting_plan?.next_step : analysis.meeting_plan}
                    </p>
                  </motion.div>
                </div>

                {/* Discovery Questions */}
                <motion.div variants={item} initial="hidden" animate="show" className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '28px' }}>
                   <div style={{ padding: '20px 28px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, background: isDark ? 'rgba(255,255,255,0.02)' : '#F9FBFF', fontSize: '18px', color: '#7C3AED' }}>
                     <ListChecks size={22} /> أسئلة اكتشاف الاحتياج (Discovery)
                   </div>
                   <div style={{ padding: '8px 16px' }}>
                     {['business', 'technical', 'scope'].map(category => (
                       analysis.discovery_questions?.[category]?.map((q, idx) => (
                         <div key={`${category}-${idx}`} style={{ padding: '18px 12px', borderBottom: idx === analysis.discovery_questions[category].length - 1 && category === 'scope' ? 'none' : `1px solid ${border}`, display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                           <span style={{ width: '28px', height: '28px', background: '#7C3AED15', color: '#7C3AED', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>?</span>
                           <div style={{ fontSize: '16px', fontWeight: 600, color: textPrimary, lineHeight: '1.5' }}>{q}</div>
                         </div>
                       ))
                     ))}
                   </div>
                </motion.div>

                {/* User Journeys */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '22px', fontWeight: 800, marginBottom: '24px', color: textPrimary }}>
                  <MapIcon size={26} color="#F59E0B" /> السيناريوهات المقترحة (Scenarios)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                  {analysis.user_journeys?.map((j, idx) => (
                    <motion.div key={idx} whileHover={{ y: -5 }} className="glass-card" style={{ padding: '28px', background: isDark ? 'rgba(245, 158, 11, 0.03)' : '#FFFDFA', borderColor: 'rgba(245, 158, 11, 0.1)' }}>
                      <h5 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '20px', color: '#F59E0B' }}>{j.user_type || j.role}</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
                        {j.steps?.map((step, sidx) => (
                          <div key={sidx} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B', zIndex: 1, marginTop: '6px' }} />
                              {sidx !== j.steps.length - 1 && <div style={{ width: '2px', flex: 1, background: '#F59E0B22', margin: '-4px 0' }} />}
                            </div>
                            <div style={{ fontSize: '15px', color: textSecondary, paddingBottom: '20px', fontWeight: 500, lineHeight: '1.6' }}>{step}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {!analysis && !isAnalyzing && (
              <div style={{ textAlign: 'center', padding: '60px', color: textMuted, border: `2px dashed ${border}`, borderRadius: '24px' }}>
                 <Sparkles size={48} style={{ opacity: 0.1, marginBottom: '20px' }} />
                 <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>أدخل فكرة العميل أعلاه للحصول على تحليل واحترافي للاجتماع</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteClient}
        title="حذف العميل"
        message={`هل أنت متأكد من حذف العميل "${client?.client_name}"؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع الصفقات والملفات المرتبطة به.`}
        confirmText="نعم، احذف العميل"
      />

      <ConfirmDialog
        isOpen={!!showFileDeleteId}
        onClose={() => setShowFileDeleteId(null)}
        onConfirm={async () => {
          if (!showFileDeleteId) return;
          try {
            await fetch(`/api/files/${showFileDeleteId}`, { method: 'DELETE' });
            fetchData();
            addToast('تم حذف الملف بنجاح', 'success');
          } catch (e) {
            addToast('حدث خطأ أثناء حذف الملف', 'error');
          }
          setShowFileDeleteId(null);
        }}
        title="حذف الملف"
        message="هل أنت متأكد من حذف هذا الملف بشكل نهائي؟"
        confirmText="حذف الملف"
      />
    </motion.div>
  );
}
