import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { searchProducts, getProductFilters, createProduct } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

function ProductsPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [filters, setFilters] = useState({ brands: [], divisions: [], categories: [] });
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');
  const [division, setDivision] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (brand) params.brand = brand;
      if (division) params.division = division;

      const response = await searchProducts(params);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [search, brand, division, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    getProductFilters()
      .then((res) => setFilters(res.data))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadProducts();
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Product Catalogue</h2>
          <p>Search by product name, formula number, or barcode</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Product
          </button>
        )}
      </div>

      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search by product name, formula number, or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }}>
          <option value="">All Brands</option>
          {filters.brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={division} onChange={(e) => { setDivision(e.target.value); setPage(1); }}>
          <option value="">All Divisions</option>
          {filters.divisions.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <button type="submit" className="btn btn-gold">Search</button>
      </form>

      {loading ? (
        <div className="loading">Searching products...</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No products found</h3>
          <p>{search ? 'Try a different search term or filter' : 'No products have been added yet'}</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Formula #</th>
                    <th>Barcode</th>
                    <th>Brand</th>
                    <th>Division</th>
                    <th>Documents</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.product_name}</strong>{p.shade_name && <span style={{ color: '#9ca3af', fontSize: 12 }}> - {p.shade_name}</span>}</td>
                      <td><code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 13 }}>{p.formula_number}</code></td>
                      <td>{p.barcode || '-'}</td>
                      <td><span className="badge badge-gold">{p.brand}</span></td>
                      <td>{p.division}</td>
                      <td><strong>{p.document_count}</strong></td>
                      <td>
                        <Link to={`/products/${p.id}`} className="btn btn-sm btn-outline">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {pagination.totalPages} ({pagination.total} products)</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); loadProducts(); }}
        />
      )}
    </div>
  );
}

function AddProductModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    product_name: '', formula_number: '', barcode: '', ean_code: '',
    brand: '', division: '', category: '', shade_name: '', shade_code: '',
    pack_size: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProduct(form);
      toast.success('Product added successfully');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  const divisions = [
    "L'Oreal Luxe", 'Consumer Products', 'Professional Products',
    'Active Cosmetics', 'Dermatological Beauty',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add New Product</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product Name *</label>
            <input name="product_name" value={form.product_name} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Formula Number *</label>
              <input name="formula_number" value={form.formula_number} onChange={handleChange} required placeholder="e.g., F123456" />
            </div>
            <div className="form-group">
              <label>Barcode / EAN</label>
              <input name="barcode" value={form.barcode} onChange={handleChange} placeholder="e.g., 3600523..." />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Brand *</label>
              <input name="brand" value={form.brand} onChange={handleChange} required placeholder="e.g., L'Oreal Paris" />
            </div>
            <div className="form-group">
              <label>Division *</label>
              <select name="division" value={form.division} onChange={handleChange} required>
                <option value="">Select Division</option>
                {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <input name="category" value={form.category} onChange={handleChange} placeholder="e.g., Skincare, Haircare" />
            </div>
            <div className="form-group">
              <label>Pack Size</label>
              <input name="pack_size" value={form.pack_size} onChange={handleChange} placeholder="e.g., 50ml" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Shade Name</label>
              <input name="shade_name" value={form.shade_name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Shade Code</label>
              <input name="shade_code" value={form.shade_code} onChange={handleChange} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductsPage;
