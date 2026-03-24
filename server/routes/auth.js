const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authenticateJWT } = require('../middleware/auth');
const logActivity = require('../helpers/activityLogger');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const isVercel = process.env.VERCEL === '1';
const uploadsDir = isVercel 
  ? path.join('/tmp', 'uploads', 'profiles') 
  : path.join(__dirname, '..', 'uploads', 'profiles');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to create profiles upload directory:', err.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Check if it's the environment admin
    const envAdminUser = process.env.ADMIN_USER || 'admin';
    const envAdminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === envAdminUser && password === envAdminPass) {
      const token = jwt.sign(
        { id: 0, username: envAdminUser, isAdmin: true, isPrimaryAdmin: true, fullName: 'System Admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      // Update last login (if we want to track system admin, but id 0 doesn't exist in users table)
      // For system admin, we might just skip table update or handle it differently
      
      return res.json({
        token,
        user: { id: 0, username: envAdminUser, isAdmin: true, isPrimaryAdmin: true, fullName: 'System Admin', profileImageUrl: null }
      });
    }

    // Check database users
    const result = await db.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, isAdmin: user.is_admin, isPrimaryAdmin: user.is_primary_admin, fullName: user.full_name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Update last login
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      
      // Log activity
      await logActivity(user.id, 'login', 'سجل الدخول للنظام');

      res.json({
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          isAdmin: user.is_admin, 
          isPrimaryAdmin: user.is_primary_admin,
          fullName: user.full_name,
          profileImageUrl: user.profile_image_url 
        }
      });
    } else {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

// Get current user
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // System Admin (Environment Admin) check
    if (userId === 0) {
      return res.json({ user: req.user });
    }

    const result = await db.query('SELECT id, username, full_name, is_admin, is_primary_admin, is_active, profile_image_url FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        isAdmin: user.is_admin,
        isPrimaryAdmin: user.is_primary_admin,
        fullName: user.full_name,
        profileImageUrl: user.profile_image_url
      }
    });
  } catch (err) {
    console.error('Get /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticateJWT, uploadMemory.single('profileImage'), async (req, res) => {
    const { fullName, removeImage } = req.body;
    const userId = req.user.id;
    
    if (userId === 0) return res.status(403).json({ error: 'حساب المشرف العام غير قابل للتعديل' });
  
    try {
    let profileImageUrl = undefined; // Use undefined to indicate no change by default
    let shouldUpdateImage = false;

    if (req.file) {
      // Process with sharp and convert to Base64 for persistent storage in DB (Better for Vercel)
      const buffer = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 70 })
        .toBuffer();
        
      const base64 = buffer.toString('base64');
      profileImageUrl = `data:image/webp;base64,${base64}`;
      shouldUpdateImage = true;
    } else if (removeImage === 'true' || removeImage === true) {
      profileImageUrl = null;
      shouldUpdateImage = true;
    }

    let query = 'UPDATE users SET full_name = $1';
    let params = [fullName];
    
    if (shouldUpdateImage) {
      query += ', profile_image_url = $2 WHERE id = $3 RETURNING *';
      params.push(profileImageUrl, userId);
    } else {
      query += ' WHERE id = $2 RETURNING *';
      params.push(userId);
    }
  
      const result = await db.query(query, params);
      const user = result.rows[0];
  
      res.json({
        message: 'تم تحديث الملف الشخصي بنجاح',
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.is_admin,
          isPrimaryAdmin: user.is_primary_admin,
          fullName: user.full_name,
          profileImageUrl: user.profile_image_url
        }
      });

    await logActivity(userId, 'update_profile', 'قام بتحديث بيانات الملف الشخصي');
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الملف الشخصي' });
  }
});

// Change password
router.put('/change-password', authenticateJWT, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (userId === 0) return res.status(403).json({ error: 'حساب المشرف العام غير قابل للتعديل' });

  try {
    const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    if (!user || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(400).json({ error: 'كلمة المرور القديمة غير صحيحة' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
    await logActivity(userId, 'change_password', 'قام بتغيير كلمة المرور');
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تغيير كلمة المرور' });
  }
});

module.exports = router;
