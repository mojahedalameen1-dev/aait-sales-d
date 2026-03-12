const supabase = require('./supabase');

async function testQueries() {
  console.log("--- Testing Clients Query ---");
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select(`
      *,
      deals!deals_client_id_fkey (
        id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date, ticket_link, slack_code
      ),
      scores!scores_client_id_fkey (
        budget_score, authority_score, need_score, timeline_score, fit_score, total_score
      )
    `)
    .limit(1);

  if (clientError) {
    console.error("❌ Clients Query Error:", clientError);
  } else {
    console.log("✅ Clients Query Success!");
    console.log(JSON.stringify(clients, null, 2));
  }

  console.log("\n--- Testing Dashboard Stats Query ---");
  const { data: dashboard, error: dashError } = await supabase
    .from('clients')
    .select(`
        id, client_name, sector, created_at,
        deals!deals_client_id_fkey (expected_value, payment_percentage, stage, last_contact_date, next_followup_date),
        scores!scores_client_id_fkey (total_score)
    `)
    .limit(1);

  if (dashError) {
    console.error("❌ Dashboard Query Error:", dashError);
  } else {
    console.log("✅ Dashboard Query Success!");
  }
}

testQueries();
