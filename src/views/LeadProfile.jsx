import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Phone, Calendar, Mail, MapPin, DollarSign, 
  User, Award, FileText, CheckCircle, AlertTriangle, AlertCircle,
  Trash2, Archive, RotateCcw, Clock, Plus, Edit3, Check, X, Star, Sparkles, UserPlus, Building2
} from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { getPollInterval } from '../lib/demoMode';
import { formatBudget } from '../lib/format';

/**
 * @param {{
 *   leadId: string,
 *   inspectionId?: string | null,
 *   onBack: () => void,
 *   currentUser: object | null,
 *   onLogActivityClick: (leadId: string) => void,
 *   onBookInspectionClick: (leadId?: string | null, inspectionId?: string | null) => void,
 *   onEditLeadClick: (leadId?: string | null) => void,
 * }} props
 */
export default function LeadProfile({
  leadId,
  inspectionId = null,
  onBack,
  currentUser,
  onLogActivityClick,
  onBookInspectionClick,
  onEditLeadClick
}) {
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [closers, setClosers] = useState([]);
  const [assignedCloser, setAssignedCloser] = useState(null);
  const [allLeads, setAllLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // History Tab & Status update states
  const [activeHistoryTab, setActiveHistoryTab] = useState('conversation');

  const handleUpdateStatusClick = () => {
    let targetInspectionId = inspectionId;
    
    // Validate target inspection is assigned to this officer
    if (targetInspectionId) {
      const targetIns = inspections.find(i => i.id === targetInspectionId);
      if (!targetIns || targetIns.inspectionOfficerId !== currentUser.id) {
        targetInspectionId = null;
      }
    }

    if (!targetInspectionId) {
      const activeIns = inspections.find(i => 
        i.inspectionOfficerId === currentUser.id && 
        (i.status === 'Scheduled' || i.status === 'Confirmed')
      );
      if (activeIns) {
        targetInspectionId = activeIns.id;
      } else {
        const anyMyIns = inspections.find(i => i.inspectionOfficerId === currentUser.id);
        if (anyMyIns) {
          targetInspectionId = anyMyIns.id;
        }
      }
    }

    if (targetInspectionId) {
      onBookInspectionClick(lead.id, targetInspectionId);
    } else {
      alert("No assigned inspection record found to update status for.");
    }
  };

  // Reassignment State
  const [reassignCloserId, setReassignCloserId] = useState('');
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Legal & Finance Hub state
  const [showPayPlanForm, setShowPayPlanForm] = useState(false);
  const [payPlanForm, setPayPlanForm] = useState({
    price: '',
    discount: '0',
    authCode: '',
    deposit: '',
    months: '6'
  });
  const [activePrintDoc, setActivePrintDoc] = useState(null);

  const STAGES_ORDER = [
    "New Lead", "Contact Attempted", "Conversation Started", "Qualified Prospect", 
    "Inspection Booked", "Inspection Completed", "Negotiation", "Reservation", 
    "Payment", "Allocation", "Documentation", "Client/Investor", "Referral", "Repeat Purchase"
  ];

  const loadLeadData = async () => {
    const [activeLeads, archivedLeads, allActivitiesRaw, allInspectionsRaw, allUsersRaw] = await Promise.all([
      dataService.getLeads(),
      dataService.getArchivedLeads(),
      dataService.getActivities(),
      dataService.getInspections(),
      dataService.getUsers(),
    ]);

    setAllLeads(activeLeads.concat(archivedLeads));
    setAllUsers(allUsersRaw);

    const foundLead = activeLeads.find(l => l.id === leadId) || archivedLeads.find(l => l.id === leadId);

    if (foundLead) {
      // Demo mode: db.getLeads() already embeds `paymentPlan` on the lead.
      // Live mode: the API's lead payload has no such field, so fetch it
      // separately from the finance endpoint (mirrors DocOfficerHub.jsx's
      // loadHubData, which does the same thing for its lead list).
      if (foundLead.paymentPlan === undefined) {
        foundLead.paymentPlan = await dataService.getPaymentPlan(foundLead.id);
      }
      setLead(foundLead);

      // Load activities
      const allActivities = allActivitiesRaw.filter(a => a.leadId === foundLead.id);
      setActivities(allActivities);

      // Load inspections
      const allInspections = allInspectionsRaw.filter(i => i.leadId === foundLead.id);
      setInspections(allInspections);

      // Load closers
      const allClosers = allUsersRaw.filter(u => u.role === 'Sales Closer' && u.status === 'Active');
      setClosers(allClosers);

      const closer = allClosers.find(u => u.id === foundLead.assignedCloserId);
      setAssignedCloser(closer || null);
      setReassignCloserId(foundLead.assignedCloserId || '');
    }
  };

  useEffect(() => {
    loadLeadData();
    const interval = setInterval(() => {
      loadLeadData();
    }, getPollInterval(2000));
    return () => clearInterval(interval);
  }, [leadId]);

  const conversationActivities = activities.filter(act => 
    ['Call', 'WhatsApp', 'SMS', 'Email', 'Voice Note', 'Meeting'].includes(act.type)
  );
  
  const systemActivities = activities.filter(act => 
    !['Call', 'WhatsApp', 'SMS', 'Email', 'Voice Note', 'Meeting'].includes(act.type)
  );

  const displayedActivities = activeHistoryTab === 'conversation' ? conversationActivities : systemActivities;

  if (!lead) {
    return (
      <div className="lead-profile-error card text-center">
        <AlertTriangle size={32} className="alert-text-red" />
        <h3>Lead profile fails to load</h3>
        <button className="btn btn-sm btn-primary" onClick={onBack}>Back to Leads</button>
      </div>
    );
  }

  // Warnings computation
  const isDormant = (new Date() - new Date(lead.lastActivityDate)) > (7 * 24 * 60 * 60 * 1000);
  const activeInspections = inspections.filter(i => i.status === 'Scheduled' || i.status === 'Confirmed');

  // Archive lead trigger
  const handleArchiveLead = async () => {
    if (activeInspections.length > 0) {
      alert(`This lead has an upcoming inspection scheduled for ${activeInspections[0].date}. Please cancel or complete the inspection before archiving.`);
      return;
    }

    if (window.confirm("Are you sure you want to archive this lead? It will be removed from active views but can be restored at any time.")) {
      try {
        await dataService.archiveLead(lead.id);
        loadLeadData();
        alert("Lead successfully archived.");
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Restore lead trigger
  const handleRestoreLead = async () => {
    if (window.confirm("Restore this lead to active status?")) {
      await dataService.restoreLead(lead.id);
      loadLeadData();
    }
  };

  // Reassignment trigger (Super Admin or Management only)
  const handleReassignCloser = async (bypassWarning = false) => {
    if (!reassignCloserId) {
      alert("A lead must have an assigned owner. Please select a closer before saving.");
      return;
    }

    // Check if lead has active inspections
    if (activeInspections.length > 0 && !bypassWarning) {
      setShowReassignModal(true);
      return;
    }

    setShowReassignModal(false);
    await dataService.saveLead({
      ...lead,
      assignedCloserId: reassignCloserId
    });
    loadLeadData();
  };

  const handleSendApplicationForm = () => {
    const updatedLead = {
      ...lead,
      applicationFormStatus: 'Sent to Lead'
    };
    dataService.saveLead(updatedLead);
    loadLeadData();
    db.logAudit(`Application Form sent to client ${lead.name} by Doc Officer.`);
  };

  const handleSimulateClientSubmit = (appData) => {
    const updatedLead = {
      ...lead,
      applicationFormStatus: 'Submitted',
      applicationData: appData
    };
    dataService.saveLead(updatedLead);
    loadLeadData();
    dataService.saveActivity({
      leadId: lead.id,
      type: "Internal Note",
      summary: `Simulation: Client filled and submitted the digital application form.`,
      objections: "None",
      feedback: "N/A",
      nextStep: "Awaiting Doc Officer review and approval.",
      loggedBy: "System (Simulation)"
    });
  };

  const handleApproveApplicationForm = (appData) => {
    const updatedLead = {
      ...lead,
      applicationFormStatus: 'Approved',
      applicationData: appData
    };
    dataService.saveLead(updatedLead);
    loadLeadData();
    db.logAudit(`Application Form approved for client ${lead.name} by Doc Officer.`);
  };

  const handleSendOfferLetter = () => {
    const updatedLead = {
      ...lead,
      offerLetterStatus: 'Sent'
    };
    dataService.saveLead(updatedLead);
    loadLeadData();
    db.logAudit(`Offer Letter sent to client ${lead.name} by Doc Officer.`);
  };

  const handleSimulateClientAccept = (signatureText) => {
    const updatedLead = {
      ...lead,
      offerLetterStatus: 'Accepted',
      offerLetterSignature: signatureText,
      offerLetterSignedDate: new Date().toISOString().split('T')[0]
    };
    dataService.saveLead(updatedLead);
    loadLeadData();
    dataService.saveActivity({
      leadId: lead.id,
      type: "Internal Note",
      summary: `Simulation: Client reviewed, digitally signed and accepted the Offer Letter. Signature: ${signatureText}.`,
      objections: "None",
      feedback: "Client accepted offer terms.",
      nextStep: "Proceed to payments configuration desk.",
      loggedBy: "System (Simulation)"
    });
  };

  const handleCreatePaymentPlan = async (e) => {
    e.preventDefault();
    const price = Number(payPlanForm.price);
    const discount = Number(payPlanForm.discount) || 0;
    const authCode = payPlanForm.authCode.trim();
    const deposit = Number(payPlanForm.deposit) || 0;
    const months = payPlanForm.months !== undefined ? Number(payPlanForm.months) : 6;

    if (!price || price <= 0) { alert("Please enter a valid property price."); return; }
    if (deposit < 0 || deposit > price) { alert("Deposit must be between 0 and property price."); return; }
    if (discount > 0 && !authCode) { alert("An Authorizing Manager Code is required for discounts."); return; }

    const netPrice = price - discount;
    const balance = netPrice - deposit;
    const installmentVal = (months > 0 && balance > 0) ? Math.round(balance / months) : 0;

    // Generate monthly installment list
    const installmentsList = [];
    const today = new Date();
    
    if (months > 0) {
      for (let i = 1; i <= months; i++) {
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i, today.getDate());
        installmentsList.push({
          index: i,
          amount: installmentVal,
          dueDate: dueDate.toISOString().split('T')[0],
          status: 'Pending'
        });
      }
    } else {
      // Outright payment
      if (balance > 0) {
        installmentsList.push({
          index: 1,
          amount: balance,
          dueDate: today.toISOString().split('T')[0], // Due today
          status: 'Pending'
        });
      }
    }

    const payPlan = {
      regularPrice: price,
      discountAmount: discount,
      authCode: authCode,
      netPrice: netPrice,
      depositPaid: deposit,
      balance: balance,
      durationMonths: months,
      installmentVal: installmentVal,
      installmentsList: installmentsList,
      dateCreated: new Date().toISOString().split('T')[0]
    };

    await dataService.savePaymentPlan(lead.id, payPlan, { stage: 'Payment' });
    loadLeadData();
    setShowPayPlanForm(false);
    db.logAudit(`Payment plan configured for lead ${lead.name} at net price of ${formatPrice(netPrice)}.`);

    // Record discount in ledger if applicable
    if (discount > 0) {
      dataService.createDiscount({
        leadId: lead.id,
        clientName: lead.name,
        propertyName: lead.propertyInterest || 'N/A',
        regularPrice: price,
        discountAmount: discount,
        netPrice: netPrice,
        authCode: authCode,
        dateIssued: new Date().toISOString().split('T')[0]
      });
    }
  };

  const handleLogPayment = async (instIndex) => {
    const payPlan = { ...lead.paymentPlan, installmentsList: [...lead.paymentPlan.installmentsList] };
    let paymentAmount = 0;
    let paymentSummary = '';
    let installmentRef = null;

    if (instIndex === -1) {
      paymentAmount = payPlan.depositPaid;
      paymentSummary = `Initial deposit payment of ${formatPrice(paymentAmount)} received.`;
    } else {
      const idx = payPlan.installmentsList.findIndex(item => item.index === instIndex);
      if (idx !== -1) {
        if (payPlan.installmentsList[idx].status === 'Paid') return;
        payPlan.installmentsList[idx] = { ...payPlan.installmentsList[idx], status: 'Paid' };
        paymentAmount = payPlan.installmentsList[idx].amount;
        paymentSummary = `Installment #${instIndex} payment of ${formatPrice(paymentAmount)} received.`;
        payPlan.balance = Math.max(0, payPlan.balance - paymentAmount);
        installmentRef = payPlan.installmentsList[idx].id ?? payPlan.installmentsList[idx].index;
      }
    }

    const allPaid = payPlan.installmentsList.every(i => i.status === 'Paid');
    const newStage = (allPaid && payPlan.balance === 0) ? 'Allocation' : undefined;

    if (installmentRef !== null) {
      await dataService.updateInstallment(lead.id, installmentRef, {
        status: 'Paid',
        balance: payPlan.balance,
        stage: newStage,
      });
    } else {
      // Deposit-only "payment" - no installment row to mark, just persist the
      // (unchanged) plan so both modes go through the same call path.
      await dataService.savePaymentPlan(lead.id, payPlan, { stage: newStage });
    }
    loadLeadData();

    // Log Activity for transaction receipt
    dataService.saveActivity({
      leadId: lead.id,
      type: "Call",
      summary: paymentSummary,
      objections: "None",
      feedback: "N/A",
      nextStep: allPaid ? "Issue physical allocation papers." : "Monitor next scheduled payment plan date.",
      loggedBy: currentUser.name
    });

    // Record commission (5% of paymentAmount)
    const commissionVal = Math.round(paymentAmount * 0.05);
    if (commissionVal > 0) {
      const closerName = closers.find(u => u.id === lead.assignedCloserId)?.name || 'Unassigned';
      dataService.createCommission({
        leadId: lead.id,
        closerId: lead.assignedCloserId || null,
        closerName: closerName,
        clientName: lead.name,
        propertyName: lead.propertyInterest || 'N/A',
        totalSaleVal: payPlan.netPrice,
        paidAmount: paymentAmount,
        commissionVal: commissionVal,
        scheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Scheduled'
      });
    }

    // Set document active for print preview immediately
    setActivePrintDoc({
      type: 'receipt',
      data: {
        clientName: lead.name,
        property: lead.propertyInterest || 'N/A',
        amount: paymentAmount,
        date: new Date().toISOString().split('T')[0],
        receiptNo: 'REC-' + Date.now().toString().slice(-6),
        description: instIndex === -1 ? 'Initial Allocation Deposit' : `Installment #${instIndex} Payment`
      }
    });
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  const handleWhatsappLink = () => {
    const text = encodeURIComponent(`Hello ${lead.name}, this is ${currentUser.name} from Beacon Corporate Realty.`);
    return `https://web.whatsapp.com/send?phone=${lead.whatsapp}&text=${text}`;
  };

  // Compute follow up completion stats
  const getFollowUpStatus = (activity, index) => {
    // Determine if follow up date was completed on time, late, or missed
    // For mock demonstration, we check if the activity date is later than the previous activity's follow-up date
    return { status: "Completed on time", color: "success-text" };
  };

  const renderPropertyCard = () => {
    const allProperties = db.getProperties();
    let matchingProperty = null;

    if (lead.propertyInterest) {
      const interestLower = lead.propertyInterest.toLowerCase();
      
      // 1. Exact or partial match on property name
      matchingProperty = allProperties.find(p => 
        interestLower.includes(p.name.toLowerCase()) || 
        p.name.toLowerCase().includes(interestLower)
      );

      // 2. Keyword check (e.g. "heights", "waterfront", "hill", "grove", "palms")
      if (!matchingProperty) {
        const keywords = ["heights", "waterfront", "hill", "grove", "palms"];
        const foundKeyword = keywords.find(kw => interestLower.includes(kw));
        if (foundKeyword) {
          matchingProperty = allProperties.find(p => p.name.toLowerCase().includes(foundKeyword));
        }
      }

      // 3. Match by type
      if (!matchingProperty) {
        matchingProperty = allProperties.find(p => {
          const typeLower = p.type.toLowerCase();
          return interestLower.includes(typeLower) || typeLower.includes(interestLower);
        });
      }

      // 4. Fallback based on specific terms in description or keywords
      if (!matchingProperty) {
        if (interestLower.includes("diplomatic") || interestLower.includes("mansion")) {
          matchingProperty = allProperties.find(p => p.id === "p-5" || p.name.includes("Palms"));
        } else if (interestLower.includes("penthouse")) {
          matchingProperty = allProperties.find(p => p.id === "p-3" || p.name.includes("Hill"));
        } else if (interestLower.includes("terrace") || interestLower.includes("commercial")) {
          matchingProperty = allProperties.find(p => p.id === "p-3");
        } else if (interestLower.includes("duplex")) {
          matchingProperty = allProperties.find(p => p.id === "p-2");
        } else if (interestLower.includes("plot") || interestLower.includes("apartment")) {
          matchingProperty = allProperties.find(p => p.id === "p-1");
        }
      }
    }

    // Default fallback: if still no matching property, use the first property
    if (!matchingProperty && allProperties.length > 0) {
      matchingProperty = allProperties[0];
    }

    return (
      <div className="card property-details-card animate-fade-in" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Property Interest Details</h3>
        </div>
        
        {matchingProperty ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Estate Name</span>
              <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{matchingProperty.name}</h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', borderTop: '1px dashed var(--border-color)', borderBottom: '1px dashed var(--border-color)', padding: '12px 0' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Property Type</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{matchingProperty.type}</span>
              </div>
              <div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Starting Price</span>
                <strong className="primary-text" style={{ fontSize: '14px', color: 'var(--color-success-text)' }}>{formatPrice(matchingProperty.price)}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Location</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{matchingProperty.location}</span>
              </div>
            </div>
            
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Description</span>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {matchingProperty.description}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Estate Name</span>
              <h4 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>{lead.propertyInterest || 'No specific property noted'}</h4>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0, fontStyle: 'italic', background: 'var(--color-grey-bg)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
              No fully matched catalog property found. This interest represents a custom request by the lead.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lead-profile-page">
      {/* Back button */}
      <button className="btn btn-sm back-nav-btn" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Back to Leads list</span>
      </button>

      {/* Dormant Banner */}
      {isDormant && (
        <div className="dormant-warning-banner card">
          <AlertCircle size={20} className="dormant-banner-icon" />
          <span><strong>Dormant Lead Warning:</strong> This lead has had no system activity logged for more than 7 days. Action is required.</span>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="profile-header-card card">
        <div className="profile-header-left">
          <div className="profile-avatar-large">
            {lead.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <div className="name-badge-row">
              <h2 className="profile-name">{lead.name}</h2>
              <span className={`badge badge-${lead.temperature.toLowerCase()}`}>
                {lead.temperature} Temperature
              </span>
              {lead.status === 'Archived' && (
                <span className="badge badge-grey">Archived</span>
              )}
            </div>
            <div className="meta-details-row">
              <span className="meta-item"><MapPin size={14} /> {lead.location || 'No location set'}</span>
              <span className="meta-item"><DollarSign size={14} /> Budget: {formatBudget(lead.budget)}</span>
              <span className="meta-item"><Award size={14} /> Closer: {assignedCloser ? assignedCloser.name : 'Unassigned'}</span>
              <span className="meta-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Stage: <span className="badge badge-grey" style={{ fontSize: '11.5px', margin: 0, padding: '3px 8px', fontWeight: '700' }}>{lead.stage}</span></span>
            </div>
          </div>
        </div>

        <div className="profile-header-right">
          {lead.status === 'Active' ? (
            <>
              {currentUser.role === 'Inspection Officer' && inspections.some(i => i.inspectionOfficerId === currentUser.id) && (
                <button className="btn btn-primary" onClick={handleUpdateStatusClick}>
                  <span>Update Status</span>
                </button>
              )}
              {currentUser.role !== 'Admin/Doc Officer' && currentUser.role !== 'Inspection Officer' && (
                <>
                  <button className="btn btn-primary" onClick={() => onLogActivityClick(lead.id)}>
                    <Plus size={14} />
                    <span>Log Activity</span>
                  </button>
                  <button className="btn btn-primary" onClick={() => onBookInspectionClick(lead.id)}>
                    <Calendar size={14} />
                    <span>Book Inspection</span>
                  </button>
                </>
              )}
              {currentUser.role !== 'Admin/Doc Officer' && currentUser.role !== 'Inspection Officer' && (
                <button className="btn btn-icon" onClick={() => onEditLeadClick(lead.id)}>
                  <Edit3 size={14} />
                  <span>Edit Lead</span>
                </button>
              )}
              {currentUser.role === 'Super Admin' && (
                <button className="btn btn-danger btn-icon" onClick={handleArchiveLead}>
                  <Archive size={14} />
                  <span>Archive</span>
                </button>
              )}
            </>
          ) : (
            currentUser.role === 'Super Admin' && (
              <button className="btn btn-primary btn-icon" onClick={handleRestoreLead}>
                <RotateCcw size={14} />
                <span>Restore Lead</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Prominent Next Action & Follow-Up Card */}
      {(() => {
        const nextInspection = inspections.find(i => i.status === 'Scheduled' || i.status === 'Confirmed');
        const showInspection = !!nextInspection;
        
        return (
          <div className="next-action-prompt-card card">
            <div className="prompt-column">
              <span className="prompt-label">{showInspection ? 'Next Inspection Assignment:' : 'Next Action Scheduled:'}</span>
              <p className="prompt-value" style={{ fontWeight: showInspection ? '700' : 'normal' }}>
                {showInspection 
                  ? `Site inspection at ${nextInspection.estate} (Meeting Point: ${nextInspection.meetingPoint})`
                  : `"${lead.nextAction}"`
                }
              </p>
            </div>
            <div className="prompt-column">
              <span className="prompt-label">{showInspection ? 'Inspection Date & Time:' : 'Follow-Up Date & Time:'}</span>
              <div className="prompt-followup-row">
                {showInspection ? <Calendar size={16} className="prompt-icon success-text" style={{ color: 'var(--color-success-text)' }} /> : <Clock size={16} className="prompt-icon" />}
                <span className="prompt-value" style={{ fontWeight: '700', color: showInspection ? 'var(--color-success-text)' : 'inherit' }}>
                  {showInspection 
                    ? `${nextInspection.date} @ ${nextInspection.time} (${nextInspection.status})`
                    : (lead.followUpDate ? new Date(lead.followUpDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No follow-up set')
                  }
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Horizontal 14-Stage Progress Bar */}
      {currentUser.role !== 'Inspection Officer' && (
        <div className="pipeline-progress-bar-card card">
          <h3 className="section-title">Visual Pipeline Tracker</h3>
          <div className="stages-wrapper">
            <div className="stages-scroll-container">
              {STAGES_ORDER.map((stage, idx) => {
                const currentIdx = STAGES_ORDER.indexOf(lead.stage);
                const isCompleted = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                  <div key={stage} className={`stage-step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}>
                    <div className="step-circle">{isCompleted ? <Check size={12} /> : idx + 1}</div>
                    <span className="step-label">{stage}</span>
                    {idx < STAGES_ORDER.length - 1 && <div className="step-connector" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Left Content / Right Content layout split */}
      <div className="profile-body-row">
        {/* Left Column: Activity log timeline */}
        <div className="profile-left-column">
          {/* Property Interest Details Card (Inspection Officer view only) */}
          {currentUser.role === 'Inspection Officer' && renderPropertyCard()}

          {/* Legal & Finance Desk Panel */}
          {currentUser.role !== 'Inspection Officer' && (
            <div className="card legal-finance-desk-card" style={{ marginBottom: '24px' }}>
            <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="section-title" style={{ margin: 0 }}>Legal & Finance Desk</h3>
              </div>
              <span className={`badge ${lead.applicationFormStatus === 'Approved' ? 'badge-success' : 'badge-cold'}`}>
                Stage: {lead.stage}
              </span>
            </div>

            {/* Step 1: Application Form */}
            <div className="desk-section" style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="step-num" style={{ background: lead.applicationFormStatus === 'Approved' ? 'var(--color-success-text)' : 'var(--text-secondary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>1</span>
                <span>Client Application Form Processing</span>
              </h4>

              {(!lead.applicationFormStatus || lead.applicationFormStatus === 'Not Started') && (
                <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Generate the digital application form link and email it to the client to capture legal info, employment, and next of kin details.
                  </p>
                  {(currentUser.role === 'Admin/Doc Officer' || currentUser.role === 'Super Admin') ? (
                    <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={handleSendApplicationForm}>
                      Send Application Form to Lead
                    </button>
                  ) : (
                    <div className="badge badge-grey" style={{ display: 'block', textAlign: 'center', padding: '6px' }}>Awaiting Action from Document Officer</div>
                  )}
                </div>
              )}

              {lead.applicationFormStatus === 'Sent to Lead' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#1E3A8A' }}>
                    <strong>Form Link Generated:</strong> Form has been sent to client. Awaiting client submission.
                  </div>
                  
                  <button 
                    className="btn btn-sm" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#F3F4F6', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                    onClick={() => {
                      setActivePrintDoc({
                        type: 'application_form',
                        data: {
                          clientName: lead.name,
                          legalName: lead.name,
                          employment: 'Pending Submission',
                          nokName: 'Pending Submission',
                          nokPhone: 'Pending Submission',
                          unitDetails: lead.propertyInterest ? `${lead.propertyInterest} - Unit TBD` : 'TBD',
                          status: 'Sent to Lead'
                        }
                      });
                    }}
                  >
                    <FileText size={14} />
                    <span>Preview Client Link Form</span>
                  </button>
                  
                  {/* CLIENT SIDE SIMULATION PORTAL */}
                  <div className="simulation-portal-block" style={{ padding: '16px', background: '#FFFDF5', border: '2px dashed #F59E0B', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                      <AlertTriangle size={14} />
                      <span>Client Portal Simulation (On Lead's End)</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#78350F', marginBottom: '12px' }}>
                      Simulate the screen the client sees when they open their email link to fill their application form.
                    </p>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.target);
                      handleSimulateClientSubmit({
                        legalName: fd.get('legalName'),
                        nokName: fd.get('nokName'),
                        nokPhone: fd.get('nokPhone'),
                        unitDetails: fd.get('unitDetails'),
                        employment: fd.get('employment')
                      });
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Full Legal Name *</label>
                          <input type="text" name="legalName" className="form-control" defaultValue={lead.name} required style={{ height: '30px', fontSize: '12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Employment Status</label>
                          <input type="text" name="employment" className="form-control" placeholder="e.g. Entrepreneur, Corporate" required style={{ height: '30px', fontSize: '12px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Next of Kin Name *</label>
                          <input type="text" name="nokName" className="form-control" placeholder="Kin's Legal Name" required style={{ height: '30px', fontSize: '12px' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Next of Kin Phone *</label>
                          <input type="text" name="nokPhone" className="form-control" placeholder="Kin's Phone Number" required style={{ height: '30px', fontSize: '12px' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Property Interest Spec</label>
                        <input type="text" name="unitDetails" className="form-control" defaultValue={lead.propertyInterest ? `${lead.propertyInterest} - Unit TBD` : ''} required style={{ height: '30px', fontSize: '12px' }} />
                      </div>
                      <button type="submit" className="btn btn-sm btn-warning" style={{ width: '100%', backgroundColor: '#D97706', borderColor: '#D97706', color: 'white', fontWeight: '700' }}>
                        Submit Completed Form (Client End)
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {lead.applicationFormStatus === 'Submitted' && (
                <div style={{ padding: '14px', background: '#FFFBEB', borderRadius: '6px', border: '1px solid #FCD34D' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#B45309' }}>Application Form Responses Submitted:</span>
                    <span className="badge badge-hot" style={{ fontSize: '9px' }}>Awaiting Approval</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                    <button 
                      className="btn btn-sm" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#FFFDF5', border: '1px solid #FCD34D', color: '#B45309' }}
                      onClick={() => {
                        setActivePrintDoc({
                          type: 'application_form',
                          data: {
                            clientName: lead.name,
                            legalName: lead.applicationData?.legalName || lead.name,
                            employment: lead.applicationData?.employment || 'N/A',
                            nokName: lead.applicationData?.nokName || 'N/A',
                            nokPhone: lead.applicationData?.nokPhone || 'N/A',
                            unitDetails: lead.applicationData?.unitDetails || 'N/A',
                            status: 'Submitted'
                          }
                        });
                      }}
                    >
                      <FileText size={14} />
                      <span>View Submitted Form Responses</span>
                    </button>
                  </div>

                  {(currentUser.role === 'Admin/Doc Officer' || currentUser.role === 'Super Admin') ? (
                    <button 
                      className="btn btn-sm btn-primary" 
                      style={{ width: '100%' }}
                      onClick={() => handleApproveApplicationForm(lead.applicationData)}
                    >
                      Verify & Approve Application Form
                    </button>
                  ) : (
                    <div className="badge badge-grey" style={{ display: 'block', textAlign: 'center', padding: '6px' }}>Waiting for Doc Officer review</div>
                  )}
                </div>
              )}

              {lead.applicationFormStatus === 'Approved' && (
                <div className="application-approved-details" style={{ padding: '14px', background: '#ECFDF5', borderRadius: '6px', border: '1px solid #A7F3D0', color: '#065F46' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '14px' }}>
                      <CheckCircle size={16} />
                      <span>Application Form Approved</span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '9px' }}>Verified</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#047857', marginBottom: '12px' }}>
                    Client legal details are verified and locked.
                  </p>
                  <button 
                    className="btn btn-sm" 
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}
                    onClick={() => {
                      setActivePrintDoc({
                        type: 'application_form',
                        data: {
                          clientName: lead.name,
                          legalName: lead.applicationData?.legalName || lead.name,
                          employment: lead.applicationData?.employment || 'N/A',
                          nokName: lead.applicationData?.nokName || 'N/A',
                          nokPhone: lead.applicationData?.nokPhone || 'N/A',
                          unitDetails: lead.applicationData?.unitDetails || 'N/A',
                          status: 'Approved'
                        }
                      });
                    }}
                  >
                    <FileText size={14} />
                    <span>View Approved Form Data</span>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Letter of Offer */}
            <div className="desk-section" style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: lead.applicationFormStatus === 'Approved' ? 1 : 0.5 }}>
                <span className="step-num" style={{ background: lead.offerLetterStatus === 'Accepted' ? 'var(--color-success-text)' : 'var(--text-secondary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>2</span>
                <span>Letter of Offer Acceptance</span>
              </h4>

              {lead.applicationFormStatus !== 'Approved' ? (
                <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-placeholder)' }}>
                  Locked. You must approve the Client Application Form before sending the Offer Letter.
                </div>
              ) : (
                <>
                  {(!lead.offerLetterStatus || lead.offerLetterStatus === 'Not Started') && (
                    <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        Generate the provisional sale Offer Letter containing pricing terms, discounts, and payment periods.
                      </p>
                      {(currentUser.role === 'Admin/Doc Officer' || currentUser.role === 'Super Admin') ? (
                        <button className="btn btn-sm btn-primary" style={{ width: '100%' }} onClick={handleSendOfferLetter}>
                          Generate & Send Offer Letter
                        </button>
                      ) : (
                        <div className="badge badge-grey" style={{ display: 'block', textAlign: 'center', padding: '6px' }}>Awaiting Action from Document Officer</div>
                      )}
                    </div>
                  )}

                  {lead.offerLetterStatus === 'Sent' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '6px', fontSize: '12px', color: '#1E3A8A' }}>
                        <strong>Offer Letter Sent:</strong> Offer document is currently with client. Awaiting sign-off.
                      </div>

                      <button 
                        className="btn btn-sm" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#F3F4F6', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                        onClick={() => {
                          const allProperties = db.getProperties();
                          let matchingProperty = null;
                          if (lead.propertyInterest) {
                            const interestLower = lead.propertyInterest.toLowerCase();
                            matchingProperty = allProperties.find(p => interestLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(interestLower));
                          }
                          if (!matchingProperty && allProperties.length > 0) {
                            matchingProperty = allProperties[0];
                          }
                          const propPrice = matchingProperty ? matchingProperty.price : 50000000;
                          
                          setActivePrintDoc({
                            type: 'offer_letter',
                            data: {
                              clientName: lead.name,
                              legalName: lead.applicationData?.legalName || lead.name,
                              property: lead.propertyInterest || (matchingProperty ? matchingProperty.name : 'Beacon Property'),
                              regularPrice: propPrice,
                              discount: 0,
                              netPrice: propPrice,
                              deposit: Math.round(propPrice * 0.2),
                              months: 6,
                              installmentVal: Math.round((propPrice - Math.round(propPrice * 0.2)) / 6),
                              date: new Date().toISOString().split('T')[0],
                              isSigned: false
                            }
                          });
                        }}
                      >
                        <FileText size={14} />
                        <span>View Offer Letter Draft</span>
                      </button>

                      {/* CLIENT SIDE SIMULATION PORTAL */}
                      <div className="simulation-portal-block" style={{ padding: '16px', background: '#FFFDF5', border: '2px dashed #F59E0B', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '12px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                          <AlertTriangle size={14} />
                          <span>Client Portal Simulation (On Lead's End)</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#78350F', marginBottom: '12px' }}>
                          Review the provisional terms and sign the digital acceptance sheet to confirm commitment.
                        </p>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.target);
                          handleSimulateClientAccept(fd.get('signature'));
                        }}>
                          <div style={{ background: 'white', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '4px', fontSize: '11px', color: '#374151', lineHeight: 1.5, marginBottom: '12px', maxHeight: '120px', overflowY: 'auto' }}>
                            <strong>TERMS OF SALES ACQUISITION:</strong><br />
                            Subject to complete contract execution, the client agrees to purchase the estate plot: <strong>{lead.applicationData?.unitDetails || lead.propertyInterest}</strong>. Payments must follow the defined schedules. Defaulting for 2 consecutive periods leads to provisional allocation withdrawal.
                          </div>
                          
                          <div className="form-group" style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: '700', color: '#78350F' }}>Signature (Type Full Legal Name to Sign) *</label>
                            <input type="text" name="signature" className="form-control" placeholder="e.g. Tunde Bakare" required style={{ height: '30px', fontSize: '12px' }} />
                          </div>

                          <button type="submit" className="btn btn-sm btn-warning" style={{ width: '100%', backgroundColor: '#D97706', borderColor: '#D97706', color: 'white', fontWeight: '700' }}>
                            Accept Terms & Sign Offer Letter
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {lead.offerLetterStatus === 'Accepted' && (
                    <div style={{ padding: '14px', background: '#ECFDF5', borderRadius: '6px', border: '1px solid #A7F3D0', color: '#065F46' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontWeight: '700', fontSize: '14px' }}>
                        <CheckCircle size={16} />
                        <span>Offer Accepted & Digitally Signed</span>
                      </div>
                      <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                        <strong>Signed By:</strong> {lead.offerLetterSignature}<br />
                        <strong>Date Signed:</strong> {lead.offerLetterSignedDate}
                      </div>

                      <button 
                        className="btn btn-sm" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' }}
                        onClick={() => {
                          const allProperties = db.getProperties();
                          let matchingProperty = null;
                          if (lead.propertyInterest) {
                            const interestLower = lead.propertyInterest.toLowerCase();
                            matchingProperty = allProperties.find(p => interestLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(interestLower));
                          }
                          if (!matchingProperty && allProperties.length > 0) {
                            matchingProperty = allProperties[0];
                          }
                          const propPrice = matchingProperty ? matchingProperty.price : 50000000;
                          
                          setActivePrintDoc({
                            type: 'offer_letter',
                            data: {
                              clientName: lead.name,
                              legalName: lead.applicationData?.legalName || lead.name,
                              property: lead.propertyInterest || (matchingProperty ? matchingProperty.name : 'Beacon Property'),
                              regularPrice: propPrice,
                              discount: 0,
                              netPrice: propPrice,
                              deposit: Math.round(propPrice * 0.2),
                              months: 6,
                              installmentVal: Math.round((propPrice - Math.round(propPrice * 0.2)) / 6),
                              date: lead.offerLetterSignedDate || new Date().toISOString().split('T')[0],
                              isSigned: true,
                              signature: lead.offerLetterSignature,
                              signedDate: lead.offerLetterSignedDate
                            }
                          });
                        }}
                      >
                        <FileText size={14} />
                        <span>View Signed Offer Letter</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Step 3: Payments & Allocations Ledger */}
            <div className="desk-section">
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', opacity: lead.offerLetterStatus === 'Accepted' ? 1 : 0.5 }}>
                <span className="step-num" style={{ background: lead.paymentPlan ? 'var(--color-success-text)' : 'var(--text-secondary)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>3</span>
                <span>Structured Payment Ledger & Allocation Letter</span>
              </h4>

              {lead.offerLetterStatus !== 'Accepted' ? (
                <div style={{ padding: '12px', background: '#F3F4F6', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-placeholder)' }}>
                  Locked. You must obtain signed Offer Letter acceptance before ledger and allocation modules unlock.
                </div>
              ) : (
                <>
                  {!lead.paymentPlan ? (
                    <div className="payment-plan-setup-prompt">
                      {!showPayPlanForm ? (
                        <div style={{ textAlign: 'center', padding: '16px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>No active payment plan configured for this client.</p>
                          {(currentUser.role === 'Admin/Doc Officer' || currentUser.role === 'Super Admin') && (
                            <button className="btn btn-sm btn-primary" onClick={() => setShowPayPlanForm(true)}>
                              Configure Payment Plan
                            </button>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleCreatePaymentPlan} style={{ padding: '14px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600' }}>Property Regular Price (NGN) *</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={payPlanForm.price} 
                                onChange={e => setPayPlanForm({ ...payPlanForm, price: e.target.value })}
                                placeholder="e.g. 45000000"
                                required
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600' }}>Discount Amount (NGN)</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={payPlanForm.discount} 
                                onChange={e => setPayPlanForm({ ...payPlanForm, discount: e.target.value })}
                                placeholder="e.g. 1500000"
                              />
                            </div>
                          </div>
                          
                          {Number(payPlanForm.discount) > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--primary-red)' }}>Authorizing Manager Code * (Required for Discounts)</label>
                              <input 
                                type="text" 
                                className="form-control" 
                                value={payPlanForm.authCode} 
                                onChange={e => setPayPlanForm({ ...payPlanForm, authCode: e.target.value })}
                                placeholder="Enter 6-digit authorized code"
                                required
                              />
                            </div>
                          )}

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600' }}>Initial Deposit Paid (NGN)</label>
                              <input 
                                type="number" 
                                className="form-control" 
                                value={payPlanForm.deposit} 
                                onChange={e => setPayPlanForm({ ...payPlanForm, deposit: e.target.value })}
                                placeholder="e.g. 10000000"
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600' }}>Plan Duration (Months)</label>
                              <select 
                                className="form-control"
                                value={payPlanForm.months}
                                onChange={e => setPayPlanForm({ ...payPlanForm, months: e.target.value })}
                              >
                                <option value="0">Outright Payment</option>
                                <option value="3">3 Months</option>
                                <option value="6">6 Months</option>
                                <option value="12">12 Months</option>
                                <option value="18">18 Months</option>
                                <option value="24">24 Months</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-sm btn-icon" onClick={() => setShowPayPlanForm(false)}>
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-sm btn-primary">
                              Generate Plan & Save
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="payment-plan-active-details">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px', background: '#F9FAFB', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '14px', fontSize: '12px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Regular Price</span>
                          <strong style={{ fontSize: '13px' }}>{formatPrice(lead.paymentPlan.regularPrice)}</strong>
                        </div>
                        {lead.paymentPlan.discountAmount > 0 && (
                          <div>
                            <span style={{ color: 'var(--primary-red)', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Discount ({lead.paymentPlan.authCode})</span>
                            <strong style={{ fontSize: '13px', color: 'var(--primary-red)' }}>-{formatPrice(lead.paymentPlan.discountAmount)}</strong>
                          </div>
                        )}
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Net Agreed Price</span>
                          <strong style={{ fontSize: '13px' }}>{formatPrice(lead.paymentPlan.netPrice)}</strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px', textTransform: 'uppercase' }}>Remaining Balance</span>
                          <strong style={{ fontSize: '13px', color: lead.paymentPlan.balance > 0 ? 'var(--primary-red)' : 'var(--color-success-text)' }}>
                            {formatPrice(lead.paymentPlan.balance)}
                          </strong>
                        </div>
                      </div>

                      {/* Document Print Issuance Row - Differentiate based on balance */}
                      <div className="doc-issuance-quick-links" style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                        {lead.paymentPlan.balance > 0 ? (
                          <button className="btn btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#FFFBEB', borderColor: '#FCD34D', color: '#B45309' }} onClick={() => {
                            setActivePrintDoc({
                              type: 'provisional_allocation_letter',
                              data: {
                                clientName: lead.name,
                                legalName: lead.applicationData?.legalName || lead.name,
                                property: lead.propertyInterest || 'N/A',
                                unitDetails: lead.applicationData?.unitDetails || 'Reserved Block Section',
                                netPrice: lead.paymentPlan.netPrice,
                                deposit: lead.paymentPlan.depositPaid,
                                balance: lead.paymentPlan.balance,
                                date: new Date().toISOString().split('T')[0]
                              }
                            });
                          }}>
                            <Award size={14} />
                            <span>Print Provisional Allocation Letter</span>
                          </button>
                        ) : (
                          <button className="btn btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#047857' }} onClick={() => {
                            setActivePrintDoc({
                              type: 'final_allocation_letter',
                              data: {
                                clientName: lead.name,
                                legalName: lead.applicationData?.legalName || lead.name,
                                property: lead.propertyInterest || 'N/A',
                                unitDetails: lead.applicationData?.unitDetails || 'Reserved Block Section',
                                netPrice: lead.paymentPlan.netPrice,
                                deposit: lead.paymentPlan.depositPaid + (lead.paymentPlan.netPrice - lead.paymentPlan.depositPaid),
                                balance: 0,
                                date: new Date().toISOString().split('T')[0]
                              }
                            });
                          }}>
                            <Award size={14} />
                            <span>Print Final Allocation Letter & Deed</span>
                          </button>
                        )}
                      </div>

                      {/* Installments List Ledger */}
                      <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>PLAN LEDGER & SCHEDULE</div>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr', padding: '8px 12px', background: '#F3F4F6', fontWeight: '700', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
                          <span>Payment Type</span>
                          <span>Due Date</span>
                          <span>Amount</span>
                          <span style={{ textAlign: 'right' }}>Status / Action</span>
                        </div>
                        
                        {/* Initial Deposit Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr', padding: '10px 12px', borderBottom: '1px dashed var(--border-color)', alignItems: 'center' }}>
                          <span style={{ fontWeight: '600' }}>Initial Deposit</span>
                          <span>{lead.paymentPlan.dateCreated}</span>
                          <strong>{formatPrice(lead.paymentPlan.depositPaid)}</strong>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>Paid</span>
                            <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => {
                              setActivePrintDoc({
                                type: 'receipt',
                                data: {
                                  clientName: lead.name,
                                  property: lead.propertyInterest || 'N/A',
                                  amount: lead.paymentPlan.depositPaid,
                                  date: lead.paymentPlan.dateCreated,
                                  receiptNo: 'REC-DEP-' + lead.id.slice(-4).toUpperCase(),
                                  description: 'Initial Property Deposit Payment'
                                }
                              });
                            }}>Receipt</button>
                          </div>
                        </div>

                        {/* Installments Rows */}
                        {lead.paymentPlan.installmentsList.map((inst, index) => {
                          const isOverdue = new Date(inst.dueDate) < new Date() && inst.status === 'Pending';
                          return (
                            <div key={inst.index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.5fr 2fr', padding: '10px 12px', borderBottom: index < lead.paymentPlan.installmentsList.length - 1 ? '1px dashed var(--border-color)' : 'none', alignItems: 'center', background: isOverdue ? '#FEF2F2' : 'none' }}>
                              <span style={{ fontWeight: '500' }}>Installment #{inst.index}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? 'var(--primary-red)' : 'inherit' }}>
                                {inst.dueDate}
                                {isOverdue && <AlertCircle size={12} title="Payment Overdue Reminder" />}
                              </span>
                              <strong>{formatPrice(inst.amount)}</strong>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                {inst.status === 'Paid' ? (
                                  <>
                                    <span className="badge badge-success" style={{ fontSize: '10px' }}>Paid</span>
                                    <button className="btn btn-sm" style={{ padding: '2px 6px', fontSize: '10px' }} onClick={() => {
                                      setActivePrintDoc({
                                        type: 'receipt',
                                        data: {
                                          clientName: lead.name,
                                          property: lead.propertyInterest || 'N/A',
                                          amount: inst.amount,
                                          date: new Date().toISOString().split('T')[0],
                                          receiptNo: `REC-INST${inst.index}-` + lead.id.slice(-4).toUpperCase(),
                                          description: `Installment #${inst.index} Payment`
                                        }
                                      });
                                    }}>Receipt</button>
                                  </>
                                ) : (
                                  <>
                                    <span className={`badge ${isOverdue ? 'badge-hot' : 'badge-cold'}`} style={{ fontSize: '10px' }}>Pending</span>
                                    {(currentUser.role === 'Admin/Doc Officer' || currentUser.role === 'Super Admin') && (
                                      <button className="btn btn-sm btn-primary" style={{ padding: '2px 8px', fontSize: '10px' }} onClick={() => handleLogPayment(inst.index)}>
                                        Log Pay
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          )}

          <div className="card">
            <h3 className="section-title">Activity Log & Conversation History</h3>

            {/* Custom Tab Toggles */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', gap: '8px' }}>
              <button 
                type="button"
                className={`tab-btn ${activeHistoryTab === 'conversation' ? 'active' : ''}`} 
                onClick={() => setActiveHistoryTab('conversation')}
                style={{ 
                  padding: '12px 20px', 
                  background: 'none', 
                  border: 'none', 
                  font: 'inherit',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderBottom: activeHistoryTab === 'conversation' ? '3px solid var(--primary-red)' : '3px solid transparent',
                  color: activeHistoryTab === 'conversation' ? 'var(--primary-red)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Conversation History ({conversationActivities.length})
              </button>
              <button 
                type="button"
                className={`tab-btn ${activeHistoryTab === 'system' ? 'active' : ''}`} 
                onClick={() => setActiveHistoryTab('system')}
                style={{ 
                  padding: '12px 20px', 
                  background: 'none', 
                  border: 'none', 
                  font: 'inherit',
                  fontWeight: '700',
                  fontSize: '14px',
                  borderBottom: activeHistoryTab === 'system' ? '3px solid var(--primary-red)' : '3px solid transparent',
                  color: activeHistoryTab === 'system' ? 'var(--primary-red)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                Activity Log ({systemActivities.length})
              </button>
            </div>
            
            {displayedActivities.length === 0 ? (
              <div className="empty-activities-timeline">
                {activeHistoryTab === 'conversation' ? (
                  <>
                    <Phone size={32} className="timeline-placeholder-icon" />
                    <p>No conversations have been logged for this lead yet.</p>
                  </>
                ) : (
                  <>
                    <FileText size={32} className="timeline-placeholder-icon" />
                    <p>No system activity has been logged for this lead yet.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="timeline-container">
                {displayedActivities.map((act, i) => (
                  <div key={act.id} className="timeline-node">
                    <div className="timeline-node-line" />
                    <div className="timeline-node-dot" />
                    
                    <div className="timeline-node-content-card">
                      <div className="node-card-header">
                        <div className="node-card-header-left">
                          <span className={`badge badge-grey`}>{act.type}</span>
                          <span className="node-logged-by">Logged by {act.loggedBy}</span>
                        </div>
                        <span className="node-time">
                          {new Date(act.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      
                      <div className="node-card-body">
                        <p className="node-summary">"{act.summary}"</p>
                        
                        {act.objections && act.objections !== 'None' && (
                          <div className="node-meta-row">
                            <strong>Objections raised:</strong> <span>{act.objections}</span>
                          </div>
                        )}
                        {act.feedback && act.feedback !== 'N/A' && (
                          <div className="node-meta-row">
                            <strong>Client Feedback:</strong> <span>{act.feedback}</span>
                          </div>
                        )}
                        {act.nextStep && (
                          <div className="node-meta-row">
                            <strong>Next Step noted:</strong> <span className="highlight-next-text">{act.nextStep}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key info, Inspections list, Reassignment */}
        <div className="profile-right-column">
          {/* Key contact info */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title">Contact Information</h3>
            <div className="contact-info-list">
              <div className="contact-item">
                <span className="contact-label">Phone Number</span>
                <div className="contact-value-row">
                  <Phone size={14} />
                  <span>{lead.phone}</span>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-label">WhatsApp Number</span>
                <div className="contact-value-row">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                  <span>{lead.whatsapp || lead.phone}</span>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-label">Email Address</span>
                <div className="contact-value-row">
                  <Mail size={14} />
                  <span>{lead.email || 'None provided'}</span>
                </div>
              </div>

              <div className="contact-item">
                <span className="contact-label">Interest</span>
                <span className="contact-value-bold">{lead.propertyInterest || 'No specific property noted'}</span>
              </div>
            </div>

            {/* Quick Contact Actions Grid */}
            <div className="quick-contact-actions-grid" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <a href={`tel:${lead.phone}`} className="btn btn-sm contact-action-btn call-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}>
                <Phone size={14} />
                <span>Call Lead</span>
              </a>
              <a href={`sms:${lead.phone}`} className="btn btn-sm contact-action-btn sms-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <span>Send SMS</span>
              </a>
              <a href={handleWhatsappLink()} target="_blank" rel="noreferrer" className="btn btn-sm contact-action-btn whatsapp-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600', color: '#25D366', borderColor: '#25D366' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                <span>WhatsApp</span>
              </a>
              <a href={lead.email ? `mailto:${lead.email}` : '#'} onClick={(e) => { if (!lead.email) { e.preventDefault(); alert("No email address provided for this lead."); } }} className="btn btn-sm contact-action-btn email-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '600' }}>
                <Mail size={14} />
                <span>Email Lead</span>
              </a>
            </div>
          </div>

          {/* Property Interest Details Card (Non-Inspection Officer view only) */}
          {currentUser.role !== 'Inspection Officer' && renderPropertyCard()}

          {/* Client Relationship Hub (Only for Clients) */}
          {(lead.stage === 'Client/Investor' || lead.stage === 'Repeat Purchase') && (
            <div className="card client-relationship-card" style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Client Relationship Hub</span>
                </h3>
                <span className="badge badge-hollow" style={{ fontSize: '11px' }}>
                  Client Portfolio
                </span>
              </div>

              <div className="contact-info-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Relationship Status */}
                <div className="contact-item">
                  <span className="contact-label">Relationship Health</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className={`badge badge-${(lead.relationshipStatus || 'Active').toLowerCase().replace(' ', '-')}`} style={{ fontWeight: '700' }}>
                      {lead.relationshipStatus || 'Active'}
                    </span>
                    <select
                      className="form-control"
                      style={{ width: '120px', padding: '4px 8px', height: 'auto', fontSize: '12px' }}
                      value={lead.relationshipStatus || 'Active'}
                      onChange={(e) => {
                        const updated = { ...lead, relationshipStatus: e.target.value };
                        dataService.saveLead(updated);
                        loadLeadData();
                        db.logAudit(`Client ${lead.name} relationship status updated to ${e.target.value}`);
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                      <option value="At Risk">At Risk</option>
                      <option value="Dormant">Dormant</option>
                    </select>
                  </div>
                </div>

                {/* Satisfaction Rating (Stars) */}
                <div className="contact-item">
                  <span className="contact-label">Satisfaction Score</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (lead.satisfactionScore || 0);
                      return (
                        <button
                          key={star}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          onClick={() => {
                            const updated = { ...lead, satisfactionScore: star };
                            dataService.saveLead(updated);
                            loadLeadData();
                            db.logAudit(`Client ${lead.name} satisfaction score updated to ${star} stars`);
                          }}
                          title={`Rate ${star} Stars`}
                        >
                          <Star size={18} fill={active ? "#FFD700" : "none"} stroke={active ? "#FFD700" : "var(--text-placeholder)"} />
                        </button>
                      );
                    })}
                    <span style={{ fontSize: '13px', fontWeight: '700', marginLeft: '6px', color: 'var(--text-primary)' }}>
                      {lead.satisfactionScore ? `${lead.satisfactionScore}/5` : 'Not Rated'}
                    </span>
                  </div>
                </div>

                {/* Referral Status */}
                <div className="contact-item">
                  <span className="contact-label">Referral Status</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="contact-value-bold" style={{ fontSize: '13px' }}>
                      {lead.referralStatus || 'None'}
                    </span>
                    <button
                      className="btn btn-xs"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => {
                        const nextStatus = lead.referralStatus === 'Requested' ? 'Generated Referral' : 'Requested';
                        const updated = { ...lead, referralStatus: nextStatus };
                        dataService.saveLead(updated);
                        loadLeadData();
                        db.logAudit(`Client ${lead.name} referral status updated to ${nextStatus}`);
                        dataService.saveActivity({
                          leadId: lead.id,
                          type: "Internal Note",
                          summary: `Referral status updated to '${nextStatus}'.`,
                          objections: "None",
                          feedback: "N/A",
                          nextStep: "Follow up on potential referrals.",
                          loggedBy: currentUser.name
                        });
                      }}
                    >
                      {lead.referralStatus === 'Requested' ? 'Mark Generated' : 'Request Referral'}
                    </button>
                  </div>
                </div>

                {/* Last Contact Date */}
                <div className="contact-item">
                  <span className="contact-label">Last Relationship Call</span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span className="contact-value" style={{ fontSize: '13px' }}>
                      {lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'No recorded call'}
                    </span>
                    <input
                      type="date"
                      className="form-control"
                      style={{ width: '130px', padding: '4px 8px', height: 'auto', fontSize: '12px' }}
                      value={lead.lastContactDate || ''}
                      onChange={(e) => {
                        const updated = { ...lead, lastContactDate: e.target.value };
                        dataService.saveLead(updated);
                        loadLeadData();
                        db.logAudit(`Client ${lead.name} last contact date updated to ${e.target.value}`);
                      }}
                    />
                  </div>
                </div>

                {/* Referred By */}
                {lead.referredById && (
                  <div className="contact-item">
                    <span className="contact-label">Referred By</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <User size={13} className="primary-text" />
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>
                        {allLeads.find(l => l.id === lead.referredById)?.name || 'Referring Client'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Referred Leads list */}
                <div className="contact-item" style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                  <span className="contact-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Referred Leads ({allLeads.filter(l => l.referredById === lead.id).length})</span>
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                    {allLeads.filter(l => l.referredById === lead.id).length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-placeholder)', fontStyle: 'italic' }}>No referrals generated yet.</span>
                    ) : (
                      allLeads.filter(l => l.referredById === lead.id).map(ref => (
                        <div key={ref.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-grey-bg)', padding: '6px 10px', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{ref.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Stage: {ref.stage} | Temp: {ref.temperature}</span>
                          </div>
                          <span className={`badge badge-${ref.temperature.toLowerCase()}`} style={{ fontSize: '9px', padding: '1px 5px' }}>{ref.temperature}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Linked Inspections list */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title">Site Inspections History</h3>
            {inspections.length === 0 ? (
              <div className="empty-sub-panel">No site inspections booked yet.</div>
            ) : (
              <div className="inspections-sub-list">
                {inspections.map(i => (
                  <div key={i.id} className="inspection-sub-item-card">
                    <div className="ins-sub-header">
                      <strong className="ins-sub-estate">{i.estate}</strong>
                      <span className={`badge ${
                        i.status === 'Completed' ? 'badge-success' :
                        i.status === 'No-Show' ? 'badge-hot' : 'badge-cold'
                      }`}>{i.status}</span>
                    </div>
                    <div className="ins-sub-details">
                      <span>Date: {i.date} @ {i.time}</span>
                      <span>Officer: {allUsers.find(u => u.id === i.inspectionOfficerId)?.name || "Officer"}</span>
                    </div>
                    {i.report && (
                      <div className="ins-sub-report">
                        <strong>Report:</strong> "{i.report}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reassign Closer Controls (Super Admin/Management only) */}
          {currentUser.role === 'Super Admin' && lead.status === 'Active' && (
            <div className="card reassign-panel-card">
              <h3 className="section-title">Reassign Owner</h3>
              <div className="reassign-controls">
                <select 
                  className="form-control" 
                  value={reassignCloserId}
                  onChange={e => setReassignCloserId(e.target.value)}
                >
                  <option value="">-- Choose Closer --</option>
                  {closers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleReassignCloser(false)}
                >
                  Save Reassignment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Printable Document Preview Overlay Modal */}
      {activePrintDoc && (
        <div className="modal-backdrop print-overlay-backdrop" style={{ zIndex: 9999, background: 'rgba(0, 0, 0, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              .print-overlay-backdrop, .print-overlay-backdrop * {
                visibility: visible !important;
              }
              .print-overlay-backdrop {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                z-index: 99999 !important;
              }
              .print-control-bar {
                display: none !important;
              }
              .print-document-container {
                box-shadow: none !important;
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
              }
            }
          `}</style>
          
          <div style={{ display: 'flex', flexDirection: 'column', width: '90%', maxWidth: '800px', height: '90%', background: 'none' }}>
            {/* Top Control Bar - hidden on print */}
            <div className="print-control-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1E293B', color: 'white', padding: '12px 24px', borderRadius: '8px 8px 0 0' }}>
              <div style={{ fontWeight: 600 }}>Print Preview - {activePrintDoc.type.replace('_', ' ').toUpperCase()}</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-sm btn-primary" onClick={() => window.print()} style={{ background: '#3B82F6', borderColor: '#3B82F6', color: 'white' }}>
                  Print / Save as PDF
                </button>
                <button className="btn btn-sm btn-icon" onClick={() => setActivePrintDoc(null)} style={{ background: '#475569', color: 'white', border: 'none' }}>
                  Close Preview
                </button>
              </div>
            </div>

            {/* Document sheet */}
            <div className="print-document-container report-main-viewport" style={{ flex: 1, background: 'white', color: '#111827', padding: '50px', overflowY: 'auto', borderRadius: '0 0 8px 8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', fontFamily: 'serif', lineHeight: 1.6 }}>
              {/* Header Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #EF4444', paddingBottom: '16px', marginBottom: '30px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    {/* Simulated Logo Silhouettes */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '35px', marginRight: '4px' }}>
                      <div style={{ width: '6px', height: '18px', backgroundColor: '#EF4444' }} />
                      <div style={{ width: '6px', height: '28px', backgroundColor: '#1E293B' }} />
                      <div style={{ width: '6px', height: '22px', backgroundColor: '#EF4444' }} />
                      <div style={{ width: '6px', height: '32px', backgroundColor: '#1E293B' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#4B5563', letterSpacing: '1px', lineHeight: 1 }}>RC: 1989088</div>
                      <h1 style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '1px', margin: '2px 0 0 0', textTransform: 'uppercase', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        BEAC<span style={{ color: '#EF4444', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #EF4444', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', fontWeight: '900' }}>O</span>N
                      </h1>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#EF4444', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '-2px' }}>Corporate Realty Ltd</div>
                    </div>
                  </div>
                  <p style={{ fontSize: '11px', margin: '6px 0 0 0', color: '#4B5563', fontStyle: 'italic' }}>Secure your tomorrow...</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#4B5563', lineHeight: 1.4 }}>
                  <p style={{ margin: 0, fontWeight: 'bold' }}>Corporate Headquarters</p>
                  <p style={{ margin: 0 }}>Plot 415, Constitution Avenue,</p>
                  <p style={{ margin: 0 }}>Victoria Island, Lagos, Nigeria</p>
                </div>
              </div>

              {/* Receipt Document */}
              {activePrintDoc.type === 'receipt' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '20px', textDecoration: 'underline', fontWeight: 'bold', margin: 0 }}>OFFICIAL TRANSACTION RECEIPT</h2>
                    <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '5px' }}>Receipt No: {activePrintDoc.data.receiptNo}</p>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold', width: '200px' }}>Received From:</td>
                        <td style={{ padding: '12px 0' }}>{activePrintDoc.data.clientName}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Payment For Property:</td>
                        <td style={{ padding: '12px 0' }}>{activePrintDoc.data.property}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Amount Paid:</td>
                        <td style={{ padding: '12px 0', fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                          {formatPrice(activePrintDoc.data.amount)}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Date of Payment:</td>
                        <td style={{ padding: '12px 0' }}>{activePrintDoc.data.date}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Transaction Type:</td>
                        <td style={{ padding: '12px 0' }}>{activePrintDoc.data.description}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={{ padding: '12px 0', fontWeight: 'bold' }}>Transaction Status:</td>
                        <td style={{ padding: '12px 0', fontWeight: 'bold', color: '#059669' }}>CONFIRMED & CLEARED</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <div style={{ width: '150px', borderBottom: '1px solid #111827', marginBottom: '5px' }} />
                      <p style={{ fontSize: '11px', color: '#4B5563', margin: 0 }}>Client Signature & Date</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 'bold' }}>Beacon Corporate Finance</p>
                      <div style={{ width: '150px', borderBottom: '1px solid #111827', margin: '5px 0 5px auto' }} />
                      <p style={{ fontSize: '11px', color: '#4B5563', margin: 0 }}>Authorized Document Officer</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Application Form Document */}
              {activePrintDoc.type === 'application_form' && (
                <div style={{ fontSize: '14px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '20px', textDecoration: 'underline', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>CLIENT ACQUISITION APPLICATION FORM</h2>
                    <p style={{ fontSize: '12px', color: '#4B5563', marginTop: '5px' }}>Status: <strong style={{ color: activePrintDoc.data.status === 'Approved' ? '#059669' : '#D97706' }}>{activePrintDoc.data.status?.toUpperCase() || 'SUBMITTED'}</strong></p>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', color: '#B42318' }}>1. Personal & Legal Identity Details</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold', width: '200px' }}>Full Legal Name:</td>
                          <td style={{ padding: '8px 0' }}>{activePrintDoc.data.legalName}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Employment Status:</td>
                          <td style={{ padding: '8px 0' }}>{activePrintDoc.data.employment}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', color: '#B42318' }}>2. Next of Kin Contact Details</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold', width: '200px' }}>Next of Kin Name:</td>
                          <td style={{ padding: '8px 0' }}>{activePrintDoc.data.nokName}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Next of Kin Phone:</td>
                          <td style={{ padding: '8px 0' }}>{activePrintDoc.data.nokPhone}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase', color: '#B42318' }}>3. Property Interest Specification</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold', width: '200px' }}>Estate / Property:</td>
                          <td style={{ padding: '8px 0' }}>{activePrintDoc.data.property}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold' }}>Unit Reference Specs:</td>
                          <td style={{ padding: '8px 0' }}><strong>{activePrintDoc.data.unitDetails}</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ border: '1px dashed #A7F3D0', padding: '15px', borderRadius: '6px', background: '#ECFDF5', fontSize: '12px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span>
                    <span>This application form data was captured via the secure client onboarding portal. The data is locked and archived as the client's official record of transaction.</span>
                  </div>
                </div>
              )}

              {/* Offer Letter Document */}
              {activePrintDoc.type === 'offer_letter' && (() => {
                const sizeVal = activePrintDoc.data.property.toLowerCase().includes("waterfront") ? "1000" : (activePrintDoc.data.property.toLowerCase().includes("heights") ? "600" : "500");
                const settingOutFee = sizeVal === "1000" ? 250000 : 150000;
                const infraFee = activePrintDoc.data.property.toLowerCase().includes("grove") ? 1000000 : (activePrintDoc.data.property.toLowerCase().includes("waterfront") ? 5000000 : (activePrintDoc.data.property.toLowerCase().includes("maitama") ? 7500000 : 2500000));
                
                return (
                  <div style={{ fontSize: '13px', textAlign: 'justify', position: 'relative', minHeight: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                      <span style={{ fontSize: '13px' }}><strong>Date:</strong> {activePrintDoc.data.date}</span>
                    </div>

                    <div style={{ marginBottom: '20px', lineHeight: 1.4 }}>
                      <strong>{activePrintDoc.data.legalName.toUpperCase()}</strong><br />
                      {lead.email ? lead.email : "Customer Reference Address"}<br />
                      {lead.phone}<br />
                      <strong>FILE NO:</strong> BCL/OFFER/{new Date().getFullYear()}/{activePrintDoc.data.clientName.replace(/\s+/g, '').slice(0,4).toUpperCase()}
                    </div>

                    <p style={{ margin: '15px 0' }}>Dear Sir/Ma,</p>

                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: '15px 0', textAlign: 'left', lineHeight: 1.4 }}>
                      OFFER LETTER FOR RESIDENTIAL LAND SUBSCRIPTION — {activePrintDoc.data.property.toUpperCase()}.
                    </h3>

                    <p style={{ marginBottom: '15px' }}>
                      Following your expression of interest and application for 1 unit of about {sizeVal}SQM land space in {activePrintDoc.data.property}. This offer is made subject to the following terms and conditions.
                    </p>

                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0' }}>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>APPLICATION FEE</strong> is <strong>₦10,000</strong> non-refundable.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>LAND PAYMENT:</strong> The disposable price of the property is <strong>{formatPrice(activePrintDoc.data.netPrice)}</strong> only at a discounted price.
                        <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
                          I. A provisional Allocation will be issued to you upon making a part payment for the land, while Letter of allocation will be given to you upon full payment for the plot of Land.
                        </div>
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>SETTING OUT AND EXCAVATION FEE:</strong> for {sizeVal}SQM is <strong>{formatPrice(settingOutFee)}</strong>
                        <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
                          I. Setting out and excavation is strictly handled by the company's team of Engineers while the foundation to DPC level can be handled by the company or your qualified engineers to be supervised by our construction team.
                        </div>
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        <strong>INFRASTRUCTURE FEE:</strong> <strong>{formatPrice(infraFee)}</strong>
                        <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
                          I. Payment for infrastructure shall commence when the individual starts work on the plot of Land.<br />
                          II. That you are expected to pay Infrastructural Fees into Company Bank Accounts - <strong>UBA- 1025763945 | MONIE POINT- 6491356795 | First Bank - 2046659543</strong> (Beacon Corporate Realty).
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <strong>NB:</strong> This is however subject to change due to fluctuations in the prices of building materials.
                        </div>
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        Upon request for refund of any deposit made in favor of <strong>BEACON CORPORATE REALTY</strong>, Refund process shall take a period of 90 days and less with 20% administrative charge deduction.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That the building, if it will be constructed by you, must be supervised by our construction team to ensure adherence to standard at the cost of <strong>₦100,000 (ONE HUNDRED THOUSAND NAIRA)</strong> only.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        You cannot occupy your building until full payment of infrastructure fee is made.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        If this offer is accepted by you, All Land Payments in <strong>{activePrintDoc.data.property.toUpperCase()}</strong> shall be forwarded in favor of Beacon Corporate Realty. <strong>UBA- 1025763945 | MONIE POINT- 6491356795 | First Bank - 2046659543</strong>.
                      </li>
                    </ol>

                    <p style={{ margin: '12px 0' }}><strong>NB: This offer letter is valid for one week.</strong></p>

                    <p style={{ margin: '15px 0 5px 0' }}>Be assured of our warmest regard.</p>

                    {/* Director signature & block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '15px 0 25px 0' }}>
                      <div style={{ height: '45px', position: 'relative' }}>
                        <svg width="180" height="45" style={{ position: 'absolute', top: -5, left: 0 }}>
                          <path d="M 10,25 C 30,10 40,40 60,15 C 80,-5 100,40 120,20 C 130,10 150,15 170,20" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                          <path d="M 25,18 Q 80,35 135,22" fill="none" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <strong style={{ fontSize: '12px' }}>ADEGOKE TAJUDEEN ADEKUNLE</strong>
                      <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#4B5563' }}>Director</span>
                    </div>

                    {/* Acceptance block */}
                    <div style={{ marginTop: '15px', marginBottom: '30px' }}>
                      {activePrintDoc.data.isSigned ? (
                        <div style={{ border: '2px solid #10B981', padding: '12px', borderRadius: '4px', background: '#F0FDF4' }}>
                          <h4 style={{ margin: '0 0 8px 0', textDecoration: 'underline', fontWeight: 'bold', color: '#047857', fontSize: '12px' }}>ACCEPTANCE OF OFFER (DIGITALLY SIGNED)</h4>
                          <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>I, <strong>{activePrintDoc.data.legalName}</strong>, hereby accept the terms of this offer letter and agree to be bound by the covenants herein contained.</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                            <span>Signature: <strong style={{ fontFamily: 'cursive', fontSize: '15px', borderBottom: '1px double #111827', paddingBottom: '2px' }}>{activePrintDoc.data.signature || activePrintDoc.data.legalName}</strong></span>
                            <span>Date: <strong>{activePrintDoc.data.signedDate || new Date().toISOString().split('T')[0]}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ border: '1px solid #111827', padding: '12px', borderRadius: '4px' }}>
                          <h4 style={{ margin: '0 0 8px 0', textDecoration: 'underline', fontWeight: 'bold', fontSize: '12px' }}>ACCEPTANCE OF OFFER</h4>
                          <p style={{ margin: '0 0 10px 0', fontSize: '12px' }}>I, ____________________________________, hereby accept the terms of this offer letter and agree to be bound by the covenants herein contained.</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px' }}>
                            <span>Signature: __________________________</span>
                            <span>Date: __________________________</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer red bar multi-column block */}
                    <div className="print-footer" style={{ borderTop: '3px solid #EF4444', paddingTop: '12px', marginTop: '30px', display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: '15px', fontSize: '9px', color: '#374151', lineHeight: 1.4 }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>📍</span> <span>No. 19, Koforidua Street, Wuse Zone 2, Abuja</span>
                        </p>
                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>📍</span> <span>3rd Floor, [Right Wing] Hamza Zayyad House, Opposite NEPA Office, Kaduna</span>
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>✉</span> <span>info@beaconcorporaterealty.com</span>
                        </p>
                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>🌐</span> <span>beaconcorporaterealty</span>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px 0' }}>📞 0906 216 4866</p>
                        <p style={{ margin: 0 }}>📞 0911 838 5591</p>
                      </div>
                    </div>
                  </div>
                );
              })()}              {/* Provisional Allocation Letter Document */}
              {activePrintDoc.type === 'provisional_allocation_letter' && (() => {
                const sizeVal = activePrintDoc.data.property.toLowerCase().includes("waterfront") ? "1000" : (activePrintDoc.data.property.toLowerCase().includes("heights") ? "600" : "500");
                const prototypeName = activePrintDoc.data.property.toLowerCase().includes("waterfront") ? "5 Bedroom Duplex Prototype" : (activePrintDoc.data.property.toLowerCase().includes("penthouse") ? "3 Bedroom Penthouse Prototype" : "Residential Building Prototype");
                const months = lead.paymentPlan?.durationMonths || 6;
                
                const lastInst = lead.paymentPlan?.installmentsList?.slice(-1)[0];
                const dueDateVal = lastInst ? lastInst.dueDate : new Date(new Date().setMonth(new Date().getMonth() + months)).toISOString().split('T')[0];
                
                return (
                  <div style={{ fontSize: '13px', textAlign: 'justify', position: 'relative', minHeight: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                      <span style={{ fontSize: '13px' }}><strong>Date:</strong> {activePrintDoc.data.date}</span>
                    </div>

                    <div style={{ marginBottom: '20px', lineHeight: 1.4 }}>
                      <strong>{activePrintDoc.data.legalName.toUpperCase()}</strong><br />
                      {lead.email ? lead.email : "Customer Reference Address"}<br />
                      {lead.phone}<br />
                      <strong>FILE NO:</strong> BCL/PROV-ALLOC/{new Date().getFullYear()}/{activePrintDoc.data.clientName.replace(/\s+/g, '').slice(0,4).toUpperCase()}
                    </div>

                    <p style={{ margin: '15px 0' }}>Dear Sir/Ma,</p>

                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', margin: '15px 0', textAlign: 'left', lineHeight: 1.4 }}>
                      PROVISIONAL ALLOCATION LETTER — {activePrintDoc.data.property.toUpperCase()}.
                    </h3>

                    <p style={{ marginBottom: '15px' }}>
                      Following your application and interest at <strong>{activePrintDoc.data.property}</strong> and upon payment of the sum of <strong>{formatPrice(activePrintDoc.data.deposit)}</strong> only, we are glad to convey to you a provisional allocation of land space of about <strong>{sizeVal}SQM</strong>, subject to the conditions hereunder appearing.
                    </p>

                    <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px', margin: '15px 0' }}>
                      <li style={{ marginBottom: '6px' }}>
                        The final allocation of the land space described above is subject to payment of the balance sum of <strong>{formatPrice(activePrintDoc.data.balance)}</strong> only on or before <strong>{dueDateVal}</strong> from the date of this provisional allocation.
                        <div style={{ paddingLeft: '20px', marginTop: '4px' }}>
                          I. That failure to meet up with the deadline for the payment as captured in the preceding paragraph, you will be made to pay the current market value of the project as at the time you are paying.
                        </div>
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That this land space is to be used for the construction of a <strong>{prototypeName}</strong>.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That a work permit shall be issued before commencement of any construction upon discharge of 100% payment of cost of land space.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That you are to build strictly according to prototype issued to you.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That all construction works at <strong>{activePrintDoc.data.property}</strong> is to be supervised by our construction team.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        The failure of 100% payment of cost of land space within <strong>{months} months</strong> risk revocation upon one-month notice and relocation to the next phase of the project, or attract additional 20% charge on the said balance amount.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        Withdrawal of interest, or request for refund attract 20% charge.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That this allocation is not transferable without the prior consent of the developer/company.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That the company has the right to stop your construction if you do not pay up where there is an outstanding balance or deviate from the approved standard of construction.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That it is the sole responsibility of the developer/company to perpetually appoint a facility Manager for <strong>{activePrintDoc.data.property}</strong>.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That you are obligated to pay a facility management fee which is subject to change by the appointed facility manager on or before the <strong>15TH DAY OF JANUARY</strong> of every year.
                      </li>
                      <li style={{ marginBottom: '6px' }}>
                        That you are expected to pay your infrastructure fee before occupation of your building.
                      </li>
                    </ol>

                    <p style={{ margin: '20px 0 5px 0', fontSize: '13px', fontWeight: 'bold' }}>CONGRATULATIONS.</p>

                    {/* Director signature & block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', margin: '15px 0 25px 0' }}>
                      <div style={{ height: '45px', position: 'relative' }}>
                        <svg width="180" height="45" style={{ position: 'absolute', top: -5, left: 0 }}>
                          <path d="M 10,25 C 30,10 40,40 60,15 C 80,-5 100,40 120,20 C 130,10 150,15 170,20" fill="none" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
                          <path d="M 25,18 Q 80,35 135,22" fill="none" stroke="#0F172A" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <strong style={{ fontSize: '12px' }}>ADEGOKE TAJUDEEN ADEKUNLE</strong>
                      <span style={{ fontSize: '11px', fontStyle: 'italic', color: '#4B5563' }}>Director</span>
                    </div>

                    {/* Footer red bar multi-column block */}
                    <div className="print-footer" style={{ borderTop: '3px solid #EF4444', paddingTop: '12px', marginTop: '30px', display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: '15px', fontSize: '9px', color: '#374151', lineHeight: 1.4 }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>📍</span> <span>No. 19, Koforidua Street, Wuse Zone 2, Abuja</span>
                        </p>
                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>📍</span> <span>3rd Floor, [Right Wing] Hamza Zayyad House, Opposite NEPA Office, Kaduna</span>
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>✉</span> <span>info@beaconcorporaterealty.com</span>
                        </p>
                        <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#EF4444' }}>🌐</span> <span>beaconcorporaterealty</span>
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: '0 0 4px 0' }}>📞 0906 216 4866</p>
                        <p style={{ margin: 0 }}>📞 0911 838 5591</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Final Allocation Letter & Deed of Assignment Document */}
              {activePrintDoc.type === 'final_allocation_letter' && (
                <div style={{ fontSize: '14px', textAlign: 'justify' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <span><strong>Ref:</strong> BCL/FINAL-ALLOC/{new Date().getFullYear()}/{activePrintDoc.data.clientName.replace(/\s+/g, '').slice(0,4).toUpperCase()}</span>
                    <span><strong>Date:</strong> {activePrintDoc.data.date}</span>
                  </div>

                  <p>To,<br />
                  <strong>{activePrintDoc.data.legalName}</strong><br />
                  Customer Reference Address</p>

                  <h3 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', textDecoration: 'underline', margin: '20px 0' }}>
                    Final Allocation Letter & Deed of Assignment: {activePrintDoc.data.property}
                  </h3>

                  <p>Dear Sir/Ma,</p>
                  
                  <p>We are pleased to confirm that you have fully liquidated the net consideration sum scheduled for your property unit. Accordingly, Beacon Corporate Realty hereby issues this <strong>Final Allocation Letter & Deed of Assignment</strong>, transferring full physical ownership and deed rights of the property described below:</p>

                  <div style={{ background: '#ECFDF5', padding: '15px', border: '1px solid #A7F3D0', borderRadius: '4px', margin: '20px 0' }}>
                    <table style={{ width: '100%', fontSize: '13px' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: '150px' }}>Property Estate:</td>
                          <td>{activePrintDoc.data.property}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Allocated Unit Ref:</td>
                          <td><strong>{activePrintDoc.data.unitDetails}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Client Legal Name:</td>
                          <td>{activePrintDoc.data.legalName}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Total Purchase Price:</td>
                          <td><strong>{formatPrice(activePrintDoc.data.netPrice)}</strong></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>Outstanding Balance:</td>
                          <td style={{ color: '#047857', fontWeight: 'bold' }}>FULLY PAID (NGN 0)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>By this instrument, all legal titles, covenants, easements, and rights of possession in respect to the assigned unit are hereby permanently assigned to the Client. The physical hand-over of beacons, keys, and registered documentation is approved.</p>

                  <p>Congratulations on your successful acquisition. We look forward to your residency and future investments with us.</p>

                  <p>Yours faithfully,<br />
                  For: <strong>Beacon Corporate Realty Ltd</strong></p>

                  <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Head, Operations & Legal</p>
                      <p style={{ margin: 0, color: '#4B5563' }}>Beacon Corporate Realty</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>General Manager, Allocations</p>
                      <p style={{ margin: 0, color: '#4B5563' }}>Beacon Corporate Realty</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lead-profile-page {
          animation: fadeIn 0.25s ease-out;
        }

        .back-nav-btn {
          margin-bottom: 20px;
        }

        .dormant-warning-banner {
          background-color: #FEF3F2;
          border: 1px solid #FDA29B;
          color: #B42318;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .dormant-banner-icon {
          flex-shrink: 0;
        }

        .profile-header-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 28px;
          margin-bottom: 24px;
        }

        .profile-header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .profile-avatar-large {
          width: 64px;
          height: 64px;
          background-color: var(--primary-red);
          color: white;
          font-size: 24px;
          font-weight: 700;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .name-badge-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .profile-name {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .meta-details-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .profile-header-right {
          display: flex;
          gap: 10px;
        }

        .next-action-prompt-card {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          padding: 20px 28px;
          background-color: #FAFAFA;
          border-color: var(--border-color);
          margin-bottom: 24px;
        }

        .prompt-column {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .prompt-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .prompt-value {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .prompt-followup-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .prompt-icon {
          color: var(--primary-red);
        }

        .pipeline-progress-bar-card {
          margin-bottom: 24px;
        }

        .stages-wrapper {
          overflow-x: auto;
          padding: 10px 0;
        }

        .stages-scroll-container {
          display: flex;
          align-items: center;
          min-width: 1200px;
          justify-content: space-between;
        }

        .stage-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .step-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background-color: #FFFFFF;
          border: 2px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          transition: var(--transition-normal);
        }

        .step-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-top: 8px;
          text-align: center;
          white-space: nowrap;
        }

        .step-connector {
          position: absolute;
          top: 14px;
          left: calc(50% + 14px);
          right: calc(-50% + 14px);
          height: 2px;
          background-color: var(--border-color);
          z-index: 1;
        }

        .stage-step-item.completed .step-circle {
          background-color: #ECFDF3;
          border-color: #10B981;
          color: #10B981;
        }

        .stage-step-item.completed .step-connector {
          background-color: #10B981;
        }

        .stage-step-item.active .step-circle {
          background-color: var(--primary-red);
          border-color: var(--primary-red);
          color: white;
          box-shadow: 0px 0px 0px 4px var(--primary-red-light);
        }

        .stage-step-item.active .step-label {
          color: var(--primary-red);
          font-weight: 700;
        }

        .profile-body-row {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 24px;
        }

        .timeline-container {
          position: relative;
          padding-left: 20px;
          margin-top: 16px;
        }

        .timeline-node {
          position: relative;
          padding-bottom: 24px;
        }

        .timeline-node:last-child {
          padding-bottom: 0;
        }

        .timeline-node-line {
          position: absolute;
          left: -11px;
          top: 8px;
          bottom: -24px;
          width: 2px;
          background-color: var(--border-color);
        }

        .timeline-node:last-child .timeline-node-line {
          display: none;
        }

        .timeline-node-dot {
          position: absolute;
          left: -15px;
          top: 6px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--primary-red);
          border: 2px solid white;
        }

        .timeline-node-content-card {
          background-color: #FAFAFA;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 16px;
        }

        .node-card-header {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .node-card-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .node-logged-by {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .node-time {
          color: var(--text-secondary);
        }

        .node-summary {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
          line-height: 1.45;
        }

        .node-meta-row {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px dashed var(--border-color);
        }

        .highlight-next-text {
          color: var(--primary-red);
          font-weight: 600;
        }

        .contact-info-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contact-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .contact-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .contact-value-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .contact-value-bold {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .whatsapp-link {
          color: #25D366;
          font-weight: 600;
          text-decoration: underline;
        }

        .inspections-sub-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .inspection-sub-item-card {
          background-color: #FAFAFA;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 12px;
        }

        .ins-sub-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .ins-sub-estate {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .ins-sub-details {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .ins-sub-report {
          font-size: 12px;
          background-color: white;
          padding: 6px;
          border-radius: var(--radius-xs);
          border: 1px solid var(--border-color);
        }

        .reassign-controls {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 10px;
        }

        .alert-content-warning {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
          color: #B54708;
          font-size: 14px;
        }

        .alert-icon-yellow {
          color: #D46B08;
        }

        .empty-activities-timeline,
        .empty-sub-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 40px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 13px;
        }

        .timeline-placeholder-icon {
          color: var(--text-placeholder);
        }

        .badge-hollow {
          background-color: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }

        .lead-profile-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 48px 24px;
        }

        @media (max-width: 1024px) {
          .profile-body-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .next-action-prompt-card {
            grid-template-columns: 1fr;
          }
          .profile-header-card {
            flex-direction: column;
            align-items: stretch;
            gap: 20px;
          }
          .profile-header-right {
            flex-wrap: wrap;
          }
          .profile-header-right .btn {
            flex: 1;
          }
          .print-document-container {
            padding: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
