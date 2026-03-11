import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Loader2, Sparkles, Zap, Download } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const [inputText, setInputText] = useState('');
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';
  const cardBg = isDark ? 'rgba(30, 45, 74, 0.4)' : 'rgba(255, 255, 255, 0.5)';

  const handleGenerate = async () => {
    if (!inputText.trim()) {
      addToast('الرجاء إدخال تفاصيل المشروع أو الاجتماع', 'error');
      return;
    }

    setLoading(true);
    setProposal('');

    try {
      const res = await fetch(API_URL('/api/proposals'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'حدث خطأ في الاتصال');
      }

      setProposal(data.proposal);
      addToast('تم إنشاء العرض الفني بنجاح', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!proposal) return;
    navigator.clipboard.writeText(proposal);
    addToast('تم نسخ العرض كاملاً للحافظة', 'success');
  };

  const handleDownloadPDF = async () => {
    if (!proposal) return;
    const element = document.getElementById('proposal-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('technical-proposal.pdf');
      addToast('تم تحميل العرض الفني بنجاح', 'success');
    } catch (e) {
      addToast('خطأ أثناء تحميل PDF', 'error');
    }
  };

  const QUICK_EXAMPLES = [
    "منصة حجوزات للملاعب الرياضية تدعم الدفع الإلكتروني",
    "تطبيق توصيل طلبات للمطاعم في الرياض مع تتبع السائقين",
    "نظام إدارة موارد المؤسسات (ERP) لشركة عقارية"
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" style={{ direction: 'rtl', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      <motion.header variants={item} style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '32px', fontWeight: 800, color: textPrimary, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={32} color="#4F8EF7" /> العروض الفنية
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginTop: '8px' }}>
          أدخل تفاصيل الفكرة أو ملخص الاجتماع مع العميل ليقوم الذكاء الاصطناعي بإنشاء عرض فني احترافي ومفصل.
        </p>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 lg:gap-8 items-start">
        <motion.div variants={item} className="glass-card p-5 md:p-6 flex flex-col gap-5" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontWeight: 700, color: textPrimary }}>
              تفاصيل الفكرة أو ملخص الاجتماع
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب هنا تفاصيل المشروع ومخرجات الاجتماع... (مثال: منصة حجوزات للملاعب الرياضية تدعم الدفع الإلكتروني وتطبيق خاص بالإدارة...)"
              style={{
                width: '100%', minHeight: '300px', padding: '16px', borderRadius: '14px', border: `1px solid ${border}`,
                background: isDark ? 'rgba(15, 22, 41, 0.6)' : '#fff', color: textPrimary,
                fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', resize: 'vertical'
              }}
            />
          </div>

          <div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: textSecondary, marginBottom: '8px', display: 'block' }}>أمثلة سريعة:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {QUICK_EXAMPLES.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(ex)}
                  style={{
                    textAlign: 'right', padding: '10px 14px', borderRadius: '10px',
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', border: `1px solid ${border}`,
                    color: textPrimary, fontSize: '14px', fontFamily: "'IBM Plex Sans Arabic', sans-serif",
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => Object.assign(e.currentTarget.style, { background: isDark ? 'rgba(79, 142, 247, 0.1)' : '#EFF6FF', borderColor: '#4F8EF7' })}
                  onMouseOut={e => Object.assign(e.currentTarget.style, { background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFF', borderColor: border })}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? (isDark ? '#334155' : '#cbd5e1') : 'linear-gradient(135deg, #4F8EF7, #7C3AED)',
              color: loading ? (isDark ? '#94a3b8' : '#475569') : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.3s'
            }}
          >
            {loading ? (
              <><Loader2 size={20} className="animate-spin" /> جاري إعداد العرض الفني...</>
            ) : (
              <><Zap size={20} fill="currentColor" /> إنشاء العرض الفني</>
            )}
          </button>
        </motion.div>

        <motion.div variants={item} className="glass-card p-5 md:p-6 flex flex-col min-h-[400px] md:min-h-[600px]" style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '20px' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '20px', fontWeight: 800, color: textPrimary }}>
              النتيجة النهائية
            </h2>
            {proposal && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', background: isDark ? 'rgba(79, 142, 247, 0.15)' : '#E0F2FE',
                    color: '#4F8EF7', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  <Copy size={16} /> 📋 نسخ النص
                </button>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', background: isDark ? 'rgba(124, 58, 237, 0.15)' : '#EDE9FE',
                    color: '#7C3AED', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  <Download size={16} /> 📥 تحميل PDF
                </button>
              </div>
            )}
          </div>

          <div style={{
            flex: 1, padding: '24px', borderRadius: '14px', background: isDark ? 'rgba(15, 22, 41, 0.6)' : '#fff',
            border: `1px solid ${border}`, overflowY: 'auto'
          }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: textSecondary, gap: '16px', minHeight: '300px' }}>
                <Loader2 size={40} className="animate-spin" color="#4F8EF7" />
                <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px' }}>من فضلك انتظر، يقوم الذكاء الاصطناعي الآن بصياغة العرض الفني بشكل احترافي...</span>
              </div>
            ) : proposal ? (
              <div
                id="proposal-content"
                className="prose prose-invert max-w-none proposal-markdown"
                style={{
                  fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', lineHeight: '1.8',
                  color: textPrimary, textAlign: 'right', padding: '10px'
                }}
              >
                <style>{`
                  .proposal-markdown table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    border-radius: 8px;
                    overflow: hidden;
                  }
                  .proposal-markdown th, .proposal-markdown td {
                    border: 1px solid ${border};
                    padding: 12px 16px;
                    text-align: right;
                  }
                  .proposal-markdown th {
                    background-color: ${isDark ? 'rgba(79, 142, 247, 0.15)' : '#EFF6FF'};
                    color: ${isDark ? '#4F8EF7' : '#1E40AF'};
                    font-weight: bold;
                  }
                  .proposal-markdown tr:nth-child(even) {
                    background-color: ${isDark ? 'rgba(255, 255, 255, 0.02)' : '#F8FAFF'};
                  }
                  .proposal-markdown h1, .proposal-markdown h2, .proposal-markdown h3 {
                    color: ${textPrimary};
                    margin-top: 1.5em;
                    margin-bottom: 0.5em;
                    font-weight: 700;
                  }
                  .proposal-markdown h3 {
                    color: ${isDark ? '#4F8EF7' : '#2563EB'};
                  }
                  .proposal-markdown ul, .proposal-markdown ol {
                    padding-right: 24px;
                    margin-bottom: 1em;
                  }
                  .proposal-markdown li {
                    margin-bottom: 0.5em;
                  }
                  .proposal-markdown p {
                    margin-bottom: 1em;
                  }
                `}</style>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {proposal}
                </ReactMarkdown>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: textSecondary, opacity: 0.5, gap: '16px', minHeight: '300px' }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  border: `2px dashed ${border}`,
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isDark ? 'rgba(255,255,255,0.01)' : '#F8FAFF',
                  padding: '40px',
                  textAlign: 'center'
                }}>
                  <FileText size={64} style={{ marginBottom: '16px', opacity: 0.4 }} />
                  <h3 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '18px', fontWeight: 700, color: textPrimary, marginBottom: '8px' }}>
                    النتيجة ستظهر هنا 📄
                  </h3>
                  <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '14px', maxWidth: '300px' }}>
                    قم بإدخال تفاصيل المشروع واضغط على زر "إنشاء العرض الفني" ليقوم الذكاء الاصطناعي ببناء مقترح متكامل جاهز للنسخ والتحميل.
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
