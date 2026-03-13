const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Generates content using a waterfall fallback mechanism to handle 429 rate limits.
 * @param {Object} options - Options for generation
 * @param {string|Object} options.prompt - The user prompt or contents object
 * @param {string} options.systemInstruction - The system instruction for the model
 * @param {string} [options.responseMimeType] - Optional MIME type (e.g., 'application/json')
 * @returns {Promise<string>} - The generated text response
 */
async function generateWithFallback({ prompt, systemInstruction, responseMimeType }) {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro'
  ];
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  for (const modelName of models) {
    try {
      console.log(`🤖 Attempting AI generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ 
        model: modelName, 
        systemInstruction 
      });

      // Prepare generation config if MIME type specified
      const generationConfig = responseMimeType ? { responseMimeType } : undefined;

      // Handle both string prompts and contents objects
      const requestPayload = typeof prompt === 'string' 
        ? prompt 
        : { contents: prompt.contents || prompt, generationConfig };

      const result = await model.generateContent(requestPayload);
      console.log(`✅ Success with model: ${modelName}`);
      return result.response.text();

    } catch (error) {
      const isRateLimit = error.message?.includes('429') || 
                         error.message?.includes('Resource has been exhausted') ||
                         error.message?.includes('ResourceExhausted');

      if (isRateLimit) {
        console.warn(`⚠️ Rate limited on ${modelName}, trying next model in waterfall...`);
        continue;
      }

      // If it's another type of error, throw it immediately
      console.error(`❌ Non-rate-limit error on ${modelName}:`, error.message);
      throw error;
    }
  }

  // If we reach here, all models were rate-limited
  const exhaustionError = new Error('ALL_MODELS_EXHAUSTED');
  exhaustionError.message = 'خدمة الذكاء الاصطناعي مشغولة حالياً بسبب ارتفاع الطلب. الرجاء المحاولة مجدداً بعد دقيقتين.';
  exhaustionError.retryAfter = 120;
  throw exhaustionError;
}

module.exports = { generateWithFallback };
