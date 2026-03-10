const express = require('express');
const db = require('../database');
const router = express.Router();

// Get all meeting preps
router.get('/', (req, res) => {
  try {
    const preps = db.prepare('SELECT * FROM meeting_preps ORDER BY created_at DESC').all();
    res.json(preps);
  } catch (error) {
    console.error('Error fetching meeting preps:', error);
    res.status(500).json({ error: 'Failed to fetch meeting preps' });
  }
});

// Get single meeting prep
router.get('/:id', (req, res) => {
  try {
    const prep = db.prepare('SELECT * FROM meeting_preps WHERE id = ?').get(req.params.id);
    if (!prep) return res.status(404).json({ error: 'Meeting prep not found' });
    res.json(prep);
  } catch (error) {
    console.error('Error fetching meeting prep:', error);
    res.status(500).json({ error: 'Failed to fetch meeting prep' });
  }
});

// Create new meeting prep
router.post('/', (req, res) => {
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

    const result = db.prepare(`
      INSERT INTO meeting_preps 
      (title, client_name, sector, meeting_date, status, idea_raw, tags) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, client_name, sector, meeting_date, status, idea_raw, tags);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error creating meeting prep:', error);
    res.status(500).json({ error: 'Failed to create meeting prep' });
  }
});

// Update meeting prep
router.put('/:id', (req, res) => {
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

    // Build dynamic update query based on provided fields (for partial auto-saves)
    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (client_name !== undefined) { updates.push('client_name = ?'); values.push(client_name); }
    if (sector !== undefined) { updates.push('sector = ?'); values.push(sector); }
    if (meeting_date !== undefined) { updates.push('meeting_date = ?'); values.push(meeting_date); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (idea_raw !== undefined) { updates.push('idea_raw = ?'); values.push(idea_raw); }
    if (analysis_result !== undefined) { updates.push('analysis_result = ?'); values.push(typeof analysis_result === 'string' ? analysis_result : JSON.stringify(analysis_result)); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(tags); }

    if (updates.length === 0) {
       return res.json({ success: true, message: 'No changes provided' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE meeting_preps SET ${updates.join(', ')} WHERE id = ?`;
    
    db.prepare(query).run(...values);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating meeting prep:', error);
    res.status(500).json({ error: 'Failed to update meeting prep' });
  }
});

// Delete meeting prep
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM meeting_preps WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting prep:', error);
    res.status(500).json({ error: 'Failed to delete meeting prep' });
  }
});

module.exports = router;
