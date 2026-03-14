const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// AI Proposal Text Generation
router.post('/', async (req, res) => {
  const { text } = req.body;

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير متوفر في الخادم.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'الرجاء إدخال تفاصيل المشروع أو الاجتماع.' });
  }

  try {
    const systemInstruction = `أنت خبير تقني واستراتيجي متخصص في إعداد العروض الفنية الاحترافية للمشاريع البرمجية. مهمتك تحويل تفريغ الاجتماع المرفق إلى عرض فني متكامل وجاهز للعرض على العميل مباشرةً.

## التعليمات العامة

- اعتمد على المرحلة الأولى من المشروع فقط ما لم يُحدَّد غير ذلك
- النص مفصّل، شامل، ولا يُغفل أي نقطة وردت في التفريغ
- الأسلوب: رسمي، احترافي، مباشر — كأنك تخاطب صاحب قرار
- لا تعليقات جانبية، لا ملاحظات، لا أقواس توضيحية موجهة للمحرر
- استنتج المعلومات المنطقية الناقصة من السياق واملأ الفراغات بذكاء
- استخدم مصطلحات تقنية دقيقة مع الحفاظ على وضوح الفكرة للعميل غير التقني

## نموذج العرض الفني (يجب الالتزام بهذا الهيكل حرفياً)

---

### نموذج العمل المقترح (Business Logic)

| الحقل | التفاصيل |
|---|---|
| نوع المشروع | |
| نشاط المشروع | |
| لغة المشروع | |
| مكونات المشروع | |
| النطاق الجغرافي | |
| الشريحة المستهدفة | |

---

### وصف المشروع والنطاق العام (Project Understanding & Scope)

**A. وصف المشروع:**
المشروع عبارة عن [وصف شامل ومفصّل يعكس طبيعة المنصة أو التطبيق، مجاله، وآلية عمله الجوهرية]

**B. الأهداف الاستراتيجية:**
[اذكر الأهداف الاستراتيجية بصيغة نقاط واضحة تبدأ بأفعال: السيطرة على / تمكين / تسريع / رفع / خفض...]

**C. مكونات المشروع:**
[اذكر كل مكون بمسماه الوظيفي ووصف مختصر لدوره: تطبيق العملاء، لوحة الإدارة، البوابات، إلخ]

---

### نطاق العمل الوظيفي (Functional Scope of Work)

**A. هيكلية المستخدمين (System Actors):**

لكل جهة مستخدمة (عميل، مزود خدمة، مشرف...):
- اذكر اسمها
- افصّل صلاحياتها ومساراتها الوظيفية كاملةً بنقاط منظّمة تحت كل فئة

---

### رحلة المستخدم والبيئة التقنية (User Journey & Technical Architecture)

**أولاً: سيناريو رحلة المستخدم (The Workflow):**
[اسرد رحلة المستخدم خطوة بخطوة من لحظة دخوله حتى إتمام الهدف الأساسي، بأسلوب سردي تسلسلي واضح]

**ثانياً: نموذج الربح (Revenue Model):**
تم تصميم النظام ليدعم مصادرة الدخل التالية:
[اذكر كل مصدر ربح بوضوح مع آلية تطبيقه داخل المنصة]

---

### تفاصيل لوحة التحكم

[افصّل أقسام لوحة التحكم الإدارية وصلاحياتها وأدواتها بشكل منظّم]

---

### التقييم والتكلفة والجدول الزمني

| البند | التفاصيل |
|---|---|
| التقييم | |
| التكلفة | |
| مدة العمل | |

بعد الانتهاء من النص أعلاه، أضف فوراً كتلة JSON برمجية تحتوي على البيانات المهيكلة لاستخدامها في النظام البرمجي، يجب أن تكون داخل وسم \`\`\`json وتتتبع الهيكل التالي بدقة:
{
  "projectType": "...",
  "projectActivity": "...",
  "projectLanguage": "...",
  "projectComponents": "...",
  "geographicScope": "...",
  "targetSegment": "...",
  "projectDescription": "...",
  "strategicGoals": [{"name": "..."}],
  "actors": [{"name": "...", "details": "..."}],
  "features": [{"name": "..."}],
  "journeys": [{"name": "..."}],
  "adminFeatures": [{"name": "..."}],
  "revenueModel": "...",
  "workflow": "...",
  "technicalAssessment": "...",
  "estimatedCost": "...",
  "estimatedDuration": "..."
}
\`\`\`
تأكد من استخراج أهم النقاط من النص وتوزيعها على هذه المصفوفات والحقول.`;

    const proposal = await generateWithFallback({
      prompt: text,
      systemInstruction
    });

    res.json({ success: true, proposal });

  } catch (error) {
    
    if (error.code === 'ALL_MODELS_EXHAUSTED') {
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter
      });
    }

    res.status(500).json({ 
      error: 'حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي.',
      details: error.message
    });
  }
});

// Generate DOCX
router.post('/generate-docx', async (req, res) => {
  try {
    const data = req.body;
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'ملف القالب غير موجود في templates/quotation.docx' });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Render the document
    doc.render(data);

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename=quotation_${Date.now()}.docx`,
    });
    
    res.send(buf);
  } catch (error) {
    console.error('Proposal Generation Error:', error);
    res.status(500).json({ 
      error: 'فشل إنشاء العرض الفني',
      details: error.message || 'Unknown error'
    });
  }
});

router.post('/stream', async (req, res) => {
  const { text } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'DeepSeek API Key missing' });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  try {
    sendEvent('start', { message: 'جاري البدء في صياغة العرض الفني...' });

    const systemInstruction = `أنت خبير تقني واستراتيجي متخصص في إعداد العروض الفنية الاحترافية للمشاريع البرمجية. مهمتك تحويل تفريغ الاجتماع المرفق إلى عرض فني متكامل وجاهز للعرض على العميل مباشرةً.

## التعليمات العامة

- اعتمد على المرحلة الأولى من المشروع فقط ما لم يُحدَّد غير ذلك
- النص مفصّل، شامل، ولا يُغفل أي نقطة وردت في التفريغ
- الأسلوب: رسمي، احترافي، مباشر — كأنك تخاطب صاحب قرار
- لا تعليقات جانبية، لا ملاحظات، لا أقواس توضيحية موجهة للمحرر
- استنتج المعلومات المنطقية الناقصة من السياق واملأ الفراغات بذكاء
- استخدم مصطلحات تقنية دقيقة مع الحفاظ على وضوح الفكرة للعميل غير التقني

## نموذج العرض الفني (يجب الالتزام بهذا الهيكل حرفياً)

---

### نموذج العمل المقترح (Business Logic)

| الحقل | التفاصيل |
|---|---|
| نوع المشروع | |
| نشاط المشروع | |
| لغة المشروع | |
| مكونات المشروع | |
| النطاق الجغرافي | |
| الشريحة المستهدفة | |

---

### وصف المشروع والنطاق العام (Project Understanding & Scope)

**A. وصف المشروع:**
المشروع عبارة عن [وصف شامل ومفصّل يعكس طبيعة المنصة أو التطبيق، مجاله، وآلية عمله الجوهرية]

**B. الأهداف الاستراتيجية:**
[اذكر الأهداف الاستراتيجية بصيغة نقاط واضحة تبدأ بأفعال: السيطرة على / تمكين / تسريع / رفع / خفض...]

**C. مكونات المشروع:**
[اذكر كل مكون بمسماه الوظيفي ووصف مختصر لدوره: تطبيق العملاء، لوحة الإدارة، البوابات، إلخ]

---

### نطاق العمل الوظيفي (Functional Scope of Work)

**A. هيكلية المستخدمين (System Actors):**

لكل جهة مستخدمة (عميل، مزود خدمة، مشرف...):
- اذكر اسمها
- افصّل صلاحياتها ومساراتها الوظيفية كاملةً بنقاط منظّمة تحت كل فئة

---

### رحلة المستخدم والبيئة التقنية (User Journey & Technical Architecture)

**أولاً: سيناريو رحلة المستخدم (The Workflow):**
[اسرد رحلة المستخدم خطوة بخطوة من لحظة دخوله حتى إتمام الهدف الأساسي، بأسلوب سردي تسلسلي واضح]

**ثانياً: نموذج الربح (Revenue Model):**
تم تصميم النظام ليدعم مصادرة الدخل التالية:
[اذكر كل مصدر ربح بوضوح مع آلية تطبيقه داخل المنصة]

---

### تفاصيل لوحة التحكم

[افصّل أقسام لوحة التحكم الإدارية وصلاحياتها وأدواتها بشكل منظّم]

---

### التقييم والتكلفة والجدول الزمني

| البند | التفاصيل |
|---|---|
| التقييم | |
| التكلفة | |
| مدة العمل | |

بعد الانتهاء من النص أعلاه، أضف فوراً كتلة JSON برمجية تحتوي على البيانات المهيكلة لاستخدامها في النظام البرمجي، يجب أن تكون داخل وسم \`\`\`json وتتتبع الهيكل التالي بدقة:
{
  "projectType": "...",
  "projectActivity": "...",
  "projectLanguage": "...",
  "projectComponents": "...",
  "geographicScope": "...",
  "targetSegment": "...",
  "projectDescription": "...",
  "strategicGoals": [{"name": "..."}],
  "actors": [{"name": "...", "details": "..."}],
  "features": [{"name": "..."}],
  "journeys": [{"name": "..."}],
  "adminFeatures": [{"name": "..."}],
  "revenueModel": "...",
  "workflow": "...",
  "technicalAssessment": "...",
  "estimatedCost": "...",
  "estimatedDuration": "..."
}
\`\`\`
تأكد من استخراج أهم النقاط من النص وتوزيعها على هذه المصفوفات والحقول.`;

    sendEvent('progress', { value: 10, message: 'تحليل المتطلبات الفنية...' });

    // DeepSeek Streaming Request
    const url = 'https://api.deepseek.com/chat/completions';
    const response = await axios.post(url, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: text }
      ],
      stream: true,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    let fullText = '';
    let tokenCount = 0;
    const stream = response.data;

    stream.on('data', chunk => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') break;
        try {
          const parsed = JSON.parse(message);
          const content = parsed.choices[0].delta.content;
          if (content) {
            fullText += content;
            tokenCount++;
            
            if (tokenCount % 12 === 0) {
              const realProgress = Math.min(95, 10 + Math.round((tokenCount / 1200) * 85));
              sendEvent('progress', { 
                value: realProgress, 
                message: 'جاري كتابة بنود العرض الفني...' 
              });
            }
          }
        } catch (e) {}
      }
    });

    stream.on('end', () => {
      sendEvent('progress', { value: 100, message: 'تم تجهيز العرض بالكامل ✨' });
      sendEvent('result', { proposal: fullText });
      res.end();
    });

  } catch (err) {
    console.error('Streaming error:', err);
    sendEvent('error', { message: err.message || 'حدث خطأ في بث العرض' });
    res.end();
  }
});

module.exports = router;
