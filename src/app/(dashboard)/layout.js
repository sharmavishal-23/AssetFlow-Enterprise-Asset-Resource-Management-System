'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // 1. Theme handler
  useEffect(() => {
    const savedTheme = localStorage.getItem('assetflow_theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('assetflow_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // 2. Fetch current user session
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Error verifying auth:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  // 3. Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30 seconds
      const timer = setInterval(fetchNotifications, 30000);
      return () => clearInterval(timer);
    }
  }, [user]);

  const markAllNotificationsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        router.push('/login');
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--border-color)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ fontWeight: 500, fontSize: '14px' }}>Loading AssetFlow Workspace...</p>
        <style jsx global>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  // 4. Filter Sidebar items based on Roles
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Assets Inventory', path: '/assets', icon: '💻', roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Transfers & Returns', path: '/transfers', icon: '🔄', roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Bookings Calendar', path: '/bookings', icon: '📅', roles: ['Admin', 'Asset Manager', 'Department Head', 'Employee'] },
    { name: 'Maintenance', path: '/maintenance', icon: '🔧', roles: ['Admin', 'Asset Manager'] },
    { name: 'Audit Cycles', path: '/audits', icon: '📋', roles: ['Admin', 'Asset Manager'] },
    { name: 'Reports & Logs', path: '/reports', icon: '📈', roles: ['Admin', 'Asset Manager', 'Department Head'] },
    { name: 'Organization Setup', path: '/organization', icon: '🏢', roles: ['Admin'] }
  ].filter(item => item.roles.includes(user.role));

  // Determine page title based on pathname
  const activeMenuItem = menuItems.find(item => pathname.startsWith(item.path));
  const pageTitle = activeMenuItem ? activeMenuItem.name : 'AssetFlow Management';

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">AF</div>
            {!sidebarCollapsed && <span className="logo-text">AssetFlow</span>}
          </div>
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle Sidebar"
          >
            {sidebarCollapsed ? '➡️' : '⬅️'}
          </button>
        </div>

        <ul className="sidebar-menu">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link 
                  href={item.path} 
                  className={`sidebar-menu-item ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-menu-item-icon">{item.icon}</span>
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="sidebar-footer">
          <div className="user-avatar">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
          </div>
          {!sidebarCollapsed && (
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
          )}
        </div>
      </aside>

      {/* MAIN BODY CONTENT */}
      <div className="main-content">
        {/* HEADER NAVBAR */}
        <header className="navbar">
          <h2>{pageTitle}</h2>

          <div className="navbar-actions">
            {/* Theme Toggle Button */}
            <button 
              className="navbar-btn"
              onClick={toggleTheme}
              title="Toggle Light/Dark Theme"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }}>
              <button 
                className="navbar-btn"
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                title="Notifications"
                aria-label="View Notifications"
              >
                🔔
                {unreadCount > 0 && <span className="badge-dot" />}
              </button>

              <div className={`dropdown-menu ${showNotifications ? 'show' : ''}`} style={{ right: 0 }}>
                <div className="dropdown-header flex align-center justify-between">
                  <span>Notifications ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      onClick={markAllNotificationsRead}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No new alerts
                    </div>
                  ) : (
                    notifications.map(noti => (
                      <div 
                        key={noti.id} 
                        className="dropdown-item"
                        style={{ backgroundColor: noti.read ? 'transparent' : 'var(--primary-light)' }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{noti.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{noti.message}</div>
                        <div className="text-muted" style={{ marginTop: '4px' }}>
                          {new Date(noti.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <div 
                className="user-avatar" 
                style={{ cursor: 'pointer', width: '38px', height: '38px' }}
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
              >
                👤
              </div>

              <div className={`dropdown-menu ${showProfileMenu ? 'show' : ''}`} style={{ right: 0, width: '220px' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  <div className="badge badge-allocated" style={{ marginTop: '8px', display: 'inline-block' }}>{user.role}</div>
                </div>
                <button 
                  className="dropdown-item"
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', color: 'var(--danger)', fontWeight: 500 }}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main style={{ flexGrow: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
