import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Loader2, Sparkles, Zap, Download, FileDown, Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';

// Added for Markdown rendering
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } }
};

export default function TechnicalProposals() {
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    offerNumber: `MS-${Math.floor(1000 + Math.random() * 9000)}`,
    managerName: '',
    meetingNotes: '',
    proposalText: '',
    price: '',
    vat: '',
    total: '',
    durationDays: '',
    serviceDescription: 'تطوير وبرمجة منصة متكاملة',
  });

  // AI Structured Data (Extracted from proposalText)
  const [structuredData, setStructuredData] = useState({
    strategicGoals: [],
    actors: [],
    features: [],
    journeys: [],
    adminFeatures: []
  });

  useEffect(() => {
    if (formData.price) {
      const p = parseFloat(formData.price) || 0;
      const v = p * 0.15;
      setFormData(prev => ({ ...prev, vat: v.toFixed(2), total: (p + v).toFixed(2) }));
    }
  }, [formData.price]);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';
  const cardBg = isDark ? 'rgba(30, 45, 74, 0.4)' : 'rgba(255, 255, 255, 0.5)';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerateAI = async () => {
    if (!formData.meetingNotes.trim()) {
      addToast('الرجاء إدخال تفاصيل الاجتماع أولاً', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_URL('/api/proposals'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formData.meetingNotes }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ في الاتصال');

      setFormData(prev => ({ ...prev, proposalText: data.proposal }));
      parseAIProposal(data.proposal);
      addToast('تم إنشاء العرض الفني بنجاح', 'success');
    } catch (err) {
      addToast(err.message || 'حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const parseAIProposal = (text) => {
    // Simple parser to extract points for docxtemplater loops
    // In a real app, this would be more robust or handled by AI directly returning JSON
    const goals = text.match(/الأهداف الاستراتيجية:([\s\S]*?)C\./i)?.[1]?.match(/- .+/g)?.map(s => ({ name: s.replace('- ', '').trim() })) || [];
    const actors = text.match(/هيكلية المستخدمين:([\s\S]*?)سيناريو/i)?.[1]?.match(/- .+/g)?.map(s => ({ name: s.replace('- ', '').trim() })) || [];
    
    setStructuredData({
      strategicGoals: goals,
      actors: actors,
      features: [{ name: 'نظام إدارة كامل' }, { name: 'لوحة تحكم احترافية' }], // Mocking for now or better parsing
      journeys: [{ name: 'تسجيل الدخول' }, { name: 'تصفح الخدمات' }, { name: 'إتمام الطلب' }],
      adminFeatures: [{ name: 'إدارة العملاء' }, { name: 'إدارة التقارير' }]
    });
  };

  const handleExport = async (type) => {
    if (!formData.clientName) {
      addToast('يرجى إدخال اسم العميل', 'error');
      return;
    }

    const setLoader = type === 'docx' ? setExportingDocx : setExportingPdf;
    setLoader(true);

    try {
      const payload = {
        ...formData,
        ...structuredData
      };

      const endpoint = type === 'docx' ? '/api/proposals/generate-docx' : '/api/proposals/generate-pdf';
      const response = await fetch(API_URL(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'فشل التصدير');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal_${formData.clientName}_${Date.now()}.${type}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      addToast(`تم تصدير ملف ${type.toUpperCase()} بنجاح`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoader(false);
    }
  };

  const handleCopy = () => {
    if (!formData.proposalText) return;
    navigator.clipboard.writeText(formData.proposalText);
    addToast('تم نسخ العرض للحافظة', 'success');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1400px] mx-auto pb-10 rtl" style={{ direction: 'rtl' }}>
      <motion.header variants={item} className="mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3" style={{ color: textPrimary }}>
          <FileText size={32} color="#4F8EF7" /> إعداد العرض الفني الذكي
        </h1>
        <p className="text-sm mt-2" style={{ color: textSecondary }}>
          أكمل البيانات الأساسية، استخدم الذكاء الاصطناعي لتوليد المقترح، ثم قم بالتصدير مباشرة للقالب الرسمي.
        </p>
      </motion.header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-8">
        {/* Left: Input Panel */}
        <motion.div variants={item} className="glass-card p-6 flex flex-col gap-6" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>اسم العميل</label>
              <input 
                name="clientName" value={formData.clientName} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
                placeholder="شركة مثال المحدودة"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>تاريخ العرض</label>
              <input 
                type="date" name="date" value={formData.date} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>رقم العرض</label>
              <input 
                name="offerNumber" value={formData.offerNumber} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>مدير المشروع</label>
              <input 
                name="managerName" value={formData.managerName} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
                placeholder="م. محمد القحطاني"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>تفاصيل الاجتماع / الفكرة</label>
            <textarea
              name="meetingNotes" value={formData.meetingNotes} onChange={handleInputChange}
              className="w-full min-h-[150px] p-4 rounded-xl border bg-transparent text-sm leading-relaxed" 
              style={{ borderColor: border, color: textPrimary }}
              placeholder="اكتب هنا ما تم مناقشته في الاجتماع..."
            />
          </div>

          <button onClick={handleGenerateAI} disabled={loading} className="btn-primary w-full p-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
            {loading ? 'جاري التحليل والإنشاء...' : 'إتمام العرض الذكي'}
          </button>

          <hr style={{ borderColor: border }} />

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>وصف الخدمة (للجدول المالي)</label>
              <input 
                name="serviceDescription" value={formData.serviceDescription} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>المبلغ (ريال)</label>
              <input 
                type="number" name="price" value={formData.price} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-bold" style={{ color: textPrimary }}>مدة التنفيذ (أيام)</label>
              <input 
                type="number" name="durationDays" value={formData.durationDays} onChange={handleInputChange} 
                className="w-full p-3 rounded-xl border bg-transparent" style={{ borderColor: border, color: textPrimary }}
              />
            </div>
          </div>
        </motion.div>

        {/* Right: Preview Panel */}
        <motion.div variants={item} className="flex flex-col gap-6">
          <div className="glass-card p-6 flex-1 flex flex-col min-h-[600px]" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '24px' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: textPrimary }}>معاينة العرض</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleExport('docx')} disabled={exportingDocx || !formData.proposalText}
                  className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-sm font-bold flex items-center gap-2 hover:bg-blue-500 hover:text-white transition-all disabled:opacity-30"
                >
                  {exportingDocx ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} تصدير Word
                </button>
                <button 
                  onClick={() => handleExport('pdf')} disabled={exportingPdf || !formData.proposalText}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 text-sm font-bold flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
                >
                  {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} تصدير PDF
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-black/20 rounded-2xl p-6 border border-white/5 custom-scrollbar">
              {!formData.proposalText ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                  <FileText size={80} className="mb-4" />
                  <p>البيانات المولدة ستظهر هنا بعد التحليل</p>
                </div>
              ) : (
                <div id="proposal-content" className="prose prose-invert max-w-none text-right">
                  <div className="mb-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <h3 className="text-blue-400 font-bold mb-2">بيانات القالب المستخرجة:</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div><span className="opacity-50">الأهداف:</span> {structuredData.strategicGoals.length}</div>
                      <div><span className="opacity-50">الفئات:</span> {structuredData.actors.length}</div>
                    </div>
                  </div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {formData.proposalText}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
