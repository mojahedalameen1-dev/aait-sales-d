const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const supabase = require('../supabase');

router.post('/', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { prep_id, title, client_name, sector, idea_raw } = req.body;

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error('Environment Check - DEEPSEEK_API_KEY is missing');
    return res.status(500).json({ 
      error: '\u0645\u0641\u062a\u0627\u062d \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631 \u0641\u064a \u0627\u0644\u062e\u0627\u062f\u0645.',
    });
  }

  if (!title || !idea_raw) {
    return res.status(400).json({ error: '\u062c\u0645\u064a\u0631 \u0627\u0644\u062d\u0642\u0648\u0644 \u0645\u0637\u0644\u0648\u0628\u0629' });
  }

  try {
    const systemInstruction = `أنت الحين تشتغل كـ "محلل أعمال تقني" (Business Analyst) و "مدير منتجات" (Product Manager) خبرة في شركة سعودية رائدة لتطوير التطبيقات والمواقع.
الهدف: أنا زميلك بالشركة، وأبيك تفزع لي في التجهيز لاجتماعات العملاء (Discovery Meetings). بعطيك فكرة مبدئية لتطبيق أو موقع طلبها العميل، وأبيك بناءً عليها تجهز لي "تقرير تحضيري مفصل" أبيض فيه وجهي قدام العميل.

أجب بصيغة JSON فقط وبدقة متناهية وبدون مقدمات. استخدم مفردات البزنس السعودية (البيضاء).

الهيكل المطلوب للـ JSON:
{
  "key_message": "الرسالة الاستراتيجية الكبرى (الزبدة)",
  "project_idea": {
    "summary": "شرح الفكرة بطريقة سلسة وواضحة جداً",
    "core_features": ["ميزة 1", "ميزة 2"]
  },
  "business_analysis": {
    "main_goal": "الهدف التجاري الأساسي",
    "current_problem": "المشكلة اللي يحلها المشروع",
    "target_users": ["فئة 1", "فئة 2"],
    "expected_platforms": ["iOS", "Android", "Web"]
  },
  "user_journeys": [
    {
      "user_type": "نوع المستخدم (مثلاً: عميل)",
      "onboarding": ["خطوة تسجيل 1", "خطوة تسجيل 2"],
      "core_journey": ["خطوة أساسية 1", "خطوة أساسية 2"],
      "system_actions": ["إجراء تقني 1", "إشعارات/تحديثات"],
      "end_of_journey": ["التقييم/الفواتير/الإغلاق"]
    }
  ],
  "admin_panel": {
    "user_management": ["صلاحيات", "حظر", "توثيق"],
    "operations_management": ["تتبع", "قبول/رفض", "تعديل"],
    "settings_content": ["إشعارات", "رسوم", "صفحات ثابتة"],
    "financial_reports": ["تحويلات", "إحصائيات", "مبالغ"]
  },
  "meeting_plan": {
    "key_message": "نفس الرسالة الاستراتيجية الكبرى للتوافق",
    "opening": "جملة افتتاحية احترافية",
    "next_step": "الهدف التالي من الاجتماع (CTA)"
  },
  "technical_workflow_questions": {
    "workflows": ["سؤال عن منطق العمل 1", "سؤال عن الاعتماد"],
    "edge_cases": ["ماذا لو كنسل؟", "فشل الدفع؟"],
    "integrations": ["بوابات دفع", "ERP", "خرائط"],
    "permissions": ["مشرفين", "صلاحيات محدودة"]
  },
  "discovery_questions": {
     "business": ["سؤال بزنس 1"],
     "technical": ["سؤال تقني 1"],
     "scope": ["سؤال عن النطاق"]
  }
}`;

    const userPrompt = `بيانات الاجتماع:
- العنوان: ${title}
- العميل: ${client_name || 'غير محدد'}
- القطاع: ${sector || 'تجارة'}
- الفكرة: ${idea_raw}

نفذ التحليل الاستراتيجي الآن وقدم التقرير بصيغة JSON بالعامية السعودية الاحترافية.`;

    let analysisText = await generateWithFallback({
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: "application/json"
    });

    let analysis = JSON.parse(analysisText);

    if (prep_id) {
      await supabase
        .from('meeting_preps')
        .update({ analysis_result: analysis })
        .eq('id', prep_id);
    }

    res.json({ success: true, analysis });

  } catch (error) {
    console.error('Analysis error:', error);
    
    if (error.message === 'ALL_MODELS_EXHAUSTED') {
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter
      });
    }

    res.status(500).json({ 
      error: '\u0641\u0634\u0644 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u062a\u062d\u0636\u064a\u0631 \u0639\u0628\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      failedAt: 'AI Waterfall Analysis'
    });
  }
});

module.exports = router;
