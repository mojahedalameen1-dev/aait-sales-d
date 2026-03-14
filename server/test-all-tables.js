require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function test() {
  console.log("--- Testing Tables ---");
  
  const tables = ['meeting_preps', 'files', 'clients'];
  
  for (const table of tables) {
    console.log(`Testing table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ ${table} Error:`, error.message, error.code);
    } else {
      console.log(`✅ ${table} Success! Found ${data.length} records (limit 1).`);
    }
  }
}

test();
