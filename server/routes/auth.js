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


router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const envAdminUser = process.env.ADMIN_USER;
    const envAdminPass = process.env.ADMIN_PASS;

    if (!envAdminUser || !envAdminPass) {
      console.warn('WARNING: ADMIN_USER or ADMIN_PASS environment variables are not set. System Admin login is disabled.');
    }

    if (envAdminUser && envAdminPass && username === envAdminUser && password === envAdminPass) {
      const token = jwt.sign(
        { id: 9999, username: 'admin', isAdmin: true, isPrimaryAdmin: true, fullName: 'System Admin', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        token,
        user: { id: 0, username: envAdminUser, isAdmin: true, isPrimaryAdmin: true, fullName: 'System Admin', profileImageUrl: null }
      });
    }

    const result = await db.query('SELECT * FROM users WHERE username = $1 AND is_active = TRUE', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, isAdmin: user.is_admin, isPrimaryAdmin: user.is_primary_admin, fullName: user.full_name, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      
      await logActivity(user.id, 'login', 'سجل الدخول للنظام');

      res.json({
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          isAdmin: user.is_admin, 
          isPrimaryAdmin: user.is_primary_admin,
          fullName: user.full_name,
          profileImageUrl: user.profile_image_url,
          role: user.role
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


router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (userId === 0) {
      return res.json({ user: req.user });
    }

    const result = await db.query('SELECT id, username, full_name, is_admin, is_primary_admin, is_active, profile_image_url, role FROM users WHERE id = $1', [userId]);
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
        profileImageUrl: user.profile_image_url,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Get /me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.put('/profile', authenticateJWT, uploadMemory.single('profileImage'), async (req, res) => {
    const { fullName, removeImage } = req.body;
    const userId = req.user.id;
    
    if (userId === 0) return res.status(403).json({ error: 'حساب المشرف العام غير قابل للتعديل' });
  
    try {
    let profileImageUrl = undefined;
    let shouldUpdateImage = false;

    if (req.file) {
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
