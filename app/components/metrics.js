import { formatCompactUSD, formatNumber, dash, escapeHtml } from '../utils.js';

// SVG-іконки (inline, без зовнішніх файлів)
const ICONS = {
  cap: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" stroke="#9fb0c4" stroke-width="1.5"/>
      <path d="M7 10V6a5 5 0 0 1 10 0v4" stroke="#9fb0c4" stroke-width="1.5"/>
    </svg>`,
  volume: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 12h3l4-4v8l-4-4H4z" stroke="#9fb0c4" stroke-width="1.5"/>
      <path d="M16 8v8M20 10v4" stroke="#9fb0c4" stroke-width="1.5"/>
    </svg>`,
  dominance: `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#9fb0c4" stroke-width="1.5"/>
      <path d="M12 3v9l7 7" stroke="#9fb0c4" stroke-width="1.5"/>
    </svg>`
};

export function metricCard({ title, value, suffix = '', icon = 'cap' }) {
  const v = dash(value);
  const formatted =
    typeof v === 'number'
      ? (suffix === '%' ? `${v.toFixed(1)}%` : formatCompactUSD(v))
      : escapeHtml(v);

  return `
    <article class="card">
      <div class="metric">
        <div class="ico">${ICONS[icon] || ''}</div>
        <div class="meta">
          <h4>${escapeHtml(title)}</h4>
          <div class="val">${formatted}${suffix && typeof v !== 'number' ? '' : ''}</div>
        </div>
      </div>
    </article>
  `;
}

export function dominanceBlock({ btcPct, ethPct }) {
  const btc = dash(btcPct);
  const eth = dash(ethPct);

  const btcVal = typeof btc === 'number' ? `${btc.toFixed(1)}%` : btc;
  const ethVal = typeof eth === 'number' ? `${eth.toFixed(1)}%` : eth;

  return `
    <article class="card">
      <div class="metric">
        <div class="ico">${ICONS.dominance}</div>
        <div class="meta">
          <h4>Домінація BTC / ETH</h4>
          <div class="subgrid">
            <div class="chip">BTC: <strong>${btcVal}</strong></div>
            <div class="chip">ETH: <strong>${ethVal}</strong></div>
          </div>
        </div>
      </div>
    </article>
  `;
}
