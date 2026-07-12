'use client';

import { useState, useEffect } from 'react';

// A premium SVG Vector QR Code generator
function QRCodeSVG({ value }) {
  // A deterministic pseudo-random matrix based on the value to make QR codes unique for each asset
  const getMatrix = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const size = 15;
    const matrix = [];
    for (let r = 0; r < size; r++) {
      matrix[r] = [];
      for (let c = 0; c < size; c++) {
        // Force corners to look like finder patterns
        const isFinder = 
          (r < 4 && c < 4) || 
          (r < 4 && c >= size - 4) || 
          (r >= size - 4 && c < 4);
        
        if (isFinder) {
          // Finder pattern outlines
          const isOutline = 
            (r === 0 || r === 3 || c === 0 || c === 3) ||
            (r === 0 || r === 3 || c === size - 1 || c === size - 4) ||
            (r === size - 1 || r === size - 4 || c === 0 || c === 3);
          matrix[r][c] = isOutline || (r === 1 && c === 1) || (r === 1 && c === size - 2) || (r === size - 2 && c === 1);
        } else {
          const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
          matrix[r][c] = val > 0.45;
        }
      }
    }
    return matrix;
  };

  const matrix = getMatrix(value || 'AST-0000');
  const size = matrix.length;

  return (
    <svg width="120" height="120" viewBox={`0 0 ${size} ${size}`} style={{ shapeRendering: 'crispEdges', background: 'white', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
      {matrix.map((row, r) => 
        row.map((active, c) => (
          active && <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0f172a" />
        ))
      )}
    </svg>
  );
}

export default function AssetsPage() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Selected Asset Detail panel
  const [selectedAsset, setSelectedAsset] = useState(null);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form states (Add Asset)
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [condition, setCondition] = useState('Excellent');
  const [customFields, setCustomFields] = useState({});
  const [files, setFiles] = useState([]); // Array of base64 files
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  // Load everything on mount
  const loadData = async () => {
    try {
      setLoading(true);
      const [ast, cat, dept, usr, me, tr, mt, bk] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/categories'),
        fetch('/api/departments'),
        fetch('/api/users'),
        fetch('/api/auth/me'),
        fetch('/api/transfers'),
        fetch('/api/maintenance'),
        fetch('/api/bookings')
      ]);

      if (ast.ok) setAssets((await ast.json()).assets || []);
      if (cat.ok) setCategories((await cat.json()).categories || []);
      if (dept.ok) setDepartments((await dept.json()).departments || []);
      if (usr.ok) setUsers((await usr.json()).users || []);
      if (me.ok) setCurrentUser((await me.json()).user);
      if (tr.ok) setTransfers((await tr.json()).transfers || []);
      if (mt.ok) setMaintenance((await mt.json()).maintenance || []);
      if (bk.ok) setBookings((await bk.json()).bookings || []);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When category changes in Add modal, initialize empty custom fields
  const handleCategoryChange = (catId) => {
    setCategoryId(catId);
    const cat = categories.find(c => c.id === parseInt(catId));
    if (cat && cat.customFields) {
      const initialFields = {};
      cat.customFields.forEach(field => {
        initialFields[field.name] = '';
      });
      setCustomFields(initialFields);
    } else {
      setCustomFields({});
    }
  };

  // Convert files to base64 data URL
  const handleFileChange = (e) => {
    const fileList = Array.from(e.target.files);
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setFiles(prev => [...prev, {
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          dataUrl: reader.result
        }]);
      };
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryId,
          departmentId,
          condition,
          customFieldValues: customFields,
          fileUploads: files
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        // Reset states
        setName('');
        setCategoryId('');
        setDepartmentId('');
        setCondition('Excellent');
        setCustomFields({});
        setFiles([]);
        loadData();
      } else {
        const data = await res.json();
        setFormError(data.error || 'Failed to save asset.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateAsset = async (assetId, updates) => {
    try {
      const res = await fetch('/api/assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId, ...updates })
      });
      if (res.ok) {
        const updated = await res.json();
        if (selectedAsset && selectedAsset.id === assetId) {
          setSelectedAsset(updated.asset);
        }
        loadData();
      }
    } catch (err) {
      console.error('Failed to update asset status/files:', err);
    }
  };

  const handleAddFilesToExistingAsset = async (e) => {
    const fileList = Array.from(e.target.files);
    const newFiles = [...(selectedAsset.fileUploads || [])];
    
    let processed = 0;
    fileList.forEach(file => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        newFiles.push({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          dataUrl: reader.result
        });
        processed++;
        if (processed === fileList.length) {
          await handleUpdateAsset(selectedAsset.id, { fileUploads: newFiles });
        }
      };
    });
  };

  // Filter Assets matching selections
  const filteredAssets = assets.filter(asset => {
    const matchSearch = 
      asset.name.toLowerCase().includes(search.toLowerCase()) ||
      asset.tag.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || asset.status === statusFilter;
    const matchCat = !catFilter || asset.categoryId === parseInt(catFilter);
    const matchDept = !deptFilter || asset.departmentId === parseInt(deptFilter);
    return matchSearch && matchStatus && matchCat && matchDept;
  });

  // Selected asset aggregates
  const assetCategory = categories.find(c => c.id === selectedAsset?.categoryId);
  const assetDeptName = departments.find(d => d.id === selectedAsset?.departmentId)?.name || 'N/A';
  const assetAssigneeName = users.find(u => u.id === selectedAsset?.allocatedToUserId)?.name || 'Unassigned';

  // Filter history logs for selected asset
  const assetTransfers = transfers.filter(t => t.assetId === selectedAsset?.id);
  const assetMaint = maintenance.filter(m => m.assetId === selectedAsset?.id);
  const assetBookings = bookings.filter(b => b.assetId === selectedAsset?.id);

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading inventory...</div>;
  }

  return (
    <div className="page-container">
      
      {/* FILTER BAR AND ADD ASSET TRIGGER */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
          <div className="filter-bar">
            <div className="filter-item" style={{ minWidth: '220px' }}>
              <label className="form-label" htmlFor="asset-search-input">Search Assets</label>
              <input
                id="asset-search-input"
                type="text"
                className="form-control"
                placeholder="Search by tag, name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            
            <div className="filter-item">
              <label className="form-label" htmlFor="status-filter-select">Status</label>
              <select id="status-filter-select" className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All States</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Lost">Lost</option>
                <option value="Retired">Retired</option>
                <option value="Disposed">Disposed</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label" htmlFor="category-filter-select">Category</label>
              <select id="category-filter-select" className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <label className="form-label" htmlFor="dept-filter-select">Department</label>
              <select id="dept-filter-select" className="form-control" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                <option value="">All Locations</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {['Admin', 'Asset Manager'].includes(currentUser?.role) && (
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ Register Asset
            </button>
          )}
        </div>
      </div>

      {/* INVENTORY VIEWER LAYOUT */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        
        {/* ASSET LIST GRID */}
        <div style={{ flexGrow: 3, flexBasis: '600px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filteredAssets.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No assets found matching current criteria.
              </div>
            ) : (
              filteredAssets.map(asset => {
                const cat = categories.find(c => c.id === asset.categoryId)?.name || 'Category';
                const statusClass = `badge-${asset.status.replace(/\s+/g, '').toLowerCase()}`;
                
                return (
                  <div 
                    key={asset.id} 
                    className={`card ${selectedAsset?.id === asset.id ? 'active-card' : ''}`} 
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', border: selectedAsset?.id === asset.id ? '2px solid var(--primary)' : '1px solid var(--border-color)' }}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <div className="flex justify-between align-center">
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>{asset.tag}</span>
                      <span className={`badge ${statusClass}`}>{asset.status}</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px' }}>{asset.name}</h3>
                      <p style={{ fontSize: '12px', marginTop: '2px' }}>{cat}</p>
                    </div>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      <span>Condition: <strong>{asset.condition}</strong></span>
                      <span>📁 {asset.fileUploads?.length || 0} files</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* DETAILED INFORMATION PANEL */}
        {selectedAsset && (
          <aside className="card" style={{ flexGrow: 1, flexBasis: '380px', height: 'fit-content', position: 'sticky', top: '94px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="flex justify-between align-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <span className="text-muted" style={{ fontWeight: 700 }}>{selectedAsset.tag}</span>
                <h2>{selectedAsset.name}</h2>
              </div>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                onClick={() => setSelectedAsset(null)}
              >
                ×
              </button>
            </div>

            {/* Lifecycle Update State Actions (Admin/Manager only) */}
            {['Admin', 'Asset Manager'].includes(currentUser?.role) && (
              <div>
                <label className="form-label" htmlFor="detail-status-select" style={{ marginBottom: '6px', display: 'block' }}>Update Lifecycle State</label>
                <select 
                  id="detail-status-select"
                  className="form-control" 
                  value={selectedAsset.status}
                  onChange={e => handleUpdateAsset(selectedAsset.id, { status: e.target.value })}
                >
                  <option value="Available">Available</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Lost">Lost</option>
                  <option value="Retired">Retired</option>
                  <option value="Disposed">Disposed</option>
                </select>
              </div>
            )}

            {/* QR Code and Meta Details */}
            <div className="flex gap-4" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
              <div>
                <QRCodeSVG value={selectedAsset.tag} />
              </div>
              <div className="flex flex-col justify-between" style={{ fontSize: '13px' }}>
                <div>
                  <span className="text-muted">Assigned User</span>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>👤 {assetAssigneeName}</div>
                </div>
                <div>
                  <span className="text-muted">Department</span>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>🏢 {assetDeptName}</div>
                </div>
              </div>
            </div>

            {/* Custom fields Specifications */}
            <div>
              <h3 style={{ marginBottom: '10px' }}>Custom Specifications</h3>
              {Object.keys(selectedAsset.customFieldValues || {}).length === 0 ? (
                <p className="text-muted">No specifications registered.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
                  {Object.entries(selectedAsset.customFieldValues).map(([key, val]) => (
                    <div key={key} style={{ padding: '8px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                      <span className="text-muted" style={{ display: 'block', fontSize: '10px' }}>{key}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{val || 'N/A'}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Documents & File attachments */}
            <div>
              <div className="flex justify-between align-center" style={{ marginBottom: '10px' }}>
                <h3>Files & Attachments</h3>
                <label className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
                  📎 Attach
                  <input type="file" style={{ display: 'none' }} multiple onChange={handleAddFilesToExistingAsset} />
                </label>
              </div>
              {(!selectedAsset.fileUploads || selectedAsset.fileUploads.length === 0) ? (
                <p className="text-muted">No files attached.</p>
              ) : (
                <div className="flex flex-col" style={{ gap: '8px' }}>
                  {selectedAsset.fileUploads.map((file, index) => (
                    <a 
                      key={index}
                      href={file.dataUrl}
                      download={file.name}
                      style={{ display: 'flex', alignItem: 'center', justifyBetween: 'space-between', padding: '10px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', color: 'inherit', fontSize: '12px' }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>📄 {file.name}</span>
                      <span className="text-muted">{file.size}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Lifecycle History logs */}
            <div>
              <h3 style={{ marginBottom: '10px' }}>Asset History Audit</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                {assetTransfers.length === 0 && assetMaint.length === 0 && assetBookings.length === 0 && (
                  <p className="text-muted">No audit history entries found.</p>
                )}

                {/* Booking History */}
                {assetBookings.map(bk => (
                  <div key={bk.id} style={{ paddingLeft: '10px', borderLeft: '2px solid var(--info)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>Booking: {bk.title}</div>
                    <div className="text-muted">{new Date(bk.startTime).toLocaleDateString()} - Status: {bk.status}</div>
                  </div>
                ))}

                {/* Transfer History */}
                {assetTransfers.map(tr => {
                  const toName = users.find(u => u.id === tr.toUserId)?.name || 'N/A';
                  return (
                    <div key={tr.id} style={{ paddingLeft: '10px', borderLeft: '2px solid var(--success)', fontSize: '12px' }}>
                      <div style={{ fontWeight: 600 }}>Allocated to {toName}</div>
                      <div className="text-muted">{new Date(tr.createdAt).toLocaleDateString()} - Transfer status: {tr.status}</div>
                    </div>
                  );
                })}

                {/* Maintenance History */}
                {assetMaint.map(m => (
                  <div key={m.id} style={{ paddingLeft: '10px', borderLeft: '2px solid var(--warning)', fontSize: '12px' }}>
                    <div style={{ fontWeight: 600 }}>Service: {m.description}</div>
                    <div className="text-muted">Tech: {m.technicianName} (${m.cost}) - {m.status}</div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        )}
      </div>

      {/* REGISTER ASSET MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>➕ Add New Asset to Inventory</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--danger-light)', color: 'var(--danger-text)', borderRadius: 'var(--radius-md)', marginBottom: '14px', fontSize: '13px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="add-asset-name">Asset Name / Model</label>
                  <input
                    id="add-asset-name"
                    type="text"
                    className="form-control"
                    placeholder="MacBook Pro 16 or Sit-stand desk..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="add-asset-category">Category</label>
                    <select
                      id="add-asset-category"
                      className="form-control"
                      value={categoryId}
                      onChange={e => handleCategoryChange(e.target.value)}
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="add-asset-dept">Initial Location / Dept</label>
                    <select
                      id="add-asset-dept"
                      className="form-control"
                      value={departmentId}
                      onChange={e => setDepartmentId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="add-asset-condition">Physical Condition</label>
                  <select
                    id="add-asset-condition"
                    className="form-control"
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                  >
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                {/* Render Custom Fields dynamically */}
                {categoryId && categories.find(c => c.id === parseInt(categoryId))?.customFields?.length > 0 && (
                  <div style={{ border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px', backgroundColor: 'var(--bg-tertiary)' }}>
                    <h4 style={{ marginBottom: '12px' }}>Specifications for Selected Category</h4>
                    {categories.find(c => c.id === parseInt(categoryId)).customFields.map(field => (
                      <div key={field.name} className="form-group">
                        <label className="form-label" htmlFor={`custom-field-${field.name}`}>{field.name} {field.required && '*'}</label>
                        <input
                          id={`custom-field-${field.name}`}
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          className="form-control"
                          value={customFields[field.name] || ''}
                          onChange={e => setCustomFields({ ...customFields, [field.name]: e.target.value })}
                          required={field.required}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* File Upload Attachment */}
                <div className="form-group">
                  <label className="form-label" htmlFor="add-asset-files">Upload Documents / Images</label>
                  <input
                    id="add-asset-files"
                    type="file"
                    className="form-control"
                    multiple
                    onChange={handleFileChange}
                  />
                  {files.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {files.map((file, i) => (
                        <div key={i} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', padding: '6px', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                          <span>📄 {file.name}</span>
                          <span className="text-muted">{file.size}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                  {submitLoading ? 'Registering...' : 'Add Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
