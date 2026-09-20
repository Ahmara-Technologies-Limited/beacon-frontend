import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { notifySuccess, notifyError } from '../lib/toast';
import { confirmDialog } from '../lib/confirm';
import { useResetOnChange } from '../lib/useResetOnChange';

// The blank "new lead" form, in one place. It used to be spelled out twice -
// once as the useState initial value and once inside the effect that resets
// the form - and the two copies had drifted apart (different default
// category, and the initial one was missing the relationship/referral
// fields entirely), so a freshly mounted modal and a re-opened one started
// from different defaults.
const blankLead = (currentUser) => ({
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  location: '',
  source: 'Paid Ads',
  category: 'Investor Wealth',
  stage: 'New Lead',
  temperature: 'Hot',
  assignedCloserId: currentUser.role === 'Sales Closer' ? currentUser.id : '',
  branch: currentUser.role === 'Sales Closer' && currentUser.branch ? currentUser.branch : 'Lekki Branch',
  budget: '',
  propertyInterest: '',
  nextAction: '',
  followUpDate: '',
  relationshipStatus: 'Active',
  referralStatus: 'None',
  satisfactionScore: '',
  lastContactDate: '',
  referredById: ''
});

export default function LeadModal({ leadId, isOpen, onClose, onSaveComplete, onSaveAndLogActivity, currentUser }) {
  const [formData, setFormData] = useState(() => blankLead(currentUser));

  const [closers, setClosers] = useState([]);
  const [closersLoaded, setClosersLoaded] = useState(false);
  const [properties, setProperties] = useState([]);
  const [errors, setErrors] = useState({});
  const [potentialReferrers, setPotentialReferrers] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Which lead this modal is currently pointed at. Because it's mounted once
  // globally (CrmUIContext) and re-aimed rather than remounted, "am I showing
  // the right lead yet?" is a question about this key, not a separate flag
  // that the effect has to remember to raise and lower.
  const targetKey = isOpen ? (leadId ?? 'new') : 'closed';
  const [populatedFor, setPopulatedFor] = useState(null);

  // Only an existing lead has anything to wait for; a blank new-lead form is
  // ready the moment it's on screen.
  const isPopulating = isOpen && !!leadId && populatedFor !== targetKey;

  // Re-aiming the modal has to wipe the previous lead's form and errors.
  // Doing that during render rather than in the effect means the new lead's
  // form never paints with the old lead's values for a frame first.
  useResetOnChange(targetKey, () => {
    setErrors({});
    setClosersLoaded(false);
    if (!leadId) setFormData(blankLead(currentUser));
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    // Guard against out-of-order async resolution: if the user opens lead A
    // then quickly switches to lead B while A's fetches are still in
    // flight, A's response can land after B's and silently overwrite B's
    // freshly-populated form with A's stale data. Every setState below is
    // gated on `cancelled` so a stale response from a previous leadId/open
    // cycle is a no-op once this effect has been superseded.
    let cancelled = false;

    // An empty closer list is indistinguishable from a failed/forbidden
    // /users/ request unless we say which it was: report the failure, and
    // record that the fetch resolved so the select below can explain an
    // empty result instead of just rendering a dropdown with nothing in it.
    dataService.getUsers()
      .then(allUsers => {
        if (cancelled) return;
        setClosers(allUsers.filter(u => u.role === 'Sales Closer' && u.status === 'Active'));
        setClosersLoaded(true);
      })
      .catch(err => {
        if (cancelled) return;
        notifyError(err, 'Could not load the list of sales closers.');
      });

    dataService.getProperties().then(props => {
      if (cancelled) return;
      setProperties(props);
    });

    if (leadId) {
      // Single shared fetch for both the target lead and the referrer list
      // (previously two separate dataService.getLeads() calls).
      dataService.getLeads().then(leads => {
        if (cancelled) return;
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
          setFormData({
            name: lead.name,
            phone: lead.phone,
            whatsapp: lead.whatsapp || lead.phone,
            email: lead.email || '',
            location: lead.location || '',
            source: lead.source,
            category: lead.category,
            stage: lead.stage,
            temperature: lead.temperature,
            assignedCloserId: lead.assignedCloserId || '',
            branch: lead.branch || '',
            budget: lead.budget || '',
            propertyInterest: lead.propertyInterest || '',
            nextAction: lead.nextAction || '',
            followUpDate: lead.followUpDate || '',
            relationshipStatus: lead.relationshipStatus || 'Active',
            referralStatus: lead.referralStatus || 'None',
            satisfactionScore: lead.satisfactionScore || '',
            lastContactDate: lead.lastContactDate || '',
            referredById: lead.referredById || ''
          });
        }
        setPotentialReferrers(leads.filter(l => l.id !== leadId && (l.stage === 'Client/Investor' || l.stage === 'Repeat Purchase')));
        setPopulatedFor(targetKey);
      }).catch(err => {
        if (cancelled) return;
        // Mark it populated regardless: leaving the form stuck behind a
        // permanent loading state gives the user nothing to act on, whereas
        // the toast says what went wrong.
        setPopulatedFor(targetKey);
        notifyError(err, 'Could not load this lead.');
      });
    } else {
      // The blank form itself is already in place (see useResetOnChange
      // above); only the referrer list needs fetching.
      dataService.getLeads().then(leads => {
        if (cancelled) return;
        setPotentialReferrers(leads.filter(l => l.stage === 'Client/Investor' || l.stage === 'Repeat Purchase'));
      });
    }

    return () => {
      cancelled = true;
    };
  }, [leadId, isOpen, currentUser, targetKey]);

  if (!isOpen) return null;

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setFormData(prev => {
      const updated = { ...prev, phone: val };
      // Auto-fill WhatsApp if it was matching the phone before or if it is empty
      if (!prev.whatsapp || prev.whatsapp === prev.phone) {
        updated.whatsapp = val;
      }
      return updated;
    });
  };

  const validate = () => {
    const err = {};
    if (!formData.name.trim()) err.name = 'Full Name is required.';
    if (!formData.phone.trim()) err.phone = 'Phone Number is required.';
    if (!formData.source) err.source = 'Lead Source is required.';
    if (!formData.category) err.category = 'Lead Category is required.';
    if (!formData.temperature) err.temperature = 'Lead Temperature is required.';
    if (!formData.stage) err.stage = 'Pipeline Stage is required.';
    if (!formData.nextAction.trim()) err.nextAction = 'Next Action is required.';
    if (!formData.followUpDate) err.followUpDate = 'Follow-Up Date & Time is required.';

    if (currentUser.role !== 'Sales Closer' && !formData.assignedCloserId) {
      err.assignedCloserId = 'Assigned Closer is required.';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async (requestLogActivity = false) => {
    if (!validate()) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Check duplicate phone number. This used to render as a banner at the
      // top of the modal body, which meant scrolling back up to find it; it's
      // a decision, so it asks in a dialog over the form instead.
      const allLeads = await dataService.getLeads();
      const duplicate = allLeads.find(l => l.phone === formData.phone && l.id !== leadId);
      if (duplicate) {
        const proceed = await confirmDialog({
          title: 'Duplicate Phone Warning',
          message: `A lead with this phone number already exists: ${duplicate.name}. Do you want to continue saving this lead?`,
          confirmLabel: 'Continue and Save',
          cancelLabel: 'Cancel',
          danger: true
        });
        if (!proceed) return;
      }

      const payload = {
        ...formData,
        id: leadId || undefined
      };

      const savedLead = await dataService.saveLead(payload);
      notifySuccess(leadId ? 'Lead updated successfully.' : 'Lead created successfully.');

      if (requestLogActivity) {
        onSaveAndLogActivity(savedLead.id);
      } else {
        // Hand the saved record back, and say whether it's new: the leads
        // table needs it to make sure a freshly created lead is actually
        // visible rather than hidden behind whatever search/filters were
        // active when the user opened this form.
        onSaveComplete(savedLead, !leadId);
      }
    } catch (err) {
      notifyError(err, 'Could not save this lead. Please check the form and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isCloserFieldLocked = currentUser.role === 'Sales Closer';

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">{leadId ? 'Edit Lead Information' : 'Add New Lead'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ position: 'relative' }}>
          {isPopulating && (
            <div className="modal-loading-overlay">
              <span className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3, color: 'var(--primary-red)' }} />
              <span>Loading lead details…</span>
            </div>
          )}
          <div className="lead-form-grid" style={isPopulating ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Adeyemi Adelabu"
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                type="tel" 
                className="form-control" 
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="e.g. 08924752133"
              />
              {errors.phone && <span className="form-error">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input 
                type="tel" 
                className="form-control" 
                value={formData.whatsapp}
                onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="e.g. 08924752133"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. client@example.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Location / Area</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Lekki Phase 1, Lagos"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lead Source *</label>
              <select 
                className="form-control" 
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value })}
              >
                {['Paid Ads', 'Facebook', 'Instagram', 'Google', 'TikTok', 'Referral', 'Field Marketing', 'Webinar', 'Waitlist', 'Cold Calling', 'Walk-in', 'Existing Client'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Lead Category *</label>
              <select 
                className="form-control" 
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                {['Incoming Wealth', 'Active Wealth', 'Investor Wealth', 'Revival Wealth', 'Reserved Wealth', 'Market Wealth', 'Untapped Wealth'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Temperature *</label>
              <select 
                className="form-control" 
                value={formData.temperature}
                onChange={e => setFormData({ ...formData, temperature: e.target.value })}
              >
                {['Hot', 'Warm', 'Cold'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Assigned Closer *</label>
              {isCloserFieldLocked ? (
                <input 
                  type="text" 
                  className="form-control" 
                  value={currentUser.name} 
                  disabled 
                  style={{ backgroundColor: '#F2F4F7' }}
                />
              ) : (
                <select 
                  className="form-control" 
                  value={formData.assignedCloserId}
                  onChange={e => setFormData({ ...formData, assignedCloserId: e.target.value })}
                >
                  <option value="">-- Choose Closer --</option>
                  {closers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              {closersLoaded && closers.length === 0 && (
                <span className="form-error">
                  No active user has the &quot;Sales Closer&quot; role yet. Add one under User Management,
                  or re-activate an existing closer, before assigning this lead.
                </span>
              )}
              {errors.assignedCloserId && <span className="form-error">{errors.assignedCloserId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Branch *</label>
              <select 
                className="form-control" 
                value={formData.branch}
                onChange={e => setFormData({ ...formData, branch: e.target.value })}
              >
                <option value="">-- Choose Branch --</option>
                <option value="Lekki Branch">Lekki Branch (Lagos)</option>
                <option value="Maitama Branch">Maitama Branch (Abuja)</option>
                <option value="Airport Residential Branch">Airport Residential Branch (Accra)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Pipeline Stage *</label>
              <select 
                className="form-control" 
                value={formData.stage}
                onChange={e => setFormData({ ...formData, stage: e.target.value })}
              >
                {[
                  "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
                  "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
                  "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
                ].map(stg => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>
            </div>

            {(formData.stage === 'Client/Investor' || formData.stage === 'Repeat Purchase') && (
              <div className="form-group full-width client-mgmt-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--primary-red)' }}>Client Relationship Settings</h4>
                <div style={{ display: 'grid', gap: '16px' }} className="modal-subgrid-2col">
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Relationship Status</label>
                    <select 
                      className="form-control" 
                      value={formData.relationshipStatus}
                      onChange={e => setFormData({ ...formData, relationshipStatus: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Dormant">Dormant</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="At Risk">At Risk</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Referral Status</label>
                    <select 
                      className="form-control" 
                      value={formData.referralStatus}
                      onChange={e => setFormData({ ...formData, referralStatus: e.target.value })}
                    >
                      <option value="None">None</option>
                      <option value="Requested">Requested</option>
                      <option value="Generated Referral">Generated Referral</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Satisfaction Score (1-5)</label>
                    <select 
                      className="form-control" 
                      value={formData.satisfactionScore}
                      onChange={e => setFormData({ ...formData, satisfactionScore: e.target.value ? parseInt(e.target.value, 10) : '' })}
                    >
                      <option value="">-- Select Score --</option>
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Average</option>
                      <option value="2">2 - Fair</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '11px' }}>Last Contact Date</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={formData.lastContactDate}
                      onChange={e => setFormData({ ...formData, lastContactDate: e.target.value })}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label" style={{ fontSize: '11px' }}>Referred By (Client)</label>
                    <select 
                      className="form-control" 
                      value={formData.referredById}
                      onChange={e => setFormData({ ...formData, referredById: e.target.value })}
                    >
                      <option value="">-- Direct Lead / None --</option>
                      {potentialReferrers.map(client => (
                        <option key={client.id} value={client.id}>{client.name} ({client.phone})</option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Budget Range</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.budget}
                onChange={e => setFormData({ ...formData, budget: e.target.value })}
                placeholder="e.g. ₦150,000,000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Property Interest</label>
              <select 
                className="form-control" 
                value={properties.some(p => p.name === formData.propertyInterest) ? formData.propertyInterest : (formData.propertyInterest ? 'custom' : '')}
                onChange={e => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setFormData({ ...formData, propertyInterest: '' });
                  } else {
                    setFormData({ ...formData, propertyInterest: val });
                  }
                }}
              >
                <option value="">-- Select Property --</option>
                {properties.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
                <option value="custom">Custom Property...</option>
              </select>
              {(!properties.some(p => p.name === formData.propertyInterest) || formData.propertyInterest === '') && (
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.propertyInterest}
                  onChange={e => setFormData({ ...formData, propertyInterest: e.target.value })}
                  placeholder="Enter custom property interest..."
                  style={{ marginTop: '8px' }}
                />
              )}
            </div>

            <div className="form-group full-width">
              <label className="form-label">Next Action *</label>
              <textarea 
                className="form-control" 
                rows="2"
                value={formData.nextAction}
                onChange={e => setFormData({ ...formData, nextAction: e.target.value })}
                placeholder="Describe the very next task to complete for this lead..."
              />
              {errors.nextAction && <span className="form-error">{errors.nextAction}</span>}
            </div>

            <div className="form-group full-width">
              <label className="form-label">Follow-Up Date & Time *</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={formData.followUpDate}
                onChange={e => setFormData({ ...formData, followUpDate: e.target.value })}
              />
              {errors.followUpDate && <span className="form-error">{errors.followUpDate}</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Lead'}
          </button>
        </div>
      </div>

      <style>{`
        .lead-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .form-group.full-width {
          grid-column: span 2;
        }

        .modal-subgrid-2col {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 768px) {
          .lead-form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full-width {
            grid-column: span 1;
          }
          .modal-subgrid-2col {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
