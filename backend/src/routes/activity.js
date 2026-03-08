const express = require('express');
const { getPool, sql } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/activity - Get activity log (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const { page = 1, limit = 50, action, user_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (action) {
      whereClause += ' AND a.action = @action';
      request.input('action', sql.NVarChar, action);
    }
    if (user_id) {
      whereClause += ' AND a.user_id = @user_id';
      request.input('user_id', sql.Int, user_id);
    }

    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(`
      SELECT a.*, u.full_name, u.email, u.company,
        p.product_name, p.formula_number
      FROM ActivityLog a
      LEFT JOIN Users u ON a.user_id = u.id
      LEFT JOIN Products p ON a.product_id = p.id
      ${whereClause}
      ORDER BY a.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get activity log error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/activity/stats - Dashboard statistics (admin only)
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();

    const stats = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Products) as total_products,
        (SELECT COUNT(*) FROM Documents) as total_documents,
        (SELECT COUNT(*) FROM Users WHERE role = 'distributor') as total_distributors,
        (SELECT COUNT(*) FROM Users WHERE role = 'admin') as total_admins,
        (SELECT ISNULL(SUM(download_count), 0) FROM Documents) as total_downloads,
        (SELECT COUNT(*) FROM Documents WHERE expiry_date IS NOT NULL AND expiry_date <= DATEADD(day, 30, GETUTCDATE()) AND expiry_date >= GETUTCDATE()) as expiring_documents
    `);

    const recentActivity = await pool.request().query(`
      SELECT TOP 10 a.*, u.full_name, p.product_name
      FROM ActivityLog a
      LEFT JOIN Users u ON a.user_id = u.id
      LEFT JOIN Products p ON a.product_id = p.id
      ORDER BY a.created_at DESC
    `);

    const topDownloaded = await pool.request().query(`
      SELECT TOP 5 p.product_name, p.formula_number, p.brand,
        SUM(d.download_count) as total_downloads
      FROM Products p
      JOIN Documents d ON d.product_id = p.id
      GROUP BY p.id, p.product_name, p.formula_number, p.brand
      ORDER BY total_downloads DESC
    `);

    res.json({
      ...stats.recordset[0],
      recentActivity: recentActivity.recordset,
      topDownloaded: topDownloaded.recordset,
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
