import React, { useState, useEffect } from 'react';
import { getActivityLog } from '../services/api';

function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadActivity();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadActivity = async () => {
    setLoading(true);
    try {
      const response = await getActivityLog({ page, limit: 50 });
      setActivities(response.data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading activity log...</div>;

  return (
    <div>
      <div className="page-header">
        <h2>Activity Log</h2>
        <p>Track all document uploads, downloads, and user actions</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Company</th>
                <th>Action</th>
                <th>Product</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.created_at).toLocaleString()}</td>
                  <td>
                    <strong>{a.full_name}</strong>
                    <br /><span style={{ fontSize: 12, color: '#9ca3af' }}>{a.email}</span>
                  </td>
                  <td>{a.company}</td>
                  <td>
                    <span className={`badge badge-${
                      a.action === 'DOWNLOAD' ? 'info' :
                      a.action === 'UPLOAD' ? 'success' :
                      a.action === 'DELETE' ? 'danger' : 'warning'
                    }`}>
                      {a.action}
                    </span>
                  </td>
                  <td>{a.product_name || '-'}<br /><span style={{ fontSize: 12, color: '#9ca3af' }}>{a.formula_number}</span></td>
                  <td style={{ fontSize: 13 }}>{a.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page}</span>
        <button disabled={activities.length < 50} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export default ActivityPage;
