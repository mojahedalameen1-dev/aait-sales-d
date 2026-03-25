const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

// Apply admin protection to all routes
router.use(authenticateJWT);
router.use(requireAdmin);

// Get global stats for admin
router.get('/stats', async (req, res) => {
  try {
    const clientsResult = await db.query('SELECT COUNT(*) as total FROM clients');
    const revenueResult = await db.query("SELECT SUM(expected_value) as revenue FROM deals WHERE stage = 'فاز'");
    const activeDealsResult = await db.query("SELECT COUNT(*) as total FROM deals WHERE stage NOT IN ('فاز', 'خسر')");
    
    // Best developer of the current month
    const bestDevResult = await db.query(`
      SELECT u.full_name, SUM(d.expected_value) as monthly_sales
      FROM users u
      JOIN deals d ON u.id = d.user_id
      WHERE d.stage = 'فاز' 
      AND d.created_at >= date_trunc('month', CURRENT_DATE)
      GROUP BY u.id, u.full_name
      ORDER BY monthly_sales DESC
      LIMIT 1
    `);

    res.json({
      totalClients: parseInt(clientsResult.rows[0].total),
      totalRevenue: parseFloat(revenueResult.rows[0].revenue || 0),
      activeDeals: parseInt(activeDealsResult.rows[0].total),
      bestDeveloper: bestDevResult.rows[0]?.full_name || 'لا يوجد'
    });
  } catch (err) {
    console.error('Fetch global stats error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل الإحصائيات' });
  }
});

// Get all developers
router.get('/developers', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id, u.username, u.full_name as "fullName", u.is_active, u.created_at, u.last_login_at,
        u.is_admin, u.is_primary_admin, u.slack_user_id,
        COUNT(DISTINCT c.id) as client_count,
        COUNT(DISTINCT d.id) as deal_count,
        SUM(COALESCE(d.expected_value, 0)) as total_sales
      FROM users u
      LEFT JOIN clients c ON u.id = c.user_id
      LEFT JOIN deals d ON u.id = d.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    const rows = result.rows.map(row => ({
      ...row,
      role: row.role || (row.is_admin ? 'admin' : 'developer')
    }));
    res.json(rows);
  } catch (err) {
    console.error('Fetch developers error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات المطورين' });
  }
});

// Create new user account
router.post('/developers', async (req, res) => {
  const { fullName, username, password, role, slackUserId } = req.body;

  if (!fullName || !username || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  try {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    const isAdmin = role === 'admin';

    const result = await db.query(
      'INSERT INTO users (full_name, username, password_hash, is_admin, slack_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name as "fullName", username, is_admin, is_active, created_at, is_primary_admin, slack_user_id',
      [fullName, username, passwordHash, isAdmin, slackUserId || null]
    );

    const newUser = {
      ...result.rows[0],
      role: role || (result.rows[0].is_admin ? 'admin' : 'developer')
    };

    res.json({
      success: true,
      user: newUser
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    console.error('Create developer error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الحساب' });
  }
});

// Update user account
router.patch('/developers/:id', async (req, res) => {
  const { fullName, username, role, slackUserId } = req.body;
  const userId = req.params.id;

  try {
    // Only Primary Admin can modify other Admins
    const targetUser = await db.query('SELECT is_admin, is_primary_admin FROM users WHERE id = $1', [userId]);
    if (!targetUser.rows[0]) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    if (targetUser.rows[0].is_admin && !req.user.isPrimaryAdmin && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: 'فقط المدير الرئيسي يملك صلاحية تعديل حسابات المديرين' });
    }

    const isAdmin = role === 'admin';
    
    const result = await db.query(
      `UPDATE users 
       SET full_name = $1, username = $2, is_admin = $3, slack_user_id = $4 
       WHERE id = $5 
       RETURNING id, full_name as "fullName", username, is_admin, is_active, is_primary_admin, slack_user_id`,
      [fullName, username, isAdmin, slackUserId || null, userId]
    );

    const updatedUser = {
      ...result.rows[0],
      role: role || (result.rows[0].is_admin ? 'admin' : 'developer')
    };

    res.json({
      success: true,
      user: updatedUser
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'اسم المستخدم موجود بالفعل' });
    }
    console.error('Update developer error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث الحساب' });
  }
});

// Toggle active status
router.patch('/developers/:id/toggle-active', async (req, res) => {
  try {
    // Prevent self-modification
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك تعطيل حسابك الخاص' });
    }

    // Only Primary Admin can toggle other Admins
    const targetUser = await db.query('SELECT is_admin, is_primary_admin FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows[0]?.is_admin && !req.user.isPrimaryAdmin) {
      return res.status(403).json({ error: 'فقط المدير الرئيسي يملك صلاحية تعطيل حسابات المديرين' });
    }

    const result = await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle active error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة الحساب' });
  }
});

// Delete account
router.delete('/developers/:id', async (req, res) => {
  try {
    // Prevent self-deletion
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(403).json({ error: 'لا يمكنك حذف حسابك الخاص' });
    }

    // Only Primary Admin can delete other Admins
    const targetUser = await db.query('SELECT is_admin, is_primary_admin FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows[0]?.is_admin && !req.user.isPrimaryAdmin) {
      return res.status(403).json({ error: 'فقط المدير الرئيسي يملك صلاحية حذف حسابات المديرين' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete developer error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء حذف الحساب' });
  }
});

// Get developer details (activity + stats)
router.get('/developers/:id', async (req, res) => {
  try {
    const devId = req.params.id;

    // Stats
    const statsResult = await db.query(`
      SELECT 
        u.*,
        (SELECT COUNT(*) FROM clients WHERE user_id = u.id) as client_count,
        (SELECT COUNT(*) FROM deals WHERE user_id = u.id) as deal_count,
        (SELECT COALESCE(SUM(expected_value), 0) FROM deals WHERE user_id = u.id AND stage = 'فاز') as total_sales,
        CASE 
          WHEN (SELECT COUNT(*) FROM deals WHERE user_id = u.id) > 0 
          THEN ROUND((SELECT COUNT(*)::FLOAT FROM deals WHERE user_id = u.id AND stage = 'فاز') / 
                (SELECT COUNT(*) FROM deals WHERE user_id = u.id) * 100)
          ELSE 0 
        END as conversion_rate
      FROM users u
      WHERE u.id = $1
    `, [devId]);

    const developer = statsResult.rows[0];
    if (!developer) return res.status(404).json({ error: 'المطور غير موجود' });

    // Activity Logs
    const logsResult = await db.query(
      'SELECT * FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [devId]
    );

    // Clients with deal counts
    const clientsResult = await db.query(`
      SELECT 
        c.*, 
        (SELECT COALESCE(SUM(expected_value), 0) FROM deals WHERE client_id = c.id) as deals_value,
        (SELECT COUNT(*) FROM deals WHERE client_id = c.id) as deals_count,
        (SELECT stage FROM deals WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1) as latest_stage
      FROM clients c
      WHERE c.user_id = $1
      ORDER BY c.created_at DESC
    `, [devId]);

    // Deals
    const dealsResult = await db.query(
      'SELECT * FROM deals WHERE user_id = $1 ORDER BY created_at DESC',
      [devId]
    );

    // Proposals
    const proposalsResult = await db.query(`
      SELECT p.*, c.client_name
      FROM proposals p
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC
    `, [devId]);

    // Meeting Preparations
    const prepsResult = await db.query(`
      SELECT mp.*, c.client_name
      FROM meeting_preps mp
      LEFT JOIN clients c ON mp.client_id = c.id
      WHERE mp.user_id = $1
      ORDER BY mp.created_at DESC
    `, [devId]);

    res.json({
      developer,
      activityLogs: logsResult.rows,
      clients: clientsResult.rows,
      deals: dealsResult.rows,
      proposals: proposalsResult.rows,
      meetingPreps: prepsResult.rows
    });
  } catch (err) {
    console.error('Fetch developer details error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل تفاصيل المطور' });
  }
});

// Reset password
router.patch('/developers/:id/reset-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'كلمة المرور الجديدة مطلوبة' });

  try {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إعادة تعيين كلمة المرور' });
  }
});

// Get global activity feed for overview
router.get('/activities', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT l.*, u.full_name as "userFullName", u.username
      FROM activity_logs l
      JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch global activities error:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء تحميل سجل النشاطات' });
  }
});

module.exports = router;
