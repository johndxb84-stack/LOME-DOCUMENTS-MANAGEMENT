import React, { useState, useEffect } from 'react';
import { getUsers, registerUser, updateUserStatus } from '../services/api';
import { toast } from 'react-toastify';

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user) => {
    const newStatus = !user.is_active;
    const action = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user "${user.full_name}"?`)) return;

    try {
      await updateUserStatus(user.id, newStatus);
      toast.success(`User ${action}d`);
      loadUsers();
    } catch (err) {
      toast.error(`Failed to ${action} user`);
    }
  };

  if (loading) return <div className="loading">Loading users...</div>;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>User Management</h2>
          <p>Manage admin and distributor accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add User</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Company</th>
                <th>Country</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-gold'}`}>{u.role}</span></td>
                  <td>{u.company}</td>
                  <td>{u.country}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                  <td>
                    <button
                      className={`btn btn-sm ${u.is_active ? 'btn-outline' : 'btn-gold'}`}
                      onClick={() => toggleUserStatus(u)}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); loadUsers(); }}
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    email: '', password: '', full_name: '', role: 'distributor', company: '', country: '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await registerUser(form);
      toast.success('User created successfully');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const countries = ['UAE', 'Saudi Arabia', 'Kuwait', 'Bahrain', 'Qatar', 'Oman', 'Jordan', 'Lebanon', 'Iraq', 'Egypt'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add New User</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name *</label>
            <input name="full_name" value={form.full_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password * (min 8 characters)</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Role *</label>
              <select name="role" value={form.role} onChange={handleChange} required>
                <option value="distributor">Distributor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Country *</label>
              <select name="country" value={form.country} onChange={handleChange} required>
                <option value="">Select Country</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Company *</label>
            <input name="company" value={form.company} onChange={handleChange} required placeholder="Company name" />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UsersPage;
