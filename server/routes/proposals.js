const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

// Generate DOCX
router.post('/generate-docx', async (req, res) => {
  try {
    const data = req.body || {};
    
    // Safety defaults for structured data to prevent docxtemplater failures
    const safeData = {
      clientName: data.clientName || '',
      date: data.date || new Date().toISOString().split('T')[0],
      offerNumber: data.offerNumber || '',
      managerName: data.managerName || '',
      proposalText: data.proposalText || '',
      price: data.price || '0',
      vat: data.vat || '0',
      total: data.total || '0',
      durationDays: data.durationDays || '0',
      serviceDescription: data.serviceDescription || '',
      projectType: data.projectType || '',
      projectActivity: data.projectActivity || '',
      projectLanguage: data.projectLanguage || '',
      projectComponents: data.projectComponents || '',
      geographicScope: data.geographicScope || '',
      targetSegment: data.targetSegment || '',
      projectDescription: data.projectDescription || '',
      revenueModel: data.revenueModel || '',
      workflow: Array.isArray(data.workflow) 
        ? data.workflow.map((s, i) => `الخطوة ${i + 1}: ${s}`).join('\n') 
        : (data.workflow || ''),
      technicalAssessment: data.technicalAssessment || '',
      estimatedCost: data.estimatedCost || '',
      estimatedDuration: data.estimatedDuration || '',
      strategicGoals: Array.isArray(data.strategicGoals) ? data.strategicGoals : [],
      actors: Array.isArray(data.actors) ? data.actors : [],
      adminFeatures: Array.isArray(data.adminFeatures) ? data.adminFeatures : []
    };

    const templatePath = path.join(__dirname, '..', 'templates', 'quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'ملف القالب غير موجود في templates/quotation.docx' });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}'
      }
    });

    // Render the document
    doc.render(safeData);

    const buf = doc.getZip().generate({ type: 'nodebuffer' });
    
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="proposal_${encodeURIComponent(data.clientName || 'client')}_${Date.now()}.docx"`,
    });
    
    res.send(buf);
  } catch (error) {
    console.error('Proposal DOCX Generation Error:', error);
    if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(function (error) {
            return error.properties.explanation;
        }).join("\n");
        console.error('Docxtemplater error messages:', errorMessages);
    }
    res.status(500).json({ 
      error: 'فشل إنشاء العرض الفني',
      details: error.message || 'Unknown error',
      docErrors: error.properties?.errors
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

## التعليمات الهامة جداً (يجب البدء بها):
ابدأ ردك فوراً وبشكل مباشر بكتلة JSON برمجية تحتوي على البيانات المهيكلة لاستخدامها في النظام، يجب أن تكون داخل وسم \`\`\`json وتتتبع الهيكل التالي بدقة (تأكد من أن features مدمجة داخل actors):
{
  "projectType": "...",
  "projectActivity": "...",
  "projectLanguage": "...",
  "projectComponents": "...",
  "geographicScope": "...",
  "targetSegment": "...",
  "projectDescription": "...",
  "strategicGoals": [{"name": "..."}],
  "actors": [
    {
      "name": "...",
      "details": "...",
      "features": [{"name": "..."}]
    }
  ],
  "adminFeatures": [{"name": "..."}],
  "revenueModel": "...",
  "workflow": ["الخطوة الأولى...", "الخطوة الثانية..."],
  "technicalAssessment": "...",
  "estimatedCost": "...",
  "estimatedDuration": "..."
}
\`\`\`

تأكد من استخراج أهم النقاط من النص وتوزيعها على هذه المصفوفات والحقول قبل البدء بكتابة النص التفصيلي.

## نموذج العرض الفني (اكتبه بعد كتلة الـ JSON أعلاه)

- اعتمد على المرحلة الأولى من المشروع فقط ما لم يُحدَّد غير ذلك
- النص مفصّل، شامل، ولا يُغفل أي نقطة وردت في التفريغ
- الأسلوب: رسمي، احترافي، مباشر — كأنك تخاطب صاحب قرار
- لا تعليقات جانبية، لا ملاحظات، لا أقواس توضيحية موجهة للمحرر
- استنتج المعلومات المنطقية الناقصة من السياق واملأ الفراغات بذكاء
- استخدم مصطلحات تقنية دقيقة مع الحفاظ على وضوح الفكرة للعميل غير التقني

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
| مدة العمل | |`;

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
            
            if (tokenCount % 10 === 0) {
              // Expected typical proposal length is ~1500 tokens
              const baseProgress = 10 + (tokenCount / 1500) * 85;
              
              // Non-linear progress: slows down as it approaches 99% to keep moving
              let realProgress;
              if (baseProgress < 90) {
                realProgress = Math.round(baseProgress);
              } else {
                // After 90%, it slows down but continues to crawl towards 99%
                const overage = baseProgress - 90;
                realProgress = Math.min(99, 90 + Math.round(overage / (1 + overage/10)));
              }

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
