require('dotenv').config({ path: '../.env' });
const supabase = require('./supabase');

async function testInsert() {
  console.log("Testing insert into meeting_preps table...");
  const body = { title: 'تحضير اجتماع جديد' };
  const { 
      title, 
      client_name = '', 
      sector = '', 
      meeting_date = '', 
      status = 'مسودة', 
      idea_raw = '', 
      tags = '' 
    } = body;
  
  const { data, error } = await supabase
      .from('meeting_preps')
      .insert([{ title, client_name, sector, meeting_date: meeting_date || null, status, idea_raw, tags }])
      .select()
      .single();
  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success! Data:", data);
  }
}

testInsert();
