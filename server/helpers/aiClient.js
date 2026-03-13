const axios = require('axios');

/**
 * Generates content using a waterfall fallback mechanism via direct REST API calls.
 * @param {Object} options
 * @param {string|Object} options.prompt - The user prompt
 * @param {string} options.systemInstruction - The system instruction for the model
 * @param {string} [options.responseMimeType] - Optional MIME type
 * @returns {Promise<string>} - The generated text response
 */
async function generateWithFallback({ prompt, systemInstruction, responseMimeType }) {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ];
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  // Fix double-escaped characters from JSON serialization
  let promptText = typeof prompt === 'string'
    ? prompt
    : JSON.stringify(prompt, null, 0);

  promptText = promptText
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\t/g, '\t')
    .replace(/\\\\r/g, '');

  for (const modelName of models) {
    try {
      console.log(`🤖 Attempting model via REST API: ${modelName}`);

      const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;

      const body = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        ...(systemInstruction && {
          systemInstruction: { parts: [{ text: systemInstruction }] }
        }),
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7,
          ...(responseMimeType && { responseMimeType })
        }
      };

      const response = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 55000
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini API');

      console.log(`✅ Success with model: ${modelName}`);
      return text;

    } catch (error) {
      const status = error.response?.status;

      // Log full Google error details for debugging
      if (error.response?.data) {
        console.error(`📋 Google API Error Details:`, JSON.stringify(error.response.data));
      }

      const isRateLimit = status === 429 ||
        error.message?.includes('429') ||
        error.message?.includes('Resource has been exhausted') ||
        error.message?.includes('ResourceExhausted');

      if (isRateLimit) {
        console.warn(`⚠️ Rate limited on ${modelName}, trying next model...`);
        continue;
      }

      console.error(`❌ Non-rate-limit error on ${modelName}:`, error.message);
      throw error;
    }
  }

  const exhaustionError = new Error('ALL_MODELS_EXHAUSTED');
  exhaustionError.message = 'خدمة الذكاء الاصطناعي مشغولة حالياً بسبب ارتفاع الطلب. الرجاء المحاولة مجدداً بعد دقيقتين.';
  exhaustionError.retryAfter = 120;
  throw exhaustionError;
}

module.exports = { generateWithFallback };
