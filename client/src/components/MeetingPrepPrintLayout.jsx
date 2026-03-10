import React from 'react';
import { 
  Briefcase, Users, Sparkles, ListChecks, Map as MapIcon, CalendarDays, ClipboardList 
} from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function MeetingPrepPrintLayout({ data }) {
  if (!data) return null;

  const { title, client_name, sector, meeting_date, updated_at, id } = data;
  
  let analysis = {};
  try {
    analysis = typeof data.analysis_result === 'string' 
      ? JSON.parse(data.analysis_result) 
      : data.analysis_result || {};
  } catch (e) {
    console.error("Print layout parse error:", e);
  }

  const pageStyle = {
    direction: 'rtl',
    fontFamily: "'IBM Plex Sans Arabic', 'Cairo', Arial, sans-serif",
    width: '100%',
    margin: '0',
    background: '#fff',
    color: '#000',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ background: '#fff', width: '100%', minHeight: '100vh', direction: 'rtl' }}>
      
      {/* ======================= COMPACT HEADER (Replaces Cover) ======================= */}
      <div style={{ ...pageStyle, paddingTop: '10px', paddingBottom: '30px', boxSizing: 'border-box' }}>
        
        {/* Top Bar: Logo & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #000', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '28pt', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>SALES FOCUS</div>
            <div style={{ fontSize: '10pt', fontWeight: 700, color: '#555', marginTop: '4px', letterSpacing: '4px', textTransform: 'uppercase' }}>Intelligence Hub</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12pt', fontWeight: 900, background: '#000', color: '#fff', padding: '4px 8px', display: 'inline-block', marginBottom: '4px' }}>
              PREP ID: #{String(id).padStart(4, '0')}
            </div>
            <div style={{ fontWeight: 700, fontSize: '9pt', color: '#666' }}>
              {new Date().toLocaleDateString('ar-SA')}
            </div>
            <div style={{ fontSize: '7pt', fontWeight: 700, color: '#aaa', letterSpacing: '2px', textTransform: 'uppercase', marginTop: '4px' }}>
              Strategic Dossier
            </div>
          </div>
        </div>

        {/* Title & Core Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '24pt', fontWeight: 900, lineHeight: 1.3, margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {title || 'تقرير تحضير استراتيجي'}
            </h1>
            <div style={{ fontSize: '14pt', fontWeight: 700, color: '#666', marginTop: '8px' }}>
              تحضير اجتماع استراتيجي متكامل
            </div>
          </div>
          <div style={{ borderRight: '2px dashed #ddd', paddingRight: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt' }}>
              <span style={{ fontWeight: 900, color: '#555' }}>العميل:</span>
              <span style={{ fontWeight: 700 }}>{client_name || 'غير محدد'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt' }}>
              <span style={{ fontWeight: 900, color: '#555' }}>القطاع:</span>
              <span style={{ fontWeight: 700 }}>{sector || 'غير محدد'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt' }}>
              <span style={{ fontWeight: 900, color: '#555' }}>التاريخ:</span>
              <span style={{ fontWeight: 700 }}>{meeting_date ? formatDate(meeting_date) : 'غير محدد'}</span>
            </div>
          </div>
        </div>

        {/* 1. Strategic Message */}
        {analysis.key_message && (
          <div style={{ background: '#000', color: '#fff', padding: '36px', marginBottom: '40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: '10pt', fontWeight: 900, marginBottom: '16px', letterSpacing: '4px', textTransform: 'uppercase', color: '#888' }}>
              الرسالة الاستراتيجية الكبرى
            </div>
            <p style={{ fontSize: '22pt', fontWeight: 900, lineHeight: 1.4, margin: 0, wordBreak: 'break-word' }}>
              {analysis.key_message}
            </p>
          </div>
        )}

        {/* 2. Business Analysis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
          {analysis.business_analysis?.main_goal && (
            <div>
              <h3 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', display: 'inline-block' }}>
                هدف المشروع
              </h3>
              <p style={{ fontSize: '12pt', lineHeight: 1.8, color: '#333', margin: 0, wordBreak: 'break-word' }}>
                {analysis.business_analysis.main_goal}
              </p>
            </div>
          )}
          {analysis.business_analysis?.current_problem && (
            <div>
              <h3 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', display: 'inline-block' }}>
                المشكلة الحالية
              </h3>
              <p style={{ fontSize: '12pt', lineHeight: 1.8, color: '#333', margin: 0, wordBreak: 'break-word' }}>
                {analysis.business_analysis.current_problem}
              </p>
            </div>
          )}
        </div>

        {/* 3. Platforms & Segments */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
          {analysis.business_analysis?.expected_platforms?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '12pt', fontWeight: 900, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>المنصات المتوقعة</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {analysis.business_analysis.expected_platforms.map((p, i) => (
                  <span key={i} style={{ border: '2px solid #000', padding: '4px 12px', fontWeight: 700, fontSize: '11pt' }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          {analysis.business_analysis?.target_users?.length > 0 && (
            <div>
              <h3 style={{ fontSize: '12pt', fontWeight: 900, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>الفئات المستهدفة</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {analysis.business_analysis.target_users.map((u, i) => (
                  <span key={i} style={{ background: '#f3f4f6', padding: '4px 12px', fontWeight: 700, fontSize: '11pt' }}>{u}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Meeting Plan */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20pt', fontWeight: 900, borderRight: '8px solid #000', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#f9fafb', marginBottom: '24px' }}>خطة تسيير الاجتماع</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div style={{ border: '2px solid #000', padding: '28px' }}>
              <span style={{ fontSize: '9pt', fontWeight: 900, color: '#999', display: 'block', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>Suggested Opening / الافتتاح المقترح</span>
              <p style={{ fontSize: '14pt', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.7, margin: 0, wordBreak: 'break-word' }}>
                "{analysis.meeting_plan?.opening}"
              </p>
            </div>
            <div style={{ background: '#000', color: '#fff', padding: '28px' }}>
               <span style={{ fontSize: '9pt', fontWeight: 900, color: '#666', display: 'block', marginBottom: '12px', borderBottom: '1px solid #333', paddingBottom: '8px', textTransform: 'uppercase', letterSpacing: '2px' }}>Next Step Goal / الهدف التالي</span>
               <p style={{ fontSize: '16pt', fontWeight: 900, margin: 0, wordBreak: 'break-word' }}>
                 {analysis.meeting_plan?.next_step}
               </p>
            </div>
          </div>
        </div>

        {/* 5. Discovery Questions */}
        <div style={{ pageBreakBefore: 'always', paddingTop: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20pt', fontWeight: 900, borderRight: '8px solid #000', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#f9fafb', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            الأسئلة الاستكشافية الموصى بها
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            {[
              { key: 'business', label: 'الوعي بالبزنس' },
              { key: 'technical', label: 'المتطلبات التقنية' },
              { key: 'scope', label: 'النطاق والميزانية' }
            ].map((cat) => (
              analysis.discovery_questions?.[cat.key]?.length > 0 && (
                <div key={cat.key} style={{ borderTop: '4px solid #000', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '13pt', fontWeight: 900, marginBottom: '20px' }}>{cat.label}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {analysis.discovery_questions[cat.key].map((q, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '11pt', lineHeight: 1.6, color: '#444', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px', wordBreak: 'break-word' }}>
                        <span style={{ color: '#000', fontWeight: 900, flexShrink: 0 }}>?</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </div>

        {/* 6. User Journeys */}
        <div style={{ pageBreakBefore: 'always', paddingTop: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20pt', fontWeight: 900, borderRight: '8px solid #000', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#f9fafb', marginBottom: '24px' }}>
            مخططات رحلة المستخدم (User Journeys)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {analysis.user_journeys?.map((j, idx) => (
              <div key={idx} style={{ borderRight: '2px solid #e5e7eb', paddingRight: '24px' }}>
                <div style={{ display: 'inline-block', background: '#000', color: '#fff', padding: '6px 24px', fontSize: '14pt', fontWeight: 900, marginBottom: '24px' }}>
                  {j.user_type}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {j.steps?.map((step, sidx) => (
                    <div key={sidx} style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                      <div style={{ width: '36px', height: '36px', border: '3px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13pt', flexShrink: 0, background: '#fff' }}>
                        {sidx + 1}
                      </div>
                      <div style={{ fontSize: '13pt', fontWeight: 600, paddingTop: '4px', lineHeight: 1.7, background: '#f9fafb', padding: '12px 16px', flex: 1, border: '1px solid #f0f0f0', wordBreak: 'break-word' }}>
                        {step}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Raw Notes */}
        {data.idea_raw && (
           <div style={{ paddingTop: '32px', borderTop: '2px dashed #ccc', marginBottom: '40px' }}>
             <h3 style={{ fontSize: '14pt', fontWeight: 900, marginBottom: '20px', color: '#999', display: 'flex', alignItems: 'center', gap: '8px' }}>
               ملاحظات وبيانات أولية
             </h3>
             <div style={{ background: '#f9fafb', padding: '24px', fontSize: '11pt', lineHeight: 1.9, color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
               {data.idea_raw}
             </div>
           </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: '40px', textAlign: 'center', fontSize: '9pt', fontWeight: 700, color: '#bbb' }}>
          Generated automatically by Sales Focus – Intelligence Hub (Groq Engine V1.0.0)<br/>
          © {new Date().getFullYear()} Sales Focus Platform. All rights reserved.
        </div>
      </div>
    </div>
  );
}
