const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env' });

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    console.log("Fetching models...");
    // Since SDK doesn't expose listModels cleanly in all versions, let's use a workaround with axios
    const axios = require('axios');
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    console.log("AVAILABLE GEMINI 1.5 MODELS:");
    res.data.models
      .filter(m => m.name.includes('1.5') && m.name.includes('flash'))
      .forEach(m => console.log(`- ${m.name} (methods: ${m.supportedGenerationMethods.join(', ')})`));
  } catch (err) {
    console.error("Error fetching models:", err.message);
  }
}

listModels();
