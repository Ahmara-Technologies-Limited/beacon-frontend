import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db } from '../data/mockData';

export default function LogActivityModal({ leadId, isOpen, onClose, onSaveComplete, currentUser }) {
  const [formData, setFormData] = useState({
    type: 'Call',
    date: '',
    summary: '',
    objections: '',
    feedback: '',
    outcome: '',
    nextStep: '',
    updateFollowUp: false,
    followUpDate: '',
    updateStage: false,
    pipelineStage: ''
  });

  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen && leadId) {
      const leads = db.getLeads();
      const lead = leads.find(l => l.id === leadId);
      
      // Default dates
      const now = new Date();
      const formattedNow = now.toISOString().slice(0, 16);

      setFormData({
        type: 'Call',
        date: formattedNow,
        summary: '',
        objections: '',
        feedback: '',
        outcome: '',
        nextStep: lead ? lead.nextAction : '',
        updateFollowUp: false,
        followUpDate: '',
        updateStage: false,
        pipelineStage: lead ? lead.stage : 'New Lead'
      });
      setErrors({});
      setIsDirty(false);
    }
  }, [leadId, isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (field, val) => {
    setIsDirty(true);
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Are you sure you want to discard them?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const validate = () => {
    const err = {};
    if (!formData.type) err.type = 'Activity Type is required.';
    if (!formData.summary.trim()) err.summary = 'Conversation Summary is required.';
    if (!formData.nextStep.trim()) err.nextStep = 'Next Step is required.';
    
    if (formData.updateFollowUp && !formData.followUpDate) {
      err.followUpDate = 'New Follow-Up Date is required.';
    }
    if (formData.updateStage && !formData.pipelineStage) {
      err.pipelineStage = 'New Pipeline Stage is required.';
    }

    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    db.saveActivity({
      leadId,
      date: formData.date,
      type: formData.type,
      summary: formData.summary,
      objections: formData.objections || 'None',
      feedback: formData.feedback || 'N/A',
      nextStep: formData.nextStep,
      loggedBy: currentUser.name,
      updateFollowUp: formData.updateFollowUp,
      followUpDate: formData.followUpDate,
      updateStage: formData.updateStage,
      pipelineStage: formData.pipelineStage
    });

    onSaveComplete();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">Log Activity / Conversation</h3>
          <button className="modal-close" onClick={handleClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="activity-form-grid">
            {/* Activity Type */}
            <div className="form-group">
              <label className="form-label">Activity Type *</label>
              <select 
                className="form-control" 
                value={formData.type}
                onChange={e => handleFieldChange('type', e.target.value)}
              >
                {['Call', 'WhatsApp', 'SMS', 'Email', 'Voice Note', 'Meeting', 'Internal Note'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date & Time */}
            <div className="form-group">
              <label className="form-label">Interaction Date & Time *</label>
              <input 
                type="datetime-local" 
                className="form-control" 
                value={formData.date}
                onChange={e => handleFieldChange('date', e.target.value)}
              />
            </div>

            {/* Summary */}
            <div className="form-group full-width">
              <label className="form-label">Conversation Summary *</label>
              <textarea 
                className="form-control" 
                rows="3"
                value={formData.summary}
                onChange={e => handleFieldChange('summary', e.target.value)}
                placeholder="What did you discuss with the client? Be descriptive."
              />
              {errors.summary && <span className="form-error">{errors.summary}</span>}
            </div>

            {/* Objections */}
            <div className="form-group">
              <label className="form-label">Objections Raised</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.objections}
                onChange={e => handleFieldChange('objections', e.target.value)}
                placeholder="e.g. Price, location, timeline (optional)"
              />
            </div>

            {/* Client Feedback */}
            <div className="form-group">
              <label className="form-label">Client Feedback</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.feedback}
                onChange={e => handleFieldChange('feedback', e.target.value)}
                placeholder="e.g. Positive interest, requested floorplan (optional)"
              />
            </div>

            {/* Next Step */}
            <div className="form-group full-width">
              <label className="form-label">Next Step *</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.nextStep}
                onChange={e => handleFieldChange('nextStep', e.target.value)}
                placeholder="What needs to be done next for this lead?"
              />
              {errors.nextStep && <span className="form-error">{errors.nextStep}</span>}
            </div>

            {/* Checkbox: Update Follow Up */}
            <div className="form-group full-width checkbox-option-group">
              <label className="checkbox-label-container">
                <input 
                  type="checkbox" 
                  checked={formData.updateFollowUp}
                  onChange={e => handleFieldChange('updateFollowUp', e.target.checked)}
                />
                <span className="checkbox-text">Update the Follow-Up Date & Time for this lead</span>
              </label>

              {formData.updateFollowUp && (
                <div className="checkbox-conditional-input animate-slide">
                  <label className="form-label">New Follow-Up Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={formData.followUpDate}
                    onChange={e => handleFieldChange('followUpDate', e.target.value)}
                  />
                  {errors.followUpDate && <span className="form-error">{errors.followUpDate}</span>}
                </div>
              )}
            </div>

            {/* Checkbox: Update Pipeline Stage */}
            <div className="form-group full-width checkbox-option-group">
              <label className="checkbox-label-container">
                <input 
                  type="checkbox" 
                  checked={formData.updateStage}
                  onChange={e => handleFieldChange('updateStage', e.target.checked)}
                />
                <span className="checkbox-text">Update lead's Pipeline Stage</span>
              </label>

              {formData.updateStage && (
                <div className="checkbox-conditional-input animate-slide">
                  <label className="form-label">New Pipeline Stage *</label>
                  <select 
                    className="form-control" 
                    value={formData.pipelineStage}
                    onChange={e => handleFieldChange('pipelineStage', e.target.value)}
                  >
                    {[
                      "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
                      "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
                      "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
                    ].map(stg => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
                  </select>
                  {errors.pipelineStage && <span className="form-error">{errors.pipelineStage}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Log Activity</button>
        </div>
      </div>

      <style>{`
        .activity-form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .activity-form-grid .form-group.full-width {
          grid-column: span 2;
        }

        .checkbox-option-group {
          background-color: var(--color-grey-bg);
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          margin-bottom: 8px;
        }

        .checkbox-label-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .checkbox-text {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .checkbox-conditional-input {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px dashed var(--border-color);
        }

        .animate-slide {
          animation: slideUp 0.15s ease-out;
        }

        @media (max-width: 768px) {
          .activity-form-grid {
            grid-template-columns: 1fr;
          }
          .activity-form-grid .form-group.full-width {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
