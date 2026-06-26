import React, { useState, useEffect } from 'react';
import { Phone, Calendar, Clock, User, X, Check, Eye, AlertTriangle, Filter } from 'lucide-react';
import { db } from '../data/mockData';

export default function FollowUp({ currentUser, setViewingLeadId, setCurrentTab }) {
  const [leads, setLeads] = useState([]);
  const [closers, setClosers] = useState([]);

  const [filterCloser, setFilterCloser] = useState('All');
  const [filterType, setFilterType] = useState('All'); // Follow-Up Types

  // Modal Filters State
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingFilterCloser, setPendingFilterCloser] = useState('All');
  const [pendingFilterType, setPendingFilterType] = useState('All');

  // Modal States
  const [actionLead, setActionLead] = useState(null); // Lead undergoing done/snooze
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);

  // Done modal fields
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [noFollowUpNeeded, setNoFollowUpNeeded] = useState(false);

  // Snooze modal fields
  const [snoozeDays, setSnoozeDays] = useState('1'); // 1, 2, custom
  const [snoozeCustomDate, setSnoozeCustomDate] = useState('');
  const loadFollowUpData = () => {
    setLeads(db.getLeads());
    setClosers(db.getUsers().filter(u => u.role === 'Sales Closer' && u.status === 'Active'));
  };

  const handleSendWarning = (e, lead) => {
    e.stopPropagation();
    if (!lead.assignedCloserId) {
      alert("Cannot send warning for unassigned lead.");
      return;
    }

    const closerUser = db.getUsers().find(u => u.id === lead.assignedCloserId);
    const closerName = closerUser?.name || "Closer";

    db.addNotification({
      type: "Overdue Warning",
      recipientId: lead.assignedCloserId,
      message: `Warning: Follow-up for lead '${lead.name}' is overdue! Please contact them immediately.`,
      link: `/follow-ups`
    });

    db.logAudit(`Admin sent overdue follow-up warning to closer ${closerName} for lead '${lead.name}'.`);
    alert(`Overdue follow-up warning sent to closer ${closerName} successfully.`);
  };

  useEffect(() => {
    loadFollowUpData();
    const interval = setInterval(loadFollowUpData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleReassign = (leadId, targetCloserId) => {
    if (!targetCloserId) return;
    const leadsList = db.getLeads();
    const lead = leadsList.find(l => l.id === leadId);
    if (lead) {
      db.saveLead({
        ...lead,
        assignedCloserId: targetCloserId
      });
      loadFollowUpData();
    }
  };

  // Done Action
  const handleOpenDone = (e, lead) => {
    e.stopPropagation();
    setActionLead(lead);
    setNextFollowUpDate('');
    setNoFollowUpNeeded(false);
    setShowDoneModal(true);
  };

  const handleSaveDone = () => {
    if (!noFollowUpNeeded && !nextFollowUpDate) {
      alert("What is the next follow-up date for this lead? Please select a date or check 'No follow-up needed'.");
      return;
    }

    db.saveActivity({
      leadId: actionLead.id,
      type: "Call",
      summary: "Follow-up marked as Completed / Done.",
      objections: "None",
      feedback: "Client was contacted successfully.",
      nextStep: noFollowUpNeeded ? "N/A - Closed follow-up cycle" : `Next follow-up scheduled for ${nextFollowUpDate}`,
      loggedBy: currentUser.name,
      updateFollowUp: true,
      followUpDate: noFollowUpNeeded ? null : nextFollowUpDate
    });

    setShowDoneModal(false);
    setActionLead(null);
    loadFollowUpData();
  };

  // Snooze Action
  const handleOpenSnooze = (e, lead) => {
    e.stopPropagation();
    setActionLead(lead);
    setSnoozeDays('1');
    setSnoozeCustomDate('');
    setSnoozeReason('');
    setShowSnoozeModal(true);
  };

  const handleSaveSnooze = () => {
    if (!snoozeReason.trim()) {
      alert("Please provide a reason note explaining why this follow-up is being snoozed.");
      return;
    }

    let snoozeTargetDate = new Date();
    if (snoozeDays === '1') {
      snoozeTargetDate.setDate(snoozeTargetDate.getDate() + 1);
    } else if (snoozeDays === '2') {
      snoozeTargetDate.setDate(snoozeTargetDate.getDate() + 2);
    } else {
      if (!snoozeCustomDate) {
        alert("Please specify the custom snooze date.");
        return;
      }
      snoozeTargetDate = new Date(snoozeCustomDate);
    }

    db.saveActivity({
      leadId: actionLead.id,
      type: "Internal Note",
      summary: `Follow-up was snoozed to ${snoozeTargetDate.toLocaleDateString()}. Reason: ${snoozeReason}`,
      objections: "None",
      feedback: "N/A",
      nextStep: actionLead.nextAction,
      loggedBy: currentUser.name,
      updateFollowUp: true,
      followUpDate: snoozeTargetDate.toISOString().slice(0, 16)
    });

    setShowSnoozeModal(false);
    setActionLead(null);
    loadFollowUpData();
  };

  // Filters logic
  const getFilteredLeads = () => {
    let result = leads.filter(l => l.followUpDate);

    // Closers see their own follow ups only
    if (currentUser.role === 'Sales Closer') {
      result = result.filter(l => l.assignedCloserId === currentUser.id);
    } else if (filterCloser !== 'All') {
      result = result.filter(l => l.assignedCloserId === filterCloser);
    }

    // Filter by type (categories serve as the follow-up intent/types)
    if (filterType !== 'All') {
      result = result.filter(l => l.category === filterType);
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // Split into Due Today & Overdue
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

  const overdueLeads = filteredLeads.filter(l => {
    const fDate = new Date(l.followUpDate);
    return fDate < startOfToday && l.stage !== 'Repeat Purchase';
  }).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  const dueTodayLeads = filteredLeads.filter(l => {
    const fDate = new Date(l.followUpDate);
    return fDate >= startOfToday && fDate <= endOfToday && l.stage !== 'Repeat Purchase';
  }).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  const overdueCount = overdueLeads.length;
  const dueCount = dueTodayLeads.length;

  return (
    <div className="followup-queue-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Follow-Up Queue</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Follow-Up Queue</h1>
          <p className="page-subtitle">Track, snooze, or close follow-up reminders due for today and overdue across staff.</p>
        </div>
      </div>

      {/* Summary Stat Box */}
      <div className="card queue-summary-card">
        <span className="summary-text">
          <strong>{dueCount}</strong> follow-ups due today. <strong>{overdueCount}</strong> overdue across <strong>{closers.length}</strong> active closers.
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="user-toolbar card" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="section-title" style={{ margin: 0, fontSize: '15px' }}>Follow-Up Queue</h3>
        <button 
          className={`btn btn-sm ${(filterCloser !== 'All' || filterType !== 'All') ? 'btn-primary' : ''}`}
          onClick={() => {
            setPendingFilterCloser(filterCloser);
            setPendingFilterType(filterType);
            setShowFilterModal(true);
          }}
        >
          <Filter size={14} />
          <span>Filters{(filterCloser !== 'All' || filterType !== 'All') ? ` (${[filterCloser !== 'All', filterType !== 'All'].filter(Boolean).length})` : ''}</span>
        </button>
      </div>

      {/* Active Filter Badges */}
      {(filterCloser !== 'All' || filterType !== 'All') && (
        <div className="active-filters-row" style={{ marginBottom: '24px' }}>
          <span className="active-filters-label">Active Filters:</span>
          {filterCloser !== 'All' && (
            <div className="filter-badge-pill">
              <span>Closer: {closers.find(c => c.id === filterCloser)?.name || filterCloser}</span>
              <button onClick={() => setFilterCloser('All')}><X size={12} /></button>
            </div>
          )}
          {filterType !== 'All' && (
            <div className="filter-badge-pill">
              <span>Lead Category: {filterType}</span>
              <button onClick={() => setFilterType('All')}><X size={12} /></button>
            </div>
          )}
          <button className="clear-all-filters-btn" onClick={() => {
            setFilterCloser('All');
            setFilterType('All');
          }}>Clear all</button>
        </div>
      )}

      {/* OVERDUE QUEUE TABLE (Emphasized first) */}
      <div className="queue-section">
        <h2 className="queue-section-header overdue-header">
          🚨 Overdue Follow-Up Backlog ({overdueCount})
        </h2>
        
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Phone Number</th>
                <th>Pipeline Stage</th>
                <th>Assigned Closer</th>
                <th>Days Overdue</th>
                <th>Follow-Up Date</th>
                <th style={{ width: '280px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {overdueCount === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table-state">
                    🎉 Excellent! You have no overdue follow-ups in this queue.
                  </td>
                </tr>
              ) : (
                overdueLeads.map(lead => {
                  const daysOver = Math.floor((new Date() - new Date(lead.followUpDate)) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={lead.id} onClick={() => setViewingLeadId(lead.id)}>
                      <td className="lead-name-cell">{lead.name}</td>
                      <td>{lead.phone}</td>
                      <td><span className="badge badge-grey">{lead.stage}</span></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {currentUser.role === 'Sales Closer' ? (
                          <span>{closers.find(c => c.id === lead.assignedCloserId)?.name || 'Me'}</span>
                        ) : (
                          <select 
                            className="form-control inline-table-select"
                            value={lead.assignedCloserId || ""}
                            onChange={(e) => handleReassign(lead.id, e.target.value)}
                          >
                            <option value="">-- Unassigned --</option>
                            {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary-red)' }}>
                        {daysOver} days overdue
                      </td>
                      <td className="overdue-text-red">
                        {new Date(lead.followUpDate).toLocaleDateString()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="queue-action-buttons">
                          <button className="btn btn-sm btn-primary" onClick={(e) => handleOpenDone(e, lead)}>
                            Mark Done
                          </button>
                          <button className="btn btn-sm" onClick={(e) => handleOpenSnooze(e, lead)}>
                            Snooze
                          </button>
                          {currentUser.role !== 'Sales Closer' && lead.assignedCloserId && (
                            <button className="btn btn-sm btn-outline text-red" onClick={(e) => handleSendWarning(e, lead)}>
                              Send Warning
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DUE TODAY QUEUE TABLE */}
      <div className="queue-section" style={{ marginTop: '32px' }}>
        <h2 className="queue-section-header due-today-header">
          📅 Due Today ({dueCount})
        </h2>
        
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Phone Number</th>
                <th>Pipeline Stage</th>
                <th>Assigned Closer</th>
                <th>Follow-Up Time</th>
                <th>Status</th>
                <th style={{ width: '280px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dueCount === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-table-state">
                    No follow-ups due today in the queue.
                  </td>
                </tr>
              ) : (
                dueTodayLeads.map(lead => (
                  <tr key={lead.id} onClick={() => setViewingLeadId(lead.id)}>
                    <td className="lead-name-cell">{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td><span className="badge badge-grey">{lead.stage}</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {currentUser.role === 'Sales Closer' ? (
                        <span>{closers.find(c => c.id === lead.assignedCloserId)?.name || 'Me'}</span>
                      ) : (
                        <select 
                          className="form-control inline-table-select"
                          value={lead.assignedCloserId || ""}
                          onChange={(e) => handleReassign(lead.id, e.target.value)}
                        >
                          <option value="">-- Unassigned --</option>
                          {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {new Date(lead.followUpDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td><span className="badge badge-cold">Pending</span></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="queue-action-buttons">
                        <button className="btn btn-sm btn-primary" onClick={(e) => handleOpenDone(e, lead)}>
                          Mark Done
                        </button>
                        <button className="btn btn-sm" onClick={(e) => handleOpenSnooze(e, lead)}>
                          Snooze
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DONE / COMPLETE ACTION MODAL */}
      {showDoneModal && actionLead && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Complete Follow-Up Cycle</h3>
              <button className="modal-close" onClick={() => setShowDoneModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Complete follow-up for <strong>{actionLead.name}</strong>.
              </p>

              <div className="form-group check-block">
                <label className="checkbox-label-container">
                  <input 
                    type="checkbox" 
                    checked={noFollowUpNeeded}
                    onChange={e => {
                      setNoFollowUpNeeded(e.target.checked);
                      if (e.target.checked) setNextFollowUpDate('');
                    }}
                  />
                  <span className="checkbox-text">No further follow-up needed for this lead</span>
                </label>
              </div>

              {!noFollowUpNeeded && (
                <div className="form-group animate-slide">
                  <label className="form-label">Select Next Follow-Up Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={nextFollowUpDate}
                    onChange={e => setNextFollowUpDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowDoneModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDone}>
                Complete Follow-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNOOZE ACTION MODAL */}
      {showSnoozeModal && actionLead && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Snooze Follow-Up Reminder</h3>
              <button className="modal-close" onClick={() => setShowSnoozeModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '14px', marginBottom: '16px' }}>
                Postpone follow-up task for <strong>{actionLead.name}</strong>.
              </p>

              <div className="form-group">
                <label className="form-label">Snooze Interval</label>
                <select className="form-control" value={snoozeDays} onChange={e => setSnoozeDays(e.target.value)}>
                  <option value="1">Snooze for 1 Day (Tomorrow)</option>
                  <option value="2">Snooze for 2 Days</option>
                  <option value="custom">Set Custom Date & Time</option>
                </select>
              </div>

              {snoozeDays === 'custom' && (
                <div className="form-group animate-slide">
                  <label className="form-label">New Custom Date & Time *</label>
                  <input 
                    type="datetime-local" 
                    className="form-control" 
                    value={snoozeCustomDate}
                    onChange={e => setSnoozeCustomDate(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason for Snooze *</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={snoozeReason}
                  onChange={e => setSnoozeReason(e.target.value)}
                  placeholder="e.g. Client requested to be called back next week, or currently out of country."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowSnoozeModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSnooze}>
                Snooze Follow-Up
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Filter Queue</h3>
              <button className="modal-close" onClick={() => setShowFilterModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {currentUser.role !== 'Sales Closer' && (
                <div className="form-group">
                  <label className="form-label">Staff Closer</label>
                  <select className="form-control" value={pendingFilterCloser} onChange={e => setPendingFilterCloser(e.target.value)}>
                    <option value="All">All Staff</option>
                    {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Lead Category</label>
                <select className="form-control" value={pendingFilterType} onChange={e => setPendingFilterType(e.target.value)}>
                  <option value="All">All Categories</option>
                  {['Incoming', 'Active', 'Inspection', 'Investor', 'Revival', 'Reserved', 'Market', 'Untapped Wealth'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => {
                setPendingFilterCloser('All');
                setPendingFilterType('All');
                setFilterCloser('All');
                setFilterType('All');
                setShowFilterModal(false);
              }}>Reset</button>
              <button className="btn" onClick={() => setShowFilterModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                setFilterCloser(pendingFilterCloser);
                setFilterType(pendingFilterType);
                setShowFilterModal(false);
              }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .followup-queue-page {
          animation: fadeIn 0.25s ease-out;
        }

        .queue-summary-card {
          padding: 16px 20px;
          background-color: var(--color-grey-bg);
          border-color: var(--border-color);
          margin-bottom: 24px;
        }

        .queue-section-header {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 14px;
          padding-bottom: 8px;
          border-bottom: 1.5px solid var(--border-color);
        }

        .queue-section-header.overdue-header {
          color: var(--primary-red);
          border-color: #FDA29B;
        }

        .queue-section-header.due-today-header {
          color: var(--text-primary);
        }

        .inline-table-select {
          padding: 4px 8px;
          font-size: 13px;
          border-radius: var(--radius-xs);
          max-width: 160px;
        }

        .queue-action-buttons {
          display: flex;
          gap: 8px;
        }

        .check-block {
          background-color: var(--color-grey-bg);
          padding: 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
        }

        .empty-closer-queue {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #027A48;
          font-weight: 600;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
