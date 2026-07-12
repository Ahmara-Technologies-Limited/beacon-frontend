import React, { useState } from 'react';
import { ShieldCheck, Plus, Edit2, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

// Default system permissions
const ALL_PERMISSIONS = [
  { group: 'Leads', items: ['view_leads', 'create_leads', 'edit_leads', 'delete_leads', 'reassign_leads', 'archive_leads'] },
  { group: 'Follow-Ups', items: ['view_followups', 'manage_followups'] },
  { group: 'Inspections', items: ['view_inspections', 'create_inspections', 'edit_inspections', 'cancel_inspections', 'complete_inspections'] },
  { group: 'Pipeline', items: ['view_pipeline', 'update_pipeline_stage'] },
  { group: 'Reports', items: ['view_reports', 'export_reports'] },
  { group: 'Users', items: ['view_users', 'create_users', 'edit_users', 'delete_users'] },
  { group: 'Roles', items: ['view_roles', 'manage_roles'] },
  { group: 'Settings', items: ['view_settings', 'edit_settings'] },
];

const DEFAULT_ROLES = [
  {
    id: 'r1',
    name: 'Super Admin',
    description: 'Full system access. Manages all users, leads, and settings.',
    color: '#D4262A',
    isSystem: true,
    permissions: ALL_PERMISSIONS.flatMap(g => g.items),
  },
  {
    id: 'r2',
    name: 'GM',
    description: 'General Manager — read-only access across all modules and full reporting.',
    color: '#101828',
    isSystem: true,
    permissions: ['view_leads', 'view_followups', 'view_inspections', 'view_pipeline', 'view_reports', 'export_reports', 'view_users'],
  },
  {
    id: 'r3',
    name: 'Sales Closer',
    description: 'Core sales team member managing their assigned lead portfolio.',
    color: '#0066CC',
    isSystem: false,
    permissions: ['view_leads', 'create_leads', 'edit_leads', 'manage_followups', 'view_followups', 'view_inspections', 'create_inspections', 'view_pipeline', 'update_pipeline_stage'],
  },
  {
    id: 'r4',
    name: 'Inspection Officer',
    description: 'Manages and logs field inspections and site visits.',
    color: '#059669',
    isSystem: false,
    permissions: ['view_leads', 'view_inspections', 'edit_inspections', 'complete_inspections', 'cancel_inspections', 'view_pipeline'],
  },
  {
    id: 'r5',
    name: 'Admin/Doc Officer',
    description: 'Handles post-sale documentation, allocation and payment verification.',
    color: '#7C3AED',
    isSystem: false,
    permissions: ['view_leads', 'edit_leads', 'view_pipeline', 'update_pipeline_stage', 'view_inspections'],
  },
];

const STORAGE_KEY = 'beacon_roles';

function loadRoles() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_ROLES;
  } catch { return DEFAULT_ROLES; }
}

function saveRoles(roles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

const formatPermission = (perm) => perm.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function RoleManagement() {
  const [roles, setRoles] = useState(() => loadRoles());
  const [selectedRole, setSelectedRole] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Create modal state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#344054');
  const [newRolePerms, setNewRolePerms] = useState([]);
  const [formError, setFormError] = useState('');

  const handleSelectRole = (role) => {
    setSelectedRole({ ...role });
    setEditMode(false);
  };

  const togglePermission = (perm) => {
    if (!editMode) return;
    setSelectedRole(prev => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter(p => p !== perm)
        : [...prev.permissions, perm]
    }));
  };

  const handleSaveRole = () => {
    const updatedRoles = roles.map(r => r.id === selectedRole.id ? selectedRole : r);
    setRoles(updatedRoles);
    saveRoles(updatedRoles);
    setEditMode(false);
  };

  const handleDeleteRole = (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role? This cannot be undone.')) return;
    const updated = roles.filter(r => r.id !== roleId);
    setRoles(updated);
    saveRoles(updated);
    if (selectedRole?.id === roleId) setSelectedRole(null);
  };

  const handleCreateRole = () => {
    setFormError('');
    if (!newRoleName.trim()) { setFormError('Role name is required.'); return; }
    if (roles.find(r => r.name.toLowerCase() === newRoleName.trim().toLowerCase())) {
      setFormError('A role with this name already exists.'); return;
    }
    const newRole = {
      id: `r_${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc.trim(),
      color: newRoleColor,
      isSystem: false,
      permissions: newRolePerms,
    };
    const updated = [...roles, newRole];
    setRoles(updated);
    saveRoles(updated);
    setSelectedRole(newRole);
    setShowCreateModal(false);
    setNewRoleName(''); setNewRoleDesc(''); setNewRoleColor('#344054'); setNewRolePerms([]);
  };

  const toggleNewPerm = (perm) => {
    setNewRolePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleGroupPerms = (groupItems, allPerms, setPerms) => {
    const allSelected = groupItems.every(p => allPerms.includes(p));
    if (allSelected) {
      setPerms(allPerms.filter(p => !groupItems.includes(p)));
    } else {
      const toAdd = groupItems.filter(p => !allPerms.includes(p));
      setPerms([...allPerms, ...toAdd]);
    }
  };

  return (
    <div className="role-mgmt-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Roles & Permissions</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Roles & Permissions</h1>
          <p className="page-subtitle">Define access levels and control what each role can do in Beacon CRM.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          <span>Create Role</span>
        </button>
      </div>

      <div className="role-mgmt-layout">
        {/* Left: Roles List */}
        <div className="role-list-panel card">
          <div className="role-list-header">
            <span className="section-title" style={{ marginBottom: 0 }}>System Roles</span>
            <span className="role-count-badge">{roles.length}</span>
          </div>
          <div className="role-list">
            {roles.map(role => (
              <div
                key={role.id}
                className={`role-list-item ${selectedRole?.id === role.id ? 'selected' : ''}`}
                onClick={() => handleSelectRole(role)}
              >
                <div className="role-list-dot" style={{ background: role.color }} />
                <div className="role-list-info">
                  <div className="role-list-name">{role.name}</div>
                  <div className="role-list-desc">{role.description || 'No description.'}</div>
                </div>
                {role.isSystem && <span className="role-system-badge">System</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Role Detail */}
        <div className="role-detail-panel">
          {!selectedRole ? (
            <div className="card role-empty-state">
              <ShieldCheck size={48} style={{ color: 'var(--text-placeholder)', marginBottom: 16 }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Select a role on the left to view and edit its permissions.</p>
            </div>
          ) : (
            <div className="card">
              {/* Detail Header */}
              <div className="role-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div className="role-avatar-lg" style={{ background: selectedRole.color }}>
                    {selectedRole.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="role-detail-name">{selectedRole.name}</h2>
                    <p className="role-detail-desc">{selectedRole.description || 'No description.'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {!selectedRole.isSystem && !editMode && (
                    <button className="btn btn-sm" onClick={() => setEditMode(true)}>
                      <Edit2 size={14} /> Edit Permissions
                    </button>
                  )}
                  {editMode && (
                    <>
                      <button className="btn btn-sm" onClick={() => { setSelectedRole(roles.find(r => r.id === selectedRole.id)); setEditMode(false); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" onClick={handleSaveRole}>
                        <Check size={14} /> Save Changes
                      </button>
                    </>
                  )}
                  {!selectedRole.isSystem && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteRole(selectedRole.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="role-detail-body">
                <div className="role-permissions-count">
                  <ShieldCheck size={16} />
                  <span>{selectedRole.permissions.length} permission{selectedRole.permissions.length !== 1 ? 's' : ''} granted</span>
                  {selectedRole.isSystem && <span className="role-system-badge" style={{ marginLeft: 8 }}>System role — cannot be edited</span>}
                </div>

                <div className="permission-groups">
                  {ALL_PERMISSIONS.map(group => {
                    const groupSelected = group.items.filter(p => selectedRole.permissions.includes(p)).length;
                    const isExpanded = expandedGroups[group.group] !== false; // default open
                    const allSelected = group.items.every(p => selectedRole.permissions.includes(p));
                    return (
                      <div key={group.group} className="perm-group">
                        <div className="perm-group-header" onClick={() => toggleGroup(group.group)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {editMode && (
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleGroupPerms(group.items, selectedRole.permissions, (p) => setSelectedRole(prev => ({ ...prev, permissions: p })))}
                                onClick={e => e.stopPropagation()}
                                className="perm-checkbox"
                              />
                            )}
                            <span className="perm-group-name">{group.group}</span>
                            <span className="perm-group-count">{groupSelected}/{group.items.length}</span>
                          </div>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                        {isExpanded && (
                          <div className="perm-items">
                            {group.items.map(perm => {
                              const granted = selectedRole.permissions.includes(perm);
                              return (
                                <label key={perm} className={`perm-item ${granted ? 'granted' : ''} ${editMode ? 'editable' : ''}`}>
                                  {editMode ? (
                                    <input 
                                      type="checkbox" 
                                      checked={granted} 
                                      onChange={() => togglePermission(perm)} 
                                      className="perm-checkbox" 
                                    />
                                  ) : (
                                    <div className={`perm-status-dot ${granted ? 'dot-green' : 'dot-grey'}`} />
                                  )}
                                  <span className="perm-name">{formatPermission(perm)}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Role</h3>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              {formError && <div style={{ background: '#FEF3F2', border: '1px solid #FDA29B', color: '#B42318', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{formError}</div>}

              <div className="form-group">
                <label className="form-label">Role Name *</label>
                <input className="form-control" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="e.g., Relationship Manager" />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} placeholder="Brief description of this role's responsibilities" />
              </div>

              <div className="form-group">
                <label className="form-label">Role Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['#D4262A', '#0066CC', '#059669', '#7C3AED', '#B54708', '#101828', '#344054'].map(color => (
                    <button
                      key={color}
                      style={{ width: 32, height: 32, borderRadius: '50%', background: color, border: newRoleColor === color ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer' }}
                      onClick={() => setNewRoleColor(color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Permissions</label>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div className="permission-groups">
                    {ALL_PERMISSIONS.map(group => {
                      const groupSelectedCount = group.items.filter(p => newRolePerms.includes(p)).length;
                      const allSelected = group.items.every(p => newRolePerms.includes(p));
                      const isExpanded = expandedGroups[`create_${group.group}`] !== false;
                      return (
                        <div key={group.group} className="perm-group">
                          <div className="perm-group-header" onClick={() => setExpandedGroups(prev => ({ ...prev, [`create_${group.group}`]: !prev[`create_${group.group}`] }))}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={() => toggleGroupPerms(group.items, newRolePerms, setNewRolePerms)}
                                onClick={e => e.stopPropagation()}
                                className="perm-checkbox"
                              />
                              <span className="perm-group-name">{group.group}</span>
                              <span className="perm-group-count">{groupSelectedCount}/{group.items.length}</span>
                            </div>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                          {isExpanded && (
                            <div className="perm-items">
                              {group.items.map(perm => {
                                const checked = newRolePerms.includes(perm);
                                return (
                                  <label key={perm} className={`perm-item editable ${checked ? 'granted' : ''}`}>
                                    <input 
                                      type="checkbox" 
                                      checked={checked} 
                                      onChange={() => toggleNewPerm(perm)} 
                                      className="perm-checkbox" 
                                    />
                                    <span className="perm-name">{formatPermission(perm)}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateRole}>
                <Plus size={15} /> Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .role-mgmt-page { }

        .role-mgmt-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .role-list-panel {
          width: 300px;
          flex-shrink: 0;
          padding: 0;
          overflow: hidden;
        }

        .role-list-header {
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .role-count-badge {
          background: var(--color-grey-bg);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 20px;
        }

        .role-list { }

        .role-list-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.15s;
        }

        .role-list-item:hover { background: var(--table-hover-bg); }
        .role-list-item.selected { background: rgba(212,38,42,0.05); border-left: 3px solid var(--primary-red); }

        .role-list-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 5px;
        }

        .role-list-info { flex: 1; min-width: 0; }

        .role-list-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .role-list-desc {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .role-system-badge {
          font-size: 10px;
          font-weight: 700;
          background: var(--color-grey-bg);
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
          flex-shrink: 0;
          align-self: flex-start;
        }

        .role-detail-panel { flex: 1; min-width: 0; }

        .role-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
        }

        .role-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 20px;
        }

        .role-avatar-lg {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }

        .role-detail-name {
          font-size: 18px;
          font-weight: 800;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .role-detail-desc {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .role-detail-body { }

        .role-permissions-count {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }

        .permission-groups {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .perm-group {
          border: 1px solid var(--border-color);
          border-radius: 10px;
          overflow: hidden;
        }

        .perm-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--table-header-bg);
          cursor: pointer;
          user-select: none;
        }

        .perm-group-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .perm-group-count {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--color-grey-bg);
          padding: 1px 8px;
          border-radius: 10px;
          margin-left: 8px;
        }

        .perm-items {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          padding: 8px;
        }

        .perm-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 6px;
          cursor: default;
          transition: background 0.15s;
        }

        .perm-item.editable { cursor: pointer; }
        .perm-item.editable:hover { background: var(--color-grey-bg); }
        .perm-item.granted { }

        .perm-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .dot-green { background: #12B76A; }
        .dot-grey { background: #D0D5DD; }

        .perm-name {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .perm-item.granted .perm-name { color: var(--text-primary); font-weight: 600; }

        .perm-checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: var(--primary-red);
          flex-shrink: 0;
        }

        @media (max-width: 1024px) {
          .role-mgmt-layout {
            flex-direction: column;
          }
          .role-list-panel {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .perm-items {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
