const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateJWT);

router.post('/', async (req, res) => {
  const { prep_id, title, client_name, sector, idea_raw } = req.body;

  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير متوفر في الخادم.' });
  }

  if (!title || !idea_raw) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Verify ownership if updating existing prep
    if (prep_id) {
        const check = await db.query('SELECT user_id FROM meeting_preps WHERE id = $1', [prep_id]);
        if (!check.rows[0] || (!isAdmin && check.rows[0].user_id !== userId)) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }

    const systemInstruction = `أنت الحين تشتغل كـ "محلل أعمال تقني" (Business Analyst) و "مدير منتجات" (Product Manager) خبرة في شركة سعودية رائدة لتطوير التطبيقات والمواقع.
الهدف: أنا زميلك بالشركة، وأبيك تفزع لي في التجهيز لاجتماعات العملاء (Discovery Meetings). بعطيك فكرة مبدئية لتطبيق أو موقع طلبها العميل، وأبيك بناءً عليها تجهز لي "تقرير تحضيري مفصل جداً واحترافي" أبيض فيه وجهي قدام العميل.
أجب بصيغة JSON فقط وبدقة متناهية وبدون مقدمات. استخدم مفردات البزنس السعودية (البيضاء) الفخمة.`;

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
      await db.query(
        'UPDATE meeting_preps SET analysis_result = $1 WHERE id = $2',
        [JSON.stringify(analysis), prep_id]
      );
    }

    res.json({ success: true, analysis });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'فشل تحليل التحضير عبر الذكاء الاصطناعي' });
  }
});

router.get('/stream/:id', async (req, res) => {
  const prep_id = req.params.id;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

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
    sendEvent('start', { message: 'جاري جلب بيانات التحضير...' });

    // 1. Fetch data and verify ownership
    const result = await db.query('SELECT * FROM meeting_preps WHERE id = $1', [prep_id]);
    const prep = result.rows[0];

    if (!prep || (!isAdmin && prep.user_id !== userId)) {
      throw new Error('فشل العثور على بيانات التحضير أو غير مصرح لك بالوصول');
    }

    const systemInstruction = `أنت الحين تشتغل كـ "محلل أعمال تقني" (Business Analyst) و "مدير منتجات" (Product Manager) خبرة في شركة سعودية رائدة لتطوير التطبيقات والمواقع.
أجب بصيغة JSON فقط وبدقة متناهية وبدون مقدمات. استخدم مفردات البزنس السعودية.`;

    const userPrompt = `بيانات الاجتماع:
- العنوان: ${prep.title}
- العميل: ${prep.client_name || 'غير محدد'}
- القطاع: ${prep.sector || 'تجارة'}
- الفكرة: ${prep.idea_raw}

نفذ التحليل الاستراتيجي الآن وقدم التقرير بصيغة JSON بالعامية السعودية الاحترافية.`;

    sendEvent('progress', { value: 5, message: 'بدء الاتصال بالذكاء الاصطناعي...' });

    // 2. DeepSeek Streaming Request
    const url = 'https://api.deepseek.com/chat/completions';
    const response = await axios.post(url, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.7,
      response_format: { type: 'json_object' }
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
            
            if (tokenCount % 8 === 0) {
              const realProgress = Math.min(92, 5 + Math.round((tokenCount / 800) * 87));
              sendEvent('progress', { 
                value: realProgress, 
                tokens: tokenCount,
                message: 'جاري توليد التقرير التحليلي...' 
              });
            }
          }
        } catch (e) {}
      }
    });

    stream.on('end', async () => {
      try {
        const cleaned = fullText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
        const finalResult = JSON.parse(cleaned);

        // Update Database
        await db.query(
          'UPDATE meeting_preps SET analysis_result = $1 WHERE id = $2',
          [JSON.stringify(finalResult), prep_id]
        );

        sendEvent('progress', { value: 100, message: 'اكتمل التحليل بنجاح ✨' });
        sendEvent('result', { data: finalResult });
        res.end();
      } catch (err) {
        sendEvent('error', { message: 'فشل في تحليل النتيجة النهائية' });
        res.end();
      }
    });

  } catch (err) {
    console.error('Streaming error:', err);
    sendEvent('error', { message: err.message || 'حدث خطأ تقني في البث' });
    res.end();
  }
});

module.exports = router;
