const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    const res = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hello' }]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("SUCCESS:", res.data);
  } catch (err) {
    console.error("ERROR DATA:", err.response ? err.response.data : err.message);
  }
}

test();
