const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../supabase');

router.post('/', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { prep_id, title, client_name, sector, idea_raw } = req.body;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Groq API غير متوفر في الخادم.' });
  }

  if (!idea_raw || !title) {
    return res.status(400).json({ error: 'العنوان وفكرة العميل مطلوبان للتحليل.' });
  }

  try {
    const systemInstruction = `أنت العقل الاستراتيجي (Strategic Brain) لمنظومة Sales Focus AI.
أجب بصيغة JSON فقط وبدقة متناهية وبدون مقدمات. استخدم مفردات البزنس السعودي.
الهيكل المطلوب:
{
  "key_message": "...",
  "business_analysis": { "main_goal": "...", "current_problem": "...", "target_users": [], "expected_platforms": [] },
  "meeting_plan": { "opening": "...", "next_step": "..." },
  "discovery_questions": { "business": [], "technical": [], "scope": [] },
  "user_journeys": [ { "user_type": "...", "steps": [] } ]
}`;

    const userPrompt = `بيانات الاجتماع:
- العنوان: ${title}
- العميل: ${client_name || 'غير محدد'}
- القطاع: ${sector || 'تجارة'}
- الفكرة: ${idea_raw}

نفذ التحليل الاستراتيجي الآن وقدم التقرير بصيغة JSON.`;

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
    console.error('Groq API Error (Prep Hub):', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'حدث خطأ أثناء التواصل مع Groq.',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;

