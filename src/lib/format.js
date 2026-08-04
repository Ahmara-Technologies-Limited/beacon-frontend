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
