import {
  fetchListings,
  fetchGlobalMetrics,
  fetchFearGreedSnapshot,
  getLogoUrlById,
} from './api/coinmarketcap.js';
import { fetchBtcNetworkMetrics, fetchEthNetworkMetrics } from './api/network.js';

const POPULAR_SKIP = new Set(['btc', 'eth', 'usdt', 'usdc', 'steth']);

const FEAR_THRESHOLDS = [
  { max: 25, label: 'Надзвичайний страх' },
  { max: 45, label: 'Страх' },
  { max: 55, label: 'Нейтрально' },
  { max: 75, label: 'Жадібність' },
  { max: Infinity, label: 'Надзвичайна жадібність' },
];

const CLASSIFICATION_MAP = {
  'extreme fear': 'Надзвичайний страх',
  fear: 'Страх',
  neutral: 'Нейтрально',
  greed: 'Жадібність',
  'extreme greed': 'Надзвичайна жадібність',
};

function asNum(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeClassification(label) {
  if (!label) return 'Unknown';
  const key = label.toString().toLowerCase().trim();
  return CLASSIFICATION_MAP[key] || label;
}

function classificationFromValue(value) {
  const val = asNum(value);
  if (val == null) return 'Unknown';
  const bucket = FEAR_THRESHOLDS.find((item) => val <= item.max);
  return bucket ? normalizeClassification(bucket.label) : 'Unknown';
}

const STABLE_COINS = new Set([
  'usdt',
  'usdc',
  'busd',
  'tusd',
  'dai',
  'usdd',
  'usdp',
  'gusd',
  'susd',
  'lusd',
  'fdusd',
  'usde',
  'usdr',
  'usdl',
  'usdx',
  'usdk',
  'usd',
]);

function isStableCoin(symbol) {
  const sym = (symbol || '').toLowerCase();
  return !sym ? false : STABLE_COINS.has(sym) || sym.includes('usd');
}

function toMarketEntry(listing) {
  if (!listing) return null;
  const quote = listing.quote?.USD || {};
  const symbol = (listing.symbol || '').toLowerCase();
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    ticker: (listing.symbol || '').toUpperCase(),
    symbol,
    price: asNum(quote.price),
    change: asNum(quote.percent_change_24h),
    marketCap: asNum(quote.market_cap),
    volume24h: asNum(quote.volume_24h),
    image: getLogoUrlById(listing.id),
  };
}

function pickPopular(markets) {
  const res = [];
  for (let i = 3; i < markets.length && res.length < 4; i++) {
    const entry = markets[i];
    if (!entry) continue;
    if (POPULAR_SKIP.has(entry.symbol)) continue;
    res.push(entry);
  }
  if (res.length < 4) {
    for (let i = 0; i < markets.length && res.length < 4; i++) {
      const entry = markets[i];
      if (!entry) continue;
      if (POPULAR_SKIP.has(entry.symbol)) continue;
      if (res.some((x) => x.symbol === entry.symbol)) continue;
      res.push(entry);
    }
  }
  return res.slice(0, 4).map((m) => ({
    name: m.name,
    ticker: m.ticker,
    price: m.price,
    change: m.change,
    image: m.image,
  }));
}

function pickLeaders(markets, direction = 'up', limit = 3) {
  const sorted = (markets || [])
    .filter((m) => m?.change != null && !isStableCoin(m.symbol))
    .sort((a, b) => (direction === 'up' ? b.change - a.change : a.change - b.change));
  const seen = new Set();
  const result = [];
  for (const entry of sorted) {
    if (seen.has(entry.symbol)) continue;
    seen.add(entry.symbol);
    result.push({
      name: entry.name,
      ticker: entry.ticker,
      price: entry.price,
      change: entry.change,
      image: entry.image,
    });
    if (result.length >= limit) break;
  }
  return result;
}

function aggregateFromMetrics(metrics, markets) {
  const quote = metrics?.quote?.USD || {};
  const dominanceBTC = asNum(metrics?.btc_dominance);
  const dominanceETH = asNum(metrics?.eth_dominance);
  const marketCapUSD = asNum(quote.total_market_cap);
  const volume24hUSD = asNum(quote.total_volume_24h);
  const volume24hChange = asNum(quote.total_volume_24h_yesterday_percentage_change);

  if (marketCapUSD != null && dominanceBTC != null && dominanceETH != null) {
    return { marketCapUSD, volume24hUSD, dominanceBTC, dominanceETH, volume24hChange };
  }

  const totals = (markets || []).reduce(
    (acc, entry) => {
      const cap = entry.marketCap;
      if (cap != null) {
        acc.total += cap;
        if (entry.symbol === 'btc') acc.btc += cap;
        if (entry.symbol === 'eth') acc.eth += cap;
      }
      return acc;
    },
    { total: 0, btc: 0, eth: 0 },
  );

  const dominanceFallback = (share) =>
    totals.total > 0 ? (share / totals.total) * 100 : null;

  return {
    marketCapUSD,
    volume24hUSD,
    dominanceBTC: dominanceBTC ?? dominanceFallback(totals.btc),
    dominanceETH: dominanceETH ?? dominanceFallback(totals.eth),
    volume24hChange,
  };
}

function deriveFearGreed(metrics, snapshot) {
  const explicitValue = asNum(snapshot?.value);
  if (explicitValue != null) {
    return {
      value: clamp(explicitValue, 0, 100),
      classification: normalizeClassification(
        snapshot?.classification
        || snapshot?.value_classification
        || classificationFromValue(explicitValue),
      ),
    };
  }

  const momentum = asNum(metrics?.quote?.USD?.total_market_cap_yesterday_percentage_change) ?? 0;
  const volumeMomentum =
    asNum(metrics?.quote?.USD?.total_volume_24h_yesterday_percentage_change) ?? 0;
  const btcDom = asNum(metrics?.btc_dominance) ?? 50;

  let value = 50;
  value += clamp(momentum, -10, 10) * 2; // +/-20
  value += clamp(volumeMomentum, -10, 10) * 1.2; // +/-12
  value += clamp(60 - btcDom, -15, 15); // favour меншу домінацію BTC
  value = clamp(Math.round(value), 0, 100);

  return {
    value,
    classification: classificationFromValue(value),
  };
}

function relativeLoad(entry) {
  const cap = asNum(entry?.marketCap);
  const volume = asNum(entry?.volume24h);
  if (!cap || !volume) return 0.12;
  return clamp(volume / cap, 0.02, 0.45);
}

function estimateBtcNetworkMetrics(entry) {
  const price = asNum(entry?.price);
  const load = relativeLoad(entry);
  const feeRateSatVb = 12 + load * 220; // 12..111 sat/vB
  const confMinutes = 7 + load * 40; // 7..25 хв
  const btcPerTx = (feeRateSatVb * 250) / 1e8;
  const feeUsd = price != null ? btcPerTx * price : null;

  const confLabel = confMinutes <= 18 ? '~10–20 хв' : '~20–40 хв';
  const feeLabel = `${Math.round(feeRateSatVb)} sat/vB`;

  return { confLabel, feeLabel, feeUsd };
}

function estimateEthNetworkMetrics(entry) {
  const price = asNum(entry?.price);
  const load = relativeLoad(entry);
  const gasPriceGwei = 14 + load * 260; // 14..131 Gwei
  const feeUsd = price != null ? gasPriceGwei * 1e-9 * 21000 * price : null;
  const gasPriceLabel = `${gasPriceGwei.toFixed(1)} Gwei`;
  const feeLabel = feeUsd != null ? `${feeUsd.toFixed(2)} $ за TX` : '—';
  return { gasPriceLabel, feeLabel };
}

function formatBtcFeeLabel(value) {
  const num = asNum(value);
  if (num == null) return null;
  return `${Math.round(num)} sat/vB`;
}

function formatEthGasLabel(value) {
  const num = asNum(value);
  if (num == null) return null;
  const precise = Number.isInteger(num) ? num : Number(num.toFixed(1));
  return `${precise} Gwei`;
}

function formatEthTxFeeLabel(value) {
  const num = asNum(value);
  if (num == null) return null;
  return `$${num.toFixed(2)} за TX`;
}

export async function loadAll() {
  const [listingsRaw, metricsRaw, fearGreedRaw] = await Promise.all([
    fetchListings(100).catch((err) => {
      console.warn('[loadAll] listings fallback', err);
      return [];
    }),
    fetchGlobalMetrics().catch((err) => {
      console.warn('[loadAll] global metrics fallback', err);
      return null;
    }),
    fetchFearGreedSnapshot().catch((err) => {
      console.warn('[loadAll] fear & greed snapshot fallback', err);
      return null;
    }),
  ]);

  const markets = Array.isArray(listingsRaw)
    ? listingsRaw.map(toMarketEntry).filter(Boolean)
    : [];

  const btc = markets.find((m) => m.symbol === 'btc') || {};
  const eth = markets.find((m) => m.symbol === 'eth') || {};

  const aggregates = aggregateFromMetrics(metricsRaw, markets);
  const fearGreed = deriveFearGreed(metricsRaw, fearGreedRaw);
  const fallbackBtcNetwork = estimateBtcNetworkMetrics(btc);
  const fallbackEthNetwork = estimateEthNetworkMetrics(eth);

  const [btcNet, ethNet] = await Promise.all([
    fetchBtcNetworkMetrics().catch((err) => {
      console.warn('[loadAll] btc network metrics fallback', err);
      return null;
    }),
    fetchEthNetworkMetrics({ ethPriceUsd: eth.price }).catch((err) => {
      console.warn('[loadAll] eth network metrics fallback', err);
      return null;
    }),
  ]);

  const btcFeeLabel = formatBtcFeeLabel(btcNet?.satVb) || fallbackBtcNetwork.feeLabel;
  const btcConfLabel = btcNet?.confLabel || fallbackBtcNetwork.confLabel;

  const effectiveEthFeeUsd =
    ethNet?.feeUsd != null
      ? asNum(ethNet.feeUsd)
      : (asNum(ethNet?.gwei) != null && asNum(eth?.price) != null)
        ? (asNum(ethNet.gwei) * 21000 * asNum(eth?.price)) / 1e9
        : null;

  const ethGasPriceLabel = formatEthGasLabel(ethNet?.gwei) || fallbackEthNetwork.gasPriceLabel;
  const ethFeeLabel =
    formatEthTxFeeLabel(effectiveEthFeeUsd) || fallbackEthNetwork.feeLabel;

  return {
    marketCapUSD: aggregates.marketCapUSD,
    volume24hUSD: aggregates.volume24hUSD,
    volume24hChange: aggregates.volume24hChange,
    dominanceBTC: aggregates.dominanceBTC,
    dominanceETH: aggregates.dominanceETH,
    fearGreed: fearGreed.value,
    classification: fearGreed.classification,

    btc: {
      image: btc.image,
      price: btc.price,
      fee: btcFeeLabel,
      conf: btcConfLabel,
    },

    eth: {
      image: eth.image,
      price: eth.price,
      gasPrice: ethGasPriceLabel,
      transactionFee: ethFeeLabel,
    },

    popular: pickPopular(markets),
    leadersUp: pickLeaders(markets, 'up'),
    leadersDown: pickLeaders(markets, 'down'),
  };
}
