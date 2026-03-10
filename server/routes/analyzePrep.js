const express = require('express');
const axios = require('axios');
const db = require('../database');
const router = express.Router();

router.post('/', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { prep_id, title, client_name, sector, idea_raw } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Groq API غير متوفر في الخادم.' });
  }

  if (!idea_raw || !title) {
    return res.status(400).json({ error: 'العنوان وفكرة العميل مطلوبان للتحليل.' });
  }

  try {
    const systemInstruction = `أنت العقل الاستراتيجي (Strategic Brain) لمنظومة Sales Focus AI.
مهمتك: تحويل أفكار العميل الخام إلى دَوْسِيّيه (Dossier) مبيعات رابح.

السمات الشخصية:
- النبرة: احترافية، استراتيجية، مفصلة جداً، ومباشرة.
- اللغة: العامية السعودية البيضاء المهنية (سياق البزنس السعودي).
- المنظور: التركيز المطلق والمفصل على "نقاط الألم" (Pain Points) و "القيمة التجارية" (Business Value) والتحليل العميق لكل جانب.

قواعد المخرجات:
1. الرسالة الاستراتيجية (Hook): يجب أن تكون قوية، جريئة، وخاطفة للانتباه فوراً.
2. الأسئلة الاستكشافية: يجب أن تكون "ضاربة" (Hard-hitting)، أي أسئلة ذكية لم يفكر فيها العميل من قبل.
3. رحلة المستخدم: يجب أن تكون منطقية وتغطي الحالات الاستثنائية (Edge Cases).
4. الصيغة: رد بصيغة JSON فقط وبدقة متناهية.

الهيكل المطلوب للـ JSON:
{
  "key_message": "الرسالة الاستراتيجية الكبرى (Hook جريء)",
  "business_analysis": {
    "main_goal": "الهدف التجاري الأسمى (Value Proposition)",
    "current_problem": "نقاط الألم والمشكلة الحقيقية (Pain Point)",
    "target_users": ["فئة 1", "فئة 2"],
    "expected_platforms": ["آيفون", "أندرويد", "لوحة تحكم"]
  },
  "meeting_plan": {
    "opening": "جملة افتتاحية احترافية تسيطر على الاجتماع",
    "next_step": "الطلب النهائي (CTA) لحسم الصفقة"
  },
  "discovery_questions": {
    "business": ["سؤال استراتيجي 1", "سؤال 2", "سؤال 3"],
    "technical": ["سؤال تقني عميق 1", "سؤال 2"],
    "scope": ["سؤال عن الميزانية/الوقت بشكل ذكي 1", "سؤال 2"]
  },
  "user_journeys": [
    {
      "user_type": "نوع المستخدم",
      "steps": ["خطوة 1", "خطوة 2", "خطوة 3", "خطوة 4", "خطوة 5"]
    }
  ]
}`;

    const userPrompt = `بيانات الاجتماع:
- العنوان: ${title}
- العميل: ${client_name || 'غير محدد'}
- القطاع: ${sector || 'تجارة'}
- الفكرة: ${idea_raw}

نفذ التحليل الاستراتيجي الآن وقدم التقرير بصيغة JSON.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let analysis = response.data.choices[0].message.content;
    if (typeof analysis === 'string') {
      analysis = JSON.parse(analysis);
    }

    // Save to database if prep_id provided
    if (prep_id) {
       db.prepare(`UPDATE meeting_preps SET analysis_result = ?, updated_at = datetime('now') WHERE id = ?`)
         .run(JSON.stringify(analysis), prep_id);
    }

    res.json(analysis);

  } catch (error) {
    console.error('Groq API Error (Prep Hub):', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء التواصل مع Groq. تأكد من إدخال الـ API Key بشكل صحيح في ملف .env.',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;

