const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const convertapi = process.env.CONVERTAPI_SECRET 
  ? require('convertapi')(process.env.CONVERTAPI_SECRET)
  : null;

if (!convertapi) {
  console.warn('\u26A0\uFE0F CONVERTAPI_SECRET is missing. PDF conversion will be disabled.');
}

// Ensure temp directory exists
const isVercel = process.env.VERCEL === '1';
const tempDir = isVercel ? path.join('/tmp', 'temp') : path.join(__dirname, '..', 'temp');

try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temp directory at: ${tempDir}`);
  }
} catch (err) {
  console.error('Failed to create temp directory:', err.message);
}

// AI Proposal Text Generation
router.post('/', async (req, res) => {
  const { text } = req.body;

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '\u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A \u063a\u064A\u0631 \u0645\u062A\u0648\u0641\u0631 \u0641\u064A \u0627\u0644\u062e\u0627\u062F\u0645.' });
  }

  if (!text) {
    return res.status(400).json({ error: '\u0627\u0644\u0631\u062C\u0627\u0621 \u0625\u062F\u062E\u0627\u0644 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0623\u0648 \u0627\u0644\u0627\u062C\u062A\u0645\u0627\u0639.' });
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
تم تصميم النظام ليدعم مصادر الدخل التالية:
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

بعد الانتهاء من النص أعلاه، أضف فوراً كتلة JSON برمجية تحتوي على البيانات المهيكلة لاستخدامها في النظام البرمجي، يجب أن تكون داخل وسم \` \` \`json وتتتبع الهيكل التالي بدقة:
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
\` \` \`
تأكد من استخراج أهم النقاط من النص وتوزيعها على هذه المصفوفات والحقول.`;

    const proposal = await generateWithFallback({
      prompt: text,
      systemInstruction
    });

    res.json({ success: true, proposal });

  } catch (error) {
    console.error('Gemini API Error (Proposals):', error.message);
    
    if (error.message === 'ALL_MODELS_EXHAUSTED') {
      return res.status(429).json({
        error: error.message,
        retryAfter: error.retryAfter
      });
    }

    res.status(500).json({ 
      error: '\u062D\u062F\u062B \u062e\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0646\u0645\u0648\u0630\u062C \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.',
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
      return res.status(404).json({ error: '\u0645\u0644\u0641 \u0627\u0644\u0642\u0627\u0644\u0628 \u063a\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A templates/quotation.docx' });
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
      error: '\u0641\u0634\u0644 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0639\u0631\u0636 \u0627\u0644\u0641\u0646\u064A',
      details: error.message || 'Unknown error'
    });
  }
});

// Generate PDF
router.post('/generate-pdf', async (req, res) => {
  const CONVERTAPI_SECRET = process.env.CONVERTAPI_SECRET;
  if (!CONVERTAPI_SECRET) {
    return res.status(500).json({ error: '\u0645\u0641\u062F\u0627\u062D ConvertAPI \u063a\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A \u0627\u0644\u062E\u0627\u062F\u0645.' });
  }

  try {
    const data = req.body;
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: '\u0645\u0644\u0641 \u0627\u0644\u0642\u0627\u0644\u0628 \u063a\u064A\u0631 \u0645\u0648\u062C\u0648\u062F \u0641\u064A templates/quotation.docx' });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);
    const buf = doc.getZip().generate({ type: 'nodebuffer' });

    const docxPath = path.join(tempDir, `template_${Date.now()}.docx`);
    fs.writeFileSync(docxPath, buf);

    // Convert to PDF
    const result = await convertapi.convert('pdf', { File: docxPath }, 'docx');
    const pdfUrl = result.file.url;
    
    // Download and send PDF
    const pdfResponse = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
    
    // Clean up temporary file
    fs.unlinkSync(docxPath);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=quotation_${Date.now()}.pdf`,
    });
    
    res.send(Buffer.from(pdfResponse.data));
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      error: '\u062D\u062F\u062B \u062e\u0637\u0623 \u0623\u062B\u0646\u0627\u0621 \u062A\u0648\u0644\u064A\u062F \u0645\u0644\u0641 PDF',
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      failedAt: 'PDF Conversion/Generation'
    });
  }
});

module.exports = router;
