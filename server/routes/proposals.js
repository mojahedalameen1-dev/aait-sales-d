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
  console.warn('⚠️ CONVERTAPI_SECRET is missing. PDF conversion will be disabled.');
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

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Gemini API غير متوفر في الخادم.' });
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
- لا تكتب أي تعليقات جانبية، ولا ملاحظات، ولا مقدمات أو خواتيم. أخرج النتيجة فقط.
- يجب ملء كل خلية في الجداول وكل نقطة في العرض بناءً على السياق. إذا كانت المعلومة ناقصة، قم باستنتاجها بذكاء احترافي أو استخدم "يُحدد لاحقاً".
- يمنع منعاً باتاً ترك خلايا فارغة أو استخدام كلمة "undefined".
- استخدم صيغة Markdown، وتأكد من بناء الجداول بشكل صحيح.

نموذج العرض الفني (يجب الالتزام بهذا الهيكل حرفياً):

### نموذج العمل المقترح (Business Logic)
| الحقل | التفاصيل |
|---|---|
| نوع المشروع | [حدد نوعه: متجر، منصة، تطبيق، إلخ] |
| نشاط المشروع | [حدد المجال بدقة] |
| لغة المشروع | [العربية كأساس، مع ذكر الإنجليزية إن لزم] |
| مكونات المشروع | [التطبيقات، اللوحات، إلخ] |
| النطاق الجغرافي | [المملكة العربية السعودية، أو حسب السياق] |
| الشريحة المستهدفة | [حدد الفئة بدقة] |

### وصف المشروع والنطاق العام (Project Understanding & Scope)
A. وصف المشروع:
[وصف شامل ومفصّل يعكس طبيعة المنصة أو التطبيق، مجاله، وآلية عمله الجوهرية]

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
| التقييم | [تقييم فني مختصر] |
| التكلفة | [اكتب "حسب المتفق عليه" أو استنتجها إذا ذُكرت] |
| مدة العمل | [مدة منطقية بالأسابيع أو الشهور] |

بعد الانتهاء من النص أعلاه، أضف فوراً كتلة JSON برمجية تحتوي على البيانات المهيكلة لاستخدامها في النظام البرمجي، يجب أن تكون داخل وسم \` \` \`json وتتبع الهيكل التالي بدقة:
{
  "strategicGoals": [{"name": "..."}],
  "actors": [{"name": "..."}],
  "features": [{"name": "..."}],
  "journeys": [{"name": "..."}],
  "adminFeatures": [{"name": "..."}]
}
تأكد من استخراج أهم النقاط من النص وتوزيعها على هذه المصفوفات.`;

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

// Generate PDF
router.post('/generate-pdf', async (req, res) => {
  const CONVERTAPI_SECRET = process.env.CONVERTAPI_SECRET;
  if (!CONVERTAPI_SECRET) {
    return res.status(500).json({ error: 'مفتاح ConvertAPI غير متوفر في الخادم.' });
  }

  try {
    const data = req.body;
    const templatePath = path.join(__dirname, '..', '..', 'templates', 'quotation.docx');

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: 'ملف القالب غير موجود في templates/quotation.docx' });
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
      error: 'حدث خطأ أثناء توليد ملف PDF',
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      failedAt: 'PDF Conversion/Generation'
    });
  }
});

module.exports = router;
