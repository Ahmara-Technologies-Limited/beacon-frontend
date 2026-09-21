import React, { useState, useEffect } from 'react';
import { Save, Check, Lock, User as UserIcon, Building2 } from 'lucide-react';
import { dataService } from '../data/dataService';
import { notifySuccess, notifyError, notifyLoadError } from '../lib/toast';
import { can } from '../lib/permissions';
import { getPushStatus, enablePush, disablePush, pushSupported } from '../lib/push';

// Settings, split by who a setting belongs to.
//
// The page used to mix the two: alert thresholds that describe company policy
// sat beside "your account profile" notification toggles, and a "Reminder
// Timings" control that read as personal while writing to the company-wide
// singleton. Staff without settings.manage were shown an editable form whose
// save always 403'd, and the notification toggles were component state that
// no save path ever included - you could switch them, be told the settings
// were saved, and find them reset on reload.
//
// So: My Account is everyone's, and is per-user for real. Company
// Configuration needs settings.manage, and is shown as plain read-only values
// to everyone else rather than as a form that refuses to submit.

const NOTIFICATION_TOGGLES = [
  {
    key: 'notify_new_lead_unassigned',
    label: 'New Lead Unassigned',
    description: 'A new lead has had no closer for longer than the contact time limit.',
  },
  {
    key: 'notify_closer_no_contact',
    label: 'Closer Has Not Made Contact',
    description: 'An assigned lead is still waiting on its first contact attempt.',
  },
  {
    key: 'notify_missed_follow_up',
    label: 'Missed Follow-Up',
    description: 'A scheduled follow-up date has passed without activity.',
  },
  {
    key: 'notify_lead_dormant',
    label: 'Lead Gone Dormant',
    description: 'A lead has had no activity for longer than the dormancy threshold.',
  },
];

export default function Settings({ currentUser, onUserChange }) {
  const canManageCompany = can(currentUser, 'settings.manage');

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [preferences, setPreferences] = useState(null);
  const [isSavingPreference, setIsSavingPreference] = useState(false);

  const [push, setPush] = useState(null);
  const [isTogglingPush, setIsTogglingPush] = useState(false);

  const [formData, setFormData] = useState({
    contactHoursLimit: 24,
    dormancyDaysThreshold: 7,
    inspectionConfirmationHours: 24,
  });
  const [errors, setErrors] = useState({});
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  useEffect(() => {
    dataService.getSettings()
      .then(currentSettings => {
        if (!currentSettings) return;
        setFormData({
          contactHoursLimit: currentSettings.contactHoursLimit ?? 24,
          dormancyDaysThreshold: currentSettings.dormancyDaysThreshold ?? 7,
          inspectionConfirmationHours: currentSettings.inspectionConfirmationHours ?? 24,
        });
      })
      .catch(err => notifyLoadError(err, 'Could not load company settings.'));

    dataService.getMyPreferences()
      .then(setPreferences)
      .catch(err => notifyLoadError(err, 'Could not load your notification preferences.'));

    getPushStatus().then(setPush).catch(() => setPush(null));
  }, []);

  // Must run from the click itself: browsers refuse a permission prompt that
  // is not tied to a user gesture, and iOS is the strictest about it.
  const handlePushToggle = async () => {
    if (isTogglingPush) return;
    setIsTogglingPush(true);
    try {
      if (push?.subscribed) {
        await disablePush();
        notifySuccess('Push notifications turned off for this device.');
      } else {
        await enablePush();
        notifySuccess('Push notifications turned on for this device.');
      }
      setPush(await getPushStatus());
    } catch (err) {
      notifyError(err, 'Could not change push notifications on this device.');
    } finally {
      setIsTogglingPush(false);
    }
  };

  const handleTestPush = async () => {
    try {
      const { delivered } = await dataService.sendTestPush();
      if (delivered > 0) {
        notifySuccess(`Test sent to ${delivered} device${delivered === 1 ? '' : 's'}.`);
      } else {
        notifyError(null, 'The test was created but no device accepted it. Try turning push off and on again.');
      }
    } catch (err) {
      notifyError(err, 'Could not send a test notification.');
    }
  };

  // Each of these fails differently, so each says something different.
  const pushExplanation = () => {
    if (!pushSupported()) {
      return 'This browser cannot receive push notifications. On iPhone, add Beacon CRM to your home screen first - Safari only supports push for installed apps.';
    }
    if (push && !push.workerReady) {
      return 'Push needs the installed app or a secure (https) connection - it is unavailable on this address.';
    }
    if (push && !push.available) {
      return 'Push notifications are not configured on the server yet, so there is nothing to turn on.';
    }
    if (push?.permission === 'denied') {
      return 'Notifications are blocked for this site. Allow them in your browser settings, then turn this on.';
    }
    if (push?.subscribed) {
      return `Alerts will reach this device even when Beacon CRM is closed.${push.deviceCount > 1 ? ` You have ${push.deviceCount} devices receiving push.` : ''}`;
    }
    return 'Get the alerts above on this device even when Beacon CRM is closed.';
  };

  const pushDisabled =
    isTogglingPush ||
    !pushSupported() ||
    !push?.workerReady ||
    !push?.available ||
    push?.permission === 'denied';

  // Saved on change rather than behind a Save button: a switch that needs
  // confirming elsewhere on the page is how the old toggles ended up silently
  // discarding what people set.
  const handleToggle = async (key) => {
    if (!preferences || isSavingPreference) return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setIsSavingPreference(true);
    try {
      await dataService.saveMyPreferences({ [key]: next[key] });
    } catch (err) {
      setPreferences(previous);
      notifyError(err, 'Could not save that preference.');
    } finally {
      setIsSavingPreference(false);
    }
  };

  const validateCompanySettings = () => {
    const errs = {};
    const positiveInt = (value) => Number.isInteger(Number(value)) && Number(value) > 0;
    if (!positiveInt(formData.contactHoursLimit)) errs.contactHoursLimit = 'Enter a number of hours greater than zero.';
    if (!positiveInt(formData.dormancyDaysThreshold)) errs.dormancyDaysThreshold = 'Enter a number of days greater than zero.';
    if (!positiveInt(formData.inspectionConfirmationHours)) errs.inspectionConfirmationHours = 'Enter a number of hours greater than zero.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCompanySettings = async () => {
    if (isSavingSettings || !validateCompanySettings()) return;
    setIsSavingSettings(true);
    try {
      await dataService.saveSettings({
        contactHoursLimit: parseInt(formData.contactHoursLimit, 10),
        dormancyDaysThreshold: parseInt(formData.dormancyDaysThreshold, 10),
        inspectionConfirmationHours: parseInt(formData.inspectionConfirmationHours, 10),
      });
      notifySuccess('Company settings saved and applied system-wide.');
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      notifyError(err, 'Could not save these settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (isChangingPassword) return;
    setPasswordErrors({});
    setPasswordSuccess(false);

    const errs = {};
    if (!passwordData.currentPassword) errs.currentPassword = 'Current password is required.';
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

    setIsChangingPassword(true);
    try {
      const updatedUser = await dataService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      if (typeof onUserChange === 'function' && updatedUser) onUserChange(updatedUser);
    } catch (err) {
      const message = err.status === 400
        ? (err.body?.current_password?.[0] || err.message)
        : 'Incorrect current password.';
      setPasswordErrors({ currentPassword: message });
      notifyError(null, message);
      setIsChangingPassword(false);
      return;
    }

    notifySuccess('Password successfully updated.');
    setPasswordSuccess(true);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setIsChangingPassword(false);
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const COMPANY_FIELDS = [
    {
      key: 'contactHoursLimit',
      label: 'Contact Time Limit',
      unit: 'hours',
      hint: 'How long a new lead may sit before it is flagged as uncontacted on the dashboard.',
    },
    {
      key: 'dormancyDaysThreshold',
      label: 'Dormancy Threshold',
      unit: 'days',
      hint: 'How long without activity before a lead is marked Dormant.',
    },
    {
      key: 'inspectionConfirmationHours',
      label: 'Inspection Confirmation Window',
      unit: 'hours',
      hint: 'How long before a site tour the client is expected to confirm.',
    },
  ];

  return (
    <div className="settings-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Settings</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your account, and how the system treats the company portfolio.</p>
        </div>
      </div>

      {successToast && (
        <div className="settings-success-banner">
          <Check size={16} />
          <span>Company settings saved and applied system-wide.</span>
        </div>
      )}

      <div className="settings-section">
        <div className="settings-section-head">
          <UserIcon size={16} />
          <div>
            <h2>My Account</h2>
            <p>Applies to you alone. Every role can change these.</p>
          </div>
        </div>

        <div className="settings-layout-grid">
          <div className="card">
            <h3 className="section-title">Change Password</h3>
            <p className="section-desc">Update your login password to keep your account secure.</p>

            {passwordSuccess && (
              <div className="password-success-banner">
                <Check size={16} />
                <span>Password successfully updated.</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
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
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                />
                {passwordErrors.confirmPassword && <span className="form-error">{passwordErrors.confirmPassword}</span>}
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="section-title">My Notification Alerts</h3>
            <p className="section-desc">
              Which alerts reach your notification bell. Saved as you switch them, and applies
              to your account only.
            </p>

            {!preferences ? (
              <p className="settings-muted">Loading your preferences…</p>
            ) : (
              <div className="toggles-list">
                {NOTIFICATION_TOGGLES.map(toggle => (
                  <div className="toggle-setting-row" key={toggle.key}>
                    <div className="toggle-text-col">
                      <strong>{toggle.label}</strong>
                      <span>{toggle.description}</span>
                    </div>
                    <input
                      type="checkbox"
                      className="ios-switch"
                      checked={!!preferences[toggle.key]}
                      onChange={() => handleToggle(toggle.key)}
                      aria-label={toggle.label}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="push-block">
              <div className="toggle-setting-row">
                <div className="toggle-text-col">
                  <strong>Push to this device</strong>
                  <span>{pushExplanation()}</span>
                </div>
                <input
                  type="checkbox"
                  className="ios-switch"
                  checked={!!push?.subscribed}
                  onChange={handlePushToggle}
                  disabled={pushDisabled}
                  aria-label="Push notifications on this device"
                />
              </div>
              {push?.subscribed && (
                <button type="button" className="btn btn-sm push-test-btn" onClick={handleTestPush}>
                  Send a test notification
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-head">
          <Building2 size={16} />
          <div>
            <h2>Company Configuration</h2>
            <p>
              Applies to everyone in Beacon CRM.
              {canManageCompany
                ? ' Changing a threshold changes what the whole team sees as at-risk.'
                : ' Changed by a Super Admin or General Manager.'}
            </p>
          </div>
          {!canManageCompany && (
            <span className="settings-readonly-badge">
              <Lock size={12} />
              <span>View only</span>
            </span>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">System Alert Thresholds</h3>
          <p className="section-desc">
            These drive the at-risk and dormancy flags on the dashboard and lead lists.
          </p>

          {canManageCompany ? (
            <>
              <div className="settings-field-grid">
                {COMPANY_FIELDS.map(field => (
                  <div className="form-group" key={field.key}>
                    <label className="form-label">{field.label} ({field.unit})</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      value={formData[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                    />
                    <span className="input-field-hint">{field.hint}</span>
                    {errors[field.key] && <span className="form-error">{errors[field.key]}</span>}
                  </div>
                ))}
              </div>
              <button
                className="btn btn-primary"
                onClick={handleSaveCompanySettings}
                disabled={isSavingSettings}
                style={{ marginTop: '8px' }}
              >
                <Save size={15} />
                <span>{isSavingSettings ? 'Saving…' : 'Save company settings'}</span>
              </button>
            </>
          ) : (
            // Plain values rather than a disabled form: a greyed-out input
            // still invites the click, and the save behind it would 403.
            <dl className="settings-readonly-list">
              {COMPANY_FIELDS.map(field => (
                <div key={field.key}>
                  <dt>{field.label}</dt>
                  <dd>
                    <strong>{formData[field.key]}</strong> {field.unit}
                    <span>{field.hint}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <style>{`
        .settings-page { animation: fadeIn 0.25s ease-out; }

        .page-header-row { margin-bottom: 8px; }
        .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
        .page-subtitle { font-size: 14px; color: var(--text-secondary); }

        .settings-section { margin-top: 28px; }

        .settings-section-head {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
          color: var(--text-secondary);
        }

        .settings-section-head h2 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 2px;
        }

        .settings-section-head p { font-size: 12.5px; margin: 0; line-height: 1.5; }
        .settings-section-head > svg { margin-top: 2px; flex-shrink: 0; }

        .settings-readonly-badge {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          background: var(--color-grey-bg);
          padding: 5px 10px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .settings-layout-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }

        .settings-field-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 8px;
        }

        .section-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; line-height: 1.4; }
        .settings-muted { font-size: 13px; color: var(--text-secondary); }

        .input-field-hint { display: block; font-size: 11px; color: var(--text-placeholder); margin-top: 4px; line-height: 1.45; }

        .settings-readonly-list { margin: 0; display: grid; gap: 16px; }
        .settings-readonly-list dt { font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
        .settings-readonly-list dd { margin: 4px 0 0; font-size: 14px; color: var(--text-primary); }
        .settings-readonly-list dd strong { font-size: 18px; font-weight: 700; }
        .settings-readonly-list dd span { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.45; }

        /* Carried over from the previous Settings page - the toggles moved,
           the control did not. */
        .ios-switch {
          appearance: none;
          width: 44px;
          height: 24px;
          background-color: var(--border-color);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          outline: none;
          flex-shrink: 0;
          transition: background-color 0.2s;
        }

        .ios-switch:checked { background-color: var(--primary-red); }

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

        .ios-switch:checked::before { transform: translateX(20px); }

        .toggles-list { display: flex; flex-direction: column; gap: 4px; }

        /* Separated from the per-alert switches above: those choose which
           alerts exist for you, this chooses whether this particular device
           hears them. */
        .push-block {
          margin-top: 16px;
          padding-top: 4px;
          border-top: 1px solid var(--border-color);
        }

        .push-block .ios-switch:disabled { opacity: 0.4; cursor: not-allowed; }
        .push-test-btn { margin-top: 4px; }

        .toggle-setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid var(--border-color);
        }

        .toggle-setting-row:last-child { border-bottom: none; }

        .toggle-text-col { display: flex; flex-direction: column; gap: 3px; }
        .toggle-text-col strong { font-size: 13px; color: var(--text-primary); }
        .toggle-text-col span { font-size: 12px; color: var(--text-secondary); line-height: 1.45; }

        .settings-success-banner,
        .password-success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: rgba(6,118,71,0.08);
          color: var(--color-success-text, #067647);
          border: 1px solid rgba(6,118,71,0.25);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .settings-layout-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
