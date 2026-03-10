const express = require('express');
const axios = require('axios');
const db = require('../database');
const router = express.Router();

router.post('/', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { client_idea, client_name, sector, client_id } = req.body;
  
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Groq API غير متوفر في الخادم.' });
  }

  if (!client_idea) return res.status(400).json({ error: 'فكرة العميل مطلوبة' });

  try {
    const systemInstruction = `أنت العقل الاستراتيجي (Strategic Brain) لمنظومة Sales Focus AI.
مهمتك الاستراتيجية: تحويل فكرة العميل إلى تحليل مبيعات احترافي يركز على القيمة (Value) والألم (Pain).

السمات:
- الشخصية: مستشار مبيعات تقني سعودي خبير، يتحدث بالعامية السعودية البيضاء المهنية المفهومة.
- التوجه: تحليل مفصل وعميق لنقاط الضعف في الوضع الحالي وإبراز القيمة المضافة للنظام الجديد بكل تفاصيلها.
- القواعد: رد بصيغة JSON فقط، بدون مقدمات، جمل جريئة ومفصلة، وأسئلة استكشافية عميقة جداً. استخدم مفردات البزنس السعودي (مثل: "حلول"، "أتمتة"، "كفاءة"، "ضبط").

الهيكل:
{
  "key_message": "الرسالة الجوهرية (Hook)",
  "business_analysis": {
    "main_goal": "الهدف الاستراتيجي",
    "current_problem": "نقاط الألم",
    "target_users": ["فئة المستفيدين"],
    "expected_platforms": ["المنصات"]
  },
  "discovery_questions": {
    "business": ["سؤال بزنس عميق"],
    "technical": ["سؤال تقني ذكي"],
    "scope": ["سؤال نطاق العمل"]
  },
  "user_journeys": [
    {
      "user_type": "نوع المستخدم",
      "steps": ["خطوات الرحلة الأساسية"]
    }
  ],
  "meeting_plan": {
    "opening": "جملة الافتتاح",
    "key_message": "الرسالة الأساسية",
    "next_step": "الخطوة التالية (CTA)"
  }
}`;

    const userPrompt = `الفكرة: ${client_idea}
العميل: ${client_name || 'العميل'}
القطاع: ${sector || 'تجارة'}

حلل الفكرة استراتيجياً وقدم الـ JSON المطلوب.`;

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

    // Save to database if client_id provided
    if (client_id) {
      db.prepare(`
        INSERT INTO meeting_analyses (client_id, client_idea, analysis_result)
        VALUES (?, ?, ?)
      `).run(client_id, client_idea, JSON.stringify(analysis));
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Groq error:', err.response?.data || err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحليل الفكرة عبر Groq.' });
  }
});


// Get analyses for a client
router.get('/:clientId', (req, res) => {
  try {
    const analyses = db.prepare('SELECT * FROM meeting_analyses WHERE client_id=? ORDER BY created_at DESC').all(req.params.clientId);
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
