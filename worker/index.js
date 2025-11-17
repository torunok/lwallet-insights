const CMC_PRO_BASE = 'https://pro-api.coinmarketcap.com';
const CMC_DATA_BASE = 'https://web-api.coinmarketcap.com';
const CMC_V3_BASE = 'https://api.coinmarketcap.com';
const MEMPOOL_BASE = 'https://mempool.space';
const ETHERSCAN_V2 = 'https://api.etherscan.io/v2/api';

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
  if (!env.ETHERSCAN_API_KEY) {
    return jsonResponse({ error: 'ETHERSCAN_API_KEY missing' }, { status: 500 });
  }
  const upstream = new URL(ETHERSCAN_V2);
  upstream.searchParams.set('chainid', url.searchParams.get('chainid') || '1');
  upstream.searchParams.set('module', 'gastracker');
  upstream.searchParams.set('action', 'gasoracle');
  upstream.searchParams.set('apikey', env.ETHERSCAN_API_KEY);
  const res = await fetchUpstream(upstream.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
  });
  return withCors(res);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      return handleOptions();
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
