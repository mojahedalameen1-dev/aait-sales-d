const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');
const logActivity = require('../helpers/activityLogger');

router.use(authenticateJWT);


router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const userId = req.user.id;

    let query = `
      SELECT 
        c.*,
        d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date, d.ticket_link, d.slack_code,
        s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON c.id = d.client_id
      LEFT JOIN scores s ON c.id = s.client_id
    `;
    
    let params = [];
    if (!isAdmin) {
      query += ` WHERE c.user_id = $1`;
      params.push(userId);
    }
    
    query += ` ORDER BY c.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch clients error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العملاء' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const userId = req.user.id;

    let query = `
      SELECT 
        c.*,
        d.id as deal_id, d.deal_name, d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
        s.id as score_id, s.budget_score, s.authority_score, s.need_score, s.timeline_score, s.fit_score, s.total_score
      FROM clients c
      LEFT JOIN deals d ON c.id = d.client_id
      LEFT JOIN scores s ON c.id = s.client_id
      WHERE c.id = $1
    `;
    
    let params = [req.params.id];
    if (!isAdmin) {
      query += ` AND c.user_id = $2`;
      params.push(userId);
    }

    const result = await db.query(query, params);
    const client = result.rows[0];

    if (!client) return res.status(404).json({ error: 'العميل غير موجود' });

    res.json(client);
  } catch (err) {
    console.error('Fetch client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات العميل' });
  }
});


router.post('/', async (req, res) => {
  const {
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date,
    ticket_link, slack_code,
    budget_score, authority_score, need_score, timeline_score, fit_score
  } = req.body;

  if (!client_name) return res.status(400).json({ error: 'اسم العميل مطلوب' });

  try {
    const userId = req.user.id;
    const client_db = await db.pool.connect();

    try {
      await client_db.query('BEGIN');

      const clientResult = await client_db.query(
        `INSERT INTO clients (user_id, client_name, phone, client_type, city, sector, channel, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [userId, client_name, phone || '', client_type || 'شركة', city || 'الرياض', sector || 'تجارة', channel || 'أخرى', notes || '']
      );
      const client = clientResult.rows[0];
      const clientId = client.id;

      const finalStage = stage || 'جديد';
      await client_db.query(
        `INSERT INTO deals (client_id, user_id, deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date, ticket_link, slack_code) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [clientId, userId, deal_name || '', expected_value || 0, payment_percentage != null ? payment_percentage : 0.50, finalStage, last_contact_date || '', next_followup_date || '', ticket_link || '', slack_code || '']
      );

      await client_db.query(
        `INSERT INTO scores (client_id, budget_score, authority_score, need_score, timeline_score, fit_score) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [clientId, budget_score || 0, authority_score || 0, need_score || 0, timeline_score || 0, fit_score || 0]
      );

      await client_db.query('COMMIT');


      await logActivity(userId, 'add_client', `أضاف عميل جديد: ${client_name}`, 'client', clientId);

      const fullClient = {
        ...client,
        deal_id: null,
        deal_name: deal_name || '',
        expected_value: expected_value || 0,
        payment_percentage: payment_percentage != null ? payment_percentage : 0.50,
        stage: finalStage,
        last_contact_date: last_contact_date || '',
        next_followup_date: next_followup_date || '',
        ticket_link: ticket_link || '',
        slack_code: slack_code || '',
        budget_score: budget_score || 0,
        authority_score: authority_score || 0,
        need_score: need_score || 0,
        timeline_score: timeline_score || 0,
        fit_score: fit_score || 0,
        total_score: (parseInt(budget_score) || 0) + (parseInt(authority_score) || 0) + (parseInt(need_score) || 0) + (parseInt(timeline_score) || 0) + (parseInt(fit_score) || 0)
      };

      res.json(fullClient);
    } catch (err) {
      await client_db.query('ROLLBACK');
      throw err;
    } finally {
      client_db.release();
    }
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إضافة العميل' });
  }
});


router.put('/:id', authenticateJWT, async (req, res) => {
  const { 
    client_name, phone, client_type, city, sector, channel, notes,
    deal_name, expected_value, payment_percentage, stage, 
    last_contact_date, next_followup_date, ticket_link, slack_code,
    budget_score, authority_score, need_score, timeline_score, fit_score 
  } = req.body;
  const id = req.params.id;

  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;
    const client_db = await db.pool.connect();

    try {
      await client_db.query('BEGIN');

      await client_db.query(
        `UPDATE clients SET client_name = $1, phone = $2, client_type = $3, city = $4, sector = $5, channel = $6, notes = $7 
         WHERE id = $8 AND (user_id = $9 OR EXISTS (SELECT 1 FROM users WHERE id = $9 AND is_admin = true))`,
        [client_name, phone, client_type, city, sector, channel, notes, id, userId]
      );

      await client_db.query(
        `UPDATE deals SET deal_name = $1, expected_value = $2, payment_percentage = $3, stage = $4, last_contact_date = $5, next_followup_date = $6, ticket_link = $7, slack_code = $8 
         WHERE client_id = $9`,
        [deal_name, expected_value, payment_percentage, stage, last_contact_date, next_followup_date, ticket_link, slack_code, id]
      );

      await client_db.query(
        `UPDATE scores SET budget_score = $1, authority_score = $2, need_score = $3, timeline_score = $4, fit_score = $5 
         WHERE client_id = $6`,
        [budget_score, authority_score, need_score, timeline_score, fit_score, id]
      );

      await client_db.query('COMMIT');

      await logActivity(userId, 'update_client', `حدّث بيانات العميل: ${client_name}`, 'client', id);

      res.json({ message: 'تم تحديث البيانات بنجاح' });
    } catch (err) {
      await client_db.query('ROLLBACK');
      throw err;
    } finally {
      client_db.release();
    }
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العميل' });
  }
});


router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    if (!isAdmin) {
      const check = await db.query('SELECT user_id FROM clients WHERE id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await db.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف العميل' });
  }
});


router.patch('/:id/stage', async (req, res) => {
  const { stage } = req.body;
  const userId = req.user.id;
  const isAdmin = req.user.isAdmin;

  try {
    if (!isAdmin) {
      const check = await db.query('SELECT user_id FROM clients WHERE id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await db.query('UPDATE deals SET stage = $1 WHERE client_id = $2', [stage, req.params.id]);
    
    const clientInfo = await db.query('SELECT client_name FROM clients WHERE id = $1', [req.params.id]);
    await logActivity(userId, 'update_stage', `حدث مرحلة صفقة ${clientInfo.rows[0]?.client_name} إلى: ${stage}`, 'client', req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Patch stage error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث مرحلة الصفقة' });
  }
});

module.exports = router;
