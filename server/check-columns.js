require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function test() {
  console.log("--- Checking Columns ---");
  
  const tables = ['meeting_preps', 'clients'];
  
  for (const table of tables) {
    console.log(`Checking table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ ${table} Error:`, error.message);
    } else if (data.length > 0) {
      console.log(`✅ ${table} Columns:`, Object.keys(data[0]));
    } else {
      console.log(`⚠️ ${table} is empty, cannot check columns this way.`);
    }
  }
}

test();
