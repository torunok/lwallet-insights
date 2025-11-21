// app/app.js
import { initRouter, onRouteChange, getRoute } from './router.js';
import { render } from './render.js';
import { initAutoscale, applyScale, setTargetSize } from './autoscale.js';
import { exportImage } from './export.js';
import { state } from './state.js';
import { loadAll } from './data.js';
import { ROUTES, PAGE_SPECS } from './config.js';
import { preloadImages } from './images.js';

const STATE_CACHE_KEY = 'lw-insights-cache-v1';

function readCachedState() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STATE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function persistStateSnapshot(snapshot) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STATE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota errors
  }
}

function hydrateStateFromCache() {
  const cached = readCachedState();
  if (!cached) return false;
  Object.assign(state, cached, { ready: true });
  return true;
}

function initTheme() {
  const saved = localStorage.getItem('lw_theme');
  const root = document.documentElement;
  root.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    localStorage.setItem('lw_theme', next);
  });
}

// ⛔️ Більше НІЯКИХ пресетів із селектора — сторінки фіксовані 9:16 за PAGE_SPECS
// function initPreset() { ... }  // видалено
let seq = 0;
let refreshResetTimer = null;
// лічильник запитів для ігнорування запізнілих відповідей
const DEFAULT_SPEC = { w: 1080, h: 1920, exportW: 1080, exportH: 1920 };

function setRefreshState(next = 'idle') {
  const buttons = document.querySelectorAll('[data-action="refresh-data"]');
  if (buttons.length) {
    buttons.forEach((btn) => {
      btn.classList.toggle('is-loading', next === 'loading');
      btn.classList.toggle('is-success', next === 'success');
      btn.classList.toggle('is-error', next === 'error');
      btn.disabled = next === 'loading';
    });
  }
  if (refreshResetTimer) {
    clearTimeout(refreshResetTimer);
    refreshResetTimer = null;
  }
  if (next === 'success' || next === 'error') {
    refreshResetTimer = setTimeout(() => setRefreshState('idle'), 1800);
  }
}

function initRefreshControl() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action="refresh-data"]');
    if (!target) return;
    event.preventDefault();
    if (target.disabled) return;
    loadData({ origin: 'manual' });
  });
}

function initNavToggle() {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.nav-toggle');
  if (!nav || !toggle) return;

  const closeNav = () => {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) {
        closeNav();
      }
    });
  });
}


async function loadData({ origin = 'auto' } = {}) {
  const mySeq = ++seq;                         // �?'? ��?��'�?�?
  const manualTrigger = origin === 'manual';
  try {
    if (manualTrigger) setRefreshState('loading');
    else document.body.classList.add('freeze');

    const data = await loadAll();
    if (mySeq !== seq) return;

    const imagePool = [
      ...(data.popular || []),
      ...(data.leadersUp || []),
      ...(data.leadersDown || []),
    ]
      .map(x => x.image)
      .filter(Boolean);
    await preloadImages(Array.from(new Set(imagePool)));

    const nextState = {
      ...state,
      ...data,
      btc: { ...state.btc, ...(data.btc || {}) },
      eth: { ...state.eth, ...(data.eth || {}) },
      // Приймаємо навіть порожні масиви, щоб не повертати старі дані, коли немає зростаючих/спадаючих
      popular: Array.isArray(data.popular) ? data.popular : state.popular || [],
      leadersUp: Array.isArray(data.leadersUp) ? data.leadersUp : state.leadersUp || [],
      leadersDown: Array.isArray(data.leadersDown) ? data.leadersDown : state.leadersDown || [],
    };

    Object.assign(state, nextState, {
      ready: true,
      date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'long' }),
    });
    persistStateSnapshot(state);

    render(getRoute(), state);
    applyScale();
    if (manualTrigger) setRefreshState('success');
  } catch (e) {
    console.error(e);
    console.warn('[loadData] CoinMarketCap fetch failed, залишаємо попередні дані');
    if (manualTrigger) setRefreshState('error');
  } finally {
    if (!manualTrigger && mySeq === seq) {
      document.body.classList.remove('freeze');
    }
  }
}

const readOpts = () => {
  const formatSel = document.getElementById('export-format');
  const scaleSel  = document.getElementById('export-scale');
  const transparentChk = document.getElementById('export-transparent');
  return {
    format: (formatSel?.value || 'png').toLowerCase(),
    scale: Number(scaleSel?.value || 2),
    transparent: !!transparentChk?.checked,

    // ✅ передаємо у експорт те, що вже є у state
    fearGreed: typeof state.fearGreed === 'number' ? state.fearGreed : null,
    classification: state.classification || null,
  };
};

function initExportButtons() {
  const currentButtons = Array.from(document.querySelectorAll('[data-export="current"]'));
  const allButtons = Array.from(document.querySelectorAll('[data-export="all"]'));
  const toggleDisabled = (buttons, disabled) => {
    buttons.forEach((btn) => {
      if (btn) btn.disabled = disabled;
    });
  };

  if (currentButtons.length) {
    const handleCurrentClick = async (event) => {
      event.preventDefault();
      const opts = readOpts();
      toggleDisabled(currentButtons, true);
      document.body.classList.add('freeze', 'capturing');
      try {
        await exportImage(opts);
      } finally {
        document.body.classList.remove('freeze', 'capturing');
        toggleDisabled(currentButtons, false);
      }
    };
    currentButtons.forEach((btn) => {
      btn.addEventListener('click', handleCurrentClick);
    });
  }

  if (allButtons.length) {
    const handleAllClick = async (event) => {
      event.preventDefault();
      const opts = readOpts();
      const currentRoute = getRoute();
      toggleDisabled(allButtons, true);
      document.body.classList.add('freeze', 'capturing');
      try {
        for (const route of ROUTES) {
          location.hash = `#/${route}`;
          await new Promise((res) => setTimeout(res, 60));
          await exportImage({ ...opts, filenameSuffix: `-${route}` });
        }
      } finally {
        location.hash = `#/${currentRoute}`;
        document.body.classList.remove('freeze', 'capturing');
        toggleDisabled(allButtons, false);
      }
    };
    allButtons.forEach((btn) => {
      btn.addEventListener('click', handleAllClick);
    });
  }
}

function applyPageSpec(route) {
  const spec = PAGE_SPECS[route] || DEFAULT_SPEC;
  const targetW = Number(spec.w) || DEFAULT_SPEC.w;
  const targetH = Number(spec.h) || DEFAULT_SPEC.h;
  const exportW = Number(spec.exportW) || targetW;
  const exportH = Number(spec.exportH) || targetH;

  setTargetSize(targetW, targetH);

  const area = document.getElementById('screen-shot-area');
  if (area) {
    area.dataset.route = route;
    area.dataset.previewWidth = String(targetW);
    area.dataset.previewHeight = String(targetH);
    area.dataset.baseWidth = String(exportW);
    area.dataset.baseHeight = String(exportH);
    area.style.setProperty('--canvas-width', `${targetW}px`);
    area.style.setProperty('--canvas-height', `${targetH}px`);
  }

  applyScale();
}

function boot() {
  initRouter();
  initAutoscale();
  initTheme();
  initRefreshControl();
  initNavToggle();

  // встановлюємо розмір полотна під поточний роут ДО першого render
  const initialRoute = getRoute();
  applyPageSpec(initialRoute);
  hydrateStateFromCache();

  render(initialRoute, state);
  applyScale();

  onRouteChange((route) => {
    applyPageSpec(route);
    render(route, state);
    applyScale();
  });

  window.addEventListener('resize', applyScale);

  initExportButtons();
  window.refreshData = () => loadData({ origin: 'manual' });
  loadData({ origin: 'auto' });
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
