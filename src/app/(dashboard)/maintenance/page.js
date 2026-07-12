'use client';

import { useState, useEffect } from 'react';

export default function MaintenancePage() {
  const [maintenance, setMaintenance] = useState([]);
  const [assets, setAssets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal / form states for editing / starting maintenance
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form states
  const [technicianName, setTechnicianName] = useState('');
  const [cost, setCost] = useState('0.00');
  const [status, setStatus] = useState('Requested');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mtRes, astRes, meRes] = await Promise.all([
        fetch('/api/maintenance'),
        fetch('/api/assets'),
        fetch('/api/auth/me')
      ]);

      if (mtRes.ok) setMaintenance((await mtRes.json()).maintenance || []);
      if (astRes.ok) setAssets((await astRes.json()).assets || []);
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    } catch (err) {
      console.error('Error fetching maintenance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateRecord = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const res = await fetch('/api/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRecord.id,
          status,
          technicianName,
          cost: parseFloat(cost),
          startDate: startDate || null,
          endDate: endDate || null,
          description
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        setSelectedRecord(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update maintenance details.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDirectTransition = async (recordId, targetStatus) => {
    try {
      const res = await fetch('/api/maintenance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, status: targetStatus })
      });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to change maintenance status.');
      }
    } catch (err) {
      console.error('Transition error:', err);
    }
  };

  const openEditModal = (rec) => {
    setSelectedRecord(rec);
    setTechnicianName(rec.technicianName || 'Unassigned');
    setCost(rec.cost?.toString() || '0.00');
    setStatus(rec.status);
    setStartDate(rec.startDate || new Date().toISOString().split('T')[0]);
    setEndDate(rec.endDate || '');
    setDescription(rec.description);
    setShowEditModal(true);
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading maintenance logs...</div>;
  }

  // Filter lists by status
  const requestedRequests = maintenance.filter(m => m.status === 'Requested');
  const inProgressRequests = maintenance.filter(m => m.status === 'In Progress');
  const archivedRecords = maintenance.filter(m => ['Completed', 'Cancelled'].includes(m.status));

  return (
    <div className="page-container">
      
      {/* 1. MAINTENANCE REQUESTS */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Outstanding Service Requests</h3>
        {requestedRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No pending maintenance requests.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Request Date</th>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Problem Description</th>
                  <th>Proposed Tech</th>
                  <th>Cost Estimate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requestedRequests.map(rec => {
                  const assetObj = assets.find(a => a.id === rec.assetId) || { tag: 'AST', name: 'Asset' };
                  return (
                    <tr key={rec.id}>
                      <td>{new Date(rec.createdAt).toLocaleDateString()}</td>
                      <td><strong>{assetObj.tag}</strong></td>
                      <td>{assetObj.name}</td>
                      <td>{rec.description}</td>
                      <td>{rec.technicianName}</td>
                      <td>${rec.cost?.toFixed(2)}</td>
                      <td>
                        <div className="flex" style={{ gap: '8px' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              // Auto start work
                              handleDirectTransition(rec.id, 'In Progress');
                            }}
                          >
                            ⚙ Start Servicing
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => openEditModal(rec)}
                          >
                            Edit / Assign
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

      {/* 2. REPAIR PIPELINE */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>🔧 In-Progress Repair Pipeline</h3>
        {inProgressRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No assets are currently being serviced.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Start Date</th>
                  <th>Asset Tag</th>
                  <th>Asset Name</th>
                  <th>Assigned Tech</th>
                  <th>Issues Detail</th>
                  <th>Servicing Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inProgressRequests.map(rec => {
                  const assetObj = assets.find(a => a.id === rec.assetId) || { tag: 'AST', name: 'Asset' };
                  return (
                    <tr key={rec.id}>
                      <td>{rec.startDate ? new Date(rec.startDate).toLocaleDateString() : 'N/A'}</td>
                      <td><strong>{assetObj.tag}</strong></td>
                      <td>{assetObj.name}</td>
                      <td>🛠️ {rec.technicianName}</td>
                      <td>{rec.description}</td>
                      <td>${rec.cost?.toFixed(2)}</td>
                      <td>
                        <div className="flex" style={{ gap: '8px' }}>
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDirectTransition(rec.id, 'Completed')}
                          >
                            ✓ Finish & Check-In
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => openEditModal(rec)}
                          >
                            Manage
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

      {/* 3. MAINTENANCE LEDGER ARCHIVE */}
      <div className="card">
        <h3 style={{ marginBottom: '16px' }}>Completed Service Ledger</h3>
        {archivedRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No completed servicing logs.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Completed Date</th>
                  <th>Asset</th>
                  <th>Technician</th>
                  <th>Repair Description</th>
                  <th>Final Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {archivedRecords.map(rec => {
                  const assetObj = assets.find(a => a.id === rec.assetId) || { tag: 'AST', name: 'Asset' };
                  return (
                    <tr key={rec.id}>
                      <td>{rec.endDate ? new Date(rec.endDate).toLocaleDateString() : new Date(rec.updatedAt || rec.createdAt).toLocaleDateString()}</td>
                      <td><strong>{assetObj.name}</strong> <span style={{ fontSize: '11px' }}>({assetObj.tag})</span></td>
                      <td>{rec.technicianName}</td>
                      <td>{rec.description}</td>
                      <td><strong>${rec.cost?.toFixed(2)}</strong></td>
                      <td>
                        <span className={`badge ${rec.status === 'Completed' ? 'badge-available' : 'badge-lost'}`}>
                          {rec.status}
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

      {/* EDIT / UPDATE WORK ORDER MODAL */}
      {showEditModal && selectedRecord && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🛠️ Manage Maintenance Work Order</h2>
              <button className="modal-close" onClick={() => {
                setShowEditModal(false);
                setSelectedRecord(null);
              }}>×</button>
            </div>
            
            <form onSubmit={handleUpdateRecord}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="maint-edit-tech">Assigned Technician / Vendor</label>
                  <input 
                    id="maint-edit-tech"
                    type="text" 
                    className="form-control" 
                    value={technicianName} 
                    onChange={e => setTechnicianName(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="maint-edit-status">Servicing Status</label>
                  <select 
                    id="maint-edit-status"
                    className="form-control" 
                    value={status} 
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Requested">Requested</option>
                    <option value="In Progress">In Progress (Active)</option>
                    <option value="Completed">Completed (Fixed)</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="maint-edit-cost">Repair Cost ($)</label>
                    <input 
                      id="maint-edit-cost"
                      type="number" 
                      step="0.01" 
                      className="form-control" 
                      value={cost} 
                      onChange={e => setCost(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="maint-edit-start">Start Date</label>
                    <input 
                      id="maint-edit-start"
                      type="date" 
                      className="form-control" 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="maint-edit-end">End Date (If Completed)</label>
                    <input 
                      id="maint-edit-end"
                      type="date" 
                      className="form-control" 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="maint-edit-desc">Issue Description & Repairs Done</label>
                  <textarea 
                    id="maint-edit-desc"
                    className="form-control" 
                    rows={3} 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowEditModal(false);
                  setSelectedRecord(null);
                }}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : 'Update Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
