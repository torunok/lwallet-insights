import { formatNumber, escapeHtml } from '../utils.js';
import { safeAvatar } from '../images.js';   // <-- ВАЖЛИВО: додано

export function popularCompact(list = []) {
  return `
    <article class="card">
      <h3>Популярні монети (швидкий огляд)</h3>
      <div class="divider"></div>
      <div class="popular-compact">
        ${list.length ? list.slice(0,5).map(row).join('') : `<div class="center muted">—</div>`}
      </div>
    </article>
  `;
}

function row(x) {
  const change = Number(x.change || 0);
  const cls = change > 0 ? 'ok' : change < 0 ? 'bad' : '';
  const sign = change > 0 ? '+' : '';
  return `
    <div class="popular-row">
      <div class="ticker">
        ${safeAvatar(x.image, x.name || x.ticker)}
        ${escapeHtml(x.name || x.ticker)}
      </div>
      <div class="price">$${formatNumber(x.price, { maximumFractionDigits: 2 })}</div>
      <div class="delta ${cls}">${sign}${change.toFixed(1)}%</div>
    </div>
  `;
}
