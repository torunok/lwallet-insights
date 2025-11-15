const PROXY_BASE = 'https://lwallet-cmc-proxy.moloshiigpt.workers.dev';
const PRO_BASE = `${PROXY_BASE}/v1`;
const DATA_BASE = `${PROXY_BASE}/data-api/v3`;
const FNG_BASE = `${PROXY_BASE}/v3`;
const FEAR_GREED_LIMIT = 30; // grab multiple entries so we can sort client-side

function resolveTimestamp(entry) {
  const raw =
    entry?.timestamp
    || entry?.lastUpdated
    || entry?.last_updated
    || entry?.time
    || entry?.date;
  if (!raw) return 0;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    if (numeric > 1e12) return numeric;
    if (numeric > 1e9) return numeric * 1000;
    return numeric;
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickLatestEntry(list) {
  if (!Array.isArray(list) || !list.length) return null;
  let best = null;
  let bestTs = -Infinity;
  for (const item of list) {
    if (!item) continue;
    const ts = resolveTimestamp(item);
    if (ts >= bestTs) {
      best = item;
      bestTs = ts;
    }
  }
  return best || null;
}

function buildQuery(params = {}) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) return '';
  const encoded = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `?${encoded}`;
}

async function fetchCMC(endpoint, { params, signal } = {}) {
  const url = `${PRO_BASE}${endpoint}${buildQuery(params)}`;
  const res = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`CMC request failed (${res.status}): ${text}`);
  }
  const payload = await res.json();
  const errorCode = payload?.status?.error_code;
  if (errorCode && Number(errorCode) !== 0) {
    throw new Error(`CMC API error ${errorCode}: ${payload?.status?.error_message || 'Unknown'}`);
  }
  return payload?.data;
}

export async function fetchListings(limit = 100) {
  const data = await fetchCMC('/cryptocurrency/listings/latest', {
    params: { start: 1, limit, convert: 'USD' },
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchGlobalMetrics() {
  return fetchCMC('/global-metrics/quotes/latest');
}

export function getLogoUrlById(id, size = 64) {
  if (!id) return '';
  const safeSize = Number(size) || 64;
  return `https://s2.coinmarketcap.com/static/img/coins/${safeSize}x${safeSize}/${id}.png`;
}

export async function fetchFearGreedSnapshot() {
  const url = `${FNG_BASE}/fear-and-greed/historical?limit=${FEAR_GREED_LIMIT}`;
  let res;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    return null;
  }
  if (res.status === 403 || res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`CMC data API error: ${res.status}`);
  }
  const payload = await res.json();
  const rawData = payload?.data;
  const list = Array.isArray(rawData) ? rawData : rawData ? [rawData] : [];
  const entry = pickLatestEntry(list);
  if (!entry) return null;
  return {
    value: Number(entry.value ?? entry.score ?? entry.index ?? entry.fearGreedValue),
    classification:
      entry.value_classification
      || entry.classification
      || entry.score_classification
      || 'Unknown',
    timestamp: entry.timestamp || entry.lastUpdated,
  };
}
