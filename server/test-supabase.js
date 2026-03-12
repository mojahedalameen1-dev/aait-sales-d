require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function test() {
  console.log("Testing meeting_preps table...");
  const { data, error } = await supabase.from('meeting_preps').select('*').limit(1);
  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

test();
