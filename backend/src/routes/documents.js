const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/database');
const { uploadFile, downloadFile, deleteFile } = require('../config/storage');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// Document types relevant to GCC/Levant regulatory submissions
const VALID_DOCUMENT_TYPES = [
  'CPSR',                    // Cosmetic Product Safety Report
  'COA',                     // Certificate of Analysis
  'MSDS',                    // Material Safety Data Sheet / SDS
  'CFS',                     // Certificate of Free Sale
  'GMP',                     // Good Manufacturing Practice Certificate
  'INGREDIENT_LIST',         // Full Ingredient List / INCI
  'PRODUCT_SPECIFICATION',   // Product Specification Sheet
  'STABILITY_DATA',          // Stability Study Data
  'MICRO_TEST',              // Microbiological Test Report
  'HEAVY_METALS',            // Heavy Metals Test Report
  'ALLERGEN_DECLARATION',    // Allergen Declaration
  'LABEL_ARTWORK',           // Product Label / Artwork
  'REGISTRATION_CERT',       // Registration Certificate
  'HALAL_CERT',              // Halal Certificate
  'AUTHORIZATION_LETTER',    // Authorization Letter
  'PRODUCT_IMAGE',           // Product Image
  'OTHER',                   // Other regulatory document
];

// POST /api/documents/upload - Upload document for a product (admin only)
router.post(
  '/upload',
  authenticate,
  authorize('admin'),
  upload.single('file'),
  [
    body('product_id').isInt(),
    body('document_type').isIn(VALID_DOCUMENT_TYPES),
    body('description').optional().trim(),
    body('expiry_date').optional().isISO8601(),
    body('country_specific').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
      const pool = await getPool();
      const { product_id, document_type, description, expiry_date, country_specific } = req.body;

      // Verify product exists
      const productCheck = await pool
        .request()
        .input('id', sql.Int, product_id)
        .query('SELECT id FROM Products WHERE id = @id');

      if (productCheck.recordset.length === 0) {
        return res.status(404).json({ error: 'Product not found.' });
      }

      // Upload to Azure Blob Storage
      const fileExtension = req.file.originalname.split('.').pop();
      const blobName = `${product_id}/${document_type}/${uuidv4()}.${fileExtension}`;
      const blobUrl = await uploadFile(blobName, req.file.buffer, req.file.mimetype);

      // Save record to database
      const result = await pool
        .request()
        .input('product_id', sql.Int, product_id)
        .input('document_type', sql.NVarChar, document_type)
        .input('file_name', sql.NVarChar, req.file.originalname)
        .input('blob_name', sql.NVarChar, blobName)
        .input('blob_url', sql.NVarChar, blobUrl)
        .input('file_size', sql.Int, req.file.size)
        .input('content_type', sql.NVarChar, req.file.mimetype)
        .input('description', sql.NVarChar, description || null)
        .input('expiry_date', sql.Date, expiry_date || null)
        .input('country_specific', sql.NVarChar, country_specific || null)
        .input('uploaded_by', sql.Int, req.user.id)
        .query(`
          INSERT INTO Documents (product_id, document_type, file_name, blob_name, blob_url, file_size, content_type, description, expiry_date, country_specific, uploaded_by)
          OUTPUT INSERTED.*
          VALUES (@product_id, @document_type, @file_name, @blob_name, @blob_url, @file_size, @content_type, @description, @expiry_date, @country_specific, @uploaded_by)
        `);

      // Log the activity
      await pool
        .request()
        .input('user_id', sql.Int, req.user.id)
        .input('action', sql.NVarChar, 'UPLOAD')
        .input('doc_id', sql.Int, result.recordset[0].id)
        .input('p_id', sql.Int, product_id)
        .input('details', sql.NVarChar, `Uploaded ${document_type}: ${req.file.originalname}`)
        .query(`
          INSERT INTO ActivityLog (user_id, action, document_id, product_id, details)
          VALUES (@user_id, @action, @doc_id, @p_id, @details)
        `);

      res.status(201).json(result.recordset[0]);
    } catch (err) {
      console.error('Upload document error:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// GET /api/documents/download/:id - Download a document
router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const doc = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Documents WHERE id = @id');

    if (doc.recordset.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = doc.recordset[0];
    const downloadResponse = await downloadFile(document.blob_name);

    // Log download activity
    await pool
      .request()
      .input('user_id', sql.Int, req.user.id)
      .input('action', sql.NVarChar, 'DOWNLOAD')
      .input('doc_id', sql.Int, document.id)
      .input('p_id', sql.Int, document.product_id)
      .input('details', sql.NVarChar, `Downloaded ${document.document_type}: ${document.file_name}`)
      .query(`
        INSERT INTO ActivityLog (user_id, action, document_id, product_id, details)
        VALUES (@user_id, @action, @doc_id, @p_id, @details)
      `);

    // Update download count
    await pool
      .request()
      .input('id', sql.Int, document.id)
      .query('UPDATE Documents SET download_count = download_count + 1 WHERE id = @id');

    res.setHeader('Content-Type', document.content_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    downloadResponse.readableStreamBody.pipe(res);
  } catch (err) {
    console.error('Download document error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/documents/:id (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const doc = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM Documents WHERE id = @id');

    if (doc.recordset.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const document = doc.recordset[0];

    // Delete from blob storage
    await deleteFile(document.blob_name);

    // Delete from database
    await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Documents WHERE id = @id');

    // Log activity
    await pool
      .request()
      .input('user_id', sql.Int, req.user.id)
      .input('action', sql.NVarChar, 'DELETE')
      .input('p_id', sql.Int, document.product_id)
      .input('details', sql.NVarChar, `Deleted ${document.document_type}: ${document.file_name}`)
      .query(`
        INSERT INTO ActivityLog (user_id, action, document_id, product_id, details)
        VALUES (@user_id, @action, NULL, @p_id, @details)
      `);

    res.json({ message: 'Document deleted.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/documents/types - Get valid document types
router.get('/types', authenticate, (req, res) => {
  res.json(VALID_DOCUMENT_TYPES);
});

// GET /api/documents/expiring - Get documents expiring soon (admin)
router.get('/expiring', authenticate, authorize('admin'), async (req, res) => {
  try {
    const pool = await getPool();
    const days = parseInt(req.query.days) || 30;

    const result = await pool
      .request()
      .input('days', sql.Int, days)
      .query(`
        SELECT d.*, p.product_name, p.formula_number, p.brand
        FROM Documents d
        JOIN Products p ON d.product_id = p.id
        WHERE d.expiry_date IS NOT NULL
          AND d.expiry_date <= DATEADD(day, @days, GETUTCDATE())
          AND d.expiry_date >= GETUTCDATE()
        ORDER BY d.expiry_date ASC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error('Get expiring documents error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
