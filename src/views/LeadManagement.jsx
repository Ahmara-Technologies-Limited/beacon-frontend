import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, Download, Search, SlidersHorizontal, CheckSquare, 
  Square, Edit2, AlertCircle, Flag, Ban, Check, Filter, X 
} from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { getPollInterval } from '../lib/demoMode';

export default function LeadManagement({ 
  currentUser, 
  onAddLeadClick, 
  onEditLeadClick, 
  setViewingLeadId, 
  searchTerm 
}) {
  const [leads, setLeads] = useState([]);
  const [closers, setClosers] = useState([]);
  const [officerInspections, setOfficerInspections] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [filterStage, setFilterStage] = useState('All');
  const [filterSource, setFilterSource] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterTemperature, setFilterTemperature] = useState('All');
  const [filterCloser, setFilterCloser] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [filterArchived, setFilterArchived] = useState('Active'); // values: 'Active' or 'Archived'

  const [pendingFilterStage, setPendingFilterStage] = useState('All');
  const [pendingFilterSource, setPendingFilterSource] = useState('All');
  const [pendingFilterCategory, setPendingFilterCategory] = useState('All');
  const [pendingFilterTemperature, setPendingFilterTemperature] = useState('All');
  const [pendingFilterCloser, setPendingFilterCloser] = useState('All');
  const [pendingFilterLocation, setPendingFilterLocation] = useState('All');
  const [pendingFilterArchived, setPendingFilterArchived] = useState('Active');

  const [bulkCloserId, setBulkCloserId] = useState('');
  const [bulkStage, setBulkStage] = useState('');
  const [bulkStatusMsg, setBulkStatusMsg] = useState('');

  const [importSummary, setImportSummary] = useState(null);

  const loadLeads = async () => {
    if (filterArchived === 'Archived') {
      setLeads(await dataService.getArchivedLeads());
    } else {
      setLeads(await dataService.getLeads());
    }
  };

  useEffect(() => {
    loadLeads();
    dataService.getUsers().then(users =>
      setClosers(users.filter(u => u.role === 'Sales Closer' && u.status === 'Active'))
    );
    if (currentUser.role === 'Inspection Officer') {
      dataService.getInspections().then(all =>
        setOfficerInspections(all.filter(i => i.inspectionOfficerId === currentUser.id))
      );
    }

    const interval = setInterval(() => {
      loadLeads();
    }, getPollInterval(2000));

    return () => clearInterval(interval);
  }, [filterArchived]);

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getFilteredLeads = () => {
    let result = leads;

    // Closers only see their assigned leads
    if (currentUser.role === 'Sales Closer') {
      result = result.filter(l => l.assignedCloserId === currentUser.id);
    }
    // Relationship Manager: only see clients or referrals
    if (currentUser.role === 'Relationship Manager') {
      result = result.filter(l => l.stage === 'Client/Investor' || l.stage === 'Repeat Purchase' || l.source === 'Referral');
    }
    // Branch Manager: see leads assigned to closers in their branch
    if (currentUser.role === 'Branch Manager' && currentUser.branch) {
      result = result.filter(l => l.branch === currentUser.branch);
    }
    // Admin/Doc officers only see: Reservation, Payment, Documentation, Allocation, Client/Investor
    if (currentUser.role === 'Admin/Doc Officer') {
      const allowedStages = ['Reservation', 'Payment', 'Documentation', 'Allocation', 'Client/Investor'];
      result = result.filter(l => allowedStages.includes(l.stage));
    }
    // Inspection Officers only see leads they have tours/inspections with
    if (currentUser.role === 'Inspection Officer') {
      const leadIds = officerInspections.map(i => i.leadId);
      result = result.filter(l => leadIds.includes(l.id));
    }

    // searchTerm is passed down from the layout header
    const query = searchTerm.toLowerCase().trim();
    if (query !== '') {
      result = result.filter(l => 
        l.name.toLowerCase().includes(query) || 
        l.phone.includes(query) || 
        (l.email && l.email.toLowerCase().includes(query))
      );
    }

    if (filterStage !== 'All') result = result.filter(l => l.stage === filterStage);
    if (filterSource !== 'All') result = result.filter(l => l.source === filterSource);
    if (filterCategory !== 'All') result = result.filter(l => l.category === filterCategory);
    if (filterTemperature !== 'All') result = result.filter(l => l.temperature === filterTemperature);
    if (filterCloser !== 'All') {
      if (filterCloser === 'Unassigned') {
        result = result.filter(l => !l.assignedCloserId);
      } else {
        result = result.filter(l => l.assignedCloserId === filterCloser);
      }
    }
    if (filterLocation !== 'All') result = result.filter(l => l.location === filterLocation);

    return result;
  };

  const filteredLeads = getFilteredLeads();
  const locations = Array.from(new Set(leads.map(l => l.location).filter(Boolean)));

  const handleCSVExport = () => {
    if (filteredLeads.length === 0) {
      alert("No leads in the current filtered view to export.");
      return;
    }

    const headers = ["Lead Name", "Phone", "WhatsApp", "Email", "Location", "Source", "Category", "Stage", "Temperature", "Assigned Closer", "Budget", "Property Interest", "Next Action", "Follow Up Date", "Date Created"];
    const rows = filteredLeads.map(l => {
      const closerName = closers.find(u => u.id === l.assignedCloserId)?.name || "Unassigned";
      return [
        l.name,
        l.phone,
        l.whatsapp || l.phone,
        l.email || "",
        l.location || "",
        l.source,
        l.category,
        l.stage,
        l.temperature,
        closerName,
        l.budget || "",
        l.propertyInterest || "",
        l.nextAction || "",
        l.followUpDate || "",
        l.dateCreated
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Beacon_Leads_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    db.logAudit(`Exported filtered lead list of ${filteredLeads.length} items to CSV.`);
  };

  const handleCSVImport = (event) => {
    const file = event.target.target || event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split("\n");

      let importedCount = 0;
      let skippedCount = 0;

      // Simple CSV parser
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const cleanValues = matches.map(v => v.replace(/^"|"$/g, '').trim());

        if (cleanValues.length < 5) {
          skippedCount++;
          continue;
        }

        const name = cleanValues[0];
        const phone = cleanValues[1];
        const source = cleanValues[5] || "Paid Ads";
        const category = cleanValues[6] || "Incoming";
        const stage = cleanValues[7] || "New Lead";
        const temperature = cleanValues[8] || "Hot";
        const nextAction = cleanValues[12] || "Follow up";
        const followUpDate = cleanValues[13] || new Date().toISOString();

        if (!name || !phone || !source || !category || !temperature || !stage || !nextAction || !followUpDate) {
          skippedCount++;
          continue;
        }

        // Map assigned closer name to ID if possible
        const closerNameInput = cleanValues[9] || "";
        const closerObj = closers.find(c => c.name.toLowerCase().includes(closerNameInput.toLowerCase()));

        await dataService.saveLead({
          name,
          phone,
          whatsapp: cleanValues[2] || phone,
          email: cleanValues[3] || "",
          location: cleanValues[4] || "",
          source,
          category,
          stage,
          temperature,
          assignedCloserId: closerObj ? closerObj.id : null,
          budget: cleanValues[10] || "₦0",
          propertyInterest: cleanValues[11] || "",
          nextAction,
          followUpDate
        });
        importedCount++;
      }

      setImportSummary({ imported: importedCount, skipped: skippedCount });
      loadLeads();
      db.logAudit(`CSV file uploaded. Imported ${importedCount} leads, skipped ${skippedCount} rows.`);
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0) {
      alert("No leads selected.");
      return;
    }
    if (!bulkCloserId) {
      alert("Please select a closer to reassign.");
      return;
    }

    const allLeads = await dataService.getLeads();
    const closerObj = closers.find(u => u.id === bulkCloserId);

    for (const id of selectedLeadIds) {
      const lead = allLeads.find(l => l.id === id);
      if (lead) {
        await dataService.saveLead({
          ...lead,
          assignedCloserId: bulkCloserId
        });
      }
    }

    setBulkStatusMsg(`Successfully reassigned ${selectedLeadIds.length} leads to ${closerObj?.name}.`);
    setSelectedLeadIds([]);
    setBulkCloserId('');
    loadLeads();
    setTimeout(() => setBulkStatusMsg(''), 4000);
  };

  const handleBulkUpdateStage = async () => {
    if (selectedLeadIds.length === 0) {
      alert("No leads selected.");
      return;
    }
    if (!bulkStage) {
      alert("Please select a stage to update.");
      return;
    }

    const allLeads = await dataService.getLeads();
    for (const id of selectedLeadIds) {
      const lead = allLeads.find(l => l.id === id);
      if (lead) {
        await dataService.saveLead({
          ...lead,
          stage: bulkStage
        });
      }
    }

    setBulkStatusMsg(`Successfully updated stage of ${selectedLeadIds.length} leads to '${bulkStage}'.`);
    setSelectedLeadIds([]);
    setBulkStage('');
    loadLeads();
    setTimeout(() => setBulkStatusMsg(''), 4000);
  };

  const handleRestore = async (id) => {
    try {
      await dataService.restoreLead(id);
      loadLeads();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="lead-management-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Lead Management</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-subtitle">Track and manage all system leads.</p>
        </div>

        <div className="header-actions-group">
          {filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && (
            <button className="btn btn-primary" onClick={onAddLeadClick}>
              <Plus size={16} />
              <span>Add New Lead</span>
            </button>
          )}

          {currentUser.role === 'Super Admin' && (
            <>
              <div className="csv-upload-btn-container">
                <input 
                  type="file" 
                  accept=".csv" 
                  id="csv-file-input" 
                  onChange={handleCSVImport} 
                  style={{ display: 'none' }}
                />
                <label htmlFor="csv-file-input" className="btn btn-icon">
                  <Upload size={16} />
                  <span>Bulk Upload</span>
                </label>
              </div>
              <button className="btn btn-icon" onClick={handleCSVExport}>
                <Download size={16} />
                <span>Export CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {importSummary && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">CSV Import Results</h3>
              <button className="modal-close" onClick={() => setImportSummary(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body text-center">
              <div className="import-success-circle">
                <Check size={32} />
              </div>
              <p style={{ marginTop: '16px', fontWeight: '600', fontSize: '16px' }}>Import Completed</p>
              <div className="import-results-summary">
                <div className="result-stat"><span className="count success">{importSummary.imported}</span><span className="label">Leads Imported</span></div>
                <div className="result-stat"><span className="count skipped">{importSummary.skipped}</span><span className="label">Rows Skipped</span></div>
              </div>
              <p className="import-disclaimer">Skipped rows contain missing required fields or incorrect columns.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary btn-sm" onClick={() => setImportSummary(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div className="filter-controls-row">
        <div className="filter-left-switches">
          <button 
            className={`btn btn-sm ${(filterStage !== 'All' || filterSource !== 'All' || filterCategory !== 'All' || filterTemperature !== 'All' || filterCloser !== 'All' || filterLocation !== 'All' || filterArchived !== 'Active') ? 'btn-primary' : ''}`}
            onClick={() => {
              setPendingFilterStage(filterStage);
              setPendingFilterSource(filterSource);
              setPendingFilterCategory(filterCategory);
              setPendingFilterTemperature(filterTemperature);
              setPendingFilterCloser(filterCloser);
              setPendingFilterLocation(filterLocation);
              setPendingFilterArchived(filterArchived);
              setShowFilterModal(true);
            }}
          >
            <Filter size={14} />
            <span>Filters{(filterStage !== 'All' || filterSource !== 'All' || filterCategory !== 'All' || filterTemperature !== 'All' || filterCloser !== 'All' || filterLocation !== 'All' || filterArchived !== 'Active') ? ` (${[filterStage !== 'All', filterSource !== 'All', filterCategory !== 'All', filterTemperature !== 'All', filterCloser !== 'All', filterLocation !== 'All', filterArchived !== 'Active'].filter(Boolean).length})` : ''}</span>
          </button>
        </div>

        {selectedLeadIds.length > 0 && (
          <span className="assets-selected-indicator">
            {selectedLeadIds.length} leads selected
          </span>
        )}
      </div>

      {(filterStage !== 'All' || filterSource !== 'All' || filterCategory !== 'All' || filterTemperature !== 'All' || filterCloser !== 'All' || filterLocation !== 'All' || filterArchived !== 'Active') && (
        <div className="active-filters-row" style={{ marginTop: '12px' }}>
          <span className="active-filters-label">Active Filters:</span>
          {filterStage !== 'All' && (
            <div className="filter-badge-pill">
              <span>Stage: {filterStage}</span>
              <button onClick={() => setFilterStage('All')}><X size={12} /></button>
            </div>
          )}
          {filterSource !== 'All' && (
            <div className="filter-badge-pill">
              <span>Source: {filterSource}</span>
              <button onClick={() => setFilterSource('All')}><X size={12} /></button>
            </div>
          )}
          {filterCategory !== 'All' && (
            <div className="filter-badge-pill">
              <span>Category: {filterCategory}</span>
              <button onClick={() => setFilterCategory('All')}><X size={12} /></button>
            </div>
          )}
          {filterTemperature !== 'All' && (
            <div className="filter-badge-pill">
              <span>Temperature: {filterTemperature}</span>
              <button onClick={() => setFilterTemperature('All')}><X size={12} /></button>
            </div>
          )}
          {filterCloser !== 'All' && (
            <div className="filter-badge-pill">
              <span>Closer: {filterCloser === 'Unassigned' ? 'Unassigned' : closers.find(c => c.id === filterCloser)?.name || filterCloser}</span>
              <button onClick={() => setFilterCloser('All')}><X size={12} /></button>
            </div>
          )}
          {filterLocation !== 'All' && (
            <div className="filter-badge-pill">
              <span>Location: {filterLocation}</span>
              <button onClick={() => setFilterLocation('All')}><X size={12} /></button>
            </div>
          )}
          {filterArchived !== 'Active' && (
            <div className="filter-badge-pill">
              <span>Status: {filterArchived}</span>
              <button onClick={() => setFilterArchived('Active')}><X size={12} /></button>
            </div>
          )}
          <button className="clear-all-filters-btn" onClick={() => {
            setFilterStage('All');
            setFilterSource('All');
            setFilterCategory('All');
            setFilterTemperature('All');
            setFilterCloser('All');
            setFilterLocation('All');
            setFilterArchived('Active');
          }}>Clear all</button>
        </div>
      )}




      {selectedLeadIds.length > 0 && filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && (
        <div className="bulk-actions-panel card">
          <div className="bulk-actions-content">
            <span className="bulk-title">Bulk Actions ({selectedLeadIds.length} items):</span>
            
            {currentUser.role === 'Super Admin' && (
              <div className="bulk-action-control">
                <select 
                  className="form-control select-sm" 
                  value={bulkCloserId} 
                  onChange={e => setBulkCloserId(e.target.value)}
                >
                  <option value="">-- Assign Closer --</option>
                  {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn btn-sm btn-primary" onClick={handleBulkAssign}>Reassign</button>
              </div>
            )}

            <div className="bulk-action-control">
              <select 
                className="form-control select-sm" 
                value={bulkStage} 
                onChange={e => setBulkStage(e.target.value)}
              >
                <option value="">-- Move to Stage --</option>
                {[
                  "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
                  "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
                  "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
                ].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button className="btn btn-sm btn-primary" onClick={handleBulkUpdateStage}>Update Stage</button>
            </div>
          </div>
        </div>
      )}

      {bulkStatusMsg && (
        <div className="bulk-status-toast">
          <Check size={16} />
          <span>{bulkStatusMsg}</span>
        </div>
      )}

      <div className="table-container" style={{ minHeight: '300px' }}>
        <table className="custom-table">
          <thead>
            <tr>
              {filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && (
                <th style={{ width: '40px' }} onClick={(e) => e.stopPropagation()}>
                  <button className="table-checkbox-btn" onClick={toggleSelectAll}>
                    {selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0 ? (
                      <CheckSquare size={18} className="checked" />
                    ) : (
                      <Square size={18} />
                    )}
                  </button>
                </th>
              )}
              <th>Lead Name</th>
              <th>Phone Number</th>
              <th>Source</th>
              <th>Category</th>
              <th>Pipeline Stage</th>
              <th>Temperature</th>
              <th>Assigned Closer</th>
              <th>Follow-up Date</th>
              <th>Last Activity</th>
              {filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && <th>Action</th>}
              {filterArchived === 'Archived' && <th>Restore</th>}
            </tr>
          </thead>
          <tbody>
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-table-state">
                  No leads found. Try adjusting your search query or filters.
                </td>
              </tr>
            ) : (
              filteredLeads.map(lead => {
                const isSelected = selectedLeadIds.includes(lead.id);
                const assignedCloserObj = closers.find(c => c.id === lead.assignedCloserId);
                const closerName = assignedCloserObj ? assignedCloserObj.name : "Unassigned";

                const isFollowUpOverdue = lead.followUpDate && new Date(lead.followUpDate) < new Date() && lead.stage !== 'Repeat Purchase';
                const isDormant = (new Date() - new Date(lead.lastActivityDate)) > (7 * 24 * 60 * 60 * 1000);
                const isUnassigned = !lead.assignedCloserId;

                return (
                  <tr 
                    key={lead.id} 
                    className={isSelected ? 'selected-row' : ''}
                    onClick={() => setViewingLeadId(lead.id)}
                  >
                    {filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && (
                      <td onClick={(e) => { e.stopPropagation(); toggleSelectLead(lead.id); }}>
                        <button className="table-checkbox-btn">
                          {isSelected ? (
                            <CheckSquare size={18} className="checked" fill="var(--primary-red)" stroke="white" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </td>
                    )}
                    <td>
                      <div className="lead-name-cell-group">
                        <span className="lead-name-cell">{lead.name}</span>
                        <div className="lead-warnings-badges-row">
                          {isUnassigned && <span className="warning-pill unassigned">Unassigned</span>}
                          {isDormant && <span className="warning-pill dormant">Dormant</span>}
                        </div>
                      </div>
                    </td>
                    <td>{lead.phone}</td>
                    <td>{lead.source}</td>
                    <td>{lead.category}</td>
                    <td><span className="badge badge-grey">{lead.stage}</span></td>
                    <td>
                      <span className={`badge badge-${lead.temperature.toLowerCase()}`}>
                        {lead.temperature}
                      </span>
                    </td>
                    <td>
                      <span className={isUnassigned ? 'closer-unassigned-text' : ''}>
                        {closerName}
                      </span>
                    </td>
                    <td>
                      <div className="followup-cell">
                        {isFollowUpOverdue && <Flag size={14} className="overdue-flag-red" />}
                        <span className={isFollowUpOverdue ? 'overdue-text-red' : ''}>
                          {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '---'}
                        </span>
                      </div>
                    </td>
                    <td>{new Date(lead.lastActivityDate).toLocaleDateString()}</td>
                    {filterArchived === 'Active' && currentUser.role !== 'Admin/Doc Officer' && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-icon" onClick={() => onEditLeadClick(lead.id)}>
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                    {filterArchived === 'Archived' && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleRestore(lead.id)}>
                          Restore
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FILTER MODAL */}
      {showFilterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Filter Leads</h3>
              <button className="modal-close" onClick={() => setShowFilterModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Pipeline Stage</label>
                <select className="form-control" value={pendingFilterStage} onChange={e => setPendingFilterStage(e.target.value)}>
                  <option value="All">All Stages</option>
                  {[
                    "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
                    "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
                    "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
                  ].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lead Source</label>
                <select className="form-control" value={pendingFilterSource} onChange={e => setPendingFilterSource(e.target.value)}>
                  <option value="All">All Sources</option>
                  {['Paid Ads', 'Facebook', 'Instagram', 'Google', 'TikTok', 'Referral', 'Field Marketing', 'Webinar', 'Waitlist', 'Cold Calling', 'Walk-in', 'Existing Client'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={pendingFilterCategory} onChange={e => setPendingFilterCategory(e.target.value)}>
                  <option value="All">All Categories</option>
                  {['Incoming Wealth', 'Active Wealth', 'Investor Wealth', 'Revival Wealth', 'Reserved Wealth', 'Market Wealth', 'Untapped Wealth'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Temperature</label>
                <select className="form-control" value={pendingFilterTemperature} onChange={e => setPendingFilterTemperature(e.target.value)}>
                  <option value="All">All Temperatures</option>
                  <option value="Hot">Hot</option>
                  <option value="Warm">Warm</option>
                  <option value="Cold">Cold</option>
                </select>
              </div>

              {currentUser.role !== 'Sales Closer' && (
                <div className="form-group">
                  <label className="form-label">Assigned Closer</label>
                  <select className="form-control" value={pendingFilterCloser} onChange={e => setPendingFilterCloser(e.target.value)}>
                    <option value="All">All Closers</option>
                    <option value="Unassigned">Unassigned</option>
                    {closers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Location</label>
                <select className="form-control" value={pendingFilterLocation} onChange={e => setPendingFilterLocation(e.target.value)}>
                  <option value="All">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {currentUser.role === 'Super Admin' && (
                <div className="form-group">
                  <label className="form-label">Leads Status</label>
                  <select className="form-control" value={pendingFilterArchived} onChange={e => setPendingFilterArchived(e.target.value)}>
                    <option value="Active">Active Leads</option>
                    <option value="Archived">Archived Leads</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => {
                setPendingFilterStage('All');
                setPendingFilterSource('All');
                setPendingFilterCategory('All');
                setPendingFilterTemperature('All');
                setPendingFilterCloser('All');
                setPendingFilterLocation('All');
                setPendingFilterArchived('Active');
                setFilterStage('All');
                setFilterSource('All');
                setFilterCategory('All');
                setFilterTemperature('All');
                setFilterCloser('All');
                setFilterLocation('All');
                setFilterArchived('Active');
                setShowFilterModal(false);
              }}>Reset</button>
              <button className="btn" onClick={() => setShowFilterModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                setFilterStage(pendingFilterStage);
                setFilterSource(pendingFilterSource);
                setFilterCategory(pendingFilterCategory);
                setFilterTemperature(pendingFilterTemperature);
                setFilterCloser(pendingFilterCloser);
                setFilterLocation(pendingFilterLocation);
                setFilterArchived(pendingFilterArchived);
                setShowFilterModal(false);
              }}>Apply Filters</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lead-management-page {
          animation: fadeIn 0.25s ease-out;
        }

        .page-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.5px;
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .header-actions-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .btn-icon {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .filter-left-switches {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .active-filter {
          background-color: var(--primary-red-light);
          color: var(--primary-red);
          border-color: var(--primary-red-light-border);
        }

        .archived-toggle-select {
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          border-radius: var(--radius-sm);
        }

        .assets-selected-indicator {
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-red);
          background-color: var(--primary-red-light);
          padding: 4px 12px;
          border-radius: 12px;
        }

        .filters-pane-card {
          padding: 20px;
          margin-bottom: 20px;
          animation: slideUp 0.15s ease-out;
        }

        .filters-pane-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }

        .bulk-actions-panel {
          padding: 14px 20px;
          margin-bottom: 20px;
          background-color: #FEF3F2;
          border-color: var(--primary-red-light-border);
          animation: slideUp 0.15s ease-out;
        }

        .bulk-actions-content {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }

        .bulk-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--primary-red);
        }

        .bulk-action-control {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .bulk-action-control select {
          padding: 6px 12px;
          font-size: 13px;
          border-radius: var(--radius-sm);
        }

        .bulk-status-toast {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #ECFDF3;
          color: #027A48;
          border: 1px solid #D0F5E3;
          padding: 10px 16px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
          animation: fadeIn 0.2s ease-out;
        }

        .table-checkbox-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-placeholder);
          display: flex;
          align-items: center;
        }

        .table-checkbox-btn .checked {
          color: var(--primary-red);
        }

        .lead-name-cell-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .lead-warnings-badges-row {
          display: flex;
          gap: 6px;
        }

        .warning-pill {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .warning-pill.unassigned {
          background-color: #FFF5F5;
          color: #E53E3E;
          border: 1px solid #FEB2B2;
        }

        .warning-pill.dormant {
          background-color: #FFFAF0;
          color: #DD6B20;
          border: 1px solid #FBD38D;
        }

        .stage-bubble {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .closer-unassigned-text {
          color: var(--text-placeholder);
          font-style: italic;
        }

        .followup-cell {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .overdue-flag-red {
          color: var(--primary-red);
        }

        .overdue-text-red {
          color: var(--primary-red);
          font-weight: 600;
        }

        .closer-unassigned-text {
          color: var(--text-placeholder);
          font-style: italic;
        }

        /* CSV Import Modal details */
        .import-success-circle {
          width: 64px;
          height: 64px;
          background-color: var(--color-success-bg);
          color: var(--color-success-text);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }

        .import-results-summary {
          display: flex;
          justify-content: space-around;
          margin: 24px 0;
          background-color: var(--color-grey-bg);
          padding: 16px;
          border-radius: var(--radius-md);
        }

        .result-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .result-stat .count {
          font-size: 24px;
          font-weight: 700;
        }

        .result-stat .count.success {
          color: var(--color-success-text);
        }

        .result-stat .count.skipped {
          color: var(--color-hot-text);
        }

        .result-stat .label {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
          font-weight: 500;
        }

        .import-disclaimer {
          font-size: 12px;
          color: var(--text-placeholder);
        }

        @media (max-width: 1024px) {
          .page-header-row {
            flex-direction: column;
            gap: 16px;
          }
          .header-actions-group {
            width: 100%;
            justify-content: space-between;
            flex-wrap: wrap;
          }
        }

        @media (max-width: 768px) {
          .filter-controls-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}
