// ================================================
// LOME Documents Management - Frontend Application
// ================================================

let currentProductId = null;
let documentTypes = [];

// ---- Navigation ----
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  const targetPage = document.getElementById(`page-${page}`);
  if (targetPage) targetPage.classList.add('active');

  const navLink = document.querySelector(`.nav-links a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');

  window.location.hash = page;

  // Load data for the page
  if (page === 'landing') loadStats();
  if (page === 'admin') loadAdminProducts();
  if (page === 'distributor') loadDistributorProducts();
}

// ---- Initialize ----
window.addEventListener('DOMContentLoaded', () => {
  loadDocumentTypes();
  loadFilters();

  const hash = window.location.hash.replace('#', '') || 'landing';
  navigate(hash);
});

// ---- API helpers ----
async function api(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

// ---- Stats ----
async function loadStats() {
  try {
    const stats = await api('/api/stats');
    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-documents').textContent = stats.totalDocuments;
    document.getElementById('stat-downloads').textContent = stats.totalDownloads;
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

// ---- Filters ----
async function loadFilters() {
  try {
    const stats = await api('/api/stats');
    const brandSelects = ['admin-brand-filter', 'dist-brand-filter'];
    const categorySelects = ['admin-category-filter', 'dist-category-filter'];

    brandSelects.forEach(id => {
      const sel = document.getElementById(id);
      stats.brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        sel.appendChild(opt);
      });
    });

    categorySelects.forEach(id => {
      const sel = document.getElementById(id);
      stats.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        sel.appendChild(opt);
      });
    });
  } catch (e) {
    console.error('Failed to load filters:', e);
  }
}

// ---- Document Types ----
async function loadDocumentTypes() {
  try {
    documentTypes = await api('/api/document-types');
  } catch (e) {
    console.error('Failed to load document types:', e);
  }
}

// ---- Admin: Products List ----
async function loadAdminProducts() {
  const search = document.getElementById('admin-search').value;
  const brand = document.getElementById('admin-brand-filter').value;
  const category = document.getElementById('admin-category-filter').value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (brand) params.set('brand', brand);
  if (category) params.set('category', category);

  try {
    const products = await api(`/api/products?${params}`);
    const grid = document.getElementById('admin-products-grid');

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon">&#128230;</div>
          <p>No products found</p>
          <p style="font-size:0.85rem">Try a different search or add a new product</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="openAdminDetail(${p.id})">
        <div class="product-brand">${escapeHtml(p.brand)}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-meta">
          <div class="meta-row"><span class="meta-label">Formula:</span> ${escapeHtml(p.formula_code)}</div>
          <div class="meta-row"><span class="meta-label">Barcode:</span> ${p.barcode}</div>
        </div>
        <div class="doc-count">
          <span class="category-badge ${p.category.toLowerCase()}">${p.category}</span>
          <span class="doc-badge ${p.document_count === 0 ? 'empty' : ''}">${p.document_count} doc${p.document_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    showToast('Failed to load products', 'error');
  }
}

// ---- Admin: Product Detail ----
async function openAdminDetail(id) {
  try {
    const product = await api(`/api/products/${id}`);
    currentProductId = id;

    document.getElementById('detail-brand').textContent = product.brand;
    document.getElementById('detail-name').textContent = product.name;
    document.getElementById('detail-formula').textContent = product.formula_code;
    document.getElementById('detail-barcode').textContent = product.barcode;
    document.getElementById('detail-category').textContent = product.category;
    document.getElementById('detail-description').textContent = product.description || '';

    renderAdminDocuments(product.documents);
    navigate('admin-detail');
  } catch (e) {
    showToast('Failed to load product details', 'error');
  }
}

function renderAdminDocuments(documents) {
  const container = document.getElementById('detail-documents');

  if (!documents || documents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128196;</div>
        <p>No documents uploaded yet</p>
        <p style="font-size:0.85rem">Upload regulatory documents for this product</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="documents-table">
      <thead>
        <tr>
          <th>Document Type</th>
          <th>Title</th>
          <th>Version</th>
          <th>Scope</th>
          <th>Uploaded</th>
          <th>Expiry</th>
          <th>Size</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map(d => `
          <tr>
            <td><strong>${escapeHtml(d.document_type_name)}</strong></td>
            <td>${escapeHtml(d.title)}</td>
            <td>${d.version}</td>
            <td>${escapeHtml(d.country_scope)}</td>
            <td>${formatDate(d.upload_date)}</td>
            <td>${formatDate(d.expiry_date)}</td>
            <td class="file-size">${formatFileSize(d.file_size)}</td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="deleteDocument(${d.id})" title="Delete">&#128465;</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ---- Admin: Add Product ----
async function submitProduct(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  try {
    await api('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    showToast('Product added successfully!');
    form.reset();
    closeModal('product-modal');
    loadAdminProducts();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- Admin: Upload Document ----
function openUploadModal() {
  document.getElementById('upload-product-id').value = currentProductId;
  const select = document.getElementById('upload-doc-type');
  select.innerHTML = documentTypes.map(dt =>
    `<option value="${dt.id}">${escapeHtml(dt.name)}</option>`
  ).join('');
  openModal('upload-modal');
}

async function submitDocument(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const res = await fetch('/api/documents', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    showToast('Document uploaded successfully!');
    form.reset();
    closeModal('upload-modal');
    openAdminDetail(currentProductId);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ---- Admin: Delete Document ----
async function deleteDocument(id) {
  if (!confirm('Are you sure you want to delete this document?')) return;
  try {
    await api(`/api/documents/${id}`, { method: 'DELETE' });
    showToast('Document deleted');
    openAdminDetail(currentProductId);
  } catch (e) {
    showToast('Failed to delete document', 'error');
  }
}

// ---- Distributor: Products List ----
async function loadDistributorProducts() {
  const search = document.getElementById('dist-search').value;
  const brand = document.getElementById('dist-brand-filter').value;
  const category = document.getElementById('dist-category-filter').value;

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (brand) params.set('brand', brand);
  if (category) params.set('category', category);

  try {
    const products = await api(`/api/products?${params}`);
    const grid = document.getElementById('dist-products-grid');

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <div class="empty-icon">&#128269;</div>
          <p>No products found</p>
          <p style="font-size:0.85rem">Try searching by formula code or barcode</p>
        </div>`;
      return;
    }

    grid.innerHTML = products.map(p => `
      <div class="product-card" onclick="openDistDetail(${p.id})">
        <div class="product-brand">${escapeHtml(p.brand)}</div>
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-meta">
          <div class="meta-row"><span class="meta-label">Formula:</span> ${escapeHtml(p.formula_code)}</div>
          <div class="meta-row"><span class="meta-label">Barcode:</span> ${p.barcode}</div>
        </div>
        <div class="doc-count">
          <span class="category-badge ${p.category.toLowerCase()}">${p.category}</span>
          <span class="doc-badge ${p.document_count === 0 ? 'empty' : ''}">${p.document_count} doc${p.document_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `).join('');
  } catch (e) {
    showToast('Failed to load products', 'error');
  }
}

// ---- Distributor: Product Detail ----
async function openDistDetail(id) {
  try {
    const product = await api(`/api/products/${id}`);

    document.getElementById('dist-detail-brand').textContent = product.brand;
    document.getElementById('dist-detail-name').textContent = product.name;
    document.getElementById('dist-detail-formula').textContent = product.formula_code;
    document.getElementById('dist-detail-barcode').textContent = product.barcode;
    document.getElementById('dist-detail-category').textContent = product.category;
    document.getElementById('dist-detail-description').textContent = product.description || '';

    renderDistDocuments(product.documents);
    navigate('dist-detail');
  } catch (e) {
    showToast('Failed to load product details', 'error');
  }
}

function renderDistDocuments(documents) {
  const container = document.getElementById('dist-detail-documents');

  if (!documents || documents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">&#128196;</div>
        <p>No documents available yet</p>
        <p style="font-size:0.85rem">Documents for this product have not been uploaded yet. Please contact the regulatory team.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <table class="documents-table">
      <thead>
        <tr>
          <th>Document Type</th>
          <th>Title</th>
          <th>Version</th>
          <th>Scope</th>
          <th>Uploaded</th>
          <th>Expiry</th>
          <th>Size</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map(d => `
          <tr>
            <td><strong>${escapeHtml(d.document_type_name)}</strong></td>
            <td>${escapeHtml(d.title)}</td>
            <td>${d.version}</td>
            <td>${escapeHtml(d.country_scope)}</td>
            <td>${formatDate(d.upload_date)}</td>
            <td>${formatDate(d.expiry_date)}</td>
            <td class="file-size">${formatFileSize(d.file_size)}</td>
            <td>
              <a href="/api/documents/${d.id}/download" class="btn btn-download btn-sm">&#11015; Download</a>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;
}

// ---- Modals ----
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// ---- Utility ----
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
