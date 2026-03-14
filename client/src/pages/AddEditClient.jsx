import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, ChevronLeft, Briefcase, Users, Target, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/ToastProvider';
import { API_URL } from '../utils/apiConfig';
import { getScoreLabel } from '../utils/scoreColor';

const CITIES = ['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة', 'أبها', 'تبوك', 'أخرى'];
const SECTORS = ['تجارة', 'مطاعم وضيافة', 'خدمات', 'تعليم', 'صحي', 'عقارات', 'صناعي', 'حكومي', 'أخرى'];
const CHANNELS = ['إحالة', 'واتساب', 'معرض', 'موقع إلكتروني', 'مكالمة باردة', 'أخرى'];
const STAGES = ['جديد', 'تحت المتابعة', 'عرض مُرسل', 'تفاوض', 'فاز', 'خسر'];

const SCORE_CRITERIA = [
  {
    key: 'budget_score', label: 'الميزانية', icon: '💰',
    options: [
      { label: 'ميزانية محددة وواضحة', value: 20 },
      { label: 'تقريبية / يعتمد على العرض', value: 10 },
      { label: 'غير موجودة / نشوف', value: 0 },
    ],
  },
  {
    key: 'authority_score', label: 'صاحب القرار', icon: '👑',
    options: [
      { label: 'أتحدث مع صاحب القرار مباشرة', value: 20 },
      { label: 'مع مؤثر يوصل القرار', value: 10 },
      { label: 'مع موظف فقط', value: 0 },
    ],
  },
  {
    key: 'need_score', label: 'الحاجة الماسة', icon: '🎯',
    options: [
      { label: 'ألم واضح ومحفز للحل', value: 20 },
      { label: 'تحسين وتطوير فقط', value: 10 },
      { label: 'فضول / استكشاف', value: 0 },
    ],
  },
  {
    key: 'timeline_score', label: 'الجدول الزمني', icon: '⏰',
    options: [
      { label: 'فوري (خلال شهر)', value: 20 },
      { label: 'قريب (خلال 3 أشهر)', value: 10 },
      { label: 'بعيد / غير محدد', value: 0 },
    ],
  },
  {
    key: 'fit_score', label: 'ملاءمة الحل', icon: '✅',
    options: [
      { label: 'إمكانياتنا تغطي الاحتياج تماماً', value: 20 },
      { label: 'تغطية جزئية مع تطوير', value: 10 },
      { label: 'تغطية ضعيفة / خارج النطاق', value: 0 },
    ],
  },
];

const defaultForm = {
  client_name: '', client_type: 'شركة', city: 'الرياض', sector: 'تجارة',
  channel: 'واتساب', notes: '', deal_name: '', expected_value: '', payment_percentage: 0.50,
  stage: 'جديد', last_contact_date: new Date().toISOString().split('T')[0],
  next_followup_date: '', ticket_link: '', slack_code: '', budget_score: 0, authority_score: 0,
  need_score: 0, timeline_score: 0, fit_score: 0,
};

const stageColors = { 'جديد': '#4F8EF7', 'تحت المتابعة': '#F59E0B', 'عرض مُرسل': '#7C3AED', 'تفاوض': '#EF4444', 'فاز': '#10B981', 'خسر': '#64748b' };

export default function AddEditClient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { addToast } = useToast();
  const isEdit = !!id;

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  const textPrimary = isDark ? '#F0F4FF' : '#0A0F1E';
  const textSecondary = isDark ? '#8B9CC8' : '#4A5570';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(79, 142, 247, 0.1)';
  const elevated = isDark ? '#1A2540' : '#F0F7FF';

  useEffect(() => {
    if (isEdit) {
      fetch(API_URL(`/api/clients/${id}`))
        .then(r => r.json())
        .then(data => {
          setForm({
            client_name: data.client_name || '',
            client_type: data.client_type || 'شركة',
            city: data.city || 'الرياض',
            sector: data.sector || 'تجارة',
            channel: data.channel || 'واتساب',
            notes: data.notes || '',
            deal_name: data.deal_name || '',
            expected_value: data.expected_value || '',
            payment_percentage: data.payment_percentage != null ? data.payment_percentage : 0.50,
            stage: data.stage || 'جديد',
            last_contact_date: data.last_contact_date || '',
            next_followup_date: data.next_followup_date || '',
            ticket_link: data.ticket_link || '',
            slack_code: data.slack_code || '',
            budget_score: data.budget_score || 0,
            authority_score: data.authority_score || 0,
            need_score: data.need_score || 0,
            timeline_score: data.timeline_score || 0,
            fit_score: data.fit_score || 0,
          });
        });
    }
  }, [id]);

  const totalScore = (form.budget_score || 0) + (form.authority_score || 0) + (form.need_score || 0) + (form.timeline_score || 0) + (form.fit_score || 0);
  const { label: scoreLabel, textColor: scoreColor } = getScoreLabel(totalScore);

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  }

  function validate() {
    const errs = {};
    if (!form.client_name.trim()) errs.client_name = 'اسم العميل مطلوب';
    if (!form.deal_name.trim()) errs.deal_name = 'اسم الصفقة مطلوب للتمكن من المتابعة';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) {
      addToast('يرجى مراجعة البيانات المطلوبة', 'error');
      setActiveStep(1);
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? API_URL(`/api/clients/${id}`) : API_URL('/api/clients');
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'فشل في حفظ البيانات');
      addToast(isEdit ? 'تم تحديث بيانات العميل بنجاح' : 'تمت إضافة العميل والبدء بالصفقة', 'success');
      navigate(`/clients/${data.id || id}`);
    } catch (e) {
      addToast(e.message || 'حدث خطأ غير متوقع', 'error');
    } finally {
      setSaving(false);
    }
  }

  const StepIndicator = ({ num, label, icon: Icon }) => (
    <div
      onClick={() => setActiveStep(num)}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', position: 'relative' }}
    >
      <div style={{
        width: '40px', height: '40px', borderRadius: '12px',
        background: activeStep === num ? 'linear-gradient(135deg, #4F8EF7, #7C3AED)' : (activeStep > num ? '#10B981' : elevated),
        color: activeStep >= num ? '#fff' : textSecondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px',
        boxShadow: activeStep === num ? '0 8px 16px rgba(79,142,247,0.3)' : 'none',
        transition: 'all 0.3s'
      }}>
        {activeStep > num ? <CheckCircle2 size={20} /> : <Icon size={20} />}
      </div>
      <span style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '13px', fontWeight: activeStep === num ? 700 : 500, color: activeStep >= num ? textPrimary : textSecondary }}>{label}</span>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '32px', fontWeight: 800, color: textPrimary, letterSpacing: '-0.5px' }}>
            {isEdit ? 'تعديل ملف العميل' : 'تسجيل عميل جديد'}
          </h1>
          <p style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontSize: '15px', color: textSecondary, marginTop: '4px' }}>املأ البيانات لتقييم الفرصة وبدء المتابعة</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px' }}><X size={18} /> إلغاء</button>
      </div>

      {/* Step Progress */}
      <div style={{ display: 'flex', marginBottom: '40px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', left: '16%', right: '16%', height: '2px', background: border, zIndex: 0 }} />
        <StepIndicator num={1} label="بيانات العميل" icon={Users} />
        <StepIndicator num={2} label="تفاصيل الصفقة" icon={Briefcase} />
        <StepIndicator num={3} label="تقييم الجدية" icon={Target} />
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: CLIENT BASIC INFO */}
        {activeStep === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-5 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>
                  اسم العميل أو الجهة <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="form-input"
                  style={{ fontSize: '17px', padding: '16px' }}
                  placeholder="مثال: شركة الصناعات المتقدمة"
                  value={form.client_name}
                  onChange={e => set('client_name', e.target.value)}
                  required
                />
                {errors.client_name && <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px' }}><AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '4px' }} /> {errors.client_name}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>نوع العميل</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {['شركة', 'فرد'].map(t => (
                    <button
                      key={t}
                      onClick={() => set('client_type', t)}
                      style={{
                        flex: 1, padding: '14px', borderRadius: '12px', border: `1px solid ${form.client_type === t ? '#4F8EF7' : border}`,
                        background: form.client_type === t ? '#4F8EF710' : elevated,
                        color: form.client_type === t ? '#4F8EF7' : textSecondary,
                        fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>المدينة</label>
                <select className="form-input" value={form.city} onChange={e => set('city', e.target.value)}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>القطاع</label>
                <select className="form-input" value={form.sector} onChange={e => set('sector', e.target.value)}>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>قناة الاكتساب</label>
                <select className="form-input" value={form.channel} onChange={e => set('channel', e.target.value)}>
                  {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '32px' }}>
              <button className="btn-primary" onClick={() => setActiveStep(2)} style={{ padding: '12px 32px' }}>المتابعة <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: DEAL INFO */}
        {activeStep === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card p-5 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>
                  اسم الصفقة <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  className="form-input"
                  placeholder="مثال: توريد نظام نقاط البيع لجميع الفروع"
                  value={form.deal_name}
                  onChange={e => set('deal_name', e.target.value)}
                  required
                />
                {errors.deal_name && <div style={{ color: '#EF4444', fontSize: '12px', marginTop: '6px' }}>{errors.deal_name}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>القيمة الكلية للصفقة (ر.س)</label>
                <input className="form-input" type="number" value={form.expected_value} onChange={e => set('expected_value', e.target.value)} placeholder="0.00" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>تُحسب للتارجت (نسبة الدفعة الأولى %)</label>
                <input className="form-input" type="number" value={form.payment_percentage * 100} onChange={e => set('payment_percentage', Number(e.target.value) / 100)} placeholder="50" min="0" max="100" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>مرحلة العميل الحالية</label>
                <select className="form-input" value={form.stage} onChange={e => set('stage', e.target.value)} style={{ color: stageColors[form.stage], fontWeight: 700 }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>موعد المتابعة القادم</label>
                <input className="form-input" type="date" value={form.next_followup_date} onChange={e => set('next_followup_date', e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>رابط التكت (Ticket URL)</label>
                <input className="form-input" placeholder="https://..." value={form.ticket_link} onChange={e => set('ticket_link', e.target.value)} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>كود السلاك (Slack Code)</label>
                <input className="form-input" placeholder="SL-123" value={form.slack_code} onChange={e => set('slack_code', e.target.value)} />
              </div>

              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: textSecondary, marginBottom: '10px' }}>ملاحظات إضافية</label>
                <textarea className="form-input" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
              <button className="btn-secondary" onClick={() => setActiveStep(1)}>السابق</button>
              <button className="btn-primary" onClick={() => setActiveStep(3)} style={{ padding: '12px 32px' }}>التقييم الفني <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: SCORING (CRITICAL UX) */}
        {activeStep === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {/* Live Score Floating Indicator */}
            <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 md:p-6 mb-6" style={{ border: `2px solid ${scoreColor}44`, background: `${scoreColor}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 900, color: scoreColor }}>{totalScore}</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: scoreColor }}>تقييم العميل: {scoreLabel}</div>
                  <div style={{ fontSize: '12px', color: textSecondary }}>يتم التحديث لحظياً بناءً على إجاباتك</div>
                </div>
              </div>
              <div style={{ width: '120px', height: '8px', background: border, borderRadius: '10px', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${totalScore}%` }} style={{ height: '100%', background: scoreColor }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
              {SCORE_CRITERIA.map((criterion) => (
                <div key={criterion.key} className="glass-card p-5 md:p-6">
                  <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                    <span style={{ fontSize: '20px' }}>{criterion.icon}</span> {criterion.label}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {criterion.options.map((opt) => {
                      const isSelected = form[criterion.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => set(criterion.key, opt.value)}
                          style={{
                            padding: '16px 12px', borderRadius: '14px', border: `2px solid ${isSelected ? '#4F8EF7' : border}`,
                            background: isSelected ? '#4F8EF710' : elevated,
                            color: isSelected ? '#4F8EF7' : textSecondary,
                            transition: 'all 0.2s', textAlign: 'center', cursor: 'pointer'
                          }}
                        >
                          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{opt.label}</div>
                          <div style={{ fontSize: '11px', opacity: 0.7 }}>{opt.value} نقطة</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '60px' }}>
              <button className="btn-secondary" onClick={() => setActiveStep(2)}>السابق</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 1, fontSize: '18px', fontWeight: 800, height: '56px' }}>
                {saving ? 'جاري الحفظ...' : (isEdit ? 'تحديث بيانات العميل ✓' : 'حفظ العميل والبدء بالمتابعة 🚀')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
