const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input('email', sql.NVarChar, req.body.email)
        .query('SELECT * FROM Users WHERE email = @email AND is_active = 1');

      if (result.recordset.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const user = result.recordset[0];
      const validPassword = await bcrypt.compare(req.body.password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Update last login
      await pool
        .request()
        .input('id', sql.Int, user.id)
        .query('UPDATE Users SET last_login = GETUTCDATE() WHERE id = @id');

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          company: user.company,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
          company: user.company,
          country: user.country,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// POST /api/auth/register (admin only)
router.post(
  '/register',
  authenticate,
  authorize('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['admin', 'distributor']),
    body('company').notEmpty().trim(),
    body('country').notEmpty().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const pool = await getPool();
      const { email, password, full_name, role, company, country } = req.body;

      // Check if user exists
      const existing = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .query('SELECT id FROM Users WHERE email = @email');

      if (existing.recordset.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists.' });
      }

      const password_hash = await bcrypt.hash(password, 12);

      const result = await pool
        .request()
        .input('email', sql.NVarChar, email)
        .input('password_hash', sql.NVarChar, password_hash)
        .input('full_name', sql.NVarChar, full_name)
        .input('role', sql.NVarChar, role)
        .input('company', sql.NVarChar, company)
        .input('country', sql.NVarChar, country)
        .query(`
          INSERT INTO Users (email, password_hash, full_name, role, company, country)
          OUTPUT INSERTED.id, INSERTED.email, INSERTED.full_name, INSERTED.role, INSERTED.company, INSERTED.country
          VALUES (@email, @password_hash, @full_name, @role, @company, @country)
        `);

      res.status(201).json({ user: result.recordset[0] });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// GET /api/auth/users (admin only)
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      'SELECT id, email, full_name, role, company, country, is_active, created_at, last_login FROM Users ORDER BY created_at DESC'
    );
    res.json(result.recordset);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/auth/users/:id/status (admin only)
router.patch('/users/:id/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const { is_active } = req.body;
    await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('is_active', sql.Bit, is_active)
      .query('UPDATE Users SET is_active = @is_active WHERE id = @id');
    res.json({ message: 'User status updated.' });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT id, email, full_name, role, company, country FROM Users WHERE id = @id');
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
