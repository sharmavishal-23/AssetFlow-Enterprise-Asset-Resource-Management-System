'use client';

import { useState, useEffect } from 'react';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Return modal state
  const [returnAsset, setReturnAsset] = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNote, setReturnNote] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trRes, astRes, usrRes, depRes, meRes] = await Promise.all([
        fetch('/api/transfers'),
        fetch('/api/assets'),
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/auth/me')
      ]);

      if (trRes.ok) setTransfers((await trRes.json()).transfers || []);
      if (astRes.ok) setAssets((await astRes.json()).assets || []);
      if (usrRes.ok) setUsers((await usrRes.json()).users || []);
      if (depRes.ok) setDepartments((await depRes.json()).departments || []);
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    } catch (err) {
      console.error('Error fetching transfer workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessTransfer = async (transferId, status, approvalNote = '') => {
    try {
      const res = await fetch('/api/transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transferId, status, approvalNote })
      });
      if (res.ok) {
        loadData();
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to update transfer state.');
      }
    } catch (err) {
      console.error('Error processing transfer:', err);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    setReturnLoading(true);

    try {
      // Find the transfer ID that corresponds to this active allocation
      // In a real system, we'd query the database. Here, we find the active transfer that allocated it, or simulate it.
      const activeTransfer = transfers.find(t => t.assetId === returnAsset.id && t.status === 'Approved');
      
      const res = await fetch('/api/transfers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeTransfer ? activeTransfer.id : 1, // fallback
          status: 'Returned',
          returnCondition,
          approvalNote: returnNote
        })
      });

      if (res.ok) {
        setReturnAsset(null);
        setReturnNote('');
        loadData();
      } else {
        // If no direct matching transfer is found or fails, fallback to forcing update on the asset status directly
        const fallbackRes = await fetch('/api/assets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: returnAsset.id,
            allocatedToUserId: null,
            status: 'Available',
            condition: returnCondition
          })
        });
        if (fallbackRes.ok) {
          setReturnAsset(null);
          setReturnNote('');
          loadData();
        } else {
          alert('Failed to process asset check-in return.');
        }
      }
    } catch (err) {
      console.error('Error checking in asset:', err);
    } finally {
      setReturnLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading transfer queues...</div>;
  }

  // Segment transfers
  const pendingRequests = transfers.filter(t => t.status === 'Pending');
  const completedTransfers = transfers.filter(t => ['Approved', 'Rejected', 'Returned'].includes(t.status));
  const activeAllocatedAssets = assets.filter(a => a.status === 'Allocated');

  // Overdue check logic (Highlighting items pending for more than 48 hours)
  const isOverdue = (dateString) => {
    const elapsed = Date.now() - new Date(dateString).getTime();
    return elapsed > 172800000; // 48 Hours in MS
  };

  return (
    <div className="page-container">
      
      {/* 1. PENDING TRANSFERS APPROVAL ENGINE */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Pending Transfer & Allocation Requests</h3>
        {pendingRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No pending allocation requests require attention.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Requested Date</th>
                  <th>Asset</th>
                  <th>Current Holder</th>
                  <th>Proposed Recipient</th>
                  <th>Department</th>
                  <th>Notes</th>
                  <th>SLA Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map(tr => {
                  const assetObj = assets.find(a => a.id === tr.assetId) || { tag: 'AST', name: 'Asset' };
                  const userFrom = users.find(u => u.id === tr.fromUserId)?.name || 'Central Stock';
                  const userTo = users.find(u => u.id === tr.toUserId)?.name || 'N/A';
                  const dept = departments.find(d => d.id === tr.departmentId)?.name || 'N/A';
                  const requestOverdue = isOverdue(tr.createdAt);

                  return (
                    <tr key={tr.id} style={{ backgroundColor: requestOverdue ? 'var(--danger-light)' : 'transparent' }}>
                      <td>{new Date(tr.createdAt).toLocaleDateString()}</td>
                      <td>
                        <strong>{assetObj.name}</strong>
                        <div className="text-muted">{assetObj.tag}</div>
                      </td>
                      <td>{userFrom}</td>
                      <td>{userTo}</td>
                      <td>{dept}</td>
                      <td><span style={{ fontSize: '12px' }}>{tr.notes || '—'}</span></td>
                      <td>
                        {requestOverdue ? (
                          <span className="badge badge-lost" style={{ fontSize: '9px' }}>⚠️ Overdue (48h+)</span>
                        ) : (
                          <span className="badge badge-available" style={{ fontSize: '9px' }}>Within SLA</span>
                        )}
                      </td>
                      <td>
                        <div className="flex" style={{ gap: '8px' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleProcessTransfer(tr.id, 'Approved')}
                          >
                            ✓ Approve
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleProcessTransfer(tr.id, 'Rejected')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. ACTIVE SYSTEM ALLOCATIONS (For returns) */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Active Assignments (Checked-Out Inventory)</h3>
        {activeAllocatedAssets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No assets are currently checked out.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Name</th>
                  <th>Assigned Holder</th>
                  <th>Department Location</th>
                  <th>Current Condition</th>
                  <th>Checkout Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeAllocatedAssets.map(asset => {
                  const holder = users.find(u => u.id === asset.allocatedToUserId)?.name || 'Unknown';
                  const dept = departments.find(d => d.id === asset.departmentId)?.name || 'N/A';
                  
                  return (
                    <tr key={asset.id}>
                      <td><strong>{asset.tag}</strong></td>
                      <td>{asset.name}</td>
                      <td>👤 {holder}</td>
                      <td>🏢 {dept}</td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          backgroundColor: asset.condition === 'Excellent' ? 'var(--success-light)' : asset.condition === 'Good' ? 'var(--primary-light)' : 'var(--warning-light)',
                          color: asset.condition === 'Excellent' ? 'var(--success-text)' : asset.condition === 'Good' ? 'var(--primary)' : 'var(--warning-text)'
                        }}>
                          {asset.condition}
                        </span>
                      </td>
                      <td>{new Date(asset.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => setReturnAsset(asset)}
                        >
                          🔄 Process Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. TRANSACTION HISTORY LEDGER */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Transfer & Return History Ledger</h3>
        {completedTransfers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No completed history items.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Log Date</th>
                  <th>Asset</th>
                  <th>From User</th>
                  <th>To User</th>
                  <th>Final State</th>
                  <th>Return Notes</th>
                </tr>
              </thead>
              <tbody>
                {completedTransfers.map(tr => {
                  const assetObj = assets.find(a => a.id === tr.assetId) || { tag: 'AST', name: 'Asset' };
                  const userFrom = users.find(u => u.id === tr.fromUserId)?.name || 'Central Stock';
                  const userTo = users.find(u => u.id === tr.toUserId)?.name || 'N/A';
                  
                  return (
                    <tr key={tr.id}>
                      <td>{new Date(tr.updatedAt || tr.createdAt).toLocaleDateString()}</td>
                      <td><strong>{assetObj.name}</strong> <span style={{ fontSize: '11px' }}>({assetObj.tag})</span></td>
                      <td>{userFrom}</td>
                      <td>{userTo}</td>
                      <td>
                        <span className={`badge ${tr.status === 'Approved' ? 'badge-available' : tr.status === 'Returned' ? 'badge-allocated' : 'badge-lost'}`}>
                          {tr.status}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px' }}>
                          {tr.status === 'Returned' ? `Condition: ${tr.returnCondition || 'Good'} (${tr.approvalNote || 'No notes'})` : tr.approvalNote || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RETURN PROCESSING CHECK-IN MODAL */}
      {returnAsset && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🔄 Process Asset Return (Check-In)</h2>
              <button className="modal-close" onClick={() => setReturnAsset(null)}>×</button>
            </div>
            
            <form onSubmit={handleReturnSubmit}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px' }}>
                  You are checking in <strong>{returnAsset.name}</strong> ({returnAsset.tag}) back into the available stock pool. Please record its return condition below.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="return-condition-select">Return Condition State</label>
                  <select 
                    id="return-condition-select"
                    className="form-control" 
                    value={returnCondition} 
                    onChange={e => setReturnCondition(e.target.value)}
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor (Needs repair)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="return-notes-input">Condition Notes / Return Comments</label>
                  <textarea 
                    id="return-notes-input"
                    className="form-control" 
                    rows={3} 
                    placeholder="Provide details about return state, missing items, or damage warnings..." 
                    value={returnNote} 
                    onChange={e => setReturnNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReturnAsset(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={returnLoading}>
                  {returnLoading ? 'Checking in...' : 'Complete Return Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
