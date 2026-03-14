require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function test() {
  console.log("--- Checking All Tables ---");
  
  const tables = ['meeting_preps', 'clients', 'deals', 'scores', 'files'];
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ ${table} Error:`, error.message, error.code);
    } else {
      console.log(`✅ ${table} Success! Columns:`, data.length > 0 ? Object.keys(data[0]) : "Empty Table");
    }
  }
}

test();
