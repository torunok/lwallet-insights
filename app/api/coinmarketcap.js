const PROXY_BASE = 'https://lwallet-cmc-proxy.moloshiigpt.workers.dev';
const PRO_BASE = `${PROXY_BASE}/v1`;
const DATA_BASE = `${PROXY_BASE}/data-api/v3`;
const FNG_BASE = `${PROXY_BASE}/v3`;

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
  const url = `${FNG_BASE}/fear-and-greed/historical?limit=1`;
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
  const entry = payload?.data?.[0];
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
