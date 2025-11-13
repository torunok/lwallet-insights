export const state = {
  date: new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' }),
  btc: { price: 70123, conf: '~10 хв', fee: '18 sat/vB' },
  eth: { price: 3821,  conf: '~14 сек', fee: '18 gwei' },

  // --- Сторінка 2:
  popular: [
    { ticker: 'BTC', price: 70123, change: +1.8 },
    { ticker: 'ETH', price: 3821, change: -0.6 },
    { ticker: 'SOL', price: 158.2, change: +3.1 },
    { ticker: 'USDT', price: 1.00, change: +0.0 },
    { ticker: 'BNB', price: 602.4, change: +0.4 },
  ],
  leadersUp: [
    { ticker: 'ORDI', price: 70.2, change: +18.5 },
    { ticker: 'PYTH', price: 0.48, change: +14.2 },
    { ticker: 'ENA',  price: 0.96, change: +12.7 },
  ],
  leadersDown: [
    { ticker: 'TIA',  price: 8.21, change: -9.3 },
    { ticker: 'ARK',  price: 0.89, change: -7.8 },
    { ticker: 'DOGE', price: 0.12, change: -6.1 },
  ],
  fearGreed: 62, // 0..100

  // --- НОВЕ: для правого стовпчика сторінки 1
  marketCapUSD: 2_450_000_000_000, // глобальна капа
  volume24hUSD: 145_000_000_000,   // обсяг за 24h
  dominanceBTC: 52.7,              // %
  dominanceETH: 17.8,              // %
};
