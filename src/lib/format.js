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

// ---- Local <-> API datetime conversion ----
//
// The API stores instants in UTC. The staff entering them are not in UTC, so
// any conversion has to go through the browser's local timezone or the value
// shifts: an inspection booked for 11:00 WAT was being read back as 10:00,
// because the read path rendered the UTC wall clock (`toISOString()`) instead
// of the local one. Booking one time and telling the client another is about
// as bad as a CRM bug gets, so every datetime crossing this boundary goes
// through these two helpers.
//
// `<input type="date">`, `type="time"` and `type="datetime-local"` all expect
// a *local* wall-clock string with no timezone suffix, which is exactly what
// the to* helpers produce.

const pad = (n) => String(n).padStart(2, '0');

const localParts = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

/** ISO instant -> 'YYYY-MM-DD' in local time, for <input type="date">. */
export const toLocalDateInput = (value) => localParts(value)?.date ?? '';

/** ISO instant -> 'HH:mm' in local time, for <input type="time">. */
export const toLocalTimeInput = (value) => localParts(value)?.time ?? '';

/**
 * ISO instant -> 'YYYY-MM-DDTHH:mm' in local time, for
 * <input type="datetime-local">, which rejects a trailing 'Z' outright and
 * renders blank - which is why editing a lead came up with an empty
 * follow-up date even though one was set.
 */
export const toLocalDateTimeInput = (value) => {
  const parts = localParts(value);
  return parts ? `${parts.date}T${parts.time}` : '';
};

/**
 * A local wall-clock string from one of those inputs -> ISO instant for the
 * API. Sending the naive string instead leaves the backend to assume UTC,
 * which silently shifts the time by the local offset.
 */
export const fromLocalDateTimeInput = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
