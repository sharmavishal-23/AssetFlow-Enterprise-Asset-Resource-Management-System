'use client';

import { useState, useEffect } from 'react';

export default function AuditsPage() {
  const [audits, setAudits] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Selected audit details
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states (Create Audit)
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [auditorUserId, setAuditorUserId] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Active checklist modifications (temporary before saving)
  const [checkedAssets, setCheckedAssets] = useState([]);
  const [missingAssets, setMissingAssets] = useState([]);
  const [damagedAssets, setDamagedAssets] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [auRes, astRes, usrRes, meRes] = await Promise.all([
        fetch('/api/audits'),
        fetch('/api/assets'),
        fetch('/api/users'),
        fetch('/api/auth/me')
      ]);

      if (auRes.ok) {
        const auditList = (await auRes.json()).audits || [];
        setAudits(auditList);
        // Refresh selected audit if active
        if (selectedAudit) {
          const updated = auditList.find(a => a.id === selectedAudit.id);
          setSelectedAudit(updated || null);
        }
      }
      if (astRes.ok) setAssets((await astRes.json()).assets || []);
      if (usrRes.ok) setUsers((await usrRes.json()).users || []);
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    } catch (err) {
      console.error('Error fetching audits data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync checklist state when selected audit changes
  useEffect(() => {
    if (selectedAudit) {
      const rep = selectedAudit.discrepancyReport || { checkedAssets: [], missingAssets: [], damagedAssets: [] };
      setCheckedAssets(rep.checkedAssets || []);
      setMissingAssets(rep.missingAssets || []);
      setDamagedAssets(rep.damagedAssets || []);
    } else {
      setCheckedAssets([]);
      setMissingAssets([]);
      setDamagedAssets([]);
    }
  }, [selectedAudit]);

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, startDate, endDate, auditorUserId })
      });

      if (res.ok) {
        setShowAddModal(false);
        setName('');
        setStartDate('');
        setEndDate('');
        setAuditorUserId('');
        loadData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to create audit cycle.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  // Checklist updates (checked, missing, damaged status toggling)
  const toggleAssetCheck = (assetId, type) => {
    // Prevent edits if audit is Locked
    if (selectedAudit?.status === 'Locked') return;

    const id = parseInt(assetId);

    if (type === 'verified') {
      if (checkedAssets.includes(id)) {
        setCheckedAssets(prev => prev.filter(x => x !== id));
      } else {
        setCheckedAssets(prev => [...prev, id]);
        setMissingAssets(prev => prev.filter(x => x !== id));
        setDamagedAssets(prev => prev.filter(x => x !== id));
      }
    } 
    else if (type === 'missing') {
      if (missingAssets.includes(id)) {
        setMissingAssets(prev => prev.filter(x => x !== id));
      } else {
        setMissingAssets(prev => [...prev, id]);
        setCheckedAssets(prev => prev.filter(x => x !== id));
        setDamagedAssets(prev => prev.filter(x => x !== id));
      }
    } 
    else if (type === 'damaged') {
      if (damagedAssets.includes(id)) {
        setDamagedAssets(prev => prev.filter(x => x !== id));
      } else {
        setDamagedAssets(prev => [...prev, id]);
        setCheckedAssets(prev => prev.filter(x => x !== id));
        setMissingAssets(prev => prev.filter(x => x !== id));
      }
    }
  };

  const handleSaveChecklist = async (statusOverride = null) => {
    setSaveLoading(true);
    const targetStatus = statusOverride || selectedAudit.status;

    try {
      const res = await fetch('/api/audits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAudit.id,
          status: targetStatus,
          discrepancyReport: {
            checkedAssets,
            missingAssets,
            damagedAssets
          }
        })
      });

      if (res.ok) {
        alert(targetStatus === 'Locked' ? '✓ Audit cycle locked and discrepancy statuses applied to assets database.' : '✓ Checklist updates saved successfully.');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update audit checklist.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const isLocked = selectedAudit?.status === 'Locked';

  return (
    <div className="page-container">
      
      {/* HEADER CONTROLS */}
      <div className="card flex justify-between align-center">
        <div>
          <h2>Corporate Asset Audit Cycles</h2>
          <p>Schedule periodic validation of stock, resolve discrepancy reports, and audit equipment.</p>
        </div>
        {['Admin', 'Asset Manager'].includes(currentUser?.role) && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            📋 Create Audit Cycle
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
        
        {/* AUDIT CYCLES LIST */}
        <div className="card flex flex-col" style={{ gap: '16px' }}>
          <h3>Audit Schedules</h3>
          <div className="flex flex-col" style={{ gap: '12px' }}>
            {audits.length === 0 ? (
              <p className="text-muted">No audit cycles registered.</p>
            ) : (
              audits.map(au => {
                const auditorName = users.find(u => u.id === au.auditorUserId)?.name || 'Auditor';
                const isSelected = selectedAudit?.id === au.id;
                
                return (
                  <div 
                    key={au.id} 
                    className={`card ${isSelected ? 'active-card' : ''}`}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '14px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)'
                    }}
                    onClick={() => setSelectedAudit(au)}
                  >
                    <div className="flex justify-between align-center">
                      <span className={`badge ${au.status === 'Locked' ? 'badge-lost' : au.status === 'Draft' ? 'badge-retired' : 'badge-allocated'}`} style={{ fontSize: '9px' }}>
                        {au.status}
                      </span>
                      <span className="text-muted" style={{ fontSize: '11px' }}>ID: AUD-{au.id}</span>
                    </div>
                    <h4 style={{ fontSize: '14px' }}>{au.name}</h4>
                    <p style={{ fontSize: '12px' }}>Auditor: <strong>{auditorName}</strong></p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Range: {au.startDate} to {au.endDate}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* AUDIT CHECKLIST / WORK AREA */}
        {selectedAudit ? (
          <div className="card flex flex-col" style={{ gap: '20px' }}>
            <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h2>{selectedAudit.name}</h2>
                <p>Status: <strong style={{ color: isLocked ? 'var(--danger)' : 'var(--primary)' }}>{selectedAudit.status}</strong></p>
              </div>
              
              {!isLocked && (
                <div className="flex" style={{ gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={() => handleSaveChecklist()} disabled={saveLoading}>
                    💾 Save Checklist
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => {
                      if (confirm('🔒 CRITICAL ACTION: Locking this cycle will prevent any future edits, and immediately mark missing assets as "Lost" and damaged assets as "Under Maintenance" in the main inventory. Proceed?')) {
                        handleSaveChecklist('Locked');
                      }
                    }} 
                    disabled={saveLoading}
                  >
                    🔒 Lock Cycle & Apply
                  </button>
                </div>
              )}
            </div>

            {/* Checklist count metrics */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ padding: '12px 18px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                <span className="text-muted" style={{ fontSize: '11px' }}>Total Checked</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>{checkedAssets.length}</div>
              </div>
              <div style={{ padding: '12px 18px', backgroundColor: 'var(--danger-light)', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--danger-text)', fontWeight: 600 }}>Missing Flag</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger-text)', marginTop: '4px' }}>{missingAssets.length}</div>
              </div>
              <div style={{ padding: '12px 18px', backgroundColor: 'var(--warning-light)', borderRadius: 'var(--radius-md)', flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--warning-text)', fontWeight: 600 }}>Damaged Flag</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--warning-text)', marginTop: '4px' }}>{damagedAssets.length}</div>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asset Tag</th>
                    <th>Asset Name</th>
                    <th>Current Status</th>
                    <th>Checklist Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.filter(a => !['Retired', 'Disposed'].includes(a.status)).map(asset => {
                    const verified = checkedAssets.includes(asset.id);
                    const missing = missingAssets.includes(asset.id);
                    const damaged = damagedAssets.includes(asset.id);
                    const statusClass = `badge-${asset.status.replace(/\s+/g, '').toLowerCase()}`;

                    return (
                      <tr key={asset.id} style={{ 
                        backgroundColor: verified ? 'rgba(16, 185, 129, 0.03)' : missing ? 'rgba(239, 68, 68, 0.03)' : damaged ? 'rgba(245, 158, 11, 0.03)' : 'transparent' 
                      }}>
                        <td><strong>{asset.tag}</strong></td>
                        <td>{asset.name}</td>
                        <td><span className={`badge ${statusClass}`}>{asset.status}</span></td>
                        <td>
                          {isLocked ? (
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>
                              {verified && <span style={{ color: 'var(--success)' }}>✓ Verified</span>}
                              {missing && <span style={{ color: 'var(--danger)' }}>⚠️ Flagged Missing (Lost)</span>}
                              {damaged && <span style={{ color: 'var(--warning)' }}>🔧 Flagged Damaged</span>}
                              {!verified && !missing && !damaged && <span className="text-muted">Unchecked</span>}
                            </div>
                          ) : (
                            <div className="flex" style={{ gap: '8px' }}>
                              <button 
                                type="button"
                                className="btn"
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '11px',
                                  backgroundColor: verified ? 'var(--success)' : 'var(--bg-tertiary)',
                                  color: verified ? 'white' : 'var(--text-primary)'
                                }}
                                onClick={() => toggleAssetCheck(asset.id, 'verified')}
                              >
                                ✓ Verify
                              </button>
                              <button 
                                type="button"
                                className="btn"
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '11px',
                                  backgroundColor: missing ? 'var(--danger)' : 'var(--bg-tertiary)',
                                  color: missing ? 'white' : 'var(--text-primary)'
                                }}
                                onClick={() => toggleAssetCheck(asset.id, 'missing')}
                              >
                                ⚠️ Missing
                              </button>
                              <button 
                                type="button"
                                className="btn"
                                style={{ 
                                  padding: '4px 10px', 
                                  fontSize: '11px',
                                  backgroundColor: damaged ? 'var(--warning)' : 'var(--bg-tertiary)',
                                  color: damaged ? 'white' : 'var(--text-primary)'
                                }}
                                onClick={() => toggleAssetCheck(asset.id, 'damaged')}
                              >
                                🔧 Damaged
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
            Select an audit cycle from the panel to manage discrepancy checklists.
          </div>
        )}
      </div>

      {/* CREATE AUDIT MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>📋 Schedule New Audit Cycle</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateAudit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="audit-name-input">Audit Cycle Name</label>
                  <input
                    id="audit-name-input"
                    type="text"
                    className="form-control"
                    placeholder="Q3 Hardware & Laptop Inventory Audit"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="audit-start-date">Start Date</label>
                    <input
                      id="audit-start-date"
                      type="date"
                      className="form-control"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="audit-end-date">End Date</label>
                    <input
                      id="audit-end-date"
                      type="date"
                      className="form-control"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="audit-auditor-select">Assign Lead Auditor</label>
                  <select
                    id="audit-auditor-select"
                    className="form-control"
                    value={auditorUserId}
                    onChange={e => setAuditorUserId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Auditor --</option>
                    {users.filter(u => ['Admin', 'Asset Manager'].includes(u.role)).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? 'Creating...' : 'Initialize Cycle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
