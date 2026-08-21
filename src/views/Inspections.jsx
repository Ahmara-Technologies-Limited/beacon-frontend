import React, { useState, useEffect } from 'react';
import { Plus, Download, LayoutList, Calendar as CalendarIcon, X, Check, AlertCircle, Filter, ArrowLeft, Phone, Mail, MessageSquare, MapPin } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { getPollInterval } from '../lib/demoMode';
import { formatBudget } from '../lib/format';

export default function Inspections({
  currentUser, 
  onBookInspectionClick, 
  onEditInspectionClick, 
  setViewingLeadId, 
  setCurrentTab 
}) {
  const [inspections, setInspections] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [viewingInspectionId, setViewingInspectionId] = useState(null);
  const [leadActivities, setLeadActivities] = useState([]);

  const [reportStatus, setReportStatus] = useState('Completed');
  const [reportText, setReportText] = useState('');
  const [clientFeedback, setClientFeedback] = useState('');
  const [nextStepRec, setNextStepRec] = useState('');
  const [noShowNote, setNoShowNote] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  const [viewMode, setViewMode] = useState('list');

  const [filterStatus, setFilterStatus] = useState('All');
  const [filterEstate, setFilterEstate] = useState('All');
  const [filterCloser, setFilterCloser] = useState('All');
  const [filterOfficer, setFilterOfficer] = useState('All');

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pendingFilterStatus, setPendingFilterStatus] = useState('All');
  const [pendingFilterEstate, setPendingFilterEstate] = useState('All');
  const [pendingFilterCloser, setPendingFilterCloser] = useState('All');
  const [pendingFilterOfficer, setPendingFilterOfficer] = useState('All');

  const [currentDate, setCurrentDate] = useState(new Date());

  const ESTATES = [
    'Beacon Heights, Lekki',
    'Beacon Grove, Epe',
    'Beacon Waterfront, Lekki',
    'Beacon Hill, Guzape',
    'Beacon Gardens, Enugu',
    'Beacon Palms, Maitama'
  ];

  const loadInspectionData = async () => {
    setInspections(await dataService.getInspections());
    setLeads(await dataService.getLeads());
    setUsers(await dataService.getUsers());
    setProperties(await dataService.getProperties());
  };

  useEffect(() => {
    if (viewingInspectionId) {
      const selected = inspections.find(i => i.id === viewingInspectionId);
      if (selected) {
        setReportStatus(selected.status === 'Scheduled' || selected.status === 'Confirmed' ? 'Completed' : selected.status);
        setReportText(selected.report || '');
        setClientFeedback(selected.feedback || '');
        setNextStepRec(selected.nextStepRecommendation || '');
        setNoShowNote(selected.noShowNote || '');
        setRescheduleDate(selected.date || '');
        setRescheduleTime(selected.time || '');
        setCancellationReason(selected.internalNotes || '');
      }
    }
  }, [viewingInspectionId, inspections]);

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  useEffect(() => {
    loadInspectionData();
    const interval = setInterval(loadInspectionData, getPollInterval(2000));
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (viewingInspectionId) {
      const selected = inspections.find(i => i.id === viewingInspectionId);
      if (selected) {
        dataService.getActivities(selected.leadId).then(setLeadActivities);
      }
    }
  }, [viewingInspectionId, inspections]);

  const isUserRelevantForInspection = (inspection) => {
    if (['Super Admin', 'General Manager', 'Head of Operations', 'Branch Manager'].includes(currentUser.role)) {
      return true;
    }
    if (currentUser.role === 'Inspection Officer') {
      return inspection.inspectionOfficerId === currentUser.id;
    }
    if (currentUser.role === 'Sales Closer') {
      return inspection.assignedCloserId === currentUser.id;
    }
    return false;
  };

  const getFilteredInspections = () => {
    let result = inspections;

    if (currentUser.role === 'Sales Closer') {
      result = result.filter(i => i.assignedCloserId === currentUser.id);
    } else if (currentUser.role === 'Inspection Officer') {
      result = result.filter(i => i.inspectionOfficerId === currentUser.id);
    }

    if (filterStatus !== 'All') result = result.filter(i => i.status === filterStatus);
    if (filterEstate !== 'All') result = result.filter(i => i.estate === filterEstate);
    if (filterCloser !== 'All') result = result.filter(i => i.assignedCloserId === filterCloser);
    if (filterOfficer !== 'All') result = result.filter(i => i.inspectionOfficerId === filterOfficer);

    return result;
  };

  const filteredInspections = getFilteredInspections();

  const handleExportCSV = () => {
    if (filteredInspections.length === 0) {
      alert("No inspections to export.");
      return;
    }

    const headers = ["Lead Name", "Property Estate", "Inspection Date", "Inspection Time", "Meeting Point", "Closer Owner", "Inspection Officer", "Status", "Notes"];
    const rows = filteredInspections.map(i => {
      const leadName = leads.find(l => l.id === i.leadId)?.name || "Unknown";
      const closerName = users.find(u => u.id === i.assignedCloserId)?.name || "Unassigned";
      const officerName = users.find(u => u.id === i.inspectionOfficerId)?.name || "Unassigned";
      return [
        leadName,
        i.estate,
        i.date,
        i.time,
        i.meetingPoint,
        closerName,
        officerName,
        i.status,
        i.internalNotes || ""
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Beacon_Inspections_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    db.logAudit(`Exported filtered inspections log of ${filteredInspections.length} entries to CSV.`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Scheduled': return 'badge-cold'; // blue
      case 'Confirmed': return 'badge-success'; // green
      case 'Completed': return 'status-completed'; // dark green
      case 'No-Show': return 'badge-hot'; // red
      case 'Rescheduled': return 'status-rescheduled'; // orange
      case 'Cancelled': return 'badge-grey'; // grey
      default: return 'badge-grey';
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Pre-pad empty cells from previous month
    for (let index = 0; index < firstDay; index++) {
      days.push({ day: null, dateStr: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      days.push({ day, dateStr });
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const yearName = currentDate.getFullYear();

    const handlePrevMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
      <div className="calendar-view-container animate-slide">
        <div className="calendar-header-toolbar">
          <button className="btn btn-sm" onClick={handlePrevMonth}>&lt; Prev Month</button>
          <span className="current-month-year-label">{monthName} {yearName}</span>
          <button className="btn btn-sm" onClick={handleNextMonth}>Next Month &gt;</button>
        </div>

        <div className="calendar-grid-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-grid-header-cell">{d}</div>
          ))}
        </div>

        <div className="calendar-grid-body">
          {days.map((item, idx) => {
            const dayInspections = item.dateStr 
              ? filteredInspections.filter(i => i.date === item.dateStr)
              : [];

            return (
              <div key={idx} className={`calendar-grid-cell ${item.day ? 'active-cell' : 'empty-cell'}`}>
                {item.day && <span className="cell-day-number">{item.day}</span>}
                <div className="cell-events-list">
                  {dayInspections.map(i => {
                    const leadName = leads.find(l => l.id === i.leadId)?.name || "Client";
                    return (
                      <div 
                        key={i.id} 
                        className={`calendar-event-bubble ${getStatusBadgeClass(i.status)}`}
                        onClick={() => {
                          setViewingLeadId(i.leadId, i.id);
                          setCurrentTab('leads');
                        }}
                        title={`${leadName} @ ${i.time} (${i.estate})`}
                      >
                        <strong>{i.time}</strong> {leadName}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (viewingInspectionId) {
    const selectedInspection = inspections.find(i => i.id === viewingInspectionId);
    if (!selectedInspection) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p>Inspection not found.</p>
          <button className="btn" onClick={() => setViewingInspectionId(null)}>Back to list</button>
        </div>
      );
    }

    const lead = leads.find(l => l.id === selectedInspection.leadId) || {};
    const property = properties.find(p => p.name.toLowerCase().includes(selectedInspection.estate.toLowerCase()) || selectedInspection.estate.toLowerCase().includes(p.name.toLowerCase())) || {
      name: selectedInspection.estate,
      location: selectedInspection.meetingPoint,
      price: 0,
      type: 'N/A',
      description: 'Property details are not available in the database.',
      amenities: []
    };

    const handleSubmitReport = async (e) => {
      e.preventDefault();

      const updatedInspection = {
        ...selectedInspection,
        status: reportStatus,
      };

      if (reportStatus === 'Completed') {
        updatedInspection.report = reportText;
        updatedInspection.feedback = clientFeedback;
        updatedInspection.nextStepRecommendation = nextStepRec;
      } else if (reportStatus === 'No-Show') {
        updatedInspection.noShowNote = noShowNote;
      } else if (reportStatus === 'Rescheduled') {
        updatedInspection.date = rescheduleDate;
        updatedInspection.time = rescheduleTime;
        updatedInspection.internalNotes = cancellationReason;
      } else if (reportStatus === 'Cancelled') {
        updatedInspection.internalNotes = cancellationReason;
      }

      await dataService.saveInspection(updatedInspection);
      loadInspectionData();
      setViewingInspectionId(null);
    };

    return (
      <div className="inspection-report-view animate-slide">
        <div className="breadcrumbs">
          <span>Home</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span onClick={() => setViewingInspectionId(null)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Site Inspections</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-active">Report # {selectedInspection.id}</span>
        </div>

        <button className="btn btn-sm back-nav-btn" onClick={() => setViewingInspectionId(null)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={16} />
          <span>Back to Inspections List</span>
        </button>

        <div style={{ display: 'grid', gap: '24px' }} className="responsive-details-grid">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Client Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Name</label>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>{lead.name || 'N/A'}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Phone</label>
                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} className="text-secondary" />
                      <span>{lead.phone || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>WhatsApp</label>
                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={12} className="text-secondary" />
                      <span>{lead.whatsapp || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Email</label>
                  <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} className="text-secondary" />
                    <span>{lead.email || 'N/A'}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Budget</label>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-red)' }}>{lead.budget ? formatBudget(lead.budget) : 'N/A'}</div>
                  </div>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Pipeline Stage</label>
                    <div><span className="badge badge-grey" style={{ fontSize: '10px' }}>{lead.stage || 'N/A'}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Property Interest Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Estate Name</label>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{property.name}</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Type</label>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{property.type}</div>
                  </div>
                  {property.price > 0 && (
                    <div>
                      <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Price Starting From</label>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary-red)' }}>{formatPrice(property.price)}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Location</label>
                  <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} className="text-secondary" />
                    <span>{property.location}</span>
                  </div>
                </div>
                {property.description && (
                  <div>
                    <label className="form-label" style={{ marginBottom: '2px', fontSize: '11px', color: 'var(--text-placeholder)' }}>Description</label>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{property.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Log Inspection Outcome
              </h3>
              <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Inspection Status *</label>
                  <select 
                    className="form-control" 
                    value={reportStatus} 
                    onChange={e => setReportStatus(e.target.value)}
                    required
                  >
                    <option value="Completed">Completed (Attended & Finished)</option>
                    <option value="No-Show">No-Show (Client missed tour)</option>
                    <option value="Rescheduled">Rescheduled</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {reportStatus === 'Completed' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Inspection Officer's Report Summary *</label>
                      <textarea 
                        className="form-control" 
                        rows={4} 
                        placeholder="Detail the tour walkthrough, physical plots inspected, beacons verified, and primary observations..."
                        value={reportText}
                        onChange={e => setReportText(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Client Feedback & Objections *</label>
                      <textarea 
                        className="form-control" 
                        rows={3} 
                        placeholder="What were the client's impressions, pricing concerns, infrastructural requests, or general vibe?"
                        value={clientFeedback}
                        onChange={e => setClientFeedback(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Next-Step Recommendations for Closer *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Call client to offer payment plan on Plot 14, send layout diagram..."
                        value={nextStepRec}
                        onChange={e => setNextStepRec(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {reportStatus === 'No-Show' && (
                  <div className="form-group">
                    <label className="form-label">No-Show Internal Notes / Explanation *</label>
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      placeholder="Why did the client miss the inspection? (e.g. Unreachable, cancelled last minute, etc.)"
                      value={noShowNote}
                      onChange={e => setNoShowNote(e.target.value)}
                      required
                    />
                  </div>
                )}

                {reportStatus === 'Rescheduled' && (
                  <>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">New Inspection Date *</label>
                        <input 
                          type="date" 
                          className="form-control" 
                          value={rescheduleDate}
                          onChange={e => setRescheduleDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">New Time *</label>
                        <input 
                          type="time" 
                          className="form-control" 
                          value={rescheduleTime}
                          onChange={e => setRescheduleTime(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Reason for Rescheduling *</label>
                      <textarea 
                        className="form-control" 
                        rows={2} 
                        placeholder="Explain why the inspection is being moved to another date/time..."
                        value={cancellationReason}
                        onChange={e => setCancellationReason(e.target.value)}
                        required
                      />
                    </div>
                  </>
                )}

                {reportStatus === 'Cancelled' && (
                  <div className="form-group">
                    <label className="form-label">Cancellation Reason *</label>
                    <textarea 
                      className="form-control" 
                      rows={3} 
                      placeholder="Provide detailed notes regarding the cancellation of this site tour..."
                      value={cancellationReason}
                      onChange={e => setCancellationReason(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button type="button" className="btn" onClick={() => setViewingInspectionId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Inspection Report</button>
                </div>
              </form>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                Conversation History & Interaction Timeline
              </h3>
              {leadActivities.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                  No interactions have been logged yet for this lead.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {leadActivities.map((a, idx) => (
                    <div key={idx} style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)', paddingBottom: '4px' }}>
                      <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-red)' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="badge badge-grey" style={{ fontSize: '10px', textTransform: 'uppercase' }}>{a.type}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-placeholder)' }}>{new Date(a.date).toLocaleString()}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{a.summary}</div>
                      {a.feedback && a.feedback !== 'N/A' && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <strong>Feedback:</strong> {a.feedback}
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: 'var(--text-placeholder)', marginTop: '2px' }}>
                        Logged by: {a.loggedBy}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="inspections-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Site Inspections</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Site Inspections</h1>
          <p className="page-subtitle">Configure, approve, and track property tours and inspection results.</p>
        </div>

        <div className="header-actions-group">
          {currentUser.role !== 'Inspection Officer' && currentUser.role !== 'Admin/Doc Officer' && (
            <button className="btn btn-primary" onClick={() => onBookInspectionClick(null)}>
              <Plus size={16} />
              <span>Book Site Tour</span>
            </button>
          )}
          <button className="btn btn-icon" onClick={handleExportCSV}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="inspections-toolbar card">
        <div className="toolbar-left-view-toggles">
          <button 
            className={`btn btn-sm btn-icon ${viewMode === 'list' ? 'active-view' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <LayoutList size={14} />
            <span>List View</span>
          </button>
          <button 
            className={`btn btn-sm btn-icon ${viewMode === 'calendar' ? 'active-view' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <CalendarIcon size={14} />
            <span>Calendar View</span>
          </button>
        </div>

        <button 
          className={`btn btn-sm ${(filterStatus !== 'All' || filterEstate !== 'All' || filterCloser !== 'All' || filterOfficer !== 'All') ? 'btn-primary' : ''}`}
          onClick={() => {
            setPendingFilterStatus(filterStatus);
            setPendingFilterEstate(filterEstate);
            setPendingFilterCloser(filterCloser);
            setPendingFilterOfficer(filterOfficer);
            setShowFilterModal(true);
          }}
        >
          <Filter size={14} />
          <span>Filters{(filterStatus !== 'All' || filterEstate !== 'All' || filterCloser !== 'All' || filterOfficer !== 'All') ? ` (${[filterStatus !== 'All', filterEstate !== 'All', filterCloser !== 'All', filterOfficer !== 'All'].filter(Boolean).length})` : ''}</span>
        </button>
      </div>

      {(filterStatus !== 'All' || filterEstate !== 'All' || filterCloser !== 'All' || filterOfficer !== 'All') && (
        <div className="active-filters-row" style={{ marginBottom: '24px' }}>
          <span className="active-filters-label">Active Filters:</span>
          {filterStatus !== 'All' && (
            <div className="filter-badge-pill">
              <span>Status: {filterStatus}</span>
              <button onClick={() => setFilterStatus('All')}><X size={12} /></button>
            </div>
          )}
          {filterEstate !== 'All' && (
            <div className="filter-badge-pill">
              <span>Estate: {filterEstate}</span>
              <button onClick={() => setFilterEstate('All')}><X size={12} /></button>
            </div>
          )}
          {filterCloser !== 'All' && (
            <div className="filter-badge-pill">
              <span>Closer: {users.find(u => u.id === filterCloser)?.name || filterCloser}</span>
              <button onClick={() => setFilterCloser('All')}><X size={12} /></button>
            </div>
          )}
          {filterOfficer !== 'All' && (
            <div className="filter-badge-pill">
              <span>Officer: {users.find(u => u.id === filterOfficer)?.name || filterOfficer}</span>
              <button onClick={() => setFilterOfficer('All')}><X size={12} /></button>
            </div>
          )}
          <button className="clear-all-filters-btn" onClick={() => {
            setFilterStatus('All');
            setFilterEstate('All');
            setFilterCloser('All');
            setFilterOfficer('All');
          }}>Clear all</button>
        </div>
      )}

      {viewMode === 'calendar' ? (
        renderCalendarView()
      ) : (
        <div className="table-container animate-slide">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Client / Lead</th>
                <th>Estate / Project</th>
                <th>Inspection Date</th>
                <th>Time</th>
                <th>Meeting Point</th>
                <th>Assigned Closer</th>
                <th>Inspection Officer</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-table-state">
                    No inspections scheduled or found with these filters.
                  </td>
                </tr>
              ) : (
                filteredInspections.map(i => {
                  const leadName = leads.find(l => l.id === i.leadId)?.name || "Unknown Lead";
                  const closerName = users.find(u => u.id === i.assignedCloserId)?.name || "Unassigned";
                  const officerName = users.find(u => u.id === i.inspectionOfficerId)?.name || "Unassigned";
                  
                  return (
                    <tr 
                      key={i.id} 
                      onClick={() => {
                        setViewingLeadId(i.leadId, i.id);
                        setCurrentTab('leads');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td 
                        className="lead-name-cell highlight-lead-name" 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setViewingLeadId(i.leadId, i.id); 
                          setCurrentTab('leads'); 
                        }}
                      >
                        {leadName}
                      </td>
                      <td>{i.estate}</td>
                      <td>{i.date}</td>
                      <td>{i.time}</td>
                      <td>{i.meetingPoint}</td>
                      <td>{closerName}</td>
                      <td>{officerName}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(i.status)}`}>
                          {i.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {isUserRelevantForInspection(i) ? (
                          <button 
                            className="btn btn-sm btn-primary" 
                            onClick={() => {
                              if (currentUser.role === 'Inspection Officer') {
                                setViewingLeadId(i.leadId, i.id);
                                setCurrentTab('leads');
                              } else {
                                onEditInspectionClick(i.leadId, i.id);
                              }
                            }}
                          >
                            Update Status
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-placeholder)', fontStyle: 'italic' }}>View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showFilterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Filter Inspections</h3>
              <button className="modal-close" onClick={() => setShowFilterModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={pendingFilterStatus} onChange={e => setPendingFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="No-Show">No-Show</option>
                  <option value="Rescheduled">Rescheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Estate</label>
                <select className="form-control" value={pendingFilterEstate} onChange={e => setPendingFilterEstate(e.target.value)}>
                  <option value="All">All Estates</option>
                  {ESTATES.map(est => <option key={est} value={est}>{est}</option>)}
                </select>
              </div>

              {currentUser.role !== 'Sales Closer' && (
                <div className="form-group">
                  <label className="form-label">Staff Closer</label>
                  <select className="form-control" value={pendingFilterCloser} onChange={e => setPendingFilterCloser(e.target.value)}>
                    <option value="All">All Staff Closers</option>
                    {users.filter(u => u.role === 'Sales Closer').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              {currentUser.role !== 'Inspection Officer' && (
                <div className="form-group">
                  <label className="form-label">Inspection Officer</label>
                  <select className="form-control" value={pendingFilterOfficer} onChange={e => setPendingFilterOfficer(e.target.value)}>
                    <option value="All">All Officers</option>
                    {users.filter(u => u.role === 'Inspection Officer').map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => {
                setPendingFilterStatus('All');
                setPendingFilterEstate('All');
                setPendingFilterCloser('All');
                setPendingFilterOfficer('All');
                setFilterStatus('All');
                setFilterEstate('All');
                setFilterCloser('All');
                setFilterOfficer('All');
                setShowFilterModal(false);
              }}>Reset</button>
              <button className="btn" onClick={() => setShowFilterModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                setFilterStatus(pendingFilterStatus);
                setFilterEstate(pendingFilterEstate);
                setFilterCloser(pendingFilterCloser);
                setFilterOfficer(pendingFilterOfficer);
                setShowFilterModal(false);
              }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .inspections-page {
          animation: fadeIn 0.25s ease-out;
        }

        .inspections-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          margin-bottom: 24px;
        }

        .toolbar-left-view-toggles {
          display: flex;
          gap: 8px;
        }

        .active-view {
          background-color: var(--primary-red-light);
          color: var(--primary-red);
          border-color: var(--primary-red-light-border);
        }

        .status-completed {
          background-color: #D1FAE5;
          color: #065F46;
        }

        .status-rescheduled {
          background-color: #FFEDD5;
          color: #9A3412;
        }

        .calendar-view-container {
          background-color: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
          padding: 24px;
        }

        .calendar-header-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .current-month-year-label {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .calendar-grid-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-weight: 600;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1.5px solid var(--border-color);
          padding-bottom: 8px;
          margin-bottom: 8px;
        }

        .calendar-grid-body {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          grid-auto-rows: minmax(110px, auto);
          gap: 4px;
        }

        .calendar-grid-cell {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xs);
          padding: 8px;
          position: relative;
          background-color: #FAFAFA;
        }

        .calendar-grid-cell.active-cell {
          background-color: #FFFFFF;
        }

        .cell-day-number {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .cell-events-list {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
          max-height: 80px;
        }

        .calendar-event-bubble {
          font-size: 9.5px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          cursor: pointer;
          border-left: 3px solid currentColor;
          background-color: var(--color-grey-bg);
          color: var(--color-grey-text);
        }

        .quick-action-buttons {
          display: flex;
          gap: 6px;
        }

        .responsive-details-grid {
          grid-template-columns: 1.2fr 1.8fr;
        }

        @media (max-width: 1024px) {
          .responsive-details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .inspections-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }
          .toolbar-filters {
            width: 100%;
            justify-content: space-between;
          }
          .calendar-grid-body {
            grid-auto-rows: minmax(60px, auto);
            gap: 2px;
          }
          .calendar-grid-cell {
            padding: 4px;
            font-size: 11px;
          }
        }
      `}</style>
    </div>
  );
}
