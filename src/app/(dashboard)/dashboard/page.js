'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentTransfers, setRecentTransfers] = useState([]);
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Quick Action Modal states
  const [quickAction, setQuickAction] = useState(null); // 'transfer' | 'booking' | 'maintenance' | 'asset'
  const [assetsList, setAssetsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);

  // Form states
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Transfer form state
  const [transferAssetId, setTransferAssetId] = useState('');
  const [transferUserId, setTransferUserId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Booking form state
  const [bookingAssetId, setBookingAssetId] = useState('');
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');

  // Maintenance form state
  const [maintAssetId, setMaintAssetId] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintTech, setMaintTech] = useState('');
  const [maintCost, setMaintCost] = useState('0.00');

  // Asset form state
  const [assetName, setAssetName] = useState('');
  const [assetCatId, setAssetCatId] = useState('');
  const [assetDeptId, setAssetDeptId] = useState('');
  const [assetCond, setAssetCond] = useState('Good');

  // Fetch Dashboard Stats and Lists
  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch User Session
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      // Fetch reports
      const repRes = await fetch('/api/reports');
      if (repRes.ok) {
        const repData = await repRes.json();
        setStats(repData.data.summary);
      }

      // Fetch recent transfers
      const trRes = await fetch('/api/transfers');
      if (trRes.ok) {
        const trData = await trRes.json();
        // Get top 4 transfers
        setRecentTransfers(trData.transfers.slice(-4).reverse());
      }

      // Fetch bookings
      const bkRes = await fetch('/api/bookings');
      if (bkRes.ok) {
        const bkData = await bkRes.json();
        // Filter confirmed upcoming bookings
        const now = new Date();
        const upcoming = bkData.bookings
          .filter(b => b.status === 'Confirmed' && new Date(b.endTime) >= now)
          .slice(0, 4);
        setUpcomingBookings(upcoming);
      }
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Pre-load assets, users and categories for quick action dropdowns
  const fetchDropdownData = async () => {
    try {
      const astRes = await fetch('/api/assets');
      if (astRes.ok) {
        const data = await astRes.json();
        setAssetsList(data.assets || []);
      }
      const usrRes = await fetch('/api/users');
      if (usrRes.ok) {
        const data = await usrRes.json();
        setUsersList(data.users || []);
      }
      const catRes = await fetch('/api/categories');
      if (catRes.ok) {
        const data = await catRes.json();
        setCategoriesList(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching dropdown helper data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (quickAction) {
      fetchDropdownData();
      setFormError('');
      setFormSuccess('');
    }
  }, [quickAction]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    let endpoint = '';
    let bodyData = {};

    if (quickAction === 'transfer') {
      endpoint = '/api/transfers';
      bodyData = { assetId: transferAssetId, toUserId: transferUserId, notes: transferNotes };
    } else if (quickAction === 'booking') {
      endpoint = '/api/bookings';
      bodyData = { assetId: bookingAssetId, title: bookingTitle, startTime: bookingStart, endTime: bookingEnd };
    } else if (quickAction === 'maintenance') {
      endpoint = '/api/maintenance';
      bodyData = { assetId: maintAssetId, description: maintDesc, technicianName: maintTech, cost: maintCost };
    } else if (quickAction === 'asset') {
      endpoint = '/api/assets';
      bodyData = { name: assetName, categoryId: assetCatId, departmentId: assetDeptId, condition: assetCond };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await res.json();

      if (res.ok) {
        setFormSuccess('Action completed successfully!');
        // Refresh dashboard metrics
        fetchData();
        // Reset forms
        setTimeout(() => {
          setQuickAction(null);
        }, 1200);
      } else {
        setFormError(data.error || 'Request failed. Please verify details.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading metrics dashboard...</div>;
  }

  // Fallback default statistics
  const dashboardStats = stats || {
    totalAssets: 4,
    allocatedAssets: 1,
    utilizationRate: 25,
    underMaintenance: 1,
    lost: 0
  };

  return (
    <div className="page-container">
      <div className="flex justify-between align-center">
        <div>
          <h1>Welcome Back, {currentUser?.name}</h1>
          <p>Here is the status of your enterprise asset network today.</p>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          📅 {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="kpi-grid">
        <div className="card kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Total Asset Pool</span>
            <span className="kpi-value">{dashboardStats.totalAssets}</span>
            <span className="text-muted">Active items registered</span>
          </div>
          <div className="kpi-icon-container primary">💻</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Allocation & Utilization</span>
            <span className="kpi-value">{dashboardStats.utilizationRate}%</span>
            <span className="kpi-trend up">
              <span>{dashboardStats.allocatedAssets} / {dashboardStats.totalAssets} allocated</span>
            </span>
          </div>
          <div className="kpi-icon-container success">🔄</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Under Servicing</span>
            <span className="kpi-value">{dashboardStats.underMaintenance}</span>
            <span className="text-muted">In maintenance pipeline</span>
          </div>
          <div className="kpi-icon-container warning">🔧</div>
        </div>

        <div className="card kpi-card">
          <div className="kpi-details">
            <span className="kpi-label">Lost or Damaged</span>
            <span className="kpi-value">{dashboardStats.lost}</span>
            <span className="text-muted">Flagged for replacement</span>
          </div>
          <div className="kpi-icon-container danger">⚠️</div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="card">
        <h3 style={{ marginBottom: '14px' }}>Quick Operations</h3>
        <div className="flex" style={{ gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setQuickAction('transfer')}>
            🔄 Request Transfer
          </button>
          <button className="btn btn-secondary" onClick={() => setQuickAction('booking')}>
            📅 Book a Resource
          </button>
          {['Admin', 'Asset Manager'].includes(currentUser?.role) && (
            <>
              <button className="btn btn-secondary" onClick={() => setQuickAction('maintenance')}>
                🔧 Schedule Maintenance
              </button>
              <button className="btn btn-primary" onClick={() => setQuickAction('asset')}>
                ➕ Add New Asset
              </button>
            </>
          )}
        </div>
      </div>

      {/* TWO COLUMN GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* UPCOMING BOOKINGS */}
        <div className="card">
          <div className="card-title">
            <span>Upcoming Booking Schedules</span>
            <Link href="/bookings" style={{ fontSize: '13px', color: 'var(--primary)' }}>View Calendar</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No upcoming resource bookings scheduled.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '12px' }}>
              {upcomingBookings.map(bk => {
                const ast = assetsList.find(a => a.id === bk.assetId) || { tag: 'AST', name: 'Asset' };
                return (
                  <div key={bk.id} style={{ display: 'flex', alignItem: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{bk.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Asset: <strong>{ast.name}</strong> ({ast.tag})
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '12px' }}>
                      <div style={{ fontWeight: 500 }}>{new Date(bk.startTime).toLocaleDateString()}</div>
                      <div className="text-muted" style={{ marginTop: '2px' }}>
                        {new Date(bk.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(bk.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RECENT TRANSFERS / ACTIVITIES */}
        <div className="card">
          <div className="card-title">
            <span>Allocation & Transfer Log</span>
            <Link href="/transfers" style={{ fontSize: '13px', color: 'var(--primary)' }}>View Approvals</Link>
          </div>
          {recentTransfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              No recent asset movements logged.
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: '12px' }}>
              {recentTransfers.map(tr => {
                const ast = assetsList.find(a => a.id === tr.assetId) || { tag: 'AST', name: 'Asset' };
                const userTo = usersList.find(u => u.id === tr.toUserId)?.name || 'Someone';
                return (
                  <div key={tr.id} style={{ display: 'flex', alignItem: 'center', justifyContent: 'space-between', padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                      <span style={{ fontSize: '13px' }}>
                        Transfer request for <strong>{ast.name}</strong> to <strong>{userTo}</strong>
                      </span>
                      <div className="text-muted" style={{ marginTop: '4px' }}>
                        {new Date(tr.createdAt).toLocaleDateString()} at {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${tr.status === 'Approved' ? 'badge-available' : tr.status === 'Pending' ? 'badge-reserved' : 'badge-lost'}`}>
                        {tr.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTION MODALS */}
      {quickAction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>
                {quickAction === 'transfer' && '🔄 New Transfer Request'}
                {quickAction === 'booking' && '📅 Book a Resource'}
                {quickAction === 'maintenance' && '🔧 Request Asset Maintenance'}
                {quickAction === 'asset' && '➕ Add New Asset'}
              </h2>
              <button className="modal-close" onClick={() => setQuickAction(null)}>×</button>
            </div>
            
            <form onSubmit={handleActionSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ⚠️ {formError}
                  </div>
                )}
                {formSuccess && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--success-light)', color: 'var(--success-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ✓ {formSuccess}
                  </div>
                )}

                {/* TRANSFER VIEW */}
                {quickAction === 'transfer' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="transfer-asset-select">Asset to Transfer</label>
                      <select id="transfer-asset-select" className="form-control" value={transferAssetId} onChange={e => setTransferAssetId(e.target.value)} required>
                        <option value="">-- Choose Asset --</option>
                        {assetsList.filter(a => !['Retired', 'Disposed'].includes(a.status)).map(a => (
                          <option key={a.id} value={a.id}>{a.name} [{a.tag}] ({a.status})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="transfer-recipient-select">Transfer To Employee</label>
                      <select id="transfer-recipient-select" className="form-control" value={transferUserId} onChange={e => setTransferUserId(e.target.value)} required>
                        <option value="">-- Choose Recipient --</option>
                        {usersList.map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="transfer-reason-notes">Justification Notes</label>
                      <textarea id="transfer-reason-notes" className="form-control" rows={3} value={transferNotes} onChange={e => setTransferNotes(e.target.value)} placeholder="Reason for allocation request..." />
                    </div>
                  </>
                )}

                {/* BOOKING VIEW */}
                {quickAction === 'booking' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="booking-asset-select">Resource / Asset</label>
                      <select id="booking-asset-select" className="form-control" value={bookingAssetId} onChange={e => setBookingAssetId(e.target.value)} required>
                        <option value="">-- Choose Asset --</option>
                        {assetsList.filter(a => ['Available', 'Reserved', 'Allocated'].includes(a.status)).map(a => (
                          <option key={a.id} value={a.id}>{a.name} [{a.tag}]</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="booking-title-input">Booking Purpose</label>
                      <input id="booking-title-input" type="text" className="form-control" placeholder="Project Demo, Internal Audit, etc." value={bookingTitle} onChange={e => setBookingTitle(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="booking-start-time">Start Time</label>
                        <input id="booking-start-time" type="datetime-local" className="form-control" value={bookingStart} onChange={e => setBookingStart(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="booking-end-time">End Time</label>
                        <input id="booking-end-time" type="datetime-local" className="form-control" value={bookingEnd} onChange={e => setBookingEnd(e.target.value)} required />
                      </div>
                    </div>
                  </>
                )}

                {/* MAINTENANCE VIEW */}
                {quickAction === 'maintenance' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="maintenance-asset-select">Asset needing Maintenance</label>
                      <select id="maintenance-asset-select" className="form-control" value={maintAssetId} onChange={e => setMaintAssetId(e.target.value)} required>
                        <option value="">-- Choose Asset --</option>
                        {assetsList.map(a => (
                          <option key={a.id} value={a.id}>{a.name} [{a.tag}] ({a.status})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="maintenance-issue-desc">Issue Description</label>
                      <textarea id="maintenance-issue-desc" className="form-control" rows={3} placeholder="Describe the error, physical damage or scheduled tune up details..." value={maintDesc} onChange={e => setMaintDesc(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="maintenance-technician">Technician / Vendor</label>
                        <input id="maintenance-technician" type="text" className="form-control" placeholder="Bob Repairman" value={maintTech} onChange={e => setMaintTech(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="maintenance-cost">Estimated Cost ($)</label>
                        <input id="maintenance-cost" type="number" step="0.01" className="form-control" value={maintCost} onChange={e => setMaintCost(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                {/* ADD ASSET VIEW */}
                {quickAction === 'asset' && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-asset-name">Asset Name</label>
                      <input id="new-asset-name" type="text" className="form-control" placeholder="Dell Latitude 5440" value={assetName} onChange={e => setAssetName(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" htmlFor="new-asset-category">Category</label>
                        <select id="new-asset-category" className="form-control" value={assetCatId} onChange={e => setAssetCatId(e.target.value)} required>
                          <option value="">-- Choose Category --</option>
                          {categoriesList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="new-asset-department">Default Location / Dept</label>
                        <select id="new-asset-department" className="form-control" value={assetDeptId} onChange={e => setAssetDeptId(e.target.value)} required>
                          <option value="">-- Choose Department --</option>
                          {/* Reuse seeded department IDs */}
                          <option value="1">IT Infrastructure</option>
                          <option value="2">Human Resources</option>
                          <option value="3">Operations & Facilities</option>
                          <option value="4">IT Helpdesk</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="new-asset-condition">Condition State</label>
                      <select id="new-asset-condition" className="form-control" value={assetCond} onChange={e => setAssetCond(e.target.value)}>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setQuickAction(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Submit Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
