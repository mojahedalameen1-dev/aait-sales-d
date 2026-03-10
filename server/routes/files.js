const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Get files for a client
router.get('/:clientId', (req, res) => {
  try {
    const files = db.prepare('SELECT * FROM files WHERE client_id=? ORDER BY uploaded_at DESC').all(req.params.clientId);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file
router.post('/:clientId', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  try {
    const result = db.prepare(`
      INSERT INTO files (client_id, file_name, file_path, file_type_label)
      VALUES (?, ?, ?, ?)
    `).run(req.params.clientId, req.file.originalname, req.file.filename, req.body.file_type_label || 'أخرى');
    const file = db.prepare('SELECT * FROM files WHERE id=?').get(result.lastInsertRowid);
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download file
router.get('/download/:fileId', (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id=?').get(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'الملف غير موجود' });
    const filePath = path.join(uploadsDir, file.file_path);
    res.download(filePath, file.file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file
router.delete('/:fileId', (req, res) => {
  try {
    const file = db.prepare('SELECT * FROM files WHERE id=?').get(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'الملف غير موجود' });
    const filePath = path.join(uploadsDir, file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM files WHERE id=?').run(req.params.fileId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
