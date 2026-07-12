import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Mail, Calendar, BarChart3, PieChart, X } from 'lucide-react';
import { db } from '../data/mockData';

export default function Reports({ currentUser }) {
  const [reportType, setReportType] = useState('Lead Summary'); // Lead Summary, Pipeline Movement, Follow-Up Performance, Inspection, Conversion, Team Performance
  const [leads, setLeads] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);

  // Report Filters
  const [filterPeriod, setFilterPeriod] = useState('This Month');
  const [filterCloser, setFilterCloser] = useState('All');
  
  // Scheduling State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('Weekly'); // Weekly, Monthly

  const loadReportData = () => {
    setLeads(db.getLeads());
    setInspections(db.getInspections());
    setActivities(db.getActivities());
    setUsers(db.getUsers());
  };

  useEffect(() => {
    loadReportData();
    const interval = setInterval(loadReportData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Filter application helper
  const getFilteredLeads = () => {
    let result = leads;
    if (filterCloser !== 'All') {
      result = result.filter(l => l.assignedCloserId === filterCloser);
    }
    return result;
  };

  const filteredLeads = getFilteredLeads();

  const handlePrintReport = () => {
    window.print();
  };

  const handleScheduleReport = () => {
    if (!scheduleEmail || !/\S+@\S+\.\S+/.test(scheduleEmail)) {
      alert("Please provide a valid recipient email address.");
      return;
    }
    alert(`Successfully scheduled automated ${scheduleFrequency.toLowerCase()} delivery of the '${reportType}' to: ${scheduleEmail}`);
    setShowScheduleModal(false);
    db.logAudit(`Scheduled auto-delivery of ${reportType} to ${scheduleEmail} (${scheduleFrequency}).`);
  };

  // ----------------------------------------------------
  // REPORT RENDERS
  // ----------------------------------------------------
  
  // 1. Lead Summary Report
  const renderLeadSummaryReport = () => {
    const total = filteredLeads.length;
    const incomingCount = filteredLeads.filter(l => l.category === 'Incoming').length;
    const investorCount = filteredLeads.filter(l => l.category === 'Investor Wealth').length;
    const revivalCount = filteredLeads.filter(l => l.category === 'Revival Wealth').length;
    const untouched = filteredLeads.filter(l => {
      const leadActs = activities.filter(a => a.leadId === l.id && a.type !== 'Internal Note');
      return leadActs.length === 0;
    }).length;

    const sourcesData = {};
    filteredLeads.forEach(l => {
      sourcesData[l.source] = (sourcesData[l.source] || 0) + 1;
    });

    const sourceChartData = Object.keys(sourcesData).map(k => ({ name: k, count: sourcesData[k] }));

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Lead Summary Analytics</h3>
        
        <div className="report-stat-summary-row">
          <div className="r-stat-box"><span>Total Leads</span><strong>{total}</strong></div>
          <div className="r-stat-box"><span>Incoming Category</span><strong>{incomingCount}</strong></div>
          <div className="r-stat-box"><span>Investor Wealth</span><strong>{investorCount}</strong></div>
          <div className="r-stat-box"><span>Untouched leads</span><strong>{untouched}</strong></div>
        </div>

        <div className="report-chart-container card">
          <h4 className="chart-title">Leads count by Source</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#D4262A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // 2. Pipeline Movement Report
  const renderPipelineMovementReport = () => {
    // Simulated pipeline stage movement counts
    const stages = ["New Lead", "Conversation Started", "Inspection Booked", "Negotiation", "Reservation", "Repeat Purchase"];
    const chartData = stages.map(s => ({
      name: s.substring(0, 14),
      Entered: filteredLeads.filter(l => l.stage === s).length + Math.floor(Math.random() * 3),
      Exited: filteredLeads.filter(l => l.stage === s).length,
      AvgDays: Math.floor(Math.random() * 8 + 2)
    }));

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Pipeline Velocity & Movement</h3>

        <div className="report-chart-container card">
          <h4 className="chart-title">Stage Entries and Exits (This Period)</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Entered" fill="#D4262A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Exited" fill="#64748B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-container" style={{ marginTop: '24px' }}>
          <table className="closers-table">
            <thead>
              <tr>
                <th>Pipeline Stage</th>
                <th>Leads Entered</th>
                <th>Leads Exited</th>
                <th>Average Days Spent</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '600' }}>{d.name}</td>
                  <td>{d.Entered} leads</td>
                  <td>{d.Exited} leads</td>
                  <td>{d.AvgDays} Days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 3. Follow-Up Performance Report
  const renderFollowUpReport = () => {
    const totalFollowUps = filteredLeads.filter(l => l.followUpDate).length;
    const missed = filteredLeads.filter(l => l.followUpDate && new Date(l.followUpDate) < new Date()).length;
    const completed = activities.filter(a => a.summary.includes("Completed")).length;
    const snoozed = activities.filter(a => a.summary.includes("snoozed")).length;
    
    const performanceData = [
      { name: 'Completed', count: completed },
      { name: 'Missed', count: missed },
      { name: 'Snoozed', count: snoozed },
      { name: 'Pending Today', count: totalFollowUps - missed }
    ];

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Follow-Up Action Summary</h3>
        <div className="report-stat-summary-row">
          <div className="r-stat-box"><span>Total Reminders</span><strong>{totalFollowUps}</strong></div>
          <div className="r-stat-box"><span>Completed Calls</span><strong>{completed}</strong></div>
          <div className="r-stat-box"><span>Snoozed Reminders</span><strong>{snoozed}</strong></div>
          <div className="r-stat-box"><span>Missed Overdue</span><strong>{missed}</strong></div>
        </div>

        <div className="report-chart-container card">
          <h4 className="chart-title">Action breakdown</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#D4262A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // 4. Inspection Report
  const renderInspectionReport = () => {
    const scheduled = inspections.filter(i => i.status === 'Scheduled').length;
    const confirmed = inspections.filter(i => i.status === 'Confirmed').length;
    const completed = inspections.filter(i => i.status === 'Completed').length;
    const noShow = inspections.filter(i => i.status === 'No-Show').length;
    const cancelled = inspections.filter(i => i.status === 'Cancelled').length;

    const data = [
      { name: 'Scheduled', count: scheduled },
      { name: 'Confirmed', count: confirmed },
      { name: 'Completed', count: completed },
      { name: 'No-Show', count: noShow },
      { name: 'Cancelled', count: cancelled }
    ];

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Site Inspections summary</h3>
        <div className="report-stat-summary-row">
          <div className="r-stat-box"><span>Scheduled</span><strong>{scheduled}</strong></div>
          <div className="r-stat-box"><span>Confirmed</span><strong>{confirmed}</strong></div>
          <div className="r-stat-box"><span>Completed Tours</span><strong>{completed}</strong></div>
          <div className="r-stat-box"><span>No-Show Rate</span><strong>{noShow}</strong></div>
        </div>

        <div className="report-chart-container card">
          <h4 className="chart-title">Inspections Status</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#D4262A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // 5. Conversion Report
  const renderConversionReport = () => {
    const data = users.filter(u => u.role === 'Sales Closer').map(closer => {
      const assigned = leads.filter(l => l.assignedCloserId === closer.id);
      const converted = assigned.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor').length;
      return {
        name: closer.name.split(' ')[0],
        Assigned: assigned.length,
        Converted: converted,
        Rate: assigned.length > 0 ? Math.round((converted / assigned.length) * 100) : 0
      };
    });

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Sales Conversion Metrics</h3>
        
        <div className="report-chart-container card">
          <h4 className="chart-title">Closer Conversion Rates (%)</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip />
                <Bar dataKey="Rate" fill="#D4262A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="table-container" style={{ marginTop: '24px' }}>
          <table className="closers-table">
            <thead>
              <tr>
                <th>Closer Name</th>
                <th>Leads Assigned</th>
                <th>Sales Converted</th>
                <th>Conversion Rate (%)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '600' }}>{c.name}</td>
                  <td>{c.Assigned} leads</td>
                  <td>{c.Converted} sales</td>
                  <td style={{ fontWeight: '700', color: 'var(--primary-red)' }}>{c.Rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // 6. Team Performance Report
  const renderTeamPerformanceReport = () => {
    const data = users.filter(u => u.role === 'Sales Closer').map(closer => {
      const assigned = leads.filter(l => l.assignedCloserId === closer.id);
      const actLogs = activities.filter(a => a.loggedBy === closer.name).length;
      const ins = inspections.filter(i => i.assignedCloserId === closer.id).length;
      return {
        name: closer.name,
        Leads: assigned.length,
        Activities: actLogs,
        Inspections: ins
      };
    });

    return (
      <div className="report-detail-pane animate-slide">
        <h3 className="report-title">Team Performance Matrix</h3>

        <div className="report-chart-container card">
          <h4 className="chart-title">Work Activity Breakdown</h4>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Leads" fill="#D4262A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Activities" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Inspections" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  const getActiveReportContent = () => {
    switch (reportType) {
      case 'Lead Summary': return renderLeadSummaryReport();
      case 'Pipeline Movement': return renderPipelineMovementReport();
      case 'Follow-Up Performance': return renderFollowUpReport();
      case 'Inspection': return renderInspectionReport();
      case 'Conversion': return renderConversionReport();
      case 'Team Performance': return renderTeamPerformanceReport();
      default: return null;
    }
  };

  return (
    <div className="reports-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Reports</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Reports & Analytics Center</h1>
          <p className="page-subtitle">Generate business intelligence reports and track conversion performance.</p>
        </div>

        <div className="header-actions-group">
          <button className="btn btn-icon btn-primary" onClick={handlePrintReport}>
            <Download size={16} />
            <span>Export Report (PDF)</span>
          </button>
          <button className="btn btn-icon" onClick={() => setShowNotifications(false) || setShowScheduleModal(true)}>
            <Mail size={16} />
            <span>Schedule E-mail</span>
          </button>
        </div>
      </div>

      {/* Select Report Panel */}
      <div className="reports-selection-panel card">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: '700' }}>Select Report Type:</label>
          <select 
            className="form-control" 
            value={reportType} 
            onChange={e => setReportType(e.target.value)}
            style={{ width: '280px', fontWeight: '600' }}
          >
            <option value="Lead Summary">Lead Summary Report</option>
            <option value="Pipeline Movement">Pipeline Movement Velocity</option>
            <option value="Follow-Up Performance">Follow-Up Performance</option>
            <option value="Inspection">Site Inspections summary</option>
            <option value="Conversion">Closer Conversion Rates</option>
            <option value="Team Performance">Team Performance Metrics</option>
          </select>
        </div>

        <div className="toolbar-filters">
          <div className="filter-item">
            <label>Period:</label>
            <select className="form-control select-sm" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="All Time">All Time</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Staff Closer:</label>
            <select className="form-control select-sm" value={filterCloser} onChange={e => setFilterCloser(e.target.value)}>
              <option value="All">All staff</option>
              {users.filter(u => u.role === 'Sales Closer').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Report Content */}
      <div className="report-main-viewport card" style={{ marginTop: '24px' }}>
        {getActiveReportContent()}
      </div>

      {/* REPORT SCHEDULER EMAIL MODAL */}
      {showScheduleModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Schedule Report Dispatch</h3>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Dispatch automated '{reportType}' updates to management email.
              </p>

              <div className="form-group">
                <label className="form-label">Recipient Email *</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={scheduleEmail}
                  onChange={e => setScheduleEmail(e.target.value)}
                  placeholder="e.g. director@beacon.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frequency Interval</label>
                <select className="form-control" value={scheduleFrequency} onChange={e => setScheduleFrequency(e.target.value)}>
                  <option value="Weekly">Weekly (Every Monday at 8:00 AM)</option>
                  <option value="Monthly">Monthly (1st of every month)</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setShowScheduleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleScheduleReport}>
                Schedule Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .reports-page {
          animation: fadeIn 0.25s ease-out;
        }

        .reports-selection-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          gap: 16px;
        }

        .report-detail-pane {
          width: 100%;
        }

        .report-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 20px;
          border-bottom: 1.5px solid var(--border-color);
          padding-bottom: 10px;
        }

        .report-stat-summary-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        .r-stat-box {
          background-color: var(--color-grey-bg);
          padding: 16px 20px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .r-stat-box span {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .r-stat-box strong {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .report-chart-container {
          padding: 24px;
          box-shadow: none;
        }

        .chart-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .closer-name-col {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }

        @media (max-width: 1024px) {
          .reports-selection-panel {
            flex-direction: column;
            align-items: flex-start;
          }
          .report-stat-summary-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .report-main-viewport, .report-main-viewport * {
            visibility: visible;
          }
          .report-main-viewport {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
