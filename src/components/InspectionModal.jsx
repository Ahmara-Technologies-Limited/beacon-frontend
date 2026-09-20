import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { notifySuccess, notifyError, notifyLoadError } from '../lib/toast';
import { confirmDialog } from '../lib/confirm';
import { useResetOnChange } from '../lib/useResetOnChange';

// Module scope, not a fresh array per render: as a local it was a new
// identity every render, which made it an unstable effect dependency.
const ESTATES = [
  'Beacon Heights, Lekki',
  'Beacon Grove, Epe',
  'Beacon Waterfront, Lekki',
  'Beacon Hill, Guzape',
  'Beacon Gardens, Enugu',
  'Beacon Palms, Maitama'
];

export default function InspectionModal({ leadId, inspectionId, isOpen, onClose, onSaveComplete, currentUser }) {
  const [formData, setFormData] = useState({
    leadId: '',
    estate: 'Beacon Heights, Lekki',
    date: '',
    time: '',
    meetingPoint: '',
    assignedCloserId: '',
    inspectionOfficerId: '',
    status: 'Scheduled',
    internalNotes: '',
    noShowNote: '',
    report: '',
    feedback: '',
    nextStepRecommendation: ''
  });

  const [leads, setLeads] = useState([]);
  const [closers, setClosers] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Which inspection this modal is currently pointed at. It's mounted once
  // globally (CrmUIContext) and re-aimed rather than remounted, so "am I
  // showing the right record yet?" is a question about this key rather than a
  // separate flag the effect has to raise and lower by hand.
  const targetKey = isOpen ? `${inspectionId ?? 'new'}:${leadId ?? ''}` : 'closed';
  const [populatedFor, setPopulatedFor] = useState(null);
  const isPopulating = isOpen && populatedFor !== targetKey;

  // Re-aiming the modal clears the previous record's validation state. Done
  // during render rather than in the effect, so the new record's form never
  // paints carrying the old one's errors for a frame.
  useResetOnChange(targetKey, () => {
    setErrors({});
  });

  useEffect(() => {
    if (!isOpen) return undefined;

    // Guard against out-of-order async resolution: this modal is mounted
    // once globally (CrmUIContext) and reused across inspections, so
    // switching from editing inspection A to inspection B while A's fetch
    // is still in flight could otherwise let A's response land after B's
    // and silently overwrite B's freshly-populated form with A's stale
    // data - the same bug class found and fixed in LeadModal.
    let cancelled = false;

    Promise.all([dataService.getLeads(), dataService.getUsers()]).then(([activeLeads, allUsers]) => {
      if (cancelled) return;
      const activeClosers = allUsers.filter(u => u.role === 'Sales Closer' && u.status === 'Active');
      const activeOfficers = allUsers.filter(u => u.role === 'Inspection Officer' && u.status === 'Active');

      setLeads(activeLeads);
      setClosers(activeClosers);
      setOfficers(activeOfficers);

      if (inspectionId) {
        dataService.getInspections().then(list => {
          if (cancelled) return;
          const inspection = list.find(i => i.id === inspectionId);
          if (inspection) {
            setFormData({
              leadId: inspection.leadId,
              estate: inspection.estate,
              date: inspection.date,
              time: inspection.time,
              meetingPoint: inspection.meetingPoint,
              assignedCloserId: inspection.assignedCloserId,
              inspectionOfficerId: inspection.inspectionOfficerId,
              status: inspection.status,
              internalNotes: inspection.internalNotes || '',
              noShowNote: inspection.noShowNote || '',
              report: inspection.report || '',
              feedback: inspection.feedback || '',
              nextStepRecommendation: inspection.nextStepRecommendation || ''
            });
          }
          setPopulatedFor(targetKey);
        }).catch(err => {
          if (cancelled) return;
          // Mark it populated regardless: a form stuck behind a permanent
          // loading state gives the user nothing to act on, and the toast
          // says what actually went wrong.
          setPopulatedFor(targetKey);
          notifyLoadError(err, 'Could not load this inspection.');
        });
      } else {
        let defaultCloserId = '';
        if (leadId) {
          const lead = activeLeads.find(l => l.id === leadId);
          if (lead) {
            defaultCloserId = lead.assignedCloserId || '';
          }
        }

        setFormData({
          leadId: leadId || '',
          estate: ESTATES[0],
          date: '',
          time: '',
          meetingPoint: '',
          assignedCloserId: defaultCloserId,
          inspectionOfficerId: activeOfficers.length > 0 ? activeOfficers[0].id : '',
          status: 'Scheduled',
          internalNotes: '',
          noShowNote: '',
          report: '',
          feedback: '',
          nextStepRecommendation: ''
        });
        setPopulatedFor(targetKey);
      }
    }).catch(err => {
      if (cancelled) return;
      setPopulatedFor(targetKey);
      // Swallowing this left the closer/officer dropdowns simply empty, with
      // no way to tell a genuinely empty roster from a failed request.
      notifyLoadError(err, 'Could not load leads and team members for this form.');
    });

    return () => {
      cancelled = true;
    };
  }, [leadId, inspectionId, isOpen, targetKey]);

  if (!isOpen) return null;

  const handleLeadChange = (selectedLeadId) => {
    const selectedLead = leads.find(l => l.id === selectedLeadId);
    setFormData(prev => ({
      ...prev,
      leadId: selectedLeadId,
      assignedCloserId: selectedLead ? (selectedLead.assignedCloserId || '') : ''
    }));
  };

  const validate = () => {
    const err = {};
    if (!formData.leadId) err.leadId = 'Lead selection is required.';
    if (!formData.estate) err.estate = 'Estate / Project is required.';
    if (!formData.date) err.date = 'Inspection Date is required.';
    if (!formData.time) err.time = 'Time is required.';
    if (!formData.meetingPoint.trim()) err.meetingPoint = 'Meeting Point is required.';
    if (!formData.assignedCloserId) err.assignedCloserId = 'Assigned Closer is required.';
    if (!formData.inspectionOfficerId) err.inspectionOfficerId = 'Inspection Officer is required.';

    if (formData.status === 'Completed' && currentUser.role === 'Inspection Officer') {
      if (!formData.report.trim()) err.report = 'Inspection Report summary is required.';
      if (!formData.nextStepRecommendation.trim()) err.nextStepRecommendation = 'Next Step Recommendation is required.';
    }
    if (formData.status === 'No-Show' && !formData.noShowNote.trim()) {
      err.noShowNote = 'An explanation note is required for a No-Show status.';
    }
    if (formData.status === 'Rescheduled' && (!formData.date || !formData.time)) {
      err.reschedule = 'Please specify a new date and time.';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      // Check for active inspections on lead (only for new inspections).
      // This used to render as a banner at the top of the modal body, which
      // meant scrolling back up to find it; it's a decision, so it asks in a
      // dialog over the form instead.
      if (!inspectionId) {
        const allInspections = await dataService.getInspections();
        const activeIns = allInspections.find(
          i => i.leadId === formData.leadId &&
          (i.status === 'Scheduled' || i.status === 'Confirmed')
        );
        if (activeIns) {
          const proceed = await confirmDialog({
            title: 'Active Booking Alert',
            message: `This lead already has an upcoming inspection scheduled for ${activeIns.date} at ${activeIns.time}. Do you want to proceed and book another inspection anyway?`,
            confirmLabel: 'Confirm and Book',
            cancelLabel: 'Cancel',
            danger: true
          });
          if (!proceed) return;
        }
      }

      const payload = {
        ...formData,
        id: inspectionId || undefined
      };

      const savedInspection = await dataService.saveInspection(payload);
      notifySuccess(inspectionId ? 'Inspection updated successfully.' : 'Inspection booked successfully.');
      // Hand the record back, and say whether it's new: the inspections table
      // needs it to make sure a freshly booked inspection is actually visible
      // rather than hidden behind whatever filters were active.
      onSaveComplete(savedInspection, !inspectionId);
    } catch (err) {
      notifyError(err, 'Could not save this inspection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedLeadDetails = leads.find(l => l.id === formData.leadId);

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">
            {currentUser.role === 'Inspection Officer' ? 'Log Inspection Outcome' : (inspectionId ? 'Update Inspection Record' : 'Schedule New Inspection')}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ position: 'relative' }}>
          {isPopulating && (
            <div className="modal-loading-overlay">
              <span className="btn-spinner" style={{ width: 28, height: 28, borderWidth: 3, color: 'var(--primary-red)' }} />
              <span>Loading inspection details…</span>
            </div>
          )}
          {currentUser.role === 'Inspection Officer' ? (
            <div className="inspection-officer-modal-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px', ...(isPopulating ? { opacity: 0.35, pointerEvents: 'none' } : {}) }}>
              <div className="card" style={{ padding: '16px', background: 'var(--color-grey-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '0' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                  Inspection Assignment Details
                </h4>
                <div style={{ display: 'grid', gap: '12px 24px', fontSize: '13px' }} className="modal-subgrid-2col">
                  <div><strong>Client/Lead:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{selectedLeadDetails?.name || "N/A"}</span></div>
                  <div><strong>Estate / Property:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formData.estate}</span></div>
                  <div><strong>Scheduled Date & Time:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formData.date} @ {formData.time}</span></div>
                  <div><strong>Meeting Point:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{formData.meetingPoint || "N/A"}</span></div>
                  <div><strong>Assigned Sales Closer:</strong> <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{closers.find(c => c.id === formData.assignedCloserId)?.name || "N/A"}</span></div>
                  {formData.internalNotes && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <strong>Booking Notes:</strong> <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>&ldquo;{formData.internalNotes}&ldquo;</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Inspection Status *</label>
                  <select 
                    className="form-control" 
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="No-Show">No-Show</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {formData.status === 'Rescheduled' && (
                  <div className="inspection-report-section animate-slide modal-subgrid-2col" style={{ display: 'grid', gap: '16px', background: 'rgba(212,38,42,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">New Inspection Date *</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                      />
                      {errors.reschedule && <span className="form-error">{errors.reschedule}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">New Time *</label>
                      <input 
                        type="time" 
                        className="form-control" 
                        value={formData.time}
                        onChange={e => setFormData({ ...formData, time: e.target.value })}
                      />
                    </div>
                    <div className="form-group full-width" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Reason for Rescheduling *</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={formData.internalNotes}
                        onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                        placeholder="Why is the inspection being rescheduled?"
                      />
                    </div>
                  </div>
                )}

                {formData.status === 'Cancelled' && (
                  <div className="inspection-report-section animate-slide" style={{ background: 'rgba(212,38,42,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">Cancellation Reason *</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={formData.internalNotes}
                        onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                        placeholder="Provide details on the reason for cancellation..."
                      />
                    </div>
                  </div>
                )}

                {formData.status === 'Completed' && (
                  <div className="inspection-report-section animate-slide" style={{ background: 'rgba(2, 122, 72, 0.02)', border: '1px solid #D0F5E3', padding: '20px', borderRadius: '8px' }}>
                    <h4 className="report-title" style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-success-text)', borderBottom: '1px dashed #D0F5E3', paddingBottom: '8px', marginBottom: '12px' }}>
                      Submit Inspection Report
                    </h4>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Inspection Report Summary *</label>
                      <textarea 
                        className="form-control" 
                        rows="3"
                        value={formData.report}
                        onChange={e => setFormData({ ...formData, report: e.target.value })}
                        placeholder="Summarize the site visit findings, client reaction, features viewed..."
                      />
                      {errors.report && <span className="form-error">{errors.report}</span>}
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label">Client Feedback</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.feedback}
                        onChange={e => setFormData({ ...formData, feedback: e.target.value })}
                        placeholder="e.g. Loved the road network but wanted a bigger backyard."
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Next Step Recommendation *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.nextStepRecommendation}
                        onChange={e => setFormData({ ...formData, nextStepRecommendation: e.target.value })}
                        placeholder="e.g. Send payment plan for Plot 15, or arrange secondary inspection."
                      />
                      {errors.nextStepRecommendation && <span className="form-error">{errors.nextStepRecommendation}</span>}
                    </div>
                  </div>
                )}

                {formData.status === 'No-Show' && (
                  <div className="inspection-report-section animate-slide" style={{ background: 'rgba(212,38,42,0.02)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                    <div className="form-group">
                      <label className="form-label">No-Show Explanation Note *</label>
                      <textarea 
                        className="form-control" 
                        rows="2"
                        value={formData.noShowNote}
                        onChange={e => setFormData({ ...formData, noShowNote: e.target.value })}
                        placeholder="Provide details on client status, call attempts, or excuses given..."
                      />
                      {errors.noShowNote && <span className="form-error">{errors.noShowNote}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="inspection-form-grid" style={isPopulating ? { opacity: 0.35, pointerEvents: 'none' } : undefined}>
              <div className="form-group full-width">
                <label className="form-label">Client / Lead *</label>
                {leadId ? (
                  <input 
                    type="text" 
                    className="form-control" 
                    value={selectedLeadDetails?.name || ""} 
                    disabled 
                    style={{ backgroundColor: '#F2F4F7' }}
                  />
                ) : (
                  <select 
                    className="form-control" 
                    value={formData.leadId}
                    onChange={e => handleLeadChange(e.target.value)}
                    disabled={!!inspectionId}
                  >
                    <option value="">-- Search and Select Lead --</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.phone})</option>
                    ))}
                  </select>
                )}
                {errors.leadId && <span className="form-error">{errors.leadId}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Estate / Project *</label>
                <select 
                  className="form-control" 
                  value={formData.estate}
                  onChange={e => setFormData({ ...formData, estate: e.target.value })}
                  disabled={currentUser.role === 'Inspection Officer'}
                >
                  {ESTATES.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Status *</label>
                <select 
                  className="form-control" 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="No-Show">No-Show</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Inspection Date *</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  disabled={currentUser.role === 'Inspection Officer' && formData.status !== 'Rescheduled'}
                />
                {errors.date && <span className="form-error">{errors.date}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Time *</label>
                <input 
                  type="time" 
                  className="form-control" 
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  disabled={currentUser.role === 'Inspection Officer' && formData.status !== 'Rescheduled'}
                />
                {errors.time && <span className="form-error">{errors.time}</span>}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Meeting Point / Instructions *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.meetingPoint}
                  onChange={e => setFormData({ ...formData, meetingPoint: e.target.value })}
                  placeholder="e.g. VGC Gatehouse, or client address"
                  disabled={currentUser.role === 'Inspection Officer'}
                />
                {errors.meetingPoint && <span className="form-error">{errors.meetingPoint}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Sales Closer *</label>
                <select 
                  className="form-control" 
                  value={formData.assignedCloserId}
                  onChange={e => setFormData({ ...formData, assignedCloserId: e.target.value })}
                  disabled={currentUser.role === 'Sales Closer' || currentUser.role === 'Inspection Officer'}
                >
                  <option value="">-- Select Closer --</option>
                  {closers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.assignedCloserId && <span className="form-error">{errors.assignedCloserId}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Inspection Officer *</label>
                <select 
                  className="form-control" 
                  value={formData.inspectionOfficerId}
                  onChange={e => setFormData({ ...formData, inspectionOfficerId: e.target.value })}
                  disabled={currentUser.role === 'Inspection Officer'}
                >
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {errors.inspectionOfficerId && <span className="form-error">{errors.inspectionOfficerId}</span>}
              </div>

              <div className="form-group full-width">
                <label className="form-label">Internal Booking Notes</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={formData.internalNotes}
                  onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="Any special notes for this inspection assignment..."
                  disabled={currentUser.role === 'Inspection Officer'}
                />
              </div>

              {formData.status === 'Completed' && (
                <div className="inspection-report-section full-width animate-slide">
                  <h4 className="report-title">Submit Inspection Report</h4>
                  
                  <div className="form-group">
                    <label className="form-label">Inspection Report Summary *</label>
                    <textarea 
                      className="form-control" 
                      rows="3"
                      value={formData.report}
                      onChange={e => setFormData({ ...formData, report: e.target.value })}
                      placeholder="Summarize the site visit findings, client reaction, features viewed..."
                    />
                    {errors.report && <span className="form-error">{errors.report}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Client Feedback</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.feedback}
                      onChange={e => setFormData({ ...formData, feedback: e.target.value })}
                      placeholder="e.g. Loved the road network but wanted a bigger backyard."
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Next Step Recommendation *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.nextStepRecommendation}
                      onChange={e => setFormData({ ...formData, nextStepRecommendation: e.target.value })}
                      placeholder="e.g. Send payment plan for Plot 15, or arrange secondary inspection."
                    />
                    {errors.nextStepRecommendation && <span className="form-error">{errors.nextStepRecommendation}</span>}
                  </div>
                </div>
              )}

              {formData.status === 'No-Show' && (
                <div className="inspection-report-section full-width animate-slide">
                  <div className="form-group">
                    <label className="form-label">No-Show Explanation Note *</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={formData.noShowNote}
                      onChange={e => setFormData({ ...formData, noShowNote: e.target.value })}
                      placeholder="Provide details on client status, call attempts, or excuses given..."
                    />
                    {errors.noShowNote && <span className="form-error">{errors.noShowNote}</span>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="btn btn-primary" onClick={() => handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving...' : (currentUser.role === 'Inspection Officer' ? 'Submit Outcome' : 'Save Booking')}
          </button>
        </div>
      </div>

      <style>{`
        .inspection-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .inspection-form-grid .form-group.full-width {
          grid-column: span 2;
        }

        .inspection-report-section {
          background-color: rgba(2, 122, 72, 0.02);
          border: 1px solid #D0F5E3;
          border-radius: var(--radius-md);
          padding: 20px;
          margin-top: 10px;
        }

        .report-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--color-success-text);
          margin-bottom: 16px;
          border-bottom: 1px dashed #D0F5E3;
          padding-bottom: 8px;
        }

        .modal-subgrid-2col {
          grid-template-columns: 1fr 1fr;
        }

        @media (max-width: 768px) {
          .inspection-form-grid {
            grid-template-columns: 1fr;
          }
          .inspection-form-grid .form-group.full-width {
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
