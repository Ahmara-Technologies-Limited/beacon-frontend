import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, Key, X, AlertTriangle, Filter, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [leads, setLeads] = useState([]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  // Filter modal pending state
  const [pendingFilterRole, setPendingFilterRole] = useState('All');
  const [pendingFilterStatus, setPendingFilterStatus] = useState('All');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Form Modals State
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // null for create mode
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Sales Closer',
    status: 'Active'
  });
  const [errors, setErrors] = useState({});



  const ROLES = [
    'Super Admin', 'GM', 'Head of Ops', 'Sales Closer', 
    'Relationship Manager', 'Inspection Officer', 'Admin/Doc Officer'
  ];

  const loadUserData = async () => {
    setUsers(await dataService.getUsers());
    setLeads(await dataService.getLeads());
  };

  useEffect(() => {
    loadUserData();
    const interval = setInterval(loadUserData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter computation
  const getFilteredUsers = () => {
    let result = users;

    const query = searchQuery.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }

    if (filterRole !== 'All') result = result.filter(u => u.role === filterRole);
    if (filterStatus !== 'All') result = result.filter(u => u.status === filterStatus);

    return result;
  };

  const filteredUsers = getFilteredUsers();

  const handleOpenCreateModal = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Sales Closer',
      status: 'Active'
    });
    setErrors({});
    setShowUserModal(true);
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      status: user.status
    });
    setErrors({});
    setShowUserModal(true);
  };

  const validateForm = () => {
    const err = {};
    if (!formData.name.trim()) err.name = 'Full Name is required.';
    
    if (!formData.email.trim()) {
      err.email = 'Email Address is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      err.email = 'Email Address is invalid.';
    } else if (!selectedUser) {
      // Check if email already exists in system (only for creation)
      const emailExists = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
      if (emailExists) {
        err.email = 'An account with this email already exists.';
      }
    }

    if (!formData.role) err.role = 'System Role is required.';

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSaveUser = async () => {
    if (!validateForm()) return;

    await dataService.saveUser({
      ...formData,
      id: selectedUser ? selectedUser.id : undefined
    });

    setShowUserModal(false);
    loadUserData();
  };

  const handleStatusToggle = async (user) => {
    // Prevent deactivating own active session
    if (user.id === currentUser.id) {
      alert("You cannot deactivate your own logged-in account.");
      return;
    }

    // Prevent deactivating last super admin
    if (user.role === 'Super Admin' && user.status === 'Active') {
      const activeAdmins = users.filter(u => u.role === 'Super Admin' && u.status === 'Active');
      if (activeAdmins.length === 1) {
        alert("You cannot deactivate the only active Super Admin account.");
        return;
      }
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    await dataService.saveUser({
      ...user,
      status: newStatus
    });
    loadUserData();
  };

  const handleTriggerResetPassword = (user) => {
    alert(`A password reset link has been successfully dispatched to ${user.email}. Link will expire in 60 minutes.`);
    db.logAudit(`Triggered password reset link for user ${user.name} (${user.email}).`);
  };



  return (
    <div className="user-management-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">User Management</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Configure staff logins, CRM roles, and permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </div>


      {/* Filters & Search Toolbar */}
      <div className="user-toolbar card">
        <div className="toolbar-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            className="form-control"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <button 
            className={`btn ${(filterRole !== 'All' || filterStatus !== 'All') ? 'btn-primary' : ''}`}
            onClick={() => { setPendingFilterRole(filterRole); setPendingFilterStatus(filterStatus); setShowFilterModal(true); }}
          >
            <Filter size={15} />
            <span>Filters{(filterRole !== 'All' || filterStatus !== 'All') ? ` (${[filterRole !== 'All', filterStatus !== 'All'].filter(Boolean).length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* Active Filter Badges */}
      {(filterRole !== 'All' || filterStatus !== 'All') && (
        <div className="active-filters-row">
          <span className="active-filters-label">Active Filters:</span>
          {filterRole !== 'All' && (
            <div className="filter-badge-pill">
              <span>Role: {filterRole}</span>
              <button onClick={() => setFilterRole('All')}><X size={12} /></button>
            </div>
          )}
          {filterStatus !== 'All' && (
            <div className="filter-badge-pill">
              <span>Status: {filterStatus}</span>
              <button onClick={() => setFilterStatus('All')}><X size={12} /></button>
            </div>
          )}
          <button className="clear-all-filters-btn" onClick={() => { setFilterRole('All'); setFilterStatus('All'); }}>Clear all</button>
        </div>
      )}

      {/* Users directory Table */}
      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email Address</th>
              <th>Phone</th>
              <th>CRM Role</th>
              <th>Status</th>
              <th>Date Added</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-table-state">
                  No users found matching the selected filters.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const assignedLeadsCount = leads.filter(l => l.assignedCloserId === user.id).length;
                return (
                  <tr key={user.id} onClick={(e) => handleOpenEditModal(user)}>
                    <td className="lead-name-cell">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-sm">{user.name.split(' ').map(n => n[0]).join('')}</div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '---'}</td>
                    <td><span className="badge badge-grey">{user.role}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="toggle-status-container" onClick={() => handleStatusToggle(user)}>
                        {user.status === 'Active' ? (
                          <ToggleRight size={28} className="toggle-icon active-toggle" />
                        ) : (
                          <ToggleLeft size={28} className="toggle-icon inactive-toggle" />
                        )}
                        <span className={`status-label ${user.status.toLowerCase()}`}>{user.status}</span>
                      </div>
                    </td>
                    <td>{user.dateAdded}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="user-action-buttons">
                        <button className="icon-btn-action" onClick={() => handleTriggerResetPassword(user)} title="Send Password Reset Link">
                          <Key size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE & EDIT USER MODAL */}
      {showUserModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {selectedUser ? 'Edit User Information' : 'Add New Staff Member'}
              </h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ahmad Bello"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. closer1@beacon.com"
                  disabled={!!selectedUser}
                  style={selectedUser ? { backgroundColor: '#F2F4F7' } : {}}
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 08012345678"
                />
              </div>

              {/* Role */}
              <div className="form-group">
                <label className="form-label">CRM System Role *</label>
                <select 
                  className="form-control" 
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errors.role && <span className="form-error">{errors.role}</span>}
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Active Account Status</label>
                <select 
                  className="form-control" 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowUserModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveUser}>
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Filter Users</h3>
              <button className="modal-close" onClick={() => setShowFilterModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-control" value={pendingFilterRole} onChange={e => setPendingFilterRole(e.target.value)}>
                  <option value="All">All Roles</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={pendingFilterStatus} onChange={e => setPendingFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Active">Active Only</option>
                  <option value="Inactive">Inactive Only</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => { setPendingFilterRole('All'); setPendingFilterStatus('All'); setFilterRole('All'); setFilterStatus('All'); setShowFilterModal(false); }}>Reset</button>
              <button className="btn" onClick={() => setShowFilterModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => { setFilterRole(pendingFilterRole); setFilterStatus(pendingFilterStatus); setShowFilterModal(false); }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}



      <style>{`
        .user-management-page {
          animation: fadeIn 0.25s ease-out;
        }

        .user-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .toolbar-search {
          position: relative;
          flex: 1;
          max-width: 400px;
        }

        .toolbar-search .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-placeholder);
        }

        .toolbar-search input {
          padding-left: 40px;
        }

        .toolbar-filters {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .filter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .filter-item select {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
        }

        .avatar-sm {
          width: 32px;
          height: 32px;
          background-color: var(--primary-red);
          color: white;
          font-size: 11px;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-status-container {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .toggle-icon {
          transition: var(--transition-normal);
        }

        .active-toggle {
          color: #027A48;
        }

        .inactive-toggle {
          color: var(--text-placeholder);
        }

        .status-label {
          font-size: 13px;
          font-weight: 600;
        }

        .status-label.active {
          color: #027A48;
        }

        .status-label.inactive {
          color: var(--text-placeholder);
        }

        .user-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .icon-btn-action {
          background: none;
          border: none;
          color: var(--text-placeholder);
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          transition: var(--transition-normal);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-btn-action:hover {
          background-color: var(--border-color);
          color: var(--text-primary);
        }

        .icon-btn-action.text-red:hover {
          background-color: #FEF3F2;
          color: #D92D20;
        }

        .reassign-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 8px;
        }

        .alert-text-red {
          color: var(--primary-red);
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .user-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .toolbar-search {
            width: 100%;
            max-width: none;
          }
          .toolbar-filters {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
}
