const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateJWT);

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
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Verify client access
    const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [req.params.clientId]);
    if (!clientCheck.rows[0] || (!isAdmin && clientCheck.rows[0].user_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'SELECT * FROM files WHERE client_id = $1 ORDER BY uploaded_at DESC',
      [req.params.clientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch files error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل ملفات العميل' });
  }
});

// Upload file
router.post('/:clientId', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    // Verify client access
    const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [req.params.clientId]);
    if (!clientCheck.rows[0] || (!isAdmin && clientCheck.rows[0].user_id !== userId)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      'INSERT INTO files (client_id, file_name, file_path, file_type_label) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.clientId, req.file.originalname, req.file.filename, req.body.file_type_label || 'أخرى']
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء رفع الملف' });
  }
});

// Download file
router.get('/download/:fileId', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const result = await db.query('SELECT * FROM files WHERE id = $1', [req.params.fileId]);
    const file = result.rows[0];

    if (!file) return res.status(404).json({ error: 'الملف غير موجود' });

    // Verify client access
    const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [file.client_id]);
    if (!clientCheck.rows[0] || (!isAdmin && clientCheck.rows[0].user_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadsDir, file.file_path);
    res.download(filePath, file.file_name);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل الملف' });
  }
});

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.isAdmin;

    const result = await db.query('SELECT * FROM files WHERE id = $1', [req.params.fileId]);
    const file = result.rows[0];

    if (!file) return res.status(404).json({ error: 'الملف غير موجود' });

    // Verify client access
    const clientCheck = await db.query('SELECT user_id FROM clients WHERE id = $1', [file.client_id]);
    if (!clientCheck.rows[0] || (!isAdmin && clientCheck.rows[0].user_id !== userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.join(uploadsDir, file.file_path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    await db.query('DELETE FROM files WHERE id = $1', [req.params.fileId]);

    res.json({ success: true });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الملف' });
  }
});

module.exports = router;
