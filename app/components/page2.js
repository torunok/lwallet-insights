// === РЕКОМЕНДОВАНІ ПРАВКИ (коментарі починаються з "// PATCH:") ===
// Вміст нижче — готові вставки/диф для двох файлів

// ===========================
// app/components/page2.js
// ===========================
import { escapeHtml, formatPriceUSD } from '../utils.js';

function trendSVG(change=0, sizeUp=[20,12], sizeDown=[20,12]) {
  const up = Number(change) > 0;
  if (up) {
    const [w,h]=sizeUp;
    return `<svg width="${w}" height="${h}" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 -8.74228e-07L0 12L20 12L10 -8.74228e-07Z" fill="#1AE6A2"></path></svg>`;
  }
  const [w,h]=sizeDown;
  return `<svg width="${w}" height="${h}" viewBox="0 0 20 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 12L20 0H0L10 12Z" fill="#FF0055"></path></svg>`;
}

export function page2(state) {
  console.log('FG from state (page2):', state.fearGreed);
  const d = new Date().toLocaleDateString('uk-UA', { day:'numeric', month:'long' }).toUpperCase();
  const up = state.leadersUp || [];
  const down = state.leadersDown || [];
  const hasFearValue = isFinite(state.fearGreed);
  const fear = hasFearValue ? Math.max(0, Math.min(100, Number(state.fearGreed))) : 0;
  const fearDisplay = hasFearValue ? Math.round(fear) : '—';
  const mood = (state.classification || '').toString();
  const fearAria = `Індекс страху та жадібності: ${fearDisplay}`;

  const row = (m) => `
    <div class="frame-5">
      <div class="frame-6">
        <img class="img avatar" src="${escapeHtml(m.image || '')}" alt="${escapeHtml(m.name || m.ticker)}" crossorigin="anonymous">
        <div class="frame-7">
          <span class="text-wrapper-2">${escapeHtml((m.name||m.ticker).toUpperCase())}</span>
          <span class="text-wrapper-3">${escapeHtml((m.ticker||'').toUpperCase())}</span>
        </div>
      </div>
      <div class="frame-8">
        <div class="frame-7 price-line">
          ${trendSVG(m.change)}
          <span class="text-wrapper-2 value-text">${m.price ? formatPriceUSD(m.price, { ticker: m.ticker }) : '—'}</span>
        </div>
        <div class="div-wrapper">
          <span class="text-wrapper-2 value-text">${(m.change||0)>0?'+':''}${isFinite(m.change)? Number(m.change).toFixed(2):'—'}%</span>
        </div>
      </div>
    </div>
  `;

  const renderLeaders = (list = []) => {
    const limited = list.slice(0, 3);
    return limited.map((m, i) => {
      const separator = i < limited.length - 1 ? '<div class="rectangle"></div>' : '';
      return `${row(m)}${separator}`;
    }).join('');
  };

  return `
  <main class="stat">
    <div class="group-wrapper">
      <div class="group">
        <section class="div">
          <header class="frame"><time class="element">${escapeHtml(d)}</time></header>

          <div class="group-2">
            <!-- ЛІДЕРИ РОСТУ -->
            <article class="frame-2">
              <header class="frame-3">
                <h2 class="text-wrapper">ЛІДЕРИ РОСТУ</h2>
                <svg width="62" height="44" viewBox="0 0 62 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 42L16.4999 26.7826L26.4428 37.2174L60 2" stroke="#19E5A1" stroke-width="4"></path></svg>
              </header>
              <div class="rectangle"></div>
              <div class="frame-4">
                ${renderLeaders(up)}
              </div>
            </article>

            <!-- ЛІДЕРИ ПАДІННЯ -->
            <article class="frame-2">
              <header class="frame-3">
                <h2 class="text-wrapper">ЛІДЕРИ ПАДІННЯ</h2>
                <svg width="62" height="44" viewBox="0 0 62 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M60 42L45.5001 26.7826L35.5572 37.2174L2 2" stroke="#FF0055" stroke-width="4"></path></svg>
              </header>
              <div class="rectangle"></div>
              <div class="frame-4">
                ${renderLeaders(down)}
              </div>
            </article>
          </div>
        </section>

        <!-- ІНДЕКС СТРАХУ -->
        <section class="group-3">
          <header class="frame-9"><h2 class="text-wrapper-4">ІНДЕКС СТРАХУ ТА ЖАДІБНОСТІ</h2></header>
          <figure class="group-4" role="img" aria-label="${escapeHtml(fearAria)}">
            <div class="fear-index">
              <div class="fear-index__progress">
                <div class="progress-bar" style="--rotate: 0deg">
                  <span class="progress-bar__value">${fearDisplay}</span>

                  <div class="background"></div>
                  <div class="background__gradient"></div>
                  <div class="background__line"></div>

                  <div class="progress-bar__pointer"><i class="pointer"></i></div>
                </div>
              </div>
            </div>
          </figure>
        </section>
      </div>
    </div>
  </main>`;
}
