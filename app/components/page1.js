// app/components/page1.js
import { escapeHtml, formatPriceUSD } from '../utils.js';

function compactUSD(x) {
  const a = Math.abs(x);
  if (a >= 1e12) return `$${(x / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `$${(x / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(x / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(x / 1e3).toFixed(1)}K`;
  return formatPriceUSD(x);
}

function trendSVG(change = 0, sizeUp = [20, 12], sizeDown = [20, 12]) {
  const up = Number(change) > 0;
  if (up) {
    const [w, h] = sizeUp;
    return `<svg width="${w}" height="${h}" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 -8.74228e-07L0 12L20 12L10 -8.74228e-07Z" fill="#1AE6A2"></path></svg>`;
  }
  const [w, h] = sizeDown;
  return `<svg width="${w}" height="${h}" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12L20 0H0L10 12Z" fill="#FF0055"></path></svg>`;
}

export function page1(state) {
  const d = new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' }).toUpperCase();
  const popular = state.popular || [];

  return `
  <div class="instagram-story">
    <div class="group">
      <div class="frame">
        <div class="div">
          <img class="img avatar" src="${escapeHtml(state.btc?.image || '')}" alt="BTC" crossorigin="anonymous">
          <div class="text-wrapper">BITCOIN</div>
        </div>
        <div class="rectangle"></div>
        <div class="frame-2">
          <div class="text-wrapper-2">Ціна</div>
          <div class="text-wrapper-3">${state.btc?.price ? formatPriceUSD(state.btc.price, { ticker: state.btc?.ticker || 'btc' }) : '—'}</div>
        </div>
        <div class="frame-2">
          <div class="text-wrapper-2">Час підтвердження</div>
          <div class="text-wrapper-4">${escapeHtml(state.btc?.conf || '—')}</div>
        </div>
        <div class="frame-2">
          <div class="text-wrapper-2">Комісія за транзакцію</div>
          <div class="text-wrapper-4">${escapeHtml(state.btc?.fee || '—')}</div>
        </div>
      </div>

      <div class="frame-3">
        <div class="div">
          <img class="img avatar" src="${escapeHtml(state.eth?.image || '')}" alt="ETH" crossorigin="anonymous">
          <div class="text-wrapper">ETHEREUM</div>
        </div>
        <div class="rectangle"></div>
        <div class="frame-2">
          <div class="text-wrapper-2">Ціна</div>
          <div class="text-wrapper-3">${state.eth?.price ? formatPriceUSD(state.eth.price, { ticker: state.eth?.ticker || 'eth' }) : '—'}</div>
        </div>
        <div class="frame-2">
          <div class="text-wrapper-2">Ціна газу</div>
          <div class="text-wrapper-4">${escapeHtml(state.eth?.gasPrice || '—')}</div>
        </div>
        <div class="frame-2">
          <div class="text-wrapper-2">Комісія за транзакцію</div>
          <div class="text-wrapper-4">${escapeHtml(state.eth?.transactionFee || '—')}</div>
        </div>
      </div>

      <div class="frame-4">
        <div class="div-wrapper"><div class="text-wrapper-5">Ринкова Капіталізація:</div></div>
        <div class="text-wrapper-6">${state.marketCapUSD ? compactUSD(state.marketCapUSD) : '—'}</div>
        <div class="frame-5">
          <div class="frame-6">
            <div class="text-wrapper-7">Обсяг за 24 години:</div>
            <div class="frame-7">
              <div class="frame-8 price-line">
                ${typeof state.volume24hChange === 'number' ? trendSVG(state.volume24hChange) : ''}
                <div class="text-wrapper-8 value-text">${state.volume24hUSD ? compactUSD(state.volume24hUSD) : '—'}</div>
              </div>
              <div class="frame-9">
                <div class="text-wrapper-8 value-text">
                  ${isFinite(state.volume24hChange) ? `${state.volume24hChange > 0 ? '+' : ''}${Number(state.volume24hChange).toFixed(2)}%` : '—'}
                </div>
              </div>
            </div>
          </div>
          <div class="frame-6">
            <div class="text-wrapper-7">Домінування:</div>
            <div class="frame-7">
              <div class="frame-9"><div class="text-wrapper-8">BTC: ${isFinite(state.dominanceBTC) ? Number(state.dominanceBTC).toFixed(1) + '%' : '—'}</div></div>
              <div class="text-wrapper-8">ETH: ${isFinite(state.dominanceETH) ? Number(state.dominanceETH).toFixed(1) + '%' : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="frame-10">
        <div class="div-wrapper"><div class="text-wrapper">ПОПУЛЯРНІ МОНЕТИ</div></div>
        <div class="rectangle"></div>
        <div class="frame-11">
          ${popular.map((m, idx) => `
            <div class="frame-12">
              <div class="frame-13">
                <img class="img-2 avatar" src="${escapeHtml(m.image || '')}" alt="${escapeHtml(m.name || m.ticker)}" crossorigin="anonymous">
                <div class="frame-8">
                  <div class="text-wrapper-8">${escapeHtml(m.name || m.ticker)}</div>
                  <div class="text-wrapper-9">${escapeHtml((m.ticker || '').toUpperCase())}</div>
                </div>
              </div>
              <div class="frame-7">
                <div class="frame-8 price-line">
                  ${trendSVG(m.change)}
                  <div class="text-wrapper-8 value-text">${m.price != null ? formatPriceUSD(m.price, { ticker: m.ticker, fixedDecimals: 2 }) : '—'}</div>
                </div>
                <div class="frame-9">
                  <div class="text-wrapper-8 value-text">
                    ${(m.change || 0) > 0 ? '+' : ''}${isFinite(m.change) ? Number(m.change).toFixed(2) : '—'}%
                  </div>
                </div>
              </div>
            </div>
            ${idx < popular.length - 1 ? '<div class="rectangle"></div>' : ''}
          `).join('')}
        </div>
      </div>

      <div class="text-wrapper-10">ОГЛЯД РИНКУ</div>
      <div class="element-wrapper"><div class="element">${escapeHtml(d)}</div></div>
    </div>
  </div>`;
}
