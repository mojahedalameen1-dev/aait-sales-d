const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const supabase = require('../supabase');

const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '..', 'uploads');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create uploads directory:', err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Get files for a client
router.get('/:clientId', async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('client_id', req.params.clientId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file
router.post('/:clientId', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  try {
    const { data: file, error } = await supabase
      .from('files')
      .insert([{ 
        client_id: req.params.clientId, 
        file_name: req.file.originalname, 
        file_path: req.file.filename, 
        file_type_label: req.body.file_type_label || 'أخرى' 
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
router.get('/download/:fileId', async (req, res) => {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', req.params.fileId)
      .single();

    if (error || !file) return res.status(404).json({ error: 'الملف غير موجود' });
    const filePath = path.join(uploadsDir, file.file_path);
    res.download(filePath, file.file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const { data: file, error: fetchErr } = await supabase
      .from('files')
      .select('*')
      .eq('id', req.params.fileId)
      .single();

    if (fetchErr || !file) return res.status(404).json({ error: 'الملف غير موجود' });
    const filePath = path.join(uploadsDir, file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    const { error: delErr } = await supabase
      .from('files')
      .delete()
      .eq('id', req.params.fileId);

    if (delErr) throw delErr;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
