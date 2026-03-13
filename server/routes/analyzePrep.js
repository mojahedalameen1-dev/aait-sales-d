const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const router = express.Router();
const supabase = require('../supabase');

router.post('/', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { prep_id, title, client_name, sector, idea_raw } = req.body;

  if (!GEMINI_API_KEY) {
    console.error('Environment Check - GEMINI_API_KEY is missing');
    return res.status(500).json({ 
      error: 'مفتاح Gemini API غير متوفر في الخادم.',
      debug_info: {
        has_env_var: !!process.env.GEMINI_API_KEY,
        node_env: process.env.NODE_ENV,
        env_keys: Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY')).join(', ')
      }
    });
  }

  if (!idea_raw || !title) {
    return res.status(400).json({ error: 'العنوان وفكرة العميل مطلوبان للتحليل.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: `أنت العقل الاستراتيجي (Strategic Brain) لمنظومة Sales Focus AI.
أجب بصيغة JSON فقط وبدقة متناهية وبدون مقدمات. استخدم مفردات البزنس السعودي.
الهيكل المطلوب:
{
  "key_message": "...",
  "business_analysis": { "main_goal": "...", "current_problem": "...", "target_users": [], "expected_platforms": [] },
  "meeting_plan": { "opening": "...", "next_step": "..." },
  "discovery_questions": { "business": [], "technical": [], "scope": [] },
  "user_journeys": [ { "user_type": "...", "steps": [] } ]
}`,
    });

    const userPrompt = `بيانات الاجتماع:
- العنوان: ${title}
- العميل: ${client_name || 'غير محدد'}
- القطاع: ${sector || 'تجارة'}
- الفكرة: ${idea_raw}

نفذ التحليل الاستراتيجي الآن وقدم التقرير بصيغة JSON.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    let analysis = result.response.text();
    if (typeof analysis === 'string') {
      analysis = JSON.parse(analysis);
    }

    // Save to Supabase if prep_id provided
    if (prep_id) {
       await supabase
         .from('meeting_preps')
         .update({ 
           analysis_result: analysis, 
           updated_at: new Date().toISOString() 
         })
         .eq('id', prep_id);
    }

    res.json(analysis);

  } catch (error) {
    console.error('Gemini API Error (Prep Hub):', error.message);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء التواصل مع الذكاء الاصطناعي.',
      details: error.message
    });
  }
});

module.exports = router;

