import React, { useState, useEffect } from 'react';
import { Save, Check, ShieldAlert } from 'lucide-react';
import { dataService } from '../data/dataService';

export default function Settings({ currentUser, onUserChange }) {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [formData, setFormData] = useState({
    contactHoursLimit: 24,
    dormancyDaysThreshold: 7,
    inspectionConfirmationHours: 24,
    remindersTiming: "1 hour before"
  });

  const [notificationsToggles, setNotificationsToggles] = useState({
    newLeadUnassigned: true,
    closerNoContact: true,
    missedFollowUp: true,
    leadDormant: true,
    inspectionNotConfirmed: true,
    stageChanged: true
  });

  const [errors, setErrors] = useState({});
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    // Load settings from the data layer (demo db.* or live backend)
    dataService.getSettings().then(currentSettings => {
      if (currentSettings) {
        setFormData({
          contactHoursLimit: currentSettings.contactHoursLimit || 24,
          dormancyDaysThreshold: currentSettings.dormancyDaysThreshold || 7,
          inspectionConfirmationHours: currentSettings.inspectionConfirmationHours || 24,
          remindersTiming: currentSettings.remindersTiming || "1 hour before"
        });
      }
    });
  }, []);

  const validate = () => {
    const err = {};
    const dormancy = parseInt(formData.dormancyDaysThreshold, 10);
    if (isNaN(dormancy) || dormancy < 1) {
      err.dormancyDaysThreshold = 'Threshold must be at least 1 day.';
    }
    const contact = parseInt(formData.contactHoursLimit, 10);
    if (isNaN(contact) || contact < 1) {
      err.contactHoursLimit = 'Threshold must be at least 1 hour.';
    }
    const inspection = parseInt(formData.inspectionConfirmationHours, 10);
    if (isNaN(inspection) || inspection < 1) {
      err.inspectionConfirmationHours = 'Threshold must be at least 1 hour.';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    await dataService.saveSettings({
      contactHoursLimit: parseInt(formData.contactHoursLimit, 10),
      dormancyDaysThreshold: parseInt(formData.dormancyDaysThreshold, 10),
      inspectionConfirmationHours: parseInt(formData.inspectionConfirmationHours, 10),
      remindersTiming: formData.remindersTiming
    });

    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const handleToggle = (key) => {
    setNotificationsToggles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="settings-page animate-slide">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Settings</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure notification thresholds, escalation timing, and alerts preferences.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      {successToast && (
        <div className="bulk-status-toast">
          <Check size={16} />
          <span>Settings successfully saved and applied system-wide immediately.</span>
        </div>
      )}

      <div className="settings-layout-grid">
        <div className="settings-column">
          <div className="card">
            <h3 className="section-title">System Alert Thresholds</h3>
            <p className="section-desc">These options configure background alert metrics used across the entire company portfolio.</p>
            
            {currentUser.role !== 'Super Admin' ? (
              <div className="restricted-settings-block">
                <ShieldAlert size={20} />
                <span>Threshold editing is restricted to Super Admin profile. Viewing read-only values.</span>
              </div>
            ) : null}

            <fieldset disabled={currentUser.role !== 'Super Admin'} style={{ border: 'none' }}>
              <div className="form-group">
                <label className="form-label">Contact Time Limit (Hours)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={formData.contactHoursLimit}
                  onChange={e => setFormData({ ...formData, contactHoursLimit: e.target.value })}
                  placeholder="e.g. 24"
                />
                <span className="input-field-hint">Hours remaining before a new lead must be contacted by their closer.</span>
                {errors.contactHoursLimit && <span className="form-error">{errors.contactHoursLimit}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Dormancy Threshold (Days)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={formData.dormancyDaysThreshold}
                  onChange={e => setFormData({ ...formData, dormancyDaysThreshold: e.target.value })}
                  placeholder="e.g. 7"
                />
                <span className="input-field-hint">Days of complete system activity silence before a lead is flagged as 'Dormant'.</span>
                {errors.dormancyDaysThreshold && <span className="form-error">{errors.dormancyDaysThreshold}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Auto-Confirmation Window (Hours)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={formData.inspectionConfirmationHours}
                  onChange={e => setFormData({ ...formData, inspectionConfirmationHours: e.target.value })}
                  placeholder="e.g. 24"
                />
                <span className="input-field-hint">Hours before inspection date when system flags non-confirmed events.</span>
                {errors.inspectionConfirmationHours && <span className="form-error">{errors.inspectionConfirmationHours}</span>}
              </div>
            </fieldset>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 className="section-title">Change Password</h3>
            <p className="section-desc">Update your login password to keep your account secure.</p>

            {passwordSuccess && (
              <div className="password-success-banner">
                <Check size={16} />
                <span>Password successfully updated.</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setPasswordErrors({});
              setPasswordSuccess(false);

              const errs = {};
              if (!passwordData.currentPassword) {
                errs.currentPassword = 'Current password is required.';
              }

              if (!passwordData.newPassword) {
                errs.newPassword = 'New password is required.';
              } else if (passwordData.newPassword.length < 6) {
                errs.newPassword = 'Password must be at least 6 characters.';
              }

              if (passwordData.newPassword !== passwordData.confirmPassword) {
                errs.confirmPassword = 'Passwords do not match.';
              }

              if (Object.keys(errs).length > 0) {
                setPasswordErrors(errs);
                return;
              }

              try {
                const updatedUser = await dataService.changePassword(
                  passwordData.currentPassword,
                  passwordData.newPassword
                );

                if (typeof onUserChange === 'function' && updatedUser) {
                  onUserChange(updatedUser);
                }
              } catch (err) {
                setPasswordErrors({ currentPassword: err.status === 400 ? (err.body?.current_password?.[0] || err.message) : 'Incorrect current password.' });
                return;
              }

              setPasswordSuccess(true);
              setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
              setTimeout(() => setPasswordSuccess(false), 3000);
            }}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                />
                {passwordErrors.currentPassword && <span className="form-error">{passwordErrors.currentPassword}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
                {passwordErrors.newPassword && <span className="form-error">{passwordErrors.newPassword}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password" 
                  className="form-control" 
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
                {passwordErrors.confirmPassword && <span className="form-error">{passwordErrors.confirmPassword}</span>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
                Update Password
              </button>
            </form>
          </div>
        </div>

        <div className="settings-column">
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title">Notification Alerts Preferences</h3>
            <p className="section-desc">Toggle which email and in-app bell alerts are delivered to your account profile.</p>

            <div className="toggles-list">
              <div className="toggle-setting-row">
                <div className="toggle-text-col">
                  <strong>New Lead Unassigned</strong>
                  <span>Get notified when a new lead lacks closer ownership for over threshold limits.</span>
                </div>
                <input 
                  type="checkbox" 
                  className="ios-switch" 
                  checked={notificationsToggles.newLeadUnassigned}
                  onChange={() => handleToggle('newLeadUnassigned')}
                />
              </div>

              <div className="toggle-setting-row">
                <div className="toggle-text-col">
                  <strong>Closer Contact Delays</strong>
                  <span>Alert when a closer has not contacted a lead within the configured contact window.</span>
                </div>
                <input 
                  type="checkbox" 
                  className="ios-switch" 
                  checked={notificationsToggles.closerNoContact}
                  onChange={() => handleToggle('closerNoContact')}
                />
              </div>

              <div className="toggle-setting-row">
                <div className="toggle-text-col">
                  <strong>Overdue / Missed Follow-ups</strong>
                  <span>Notification when follow-up timelines elapse without contact activities.</span>
                </div>
                <input 
                  type="checkbox" 
                  className="ios-switch" 
                  checked={notificationsToggles.missedFollowUp}
                  onChange={() => handleToggle('missedFollowUp')}
                />
              </div>

              <div className="toggle-setting-row">
                <div className="toggle-text-col">
                  <strong>Lead Dormancy Flags</strong>
                  <span>Get alerts when active leads remain untouched for threshold days.</span>
                </div>
                <input 
                  type="checkbox" 
                  className="ios-switch" 
                  checked={notificationsToggles.leadDormant}
                  onChange={() => handleToggle('leadDormant')}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Reminder Timings</h3>
            <div className="form-group">
              <label className="form-label">Default Reminder Offset</label>
              <select 
                className="form-control"
                value={formData.remindersTiming}
                onChange={e => setFormData({ ...formData, remindersTiming: e.target.value })}
              >
                <option value="day of">Day of scheduled follow-up</option>
                <option value="1 hour before">1 hour before due time</option>
                <option value="2 hours before">2 hours before due time</option>
                <option value="1 day before">24 hours before due date</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .settings-page {
          animation: fadeIn 0.25s ease-out;
        }

        .settings-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
        }

        .section-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .input-field-hint {
          display: block;
          font-size: 11px;
          color: var(--text-placeholder);
          margin-top: 4px;
        }

        .restricted-settings-block {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #FFF5F5;
          color: var(--primary-red);
          border: 1px solid var(--primary-red-light-border);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .toggles-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .toggle-setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .toggle-setting-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .toggle-text-col {
          display: flex;
          flex-direction: column;
          gap: 2px;
          max-width: 80%;
        }

        .toggle-text-col strong {
          font-size: 14px;
          color: var(--text-primary);
        }

        .toggle-text-col span {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .ios-switch {
          appearance: none;
          width: 44px;
          height: 24px;
          background-color: var(--border-color);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          outline: none;
          transition: background-color 0.2s;
        }

        .ios-switch:checked {
          background-color: var(--primary-red);
        }

        .ios-switch::before {
          content: "";
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: white;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
          box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
        }

        .ios-switch:checked::before {
          transform: translateX(20px);
        }

        .password-success-banner {
          background: #ECFDF3;
          border: 1px solid #D1FADF;
          color: #027A48;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        @media (max-width: 1024px) {
          .settings-layout-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
