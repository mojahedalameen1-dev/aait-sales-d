import * as https from 'https';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: path.join(import.meta.dirname, '../.env') });

const key = process.env.GEMINI_API_KEY;
console.log('API Key (last 6):', key?.slice(-6));

const req = https.get(
  `https://generativelanguage.googleapis.com/v1/models?key=${key}`,
  (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const json = JSON.parse(data);
      if (json.models) {
        console.log('\n✅ Models supporting generateContent (v1):');
        json.models
          .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
          .forEach(m => console.log('  -', m.name));
      } else {
        console.log('❌ Response:', data.slice(0, 500));
      }
    });
  }
);
req.on('error', e => console.error('Request error:', e.message));
req.end();
