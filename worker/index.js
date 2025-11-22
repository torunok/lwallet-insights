const CMC_PRO_BASE = 'https://pro-api.coinmarketcap.com';
const CMC_DATA_BASE = 'https://web-api.coinmarketcap.com';
const CMC_V3_BASE = 'https://api.coinmarketcap.com';
const MEMPOOL_BASE = 'https://mempool.space';
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

const ADMIN_USER = 'Lwallet';
const ADMIN_PASS = 'Twothousandtwo';
const MAX_LOG_ENTRIES = 400;
const KV_KEYS = {
  blocklist: 'blocklist',
  accessLog: 'accessLog',
};

const accessLog = [];
const blocklist = new Map(); // ip -> ISO timestamp
let apiStatusCache = null;
let blocklistFetchedAt = 0;
let accessLogFetchedAt = 0;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,accept,x-requested-with',
};

function withCors(response, extraHeaders = {}) {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => headers.set(key, value));
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value));
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body, { status = 200, headers = {} } = {}) {
  const init = {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  };
  return withCors(new Response(JSON.stringify(body), init));
}

function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function fetchUpstream(url, init = {}) {
  const res = await fetch(url, init);
  const body = await res.arrayBuffer();
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

async function proxyCmc(request, env, baseUrl) {
  if (!env.CMC_API_KEY && baseUrl === CMC_PRO_BASE) {
    return jsonResponse({ error: 'CMC_API_KEY missing' }, { status: 500 });
  }
  const url = new URL(request.url);
  const upstream = new URL(url.pathname + url.search, baseUrl);
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.set('accept', 'application/json');
  if (baseUrl === CMC_PRO_BASE) {
    headers.set('X-CMC_PRO_API_KEY', env.CMC_API_KEY);
  }
  const res = await fetchUpstream(upstream.toString(), { method: 'GET', headers });
  return withCors(res);
}

function getClientIp(request) {
  return (
    request.headers.get('cf-connecting-ip')
    || request.headers.get('x-real-ip')
    || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown'
  );
}

function recordAccess(ip, env, ctx) {
  if (!ip) return;
  accessLog.unshift({ ip, ts: new Date().toISOString() });
  if (accessLog.length > MAX_LOG_ENTRIES) {
    accessLog.length = MAX_LOG_ENTRIES;
  }
  persistAccessLog(env, ctx);
}

function isBlocked(ip) {
  if (!ip) return false;
  return blocklist.has(ip);
}

function blockIp(ip) {
  if (!ip) return false;
  blocklist.set(ip, new Date().toISOString());
  return true;
}

function unblockIp(ip) {
  if (!ip) return false;
  return blocklist.delete(ip);
}

function isAuthorized(request) {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Basic ')) return false;
  try {
    const decoded = atob(header.slice(6) || '');
    const [user, pass] = decoded.split(':');
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch {
    return false;
  }
}

function unauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Lwallet Admin", charset="UTF-8"',
    },
  });
}

async function loadBlocklist(env) {
  const now = Date.now();
  if (blocklistFetchedAt && now - blocklistFetchedAt < 30_000) return blocklist;
  if (!env.ADMIN_STORE) return blocklist;
  const stored = await env.ADMIN_STORE.get(KV_KEYS.blocklist, 'json').catch(() => null);
  blocklist.clear();
  if (Array.isArray(stored)) {
    stored.forEach((entry) => {
      if (entry?.ip) blocklist.set(entry.ip, entry.blockedAt || new Date().toISOString());
    });
  }
  blocklistFetchedAt = now;
  return blocklist;
}

async function persistBlocklist(env, ctx) {
  if (!env.ADMIN_STORE) return;
  const payload = Array.from(blocklist.entries()).map(([ip, blockedAt]) => ({ ip, blockedAt }));
  const task = env.ADMIN_STORE.put(KV_KEYS.blocklist, JSON.stringify(payload));
  if (ctx?.waitUntil) ctx.waitUntil(task);
  else await task;
}

async function loadAccessLog(env) {
  const now = Date.now();
  if (accessLogFetchedAt && now - accessLogFetchedAt < 15_000) return accessLog;
  if (!env.ADMIN_STORE) return accessLog;
  const stored = await env.ADMIN_STORE.get(KV_KEYS.accessLog, 'json').catch(() => null);
  accessLog.length = 0;
  if (Array.isArray(stored)) {
    stored.slice(0, MAX_LOG_ENTRIES).forEach((entry) => {
      if (entry?.ip && entry?.ts) accessLog.push({ ip: entry.ip, ts: entry.ts });
    });
  }
  accessLogFetchedAt = now;
  return accessLog;
}

async function persistAccessLog(env, ctx) {
  if (!env.ADMIN_STORE) return;
  const payload = accessLog.slice(0, MAX_LOG_ENTRIES);
  const task = env.ADMIN_STORE.put(KV_KEYS.accessLog, JSON.stringify(payload));
  if (ctx?.waitUntil) ctx.waitUntil(task);
  else await task;
}

function renderAdminPage() {
  const html = `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <title>Lwallet Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      color-scheme: dark;
      --bg: #0e0f12;
      --panel: #16181d;
      --text: #e9edf1;
      --muted: #a4adbb;
      --accent: #4cc9f0;
      --danger: #ff6b6b;
      --ok: #00c853;
      --radius: 14px;
      --border: 1px solid #242936;
      --shadow: 0 20px 60px rgba(0,0,0,0.35);
      --gap: 16px;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: radial-gradient(circle at 20% 20%, rgba(76,201,240,0.08), transparent 35%),
                  radial-gradient(circle at 80% 0%, rgba(255,209,102,0.08), transparent 35%),
                  var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }
    h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: .5px; }
    h2 { margin: 0 0 8px; font-size: 16px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); }
    p  { margin: 0 0 18px; color: var(--muted); }
    a { color: var(--accent); }
    .grid {
      display: grid;
      gap: var(--gap);
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .card {
      background: linear-gradient(145deg, #14171d, #101219);
      border: var(--border);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .table th, .table td {
      padding: 8px 6px;
      border-bottom: var(--border);
      text-align: left;
    }
    .table th { color: var(--muted); font-weight: 600; }
    .table tr:last-child td { border-bottom: none; }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      background: #1f2430;
      color: var(--muted);
      font-size: 12px;
    }
    .pill.ok { background: rgba(0,200,83,0.12); color: var(--ok); }
    .pill.bad { background: rgba(255,107,107,0.12); color: var(--danger); }
    .muted { color: var(--muted); }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 10px;
    }
    input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: var(--border);
      background: #0e1118;
      color: var(--text);
    }
    button {
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.16);
      background: #1c202b;
      color: var(--text);
      cursor: pointer;
      transition: 0.2s ease;
    }
    button:hover { border-color: var(--accent); color: var(--accent); }
    .danger { border-color: rgba(255,107,107,0.35); color: var(--danger); }
    .inline {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .inline input { flex: 1; min-width: 180px; }
    .status-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .status-tile {
      border: var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      background: #10131a;
    }
    .status-tile .title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .status-tile .meta { font-size: 12px; color: var(--muted); }
    @media (max-width: 640px) { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Адмін панель</h1>
  <p>Логін захищений Basic Auth (Lwallet / Twothousandtwo). Тут видно відвідувачів, блокування IP та статус API.</p>

  <div class="grid">
    <section class="card" id="access-card">
      <h2>Відвідування</h2>
      <div id="access-list" class="muted">Завантажую...</div>
    </section>
    <section class="card" id="block-card">
      <h2>Блокування IP</h2>
      <div class="inline">
        <input id="block-ip" type="text" placeholder="Напр. 192.168.0.1">
        <button id="block-btn">Заблокувати</button>
      </div>
      <div id="block-list" style="margin-top:12px;" class="muted">—</div>
    </section>
  </div>

  <section class="card" style="margin-top:16px;">
    <h2>Статус API</h2>
    <div id="api-status" class="muted">Перевіряю...</div>
  </section>

  <script>
    const accessListEl = document.getElementById('access-list');
    const blockListEl = document.getElementById('block-list');
    const apiStatusEl = document.getElementById('api-status');
    const blockBtn = document.getElementById('block-btn');
    const blockInput = document.getElementById('block-ip');

    async function fetchData() {
      const res = await fetch('/admin/data');
      if (!res.ok) throw new Error('Не вдалося завантажити дані');
      return res.json();
    }

    function fmtDate(value) {
      try {
        return new Date(value).toLocaleString('uk-UA');
      } catch {
        return value;
      }
    }

    function renderAccess(log = []) {
      if (!log.length) {
        accessListEl.textContent = 'Ще ніхто не заходив';
        return;
      }
      const rows = log.slice(0, 50).map(entry => (
        '<tr><td>' + entry.ip + '</td><td>' + fmtDate(entry.ts) + '</td></tr>'
      )).join('');
      accessListEl.innerHTML = '<table class="table"><thead><tr><th>IP</th><th>Час</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }

    async function blockIp(ip) {
      const res = await fetch('/admin/block', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ip, action: 'block' }),
      });
      if (!res.ok) throw new Error('Не вдалося заблокувати IP');
    }

    async function unblock(ip) {
      const res = await fetch('/admin/block', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ip, action: 'unblock' }),
      });
      if (!res.ok) throw new Error('Не вдалося розблокувати IP');
    }

    function renderBlocklist(entries = []) {
      if (!entries.length) {
        blockListEl.textContent = 'Немає заблокованих IP';
        return;
      }
      const list = entries.map(entry => {
        return '<div class="pill bad" data-ip="' + entry.ip + '">' +
          '<span>' + entry.ip + '</span>' +
          '<span class="muted">' + fmtDate(entry.blockedAt) + '</span>' +
          '<button class="danger" data-unblock="' + entry.ip + '">Розблокувати</button>' +
        '</div>';
      }).join('');
      blockListEl.innerHTML = '<div class="actions">' + list + '</div>';
      blockListEl.querySelectorAll('button[data-unblock]').forEach(btn => {
        btn.onclick = async () => {
          await unblock(btn.dataset.unblock);
          refresh();
        };
      });
    }

    function renderApiStatus(api = {}) {
      const { updatedAt, checks = [] } = api;
      if (!checks.length) {
        apiStatusEl.textContent = 'Немає даних';
        return;
      }
      const tiles = checks.map(item => {
        const badge = item.ok ? '<span class="pill ok">OK</span>' : '<span class="pill bad">Помилка</span>';
        const meta = (item.error ? item.error : ('HTTP ' + item.status)) + ' · ' + (item.latencyMs || 0) + ' мс';
        return '<div class="status-tile">' +
          '<div class="title"><div>' + item.label + '</div>' + badge + '</div>' +
          '<div class="meta">' + meta + '</div>' +
        '</div>';
      }).join('');
      apiStatusEl.innerHTML = '<div class="status-grid">' + tiles + '</div>' +
        (updatedAt ? '<div class="muted" style="margin-top:8px;">Оновлено: ' + fmtDate(updatedAt) + '</div>' : '');
    }

    async function refresh() {
      try {
        const data = await fetchData();
        renderAccess(data.accessLog || []);
        renderBlocklist(data.blocked || []);
        renderApiStatus(data.apiStatus || {});
      } catch (err) {
        accessListEl.textContent = err.message;
        apiStatusEl.textContent = err.message;
      }
    }

    blockBtn.onclick = async () => {
      const ip = blockInput.value.trim();
      if (!ip) return;
      await blockIp(ip);
      blockInput.value = '';
      refresh();
    };

    refresh();
  </script>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

async function collectApiStatuses(env) {
  const now = Date.now();
  if (apiStatusCache && now - apiStatusCache.fetchedAt < 60_000) {
    return apiStatusCache.data;
  }

  const checks = [];
  const run = async (id, label, url, init = {}) => {
    const started = Date.now();
    try {
      const res = await fetch(url, { method: 'GET', ...init, headers: { accept: 'application/json', ...(init.headers || {}) } });
      const latencyMs = Date.now() - started;
      let error = null;
      if (!res.ok) {
        error = await res.text().catch(() => res.statusText);
      }
      return { id, label, status: res.status, ok: res.ok, latencyMs, error: error?.slice(0, 200) || null };
    } catch (err) {
      return { id, label, status: null, ok: false, latencyMs: Date.now() - started, error: err.message };
    }
  };

  if (!env.CMC_API_KEY) {
    checks.push({
      id: 'cmc-pro',
      label: 'CMC Pro',
      ok: false,
      status: null,
      latencyMs: 0,
      error: 'CMC_API_KEY missing',
    });
  } else {
    checks.push(await run(
      'cmc-pro',
      'CMC Pro listings',
      `${CMC_PRO_BASE}/v1/cryptocurrency/listings/latest?limit=5&convert=USD`,
      { headers: { 'X-CMC_PRO_API_KEY': env.CMC_API_KEY } },
    ));
  }

  checks.push(await run(
    'cmc-data',
    'CMC Data API',
    `${CMC_DATA_BASE}/data-api/v3/fear-and-greed/historical?limit=1`,
  ));

  checks.push(await run(
    'cmc-v3',
    'CMC v3 metrics',
    `${CMC_V3_BASE}/v3/global-metrics/quotes/latest`,
  ));

  checks.push(await run(
    'mempool',
    'Mempool.space',
    `${MEMPOOL_BASE}/api/v1/fees/recommended`,
  ));

  if (!env.ETHERSCAN_API_KEY) {
    checks.push({
      id: 'etherscan',
      label: 'Etherscan',
      ok: false,
      status: null,
      latencyMs: 0,
      error: 'ETHERSCAN_API_KEY missing',
    });
  } else {
    const etherscanUrl = new URL(ETHERSCAN_V2);
    etherscanUrl.searchParams.set('module', 'gastracker');
    etherscanUrl.searchParams.set('action', 'gasoracle');
    etherscanUrl.searchParams.set('apikey', env.ETHERSCAN_API_KEY);
    checks.push(await run('etherscan', 'Etherscan gas', etherscanUrl.toString()));
  }

  const payload = { updatedAt: new Date().toISOString(), checks };
  apiStatusCache = { data: payload, fetchedAt: now };
  return payload;
}

async function handleAdmin(request, env, ctx) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/admin') {
    return renderAdminPage();
  }

  if (request.method === 'GET' && url.pathname === '/admin/data') {
    await Promise.all([loadAccessLog(env), loadBlocklist(env)]);
    const data = {
      accessLog,
      blocked: Array.from(blocklist.entries()).map(([ip, blockedAt]) => ({ ip, blockedAt })),
      apiStatus: await collectApiStatuses(env),
    };
    return jsonResponse(data);
  }

  if (request.method === 'POST' && url.pathname === '/admin/block') {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // ignore
    }
    const ip = (body?.ip || '').trim();
    const action = (body?.action || 'block').toLowerCase();
    if (!ip) return jsonResponse({ error: 'ip required' }, { status: 400 });
    if (action === 'unblock') {
      unblockIp(ip);
      await persistBlocklist(env, ctx);
      return jsonResponse({ ok: true, action: 'unblock', ip });
    }
    blockIp(ip);
    await persistBlocklist(env, ctx);
    return jsonResponse({ ok: true, action: 'block', ip });
  }

  return jsonResponse({ error: 'Not Found' }, { status: 404 });
}

async function handleMempool(pathname) {
  let target = `${MEMPOOL_BASE}${pathname.replace('/api/btc', '')}`;
  if (!target.endsWith('/recommended') && !target.endsWith('/mempool')) {
    target = `${MEMPOOL_BASE}/api${pathname.replace('/api/btc', '')}`;
  }
  const res = await fetchUpstream(target, {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  return withCors(res);
}

async function handleEthGas(url, env) {
  async function fetchEtherscanGas() {
    if (!env.ETHERSCAN_API_KEY) return null;
    const upstream = new URL(ETHERSCAN_V2);
    upstream.searchParams.set('chainid', url.searchParams.get('chainid') || '1');
    upstream.searchParams.set('module', 'gastracker');
    upstream.searchParams.set('action', 'gasoracle');
    upstream.searchParams.set('apikey', env.ETHERSCAN_API_KEY);
    const res = await fetch(upstream.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const payload = await res.json().catch(() => null);
    if (!payload) return null;
    return { payload, source: 'etherscan' };
  }

  async function fetchEtherchainGas() {
    const res = await fetch('https://www.etherchain.org/api/gasPriceOracle', {
      method: 'GET',
      headers: { accept: 'application/json' },
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const payload = await res.json().catch(() => null);
    if (!payload) return null;
    return { payload, source: 'etherchain' };
  }

  const asNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const etherscan = await fetchEtherscanGas();
  const proposeGas =
    asNumber(etherscan?.payload?.result?.ProposeGasPrice)
    ?? asNumber(etherscan?.payload?.result?.proposeGasPrice);

  const fastGas =
    asNumber(etherscan?.payload?.result?.FastGasPrice)
    ?? asNumber(etherscan?.payload?.result?.fastGasPrice);

  const baseFee = asNumber(etherscan?.payload?.result?.suggestBaseFee);

  const validEtherscan = proposeGas != null && proposeGas >= 0.5;

  if (validEtherscan) {
    return jsonResponse({
      source: etherscan?.source || 'etherscan',
      result: {
        ProposeGasPrice: proposeGas,
        FastGasPrice: fastGas,
        suggestBaseFee: baseFee,
      },
    });
  }

  const etherchain = await fetchEtherchainGas();
  const proposeFromEtherchain = asNumber(etherchain?.payload?.standard);
  const fastFromEtherchain = asNumber(etherchain?.payload?.fast);
  const baseFromEtherchain = asNumber(etherchain?.payload?.currentBaseFee);

  if (proposeFromEtherchain != null) {
    return jsonResponse({
      source: etherchain?.source || 'etherchain',
      result: {
        ProposeGasPrice: proposeFromEtherchain,
        FastGasPrice: fastFromEtherchain,
        suggestBaseFee: baseFromEtherchain,
      },
    });
  }

  return jsonResponse({ error: 'Unable to fetch gas price' }, { status: 502 });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    await loadAccessLog(env);
    const clientIp = getClientIp(request);
    if (clientIp) recordAccess(clientIp, env, ctx);

    if (pathname.startsWith('/admin')) {
      return handleAdmin(request, env, ctx);
    }

    await loadBlocklist(env);
    if (isBlocked(clientIp)) {
      return jsonResponse({ error: 'Access blocked for your IP' }, { status: 403 });
    }

    if (pathname === '/api/btc/fees') {
      return handleMempool('/api/v1/fees/recommended');
    }

    if (pathname === '/api/btc/mempool') {
      return handleMempool('/api/mempool');
    }

    if (pathname === '/api/eth/gas') {
      return handleEthGas(url, env);
    }

    if (pathname.startsWith('/v1/')) {
      return proxyCmc(request, env, CMC_PRO_BASE);
    }

    if (pathname.startsWith('/data-api/')) {
      return proxyCmc(request, env, CMC_DATA_BASE);
    }

    if (pathname.startsWith('/v3/')) {
      return proxyCmc(request, env, CMC_V3_BASE);
    }

    return jsonResponse({ error: 'Not Found' }, { status: 404 });
  },
};
