export function formatSAR(value) {
  if (value === null || value === undefined || value === '') return '٠ ر.س';
  const num = parseFloat(value);
  if (isNaN(num)) return '٠ ر.س';
  return num.toLocaleString('ar-SA') + ' ر.س';
}
