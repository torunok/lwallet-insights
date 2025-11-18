// app/components/pageCombined.js
import { escapeHtml, dash, formatPriceUSD } from '../utils.js';

const FEAR_GAUGE_MIN = 0;
const FEAR_GAUGE_MAX = 100;
const FEAR_GAUGE_TO_DEG = 1.8;

function compactUSD(x) {
  if (!isFinite(x)) return '—';
  const a = Math.abs(x);
  if (a >= 1e12) return `$${(x / 1e12).toFixed(2)}T`;
  if (a >= 1e9)  return `$${(x / 1e9).toFixed(2)}B`;
  if (a >= 1e6)  return `$${(x / 1e6).toFixed(2)}M`;
  if (a >= 1e3)  return `$${(x / 1e3).toFixed(1)}K`;
  return formatPriceUSD(x);
}
function pct(change) {
  if (!isFinite(change)) return '—';
  const sign = change > 0 ? '+' : '';
  return `${sign}${Number(change).toFixed(2)}%`;
}
function changeClass(change) {
  if (!isFinite(change) || Number(change) === 0) return '';
  return Number(change) > 0 ? 'is-positive' : 'is-negative';
}
function trendSVG(change = 0) {
  const up = Number(change) > 0;
  const fill = up ? '#1AE6A2' : '#FF0055';
  return `<svg class="trend-icon" viewBox="0 0 20 12" xmlns="http://www.w3.org/2000/svg">
    <path d="${up ? 'M10 0L0 12H20L10 0Z' : 'M10 12L20 0H0L10 12Z'}" fill="${fill}"/>
  </svg>`;
}

export function updateFearGauge(value) {
  if (typeof document === 'undefined') return;
  const bars = document.querySelectorAll('.progress-bar');
  if (!bars.length) return;

  const numeric = Number(value);
  const hasValue = Number.isFinite(numeric);
  const clamped = hasValue
    ? Math.max(FEAR_GAUGE_MIN, Math.min(FEAR_GAUGE_MAX, numeric))
    : FEAR_GAUGE_MIN;
  const degrees = clamped * FEAR_GAUGE_TO_DEG;
  const displayValue = hasValue ? Math.round(clamped) : '—';

  bars.forEach((bar) => {
    bar.style.setProperty('--rotate', `${degrees}deg`);
    const valueEl = bar.querySelector('.progress-bar__value');
    if (valueEl) valueEl.textContent = displayValue;
  });
}

if (typeof window !== 'undefined') {
  window.pointer = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < FEAR_GAUGE_MIN || numeric > FEAR_GAUGE_MAX) {
      console.warn('Введіть число 0–100');
      return;
    }
    updateFearGauge(numeric);
    console.log('Gauge set to:', numeric);
  };
}

function renderListItem(m) {
  return `
  <li class="tg-list-item">
    <div class="tg-left">
      <div class="avatar"><img src="${escapeHtml(m.image || '')}" alt="${escapeHtml(m.ticker || '')}" crossorigin="anonymous"></div>
      <div class="tg-names">
        <span class="tg-list-ticker">${escapeHtml((m.ticker || '').toUpperCase())}</span>
        <span class="tg-list-subtitle">${escapeHtml(m.name || '')}</span>
      </div>
    </div>
    <div class="tg-right">
      <span class="tg-trend">${trendSVG(m.change)} ${formatPriceUSD(m.price, { ticker: m.ticker, fixedDecimals: m.fixedDecimals })}</span>
      <span class="tg-change ${changeClass(m.change)}">${pct(m.change)}</span>
    </div>
  </li>`;
}

function renderPopular(list = []) {
  const items = list.slice(0, 4);
  if (!items.length)
    return `<li class="tg-list-item tg-list-item--empty">Немає популярних активів</li>`;
  return items.map((item) => renderListItem({ ...item, fixedDecimals: 2 })).join('');
}

function renderLeaders(list = []) {
  const items = list.slice(0, 3);
  if (!items.length)
    return `<li class="tg-list-item tg-list-item--empty">Немає даних</li>`;
  return items.map(renderListItem).join('');
}

function renderCoinCard(title, data = {}, { subtitle, metaLines = [] } = {}) {
  const price = isFinite(data.price)
    ? formatPriceUSD(data.price, { ticker: data.ticker })
    : '—';
  const image = data.image || '';
  return `
  <div class="tg-card tg-coin">
    <div class="tg-coin-title">
      ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="avatar" crossorigin="anonymous">` : ''}
      <div>
        <div class="tg-coin-label">${escapeHtml(title)}</div>
        ${subtitle ? `<p class="tg-coin-subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
    </div>
    <div class="tg-rectangle"></div>
    <div class="tg-price">${price}</div>
    <div class="tg-meta">
      ${metaLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
    </div>
  </div>`;
}

function renderFear(state) {
  const rawValue = Number(state.fearGreed);
  const clamped = Number.isFinite(rawValue)
    ? Math.max(FEAR_GAUGE_MIN, Math.min(FEAR_GAUGE_MAX, rawValue))
    : 0;
  const displayValue = Number.isFinite(rawValue) ? Math.round(rawValue) : '—';
  const moodRaw = dash(state.classification || '');
  const mood = moodRaw && moodRaw !== '—' ? String(moodRaw) : '';
  const ariaLabel = `Індекс страху та жадібності: ${displayValue}`;
  return `
  <div class="tg-card tg-fear">
    <div class="tg-card-head">
      <h3>ІНДЕКС СТРАХУ ТА ЖАДІБНОСТІ</h3>
      ${mood ? `<span class="tg-badge">${escapeHtml(mood)}</span>` : ''}
    </div>
    <div class="fear-index" role="img" aria-label="${escapeHtml(ariaLabel)}">
      <div class="fear-index__progress">
        <div class="progress-bar" style="--rotate: 0deg">
          <span class="progress-bar__value">${displayValue}</span>

          <div class="background"></div>
          <div class="background__gradient"></div>
          <div class="background__line"></div>

          <div class="progress-bar__pointer progress-bar__pointer--tg"><i class="pointer"></i></div>
        </div>
      </div>
    </div>
  </div>`;
}
export function pageCombined(state) {
  const d = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }).toUpperCase();
  const btc = state.btc || {};
  const eth = state.eth || {};
  const leadersUp = state.leadersUp || [];
  const leadersDown = state.leadersDown || [];
  const popular = state.popular || [];
  const marketCapVal = isFinite(state.marketCapUSD) ? Number(state.marketCapUSD) : NaN;
  const dominanceBTC = isFinite(state.dominanceBTC) ? `${Number(state.dominanceBTC).toFixed(1)}%` : '—';
  const dominanceETH = isFinite(state.dominanceETH) ? `${Number(state.dominanceETH).toFixed(1)}%` : '—';

  const btcCard = renderCoinCard('BITCOIN', { ...btc, ticker: btc.ticker || 'btc' }, {
    subtitle: 'Мережа Bitcoin',
    metaLines: [
      `Час підтвердження: ${dash(btc.conf)}`,
      `Комісія: ${dash(btc.fee)}`,
    ],
  });
  const ethCard = renderCoinCard('ETHEREUM', { ...eth, ticker: eth.ticker || 'eth' }, {
    subtitle: 'Мережа Ethereum',
    metaLines: [
      `Ціна газу: ${dash(eth.gasPrice)}`,
      `Комісія: ${dash(eth.transactionFee)}`,
    ],
  });

  return `
  <div class="tg-market">
        <header class="tg-market__header">
      <div>
        <h1 class="tg-market__title">СИТУАЦІЯ НА РИНКУ</h1>
      </div>
      <div class="tg-market__actions">
        <div class="tg-market__date">${d}</div>
      </div>
    </header>

    <div class="tg-market__grid">
      <section class="tg-grid-item tg-grid-coins">
        <div class="coins-grid">
          ${btcCard}
          ${ethCard}
        </div>
      </section>


      <section class="tg-card tg-grid-item tg-grid-leaders">
        <h3>ЛІДЕРИ РОСТУ</h3>
        <ul class="tg-list">${renderLeaders(leadersUp)}</ul>
        <h3 class="tg-list-title">ЛІДЕРИ ПАДІННЯ</h3>
        <ul class="tg-list">${renderLeaders(leadersDown)}</ul>
      </section>

      <section class="tg-card tg-grid-item tg-grid-popular">
        <h3>ПОПУЛЯРНІ</h3>
        <ul class="tg-list">${renderPopular(popular)}</ul>
      </section>

      <section class="tg-card tg-grid-item tg-grid-market">
        <h3>РИНКОВА КАПІТАЛІЗАЦІЯ</h3>
        <div class="tg-market-cap__row">
          <div class="tg-market-cap__value">${isFinite(marketCapVal) ? compactUSD(marketCapVal) : '—'}</div>
          <div class="tg-market-dominance">BTC: ${dominanceBTC} | ETH: ${dominanceETH}</div>
        </div>
      </section>

      <section class="tg-grid-item tg-grid-fear">
        ${renderFear(state)}
      </section>
    </div>
  </div>`;
}

//____________________________________________
//| Заголовок                       Дата      |
//|___________________________________________|
//| Bitcoin        | Ethereum  | Лідери       |
//|________________|___________|              |
//| Популярні                  |              |
//|                            |______________|
//|____________________________|Індекстстраху |
//| Ринкова капіталізація      |              |
//|____________________________|______________|
  
  

