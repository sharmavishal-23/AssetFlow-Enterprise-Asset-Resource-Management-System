'use client';

import { useState, useEffect } from 'react';

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'departments' | 'categories'
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal / sub-form states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editRole, setEditRole] = useState('Employee');
  const [editStatus, setEditStatus] = useState('Active');
  const [editDeptId, setEditDeptId] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);

  // New Department Form
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptParent, setNewDeptParent] = useState('');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [customFields, setCustomFields] = useState([{ name: '', type: 'text', required: false }]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usrRes, depRes, catRes, meRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/departments'),
        fetch('/api/categories'),
        fetch('/api/auth/me')
      ]);

      if (usrRes.ok) setUsers((await usrRes.json()).users || []);
      if (depRes.ok) setDepartments((await depRes.json()).departments || []);
      if (catRes.ok) setCategories((await catRes.json()).categories || []);
      if (meRes.ok) setCurrentUser((await meRes.json()).user);
    } catch (err) {
      console.error('Error fetching org data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update employee role / status (Admin only)
  const handleUpdateRole = async (e) => {
    e.preventDefault();
    setRoleLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: editRole,
          status: editStatus,
          departmentId: editDeptId
        })
      });

      if (res.ok) {
        setShowRoleModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update employee details.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRoleLoading(false);
    }
  };

  // Add Department (Admin only)
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!newDeptName) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeptName,
          parentId: newDeptParent ? parseInt(newDeptParent) : null
        })
      });

      if (res.ok) {
        setNewDeptName('');
        setNewDeptParent('');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create department.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Category (Admin and Asset Manager only)
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName || !newCatCode) return;

    // Filter out blank custom fields
    const validFields = customFields.filter(f => f.name.trim() !== '');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          code: newCatCode,
          description: newCatDesc,
          customFields: validFields
        })
      });

      if (res.ok) {
        setNewCatName('');
        setNewCatCode('');
        setNewCatDesc('');
        setCustomFields([{ name: '', type: 'text', required: false }]);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create category.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addCustomFieldInput = () => {
    setCustomFields([...customFields, { name: '', type: 'text', required: false }]);
  };

  const removeCustomFieldInput = (index) => {
    setCustomFields(customFields.filter((_, idx) => idx !== index));
  };

  const updateCustomFieldInput = (index, key, val) => {
    const updated = [...customFields];
    updated[index][key] = val;
    setCustomFields(updated);
  };

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Loading organization configurations...</div>;
  }

  // Recursive department tree renderer
  const renderDeptTree = (parentId, depth = 0) => {
    const children = departments.filter(d => d.parentId === parentId);
    if (children.length === 0) return null;

    return (
      <div className="flex flex-col" style={{ gap: '8px', paddingLeft: depth > 0 ? '24px' : '0' }}>
        {children.map(dept => {
          const managerName = users.find(u => u.id === dept.managerId)?.name || 'None Assigned';
          return (
            <div key={dept.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 18px', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  backgroundColor: 'var(--bg-secondary)' 
                }}
              >
                <div>
                  <strong>🏢 {dept.name}</strong>
                  <span className="text-muted" style={{ marginLeft: '12px' }}>ID: {dept.id}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Manager: {managerName}
                </div>
              </div>
              {renderDeptTree(dept.id, depth + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">
      
      {/* TABS CONTROLLER */}
      <div className="card" style={{ padding: '12px' }}>
        <div className="flex" style={{ gap: '8px' }}>
          <button 
            className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('employees')}
          >
            👥 Employee Directory
          </button>
          <button 
            className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('departments')}
          >
            🏢 Departments Structure
          </button>
          <button 
            className={`btn ${activeTab === 'categories' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('categories')}
          >
            ⚙ Asset Categories
          </button>
        </div>
      </div>

      {/* 1. EMPLOYEE DIRECTORY */}
      {activeTab === 'employees' && (
        <div className="card">
          <div className="flex justify-between align-center" style={{ marginBottom: '16px' }}>
            <h3>Staff List</h3>
            <span className="text-muted">Total staff: {users.length}</span>
          </div>

          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Work Email</th>
                  <th>Department</th>
                  <th>Role Permission</th>
                  <th>Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const deptName = departments.find(d => d.id === u.departmentId)?.name || 'Unassigned';
                  const isSystemAdmin = u.id === 1;

                  return (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        {isSystemAdmin && <span className="text-muted" style={{ fontSize: '11px', marginLeft: '6px' }}>(Root Admin)</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>🏢 {deptName}</td>
                      <td>
                        <span className={`badge ${u.role === 'Admin' ? 'badge-lost' : u.role === 'Asset Manager' ? 'badge-undermaintenance' : u.role === 'Department Head' ? 'badge-info' : 'badge-allocated'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ 
                          fontWeight: 600, 
                          color: u.status === 'Active' ? 'var(--success)' : 'var(--danger)',
                          fontSize: '13px'
                        }}>
                          ● {u.status}
                        </span>
                      </td>
                      <td>
                        {!isSystemAdmin && currentUser?.role === 'Admin' ? (
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => {
                              setSelectedUser(u);
                              setEditRole(u.role);
                              setEditStatus(u.status);
                              setEditDeptId(u.departmentId?.toString() || '');
                              setShowRoleModal(true);
                            }}
                          >
                            ⚙ Adjust Permissions
                          </button>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '12px' }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. DEPARTMENTS HIERARCHY */}
      {activeTab === 'departments' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
          {/* Department tree visualizer */}
          <div className="card flex flex-col" style={{ gap: '16px' }}>
            <h3>Department Organizational Tree</h3>
            {renderDeptTree(null)}
          </div>

          {/* New department creation */}
          {currentUser?.role === 'Admin' && (
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Add Department</h3>
              <form onSubmit={handleAddDept}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-dept-name-input">Department Name</label>
                  <input
                    id="new-dept-name-input"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Quality Assurance"
                    value={newDeptName}
                    onChange={e => setNewDeptName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-dept-parent-select">Parent Department (For Hierarchy)</label>
                  <select
                    id="new-dept-parent-select"
                    className="form-control"
                    value={newDeptParent}
                    onChange={e => setNewDeptParent(e.target.value)}
                  >
                    <option value="">-- None (Top Level) --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '10px' }}>
                  Create Department
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 3. ASSET CATEGORIES */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px', alignItems: 'start', flexWrap: 'wrap' }}>
          {/* Categories index */}
          <div className="card flex flex-col" style={{ gap: '16px' }}>
            <h3>Asset Categories Index</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex justify-between align-center" style={{ marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '15px' }}>{cat.name}</h4>
                    <span className="badge badge-allocated" style={{ fontSize: '10px' }}>Code: {cat.code}</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cat.description || 'No description provided.'}</p>
                  
                  {cat.customFields?.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <span className="text-muted" style={{ fontWeight: 600 }}>Custom Specifications Attributes:</span>
                      <div className="flex" style={{ gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {cat.customFields.map(f => (
                          <span 
                            key={f.name} 
                            style={{ padding: '4px 8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '11px' }}
                          >
                            🏷️ {f.name} ({f.type}){f.required && '*'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Create Category with Custom Fields Form */}
          {['Admin', 'Asset Manager'].includes(currentUser?.role) && (
            <div className="card">
              <h3 style={{ marginBottom: '16px' }}>Add Custom Asset Category</h3>
              <form onSubmit={handleAddCategory}>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-cat-name-input">Category Name</label>
                  <input
                    id="new-cat-name-input"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Mobile Phones"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-cat-code-input">Category Code</label>
                    <input
                      id="new-cat-code-input"
                      type="text"
                      className="form-control"
                      placeholder="IT-MOB"
                      value={newCatCode}
                      onChange={e => setNewCatCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="new-cat-desc-input">Description</label>
                  <textarea
                    id="new-cat-desc-input"
                    className="form-control"
                    rows={2}
                    placeholder="Provide description..."
                    value={newCatDesc}
                    onChange={e => setNewCatDesc(e.target.value)}
                  />
                </div>

                {/* Custom Fields Generator Section */}
                <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '16px', paddingTop: '12px' }}>
                  <div className="flex justify-between align-center" style={{ marginBottom: '10px' }}>
                    <span className="form-label">Custom Fields Setup</span>
                    <button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={addCustomFieldInput}>
                      ➕ Add Field
                    </button>
                  </div>

                  <div className="flex flex-col" style={{ gap: '8px' }}>
                    {customFields.map((field, index) => (
                      <div key={index} className="flex align-center" style={{ gap: '6px' }}>
                        <input
                          aria-label="Field Label Name"
                          type="text"
                          className="form-control"
                          placeholder="e.g. IMEI Number"
                          value={field.name}
                          onChange={e => updateCustomFieldInput(index, 'name', e.target.value)}
                          required
                        />
                        <select
                          aria-label="Field Type Selector"
                          className="form-control"
                          style={{ maxWidth: '90px' }}
                          value={field.type}
                          onChange={e => updateCustomFieldInput(index, 'type', e.target.value)}
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                        </select>
                        <div className="flex align-center" style={{ gap: '2px' }}>
                          <input
                            id={`field-required-${index}`}
                            type="checkbox"
                            checked={field.required}
                            onChange={e => updateCustomFieldInput(index, 'required', e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor={`field-required-${index}`} style={{ fontSize: '9px', fontWeight: 600, cursor: 'pointer' }}>Req</label>
                        </div>
                        {customFields.length > 1 && (
                          <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' }} onClick={() => removeCustomFieldInput(index)}>
                            ❌
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '16px' }}>
                  Save Category Template
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ADJUST ROLE / STATUS MODAL */}
      {showRoleModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>⚙ Adjust Permissions: {selectedUser.name}</h2>
              <button className="modal-close" onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}>×</button>
            </div>
            
            <form onSubmit={handleUpdateRole}>
              <div className="modal-body">
                
                <div className="form-group">
                  <label className="form-label" htmlFor="role-select">Access Role Group</label>
                  <select 
                    id="role-select"
                    className="form-control" 
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value)}
                  >
                    <option value="Employee">Employee (Default)</option>
                    <option value="Department Head">Department Head</option>
                    <option value="Asset Manager">Asset Manager</option>
                    <option value="Admin">System Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="department-assignment-select">Department Assignment</label>
                  <select 
                    id="department-assignment-select"
                    className="form-control" 
                    value={editDeptId} 
                    onChange={e => setEditDeptId(e.target.value)}
                  >
                    <option value="">-- Unassigned --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="status-select">Account Status</label>
                  <select 
                    id="status-select"
                    className="form-control" 
                    value={editStatus} 
                    onChange={e => setEditStatus(e.target.value)}
                  >
                    <option value="Active">Active (Allowed login)</option>
                    <option value="Inactive">Inactive (Suspended)</option>
                  </select>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={roleLoading}>
                  {roleLoading ? 'Updating...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
