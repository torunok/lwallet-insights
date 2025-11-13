// Формат числа з локаллю
export function formatNumber(n, opt = {}) {
  try { return new Intl.NumberFormat('uk-UA', opt).format(Number(n)); }
  catch { return String(n); }
}

// Формат валюти у скороченні: 1 234 567 -> $1.23M
export function formatCompactUSD(n) {
  const num = Number(n);
  if (!isFinite(num)) return '—';
  const abs = Math.abs(num);
  if (abs >= 1e12) return `$${(num/1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(num/1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(num/1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `$${(num/1e3).toFixed(1)}K`;
  return `$${formatNumber(num, { maximumFractionDigits: 2 })}`;
}

// Безпечний текст
export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Якщо значення "порожнє" — повернути «—»
export function dash(v) {
  if (v === null || v === undefined || (typeof v === 'number' && !isFinite(v))) return '—';
  if (typeof v === 'string' && v.trim() === '') return '—';
  return v;
}
