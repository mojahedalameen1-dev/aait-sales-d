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
              {`${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}`}
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

        {/* 2. Project Idea & Business Analysis */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', marginBottom: '40px' }}>
          <div>
            <h3 style={{ fontSize: '14pt', fontWeight: 900, borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', display: 'inline-block' }}>
              فكرة المشروع والميزات
            </h3>
            <div style={{ fontSize: '12pt', lineHeight: 1.8, color: '#333', margin: 0 }}>
              <p style={{ fontWeight: 800, marginBottom: '8px' }}>ملخص الفكرة:</p>
              <p style={{ marginBottom: '16px' }}>{analysis.project_idea?.summary || analysis.business_analysis?.main_goal}</p>
              
              <p style={{ fontWeight: 800, marginBottom: '8px' }}>الميزات الأساسية (Core Features):</p>
              <ul style={{ paddingRight: '20px', margin: 0 }}>
                {(analysis.project_idea?.core_features || []).map((feat, i) => (
                  <li key={i} style={{ marginBottom: '4px' }}>{feat}</li>
                ))}
              </ul>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {analysis.business_analysis?.target_users?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12pt', fontWeight: 900, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>الفئات المستهدفة</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {analysis.business_analysis.target_users.map((u, i) => (
                    <span key={i} style={{ background: '#f3f4f6', padding: '4px 10px', fontWeight: 700, fontSize: '10pt' }}>{u}</span>
                  ))}
                </div>
              </div>
            )}
            {analysis.business_analysis?.expected_platforms?.length > 0 && (
              <div>
                <h3 style={{ fontSize: '12pt', fontWeight: 900, color: '#666', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>المنصات المتوقعة</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {analysis.business_analysis.expected_platforms.map((p, i) => (
                    <span key={i} style={{ border: '1px solid #000', padding: '3px 10px', fontWeight: 700, fontSize: '10pt' }}>{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Admin Panel */}
        {analysis.admin_panel && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '18pt', fontWeight: 900, borderRight: '8px solid #7C3AED', paddingRight: '16px', background: '#F5F3FF', marginBottom: '20px', paddingTop: '8px', paddingBottom: '8px' }}>
              لوحة الإدارة والتحكم (Admin Panel)
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {[
                { key: 'user_management', label: 'إدارة المستخدمين' },
                { key: 'operations_management', label: 'إدارة العمليات' },
                { key: 'settings_content', label: 'الإعدادات والمحتوى' },
                { key: 'financial_reports', label: 'التقارير المالية' }
              ].map((sec) => (
                <div key={sec.key} style={{ border: '1px solid #eee', padding: '20px' }}>
                  <h4 style={{ fontSize: '12pt', fontWeight: 900, color: '#7C3AED', marginBottom: '12px', borderBottom: '1px solid #F5F3FF', paddingBottom: '8px' }}>{sec.label}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '11pt', color: '#444' }}>
                    {(analysis.admin_panel[sec.key] || []).map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px', display: 'flex', gap: '8px' }}>
                         <span style={{ color: '#7C3AED' }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Meeting Plan */}
        <div style={{ marginBottom: '48px', pageBreakInside: 'avoid' }}>
          <h2 style={{ fontSize: '18pt', fontWeight: 900, borderRight: '8px solid #10B981', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#F0FDF4', marginBottom: '24px' }}>خطة تسيير الاجتماع</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ border: '2px solid #10B981', padding: '24px' }}>
              <span style={{ fontSize: '9pt', fontWeight: 900, color: '#10B981', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>Suggested Opening / الافتتاح المقترح</span>
              <p style={{ fontSize: '13pt', fontWeight: 700, fontStyle: 'italic', lineHeight: 1.7, margin: 0 }}>
                "{analysis.meeting_plan?.opening}"
              </p>
            </div>
            <div style={{ background: '#10B981', color: '#fff', padding: '24px' }}>
               <span style={{ fontSize: '9pt', fontWeight: 900, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '12px', textTransform: 'uppercase' }}>Next Step Goal / الهدف التالي</span>
               <p style={{ fontSize: '14pt', fontWeight: 900, margin: 0 }}>
                 {analysis.meeting_plan?.next_step}
               </p>
            </div>
          </div>
        </div>

        {/* 5. Discovery & Workflow Questions */}
        <div style={{ pageBreakBefore: 'always', paddingTop: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20pt', fontWeight: 900, borderRight: '8px solid #4F8EF7', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#EFF6FF', marginBottom: '24px' }}>
            منطق العمل والأسئلة التقنية
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {[
              { key: 'workflows', label: 'سير العمليات (Workflows)' },
              { key: 'edge_cases', label: 'الحالات الاستثنائية' },
              { key: 'integrations', label: 'الربط والأنظمة الخارجية' },
              { key: 'permissions', label: 'الاعتمادات والصلاحيات' }
            ].map((cat) => {
              const questions = analysis.technical_workflow_questions?.[cat.key] || [];
              if (questions.length === 0) return null;
              return (
                <div key={cat.key} style={{ borderTop: '4px solid #4F8EF7', paddingTop: '16px', pageBreakInside: 'avoid' }}>
                  <h4 style={{ fontSize: '13pt', fontWeight: 900, marginBottom: '20px', color: '#4F8EF7' }}>{cat.label}</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {questions.map((q, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '11pt', lineHeight: 1.6, color: '#444', borderBottom: '1px solid #f0f0f0', paddingBottom: '12px' }}>
                        <span style={{ color: '#4F8EF7', fontWeight: 900, flexShrink: 0 }}>Q</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. User Journeys (Detailed) */}
        <div style={{ pageBreakBefore: 'always', paddingTop: '24px', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '20pt', fontWeight: 900, borderRight: '8px solid #F59E0B', paddingRight: '16px', paddingTop: '8px', paddingBottom: '8px', background: '#FFFBEB', marginBottom: '24px' }}>
            مخططات رحلة المستخدم التفصيلية
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {analysis.user_journeys?.map((j, idx) => (
              <div key={idx} style={{ border: '2px solid #F59E0B', padding: '24px', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'inline-block', background: '#F59E0B', color: '#fff', padding: '6px 20px', fontSize: '13pt', fontWeight: 900, marginBottom: '20px' }}>
                  {j.user_type}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { label: 'البداية والتسجيل', key: 'onboarding' },
                    { label: 'الرحلة الأساسية', key: 'core_journey' },
                    { label: 'تفاعل النظام', key: 'system_actions' },
                    { label: 'نهاية الرحلة', key: 'end_of_journey' }
                  ].map((section) => (j[section.key] && (
                    <div key={section.key}>
                      <span style={{ fontSize: '10pt', fontWeight: 900, color: '#92400e', display: 'block', marginBottom: '8px', borderBottom: '1px solid #FEF3C7' }}>{section.label}</span>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '11pt', color: '#444' }}>
                        {(Array.isArray(j[section.key]) ? j[section.key] : [j[section.key]]).map((step, si) => (
                          <li key={si} style={{ marginBottom: '4px', display: 'flex', gap: '8px' }}>
                             <span style={{ color: '#F59E0B' }}>•</span> {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Raw Notes */}
        {data.idea_raw && (
           <div style={{ paddingTop: '32px', borderTop: '2px dashed #ccc', marginBottom: '40px', pageBreakInside: 'avoid' }}>
             <h3 style={{ fontSize: '12pt', fontWeight: 900, marginBottom: '16px', color: '#999' }}>
               ملاحظات الفكرة الأولية
             </h3>
             <div style={{ background: '#f9fafb', padding: '20px', fontSize: '10pt', lineHeight: 1.8, color: '#666', whiteSpace: 'pre-wrap' }}>
               {data.idea_raw}
             </div>
           </div>
        )}

        {/* Footer */}
        <div style={{ paddingTop: '40px', textAlign: 'center', fontSize: '9pt', fontWeight: 700, color: '#bbb' }}>
          Generated by Sales Focus – Intelligence Hub (DeepSeek Engine V2.1.0)<br/>
          © {new Date().getFullYear()} Sales Focus Platform. Confidential Strategy Document.
        </div>
      </div>
    </div>
  );
}
