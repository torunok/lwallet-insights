import { PROXY_BASE } from './coinmarketcap.js';

const WORKER_API_BASE = `${PROXY_BASE}/api`;

async function fetchWorkerJson(path, { signal } = {}) {
  const res = await fetch(`${WORKER_API_BASE}${path}`, {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Network metrics request failed (${res.status}): ${text}`);
  }
  return res.json();
}

function asNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function deriveBtcConfirmationLabel(fastestFee, halfHourFee) {
  const fast = asNumber(fastestFee);
  const half = asNumber(halfHourFee);
  if (fast == null && half == null) return null;
  if (fast != null && half != null) {
    const ratio = half > 0 ? fast / half : 1;
    if (ratio >= 1.35 || fast >= 40 || half >= 40) return '~20–40 хв';
    return '~10–20 хв';
  }
  const base = fast ?? half;
  return base >= 40 ? '~20–40 хв' : '~10–20 хв';
}

export async function fetchBtcNetworkMetrics({ signal } = {}) {
  const payload = await fetchWorkerJson('/btc/fees', { signal });
  const fastestFee = asNumber(payload?.fastestFee);
  const halfHourFee = asNumber(payload?.halfHourFee);
  const hourFee = asNumber(payload?.hourFee);
  return {
    satVb: fastestFee,
    halfHour: halfHourFee,
    hour: hourFee,
    confLabel: deriveBtcConfirmationLabel(fastestFee, halfHourFee),
  };
}

export async function fetchEthNetworkMetrics({ ethPriceUsd, signal } = {}) {
  const payload = await fetchWorkerJson('/eth/gas', { signal });
  const result = payload?.result ?? payload;
  const gasPrice = asNumber(result?.ProposeGasPrice);
  const fastGas = asNumber(result?.FastGasPrice);
  const baseFee = asNumber(result?.suggestBaseFee);
  const chainId = asNumber(payload?.chainid || payload?.chainId);

  let feeUsd = null;
  if (gasPrice != null) {
    const priceUsd = asNumber(ethPriceUsd);
    if (priceUsd != null) {
      feeUsd = (gasPrice * 21000 * priceUsd) / 1e9;
    }
  }

  return {
    gwei: gasPrice,
    fast: fastGas,
    baseFee,
    chainId,
    feeUsd,
  };
}
