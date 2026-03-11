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
    const systemInstruction = `أنت خبير تقني واستراتيجي متخصص في إعداد العروض الفنية الاحترافية للمشاريع البرمجية. مهمتك تحويل تفريغ الاجتماع أو التفاصيل المدخلة إلى عرض فني متكامل وجاهز للعرض على العميل مباشرةً.

التعليمات الإلزامية:
- اعتمد على المرحلة الأولى من المشروع فقط ما لم يُحدَّد غير ذلك.
- النص مفصّل، شامل، ولا يُغفل أي نقطة.
- الأسلوب: رسمي، احترافي، مباشر — كأنك تخاطب صاحب قرار.
- لا تكتب أي تعليقات جانبية، ولا ملاحظات، ولا مقدمات أو خواتيم (مثل "إليك العرض"). أخرج النتيجة فقط.
- استنتج المعلومات المنطقية الناقصة بذكاء، أو اكتب (تُحدد لاحقاً).
- استخدم صيغة Markdown، وتأكد من بناء الجداول بشكل صحيح.

نموذج العرض الفني (يجب الالتزام بهذا الهيكل حرفياً):

### نموذج العمل المقترح (Business Logic)
| الحقل | التفاصيل |
|---|---|
| نوع المشروع | |
| نشاط المشروع | |
| لغة المشروع | |
| مكونات المشروع | |
| النطاق الجغرافي | |
| الشريحة المستهدفة | |

### وصف المشروع والنطاق العام (Project Understanding & Scope)
A. وصف المشروع:
المشروع عبارة عن [وصف شامل ومفصّل يعكس طبيعة المنصة أو التطبيق، مجاله، وآلية عمله الجوهرية]

B. الأهداف الاستراتيجية:
[اذكر الأهداف الاستراتيجية بصيغة نقاط واضحة تبدأ بأفعال: السيطرة على / تمكين / تسريع / رفع / خفض...]

C. مكونات المشروع:
[اذكر كل مكون بمسماه الوظيفي ووصف مختصر لدوره: تطبيق العملاء، لوحة الإدارة، البوابات، إلخ]

### نطاق العمل الوظيفي (Functional Scope of Work)
A. هيكلية المستخدمين (System Actors):
لكل جهة مستخدمة:
- اذكر اسمها
- افصّل صلاحياتها ومساراتها الوظيفية كاملةً بنقاط منظّمة تحت كل فئة

### رحلة المستخدم والبيئة التقنية (User Journey & Technical Architecture)
أولاً: سيناريو رحلة المستخدم (The Workflow):
[اسرد رحلة المستخدم خطوة بخطوة من لحظة دخوله حتى إتمام الهدف الأساسي، بأسلوب سردي تسلسلي واضح]

ثانياً: نموذج الربح (Revenue Model):
تم تصميم النظام ليدعم مصادر الدخل التالية:
[اذكر كل مصدر ربح بوضوح]

### تفاصيل لوحة التحكم
[افصّل أقسام لوحة التحكم الإدارية وصلاحياتها وأدواتها بشكل منظّم]

### التقييم والتكلفة والجدول الزمني
| البند | التفاصيل |
|---|---|
| التقييم | |
| التكلفة | |
| مدة العمل | |`;

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
