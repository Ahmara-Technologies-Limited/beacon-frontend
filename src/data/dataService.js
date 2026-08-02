// Facade over the data layer. Views should call dataService.* instead of
// importing `db` from mockData.js directly (for the four entities that have
// real backend endpoints: leads, users, inspections, activities).
//
// In demo mode (default), every method delegates to the existing mock `db.*`
// methods, wrapped in Promise.resolve so callers can always `await`.
//
// In live mode, methods call the real Django API via apiClient and translate
// field names between the UI (mock/camelCase) shape and the API
// (snake_case / FK) shape, in both directions.
//
// Phase 2 added live endpoints for properties, notifications, settings,
// audit logs, and finance (payment plans/installments/discounts/
// commissions/refunds) - see INTEGRATION_STATUS.md for details.

import { db } from './mockData';
import { isDemoMode } from '../lib/demoMode';
import { apiGet, apiPost, apiPatch, apiDelete, setTokens, clearTokens } from '../lib/apiClient';

/* ------------------------------------------------------------------ */
/* Field mapping helpers                                               */
/* ------------------------------------------------------------------ */

// ---- User ----
const userFromApi = (u) => {
  if (!u) return u;
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    role: u.role,
    status: u.is_active ? 'Active' : 'Inactive',
    phone: u.phone_number,
    dateAdded: u.date_joined,
    _raw: u,
  };
};

const userToApi = (u) => {
  const payload = {};
  if (u.email !== undefined) payload.email = u.email;
  if (u.phone !== undefined) payload.phone_number = u.phone;
  if (u.role !== undefined) payload.role = u.role;
  if (u.status !== undefined) payload.is_active = u.status === 'Active';
  // NOTE: there is no write field for name/password on this serializer.
  // See INTEGRATION_STATUS.md for the gap.
  return payload;
};

// ---- Lead ----
const closerIdFromApi = (assignedCloser) => {
  if (!assignedCloser) return null;
  return typeof assignedCloser === 'object' ? assignedCloser.id : assignedCloser;
};

const leadFromApi = (l) => {
  if (!l) return l;
  return {
    id: l.id,
    name: l.name,
    phone: l.phone,
    whatsapp: l.whatsapp,
    email: l.email,
    location: l.location,
    source: l.source,
    category: l.category,
    stage: l.stage,
    temperature: l.temperature,
    assignedCloserId: closerIdFromApi(l.assigned_closer),
    branch: l.branch,
    budget: l.budget,
    propertyInterest: l.property_interest,
    nextAction: l.next_action,
    followUpDate: l.follow_up_date,
    lastActivityDate: l.last_activity_date,
    dateCreated: l.created_on,
    status: l.is_active === false ? 'Archived' : (l.status || 'Active'),
    is_active: l.is_active,
    relationshipStatus: l.relationship_status,
    referralStatus: l.referral_status,
    satisfactionScore: l.satisfaction_score,
    referralCount: l.referral_count,
    lastContactDate: l.last_contact_date,
    referredById: l.referred_by,
    _raw: l,
  };
};

const leadToApi = (l) => {
  const payload = {};
  if (l.name !== undefined) payload.name = l.name;
  if (l.phone !== undefined) payload.phone = l.phone;
  if (l.whatsapp !== undefined) payload.whatsapp = l.whatsapp;
  if (l.email !== undefined) payload.email = l.email;
  if (l.location !== undefined) payload.location = l.location;
  if (l.source !== undefined) payload.source = l.source;
  if (l.category !== undefined) payload.category = l.category;
  if (l.stage !== undefined) payload.stage = l.stage;
  if (l.temperature !== undefined) payload.temperature = l.temperature;
  if (l.assignedCloserId !== undefined) payload.assigned_closer = l.assignedCloserId;
  if (l.branch !== undefined) payload.branch = l.branch;
  if (l.budget !== undefined) {
    // UI may pass a formatted Naira string; strip to a plain number for the API.
    const numeric = typeof l.budget === 'string' ? Number(l.budget.replace(/[^\d.]/g, '')) : l.budget;
    payload.budget = Number.isFinite(numeric) ? numeric : l.budget;
  }
  if (l.propertyInterest !== undefined) payload.property_interest = l.propertyInterest;
  if (l.nextAction !== undefined) payload.next_action = l.nextAction;
  if (l.followUpDate !== undefined) payload.follow_up_date = l.followUpDate;
  if (l.relationshipStatus !== undefined) payload.relationship_status = l.relationshipStatus;
  if (l.referralStatus !== undefined) payload.referral_status = l.referralStatus;
  if (l.satisfactionScore !== undefined) payload.satisfaction_score = l.satisfactionScore;
  if (l.referralCount !== undefined) payload.referral_count = l.referralCount;
  if (l.lastContactDate !== undefined) payload.last_contact_date = l.lastContactDate;
  if (l.referredById !== undefined) payload.referred_by = l.referredById;
  return payload;
};

// ---- Inspection ----
const inspectionFromApi = (i) => {
  if (!i) return i;
  let date = '';
  let time = '';
  if (i.scheduled_datetime) {
    const dt = new Date(i.scheduled_datetime);
    date = dt.toISOString().split('T')[0];
    time = dt.toISOString().split('T')[1]?.slice(0, 5) || '';
  }
  return {
    id: i.id,
    leadId: typeof i.lead === 'object' ? i.lead?.id : i.lead,
    estate: i.estate,
    date,
    time,
    meetingPoint: i.meeting_point,
    assignedCloserId: closerIdFromApi(i.assigned_closer),
    inspectionOfficerId: closerIdFromApi(i.inspection_officer),
    status: i.status,
    internalNotes: i.internal_notes,
    createdBy: i.created_by,
    createdDate: i.created_on,
    report: i.report,
    feedback: i.feedback,
    nextStepRecommendation: i.next_step_recommendation,
    noShowNote: i.no_show_note,
    photos: i.photos,
    _raw: i,
  };
};

const inspectionToApi = (i) => {
  const payload = {};
  if (i.leadId !== undefined) payload.lead = i.leadId;
  if (i.estate !== undefined) payload.estate = i.estate;
  if (i.date !== undefined || i.time !== undefined) {
    const date = i.date || (i._raw?.scheduled_datetime ? new Date(i._raw.scheduled_datetime).toISOString().split('T')[0] : '');
    const time = i.time || '00:00';
    if (date) payload.scheduled_datetime = new Date(`${date}T${time}:00`).toISOString();
  }
  if (i.meetingPoint !== undefined) payload.meeting_point = i.meetingPoint;
  if (i.assignedCloserId !== undefined) payload.assigned_closer = i.assignedCloserId;
  if (i.inspectionOfficerId !== undefined) payload.inspection_officer = i.inspectionOfficerId;
  if (i.status !== undefined) payload.status = i.status;
  if (i.internalNotes !== undefined) payload.internal_notes = i.internalNotes;
  if (i.report !== undefined) payload.report = i.report;
  if (i.feedback !== undefined) payload.feedback = i.feedback;
  if (i.nextStepRecommendation !== undefined) payload.next_step_recommendation = i.nextStepRecommendation;
  if (i.noShowNote !== undefined) payload.no_show_note = i.noShowNote;
  if (i.photos !== undefined) payload.photos = i.photos;
  return payload;
};

// ---- Activity ----
const activityFromApi = (a) => {
  if (!a) return a;
  return {
    id: a.id,
    leadId: typeof a.lead === 'object' ? a.lead?.id : a.lead,
    date: a.created_on,
    type: a.type,
    summary: a.summary,
    objections: a.objections,
    feedback: a.feedback,
    nextStep: a.next_step,
    loggedBy: a.logged_by_name || a.logged_by,
    _raw: a,
  };
};

const activityToApi = (a) => {
  const payload = {};
  if (a.leadId !== undefined) payload.lead = a.leadId;
  if (a.type !== undefined) payload.type = a.type;
  if (a.summary !== undefined) payload.summary = a.summary;
  if (a.objections !== undefined) payload.objections = a.objections;
  if (a.feedback !== undefined) payload.feedback = a.feedback;
  if (a.nextStep !== undefined) payload.next_step = a.nextStep;
  // logged_by is set server-side from the authenticated user - never sent.
  return payload;
};

// ---- Property ----
const propertyFromApi = (p) => {
  if (!p) return p;
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    location: p.location,
    totalUnits: p.total_units,
    availableUnits: p.available_units,
    price: p.price,
    status: p.status,
    description: p.description,
    amenities: p.amenities || [],
    _raw: p,
  };
};

const propertyToApi = (p) => {
  const payload = {};
  if (p.name !== undefined) payload.name = p.name;
  if (p.type !== undefined) payload.type = p.type;
  if (p.location !== undefined) payload.location = p.location;
  if (p.totalUnits !== undefined) payload.total_units = p.totalUnits;
  if (p.availableUnits !== undefined) payload.available_units = p.availableUnits;
  if (p.price !== undefined) payload.price = p.price;
  if (p.status !== undefined) payload.status = p.status;
  if (p.description !== undefined) payload.description = p.description;
  if (p.amenities !== undefined) payload.amenities = p.amenities;
  return payload;
};

// ---- Notification ----
const notificationFromApi = (n) => {
  if (!n) return n;
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    timestamp: n.timestamp,
    read: n.read,
    link: n.link,
    _raw: n,
  };
};

// ---- Settings ----
const settingsFromApi = (s) => {
  if (!s) return s;
  return {
    contactHoursLimit: s.contact_hours_limit,
    dormancyDaysThreshold: s.dormancy_days_threshold,
    inspectionConfirmationHours: s.inspection_confirmation_hours,
    remindersTiming: s.reminders_timing,
    _raw: s,
  };
};

const settingsToApi = (s) => {
  const payload = {};
  if (s.contactHoursLimit !== undefined) payload.contact_hours_limit = s.contactHoursLimit;
  if (s.dormancyDaysThreshold !== undefined) payload.dormancy_days_threshold = s.dormancyDaysThreshold;
  if (s.inspectionConfirmationHours !== undefined) payload.inspection_confirmation_hours = s.inspectionConfirmationHours;
  if (s.remindersTiming !== undefined) payload.reminders_timing = s.remindersTiming;
  return payload;
};

// ---- Audit log ----
const auditLogFromApi = (a) => {
  if (!a) return a;
  return {
    id: a.id,
    timestamp: a.timestamp,
    user: a.user_name || a.user,
    action: a.action,
    ipAddress: a.ip_address,
    _raw: a,
  };
};

// ---- Finance: PaymentPlan / Installment ----
const installmentFromApi = (i) => {
  if (!i) return i;
  return {
    id: i.id,
    index: i.index,
    amount: i.amount,
    dueDate: i.due_date ? String(i.due_date).split('T')[0] : i.due_date,
    status: i.status,
  };
};

const installmentToApi = (i) => {
  const payload = {};
  if (i.index !== undefined) payload.index = i.index;
  if (i.amount !== undefined) payload.amount = i.amount;
  if (i.dueDate !== undefined) payload.due_date = i.dueDate;
  if (i.status !== undefined) payload.status = i.status;
  return payload;
};

const paymentPlanFromApi = (p) => {
  if (!p) return p;
  return {
    id: p.id,
    leadId: typeof p.lead === 'object' ? p.lead?.id : p.lead,
    regularPrice: p.regular_price,
    discountAmount: p.discount_amount,
    authCode: p.auth_code,
    netPrice: p.net_price,
    depositPaid: p.deposit_paid,
    balance: p.balance,
    durationMonths: p.duration_months,
    installmentVal: p.installment_val,
    installmentsList: (p.installments || []).map(installmentFromApi),
    dateCreated: p.created_on,
    _raw: p,
  };
};

// ---- Finance: DiscountRecord / Commission / RefundRequest ----
const discountFromApi = (d) => {
  if (!d) return d;
  return {
    id: d.id,
    leadId: typeof d.lead === 'object' ? d.lead?.id : d.lead,
    clientName: d.client_name,
    propertyName: d.property_name,
    regularPrice: d.regular_price,
    discountAmount: d.discount_amount,
    netPrice: d.net_price,
    authCode: d.auth_code,
    dateIssued: d.date_issued,
    _raw: d,
  };
};

const discountToApi = (d) => {
  const payload = {};
  if (d.leadId !== undefined) payload.lead = d.leadId;
  if (d.propertyName !== undefined) payload.property_name = d.propertyName;
  if (d.regularPrice !== undefined) payload.regular_price = d.regularPrice;
  if (d.discountAmount !== undefined) payload.discount_amount = d.discountAmount;
  if (d.netPrice !== undefined) payload.net_price = d.netPrice;
  if (d.authCode !== undefined) payload.auth_code = d.authCode;
  return payload;
};

const commissionFromApi = (c) => {
  if (!c) return c;
  return {
    id: c.id,
    leadId: typeof c.lead === 'object' ? c.lead?.id : c.lead,
    clientName: c.client_name,
    closerId: typeof c.closer === 'object' ? c.closer?.id : c.closer,
    closerName: c.closer_name,
    propertyName: c.property_name,
    totalSaleVal: c.total_sale_val,
    paidAmount: c.paid_amount,
    commissionVal: c.commission_val,
    scheduledDate: c.scheduled_date,
    status: c.status,
    _raw: c,
  };
};

const commissionToApi = (c) => {
  const payload = {};
  if (c.leadId !== undefined) payload.lead = c.leadId;
  if (c.closerId !== undefined) payload.closer = c.closerId;
  if (c.propertyName !== undefined) payload.property_name = c.propertyName;
  if (c.totalSaleVal !== undefined) payload.total_sale_val = c.totalSaleVal;
  if (c.paidAmount !== undefined) payload.paid_amount = c.paidAmount;
  if (c.commissionVal !== undefined) payload.commission_val = c.commissionVal;
  if (c.scheduledDate !== undefined) payload.scheduled_date = c.scheduledDate;
  if (c.status !== undefined) payload.status = c.status;
  return payload;
};

const refundFromApi = (r) => {
  if (!r) return r;
  return {
    id: r.id,
    leadId: typeof r.lead === 'object' ? r.lead?.id : r.lead,
    clientName: r.client_name,
    propertyInterest: r.property_interest,
    amount: r.amount,
    reason: r.reason,
    letterText: r.letter_text,
    fileName: r.file_name,
    fileSize: r.file_size,
    dateRequested: r.date_requested,
    status: r.status,
    _raw: r,
  };
};

const refundToApi = (r) => {
  const payload = {};
  if (r.leadId !== undefined) payload.lead = r.leadId;
  if (r.amount !== undefined) payload.amount = r.amount;
  if (r.reason !== undefined) payload.reason = r.reason;
  if (r.letterText !== undefined) payload.letter_text = r.letterText;
  if (r.fileName !== undefined) payload.file_name = r.fileName;
  if (r.fileSize !== undefined) payload.file_size = r.fileSize;
  if (r.status !== undefined) payload.status = r.status;
  return payload;
};

const paymentPlanToApi = (p) => {
  const payload = {};
  if (p.leadId !== undefined) payload.lead = p.leadId;
  if (p.regularPrice !== undefined) payload.regular_price = p.regularPrice;
  if (p.discountAmount !== undefined) payload.discount_amount = p.discountAmount;
  if (p.authCode !== undefined) payload.auth_code = p.authCode;
  if (p.netPrice !== undefined) payload.net_price = p.netPrice;
  if (p.depositPaid !== undefined) payload.deposit_paid = p.depositPaid;
  if (p.balance !== undefined) payload.balance = p.balance;
  if (p.durationMonths !== undefined) payload.duration_months = p.durationMonths;
  if (p.installmentVal !== undefined) payload.installment_val = p.installmentVal;
  if (p.installmentsList !== undefined) {
    payload.installments = p.installmentsList.map(installmentToApi);
  }
  return payload;
};

/* ------------------------------------------------------------------ */
/* Facade                                                              */
/* ------------------------------------------------------------------ */

export const dataService = {
  /* ---- Auth ---- */
  login: async (email, password) => {
    if (isDemoMode()) {
      // Demo mode "login" is really the role-switcher: caller passes a
      // pre-existing mock user object rather than credentials. Support both
      // call shapes for backward compatibility.
      const user = typeof email === 'object' ? email : db.getUsers().find(u => u.email === email);
      if (user) db.setCurrentUser(user);
      return Promise.resolve(user);
    }
    const res = await apiPost('/auth/login/', { email, password });
    setTokens({ access: res.access, refresh: res.refresh });
    return userFromApi(res.user);
  },

  logout: async () => {
    if (isDemoMode()) {
      return Promise.resolve();
    }
    try {
      await apiPost('/auth/logout/');
    } catch {
      // best-effort
    } finally {
      clearTokens();
    }
  },

  getCurrentUserProfile: async () => {
    if (isDemoMode()) {
      return Promise.resolve(db.getCurrentUser());
    }
    const res = await apiGet('/users/me/');
    return userFromApi(res);
  },

  /* ---- Users ---- */
  getUsers: async () => {
    if (isDemoMode()) return Promise.resolve(db.getUsers());
    const res = await apiGet('/users/');
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(userFromApi);
  },

  saveUser: async (user) => {
    if (isDemoMode()) return Promise.resolve(db.saveUser(user));
    const payload = userToApi(user);
    const res = user.id ? await apiPatch(`/users/${user.id}/`, payload) : await apiPost('/users/', payload);
    return userFromApi(res);
  },

  deleteUser: async (id, reassignTo) => {
    if (isDemoMode()) return Promise.resolve(db.deleteUser(id, reassignTo));
    return apiDelete(`/users/${id}/`, reassignTo ? { reassignTo } : undefined);
  },

  /* ---- Leads ---- */
  getLeads: async () => {
    if (isDemoMode()) return Promise.resolve(db.getLeads());
    const res = await apiGet('/leads/');
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(leadFromApi);
  },

  getArchivedLeads: async () => {
    if (isDemoMode()) return Promise.resolve(db.getArchivedLeads());
    const res = await apiGet('/leads/', { is_active: false });
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(leadFromApi);
  },

  saveLead: async (lead) => {
    if (isDemoMode()) return Promise.resolve(db.saveLead(lead));
    const payload = leadToApi(lead);
    const res = lead.id ? await apiPatch(`/leads/${lead.id}/`, payload) : await apiPost('/leads/', payload);
    return leadFromApi(res);
  },

  archiveLead: async (id) => {
    if (isDemoMode()) return Promise.resolve(db.archiveLead(id));
    return apiPost(`/leads/${id}/archive/`);
  },

  restoreLead: async (id) => {
    if (isDemoMode()) return Promise.resolve(db.restoreLead(id));
    return apiPost(`/leads/${id}/restore/`);
  },

  /* ---- Inspections ---- */
  getInspections: async (leadId) => {
    if (isDemoMode()) {
      const all = db.getInspections();
      return Promise.resolve(leadId ? all.filter(i => i.leadId === leadId) : all);
    }
    const res = await apiGet('/inspections/', leadId ? { lead: leadId } : undefined);
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(inspectionFromApi);
  },

  saveInspection: async (inspection) => {
    if (isDemoMode()) return Promise.resolve(db.saveInspection(inspection));
    const payload = inspectionToApi(inspection);
    const res = inspection.id
      ? await apiPatch(`/inspections/${inspection.id}/`, payload)
      : await apiPost('/inspections/', payload);
    return inspectionFromApi(res);
  },

  /* ---- Activities ---- */
  getActivities: async (leadId) => {
    if (isDemoMode()) {
      const all = db.getActivities();
      return Promise.resolve(leadId ? all.filter(a => a.leadId === leadId) : all);
    }
    const res = await apiGet('/activities/', leadId ? { lead: leadId } : undefined);
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(activityFromApi);
  },

  saveActivity: async (activity) => {
    if (isDemoMode()) return Promise.resolve(db.saveActivity(activity));
    const payload = activityToApi(activity);
    const res = await apiPost('/activities/', payload);
    return activityFromApi(res);
  },

  /* ---- Notifications ---- */
  // NOTE: demo mode also synthesizes client-side "payment due" reminder
  // notifications from lead.paymentPlan (see db.getNotifications in
  // mockData.js) - the live backend does not do this yet (see
  // INTEGRATION_STATUS.md gap notes).
  getNotifications: async () => {
    if (isDemoMode()) return Promise.resolve(db.getNotifications());
    const res = await apiGet('/notifications/');
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(notificationFromApi);
  },

  addNotification: (n) => Promise.resolve(db.addNotification(n)), // demo-only; backend creates notifications server-side

  markNotificationRead: async (id) => {
    if (isDemoMode()) return Promise.resolve(db.markNotificationRead(id));
    return apiPost(`/notifications/${id}/read/`);
  },

  dismissNotification: async (id) => {
    if (isDemoMode()) return Promise.resolve(db.dismissNotification(id));
    return apiPost(`/notifications/${id}/dismiss/`);
  },

  dismissAllNotifications: async () => {
    if (isDemoMode()) return Promise.resolve(db.dismissAllNotifications());
    return apiPost('/notifications/dismiss-all/');
  },

  markAllNotificationsRead: async () => {
    if (isDemoMode()) return Promise.resolve(db.markAllNotificationsRead());
    return apiPost('/notifications/mark-all-read/');
  },

  /* ---- Properties ---- */
  getProperties: async () => {
    if (isDemoMode()) return Promise.resolve(db.getProperties());
    const res = await apiGet('/properties/');
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(propertyFromApi);
  },

  saveProperty: async (property) => {
    if (isDemoMode()) return Promise.resolve(db.saveProperty(property));
    const payload = propertyToApi(property);
    const res = property.id
      ? await apiPatch(`/properties/${property.id}/`, payload)
      : await apiPost('/properties/', payload);
    return propertyFromApi(res);
  },

  deleteProperty: async (id) => {
    if (isDemoMode()) return Promise.resolve(db.deleteProperty(id));
    return apiDelete(`/properties/${id}/`);
  },

  /* ---- Settings ---- */
  getSettings: async () => {
    if (isDemoMode()) return Promise.resolve(db.getSettings());
    const res = await apiGet('/settings/');
    return settingsFromApi(res);
  },

  saveSettings: async (settings) => {
    if (isDemoMode()) return Promise.resolve(db.saveSettings(settings));
    const payload = settingsToApi(settings);
    const res = await apiPatch('/settings/', payload);
    return settingsFromApi(res);
  },

  /* ---- Audit log ---- */
  getAuditLogs: async () => {
    if (isDemoMode()) return Promise.resolve(db.getAuditLogs());
    const res = await apiGet('/audit-logs/');
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(auditLogFromApi);
  },

  clearAuditLogs: async () => {
    if (isDemoMode()) return Promise.resolve(db.clearAuditLogs());
    return apiDelete('/audit-logs/clear/');
  },

  logAudit: (msg) => Promise.resolve(db.logAudit(msg)), // demo-only; backend logs audit entries server-side

  /* ---- Finance: payment plans / installments ---- */
  getPaymentPlan: async (leadId) => {
    if (isDemoMode()) {
      const lead = db.getLeads().find(l => l.id === leadId) || db.getArchivedLeads?.().find(l => l.id === leadId);
      return Promise.resolve(lead?.paymentPlan || null);
    }
    const res = await apiGet('/finance/payment-plans/', { lead: leadId });
    const list = Array.isArray(res) ? res : res.results || [];
    return list.length ? paymentPlanFromApi(list[0]) : null;
  },

  savePaymentPlan: async (leadId, plan, { stage } = {}) => {
    if (isDemoMode()) {
      // Demo mode keeps the payment plan embedded on the lead object. The
      // branching lives here so callers (LeadProfile.jsx, DocOfficerHub.jsx)
      // have a single call path regardless of mode.
      const allLeads = [...db.getLeads(), ...(db.getArchivedLeads?.() || [])];
      const lead = allLeads.find(l => l.id === leadId);
      if (!lead) return Promise.resolve(plan);
      const updatedLead = { ...lead, paymentPlan: plan, ...(stage ? { stage } : {}) };
      db.saveLead(updatedLead);
      return Promise.resolve(plan);
    }
    const payload = paymentPlanToApi({ ...plan, leadId });
    const res = plan.id
      ? await apiPatch(`/finance/payment-plans/${plan.id}/`, payload)
      : await apiPost('/finance/payment-plans/', payload);
    return paymentPlanFromApi(res);
  },

  updateInstallment: async (leadId, installmentRef, updates) => {
    if (isDemoMode()) {
      // Demo mode mutates lead.paymentPlan.installmentsList directly, keyed
      // by installment `index` (installmentRef), then persists via saveLead.
      const allLeads = [...db.getLeads(), ...(db.getArchivedLeads?.() || [])];
      const lead = allLeads.find(l => l.id === leadId);
      if (!lead || !lead.paymentPlan) return Promise.resolve(updates);
      const payPlan = { ...lead.paymentPlan, installmentsList: [...lead.paymentPlan.installmentsList] };
      const idx = payPlan.installmentsList.findIndex(item => item.index === installmentRef);
      if (idx !== -1) {
        payPlan.installmentsList[idx] = { ...payPlan.installmentsList[idx], ...updates };
      }
      if (updates.balance !== undefined) payPlan.balance = updates.balance;
      const updatedLead = { ...lead, paymentPlan: payPlan, ...(updates.stage ? { stage: updates.stage } : {}) };
      db.saveLead(updatedLead);
      return Promise.resolve(updates);
    }
    const payload = installmentToApi(updates);
    const res = await apiPatch(`/finance/installments/${installmentRef}/`, payload);
    // The installment endpoint only owns per-installment fields; the running
    // plan balance and lead stage live on their own resources, so patch them
    // too when the caller passed those alongside the installment update.
    if (updates.balance !== undefined && leadId != null) {
      const plans = await apiGet('/finance/payment-plans/', { lead: leadId });
      const list = Array.isArray(plans) ? plans : plans.results || [];
      if (list.length) {
        await apiPatch(`/finance/payment-plans/${list[0].id}/`, { balance: updates.balance });
      }
    }
    if (updates.stage && leadId != null) {
      await apiPatch(`/leads/${leadId}/`, { stage: updates.stage });
    }
    return installmentFromApi(res);
  },

  /* ---- Finance: discounts / commissions / refunds ledgers ---- */
  // Demo mode keeps the same localStorage-backed shapes used previously
  // directly in LeadProfile.jsx/DocOfficerHub.jsx (keys 'beacon_discounts',
  // 'beacon_commissions', 'beacon_refunds') so demo-mode behavior is
  // unchanged - just centralized here behind the dataService facade.
  getDiscounts: async (leadId) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_discounts')) || [];
      return Promise.resolve(leadId ? all.filter(d => d.leadId === leadId) : all);
    }
    const res = await apiGet('/finance/discounts/', leadId ? { lead: leadId } : undefined);
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(discountFromApi);
  },

  createDiscount: async (discount) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_discounts')) || [];
      const record = { id: 'disc-' + Date.now(), ...discount };
      all.push(record);
      localStorage.setItem('beacon_discounts', JSON.stringify(all));
      return Promise.resolve(record);
    }
    const payload = discountToApi(discount);
    const res = await apiPost('/finance/discounts/', payload);
    return discountFromApi(res);
  },

  getCommissions: async ({ leadId, closerId } = {}) => {
    if (isDemoMode()) {
      let all = JSON.parse(localStorage.getItem('beacon_commissions')) || [];
      if (leadId) all = all.filter(c => c.leadId === leadId);
      if (closerId) all = all.filter(c => c.closerId === closerId);
      return Promise.resolve(all);
    }
    const params = {};
    if (leadId) params.lead = leadId;
    if (closerId) params.closer = closerId;
    const res = await apiGet('/finance/commissions/', Object.keys(params).length ? params : undefined);
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(commissionFromApi);
  },

  createCommission: async (commission) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_commissions')) || [];
      const record = { id: 'comm-' + Date.now(), ...commission };
      all.push(record);
      localStorage.setItem('beacon_commissions', JSON.stringify(all));
      return Promise.resolve(record);
    }
    const payload = commissionToApi(commission);
    const res = await apiPost('/finance/commissions/', payload);
    return commissionFromApi(res);
  },

  updateCommissionStatus: async (id, status) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_commissions')) || [];
      const updated = all.map(c => (c.id === id ? { ...c, status } : c));
      localStorage.setItem('beacon_commissions', JSON.stringify(updated));
      return Promise.resolve(updated.find(c => c.id === id));
    }
    const res = await apiPatch(`/finance/commissions/${id}/`, { status });
    return commissionFromApi(res);
  },

  getRefunds: async (leadId) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_refunds')) || [];
      return Promise.resolve(leadId ? all.filter(r => r.leadId === leadId) : all);
    }
    const res = await apiGet('/finance/refunds/', leadId ? { lead: leadId } : undefined);
    const list = Array.isArray(res) ? res : res.results || [];
    return list.map(refundFromApi);
  },

  createRefundRequest: async (refund) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_refunds')) || [];
      const record = { id: 'ref-' + Date.now(), status: 'Pending Review', ...refund };
      all.unshift(record);
      localStorage.setItem('beacon_refunds', JSON.stringify(all));
      return Promise.resolve(record);
    }
    const payload = refundToApi(refund);
    const res = await apiPost('/finance/refunds/', payload);
    return refundFromApi(res);
  },

  updateRefundStatus: async (id, status) => {
    if (isDemoMode()) {
      const all = JSON.parse(localStorage.getItem('beacon_refunds')) || [];
      const updated = all.map(r => (r.id === id ? { ...r, status } : r));
      localStorage.setItem('beacon_refunds', JSON.stringify(updated));
      return Promise.resolve(updated.find(r => r.id === id));
    }
    const res = await apiPatch(`/finance/refunds/${id}/`, { status });
    return refundFromApi(res);
  },
};
