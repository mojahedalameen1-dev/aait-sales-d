const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// Get all meeting preps
router.get('/', async (req, res) => {
  try {
    const { data: preps, error } = await supabase
      .from('meeting_preps')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(preps);
  } catch (error) {
    console.error('Error fetching meeting preps:', error);
    res.status(500).json({ error: 'Failed to fetch meeting preps' });
  }
});

// Get single meeting prep
router.get('/:id', async (req, res) => {
  try {
    const { data: prep, error } = await supabase
      .from('meeting_preps')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Meeting prep not found' });
      throw error;
    }
    res.json(prep);
  } catch (error) {
    console.error('Error fetching meeting prep:', error);
    res.status(500).json({ error: 'Failed to fetch meeting prep' });
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

    const { data: result, error } = await supabase
      .from('meeting_preps')
      .insert([{ title, client_name, sector, meeting_date, status, idea_raw, tags }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ id: result.id });
  } catch (error) {
    console.error('Error creating meeting prep:', error);
    res.status(500).json({ error: 'Failed to create meeting prep' });
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
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (client_name !== undefined) updateData.client_name = client_name;
    if (sector !== undefined) updateData.sector = sector;
    if (meeting_date !== undefined) updateData.meeting_date = meeting_date;
    if (status !== undefined) updateData.status = status;
    if (idea_raw !== undefined) updateData.idea_raw = idea_raw;
    if (analysis_result !== undefined) updateData.analysis_result = analysis_result;
    if (tags !== undefined) updateData.tags = tags;

    if (Object.keys(updateData).length === 0) {
       return res.json({ success: true, message: 'No changes provided' });
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('meeting_preps')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating meeting prep:', error);
    res.status(500).json({ error: 'Failed to update meeting prep' });
  }
});

// Delete meeting prep
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('meeting_preps').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meeting prep:', error);
    res.status(500).json({ error: 'Failed to delete meeting prep' });
  }
});

module.exports = router;
