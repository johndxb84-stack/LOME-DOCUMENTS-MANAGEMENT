import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lome_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lome_token');
      localStorage.removeItem('lome_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const registerUser = (data) => api.post('/auth/register', data);
export const getUsers = () => api.get('/auth/users');
export const updateUserStatus = (id, is_active) => api.patch(`/auth/users/${id}/status`, { is_active });
export const getProfile = () => api.get('/auth/me');

// Products
export const searchProducts = (params) => api.get('/products', { params });
export const getProductFilters = () => api.get('/products/filters');
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Documents
export const uploadDocument = (formData) =>
  api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const downloadDocument = (id) =>
  api.get(`/documents/download/${id}`, { responseType: 'blob' });
export const deleteDocument = (id) => api.delete(`/documents/${id}`);
export const getDocumentTypes = () => api.get('/documents/types');
export const getExpiringDocuments = (days) => api.get('/documents/expiring', { params: { days } });

// Activity
export const getActivityLog = (params) => api.get('/activity', { params });
export const getDashboardStats = () => api.get('/activity/stats');

export default api;
