const express = require('express');
const router = express.Router();
const db = require('../database');

// Get all clients with deal and score info
router.get('/', (req, res) => {
  try {
    const clients = db.prepare(`
      SELECT 
        c.*,
        d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
        s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      LEFT JOIN scores s ON s.client_id = c.id
      ORDER BY c.created_at DESC
    `).all();
    res.json(clients);
  } catch (err) {
    console.error('Fetch clients error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العملاء' });
  }
});

// Get single client
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare(`
      SELECT 
        c.*,
        d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
        s.id as score_id, s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      LEFT JOIN scores s ON s.client_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);
    if (!client) return res.status(404).json({ error: 'العميل غير موجود' });
    res.json(client);
  } catch (err) {
    console.error('Fetch client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العميل' });
  }
});

// Create client (with deal and scores in one transaction)
router.post('/', (req, res) => {
  const {
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date,
    budget_score, authority_score, need_score, timeline_score, fit_score
  } = req.body;

  if (!client_name) return res.status(400).json({ error: 'اسم العميل مطلوب' });

  const transaction = db.transaction(() => {
    const clientResult = db.prepare(`
      INSERT INTO clients (client_name, phone, client_type, city, sector, channel, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(client_name, phone || '', client_type || 'شركة', city || 'الرياض', sector || 'تجارة', channel || 'أخرى', notes || '');

    const clientId = clientResult.lastInsertRowid;

    db.prepare(`
      INSERT INTO deals (client_id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(clientId, deal_name || '', expected_value || 0, payment_percentage != null ? payment_percentage : 0.50, stage || 'جديد', last_contact_date || '', next_followup_date || '');

    db.prepare(`
      INSERT INTO scores (client_id, budget_score, authority_score, need_score, timeline_score, fit_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(clientId, budget_score || 0, authority_score || 0, need_score || 0, timeline_score || 0, fit_score || 0);

    return clientId;
  });

  try {
    const clientId = transaction();
    const newClient = db.prepare(`
      SELECT c.*, d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
             s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      LEFT JOIN scores s ON s.client_id = c.id
      WHERE c.id = ?
    `).get(clientId);
    res.json(newClient);
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة العميل' });
  }
});

// Update client
router.put('/:id', (req, res) => {
  const {
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date,
    budget_score, authority_score, need_score, timeline_score, fit_score
  } = req.body;

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE clients SET client_name=?, phone=?, client_type=?, city=?, sector=?, channel=?, notes=?
      WHERE id=?
    `).run(client_name, phone, client_type, city, sector, channel, notes, req.params.id);

    // Using SQLite UPSERT (ON CONFLICT DO UPDATE) for scores
    // Note: scores.client_id is UNIQUE in schema
    db.prepare(`
      INSERT INTO scores (client_id, budget_score, authority_score, need_score, timeline_score, fit_score)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id) DO UPDATE SET
        budget_score=excluded.budget_score,
        authority_score=excluded.authority_score,
        need_score=excluded.need_score,
        timeline_score=excluded.timeline_score,
        fit_score=excluded.fit_score
    `).run(req.params.id, budget_score || 0, authority_score || 0, need_score || 0, timeline_score || 0, fit_score || 0);

    // Since deals.client_id isn't explicitly UNIQUE in schema (though logically 1:1), 
    // we use a safe delete-and-insert or the previous select-update pattern. 
    // To be perfectly safe without altering schema right now:
    const deal = db.prepare('SELECT id FROM deals WHERE client_id=?').get(req.params.id);
    if (deal) {
      db.prepare(`
        UPDATE deals SET deal_name=?, expected_value=?, payment_percentage=?, stage=?, last_contact_date=?, next_followup_date=?
        WHERE client_id=?
      `).run(deal_name, expected_value || 0, payment_percentage != null ? payment_percentage : 0.50, stage, last_contact_date, next_followup_date, req.params.id);
    } else {
      db.prepare(`
        INSERT INTO deals (client_id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.params.id, deal_name || '', expected_value || 0, payment_percentage != null ? payment_percentage : 0.50, stage || 'جديد', last_contact_date || '', next_followup_date || '');
    }
  });

  try {
    transaction();
    const updated = db.prepare(`
      SELECT c.*, d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
             s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      LEFT JOIN scores s ON s.client_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);
    res.json(updated);
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العميل' });
  }
});

// Delete client
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM clients WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف العميل' });
  }
});

// Update last_contact_date to today
router.patch('/:id/contacted', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepare('UPDATE deals SET last_contact_date=? WHERE client_id=?').run(today, req.params.id);
    res.json({ success: true, last_contact_date: today });
  } catch (err) {
    console.error('Patch contact date error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث تاريخ التواصل' });
  }
});

// Update deal stage (for Kanban)
router.patch('/:id/stage', (req, res) => {
  const { stage } = req.body;

  if (!stage) {
    return res.status(400).json({ error: 'المرحلة المطلوبة غير موجودة' });
  }

  try {
    const deal = db.prepare('SELECT id FROM deals WHERE client_id=?').get(req.params.id);
    if (!deal) {
      db.prepare(`
          INSERT INTO deals (client_id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date)
          VALUES (?, '', 0, 0.50, ?, '', '')
        `).run(req.params.id, stage);
    } else {
      db.prepare('UPDATE deals SET stage=? WHERE client_id=?').run(stage, req.params.id);
    }

    // Fetch updated client summary to return
    const updated = db.prepare(`
      SELECT c.id, c.client_name, d.stage
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      WHERE c.id = ?
    `).get(req.params.id);

    res.json({ success: true, client: updated });
  } catch (err) {
    console.error('Patch stage error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث مرحلة الصفقة' });
  }
});

module.exports = router;
