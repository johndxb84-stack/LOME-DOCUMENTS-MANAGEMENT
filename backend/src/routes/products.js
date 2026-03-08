const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { getPool, sql } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/products - Search products (all authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const { search, brand, division, category, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const request = pool.request();

    if (search) {
      whereClause += ' AND (p.product_name LIKE @search OR p.formula_number LIKE @search OR p.barcode LIKE @search OR p.ean_code LIKE @search)';
      request.input('search', sql.NVarChar, `%${search}%`);
    }
    if (brand) {
      whereClause += ' AND p.brand = @brand';
      request.input('brand', sql.NVarChar, brand);
    }
    if (division) {
      whereClause += ' AND p.division = @division';
      request.input('division', sql.NVarChar, division);
    }
    if (category) {
      whereClause += ' AND p.category = @category';
      request.input('category', sql.NVarChar, category);
    }

    request.input('offset', sql.Int, parseInt(offset));
    request.input('limit', sql.Int, parseInt(limit));

    const countResult = await request.query(
      `SELECT COUNT(*) as total FROM Products p ${whereClause}`
    );

    const request2 = pool.request();
    if (search) request2.input('search', sql.NVarChar, `%${search}%`);
    if (brand) request2.input('brand', sql.NVarChar, brand);
    if (division) request2.input('division', sql.NVarChar, division);
    if (category) request2.input('category', sql.NVarChar, category);
    request2.input('offset', sql.Int, parseInt(offset));
    request2.input('limit', sql.Int, parseInt(limit));

    const result = await request2.query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM Documents d WHERE d.product_id = p.id) as document_count
      FROM Products p
      ${whereClause}
      ORDER BY p.product_name ASC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      products: result.recordset,
      pagination: {
        total: countResult.recordset[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.recordset[0].total / limit),
      },
    });
  } catch (err) {
    console.error('Search products error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/products/filters - Get filter options
router.get('/filters', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const brands = await pool.request().query('SELECT DISTINCT brand FROM Products WHERE brand IS NOT NULL ORDER BY brand');
    const divisions = await pool.request().query('SELECT DISTINCT division FROM Products WHERE division IS NOT NULL ORDER BY division');
    const categories = await pool.request().query('SELECT DISTINCT category FROM Products WHERE category IS NOT NULL ORDER BY category');

    res.json({
      brands: brands.recordset.map((r) => r.brand),
      divisions: divisions.recordset.map((r) => r.division),
      categories: categories.recordset.map((r) => r.category),
    });
  } catch (err) {
    console.error('Get filters error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/products/:id - Get product details with documents
router.get('/:id', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const product = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Products WHERE id = @id');

    if (product.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const documents = await pool
      .request()
      .input('product_id', sql.Int, req.params.id)
      .query(`
        SELECT d.*, u.full_name as uploaded_by_name
        FROM Documents d
        LEFT JOIN Users u ON d.uploaded_by = u.id
        WHERE d.product_id = @product_id
        ORDER BY d.document_type, d.created_at DESC
      `);

    res.json({
      ...product.recordset[0],
      documents: documents.recordset,
    });
  } catch (err) {
    console.error('Get product error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/products - Create product (admin only)
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('product_name').notEmpty().trim(),
    body('formula_number').notEmpty().trim(),
    body('barcode').optional().trim(),
    body('ean_code').optional().trim(),
    body('brand').notEmpty().trim(),
    body('division').notEmpty().trim(),
    body('category').optional().trim(),
    body('shade_name').optional().trim(),
    body('shade_code').optional().trim(),
    body('pack_size').optional().trim(),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const pool = await getPool();
      const {
        product_name, formula_number, barcode, ean_code,
        brand, division, category, shade_name, shade_code,
        pack_size, description,
      } = req.body;

      const result = await pool
        .request()
        .input('product_name', sql.NVarChar, product_name)
        .input('formula_number', sql.NVarChar, formula_number)
        .input('barcode', sql.NVarChar, barcode || null)
        .input('ean_code', sql.NVarChar, ean_code || null)
        .input('brand', sql.NVarChar, brand)
        .input('division', sql.NVarChar, division)
        .input('category', sql.NVarChar, category || null)
        .input('shade_name', sql.NVarChar, shade_name || null)
        .input('shade_code', sql.NVarChar, shade_code || null)
        .input('pack_size', sql.NVarChar, pack_size || null)
        .input('description', sql.NVarChar, description || null)
        .input('created_by', sql.Int, req.user.id)
        .query(`
          INSERT INTO Products (product_name, formula_number, barcode, ean_code, brand, division, category, shade_name, shade_code, pack_size, description, created_by)
          OUTPUT INSERTED.*
          VALUES (@product_name, @formula_number, @barcode, @ean_code, @brand, @division, @category, @shade_name, @shade_code, @pack_size, @description, @created_by)
        `);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('Create product error:', err);
      if (err.number === 2627) {
        return res.status(409).json({ error: 'A product with this formula number already exists.' });
      }
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const {
      product_name, formula_number, barcode, ean_code,
      brand, division, category, shade_name, shade_code,
      pack_size, description,
    } = req.body;

    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('product_name', sql.NVarChar, product_name)
      .input('formula_number', sql.NVarChar, formula_number)
      .input('barcode', sql.NVarChar, barcode || null)
      .input('ean_code', sql.NVarChar, ean_code || null)
      .input('brand', sql.NVarChar, brand)
      .input('division', sql.NVarChar, division)
      .input('category', sql.NVarChar, category || null)
      .input('shade_name', sql.NVarChar, shade_name || null)
      .input('shade_code', sql.NVarChar, shade_code || null)
      .input('pack_size', sql.NVarChar, pack_size || null)
      .input('description', sql.NVarChar, description || null)
      .query(`
        UPDATE Products SET
          product_name = @product_name, formula_number = @formula_number,
          barcode = @barcode, ean_code = @ean_code, brand = @brand,
          division = @division, category = @category, shade_name = @shade_name,
          shade_code = @shade_code, pack_size = @pack_size, description = @description,
          updated_at = GETUTCDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/products/:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Products WHERE id = @id');
    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
