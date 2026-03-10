const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { text } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Groq API غير متوفر في الخادم.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'الرجاء إدخال تفاصيل المشروع أو الاجتماع.' });
  }

  try {
    const systemInstruction = `أنت خبير إعداد عروض فنية. سأرسل لك تفاصيل مشروع واجتماع. قم بإنشاء عرض فني رسمي جداً، مفصل بالكامل، بناءً على المرحلة الأولى فقط من المشروع. لا تضف أي تعليقات أو شروحات برمجية. استخدم هذا النموذج الحرفي واملأ فراغاته:

نموذج العمل المقترح:
- نوع المشروع:
- نشاط المشروع:
- لغة المشروع:
- مكونات المشروع:
- النطاق الجغرافي:
- الشريحة المستهدفة:

وصف المشروع والنطاق العام:
A. وصف المشروع:
B. الأهداف الاستراتيجية:
C. مكونات المشروع:

نطاق العمل الوظيفي:
A. هيكلية المستخدمين:
تطبيق العميل: (سرد الوظائف)
تطبيق مقدمي الخدمة: (إن وجد)
لوحة تحكم الإدارة:

رحلة المستخدم والبيئة التقنية:
أولاً: سيناريو رحلة المستخدم:
ثانياً: نموذج الربح:

تفاصيل لوحة التحكم:
1- لوحة تحكم الإدارة: (التفاصيل)

التقييم:
التكلفة:
مدة العمل:`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      // Using versatile model as defined in current setup
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: text }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const proposal = response.data.choices[0].message.content;
    res.json({ success: true, proposal });

  } catch (error) {
    console.error('Groq API Error (Proposals):', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي.',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;
