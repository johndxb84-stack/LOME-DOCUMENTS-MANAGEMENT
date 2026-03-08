const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDb, initializeDb } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
initializeDb();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed`));
    }
  }
});

// ==================== API ROUTES ====================

// --- Products ---

// GET all products (with optional search)
app.get('/api/products', (req, res) => {
  const db = getDb();
  const { search, brand, category } = req.query;

  let sql = `SELECT p.*, COUNT(d.id) as document_count
             FROM products p
             LEFT JOIN documents d ON p.id = d.product_id`;
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`(p.formula_code LIKE ? OR p.barcode LIKE ? OR p.name LIKE ? OR p.brand LIKE ?)`);
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (brand) {
    conditions.push(`p.brand = ?`);
    params.push(brand);
  }
  if (category) {
    conditions.push(`p.category = ?`);
    params.push(category);
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  sql += ` GROUP BY p.id ORDER BY p.brand, p.name`;

  const products = db.prepare(sql).all(...params);
  db.close();
  res.json(products);
});

// GET single product with its documents
app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) {
    db.close();
    return res.status(404).json({ error: 'Product not found' });
  }

  const documents = db.prepare(`
    SELECT d.*, dt.name as document_type_name, dt.description as document_type_description
    FROM documents d
    JOIN document_types dt ON d.document_type_id = dt.id
    WHERE d.product_id = ?
    ORDER BY dt.name
  `).all(req.params.id);

  db.close();
  res.json({ ...product, documents });
});

// POST create product
app.post('/api/products', (req, res) => {
  const db = getDb();
  const { name, brand, formula_code, barcode, category, description } = req.body;

  if (!name || !brand || !formula_code || !barcode || !category) {
    db.close();
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = db.prepare(
      'INSERT INTO products (name, brand, formula_code, barcode, category, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(name, brand, formula_code, barcode, category, description || '');
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    db.close();
    res.status(201).json(product);
  } catch (err) {
    db.close();
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Product with this formula code or barcode already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  const db = getDb();
  // Delete associated document files
  const docs = db.prepare('SELECT filename FROM documents WHERE product_id = ?').all(req.params.id);
  for (const doc of docs) {
    const filePath = path.join(__dirname, 'uploads', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  db.close();
  res.json({ success: true });
});

// --- Documents ---

// GET document types
app.get('/api/document-types', (req, res) => {
  const db = getDb();
  const types = db.prepare('SELECT * FROM document_types ORDER BY name').all();
  db.close();
  res.json(types);
});

// POST upload document
app.post('/api/documents', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const db = getDb();
  const { product_id, document_type_id, title, expiry_date, version, country_scope } = req.body;

  if (!product_id || !document_type_id || !title) {
    // Remove uploaded file if validation fails
    fs.unlinkSync(req.file.path);
    db.close();
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO documents (product_id, document_type_id, title, filename, original_name, file_size, expiry_date, version, country_scope)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      product_id,
      document_type_id,
      title,
      req.file.filename,
      req.file.originalname,
      req.file.size,
      expiry_date || null,
      version || '1.0',
      country_scope || 'GCC & Levant'
    );

    const doc = db.prepare(`
      SELECT d.*, dt.name as document_type_name
      FROM documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.id = ?
    `).get(result.lastInsertRowid);

    db.close();
    res.status(201).json(doc);
  } catch (err) {
    db.close();
    res.status(500).json({ error: err.message });
  }
});

// GET download document
app.get('/api/documents/:id/download', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);

  if (!doc) {
    db.close();
    return res.status(404).json({ error: 'Document not found' });
  }

  // Log the download
  const distributor = req.query.distributor || 'Anonymous';
  db.prepare('INSERT INTO download_log (document_id, distributor_name) VALUES (?, ?)').run(doc.id, distributor);
  db.close();

  const filePath = path.join(__dirname, 'uploads', doc.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }

  res.download(filePath, doc.original_name);
});

// DELETE document
app.delete('/api/documents/:id', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (doc) {
    const filePath = path.join(__dirname, 'uploads', doc.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  }
  db.close();
  res.json({ success: true });
});

// --- Dashboard Stats ---
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const stats = {
    totalProducts: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
    totalDocuments: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
    totalDownloads: db.prepare('SELECT COUNT(*) as count FROM download_log').get().count,
    brands: db.prepare('SELECT DISTINCT brand FROM products ORDER BY brand').all().map(r => r.brand),
    categories: db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all().map(r => r.category),
    recentUploads: db.prepare(`
      SELECT d.title, d.upload_date, p.name as product_name, dt.name as document_type
      FROM documents d
      JOIN products p ON d.product_id = p.id
      JOIN document_types dt ON d.document_type_id = dt.id
      ORDER BY d.upload_date DESC LIMIT 5
    `).all(),
  };
  db.close();
  res.json(stats);
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🔬 LOME Documents Management System`);
  console.log(`  ====================================`);
  console.log(`  Server running at http://localhost:${PORT}`);
  console.log(`  Admin Portal:       http://localhost:${PORT}/#admin`);
  console.log(`  Distributor Portal: http://localhost:${PORT}/#distributor\n`);
});
