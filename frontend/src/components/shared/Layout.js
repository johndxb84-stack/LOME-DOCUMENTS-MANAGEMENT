import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>LOME DOCS</h1>
          <p>Regulatory Document Portal</p>
        </div>
        <nav className="sidebar-nav">
          {isAdmin && (
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              <span className="nav-icon">&#9632;</span> Dashboard
            </NavLink>
          )}
          <NavLink to="/products" className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="nav-icon">&#9733;</span> Products
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">&#9679;</span> Users
              </NavLink>
              <NavLink to="/activity" className={({ isActive }) => isActive ? 'active' : ''}>
                <span className="nav-icon">&#9776;</span> Activity Log
              </NavLink>
            </>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="user-name">{user?.full_name}</div>
          <div className="user-role">{user?.role} | {user?.company}</div>
          <button onClick={logout}>Sign Out</button>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
