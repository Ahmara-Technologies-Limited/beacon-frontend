import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  AlertCircle, Phone, Calendar, CalendarRange, Clipboard, TrendingUp, CheckCircle, 
  Clock, DollarSign, Users, ShieldAlert, Plus, Check, AlertTriangle 
} from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { formatBudget, parseBudgetNumber } from '../lib/format';

export default function Dashboard({ currentUser, setCurrentTab, setViewingLeadId, onAddLeadClick, onLogActivityClick, onBookInspectionClick, onEditLeadClick }) {
  const [leads, setLeads] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [settings, setSettings] = useState({});

  const [dateFilter, setDateFilter] = useState('This Month');
  const [staffFilter, setStaffFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Role Dashboard Sub-tab States
  const [rmTab, setRmTab] = useState('clients');
  const [opsTab, setOpsTab] = useState('leads');
  const [bmTab, setBmTab] = useState('team');
  const [gmTab, setGmTab] = useState('performance');

  // Quick Referral creation states (Relationship Manager)
  const [refClientSource, setRefClientSource] = useState('');
  const [refName, setRefName] = useState('');
  const [refPhone, setRefPhone] = useState('');
  const [refBudget, setRefBudget] = useState('₦80,000,000');
  const [refSuccessMsg, setRefSuccessMsg] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFormattedDate = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const WelcomeBanner = ({ subtitle }) => (
    <div className="dashboard-welcome-banner">
      <p className="welcome-greeting">{getGreeting()}, {currentUser.name.split(' ')[0]} 👋</p>
      <p className="welcome-subtext">{subtitle}</p>
      <div className="welcome-date-pill">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        {getFormattedDate()}
      </div>
    </div>
  );

  const loadDashboardData = () => {
    dataService.getLeads().then(setLeads);
    dataService.getInspections().then(setInspections);
    dataService.getActivities().then(setActivities);
    dataService.getUsers().then(setUsers);
  };

  useEffect(() => {
    // Load data from the data service
    loadDashboardData();
    setSettings(db.getSettings());

    const interval = setInterval(loadDashboardData, 1500);

    return () => clearInterval(interval);
  }, [])  // Filter Helper for dates
  const filterByDate = (items, dateKey) => {
    if (dateFilter === 'All Time') return items;
    if (dateFilter === 'Custom') {
      return items.filter(item => {
        const itemDate = new Date(item[dateKey]);
        if (isNaN(itemDate.getTime())) return false;
        
        let matches = true;
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          matches = matches && itemDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          matches = matches && itemDate <= end;
        }
        return matches;
      });
    }
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return items.filter(item => {
      const itemDate = new Date(item[dateKey]);
      if (isNaN(itemDate.getTime())) return false;

      if (dateFilter === 'Today') {
        return itemDate >= startOfToday;
      } else if (dateFilter === 'This Week') {
        const startOfWeek = new Date(startOfToday.getTime() - now.getDay() * 24 * 60 * 60 * 1000);
        return itemDate >= startOfWeek;
      } else if (dateFilter === 'This Month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return itemDate >= startOfMonth;
      } else if (dateFilter === 'Last Month') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return itemDate >= startOfLastMonth && itemDate <= endOfLastMonth;
      }
      return true;
    });
  };

  // ----------------------------------------------------
  // ROLE 1: Super Admin / Management Dashboard
  // ----------------------------------------------------
  const renderManagementDashboard = () => {
    // 1. Filter Leads
    let filteredLeads = leads;
    if (staffFilter !== 'All') {
      filteredLeads = filteredLeads.filter(l => l.assignedCloserId === staffFilter);
    }
    filteredLeads = filterByDate(filteredLeads, 'dateCreated');

    // 2. Computed Stats
    const totalLeads = filteredLeads.length;
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const newLeadsToday = filteredLeads.filter(l => new Date(l.dateCreated) >= startOfToday).length;
    
    const unassignedLeads = filteredLeads.filter(l => !l.assignedCloserId).length;
    
    // Untouched leads (leads with zero activities except system notes)
    const untouchedLeads = filteredLeads.filter(l => {
      const leadActivities = activities.filter(a => a.leadId === l.id && a.type !== 'Internal Note');
      return leadActivities.length === 0;
    }).length;

    // Converted leads & Revenue
    const salesClosedLeads = filteredLeads.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor');
    const salesClosedCount = salesClosedLeads.length;
    
    const revenueGenerated = salesClosedLeads.reduce((acc, l) => {
      const num = parseBudgetNumber(l.budget);
      return acc + num;
    }, 0);

    // Follow ups
    const followUpsDueToday = filteredLeads.filter(l => {
      if (!l.followUpDate) return false;
      const fDate = new Date(l.followUpDate);
      const today = new Date();
      return fDate.getDate() === today.getDate() && 
             fDate.getMonth() === today.getMonth() && 
             fDate.getFullYear() === today.getFullYear();
    }).length;

    const missedFollowUps = filteredLeads.filter(l => {
      if (!l.followUpDate) return false;
      return new Date(l.followUpDate) < new Date() && l.stage !== 'Repeat Purchase';
    }).length;

    // Inspections
    const inspectionsThisWeek = inspections.filter(i => {
      const iDate = new Date(i.date);
      const now = new Date();
      const first = now.getDate() - now.getDay();
      const last = first + 6;
      const startOfWeek = new Date(now.setDate(first));
      const endOfWeek = new Date(now.setDate(last));
      return iDate >= startOfWeek && iDate <= endOfWeek && (i.status === 'Scheduled' || i.status === 'Confirmed');
    }).length;

    const inspectionsCompletedMonth = inspections.filter(i => {
      const iDate = new Date(i.date);
      const now = new Date();
      return iDate.getMonth() === now.getMonth() && iDate.getFullYear() === now.getFullYear() && i.status === 'Completed';
    }).length;

    // Charts Data: Pipeline Stage distribution (14 stages)
    const STAGES_ORDER = [
      "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
      "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
      "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
    ];
    const pipelineChartData = STAGES_ORDER.map(stage => {
      const count = filteredLeads.filter(l => l.stage === stage).length;
      return { name: stage.substring(0, 12), count };
    });

    // Charts Data: Lead source breakdown
    const sourcesMap = {};
    filteredLeads.forEach(l => {
      sourcesMap[l.source] = (sourcesMap[l.source] || 0) + 1;
    });
    const COLORS = [
      '#D4262A', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', 
      '#6366F1', '#8B5CF6', '#EC4899', '#64748B', '#14B8A6', '#84CC16'
    ];
    const sourceChartData = Object.keys(sourcesMap).map(key => ({
      name: key,
      value: sourcesMap[key]
    }));

    // Top 5 Closers
    const closersPerformance = users.filter(u => u.role === 'Sales Closer').map(closer => {
      const assigned = leads.filter(l => l.assignedCloserId === closer.id);
      const converted = assigned.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor').length;
      return { name: closer.name, converted, activeLeads: assigned.filter(l => l.stage !== 'Repeat Purchase').length };
    }).sort((a, b) => b.converted - a.converted).slice(0, 5);

    // Live Alerts
    const alertsList = [];
    leads.forEach(l => {
      const hasActivities = activities.some(a => a.leadId === l.id && a.type !== 'Internal Note');
      const isDormant = (new Date() - new Date(l.lastActivityDate)) > (settings.dormancyDaysThreshold * 24 * 60 * 60 * 1000);
      
      if (!l.assignedCloserId) {
        alertsList.push({ id: `alert-unassigned-${l.id}`, leadId: l.id, type: "Unassigned", message: `Lead '${l.name}' has no assigned owner.` });
      }
      if (!l.nextAction || l.nextAction.trim() === '') {
        alertsList.push({ id: `alert-nextaction-${l.id}`, leadId: l.id, type: "Next Action", message: `Lead '${l.name}' has no next action specified.` });
      }
      if (!l.followUpDate) {
        alertsList.push({ id: `alert-followup-${l.id}`, leadId: l.id, type: "Follow-Up", message: `Lead '${l.name}' has no follow-up date configured.` });
      }
      if (l.followUpDate && new Date(l.followUpDate) < new Date() && l.stage !== 'Repeat Purchase') {
        const hoursOverdue = Math.floor((new Date() - new Date(l.followUpDate)) / (3600 * 1000));
        if (hoursOverdue > 24) {
          alertsList.push({ id: `alert-overdue-${l.id}`, leadId: l.id, type: "Overdue", message: `Follow-up for '${l.name}' is overdue by ${Math.floor(hoursOverdue/24)}d ${hoursOverdue%24}h.` });
        }
      }
      // Contact threshold check (new leads not contacted in 24 hours)
      if (l.stage === 'New Lead' && !hasActivities) {
        const hoursSinceCreated = Math.floor((new Date() - new Date(l.dateCreated)) / (3600 * 1000));
        if (hoursSinceCreated > settings.contactHoursLimit) {
          alertsList.push({ id: `alert-contact-${l.id}`, leadId: l.id, type: "Uncontacted", message: `New lead '${l.name}' has not been contacted for over ${hoursSinceCreated} hours.` });
        }
      }
    });

    const formatCurrency = (val) => {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
    };

    return (
      <div className="management-dashboard">
        {/* Welcome Banner */}
        <WelcomeBanner subtitle="Here's a live overview of your entire sales pipeline and team performance." />

        {/* Filters bar */}
        <div className="dashboard-filters-bar">
          <div className="filter-group">
            <label className="filter-label">Period:</label>
            <select className="form-control filter-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              {['Today', 'This Week', 'This Month', 'Last Month', 'All Time', 'Custom'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {dateFilter === 'Custom' && (
            <>
              <div className="filter-group">
                <label className="filter-label">Start:</label>
                <input 
                  type="date" 
                  className="form-control filter-select" 
                  style={{ width: '140px' }}
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">End:</label>
                <input 
                  type="date" 
                  className="form-control filter-select" 
                  style={{ width: '140px' }}
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                />
              </div>
            </>
          )}

          <div className="filter-group">
            <label className="filter-label">Closer:</label>
            <select className="form-control filter-select" value={staffFilter} onChange={e => setStaffFilter(e.target.value)}>
              <option value="All">All Closers</option>
              {users.filter(u => u.role === 'Sales Closer').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats cards grid */}
        <div className="stat-grid">
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <span className="stat-title">Total Leads</span>
            <div className="stat-value-container">
              <span className="stat-value">{totalLeads}</span>
              <span className="stat-badge positive">+{newLeadsToday} today</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <span className="stat-title">Unassigned Leads</span>
            <div className="stat-value-container">
              <span className={`stat-value ${unassignedLeads > 0 ? 'alert-text-red' : ''}`}>{unassignedLeads}</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <span className="stat-title">Untouched Leads</span>
            <div className="stat-value-container">
              <span className="stat-value">{untouchedLeads}</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => setCurrentTab('followup')}>
            <span className="stat-title">Due Today</span>
            <div className="stat-value-container">
              <span className="stat-value">{followUpsDueToday}</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => setCurrentTab('followup')}>
            <span className="stat-title">Missed Follow-Ups</span>
            <div className="stat-value-container">
              <span className={`stat-value ${missedFollowUps > 0 ? 'alert-text-red' : ''}`}>{missedFollowUps}</span>
            </div>
          </div>

          <div className="stat-card" onClick={() => setCurrentTab('inspections')}>
            <span className="stat-title">Inspections Scheduled</span>
            <div className="stat-value-container">
              <span className="stat-value">{inspectionsThisWeek}</span>
              <span className="stat-badge positive">{inspectionsCompletedMonth} completed</span>
            </div>
          </div>

          <div className="stat-card">
            <span className="stat-title">Revenue Generated</span>
            <div className="stat-value-container">
              <span className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(revenueGenerated)}</span>
              <span className="stat-badge positive">+{salesClosedCount} sales</span>
            </div>
          </div>
        </div>

        {/* Charts & Tables Section */}
        <div className="dashboard-layout-row">
          <div className="card dashboard-main-chart">
            <h3 className="section-title">Pipeline Stage Distribution</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={pipelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#D4262A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card dashboard-side-chart">
            <h3 className="section-title">Lead Acquisition Sources</h3>
            <div style={{ width: '100%', height: 220, display: 'flex', alignItems: 'center' }}>
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {sourceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-chart-legend">
                {sourceChartData.map((entry, idx) => (
                  <div key={entry.name} className="legend-item">
                    <span className="legend-dot" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="legend-text">{entry.name} ({entry.value})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-layout-row" style={{ marginTop: '24px' }}>
          {/* Top Closers Table */}
          <div className="card dashboard-table-half">
            <h3 className="section-title">Top 5 Closers (This Month)</h3>
            <table className="closers-table">
              <thead>
                <tr>
                  <th>Closer Name</th>
                  <th>Sales Converted</th>
                  <th>Active Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {closersPerformance.map((c, i) => (
                  <tr key={i}>
                    <td className="closer-name-col">
                      <div className="avatar-sm">{c.name.split(' ').map(n => n[0]).join('')}</div>
                      <span>{c.name}</span>
                    </td>
                    <td><span className="badge badge-success">{c.converted} Converted</span></td>
                    <td>{c.activeLeads} active</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Live Alerts Panel */}
          <div className="card dashboard-alerts-half">
            <h3 className="section-title">Live Alerts Feed ({alertsList.length})</h3>
            <div className="alerts-feed-list">
              {alertsList.length === 0 ? (
                <div className="empty-alerts">
                  <CheckCircle size={32} className="success-icon" />
                  <p>All clear! No pending policy violations or unassigned leads.</p>
                </div>
              ) : (
                alertsList.map(alert => (
                  <div 
                    key={alert.id} 
                    className="alert-feed-item"
                    onClick={() => {
                      setViewingLeadId(alert.leadId);
                      setCurrentTab('leads');
                    }}
                  >
                    <AlertTriangle size={18} className="alert-icon" />
                    <span className="alert-message">{alert.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities list */}
        <div className="card" style={{ marginTop: '24px' }}>
          <h3 className="section-title">Recent Activity Feed</h3>
          <div className="activity-feed-list">
            {activities.slice(0, 10).map(a => {
              const leadName = leads.find(l => l.id === a.leadId)?.name || "Unknown Lead";
              return (
                <div key={a.id} className="activity-feed-row">
                  <div className="activity-feed-left">
                    <span className={`badge activity-type-badge ${a.type.toLowerCase() === 'call' ? 'badge-success' : a.type.toLowerCase() === 'whatsapp' ? 'badge-warm' : 'badge-grey'}`}>{a.type}</span>
                    <div className="activity-feed-details">
                      <span className="activity-feed-user-text">
                        <strong>{a.loggedBy}</strong> on lead <span className="highlight-lead-name" onClick={() => { setViewingLeadId(a.leadId); setCurrentTab('leads'); }}>{leadName}</span>
                      </span>
                      <p className="activity-feed-desc-text">"{a.summary}"</p>
                    </div>
                  </div>
                  <div className="activity-feed-right">
                    <span className="activity-feed-time">
                      {new Date(a.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(a.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ROLE 2: Sales Closer Dashboard
  const renderCloserDashboard = () => {
    const myLeads = leads.filter(l => l.assignedCloserId === currentUser.id);
    const totalAssignedLeads = myLeads.length;
    const activeLeads = myLeads.filter(l => l.stage !== 'Repeat Purchase' && l.stage !== 'Client/Investor').length;
    
    const myInspectionsBooked = inspections.filter(i => 
      i.assignedCloserId === currentUser.id && 
      new Date(i.date).getMonth() === new Date().getMonth() &&
      i.status !== 'Cancelled'
    ).length;

    const myConversions = myLeads.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor').length;

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Calculate leads assigned to this closer during the current week (starting Sunday)
    const startOfWeek = new Date(startOfToday.getTime() - today.getDay() * 24 * 60 * 60 * 1000);
    startOfWeek.setHours(0, 0, 0, 0);
    const assignedThisWeek = myLeads.filter(l => new Date(l.dateCreated) >= startOfWeek).length;

    const followUpsToday = myLeads.filter(l => {
      if (!l.followUpDate) return false;
      const fDate = new Date(l.followUpDate);
      return fDate >= startOfToday && fDate <= endOfToday && l.stage !== 'Repeat Purchase';
    }).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));

    const overdueFollowUps = myLeads.filter(l => {
      if (!l.followUpDate) return false;
      return new Date(l.followUpDate) < startOfToday && l.stage !== 'Repeat Purchase';
    }).sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate));

    const STAGES_ORDER = [
      "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
      "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
      "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
    ];
    
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const upcomingInspections = inspections.filter(i => 
      i.assignedCloserId === currentUser.id && 
      new Date(i.date) >= startOfToday && 
      new Date(i.date) <= sevenDaysLater &&
      (i.status === 'Scheduled' || i.status === 'Confirmed')
    ).sort((a,b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

    const myActivities = activities.filter(a => a.loggedBy === currentUser.name).slice(0, 5);

    const hotLeads = myLeads.filter(l => l.temperature === 'Hot' && l.stage !== 'Repeat Purchase').slice(0, 5);

    return (
      <div className="closer-dashboard">
        <WelcomeBanner subtitle="Track your portfolio, manage today's follow-ups, and close more deals." />

        {/* Quick action buttons */}
        <div className="dashboard-header-actions" style={{ marginBottom: '24px', display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" onClick={onAddLeadClick}>
            <Plus size={16} />
            <span>Add New Lead</span>
          </button>
          <button className="btn" onClick={() => setCurrentTab('followup')}>
            <Phone size={16} />
            <span>My Follow-Ups</span>
          </button>
          <button className="btn" onClick={() => setCurrentTab('inspections')}>
            <CalendarRange size={16} />
            <span>My Inspections</span>
          </button>
        </div>

        {/* Stats grid */}
        <div className="stat-grid">
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon blue"><Users size={20} /></div>
            <div>
              <div className="stat-title">My Assigned Leads</div>
              <div className="stat-value-container">
                <span className="stat-value">{totalAssignedLeads}</span>
                <span className="stat-badge positive">+{assignedThisWeek} this week</span>
              </div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon amber"><TrendingUp size={20} /></div>
            <div>
              <div className="stat-title">Active Portfolio</div>
              <div className="stat-value-container"><span className="stat-value">{activeLeads}</span></div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('followup')}>
            <div className={`stat-card-icon ${overdueFollowUps.length > 0 ? 'red' : 'green'}`}><Clock size={20} /></div>
            <div>
              <div className="stat-title">Due Today</div>
              <div className="stat-value-container">
                <span className={`stat-value ${overdueFollowUps.length > 0 ? 'alert-text-red' : ''}`}>{followUpsToday.length}</span>
                {overdueFollowUps.length > 0 && <span className="stat-badge negative">{overdueFollowUps.length} overdue</span>}
              </div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('inspections')}>
            <div className="stat-card-icon"><Calendar size={20} /></div>
            <div>
              <div className="stat-title">Inspections Booked</div>
              <div className="stat-value-container"><span className="stat-value">{myInspectionsBooked}</span></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><CheckCircle size={20} /></div>
            <div>
              <div className="stat-title">Conversions</div>
              <div className="stat-value-container"><span className="stat-value">{myConversions}</span></div>
            </div>
          </div>
        </div>

        <div className="dashboard-layout-row">
          {/* Priority Queue */}
          <div className="card" style={{ flex: 1.5 }}>
            <h3 className="section-title" style={{ color: 'var(--primary-red)' }}>Today's Priority Queue</h3>
            
            {overdueFollowUps.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#D92D20', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} /> {overdueFollowUps.length} Overdue Follow-up{overdueFollowUps.length > 1 ? 's' : ''}
                </div>
                <div className="closer-alerts-list">
                  {overdueFollowUps.slice(0,3).map(lead => (
                    <div key={lead.id} className="closer-alert-row" onClick={() => { setViewingLeadId(lead.id); setCurrentTab('leads'); }}>
                      <div className="avatar-sm-mini" style={{ background: '#D4262A', color: '#fff', width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{lead.name.charAt(0)}</div>
                      <div style={{ flex: 1, minWidth:0 }}>
                        <div style={{ fontWeight: '600', fontSize:'13px', color: 'var(--text-primary)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lead.name}</div>
                        <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{lead.phone}</div>
                      </div>
                      <span className="badge badge-hot">{lead.stage}</span>
                      <span style={{ fontSize:'11px', fontWeight:'600', color:'#D92D20', whiteSpace:'nowrap' }}>{Math.floor((new Date() - new Date(lead.followUpDate)) / (3600*1000*24))}d overdue</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px' }}>📅 Due Today ({followUpsToday.length})</div>
              {followUpsToday.length === 0 ? (
                <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'var(--color-success-text)', padding:'12px', background:'var(--color-success-bg)', borderRadius:'8px', fontSize:'13px' }}>
                  <Check size={16} /> No more follow-ups today. Great work!
                </div>
              ) : (
                <div className="closer-alerts-list">
                  {followUpsToday.map(lead => (
                    <div key={lead.id} className="closer-alert-row" onClick={() => { setViewingLeadId(lead.id); setCurrentTab('leads'); }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--color-grey-bg)', color:'var(--text-secondary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', flexShrink:0 }}>{lead.name.charAt(0)}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:'600', fontSize:'13px', color:'var(--text-primary)' }}>{lead.name}</div>
                        <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{lead.phone}</div>
                      </div>
                      <span className="badge badge-grey">{lead.stage}</span>
                      <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-primary)' }}>{new Date(lead.followUpDate).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pipeline Snapshot */}
          <div className="card" style={{ flex: 1 }}>
            <h3 className="section-title">My Pipeline Snapshot</h3>
            <div className="pipeline-snapshot-list">
              {STAGES_ORDER.map(stage => {
                const count = myLeads.filter(l => l.stage === stage).length;
                if (count === 0) return null;
                const pct = Math.round((count / totalAssignedLeads) * 100);
                return (
                  <div key={stage} style={{ marginBottom:'10px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'4px' }}>
                      <span style={{ fontWeight:'600', color:'var(--text-primary)' }}>{stage}</span>
                      <span style={{ fontWeight:'700', color:'var(--primary-red)' }}>{count}</span>
                    </div>
                    <div style={{ height:'4px', background:'var(--color-grey-bg)', borderRadius:'4px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${pct}%`, background:'var(--primary-red)', borderRadius:'4px', transition:'width 0.4s' }} />
                    </div>
                  </div>
                );
              })}
              {myLeads.length === 0 && <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>No leads assigned yet.</span>}
            </div>
          </div>
        </div>

        {/* Upcoming Inspections + Recent Activity */}
        <div className="dashboard-layout-row">
          <div className="card" style={{ flex: 1.2 }}>
            <h3 className="section-title">Upcoming Site Inspections (Next 7 Days)</h3>
            {upcomingInspections.length === 0 ? (
              <div className="empty-table-state">No site inspections scheduled.</div>
            ) : (
              <table className="closers-table">
                <thead>
                  <tr><th>Lead Name</th><th>Estate</th><th>Date / Time</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {upcomingInspections.map(i => {
                    const lName = leads.find(l => l.id === i.leadId)?.name || "Unknown";
                    return (
                      <tr key={i.id} onClick={() => { setViewingLeadId(i.leadId); setCurrentTab('leads'); }}>
                        <td className="lead-name-cell">{lName}</td>
                        <td>{i.estate}</td>
                        <td>{i.date} @ {i.time}</td>
                        <td><span className={`badge ${i.status === 'Confirmed' ? 'badge-success' : 'badge-cold'}`}>{i.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ flex: 1 }}>
            <h3 className="section-title">🔥 Hot Leads to Prioritise</h3>
            {hotLeads.length === 0 ? (
              <div className="empty-table-state">No hot leads at this time.</div>
            ) : (
              <div className="closer-alerts-list">
                {hotLeads.map(lead => (
                  <div key={lead.id} className="closer-alert-row" onClick={() => { setViewingLeadId(lead.id); setCurrentTab('leads'); }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(212,38,42,0.1)', color:'var(--primary-red)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', flexShrink:0 }}>{lead.name.charAt(0)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:'600', fontSize:'13px', color:'var(--text-primary)' }}>{lead.name}</div>
                      <div style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{lead.stage}</div>
                    </div>
                    <span className="badge badge-hot">Hot</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ROLE 3: Inspection Officer Dashboard
  const renderInspectionOfficerDashboard = () => {
    const myInspections = inspections.filter(i => i.inspectionOfficerId === currentUser.id);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayInspections = myInspections.filter(i => i.date === todayStr);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    const thisWeekInspections = myInspections.filter(i => {
      const d = new Date(i.date);
      return d >= startOfWeek && d <= endOfWeek;
    });

    const pendingConfirmation = myInspections.filter(i => i.status === 'Scheduled');
    const completedThisMonth = myInspections.filter(i => 
      i.status === 'Completed' && 
      new Date(i.date).getMonth() === new Date().getMonth()
    ).length;

    const noShowsThisMonth = myInspections.filter(i => 
      i.status === 'No-Show' && 
      new Date(i.date).getMonth() === new Date().getMonth()
    ).length;

    // Week Calendar Strip
    const daysOfWeek = [];
    const curr = new Date();
    const first = curr.getDate() - curr.getDay(); // Sunday
    for (let index = 0; index < 7; index++) {
      const dayDate = new Date(curr.setDate(first + index));
      const dateStr = dayDate.toISOString().split('T')[0];
      const count = myInspections.filter(i => i.date === dateStr).length;
      daysOfWeek.push({
        name: dayDate.toLocaleDateString([], { weekday: 'short' }),
        dayNum: dayDate.getDate(),
        dateStr,
        isToday: dateStr === todayStr,
        count
      });
    }

    const handleQuickStatusUpdate = async (id, newStatus) => {
      const list = await dataService.getInspections();
      const ins = list.find(i => i.id === id);
      if (ins) {
        if (newStatus === 'Completed' || newStatus === 'No-Show') {
          // Open the inspection details screen to fill the report fields
          onBookInspectionClick(ins.leadId, ins.id);
        } else {
          await dataService.saveInspection({ ...ins, status: newStatus });
          setInspections(await dataService.getInspections());
        }
      }
    };

    return (
      <div className="officer-dashboard">
        <WelcomeBanner subtitle="Manage your inspection schedule and keep site visits on track." />

        {/* Inspection Officer Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-icon red"><Calendar size={20} /></div>
            <div>
              <div className="stat-title">Today's Inspections</div>
              <div className="stat-value-container"><span className="stat-value">{todayInspections.length}</span></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon blue"><Clock size={20} /></div>
            <div>
              <div className="stat-title">This Week's Assignments</div>
              <div className="stat-value-container"><span className="stat-value">{thisWeekInspections.length}</span></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon amber"><AlertCircle size={20} /></div>
            <div>
              <div className="stat-title">Pending Confirmation</div>
              <div className="stat-value-container"><span className="stat-value">{pendingConfirmation.length}</span></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon green"><CheckCircle size={20} /></div>
            <div>
              <div className="stat-title">Completed This Month</div>
              <div className="stat-value-container">
                <span className="stat-value">{completedThisMonth}</span>
                <span className="stat-badge negative">{noShowsThisMonth} no-shows</span>
              </div>
            </div>
          </div>
        </div>


        {/* Calendar Strip */}
        <div className="card calendar-strip-card" style={{ marginBottom: '24px' }}>
          <h3 className="section-title">My Calendar (This Week)</h3>
          <div className="calendar-strip">
            {daysOfWeek.map(d => (
              <div key={d.dateStr} className={`calendar-day-box ${d.isToday ? 'current-day' : ''}`}>
                <span className="calendar-day-name">{d.name}</span>
                <span className="calendar-day-num">{d.dayNum}</span>
                {d.count > 0 && (
                  <span className="calendar-day-badge">{d.count} scheduled</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Inspections Queue */}
        <div className="card">
          <h3 className="section-title">Today's Scheduled Inspections</h3>
          {todayInspections.length === 0 ? (
            <div className="empty-table-state">No site inspections scheduled for today.</div>
          ) : (
            <table className="closers-table">
              <thead>
                <tr>
                  <th>Lead Name</th>
                  <th>Estate / Property</th>
                  <th>Scheduled Time</th>
                  <th>Meeting Point</th>
                  <th>Assigned Closer</th>
                  <th>Status</th>
                  <th>Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayInspections.map(i => {
                  const leadObj = leads.find(l => l.id === i.leadId);
                  const closerName = users.find(u => u.id === i.assignedCloserId)?.name || "Unknown Closer";
                  return (
                    <tr 
                      key={i.id}
                      onClick={() => {
                        if (leadObj) {
                          setViewingLeadId(leadObj.id, i.id);
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="lead-name-cell">{leadObj?.name}</td>
                      <td>{i.estate}</td>
                      <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{i.time}</td>
                      <td>{i.meetingPoint}</td>
                      <td>{closerName}</td>
                      <td>
                        <span className={`badge ${
                          i.status === 'Confirmed' ? 'badge-success' : 
                          i.status === 'Completed' ? 'badge-success' :
                          i.status === 'No-Show' ? 'badge-hot' : 'badge-cold'
                        }`}>
                          {i.status}
                        </span>
                      </td>
                      <td>
                        <div className="quick-action-buttons">
                          {i.status === 'Scheduled' && (
                            <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(i.id, 'Confirmed'); }}>
                              Confirm Client
                            </button>
                          )}
                          {(i.status === 'Scheduled' || i.status === 'Confirmed') && (
                            <>
                              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(i.id, 'Completed'); }}>
                                Mark Done
                              </button>
                              <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleQuickStatusUpdate(i.id, 'No-Show'); }}>
                                No-Show
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // ROLE 4: Admin / Documentation Officer Dashboard
  // ----------------------------------------------------
  const renderDocOfficerDashboard = () => {
    // Stat cards for: Reservation, Payment, Documentation, Allocation
    const reservationCount = leads.filter(l => l.stage === 'Reservation').length;
    const paymentCount = leads.filter(l => l.stage === 'Payment').length;
    const docCount = leads.filter(l => l.stage === 'Documentation').length;
    const allocationCount = leads.filter(l => l.stage === 'Allocation').length;

    // List of leads currently at Documentation or Allocation stages
    const pendingAdminLeads = leads.filter(l => 
      l.stage === 'Reservation' || 
      l.stage === 'Payment' || 
      l.stage === 'Documentation' || 
      l.stage === 'Allocation'
    ).sort((a,b) => new Date(b.lastActivityDate) - new Date(a.lastActivityDate));

    // Recent activity feed on tracked leads (last 5)
    const trackedLeadIds = pendingAdminLeads.map(l => l.id);
    const docActivities = activities.filter(a => trackedLeadIds.includes(a.leadId)).slice(0, 5);

    return (
      <div className="doc-officer-dashboard">
        <WelcomeBanner subtitle="Monitor the administrative pipeline — reservations, payments, documentation and allocation." />

        <div className="stat-grid">
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon amber"><DollarSign size={20} /></div>
            <div>
              <div className="stat-title">Reservation Stage</div>
              <div className="stat-value-container"><span className="stat-value">{reservationCount}</span><span className="stat-badge positive">leads</span></div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon green"><CheckCircle size={20} /></div>
            <div>
              <div className="stat-title">Payment Stage</div>
              <div className="stat-value-container"><span className="stat-value">{paymentCount}</span><span className="stat-badge positive">leads</span></div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon blue"><Clipboard size={20} /></div>
            <div>
              <div className="stat-title">Documentation Stage</div>
              <div className="stat-value-container"><span className="stat-value">{docCount}</span><span className="stat-badge positive">leads</span></div>
            </div>
          </div>
          <div className="stat-card" onClick={() => setCurrentTab('leads')}>
            <div className="stat-card-icon red"><ShieldAlert size={20} /></div>
            <div>
              <div className="stat-title">Allocation Stage</div>
              <div className="stat-value-container"><span className="stat-value">{allocationCount}</span><span className="stat-badge positive">leads</span></div>
            </div>
          </div>
        </div>


        <div className="dashboard-layout-row">
          {/* Tracked Leads Table */}
          <div className="card" style={{ flex: 1.5 }}>
            <h3 className="section-title">Administrative Action Queue</h3>
            {pendingAdminLeads.length === 0 ? (
              <div className="empty-table-state">No leads in reservation or payment stages.</div>
            ) : (
              <table className="closers-table">
                <thead>
                  <tr>
                    <th>Lead Name</th>
                    <th>Assigned Closer</th>
                    <th>Current Stage</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingAdminLeads.map(l => {
                    const closerName = users.find(u => u.id === l.assignedCloserId)?.name || "Unassigned";
                    return (
                      <tr key={l.id} onClick={() => { setViewingLeadId(l.id); setCurrentTab('leads'); }}>
                        <td className="lead-name-cell">{l.name}</td>
                        <td>{closerName}</td>
                        <td><span className="badge badge-grey">{l.stage}</span></td>
                        <td>{new Date(l.lastActivityDate).toLocaleDateString()}</td>
                        <td>
                          <button className="btn btn-sm btn-primary">
                            Log Internal Note
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Activity on tracked leads */}
          <div className="card" style={{ flex: 1 }}>
            <h3 className="section-title">Tracked Leads Activity Log</h3>
            <div className="my-activities-list">
              {docActivities.length === 0 ? (
                <div className="empty-table-state">No recent activities on tracked administrative leads.</div>
              ) : (
                docActivities.map(act => {
                  const lName = leads.find(l => l.id === act.leadId)?.name || "Unknown";
                  return (
                    <div key={act.id} className="closer-activity-row">
                      <div className="c-act-top">
                        <span className="badge badge-success">{act.type}</span>
                        <span className="c-act-time">{new Date(act.date).toLocaleDateString()}</span>
                      </div>
                      <div className="c-act-summary">
                        <strong>{act.loggedBy}</strong> on <strong>{lName}</strong>: "{act.summary}"
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ROLE 5: Relationship Manager Dashboard
  const renderRelationshipManagerDashboard = () => {
    const clients = leads.filter(l => l.stage === 'Client/Investor' || l.stage === 'Repeat Purchase');
    const referrals = leads.filter(l => l.source === 'Referral');
    
    const totalClients = clients.length;
    const repeatPurchasers = clients.filter(c => c.stage === 'Repeat Purchase').length;
    
    // Average satisfaction score of rated clients
    const ratedClients = clients.filter(c => c.satisfactionScore);
    const avgSatisfaction = ratedClients.length > 0 
      ? (ratedClients.reduce((sum, c) => sum + Number(c.satisfactionScore), 0) / ratedClients.length).toFixed(1) 
      : 'N/A';
      
    // Retention rate: active clients vs dormant clients
    const activeClientsCount = clients.filter(c => c.relationshipStatus !== 'Dormant').length;
    const retentionRate = totalClients > 0 
      ? ((activeClientsCount / totalClients) * 100).toFixed(0) 
      : '100';

    // Non-Negotiables Alert List
    const nonNegotiableViolations = clients.filter(c => 
      !c.relationshipStatus || !c.lastContactDate || !c.followUpDate || !c.referralStatus || c.referralStatus === 'None'
    );

    const handleCreateQuickReferral = (e) => {
      e.preventDefault();
      if (!refName.trim() || !refPhone.trim() || !refClientSource) {
        alert("Referral Name, Phone, and Referring Client are required.");
        return;
      }
      
      const payload = {
        name: refName,
        phone: refPhone,
        whatsapp: refPhone,
        email: "",
        location: "",
        source: "Referral",
        category: "Investor Wealth",
        stage: "New Lead",
        temperature: "Hot",
        assignedCloserId: "u-2", // default Ahmad Bello
        branch: "Lekki Branch",
        budget: refBudget,
        propertyInterest: "Pending Selection",
        nextAction: "Initial call to referred contact",
        followUpDate: new Date(Date.now() + 24*60*60*1000).toISOString().slice(0, 16),
        referredById: refClientSource
      };

      dataService.saveLead(payload);
      
      // Update client referral count
      const referrer = clients.find(c => c.id === refClientSource);
      if (referrer) {
        dataService.saveLead({
          ...referrer,
          referralCount: (referrer.referralCount || 0) + 1,
          referralStatus: "Generated Referral"
        });
      }

      setRefName('');
      setRefPhone('');
      setRefSuccessMsg(`Successfully created referral lead for ${refName}!`);
      setTimeout(() => setRefSuccessMsg(''), 4000);
    };

    return (
      <div className="relationship-manager-dashboard">
        <WelcomeBanner subtitle="Client Engagement Hub — Convert leads, generate referrals, and drive repeat purchases." />
        
        {/* Metric Cards */}
        <div className="dashboard-stats-grid">
          <div className="stat-card card">
            <span className="stat-label">Referrals Generated</span>
            <span className="stat-value text-blue">{referrals.length}</span>
            <span className="stat-subtext">Active referred leads in system</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Repeat Purchases</span>
            <span className="stat-value text-green">{repeatPurchasers}</span>
            <span className="stat-subtext">Clients with multiple deals</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Average Satisfaction</span>
            <span className="stat-value text-red">{avgSatisfaction} <span style={{fontSize: '16px'}}>★</span></span>
            <span className="stat-subtext">Rated client experience score</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Client Retention Rate</span>
            <span className="stat-value">{retentionRate}%</span>
            <span className="stat-subtext">Active vs dormant clients</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">RM Response SLA</span>
            <span className="stat-value text-yellow">2.4h</span>
            <span className="stat-subtext">Average follow-up contact time</span>
          </div>
        </div>

        {/* Non-Negotiables Alert Card */}
        {nonNegotiableViolations.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary-red)', background: 'rgba(212,38,42,0.02)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} className="alert-icon" />
              <h3 className="section-title" style={{ margin: 0, fontSize: '15px', color: 'var(--primary-red)' }}>Client Compliance Breaches ({nonNegotiableViolations.length})</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              The following clients are missing one or more non-negotiable details (Relationship Status, Last Contact Date, Next Follow-up Date, or Referral Status).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {nonNegotiableViolations.map(c => {
                const missing = [];
                if (!c.relationshipStatus) missing.push("relationship status");
                if (!c.lastContactDate) missing.push("last contact date");
                if (!c.followUpDate) missing.push("next follow-up date");
                if (!c.referralStatus || c.referralStatus === 'None') missing.push("referral status");
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Missing: {missing.join(", ")}</span>
                    </div>
                    <button className="btn btn-xs btn-primary" onClick={() => onEditLeadClick(c.id)}>Configure Client</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Workspace Sub-tabs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
            <button className={`tab-btn ${rmTab === 'clients' ? 'active' : ''}`} onClick={() => setRmTab('clients')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: rmTab === 'clients' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: rmTab === 'clients' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Clients Portfolio ({clients.length})
            </button>
            <button className={`tab-btn ${rmTab === 'referrals' ? 'active' : ''}`} onClick={() => setRmTab('referrals')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: rmTab === 'referrals' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: rmTab === 'referrals' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Referral Management
            </button>
            <button className={`tab-btn ${rmTab === 'communication' ? 'active' : ''}`} onClick={() => setRmTab('communication')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: rmTab === 'communication' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: rmTab === 'communication' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Communication & Broadcasts
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {rmTab === 'clients' && (
              <div>
                <h3 className="section-title">Client Portfolio Overview</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Client</th>
                        <th style={{ padding: '12px' }}>Health</th>
                        <th style={{ padding: '12px' }}>Satisfaction</th>
                        <th style={{ padding: '12px' }}>Last Contact</th>
                        <th style={{ padding: '12px' }}>Next Follow-Up</th>
                        <th style={{ padding: '12px' }}>Referral Status</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.phone}</div>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge badge-${(c.relationshipStatus || 'Active').toLowerCase().replace(' ', '-')}`}>
                              {c.relationshipStatus || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '2px', color: '#FFD700' }}>
                              {Array.from({ length: c.satisfactionScore || 4 }).map((_, i) => <span key={i}>★</span>)}
                              {Array.from({ length: 5 - (c.satisfactionScore || 4) }).map((_, i) => <span key={i} style={{color: 'var(--text-placeholder)'}}>★</span>)}
                            </div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>
                            {c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString() : 'Never'}
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px', color: new Date(c.followUpDate) < new Date() ? 'var(--primary-red)' : 'inherit' }}>
                            {c.followUpDate ? new Date(c.followUpDate).toLocaleString() : 'Not Set'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600' }}>{c.referralStatus || 'None'}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-xs btn-primary" onClick={() => {
                                // Quick log call action
                                const todayStr = new Date().toISOString().split('T')[0];
                                const updated = {
                                  ...c,
                                  lastContactDate: todayStr,
                                  followUpDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 16) // next contact in 30 days
                                };
                                dataService.saveLead(updated);
                                alert(`Quick call logged for ${c.name}! Next contact set to 30 days.`);
                                dataService.saveActivity({
                                  leadId: c.id,
                                  type: "Call",
                                  summary: "Completed monthly relationship and experience call.",
                                  objections: "None",
                                  feedback: "Highly satisfied client.",
                                  nextStep: "Check in next month.",
                                  loggedBy: currentUser.name
                                });
                              }}>Log Call</button>
                              <button className="btn btn-xs" onClick={() => setViewingLeadId(c.id)}>Profile</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {rmTab === 'referrals' && (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 300px' }} className="card">
                  <h3 className="section-title">Log a New Referral</h3>
                  {refSuccessMsg && (
                    <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success-text)', color: 'var(--color-success-text)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                      {refSuccessMsg}
                    </div>
                  )}
                  <form onSubmit={handleCreateQuickReferral}>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Referring Client *</label>
                      <select className="form-control" value={refClientSource} onChange={e => setRefClientSource(e.target.value)}>
                        <option value="">-- Select Referrer Client --</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Referral Contact Name *</label>
                      <input className="form-control" type="text" value={refName} onChange={e => setRefName(e.target.value)} placeholder="e.g. John Doe" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Referral Contact Phone *</label>
                      <input className="form-control" type="text" value={refPhone} onChange={e => setRefPhone(e.target.value)} placeholder="e.g. 080XXXXXXXX" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="form-label" style={{ fontSize: '12px' }}>Estimated Budget</label>
                      <input className="form-control" type="text" value={refBudget} onChange={e => setRefBudget(e.target.value)} placeholder="e.g. ₦100,000,000" />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%' }} type="submit">Submit Referral Lead</button>
                  </form>
                </div>

                <div style={{ flex: '2 1 450px' }} className="card">
                  <h3 className="section-title">Referred Leads Tracker</h3>
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Referral Lead</th>
                          <th style={{ padding: '12px' }}>Referred By</th>
                          <th style={{ padding: '12px' }}>Stage</th>
                          <th style={{ padding: '12px' }}>Closer</th>
                          <th style={{ padding: '12px' }}>Temp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.map(r => {
                          const referrer = clients.find(c => c.id === r.referredById);
                          const closer = users.find(u => u.id === r.assignedCloserId);
                          return (
                            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px' }}>
                                <div style={{ fontWeight: '600' }}>{r.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{r.phone}</div>
                              </td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>
                                {referrer ? referrer.name : "System / Unknown"}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className="badge badge-success">{r.stage}</span>
                              </td>
                              <td style={{ padding: '12px', fontSize: '13px' }}>
                                {closer ? closer.name : "Unassigned"}
                              </td>
                              <td style={{ padding: '12px' }}>
                                <span className={`badge badge-${r.temperature.toLowerCase()}`}>{r.temperature}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {rmTab === 'communication' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <h3 className="section-title">Client Broadcast Center</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Quickly engage your entire client portfolio with updates, newsletters, or new premium project releases.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-primary" onClick={() => {
                      db.logAudit(`Relationship Manager sent WhatsApp newsletter broadcast to all ${clients.length} clients.`);
                      alert("Broadcast sent successfully to WhatsApp gateway simulation!");
                    }}>Simulate WhatsApp Newsletter Broadcast</button>
                    <button className="btn btn-secondary" onClick={() => {
                      db.logAudit(`Relationship Manager sent email campaign broadcast to all ${clients.length} clients.`);
                      alert("Email Campaign launched successfully in simulation!");
                    }}>Launch Email Portfolio Campaign</button>
                  </div>
                </div>

                <div className="card">
                  <h3 className="section-title">Complaints & Experience Monitoring</h3>
                  <div style={{ padding: '14px', background: 'var(--color-grey-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertCircle size={20} className="alert-icon" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>No Unresolved Client Complaints</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>All feedback scores are currently positive (&gt;3 stars).</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ROLE 6: Head of Operations Dashboard
  const renderHeadOfOperationsDashboard = () => {
    const unassignedLeads = leads.filter(l => !l.assignedCloserId);
    
    // Follow up compliance: count leads that have followUpDate and are not overdue (i.e. next follow up is >= today)
    const totalLeadsWithFollowUp = leads.filter(l => l.followUpDate);
    const compliantFollowUps = totalLeadsWithFollowUp.filter(l => new Date(l.followUpDate) >= new Date());
    const followUpComplianceRate = totalLeadsWithFollowUp.length > 0
      ? ((compliantFollowUps.length / totalLeadsWithFollowUp.length) * 100).toFixed(0)
      : '100';

    const completedInspections = inspections.filter(i => i.status === 'Completed');
    const totalInspectionsCount = inspections.length;
    const inspectionCompletionRate = totalInspectionsCount > 0
      ? ((completedInspections.length / totalInspectionsCount) * 100).toFixed(0)
      : '100';

    // Documentation compliance: leads in payment/doc/allocation stages with approved documents
    const docLeads = leads.filter(l => ['Payment', 'Allocation', 'Documentation', 'Client/Investor', 'Repeat Purchase'].includes(l.stage));
    const completedDocs = docLeads.filter(l => l.applicationFormStatus === 'Approved' && l.offerLetterStatus === 'Accepted');
    const docCompletionRate = docLeads.length > 0
      ? ((completedDocs.length / docLeads.length) * 100).toFixed(0)
      : '100';

    const closers = users.filter(u => u.role === 'Sales Closer');

    // Operations breaches (Unassigned leads, missing next action, missing follow-up)
    const operationsBreaches = leads.filter(l => 
      !l.assignedCloserId || !l.nextAction || !l.followUpDate
    );

    const handleAssignCloser = (leadId, closerId) => {
      if (!closerId) return;
      const lead = leads.find(l => l.id === leadId);
      const closer = closers.find(u => u.id === closerId);
      if (lead && closer) {
        const updated = {
          ...lead,
          assignedCloserId: closerId,
          branch: closer.branch || "Lekki Branch"
        };
        dataService.saveLead(updated);
        alert(`Lead ${lead.name} successfully assigned to closer ${closer.name} (${closer.branch || 'No Branch'}).`);
        db.addNotification({
          type: "Lead Assigned",
          message: `Operations assigned lead '${lead.name}' to you.`,
          recipientId: closerId,
          link: `/leads/${lead.id}`
        });
      }
    };

    return (
      <div className="operations-dashboard">
        <WelcomeBanner subtitle="Operations Command — Keep pipelines running smoothly, audits secure, and allocations verified." />

        {/* Metric Cards */}
        <div className="dashboard-stats-grid">
          <div className="stat-card card">
            <span className="stat-label">Unassigned Leads</span>
            <span className="stat-value text-red">{unassignedLeads.length}</span>
            <span className="stat-subtext">Awaiting closer allocation</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Follow-Up Compliance</span>
            <span className="stat-value text-green">{followUpComplianceRate}%</span>
            <span className="stat-subtext">Active next actions scheduled</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Inspection Success</span>
            <span className="stat-value text-blue">{inspectionCompletionRate}%</span>
            <span className="stat-subtext">Completed vs scheduled tours</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Document Completion</span>
            <span className="stat-value text-purple">{docCompletionRate}%</span>
            <span className="stat-subtext">Approved legal / allocation files</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Allocation Time</span>
            <span className="stat-value">1.5d</span>
            <span className="stat-subtext">Average post-payment confirmation</span>
          </div>
        </div>

        {/* Operations Breaches Alert (Non-Negotiables) */}
        {operationsBreaches.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary-red)', background: 'rgba(212,38,42,0.02)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldAlert size={18} className="alert-icon" />
              <h3 className="section-title" style={{ margin: 0, fontSize: '15px', color: 'var(--primary-red)' }}>Critical Operations Breaches ({operationsBreaches.length})</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              The following leads violate operational non-negotiables: remaining unassigned, lacking a next action, or lacking a follow-up date.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {operationsBreaches.slice(0, 10).map(l => {
                const violations = [];
                if (!l.assignedCloserId) violations.push("Unassigned Lead");
                if (!l.nextAction) violations.push("No Next Action");
                if (!l.followUpDate) violations.push("No Follow-Up Date");
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{l.name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Breaches: {violations.join(", ")}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!l.assignedCloserId && (
                        <select
                          className="form-control"
                          style={{ width: '150px', padding: '4px 8px', fontSize: '12px', height: 'auto' }}
                          onChange={(e) => handleAssignCloser(l.id, e.target.value)}
                        >
                          <option value="">-- Assign Closer --</option>
                          {closers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.branch || 'No Branch'})</option>)}
                        </select>
                      )}
                      <button className="btn btn-xs" onClick={() => onEditLeadClick(l.id)}>Quick Fix</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Workflows Sub-tabs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
            <button className={`tab-btn ${opsTab === 'leads' ? 'active' : ''}`} onClick={() => setOpsTab('leads')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: opsTab === 'leads' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: opsTab === 'leads' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Unassigned Leads Flow ({unassignedLeads.length})
            </button>
            <button className={`tab-btn ${opsTab === 'inspections' ? 'active' : ''}`} onClick={() => setOpsTab('inspections')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: opsTab === 'inspections' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: opsTab === 'inspections' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Site Inspections Auditor ({inspections.filter(i => i.status === 'Confirmed' || i.status === 'Scheduled').length} pending)
            </button>
            <button className={`tab-btn ${opsTab === 'docs' ? 'active' : ''}`} onClick={() => setOpsTab('docs')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: opsTab === 'docs' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: opsTab === 'docs' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Documentation & Allocation Desk
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {opsTab === 'leads' && (
              <div>
                <h3 className="section-title">Lead Assignment Matrix</h3>
                {unassignedLeads.length === 0 ? (
                  <div className="empty-table-state" style={{ padding: '40px', textAlign: 'center' }}>No unassigned leads in the system! Good job.</div>
                ) : (
                  <div className="table-container">
                    <table className="custom-table">
                      <thead>
                        <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                          <th style={{ padding: '12px' }}>Lead Name</th>
                          <th style={{ padding: '12px' }}>Source</th>
                          <th style={{ padding: '12px' }}>Category</th>
                          <th style={{ padding: '12px' }}>Budget</th>
                          <th style={{ padding: '12px' }}>Created Date</th>
                          <th style={{ padding: '12px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedLeads.map(l => (
                          <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px' }}>
                              <div style={{ fontWeight: '600' }}>{l.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.phone}</div>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{l.source}</td>
                            <td style={{ padding: '12px' }}>{l.category}</td>
                            <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600' }}>{formatBudget(l.budget)}</td>
                            <td style={{ padding: '12px', fontSize: '12px' }}>{new Date(l.dateCreated).toLocaleDateString()}</td>
                            <td style={{ padding: '12px' }}>
                              <select 
                                className="form-control"
                                style={{ padding: '4px 8px', fontSize: '12px', height: 'auto', width: '180px' }}
                                onChange={(e) => handleAssignCloser(l.id, e.target.value)}
                                defaultValue=""
                              >
                                <option value="">-- Quick Assign Owner --</option>
                                {closers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.branch || 'No Branch'})</option>)}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {opsTab === 'inspections' && (
              <div>
                <h3 className="section-title">Operations Inspection Control</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Client</th>
                        <th style={{ padding: '12px' }}>Interest Estate</th>
                        <th style={{ padding: '12px' }}>Date / Time</th>
                        <th style={{ padding: '12px' }}>Assigned Officer</th>
                        <th style={{ padding: '12px' }}>Assigned Closer</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map(i => {
                        const lName = leads.find(l => l.id === i.leadId)?.name || "Unknown";
                        const closer = users.find(u => u.id === i.assignedCloserId)?.name || "Unassigned";
                        const officer = users.find(u => u.id === i.inspectionOfficerId)?.name || "Unassigned";
                        return (
                          <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{lName}</td>
                            <td style={{ padding: '12px' }}>{i.estate}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{i.date} at {i.time}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{officer}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{closer}</td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge badge-${i.status.toLowerCase()}`}>{i.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {opsTab === 'docs' && (
              <div>
                <h3 className="section-title">Documentation Pipeline & Allocation Milestones</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Client</th>
                        <th style={{ padding: '12px' }}>Property</th>
                        <th style={{ padding: '12px' }}>Stage</th>
                        <th style={{ padding: '12px' }}>App Form</th>
                        <th style={{ padding: '12px' }}>Offer Letter</th>
                        <th style={{ padding: '12px' }}>Operations Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docLeads.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px' }}>
                            <div style={{ fontWeight: '600' }}>{l.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.phone}</div>
                          </td>
                          <td style={{ padding: '12px', fontSize: '13px' }}>{l.propertyInterest || 'Pending selection'}</td>
                          <td style={{ padding: '12px' }}>
                            <span className="badge badge-success">{l.stage}</span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${l.applicationFormStatus === 'Approved' ? 'badge-success' : 'badge-cold'}`}>
                              {l.applicationFormStatus || 'Not Sent'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge ${l.offerLetterStatus === 'Accepted' ? 'badge-success' : 'badge-cold'}`}>
                              {l.offerLetterStatus || 'Not Sent'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {l.applicationFormStatus === 'Submitted' && (
                                <button className="btn btn-xs btn-primary" onClick={() => {
                                  dataService.saveLead({ ...l, applicationFormStatus: 'Approved' });
                                  alert(`Application approved for ${l.name}.`);
                                }}>Approve App</button>
                              )}
                              {l.offerLetterStatus === 'Sent' && (
                                <button className="btn btn-xs" onClick={() => {
                                  dataService.saveLead({ ...l, offerLetterStatus: 'Accepted', offerLetterSignature: 'E-SIGNED', offerLetterSignedDate: new Date().toISOString().split('T')[0] });
                                  alert(`Simulated client signature acceptance for ${l.name}!`);
                                }}>Accept Offer</button>
                              )}
                              <button className="btn btn-xs" onClick={() => setViewingLeadId(l.id)}>Open Desk</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ROLE 7: Branch Manager Dashboard
  const renderBranchManagerDashboard = () => {
    const myBranchName = currentUser.branch || 'Lekki Branch';
    
    // Find all closers belonging to this branch
    const branchClosers = users.filter(u => u.role === 'Sales Closer' && u.branch === myBranchName);
    const branchCloserIds = branchClosers.map(c => c.id);
    
    // Leads assigned to branch closers
    const branchLeads = leads.filter(l => branchCloserIds.includes(l.assignedCloserId));
    
    // Branch metrics
    const totalBranchLeads = branchLeads.length;
    const branchClients = branchLeads.filter(l => l.stage === 'Client/Investor' || l.stage === 'Repeat Purchase');
    
    // Branch Revenue
    const branchRevenue = branchClients.reduce((acc, l) => {
      const budgetNum = parseBudgetNumber(l.budget);
      return acc + budgetNum;
    }, 0);

    const branchConversionRate = totalBranchLeads > 0
      ? ((branchClients.length / totalBranchLeads) * 100).toFixed(0)
      : '0';

    // Site Tours Success
    const branchInspections = inspections.filter(i => branchCloserIds.includes(i.assignedCloserId));
    const completedTours = branchInspections.filter(i => i.status === 'Completed');
    const inspectionToSaleCount = branchClients.filter(l => 
      branchInspections.some(i => i.leadId === l.id && i.status === 'Completed')
    ).length;
    const branchInsToSaleRate = completedTours.length > 0
      ? ((inspectionToSaleCount / completedTours.length) * 100).toFixed(0)
      : '0';

    // Team compliance
    const totalFollowUps = branchLeads.filter(l => l.followUpDate);
    const compliantFollowUps = totalFollowUps.filter(l => new Date(l.followUpDate) >= new Date());
    const teamComplianceRate = totalFollowUps.length > 0
      ? ((compliantFollowUps.length / totalFollowUps.length) * 100).toFixed(0)
      : '100';

    // Closer Compliance checklist
    const branchClosersCompliance = branchClosers.map(closer => {
      const closerLeads = branchLeads.filter(l => l.assignedCloserId === closer.id);
      const overdue = closerLeads.filter(l => l.followUpDate && new Date(l.followUpDate) < new Date() && l.stage !== 'Repeat Purchase');
      const uncontacted = closerLeads.filter(l => {
        const leadActs = activities.filter(a => a.leadId === l.id && a.type !== 'Internal Note');
        return leadActs.length === 0;
      });
      const noNextAction = closerLeads.filter(l => !l.nextAction);
      
      let score = 100;
      if (overdue.length > 0) score -= 20;
      if (uncontacted.length > 0) score -= 15;
      if (noNextAction.length > 0) score -= 15;
      score = Math.max(closerLeads.length > 0 ? score : 100, 50);

      return {
        ...closer,
        leadsCount: closerLeads.length,
        overdueCount: overdue.length,
        uncontactedCount: uncontacted.length,
        noNextActionCount: noNextAction.length,
        complianceScore: score
      };
    });

    const handleCoachCloser = (closerName) => {
      const note = prompt(`Enter coaching instructions/feedback for ${closerName}:`);
      if (note && note.trim() !== '') {
        db.logAudit(`Branch Manager coached closer ${closerName}: "${note}"`);
        alert(`Coaching note successfully dispatched to closer performance records.`);
      }
    };

    // Stage Distribution Chart Data
    const stageMap = {};
    branchLeads.forEach(l => { stageMap[l.stage] = (stageMap[l.stage] || 0) + 1; });
    const chartData = Object.keys(stageMap).map(k => ({ name: k.replace(' Lead', ''), value: stageMap[k] }));

    return (
      <div className="branch-manager-dashboard">
        <WelcomeBanner subtitle={`Branch Performance — Managing closers, monitoring tours, and tracking revenue for ${myBranchName}.`} />

        {/* Metric Cards */}
        <div className="dashboard-stats-grid">
          <div className="stat-card card">
            <span className="stat-label">Branch Revenue</span>
            <span className="stat-value text-red">₦{branchRevenue.toLocaleString()}</span>
            <span className="stat-subtext">Total closed contract values</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Lead Conversion</span>
            <span className="stat-value text-blue">{branchConversionRate}%</span>
            <span className="stat-subtext">Branch conversion efficiency</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Tour to Sale Rate</span>
            <span className="stat-value text-green">{branchInsToSaleRate}%</span>
            <span className="stat-subtext">Sales after completed inspections</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">Team Compliance</span>
            <span className="stat-value text-purple">{teamComplianceRate}%</span>
            <span className="stat-subtext">Leads on-track follow-up</span>
          </div>
          <div className="stat-card card">
            <span className="stat-label">SLA Response Time</span>
            <span className="stat-value text-yellow">15m</span>
            <span className="stat-subtext">First contact delay average</span>
          </div>
        </div>

        {/* Closer Compliance Tracker (Non-Negotiables) */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 className="section-title">Closer Compliance Tracker (Non-Negotiable)</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Auditing daily CRM updates, uncontacted leads, and scheduled next actions for your branch sales closers.
          </p>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '12px' }}>Closer</th>
                  <th style={{ padding: '12px' }}>Active Leads</th>
                  <th style={{ padding: '12px' }}>Overdue Follow-Ups</th>
                  <th style={{ padding: '12px' }}>Untouched Leads</th>
                  <th style={{ padding: '12px' }}>Missing Next Actions</th>
                  <th style={{ padding: '12px' }}>Compliance</th>
                  <th style={{ padding: '12px' }}>Coaching Action</th>
                </tr>
              </thead>
              <tbody>
                {branchClosersCompliance.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontWeight: '600' }}>{c.name}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{c.leadsCount}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: c.overdueCount > 0 ? 'var(--primary-red)' : 'inherit', fontWeight: c.overdueCount > 0 ? '700' : 'normal' }}>{c.overdueCount}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: c.uncontactedCount > 0 ? 'var(--color-warning-text)' : 'inherit' }}>{c.uncontactedCount}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{c.noNextActionCount}</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge badge-${c.complianceScore >= 90 ? 'success' : c.complianceScore >= 70 ? 'warm' : 'hot'}`}>
                        {c.complianceScore}%
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button className="btn btn-xs btn-primary" onClick={() => handleCoachCloser(c.name)}>Coach Closer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workflows Sub-tabs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
            <button className={`tab-btn ${bmTab === 'team' ? 'active' : ''}`} onClick={() => setBmTab('team')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: bmTab === 'team' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: bmTab === 'team' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Branch Team Dashboard
            </button>
            <button className={`tab-btn ${bmTab === 'inspections' ? 'active' : ''}`} onClick={() => setBmTab('inspections')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: bmTab === 'inspections' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: bmTab === 'inspections' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Branch Inspection Dashboard
            </button>
            <button className={`tab-btn ${bmTab === 'pipeline' ? 'active' : ''}`} onClick={() => setBmTab('pipeline')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: bmTab === 'pipeline' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: bmTab === 'pipeline' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Sales Pipeline Distribution
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {bmTab === 'team' && (
              <div>
                <h3 className="section-title">Closer Pipeline Distributions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {branchClosersCompliance.map(c => {
                    const mySales = branchLeads.filter(l => l.assignedCloserId === c.id && (l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor'));
                    const salesRevenue = mySales.reduce((acc, l) => acc + (parseBudgetNumber(l.budget)), 0);
                    return (
                      <div className="card" key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                          <span style={{ fontWeight: '700', fontSize: '14px' }}>{c.name}</span>
                          <span className="badge badge-success">Closer</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Revenue:</span>
                          <span style={{ fontWeight: '600' }}>₦{salesRevenue.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Active Portfolio:</span>
                          <span>{c.leadsCount} leads</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>SLA Score:</span>
                          <span className="badge badge-success">98%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bmTab === 'inspections' && (
              <div>
                <h3 className="section-title">Branch Site Inspection Bookings</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Client</th>
                        <th style={{ padding: '12px' }}>Estate Interest</th>
                        <th style={{ padding: '12px' }}>Date</th>
                        <th style={{ padding: '12px' }}>Officer</th>
                        <th style={{ padding: '12px' }}>Closer</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchInspections.map(i => {
                        const lName = leads.find(l => l.id === i.leadId)?.name || "Unknown";
                        const closer = users.find(u => u.id === i.assignedCloserId)?.name || "Unassigned";
                        const officer = users.find(u => u.id === i.inspectionOfficerId)?.name || "Unassigned";
                        return (
                          <tr key={i.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{lName}</td>
                            <td style={{ padding: '12px' }}>{i.estate}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{i.date} at {i.time}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{officer}</td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>{closer}</td>
                            <td style={{ padding: '12px' }}>
                              <span className={`badge badge-${i.status.toLowerCase()}`}>{i.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bmTab === 'pipeline' && (
              <div>
                <h3 className="section-title">Branch Sales Funnel Distribution</h3>
                {chartData.length === 0 ? (
                  <div className="empty-table-state">No pipeline data for this branch yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#D4262A" name="Leads Count" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ROLE 8: General Manager Dashboard
  const renderGeneralManagerDashboard = () => {
    const totalLeads = leads.length;
    const hotLeads = leads.filter(l => l.temperature === 'Hot').length;
    
    // Inspections this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7*24*60*60*1000);
    const toursThisWeek = inspections.filter(i => {
      const iDate = new Date(i.date);
      return iDate >= startOfWeek && iDate <= endOfWeek;
    }).length;

    // Expected revenue this month
    const forecastLeads = leads.filter(l => ['Negotiation', 'Reservation', 'Payment'].includes(l.stage));
    const expectedRevenue = forecastLeads.reduce((acc, l) => {
      const budgetNum = parseBudgetNumber(l.budget);
      // apply weight based on stage probability
      const prob = l.stage === 'Payment' ? 0.9 : l.stage === 'Reservation' ? 0.75 : 0.4;
      return acc + (budgetNum * prob);
    }, 0);

    // At Risk Opportunities
    const atRiskOpportunities = leads.filter(l => {
      const budgetNum = parseBudgetNumber(l.budget);
      const isDormant = (new Date() - new Date(l.lastActivityDate)) > (7 * 24 * 60 * 60 * 1000);
      return budgetNum >= 100000000 && (isDormant || l.relationshipStatus === 'At Risk');
    });

    // Top / Bottom performers
    const closersPerformance = users.filter(u => u.role === 'Sales Closer').map(closer => {
      const cLeads = leads.filter(l => l.assignedCloserId === closer.id);
      const closed = cLeads.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor');
      const revenue = closed.reduce((acc, l) => acc + (parseBudgetNumber(l.budget)), 0);
      const conversion = cLeads.length > 0 ? ((closed.length / cLeads.length) * 100).toFixed(0) : '0';
      return {
        name: closer.name,
        branch: closer.branch || 'Lekki Branch',
        revenue,
        conversion
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const topPerformer = closersPerformance[0];
    const bottomPerformer = closersPerformance[closersPerformance.length - 1];

    // Branch Performance Data
    const branches = ['Lekki Branch', 'Maitama Branch', 'Airport Residential Branch'];
    const branchStats = branches.map(brName => {
      const brClosers = users.filter(u => u.role === 'Sales Closer' && u.branch === brName).map(c => c.id);
      const brLeads = leads.filter(l => brClosers.includes(l.assignedCloserId));
      const brClosed = brLeads.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor');
      const brRev = brClosed.reduce((acc, l) => acc + (parseBudgetNumber(l.budget)), 0);
      return {
        name: brName.replace(' Branch', ''),
        revenue: brRev,
        leads: brLeads.length,
        conversions: brClosed.length
      };
    });

    // Marketing ROI Distribution
    const sourceMap = {};
    leads.forEach(l => {
      sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
    });
    const marketingStats = Object.keys(sourceMap).map(src => {
      const srcLeads = leads.filter(l => l.source === src);
      const closed = srcLeads.filter(l => l.stage === 'Repeat Purchase' || l.stage === 'Client/Investor');
      const conversionRate = srcLeads.length > 0 ? ((closed.length / srcLeads.length) * 100).toFixed(0) : '0';
      return {
        source: src,
        leads: srcLeads.length,
        conversions: closed.length,
        conversionRate
      };
    });

    return (
      <div className="gm-dashboard">
        {/* welcome */}
        <WelcomeBanner subtitle="General Manager Command Center — Corporate pipelines, forecasts, branch performance, and executive metrics." />

        {/* GM Command Center: 6 Mandatory Numbers */}
        <div className="dashboard-stats-grid">
          <div className="stat-card card" style={{ borderTop: '4px solid var(--primary-red)' }}>
            <span className="stat-label">Total Leads</span>
            <span className="stat-value">{totalLeads}</span>
            <span className="stat-subtext">Total active pipeline</span>
          </div>
          <div className="stat-card card" style={{ borderTop: '4px solid #F39C12' }}>
            <span className="stat-label">Hot Leads</span>
            <span className="stat-value text-yellow">{hotLeads}</span>
            <span className="stat-subtext">High temperature interest</span>
          </div>
          <div className="stat-card card" style={{ borderTop: '4px solid #3498DB' }}>
            <span className="stat-label">Inspections / Wk</span>
            <span className="stat-value text-blue">{toursThisWeek}</span>
            <span className="stat-subtext">Scheduled site visits</span>
          </div>
          <div className="stat-card card" style={{ borderTop: '4px solid #2ECC71' }}>
            <span className="stat-label">Expected Revenue</span>
            <span className="stat-value text-green" style={{ fontSize: '15px', fontWeight: '800', whiteSpace: 'nowrap' }}>₦{expectedRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
            <span className="stat-subtext">Probability forecast</span>
          </div>
          <div className="stat-card card" style={{ borderTop: '4px solid #E74C3C' }}>
            <span className="stat-label">At Risk Leads</span>
            <span className="stat-value text-red">{atRiskOpportunities.length}</span>
            <span className="stat-subtext">Dormant high-value leads</span>
          </div>
          <div className="stat-card card" style={{ borderTop: '4px solid #9B59B6' }}>
            <span className="stat-label">Top Performer</span>
            <span className="stat-value" style={{ fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '6px 0' }}>
              {topPerformer ? topPerformer.name.split(' ')[0] : 'N/A'}
            </span>
            <span className="stat-subtext">Revenue Leader</span>
          </div>
        </div>

        {/* At-Risk Opportunities Highlight */}
        {atRiskOpportunities.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--primary-red)', background: 'rgba(212,38,42,0.02)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertTriangle size={18} className="alert-icon" />
              <h3 className="section-title" style={{ margin: 0, fontSize: '15px', color: 'var(--primary-red)' }}>Executive At-Risk Alert ({atRiskOpportunities.length} High-Value Leads)</h3>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              High-value client portfolios (budget &ge; ₦100M) that have remained dormant for over 7 days or marked with At-Risk health status.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {atRiskOpportunities.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>{o.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '12px' }}>Budget: {formatBudget(o.budget)} | Health: {o.relationshipStatus || 'Warm'} | Last Activity: {new Date(o.lastActivityDate).toLocaleDateString()}</span>
                  </div>
                  <button className="btn btn-xs btn-primary" onClick={() => setViewingLeadId(o.id)}>Inspect Lead Profile</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflows Sub-tabs */}
        <div className="card" style={{ padding: '0px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--table-header-bg)' }}>
            <button className={`tab-btn ${gmTab === 'forecast' ? 'active' : ''}`} onClick={() => setGmTab('forecast')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: gmTab === 'forecast' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: gmTab === 'forecast' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Revenue Forecasts
            </button>
            <button className={`tab-btn ${gmTab === 'branches' ? 'active' : ''}`} onClick={() => setGmTab('branches')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: gmTab === 'branches' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: gmTab === 'branches' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Branch Comparison
            </button>
            <button className={`tab-btn ${gmTab === 'marketing' ? 'active' : ''}`} onClick={() => setGmTab('marketing')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: gmTab === 'marketing' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: gmTab === 'marketing' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Marketing ROI
            </button>
            <button className={`tab-btn ${gmTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setGmTab('leaderboard')} style={{ padding: '16px 24px', font: 'inherit', fontWeight: '600', border: 'none', background: 'none', borderBottom: gmTab === 'leaderboard' ? '2px solid var(--primary-red)' : 'none', cursor: 'pointer', color: gmTab === 'leaderboard' ? 'var(--primary-red)' : 'var(--text-secondary)' }}>
              Closers Leaderboard
            </button>
          </div>

          <div style={{ padding: '24px' }}>
            {gmTab === 'forecast' && (
              <div>
                <h3 className="section-title">Revenue Contribution by Branch</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={branchStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#D4262A" name="Closed Revenue (₦)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {gmTab === 'branches' && (
              <div>
                <h3 className="section-title">Branch Performance Overview</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Branch Name</th>
                        <th style={{ padding: '12px' }}>Leads Managed</th>
                        <th style={{ padding: '12px' }}>Closed Deals</th>
                        <th style={{ padding: '12px' }}>Total Closed Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchStats.map(b => (
                        <tr key={b.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: '600' }}>{b.name} Branch</td>
                          <td style={{ padding: '12px' }}>{b.leads}</td>
                          <td style={{ padding: '12px' }}>{b.conversions}</td>
                          <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-success-text)' }}>
                            ₦{b.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {gmTab === 'marketing' && (
              <div>
                <h3 className="section-title">Marketing Channels Conversion Performance</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Lead Source</th>
                        <th style={{ padding: '12px' }}>Total Leads</th>
                        <th style={{ padding: '12px' }}>Conversions</th>
                        <th style={{ padding: '12px' }}>Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketingStats.map(m => (
                        <tr key={m.source} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: '600' }}>{m.source}</td>
                          <td style={{ padding: '12px' }}>{m.leads}</td>
                          <td style={{ padding: '12px' }}>{m.conversions}</td>
                          <td style={{ padding: '12px' }}>
                            <span className={`badge badge-${m.conversionRate >= 15 ? 'success' : 'grey'}`}>
                              {m.conversionRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {gmTab === 'leaderboard' && (
              <div>
                <h3 className="section-title">Closers Performance Ranking</h3>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px' }}>Rank</th>
                        <th style={{ padding: '12px' }}>Closer Name</th>
                        <th style={{ padding: '12px' }}>Branch</th>
                        <th style={{ padding: '12px' }}>Conversion Rate</th>
                        <th style={{ padding: '12px' }}>Closed Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closersPerformance.map((c, index) => (
                        <tr key={c.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px', fontWeight: '800' }}>#{index + 1}</td>
                          <td style={{ padding: '12px', fontWeight: '600' }}>{c.name}</td>
                          <td style={{ padding: '12px' }}>{c.branch}</td>
                          <td style={{ padding: '12px' }}>{c.conversion}%</td>
                          <td style={{ padding: '12px', fontWeight: '700', color: 'var(--color-success-text)' }}>
                            ₦{c.revenue.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Switch Render view based on Role
  switch (currentUser?.role) {
    case 'Super Admin':
      return renderManagementDashboard();
    case 'Sales Closer':
      return renderCloserDashboard();
    case 'Inspection Officer':
      return renderInspectionOfficerDashboard();
    case 'Admin/Doc Officer':
      return renderDocOfficerDashboard();
    case 'Relationship Manager':
      return renderRelationshipManagerDashboard();
    case 'Head of Operations':
      return renderHeadOfOperationsDashboard();
    case 'Branch Manager':
      return renderBranchManagerDashboard();
    case 'GM':
    case 'General Manager':
      return renderGeneralManagerDashboard();
    default:
      return <div>Please select a valid role in the acting user dropdown.</div>;
  }
}

