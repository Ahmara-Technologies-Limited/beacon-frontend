export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(num);
};

export const parseBudgetNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const digits = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(digits);
  return Number.isFinite(num) ? num : 0;
};

export const formatBudget = (val) => {
  if (val === null || val === undefined || val === '') return '---';
  return formatCurrency(parseBudgetNumber(val));
};

// Fields like followUpDate, lastActivityDate, and lastContactDate are
// genuine datetimes (a follow-up scheduled for 3pm is not the same as one
// scheduled for 9am), but many tables were formatting them with
// .toLocaleDateString() alone, silently dropping the time. Use this
// wherever a table/list shows one of those fields.
export const formatDateTime = (val) => {
  if (!val) return '---';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

// For fields that are genuinely date-only (no time component collected),
// e.g. a discount's dateIssued.
export const formatDate = (val) => {
  if (!val) return '---';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '---';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};
