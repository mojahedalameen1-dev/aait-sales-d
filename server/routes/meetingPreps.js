const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');
const logActivity = require('../helpers/activityLogger');

// Apply auth to all routes
router.use(authenticateJWT);

// Get all meeting preps
router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const userId = req.user.id;

    let query = 'SELECT * FROM meeting_preps';
    let params = [];
    
    if (!isAdmin) {
      query += ' WHERE user_id = $1';
      params.push(userId);
    }
    
    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching meeting preps:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل التحضيرات' });
  }
});

// Get single meeting prep
router.get('/:id', async (req, res) => {
  try {
    const isAdmin = req.user.isAdmin;
    const userId = req.user.id;

    let query = 'SELECT * FROM meeting_preps WHERE id = $1';
    let params = [req.params.id];
    
    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await db.query(query, params);
    const prep = result.rows[0];

    if (!prep) return res.status(404).json({ error: 'Meeting prep not found' });
    res.json(prep);
  } catch (error) {
    console.error('Error fetching meeting prep:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل التحضير' });
  }
});

// Create new meeting prep
router.post('/', async (req, res) => {
  try {
    const { 
      title, 
      client_name = '', 
      sector = '', 
      meeting_date = '', 
      status = 'مسودة', 
      idea_raw = '', 
      tags = '' 
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const userId = req.user.id;

    const result = await db.query(
      `INSERT INTO meeting_preps (user_id, title, client_name, sector, meeting_date, status, idea_raw, tags) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userId, title, client_name, sector, meeting_date, status, idea_raw, tags]
    );

    // Log activity
    await logActivity(userId, 'add_prep', `أنشأ تحضير اجتماع جديد: ${title}`, 'meeting_prep', result.rows[0].id);

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating meeting prep:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء التحضير' });
  }
});

// Update meeting prep
router.put('/:id', async (req, res) => {
  try {
    const { 
      title, 
      client_name, 
      sector, 
      meeting_date, 
      status, 
      idea_raw, 
      analysis_result,
      tags 
    } = req.body;
    
    const id = req.params.id;
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Verify ownership
    if (!isAdmin) {
      const check = await db.query('SELECT user_id FROM meeting_preps WHERE id = $1', [id]);
      if (!check.rows[0] || check.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await db.query(
      `UPDATE meeting_preps SET 
        title=COALESCE($1, title), 
        client_name=COALESCE($2, client_name), 
        sector=COALESCE($3, sector), 
        meeting_date=COALESCE($4, meeting_date), 
        status=COALESCE($5, status), 
        idea_raw=COALESCE($6, idea_raw), 
        analysis_result=COALESCE($7, analysis_result), 
        tags=COALESCE($8, tags),
        updated_at=NOW()
       WHERE id = $9`,
      [title, client_name, sector, meeting_date, status, idea_raw, analysis_result, tags, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating meeting prep:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث التحضير' });
  }
});

// Delete meeting prep
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    if (!isAdmin) {
      const check = await db.query('SELECT user_id FROM meeting_preps WHERE id = $1', [req.params.id]);
      if (!check.rows[0] || check.rows[0].user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    await db.query('DELETE FROM meeting_preps WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting prep:', error);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف التحضير' });
  }
});

module.exports = router;
