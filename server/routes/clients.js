const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get all clients with deal and score info
router.get('/', async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        deals!deals_client_id_fkey (
          id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date
        ),
        scores!scores_client_id_fkey (
          budget_score, authority_score, need_score, timeline_score, fit_score, total_score
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Flatten the results to match the previous SQLite output format
    const flattened = clients.map(c => ({
      ...c,
      deal_id: c.deals?.[0]?.id,
      deal_name: c.deals?.[0]?.deal_name,
      expected_value: c.deals?.[0]?.expected_value,
      payment_percentage: c.deals?.[0]?.payment_percentage,
      stage: c.deals?.[0]?.stage,
      last_contact_date: c.deals?.[0]?.last_contact_date,
      next_followup_date: c.deals?.[0]?.next_followup_date,
      budget_score: c.scores?.[0]?.budget_score,
      authority_score: c.scores?.[0]?.authority_score,
      need_score: c.scores?.[0]?.need_score,
      timeline_score: c.scores?.[0]?.timeline_score,
      fit_score: c.scores?.[0]?.fit_score,
      total_score: c.scores?.[0]?.total_score
    }));

    res.json(flattened);
  } catch (err) {
    console.error('Fetch clients error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العملاء' });
  }
});

// Get single client
router.get('/:id', async (req, res) => {
  try {
    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        deals!deals_client_id_fkey (
          id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date
        ),
        scores!scores_client_id_fkey (
          id, budget_score, authority_score, need_score, timeline_score, fit_score, total_score
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'العميل غير موجود' });
      throw error;
    }

    // Flatten
    const flattened = {
      ...client,
      deal_id: client.deals?.[0]?.id,
      deal_name: client.deals?.[0]?.deal_name,
      expected_value: client.deals?.[0]?.expected_value,
      payment_percentage: client.deals?.[0]?.payment_percentage,
      stage: client.deals?.[0]?.stage,
      last_contact_date: client.deals?.[0]?.last_contact_date,
      next_followup_date: client.deals?.[0]?.next_followup_date,
      score_id: client.scores?.[0]?.id,
      budget_score: client.scores?.[0]?.budget_score,
      authority_score: client.scores?.[0]?.authority_score,
      need_score: client.scores?.[0]?.need_score,
      timeline_score: client.scores?.[0]?.timeline_score,
      fit_score: client.scores?.[0]?.fit_score,
      total_score: client.scores?.[0]?.total_score
    };

    res.json(flattened);
  } catch (err) {
    console.error('Fetch client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العميل' });
  }
});

// Create client
router.post('/', async (req, res) => {
  const {
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date,
    budget_score, authority_score, need_score, timeline_score, fit_score
  } = req.body;

  if (!client_name) return res.status(400).json({ error: 'اسم العميل مطلوب' });

  try {
    // 1. Create client
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .insert([{ client_name, phone: phone || '', client_type: client_type || 'شركة', city: city || 'الرياض', sector: sector || 'تجارة', channel: channel || 'أخرى', notes: notes || '' }])
      .select()
      .single();

    if (clientErr) throw clientErr;
    const clientId = client.id;

    // 2. Create deal
    const { error: dealErr } = await supabase
      .from('deals')
      .insert([{ 
        client_id: clientId, 
        deal_name: deal_name || '', 
        expected_value: expected_value || 0, 
        payment_percentage: payment_percentage != null ? payment_percentage : 0.50, 
        stage: stage || 'جديد', 
        last_contact_date: last_contact_date || '', 
        next_followup_date: next_followup_date || '' 
      }]);

    if (dealErr) throw dealErr;

    // 3. Create scores
    const { error: scoreErr } = await supabase
      .from('scores')
      .insert([{ 
        client_id: clientId, 
        budget_score: budget_score || 0, 
        authority_score: authority_score || 0, 
        need_score: need_score || 0, 
        timeline_score: timeline_score || 0, 
        fit_score: fit_score || 0 
      }]);

    if (scoreErr) throw scoreErr;

    // 4. Return full client info
    const { data: fullClient, error: fetchErr } = await supabase
      .from('clients')
      .select(`
        *,
        deals!deals_client_id_fkey (*),
        scores!scores_client_id_fkey (*)
      `)
      .eq('id', clientId)
      .single();

    if (fetchErr) throw fetchErr;

    // Flatten
    const flattened = {
      ...fullClient,
      deal_id: fullClient.deals?.[0]?.id,
      deal_name: fullClient.deals?.[0]?.deal_name,
      expected_value: fullClient.deals?.[0]?.expected_value,
      payment_percentage: fullClient.deals?.[0]?.payment_percentage,
      stage: fullClient.deals?.[0]?.stage,
      last_contact_date: fullClient.deals?.[0]?.last_contact_date,
      next_followup_date: fullClient.deals?.[0]?.next_followup_date,
      budget_score: fullClient.scores?.[0]?.budget_score,
      authority_score: fullClient.scores?.[0]?.authority_score,
      need_score: fullClient.scores?.[0]?.need_score,
      timeline_score: fullClient.scores?.[0]?.timeline_score,
      fit_score: fullClient.scores?.[0]?.fit_score,
      total_score: fullClient.scores?.[0]?.total_score
    };

    res.json(flattened);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة العميل' });
  }
});

// Update client
router.put('/:id', async (req, res) => {
  const {
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date,
    budget_score, authority_score, need_score, timeline_score, fit_score
  } = req.body;

  try {
    // 1. Update client
    const { error: clientErr } = await supabase
      .from('clients')
      .update({ client_name, phone, client_type, city, sector, channel, notes })
      .eq('id', req.params.id);
    if (clientErr) throw clientErr;

    // 2. Upsert scores
    const { error: scoreErr } = await supabase
      .from('scores')
      .upsert({ 
        client_id: req.params.id, 
        budget_score: budget_score || 0, 
        authority_score: authority_score || 0, 
        need_score: need_score || 0, 
        timeline_score: timeline_score || 0, 
        fit_score: fit_score || 0 
      }, { onConflict: 'client_id' });
    if (scoreErr) throw scoreErr;

    // 3. Upsert deals
    const { error: dealErr } = await supabase
      .from('deals')
      .upsert({
        client_id: req.params.id,
        deal_name,
        expected_value: expected_value || 0,
        payment_percentage: payment_percentage != null ? payment_percentage : 0.50,
        stage,
        last_contact_date,
        next_followup_date
      }, { onConflict: 'client_id' }); // Note: Assuming client_id is unique enough or we should target by id if we had it.
    if (dealErr) throw dealErr;

    // 4. Return updated
    const { data: updated, error: fetchErr } = await supabase
      .from('clients')
      .select(`
        *,
        deals!deals_client_id_fkey (*),
        scores!scores_client_id_fkey (*)
      `)
      .eq('id', req.params.id)
      .single();
    if (fetchErr) throw fetchErr;

    // Flatten
    const flattened = {
      ...updated,
      deal_id: updated.deals?.[0]?.id,
      deal_name: updated.deals?.[0]?.deal_name,
      expected_value: updated.deals?.[0]?.expected_value,
      payment_percentage: updated.deals?.[0]?.payment_percentage,
      stage: updated.deals?.[0]?.stage,
      last_contact_date: updated.deals?.[0]?.last_contact_date,
      next_followup_date: updated.deals?.[0]?.next_followup_date,
      budget_score: updated.scores?.[0]?.budget_score,
      authority_score: updated.scores?.[0]?.authority_score,
      need_score: updated.scores?.[0]?.need_score,
      timeline_score: updated.scores?.[0]?.timeline_score,
      fit_score: updated.scores?.[0]?.fit_score,
      total_score: updated.scores?.[0]?.total_score
    };

    res.json(flattened);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العميل' });
  }
});

// Delete client
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('clients').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف العميل' });
  }
});

// Update last_contact_date to today
router.patch('/:id/contacted', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('deals')
      .update({ last_contact_date: today })
      .eq('client_id', req.params.id);
    if (error) throw error;
    res.json({ success: true, last_contact_date: today });
  } catch (err) {
    console.error('Patch contact date error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث تاريخ التواصل' });
  }
});

// Update deal stage (for Kanban)
router.patch('/:id/stage', async (req, res) => {
  const { stage } = req.body;

  if (!stage) {
    return res.status(400).json({ error: 'المرحلة المطلوبة غير موجودة' });
  }

  try {
    const { data: deal, error: findErr } = await supabase
      .from('deals')
      .select('id')
      .eq('client_id', req.params.id)
      .single();

    if (findErr && findErr.code !== 'PGRST116') throw findErr;

    if (!deal) {
      const { error: insErr } = await supabase
        .from('deals')
        .insert([{ client_id: req.params.id, deal_name: '', expected_value: 0, payment_percentage: 0.50, stage, last_contact_date: '', next_followup_date: '' }]);
      if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase
        .from('deals')
        .update({ stage })
        .eq('client_id', req.params.id);
      if (updErr) throw updErr;
    }

    // Fetch updated client summary to return
    const { data: updated, error: fetchErr } = await supabase
      .from('clients')
      .select('id, client_name, deals!deals_client_id_fkey (stage)')
      .eq('id', req.params.id)
      .single();

    if (fetchErr) throw fetchErr;

    res.json({ success: true, client: {
      id: updated.id,
      client_name: updated.client_name,
      stage: updated.deals?.[0]?.stage
    } });
  } catch (err) {
    console.error('Patch stage error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث مرحلة الصفقة' });
  }
});

module.exports = router;
