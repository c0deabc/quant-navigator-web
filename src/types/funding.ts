// Funding Monitor Types

export interface FundingSnapshot {
  id: string;
  exchange: string;
  symbol: string;
  quote: string | null;
  funding_rate: number;
  next_funding_time: string | null;
  updated_at: string;
}

export interface FundingSeries {
  id: string;
  exchange: string;
  symbol: string;
  ts: string;
  funding_rate: number;
}

export interface FundingAnomaly {
  symbol: string;
  triggerExchange: string;
  triggerRate: number;
  nextFundingTime: string | null;
  updatedAt: string;
  direction: 'positive' | 'negative';
}

export interface CrossExchangeComparison {
  exchange: string;
  fundingRate: number | null;
  nextFundingTime: string | null;
  updatedAt: string | null;
}

export interface FundingStats {
  spread: number;
  maxRate: number;
  minRate: number;
  bestLongExchange: string;
  bestShortExchange: string;
}

export const SUPPORTED_EXCHANGES = ['bybit', 'binance', 'okx', 'mexc', 'bitget'] as const;
export type SupportedExchange = typeof SUPPORTED_EXCHANGES[number];

export const QUOTE_FILTERS = ['all', 'USDT', 'USD', 'USDC'] as const;
export type QuoteFilter = typeof QUOTE_FILTERS[number];
