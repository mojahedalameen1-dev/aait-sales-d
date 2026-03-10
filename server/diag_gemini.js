const axios = require('axios');
require('dotenv').config({ path: '../.env' });

async function check() {
  const key = process.env.GEMINI_API_KEY;
  console.log("Checking API Key (last 4 chars):", key.slice(-4));
  
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    const res = await axios.get(url);
    console.log("SUCCESS! Models found:");
    const flashModels = res.data.models.filter(m => m.name.includes('flash'));
    flashModels.forEach(m => {
        console.log(`- ${m.name} [Methods: ${m.supportedGenerationMethods.join(', ')}]`);
    });
    
    if (flashModels.length === 0) {
        console.log("No Flash models found! All Models:");
        res.data.models.forEach(m => console.log(`- ${m.name}`));
    }
  } catch (err) {
    if (err.response) {
      console.error("API Error:", err.response.status, err.response.data);
    } else {
      console.error("Error:", err.message);
    }
  }
}

check();
