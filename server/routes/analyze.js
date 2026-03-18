const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateJWT);

router.post('/', async (req, res) => {
  const { client_idea, client_name, sector, client_id } = req.body;
  
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'مفتاح الذكاء الاصطناعي غير متوفر في الخادم.' });
  }

  if (!client_idea) return res.status(400).json({ error: 'فكرة العميل مطلوبة' });

  try {
    const systemInstruction = `أنت خبير استراتيجي (Strategic Brain) لمنظومة تطوير الأعمال.
أجب بصيغة JSON فقط، بدون مقدمات. استخدم مفردات البزنس السعودية.
الهيكل المطلوب:
{
  "key_message": "...",
  "business_analysis": { "main_goal": "...", "current_problem": "...", "target_users": [], "expected_platforms": [] },
  "discovery_questions": { "business": [], "technical": [], "scope": [] },
  "user_journeys": [ { "user_type": "...", "steps": [] } ],
  "meeting_plan": { "opening": "...", "key_message": "...", "next_step": "..." }
}`;

    const userPrompt = `الفكرة: ${client_idea}
العميل: ${client_name || 'العميل'}
القطاع: ${sector || 'تجارة'}

حلل الفكرة استراتيجياً وقدم الـ JSON المطلوب.`;

    let analysisText = await generateWithFallback({
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: "application/json"
    });

    let analysis = JSON.parse(analysisText);

    // Ensure analysis structure is valid
    if (!analysis.discovery_questions) analysis.discovery_questions = { business: [], technical: [], scope: [] };
    if (!analysis.user_journeys) analysis.user_journeys = [];
    if (!Array.isArray(analysis.user_journeys)) analysis.user_journeys = [];

    const userId = req.user.id;

    if (client_id) {
      // Verify ownership of client
      const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [client_id]);
      if (clientCheck.rows[0] && (req.user.isAdmin || clientCheck.rows[0].user_id === userId)) {
        await db.query(
          `INSERT INTO meeting_preps (client_id, user_id, idea_raw, analysis_result, title) 
           VALUES ($1, $2, $3, $4, $5)`,
          [client_id, userId, client_idea, JSON.stringify(analysis), `تحليل فكرة: ${client_name || 'عميل جديد'}`]
        );
      }
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
      error: 'فشل تحليل الفكرة عبر الذكاء الاصطناعي',
      details: error.message
    });
  }
});

router.get('/:clientId', async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const userId = req.user.id;

    // Verify ownership of client first
    const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [req.params.clientId]);
    if (!clientCheck.rows[0] || (!isAdmin && clientCheck.rows[0].user_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM meeting_preps WHERE client_id = $1 ORDER BY created_at DESC',
      [req.params.clientId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Fetch analysis error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل تحليلات العميل' });
  }
});

module.exports = router;
