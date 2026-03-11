import React from 'react';
import { formatDate } from '../utils/formatDate';
import { 
  Briefcase, Users, Printer, Sparkles, ListChecks, Map as MapIcon, CalendarDays
} from 'lucide-react';

export default function MeetingPrepPrintView({ prepData, formData }) {
  if (!prepData || !formData) return null;

  let analysis = {};
  try {
    analysis = typeof prepData.analysis_result === 'string' 
      ? JSON.parse(prepData.analysis_result) 
      : prepData.analysis_result || {};
  } catch (e) {
    console.error("Print view parse error:", e);
  }

  return (
    <div className="bg-white text-black p-0 m-0 w-full" style={{ direction: 'rtl', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
      
      {/* ======================= PAGE 0: COVER PAGE ======================= */}
      <div className="print-cover-page min-h-[296mm] flex flex-col items-center justify-center text-center border-b-8 border-black">
        <div className="mb-20">
          <div className="text-[48pt] font-black tracking-tighter">SALES FOCUS</div>
          <div className="text-[18pt] font-bold text-gray-600 mt-2">Intelligence Hub</div>
        </div>

        <div className="mb-24 px-10">
          <h1 className="text-[42pt] font-black leading-tight border-y-4 border-black py-8 mb-6">
            {formData.title || 'تقرير تحضير استراتيجي'}
          </h1>
          <div className="text-[22pt] font-bold text-gray-800">تحضير اجتماع استراتيجي متكامل</div>
        </div>

        <div className="w-full max-w-2xl px-12 text-right">
          <div className="flex justify-between border-b-2 border-gray-200 py-4 text-[16pt]">
            <span className="font-black">العميل المستهدف:</span>
            <span>{formData.client_name || 'غير محدد'}</span>
          </div>
          <div className="flex justify-between border-b-2 border-gray-200 py-4 text-[16pt]">
            <span className="font-black">القطاع:</span>
            <span>{formData.sector || 'غير محدد'}</span>
          </div>
          <div className="flex justify-between border-b-2 border-gray-200 py-4 text-[16pt]">
            <span className="font-black">تاريخ الاجتماع:</span>
            <span>{formData.meeting_date ? formatDate(formData.meeting_date) : 'غير محدد'}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-6 font-mono border-b pb-2">
            <span>PREP ID: {String(prepData.id).padStart(4, '0')}</span>
            <span>{`${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}</span>
          </div>
        </div>

        <div className="mt-auto mb-10 text-[10pt] font-bold text-gray-400 uppercase tracking-widest">
          Confidential - For Internal Use Only - Sales Focus AI
        </div>
      </div>

      <div className="page-break-before"></div>

      {/* ======================= PAGE 1: STRATEGY & SUMMARY ======================= */}
      <div className="p-10">
        <div className="flex justify-between items-end border-b-4 border-black pb-6 mb-12">
          <div>
            <div className="text-[24pt] font-black tracking-tighter">SALES FOCUS</div>
            <div className="text-[12pt] font-bold">Strategic Dossier / ملف التحضير الاستراتيجي</div>
          </div>
          <div className="text-left">
            <div className="bg-black text-white px-3 py-1 font-black text-[12pt] mb-1">
              PREP ID: {String(prepData.id).padStart(4, '0')}
            </div>
            <div className="text-[10pt] font-bold opacity-70">CONFIDENTIAL</div>
          </div>
        </div>

        {/* Hero Strategy */}
        <div className="border-[6px] border-black p-8 mb-12 bg-gray-50">
          <div className="text-[14pt] font-black mb-4 flex items-center gap-2">
            <Sparkles size={24} /> الرسالة الاستراتيجية الكبرى
          </div>
          <p className="text-[24pt] font-black leading-tight">
            {analysis.meeting_plan?.key_message || 'لم يتم تحديد الرسالة الكبرى'}
          </p>
        </div>

        {/* Business Specs */}
        <div className="grid grid-cols-2 gap-10 mb-12">
          <div className="border-r-4 border-black pr-6">
            <h3 className="text-[16pt] font-black mb-4 flex items-center gap-2">
              <Briefcase size={20} /> هدف المشروع
            </h3>
            <p className="text-[13pt] leading-relaxed text-gray-800">
              {analysis.business_analysis?.main_goal}
            </p>
          </div>
          <div>
            <h3 className="text-[16pt] font-black mb-4 flex items-center gap-2">
              <Users size={20} /> الفئات المستهدفة
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.business_analysis?.target_users?.map((u, i) => (
                <span key={i} className="bg-gray-200 px-3 py-1 rounded text-[12pt] font-bold">
                  {u}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Current Problem & Platforms */}
        <div className="grid grid-cols-2 gap-10 mb-12">
          <div className="border-r-4 border-black pr-6">
            <h3 className="text-[16pt] font-black mb-4">المشكلة الحالية</h3>
            <p className="text-[13pt] leading-relaxed text-gray-800">
              {analysis.business_analysis?.current_problem}
            </p>
          </div>
          <div>
            <h3 className="text-[16pt] font-black mb-4">المنصات المتوقعة</h3>
            <div className="flex flex-wrap gap-2">
              {analysis.business_analysis?.expected_platforms?.map((p, i) => (
                <span key={i} className="border-2 border-black px-3 py-1 rounded text-[12pt] font-bold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page-break-before"></div>

      {/* ======================= PAGE 2: MEETING PLAN & QUESTIONS ======================= */}
      <div className="p-10">
        <h2 className="text-[28pt] font-black mb-8 pb-4 border-b-2 border-black flex items-center gap-3">
          <CalendarDays size={32} /> خطة تسيير الاجتماع
        </h2>

        <div className="grid grid-cols-1 gap-8 mb-16">
          <div className="bg-gray-50 border-2 border-black p-6">
            <span className="text-[11pt] font-black text-gray-500 block mb-2 uppercase tracking-widest">Opening Statement / جملة الافتتاح</span>
            <p className="text-[16pt] font-bold italic leading-relaxed">
              "{analysis.meeting_plan?.opening}"
            </p>
          </div>
          
          <div className="border-2 border-dashed border-gray-400 p-6">
            <span className="text-[11pt] font-black text-gray-500 block mb-2 uppercase tracking-widest">Call to Action / الخطوة القادمة</span>
            <p className="text-[16pt] font-black">
              {analysis.meeting_plan?.next_step}
            </p>
          </div>
        </div>

        <h2 className="text-[28pt] font-black mb-8 pb-4 border-b-2 border-black flex items-center gap-3">
          <ListChecks size={32} /> الأسئلة الاستكشافية الموصى بها
        </h2>

        <div className="grid grid-cols-3 gap-6">
          {[
            { key: 'business', label: 'الوعي بالبزنس' },
            { key: 'technical', label: 'المتطلبات التقنية' },
            { key: 'scope', label: 'النطاق والميزانية' }
          ].map((cat) => (
            <div key={cat.key} className="border-2 border-black p-5">
              <h4 className="text-[14pt] font-black mb-6 pb-2 border-b-4 border-black inline-block">
                {cat.label}
              </h4>
              <ul className="space-y-4">
                {analysis.discovery_questions?.[cat.key]?.map((q, i) => (
                  <li key={i} className="flex gap-3 text-[12pt] leading-tight">
                    <span className="font-black text-black shrink-0">●</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="page-break-before"></div>

      {/* ======================= PAGE 3: USER JOURNEYS ======================= */}
      <div className="p-10">
        <h2 className="text-[28pt] font-black mb-12 pb-4 border-b-2 border-black flex items-center gap-3">
          <MapIcon size={32} /> مخططات رحلة المستخدم (User Journeys)
        </h2>

        <div className="grid grid-cols-1 gap-12">
          {analysis.user_journeys?.map((j, idx) => (
            <div key={idx} className="border-2 border-black p-8 relative">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-black text-white px-6 py-1 text-[14pt] font-black">
                {j.user_type}
              </div>
              <div className="flex flex-col gap-6 mt-4">
                {j.steps?.map((step, sidx) => (
                  <div key={sidx} className="flex gap-6 items-start">
                    <div className="w-10 h-10 border-2 border-black flex items-center justify-center font-black shrink-0 text-[14pt]">
                      {sidx + 1}
                    </div>
                    <div className="text-[14pt] font-bold pt-1 leading-relaxed border-b border-gray-100 pb-2 w-full">
                      {step}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer across pages manually if needed, or using CSS */}
      <footer className="fixed bottom-0 left-0 right-0 p-10 text-center text-[10pt] font-bold text-gray-400 print:block hidden">
        Report Generated by Sales Focus AI Intelligence Hub (Groq / Llama 3.3) - {`${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`}
      </footer>
    </div>
  );
}
