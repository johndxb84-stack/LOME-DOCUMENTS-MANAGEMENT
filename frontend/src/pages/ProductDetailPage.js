import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, uploadDocument, downloadDocument, deleteDocument, deleteProduct } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DOC_TYPE_LABELS = {
  CPSR: 'Cosmetic Product Safety Report',
  COA: 'Certificate of Analysis',
  MSDS: 'Material Safety Data Sheet',
  CFS: 'Certificate of Free Sale',
  GMP: 'GMP Certificate',
  INGREDIENT_LIST: 'Ingredient List (INCI)',
  PRODUCT_SPECIFICATION: 'Product Specification',
  STABILITY_DATA: 'Stability Study Data',
  MICRO_TEST: 'Microbiological Test',
  HEAVY_METALS: 'Heavy Metals Report',
  ALLERGEN_DECLARATION: 'Allergen Declaration',
  LABEL_ARTWORK: 'Label / Artwork',
  REGISTRATION_CERT: 'Registration Certificate',
  HALAL_CERT: 'Halal Certificate',
  AUTHORIZATION_LETTER: 'Authorization Letter',
  PRODUCT_IMAGE: 'Product Image',
  OTHER: 'Other Document',
};

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadProduct();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProduct = async () => {
    try {
      const response = await getProduct(id);
      setProduct(response.data);
    } catch (err) {
      console.error('Failed to load product:', err);
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    setDownloading(doc.id);
    try {
      const response = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded: ${doc.file_name}`);
    } catch (err) {
      toast.error('Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.file_name}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(doc.id);
      toast.success('Document deleted');
      loadProduct();
    } catch (err) {
      toast.error('Failed to delete document');
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm(`Delete "${product.product_name}" and all its documents? This cannot be undone.`)) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      navigate('/products');
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading) return <div className="loading">Loading product details...</div>;
  if (!product) return null;

  // Group documents by type
  const groupedDocs = {};
  (product.documents || []).forEach((doc) => {
    if (!groupedDocs[doc.document_type]) groupedDocs[doc.document_type] = [];
    groupedDocs[doc.document_type].push(doc);
  });

  return (
    <div>
      <div className="product-header">
        <div>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/products')} style={{ marginBottom: 12 }}>
            &larr; Back to Products
          </button>
          <h2>{product.product_name}</h2>
          {product.shade_name && <p style={{ color: '#6b7280' }}>{product.shade_name} ({product.shade_code})</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                + Upload Document
              </button>
              <button className="btn btn-danger" onClick={handleDeleteProduct}>Delete Product</button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Product Information</h3>
        <div className="product-info-grid">
          <div className="product-info-item">
            <label>Formula Number</label>
            <span>{product.formula_number}</span>
          </div>
          <div className="product-info-item">
            <label>Barcode</label>
            <span>{product.barcode || '-'}</span>
          </div>
          <div className="product-info-item">
            <label>EAN Code</label>
            <span>{product.ean_code || '-'}</span>
          </div>
          <div className="product-info-item">
            <label>Brand</label>
            <span>{product.brand}</span>
          </div>
          <div className="product-info-item">
            <label>Division</label>
            <span>{product.division}</span>
          </div>
          <div className="product-info-item">
            <label>Category</label>
            <span>{product.category || '-'}</span>
          </div>
          <div className="product-info-item">
            <label>Pack Size</label>
            <span>{product.pack_size || '-'}</span>
          </div>
        </div>
        {product.description && (
          <div>
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>Description</label>
            <p style={{ marginTop: 4 }}>{product.description}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Regulatory Documents ({product.documents?.length || 0})</h3>
        </div>

        {Object.keys(groupedDocs).length === 0 ? (
          <div className="empty-state">
            <h3>No documents uploaded yet</h3>
            <p>{isAdmin ? 'Click "Upload Document" to add regulatory documents for this product' : 'Documents will appear here once uploaded by the regulatory team'}</p>
          </div>
        ) : (
          Object.entries(groupedDocs).map(([type, docs]) => (
            <div key={type} style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 14, color: '#c9a96e', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {DOC_TYPE_LABELS[type] || type}
              </h4>
              <div className="doc-grid">
                {docs.map((doc) => (
                  <div className="doc-card" key={doc.id}>
                    <div className="doc-type">{type.replace(/_/g, ' ')}</div>
                    <div className="doc-name">{doc.file_name}</div>
                    <div className="doc-meta">
                      {formatFileSize(doc.file_size)}
                      {doc.expiry_date && (
                        <span>
                          {' | Expires: '}
                          <span style={{ color: new Date(doc.expiry_date) < new Date() ? '#ef4444' : 'inherit' }}>
                            {new Date(doc.expiry_date).toLocaleDateString()}
                          </span>
                        </span>
                      )}
                      {doc.country_specific && <span> | {doc.country_specific}</span>}
                      <br />
                      Downloads: {doc.download_count}
                      {doc.uploaded_by_name && <span> | By: {doc.uploaded_by_name}</span>}
                    </div>
                    <div className="doc-actions">
                      <button
                        className="btn btn-sm btn-gold"
                        onClick={() => handleDownload(doc)}
                        disabled={downloading === doc.id}
                      >
                        {downloading === doc.id ? 'Downloading...' : 'Download'}
                      </button>
                      {isAdmin && (
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteDoc(doc)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showUploadModal && (
        <UploadDocumentModal
          productId={id}
          onClose={() => setShowUploadModal(false)}
          onUploaded={() => { setShowUploadModal(false); loadProduct(); }}
        />
      )}
    </div>
  );
}

function UploadDocumentModal({ productId, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [description, setDescription] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [countrySpecific, setCountrySpecific] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('product_id', productId);
      formData.append('document_type', documentType);
      if (description) formData.append('description', description);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (countrySpecific) formData.append('country_specific', countrySpecific);

      await uploadDocument(formData);
      toast.success('Document uploaded successfully');
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const countries = ['UAE', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar', 'Oman', 'Jordan', 'Lebanon', 'Iraq', 'All GCC', 'All Levant', 'All Markets'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Upload Regulatory Document</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Document Type *</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} required>
              <option value="">Select document type</option>
              {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>File * (PDF, DOC, XLS, JPG, PNG, ZIP - max 50MB)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Expiry Date</label>
              <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Country / Market</label>
              <select value={countrySpecific} onChange={(e) => setCountrySpecific(e.target.value)}>
                <option value="">All Markets</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductDetailPage;
