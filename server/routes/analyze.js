const express = require('express');
const { generateWithFallback } = require('../helpers/aiClient');
const axios = require('axios');
const router = express.Router();
const supabase = require('../supabase');

router.post('/', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const { client_idea, client_name, sector, client_id } = req.body;
  
  if (!process.env.DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '\u0645\u0641\u062a\u0627\u062d \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631 \u0641\u064a \u0627\u0644\u062e\u0627\u062f\u0645.' });
  }

  if (!client_idea) return res.status(400).json({ error: '\u0641\u0643\u0631\u0629 \u0627\u0644\u0639\u0645\u064a\u0644 \u0645\u0637\u0644\u0648\u0628\u0629' });

  try {
    const systemInstruction = `\u0623\u0646\u062a \u062e\u0628\u064a\u0631 \u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a (Strategic Brain) \u0644\u0645\u0646\u0638\u0648\u0645\u0629 Sales Focus AI.
\u0623\u062c\u0628 \u0628\u0635\u064a\u063a\u0629 JSON \u0641\u0642\u0637\u060c \u0628\u062f\u0648\u0646 \u0645\u0642\u062f\u0645\u0627\u062a. \u0627\u0633\u062a\u062e\u062f\u0645 \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0628\u0632\u0646\u0633 \u0627\u0644\u0633\u0639\u0648\u062f\u064a.
\u0627\u0644\u0647\u064a\u0643\u0644 \u0627\u0644\u0645\u0637\u0644\u0648\u0628:
{
  "key_message": "...",
  "business_analysis": { "main_goal": "...", "current_problem": "...", "target_users": [], "expected_platforms": [] },
  "discovery_questions": { "business": [], "technical": [], "scope": [] },
  "user_journeys": [ { "user_type": "...", "steps": [] } ],
  "meeting_plan": { "opening": "...", "key_message": "...", "next_step": "..." }
}`;

    const userPrompt = `\u0627\u0644\u0641\u0643\u0631\u0629: ${client_idea}
\u0627\u0644\u0639\u0645\u064a\u0644: ${client_name || '\u0627\u0644\u0639\u0645\u064a\u0644'}
\u0627\u0644\u0642\u0637\u0627\u0639: ${sector || '\u062a\u062c\u0627\u0631\u0629'}

\u062d\u0644\u0644 \u0627\u0644\u0641\u0643\u0631\u0629 \u0627\u0633\u062a\u0631\u0627\u062a\u064a\u062c\u064a\u0627\u064b \u0648\u0642\u062f\u0645 \u0627\u0644\u0640 JSON \u0627\u0644\u0645\u0637\u0644\u0648\u0628.`;

    let analysisText = await generateWithFallback({
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: "application/json"
    });

    let analysis = JSON.parse(analysisText);

    if (client_id) {
      await supabase
        .from('meeting_preps')
        .insert([{ 
          client_id, 
          idea_raw: client_idea, 
          analysis_result: analysis,
          title: `تحليل فكرة: ${client_name || 'عميل جديد'}`
        }]);
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
      error: '\u0641\u0634\u0644 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u0643\u0631\u0629 \u0639\u0628\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a',
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      failedAt: 'AI Waterfall Analysis'
    });
  }
});

router.get('/:clientId', async (req, res) => {
  try {
    const { data: analyses, error } = await supabase
      .from('meeting_preps')
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
