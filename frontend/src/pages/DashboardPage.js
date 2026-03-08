import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats } from '../services/api';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of the Regulatory Documents Management System</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats?.total_products || 0}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_documents || 0}</div>
          <div className="stat-label">Total Documents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_distributors || 0}</div>
          <div className="stat-label">Distributors</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.total_downloads || 0}</div>
          <div className="stat-label">Total Downloads</div>
        </div>
        {stats?.expiring_documents > 0 && (
          <div className="stat-card" style={{ borderLeftColor: '#ef4444' }}>
            <div className="stat-value" style={{ color: '#ef4444' }}>{stats.expiring_documents}</div>
            <div className="stat-label">Documents Expiring (30 days)</div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Link to="/activity" className="btn btn-sm btn-outline">View All</Link>
          </div>
          {stats?.recentActivity?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Product</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td>{a.full_name}</td>
                    <td><span className={`badge badge-${a.action === 'DOWNLOAD' ? 'info' : a.action === 'UPLOAD' ? 'success' : 'warning'}`}>{a.action}</span></td>
                    <td>{a.product_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p>No recent activity</p></div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Most Downloaded Products</h3>
          </div>
          {stats?.topDownloaded?.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {stats.topDownloaded.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product_name}</td>
                    <td>{p.brand}</td>
                    <td><strong>{p.total_downloads}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><p>No download data yet</p></div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
