const axios = require('axios');

/**
 * Generates content using a waterfall fallback mechanism via DeepSeek API.
 * @param {Object} options
 * @param {string|Object} options.prompt - The user prompt
 * @param {string} options.systemInstruction - The system instruction for the model
 * @param {string} [options.responseMimeType] - Optional MIME type
 * @returns {Promise<string>} - The generated text response
 */
async function generateWithFallback({ prompt, systemInstruction, responseMimeType }) {
  const models = [
    'deepseek-chat',
    'deepseek-reasoner'
  ];
  
  // Use DEEPSEEK_API_KEY if available, otherwise check GEMINI_API_KEY for legacy
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('AI_API_KEY_MISSING');
  }

  // Handle both string prompts and contents objects
  let promptText = typeof prompt === 'string'
    ? prompt
    : JSON.stringify(prompt, null, 0);

  // Clean common escapes if it's coming from a serialized source
  promptText = promptText
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\t/g, '\t')
    .replace(/\\\\r/g, '');

  for (const modelName of models) {
    try {
      console.log(`🤖 Attempting model via DeepSeek API: ${modelName}`);

      const url = 'https://api.deepseek.com/chat/completions';

      const body = {
        model: modelName,
        messages: [
          ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
          { role: 'user', content: promptText }
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 8192
      };

      // Handle JSON response requirement for DeepSeek (they support response_format)
      if (responseMimeType === 'application/json') {
        body.response_format = { type: 'json_object' };
      }

      const response = await axios.post(url, body, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 60000
      });

      const text = response.data?.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from DeepSeek API');

      console.log(`✅ Success with model: ${modelName}`);
      return text;

    } catch (error) {
      const status = error.response?.status;

      // Log full DeepSeek error details for debugging
      if (error.response?.data) {
        console.error(`📋 DeepSeek API Error Details:`, JSON.stringify(error.response.data));
      }

      const isRateLimit = status === 429 || status === 402 ||
        error.message?.includes('429') ||
        error.message?.includes('402') ||
        error.message?.includes('balance is insufficient') ||
        error.message?.includes('Insufficient Balance');

      if (isRateLimit) {
        console.warn(`⚠️ Rate limited or balance issue on ${modelName}, trying next model...`);
        continue;
      }

      console.error(`❌ Non-rate-limit error on ${modelName}:`, error.message);
      throw error;
    }
  }

  const exhaustionError = new Error('ALL_MODELS_EXHAUSTED');
  exhaustionError.message = '\u062e\u062f\u0645\u0629 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0645\u0634\u0631\u0641\u0629 \u062d\u0627\u0644\u064a\u0627\u064b \u0623\u0648 \u0627\u0644\u0631\u0635\u064a\u062f \u063a\u064a\u0631 \u0643\u0627\u0641\u064d (DeepSeek Balance Empty). \u0627\u0644\u0631\u062c\u0627\u0621 \u0634\u062d\u0646 \u0627\u0644\u0631\u0635\u064a\u062f \u0641\u064a DeepSeek.';
  exhaustionError.retryAfter = 120;
  throw exhaustionError;
}

module.exports = { generateWithFallback };
