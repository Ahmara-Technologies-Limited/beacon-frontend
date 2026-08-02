import React, { useState, useEffect } from 'react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { DollarSign, FileText, CheckCircle, Clock, Plus, Upload, Trash2, X, FileMinus, ArrowUpRight, Clipboard } from 'lucide-react';

export default function DocOfficerHub({ currentUser }) {
  const [activeSubTab, setActiveSubTab] = useState('accounts');
  const [refunds, setRefunds] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Refund Request Form Modal
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundData, setRefundData] = useState({
    leadId: '',
    amount: '',
    reason: '',
    letterText: '',
    fileName: '',
    fileSize: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const loadHubData = async () => {
    // Read from database
    setLeads(db.getLeads());
    setUsers(db.getUsers());

    // Ledgers now go through dataService (demo mode: localStorage parity,
    // live mode: real /finance/discounts|commissions|refunds/ endpoints).
    const [savedRefunds, savedCommissions, savedDiscounts] = await Promise.all([
      dataService.getRefunds(),
      dataService.getCommissions(),
      dataService.getDiscounts(),
    ]);

    setRefunds(savedRefunds);
    setCommissions(savedCommissions);
    setDiscounts(savedDiscounts);
  };

  useEffect(() => {
    loadHubData();
    // NOTE: 2s polling is a crude "live update" mechanism kept for parity
    // with the previous localStorage-polling behavior (still needed in
    // demo mode). In live mode this just re-fetches the same endpoints on
    // an interval - a future improvement would replace this with
    // websockets/SSE push updates instead of polling.
    const interval = setInterval(loadHubData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    setRefundData(prev => ({ ...prev, fileName: file.name, fileSize: (file.size / 1024).toFixed(1) + ' KB' }));
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  const handleCreateRefundRequest = async () => {
    const errs = {};
    if (!refundData.leadId) errs.leadId = "Select a client first.";
    if (!refundData.amount || isNaN(Number(refundData.amount)) || Number(refundData.amount) <= 0) {
      errs.amount = "Enter a valid positive refund amount.";
    }
    if (!refundData.reason.trim()) errs.reason = "Refund reason is required.";

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const lead = leads.find(l => l.id === refundData.leadId);

    const newRefund = await dataService.createRefundRequest({
      leadId: refundData.leadId,
      clientName: lead?.name || 'Unknown Client',
      propertyInterest: lead?.propertyInterest || 'N/A',
      amount: Number(refundData.amount),
      reason: refundData.reason.trim(),
      letterText: refundData.letterText.trim(),
      fileName: refundData.fileName,
      fileSize: refundData.fileSize,
      dateRequested: new Date().toISOString().split('T')[0],
      status: 'Pending Review' // Pending Review, Approved, Paid
    });

    setRefunds(prev => [newRefund, ...prev]);
    db.logAudit(`Refund request for ${formatPrice(newRefund.amount)} logged for client ${newRefund.clientName}.`); // demo-only; live mode logs server-side via AuditLogMixin

    setRefundModalOpen(false);
    setRefundData({ leadId: '', amount: '', reason: '', letterText: '', fileName: '', fileSize: '' });
  };

  const handleUpdateRefundStatus = async (id, newStatus) => {
    const target = refunds.find(r => r.id === id);
    await dataService.updateRefundStatus(id, newStatus);
    if (target) db.logAudit(`Refund request status updated to ${newStatus} for ${target.clientName}.`); // demo-only; live mode logs server-side
    setRefunds(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const handleUpdateCommissionStatus = async (id, newStatus) => {
    const target = commissions.find(c => c.id === id);
    await dataService.updateCommissionStatus(id, newStatus);
    if (target) db.logAudit(`Commission payout status updated to ${newStatus} for closer ${target.closerName}.`); // demo-only; live mode logs server-side
    setCommissions(prev => prev.map(c => (c.id === id ? { ...c, status: newStatus } : c)));
  };

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  const activePlans = leads.filter(l => l.paymentPlan);
  const reminders = [];
  const today = new Date();

  activePlans.forEach(lead => {
    if (lead.paymentPlan && lead.paymentPlan.installmentsList) {
      lead.paymentPlan.installmentsList.forEach(inst => {
        if (inst.status === 'Pending') {
          const dueDate = new Date(inst.dueDate);
          const timeDiff = dueDate - today;
          const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 14) {
            reminders.push({
              leadId: lead.id,
              clientName: lead.name,
              property: lead.propertyInterest || 'N/A',
              installmentIndex: inst.index,
              amount: inst.amount,
              dueDate: inst.dueDate,
              daysDiff: daysDiff,
              isOverdue: daysDiff < 0
            });
          }
        }
      });
    }
  });

  reminders.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return (
    <div className="doc-officer-hub">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Legal & Finance Hub</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Legal & Finance Hub</h1>
          <p className="page-subtitle">Unified accounts management, Closer commissions payouts, and customer refund requests.</p>
        </div>
      </div>

      {/* Hub Tabs Bar */}
      <div className="hub-tabs-container card" style={{ display: 'flex', gap: '8px', padding: '12px 16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button 
          className={`btn btn-sm ${activeSubTab === 'accounts' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSubTab('accounts')}
        >
          <Clipboard size={15} />
          <span>Payment Plans & Accounts ({activePlans.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${activeSubTab === 'refunds' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSubTab('refunds')}
        >
          <FileMinus size={15} />
          <span>Refund Requests ({refunds.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${activeSubTab === 'commissions' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSubTab('commissions')}
        >
          <DollarSign size={15} />
          <span>Closer Commissions ({commissions.length})</span>
        </button>

        <button 
          className={`btn btn-sm ${activeSubTab === 'discounts' ? 'btn-primary' : ''}`}
          onClick={() => setActiveSubTab('discounts')}
        >
          <FileText size={15} />
          <span>Discounts Log ({discounts.length})</span>
        </button>
      </div>

      {/* Accounts Tab */}
      {activeSubTab === 'accounts' && (
        <div className="hub-panel animate-slide">
          {/* Due date reminders */}
          <div className="card" style={{ padding: '20px', border: '1px solid #FDA29B', backgroundColor: '#FEF3F2', marginBottom: '24px' }}>
            <h3 className="section-title" style={{ color: '#B42318', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={18} />
              <span>Automated Due Date Reminders ({reminders.length})</span>
            </h3>
            {reminders.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#667085', margin: 0 }}>No upcoming payment deadlines or overdue installments detected.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {reminders.map((rem, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '6px', border: `1px solid ${rem.isOverdue ? '#FDA29B' : '#FFE4E6'}`, boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge ${rem.isOverdue ? 'badge-hot' : 'badge-cold'}`} style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                        {rem.isOverdue ? 'Overdue' : 'Due Soon'}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        Installment #{rem.installmentIndex} for <strong>{rem.clientName}</strong> ({rem.property}) is {rem.isOverdue ? 'OVERDUE since' : 'due on'} <strong>{rem.dueDate}</strong> {rem.isOverdue ? `(${Math.abs(rem.daysDiff)} days late)` : `(in ${rem.daysDiff} days)`}.
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <strong style={{ fontSize: '14px', color: rem.isOverdue ? 'var(--primary-red)' : 'var(--text-primary)' }}>
                        {formatPrice(rem.amount)}
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Payment Plans Registry */}
          <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Active Payment Plans & Allocations</h3>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Property Listing</th>
                  <th>Total Agreed Net</th>
                  <th>Paid to Date</th>
                  <th>Outstanding Balance</th>
                  <th>Duration</th>
                  <th>Next Due Installment</th>
                  <th>Payment Progress</th>
                </tr>
              </thead>
              <tbody>
                {activePlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-table-state">No clients currently on structured payment plans.</td>
                  </tr>
                ) : (
                  activePlans.map(lead => {
                    const plan = lead.paymentPlan;
                    const paidAmt = plan.depositPaid + plan.installmentsList.filter(inst => inst.status === 'Paid').reduce((acc, inst) => acc + inst.amount, 0);
                    const nextPending = plan.installmentsList.find(inst => inst.status === 'Pending');
                    const progressPercent = Math.round((paidAmt / plan.netPrice) * 100);
                    
                    return (
                      <tr key={lead.id}>
                        <td className="lead-name-cell" style={{ fontWeight: 600 }}>{lead.name}</td>
                        <td>{lead.propertyInterest}</td>
                        <td style={{ fontWeight: 600 }}>{formatPrice(plan.netPrice)}</td>
                        <td style={{ color: 'var(--color-success-text)', fontWeight: 600 }}>{formatPrice(paidAmt)}</td>
                        <td style={{ color: plan.balance > 0 ? 'var(--primary-red)' : 'var(--color-success-text)', fontWeight: 600 }}>
                          {formatPrice(plan.balance)}
                        </td>
                        <td>{plan.durationMonths} Months</td>
                        <td>
                          {nextPending ? (
                            <div style={{ display: 'flex', flexDirection: 'column', fontSize: '12px' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{formatPrice(nextPending.amount)}</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Due: {nextPending.dueDate}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-success-text)', fontWeight: 'bold' }}>Plan Fully Settled</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '80px', height: '6px', background: 'var(--color-grey-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'var(--color-success-text)' : 'var(--primary-red)' }} />
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{progressPercent}%</span>
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
      )}

      {/* refunds Tab */}
      {activeSubTab === 'refunds' && (
        <div className="hub-panel animate-slide">
          <div className="card-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>Refund Requests Registry</h3>
            <button className="btn btn-sm btn-primary" onClick={() => setRefundModalOpen(true)}>
              <Plus size={14} /> Log Refund Request
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Client / Lead</th>
                  <th>Property</th>
                  <th>Refund Amount</th>
                  <th>Date Requested</th>
                  <th>Reason</th>
                  <th>Attachment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-table-state">No refund requests logged.</td>
                  </tr>
                ) : (
                  refunds.map(r => (
                    <tr key={r.id}>
                      <td className="lead-name-cell">{r.clientName}</td>
                      <td>{r.propertyInterest}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-red)' }}>{formatPrice(r.amount)}</td>
                      <td>{r.dateRequested}</td>
                      <td>
                        <span title={r.reason} style={{ display: 'inline-block', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.reason}
                        </span>
                      </td>
                      <td>
                        {r.fileName ? (
                          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '11px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600 }}>{r.fileName}</span>
                            <span>{r.fileSize}</span>
                          </div>
                        ) : '---'}
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === 'Approved' ? 'badge-success' :
                          r.status === 'Paid' ? 'badge-grey' : 'badge-cold'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {r.status === 'Pending Review' && (
                            <button className="btn btn-sm" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }} onClick={() => handleUpdateRefundStatus(r.id, 'Approved')}>
                              Approve
                            </button>
                          )}
                          {r.status === 'Approved' && (
                            <button className="btn btn-sm btn-primary" onClick={() => handleUpdateRefundStatus(r.id, 'Paid')}>
                              Mark Paid
                            </button>
                          )}
                          {r.status === 'Paid' && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Settled</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* commissions Tab */}
      {activeSubTab === 'commissions' && (
        <div className="hub-panel animate-slide">
          <div className="card-header-row" style={{ marginBottom: '16px' }}>
            <h3 className="section-title">Sales Closer Commissions Ledger</h3>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Sales Closer</th>
                  <th>Client / Lead</th>
                  <th>Property</th>
                  <th>Total Sale Val</th>
                  <th>Payment Registered</th>
                  <th>Commission Earned</th>
                  <th>Payout Scheduled</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {commissions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-table-state">No sales commissions recorded yet.</td>
                  </tr>
                ) : (
                  commissions.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700 }}>{c.closerName}</td>
                      <td>{c.clientName}</td>
                      <td>{c.propertyName}</td>
                      <td>{formatPrice(c.totalSaleVal)}</td>
                      <td>{formatPrice(c.paidAmount)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-success-text)' }}>{formatPrice(c.commissionVal)}</td>
                      <td>{c.scheduledDate}</td>
                      <td>
                        <span className={`badge ${
                          c.status === 'Paid' ? 'badge-success' : 'badge-cold'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        {c.status === 'Scheduled' ? (
                          <button className="btn btn-sm btn-primary" onClick={() => handleUpdateCommissionStatus(c.id, 'Paid')}>
                            Mark Paid
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--color-success-text)', fontWeight: 600 }}>Paid Out</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* discounts Tab */}
      {activeSubTab === 'discounts' && (
        <div className="hub-panel animate-slide">
          <div className="card-header-row" style={{ marginBottom: '16px' }}>
            <h3 className="section-title">Client Discounts Approved Registry</h3>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Client / Lead</th>
                  <th>Property Listing</th>
                  <th>Regular Listing Price</th>
                  <th>Discount Deducted</th>
                  <th>Net Sale Price</th>
                  <th>Authorizing Code</th>
                  <th>Date Issued</th>
                </tr>
              </thead>
              <tbody>
                {discounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-table-state">No discount adjustments recorded in database.</td>
                  </tr>
                ) : (
                  discounts.map(d => (
                    <tr key={d.id}>
                      <td className="lead-name-cell">{d.clientName}</td>
                      <td>{d.propertyName}</td>
                      <td>{formatPrice(d.regularPrice)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-red)' }}>{formatPrice(d.discountAmount)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatPrice(d.netPrice)}</td>
                      <td><code>{d.authCode}</code></td>
                      <td>{d.dateIssued}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund Request Modal */}
      {refundModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Log Digital Refund Request</h3>
              <button className="modal-close" onClick={() => setRefundModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Client *</label>
                <select 
                  className="form-control" 
                  value={refundData.leadId} 
                  onChange={e => setRefundData({ ...refundData, leadId: e.target.value })}
                >
                  <option value="">-- Choose Client --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.propertyInterest || 'No property interested'})</option>
                  ))}
                </select>
                {formErrors.leadId && <span className="form-error">{formErrors.leadId}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Refund Amount (NGN) *</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={refundData.amount} 
                  onChange={e => setRefundData({ ...refundData, amount: e.target.value })}
                  placeholder="e.g. 5000000"
                />
                {formErrors.amount && <span className="form-error">{formErrors.amount}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reason for Request *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={refundData.reason} 
                  onChange={e => setRefundData({ ...refundData, reason: e.target.value })}
                  placeholder="e.g. Change of residence location out of country"
                />
                {formErrors.reason && <span className="form-error">{formErrors.reason}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Refund Application Letter Text</label>
                <textarea 
                  className="form-control" 
                  rows="3"
                  value={refundData.letterText} 
                  onChange={e => setRefundData({ ...refundData, letterText: e.target.value })}
                  placeholder="Paste text of the refund letter here..."
                />
              </div>

              {/* Text-to-Upload simulated section */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Supporting Document (Upload Refund Application)</label>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer', position: 'relative' }}>
                  <input 
                    type="file" 
                    onChange={handleSimulateUpload} 
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                  />
                  <Upload size={24} style={{ color: 'var(--text-placeholder)', marginBottom: '8px', margin: '0 auto 8px auto' }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Drag & drop or click to upload</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-placeholder)', margin: 0 }}>PDF, PNG, JPG up to 10MB</p>
                </div>

                {isUploading && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Uploading document...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'var(--color-grey-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary-red)' }} />
                    </div>
                  </div>
                )}

                {refundData.fileName && !isUploading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '8px 12px', background: 'var(--color-grey-bg)', borderRadius: '6px' }}>
                    <FileText size={16} style={{ color: 'var(--primary-red)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{refundData.fileName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{refundData.fileSize}</div>
                    </div>
                    <button className="btn btn-sm" style={{ padding: '2px' }} onClick={() => setRefundData(prev => ({ ...prev, fileName: '', fileSize: '' }))}><X size={14} /></button>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setRefundModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateRefundRequest}>Submit Refund Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
