import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Info, Save, X, Edit2, Check } from 'lucide-react';
import { dataService } from '../data/dataService';
import { notifySuccess, notifyError, notifyLoadError } from '../lib/toast';
import { usePolling } from '../lib/usePolling';
import { getPollInterval } from '../lib/demoMode';
import { onDataChange } from '../lib/dataEvents';
import { ROLE_PROFILES, scopeNote } from '../lib/permissions';
import { formatDateTime } from '../lib/format';

// Roles & Permissions.
//
// What a role may do is stored server-side (core.RolePermission) and checked
// on every request, so this screen edits the real thing. Roles themselves are
// fixed; Super Admin and Branch Manager are locked - the first because
// unticking its own "manage staff accounts" would strand everyone outside
// role administration, the second by company policy - and the API refuses
// those writes whatever the UI shows.
//
// Laid out as a role list beside one role's permissions rather than a grid of
// eight roles: a grid that wide has to scroll sideways to be read, which is a
// poor way to answer the question people actually bring here - "what can a
// Sales Closer do?"

export default function RoleManagement({ currentUser }) {
  const [catalog, setCatalog] = useState(null);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoleName, setSelectedRoleName] = useState(null);
  const [draft, setDraft] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const loadMatrix = async () => {
    try {
      const [catalogData, roleRows] = await Promise.all([
        dataService.getPermissionCatalog(),
        dataService.getRolePermissions(),
      ]);
      setCatalog(catalogData);
      setRoles(roleRows);
    } catch (err) {
      notifyLoadError(err, 'Could not load roles and permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onDataChange(['rolePermissions'], () => loadMatrix());
    return unsubscribe;
  }, []);

  usePolling(loadMatrix, getPollInterval(5000));

  const modules = catalog?.modules || [];
  const selected = roles.find(r => r.role === selectedRoleName) || roles[0] || null;
  const editing = draft !== null && selected && draft.role === selected.role;
  const permissions = editing ? draft.permissions : selected?.permissions || [];

  const startEditing = () => {
    if (!isSuperAdmin || !selected || selected.locked) return;
    setDraft({ role: selected.role, permissions: [...selected.permissions] });
  };

  const selectRole = (role) => {
    setSelectedRoleName(role);
    setDraft(null);
  };

  // "Create / Edit" without "View" is not a state the app can render - the
  // user would be able to save a record they cannot open - so the two move
  // together in the obvious direction.
  const toggle = (moduleKey, action) => {
    const view = `${moduleKey}.view`;
    const manage = `${moduleKey}.manage`;
    setDraft(prev => {
      const held = new Set(prev.permissions);
      const target = action === 'view' ? view : manage;
      if (held.has(target)) {
        held.delete(target);
        if (action === 'view') held.delete(manage);
      } else {
        held.add(target);
        if (action === 'manage') held.add(view);
      }
      return { ...prev, permissions: [...held] };
    });
  };

  const handleSave = async () => {
    if (isSaving || !draft) return;
    setIsSaving(true);
    try {
      await dataService.updateRolePermissions(draft.role, draft.permissions);
      notifySuccess(`Permissions updated for ${draft.role}.`);
      setDraft(null);
      await loadMatrix();
    } catch (err) {
      notifyError(err, 'Could not update these permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const grantedCount = (role) =>
    modules.filter(m => (role.permissions || []).includes(m.permissions.view)).length;

  return (
    <div className="role-mgmt-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Roles &amp; Permissions</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-subtitle">
            {isSuperAdmin
              ? 'Choose a role to see what it can do. Changes take effect on the server immediately.'
              : 'What each role can do, as enforced by the server on every request.'}
          </p>
        </div>
      </div>

      <div className="role-mgmt-layout">
        <div className="role-list-panel card">
          <div className="role-list-header">
            <span className="section-title" style={{ marginBottom: 0 }}>Roles</span>
            <span className="role-count-badge">{roles.length}</span>
          </div>
          <div className="role-list">
            {isLoading && roles.length === 0 ? (
              <div className="role-list-loading">Loading roles…</div>
            ) : (
              roles.map(role => {
                const profile = ROLE_PROFILES[role.role] || {};
                return (
                  <button
                    type="button"
                    key={role.role}
                    className={`role-list-item ${selected?.role === role.role ? 'selected' : ''}`}
                    onClick={() => selectRole(role.role)}
                  >
                    <span className="role-list-dot" style={{ background: profile.color || '#344054' }} />
                    <span className="role-list-info">
                      <span className="role-list-name">{role.role}</span>
                      <span className="role-list-desc">{profile.description || ''}</span>
                      <span className="role-list-meta">
                        {grantedCount(role)} of {modules.length} modules
                      </span>
                    </span>
                    {role.locked && <Lock size={13} className="role-list-lock" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="role-detail-panel card">
          {!selected ? (
            <div className="role-detail-empty">Select a role to see its permissions.</div>
          ) : (
            <>
              <div className="role-detail-header">
                <div className="role-detail-title">
                  <span
                    className="role-list-dot"
                    style={{ background: ROLE_PROFILES[selected.role]?.color || '#344054' }}
                  />
                  <div>
                    <h2>{selected.role}</h2>
                    <p>{ROLE_PROFILES[selected.role]?.description}</p>
                  </div>
                </div>

                <div className="role-detail-actions">
                  {selected.locked ? (
                    <span className="role-fixed-badge">
                      <Lock size={13} />
                      <span>Fixed</span>
                    </span>
                  ) : editing ? (
                    <>
                      <button type="button" className="btn btn-sm" onClick={() => setDraft(null)} disabled={isSaving}>
                        <X size={14} />
                        <span>Cancel</span>
                      </button>
                      <button type="button" className="btn btn-sm btn-primary" onClick={handleSave} disabled={isSaving}>
                        <Save size={14} />
                        <span>{isSaving ? 'Saving…' : 'Save changes'}</span>
                      </button>
                    </>
                  ) : isSuperAdmin ? (
                    <button type="button" className="btn btn-sm" onClick={startEditing}>
                      <Edit2 size={14} />
                      <span>Edit permissions</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {selected.locked && (
                <div className="role-locked-note">
                  {selected.role === 'Super Admin'
                    ? 'Super Admin always holds every permission, including ones added in future releases. Making it editable would allow the last administrator to be locked out of this page.'
                    : 'Branch Manager permissions are fixed by company policy and cannot be changed here.'}
                </div>
              )}

              <div className="permission-groups">
                {modules.map(module => {
                  const hasView = permissions.includes(module.permissions.view);
                  const hasManage = permissions.includes(module.permissions.manage);
                  const note = scopeNote(selected.role, module.key);
                  return (
                    <div key={module.key} className={`permission-group ${hasView ? '' : 'muted'}`}>
                      <div className="permission-group-info">
                        <div className="permission-group-name">{module.label}</div>
                        <div className="permission-group-desc">{module.description}</div>
                        {note && hasView && (
                          <div className="permission-group-scope">
                            <Info size={12} />
                            <span>{note}</span>
                          </div>
                        )}
                      </div>
                      <div className="permission-toggles">
                        {['view', 'manage'].map(action => {
                          const on = action === 'view' ? hasView : hasManage;
                          const label = catalog?.actions?.[action] || action;
                          if (!editing) {
                            return (
                              <span key={action} className={`permission-pill ${on ? 'on' : 'off'}`}>
                                {on ? <Check size={13} /> : <X size={13} />}
                                <span>{label}</span>
                              </span>
                            );
                          }
                          return (
                            <label key={action} className={`permission-pill editable ${on ? 'on' : 'off'}`}>
                              <input
                                type="checkbox"
                                checked={on}
                                onChange={() => toggle(module.key, action)}
                              />
                              <span>{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="role-detail-foot">
                <ShieldCheck size={13} />
                <span>
                  Checked on the server for every request.
                  {selected.updated_by_name
                    ? ` Last changed by ${selected.updated_by_name}${selected.updated_on ? ` on ${formatDateTime(selected.updated_on)}` : ''}.`
                    : ' Never changed since setup.'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .role-mgmt-page { animation: fadeIn 0.25s ease-out; }

        .page-header-row { margin-bottom: 20px; }
        .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); }

        .role-mgmt-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 20px;
          align-items: start;
        }

        .role-list-panel { padding: 0; overflow: hidden; }

        .role-list-header {
          padding: 16px 18px;
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

        .role-list-loading { padding: 20px 18px; font-size: 13px; color: var(--text-secondary); }

        .role-list-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 18px;
          border: none;
          border-bottom: 1px solid var(--border-color);
          border-left: 3px solid transparent;
          background: none;
          text-align: left;
          font: inherit;
          cursor: pointer;
          transition: background 0.15s;
        }

        .role-list-item:hover { background: var(--table-hover-bg); }
        .role-list-item.selected { background: rgba(212,38,42,0.05); border-left-color: var(--primary-red); }

        .role-list-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }

        .role-list-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .role-list-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .role-list-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }
        .role-list-meta { font-size: 11px; color: var(--text-secondary); opacity: 0.8; margin-top: 2px; }
        .role-list-lock { color: var(--text-secondary); flex-shrink: 0; margin-top: 4px; }

        .role-detail-panel { padding: 0; }
        .role-detail-empty { padding: 40px; text-align: center; color: var(--text-secondary); font-size: 14px; }

        .role-detail-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .role-detail-title { display: flex; align-items: flex-start; gap: 10px; }
        .role-detail-title h2 { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0 0 3px; }
        .role-detail-title p { font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.5; }

        .role-detail-actions { display: flex; gap: 8px; flex-shrink: 0; }

        .role-fixed-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--text-secondary);
          background: var(--color-grey-bg);
          padding: 5px 10px;
          border-radius: 20px;
        }

        .role-locked-note {
          padding: 12px 20px;
          background: var(--color-grey-bg);
          border-bottom: 1px solid var(--border-color);
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .permission-group {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-color);
        }

        .permission-group.muted .permission-group-name,
        .permission-group.muted .permission-group-desc { opacity: 0.55; }

        .permission-group-info { min-width: 0; }
        .permission-group-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
        .permission-group-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; line-height: 1.45; }

        .permission-group-scope {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          margin-top: 6px;
          font-size: 11.5px;
          color: #B54708;
          line-height: 1.45;
        }

        .permission-toggles { display: flex; gap: 8px; flex-shrink: 0; }

        .permission-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border-color);
          white-space: nowrap;
        }

        .permission-pill.on { color: var(--color-success-text, #067647); border-color: rgba(6,118,71,0.3); background: rgba(6,118,71,0.06); }
        .permission-pill.off { color: var(--text-secondary); opacity: 0.7; }
        .permission-pill.editable { cursor: pointer; }
        .permission-pill.editable:hover { border-color: var(--primary-red); }
        .permission-pill.editable input { width: 14px; height: 14px; cursor: pointer; accent-color: var(--primary-red); margin: 0; }

        .role-detail-foot {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 14px 20px;
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
        }

        @media (max-width: 900px) {
          .role-mgmt-layout { grid-template-columns: 1fr; }
          .permission-group { flex-direction: column; align-items: flex-start; gap: 10px; }
        }
      `}</style>
    </div>
  );
}
