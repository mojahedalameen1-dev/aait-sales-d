const express = require('express');
const axios = require('axios');
const router = express.Router();
const supabase = require('../supabase');

router.post('/', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const { client_idea, client_name, sector, client_id } = req.body;
  
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'مفتاح Groq API غير متوفر في الخادم.' });
  }

  if (!client_idea) return res.status(400).json({ error: 'فكرة العميل مطلوبة' });

  try {
    const systemInstruction = `أنت العقل الاستراتيجي (Strategic Brain) لمنظومة Sales Focus AI.
أجب بصيغة JSON فقط، بدون مقدمات. استخدم مفردات البزنس السعودي.
الهيكل المطلوبة:
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

    // Save to Supabase if client_id provided
    if (client_id) {
      await supabase
        .from('meeting_analyses')
        .insert([{ client_id, client_idea, analysis_result: analysis }]);
    }

    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Groq error:', err.response?.data || err.message);
    res.status(500).json({ error: 'حدث خطأ أثناء تحليل الفكرة عبر Groq.' });
  }
});

// Get analyses for a client
router.get('/:clientId', async (req, res) => {
  try {
    const { data: analyses, error } = await supabase
      .from('meeting_analyses')
      .select('*')
      .eq('client_id', req.params.clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(analyses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
