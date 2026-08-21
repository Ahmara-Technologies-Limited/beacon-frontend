import React, { useState, useEffect } from 'react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { getPollInterval } from '../lib/demoMode';
import { AlertCircle, Calendar } from 'lucide-react';

export default function PipelineTracker({ currentUser, setViewingLeadId, setCurrentTab }) {
  const [leads, setLeads] = useState([]);
  const [closers, setClosers] = useState([]);
  const [filterCloserId, setFilterCloserId] = useState('All');

  const STAGES = [
    "New Lead", 
    "Contact Attempted", 
    "Conversation Started", 
    "Qualified Prospect", 
    "Inspection Booked", 
    "Inspection Completed", 
    "Negotiation", 
    "Reservation", 
    "Payment", 
    "Allocation", 
    "Documentation", 
    "Client/Investor", 
    "Referral", 
    "Repeat Purchase"
  ];

  const loadPipelineData = async () => {
    setLeads(await dataService.getLeads());
    setClosers((await dataService.getUsers()).filter(u => u.role === 'Sales Closer' && u.status === 'Active'));
  };

  useEffect(() => {
    loadPipelineData();
    const interval = setInterval(loadPipelineData, getPollInterval(2000));
    return () => clearInterval(interval);
  }, []);

  // Determine lead lists based on role and filters
  const getFilteredLeads = () => {
    let result = leads;
    
    // Closer restrictions
    if (currentUser.role === 'Sales Closer') {
      result = result.filter(l => l.assignedCloserId === currentUser.id);
    } else if (filterCloserId !== 'All') {
      result = result.filter(l => l.assignedCloserId === filterCloserId);
    }

    return result;
  };

  const filteredLeads = getFilteredLeads();

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e, leadId) => {
    e.dataTransfer.setData("text/plain", leadId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping!
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");

    const leadToMove = leads.find(l => l.id === leadId);
    if (leadToMove && leadToMove.stage !== targetStage) {
      await dataService.saveLead({
        ...leadToMove,
        stage: targetStage
      });
      loadPipelineData();
    }
  };

  const getInitials = (name) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('');
  };

  return (
    <div className="pipeline-board-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Pipelines</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Pipeline Kanban Tracker</h1>
          <p className="page-subtitle">Drag and drop leads between stages to progress sales conversion.</p>
        </div>

        {currentUser.role !== 'Sales Closer' && (
          <div className="filter-item">
            <label style={{ fontSize: '13px', fontWeight: '600', marginRight: '8px' }}>Staff Closer:</label>
            <select 
              className="form-control select-sm"
              value={filterCloserId} 
              onChange={e => setFilterCloserId(e.target.value)}
              style={{ width: '200px' }}
            >
              <option value="All">All Closers</option>
              {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Kanban Board Layout */}
      <div className="kanban-board-container">
        {STAGES.map(stage => {
          const columnLeads = filteredLeads.filter(l => l.stage === stage);
          return (
            <div 
              key={stage} 
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="kanban-column-header">
                <span className="column-stage-title">{stage}</span>
                <span className="column-count-badge">{columnLeads.length}</span>
              </div>

              <div className="kanban-cards-list">
                {columnLeads.map(lead => {
                  const isFollowUpOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date() && lead.stage !== 'Repeat Purchase';
                  const closerName = closers.find(c => c.id === lead.assignedCloserId)?.name || "Unassigned";

                  return (
                    <div
                      key={lead.id}
                      className={`kanban-lead-card ${isFollowUpOverdue ? 'overdue-border' : ''}`}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setViewingLeadId(lead.id)}
                    >
                      <div className="card-top-header">
                        <span className="card-lead-name">{lead.name}</span>
                        <span className={`badge badge-${lead.temperature.toLowerCase()}`}>
                          {lead.temperature}
                        </span>
                      </div>

                      <div className="card-phone-number">{lead.phone}</div>

                      <div className="card-footer-row">
                        <div className="card-closer-avatar" title={`Assigned closer: ${closerName}`}>
                          {getInitials(closerName)}
                        </div>

                        {lead.followUpDate && (
                          <div className={`card-followup-alert ${isFollowUpOverdue ? 'overdue-text' : ''}`}>
                            <Calendar size={12} />
                            <span>
                              {new Date(lead.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {columnLeads.length === 0 && (
                  <div className="empty-column-placeholder">Drag leads here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .pipeline-board-page {
          animation: fadeIn 0.25s ease-out;
          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--header-height) - 48px);
        }

        .kanban-board-container {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          overflow-y: hidden;
          flex: 1;
          padding-bottom: 16px;
          margin-top: 16px;
        }

        .kanban-column {
          width: 280px;
          min-width: 280px;
          background-color: #F4F5F7;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          max-height: 100%;
        }

        .kanban-column-header {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #FFFFFF;
          border-bottom: 1px solid var(--border-color);
          border-radius: var(--radius-md) var(--radius-md) 0 0;
        }

        .column-stage-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .column-count-badge {
          background-color: var(--color-grey-bg);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .kanban-cards-list {
          padding: 12px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .kanban-lead-card {
          background-color: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 14px;
          box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.05);
          cursor: grab;
          transition: var(--transition-normal);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .kanban-lead-card:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--primary-red-light-border);
        }

        .kanban-lead-card:active {
          cursor: grabbing;
        }

        .kanban-lead-card.dragging {
          opacity: 0.4;
          background-color: #F8F9FC;
          border-style: dashed;
        }

        .kanban-lead-card.overdue-border {
          border-left: 4px solid var(--primary-red);
        }

        .card-top-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .card-lead-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .card-phone-number {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .card-footer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          border-top: 1px dashed var(--border-color);
          padding-top: 8px;
        }

        .card-closer-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: var(--color-grey-bg);
          color: var(--text-secondary);
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-followup-alert {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .card-followup-alert.overdue-text {
          color: var(--primary-red);
          font-weight: 700;
        }

        .empty-column-placeholder {
          padding: 24px 0;
          text-align: center;
          color: var(--text-placeholder);
          font-size: 12px;
          font-style: italic;
          border: 1.5px dashed var(--border-color);
          border-radius: var(--radius-sm);
        }
      `}</style>
    </div>
  );
}
