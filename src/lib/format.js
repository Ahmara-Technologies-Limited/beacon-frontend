// Shared currency/budget formatting helpers.
//
// Demo mode's mock data stores `budget` (and similar money fields) as an
// already-formatted Naira string (e.g. "₦150,000,000"); live mode's API
// returns it as a raw decimal number (e.g. 150000000). Views that render
// these values need to handle both shapes consistently instead of each
// re-implementing its own ad-hoc formatting — use `formatCurrency` (for a
// known-numeric value) or `formatBudget` (for a value that may already be a
// pre-formatted string, e.g. `lead.budget`) everywhere a money value is
// displayed.

export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (!Number.isFinite(num)) return '₦0';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(num);
};

// Parses a budget value that may be a raw number (live API) or a
// pre-formatted Naira string (demo mock data, e.g. "₦150,000,000") into a
// plain number.
export const parseBudgetNumber = (val) => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val) return 0;
  const digits = String(val).replace(/[^0-9.]/g, '');
  const num = parseFloat(digits);
  return Number.isFinite(num) ? num : 0;
};

// Renders any budget value (raw number or pre-formatted string) as a
// consistently-formatted Naira string.
export const formatBudget = (val) => {
  if (val === null || val === undefined || val === '') return '---';
  return formatCurrency(parseBudgetNumber(val));
};
