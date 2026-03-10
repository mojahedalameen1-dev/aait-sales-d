const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '../.env' });

async function testModel(modelName) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    console.log(`Testing model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("hello");
    console.log(`SUCCESS [${modelName}]:`, result.response.text());
    return true;
  } catch (err) {
    console.error(`FAILED [${modelName}]:`, err.message);
    return false;
  }
}

async function runTests() {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-pro',
    'gemini-1.0-pro'
  ];
  
  for (const m of models) {
    await testModel(m);
    console.log("-------------------");
  }
}

runTests();
