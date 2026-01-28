export const OPTIONS_EXCHANGES = ['deribit', 'okx'] as const;
export type OptionsExchange = (typeof OPTIONS_EXCHANGES)[number];

export const OPTIONS_SYMBOLS = ['BTC', 'ETH', 'SOL'] as const;
export type OptionsSymbol = (typeof OPTIONS_SYMBOLS)[number];

export const SIGNAL_TYPES = [
  'VRP_DIVERGENCE',
  'CALENDAR_DISLOCATION',
  'SMILE_CONVEXITY',
  'CROSS_EXCHANGE_IV',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_DIRECTIONS = [
  'LONG_VOL',
  'SHORT_VOL',
  'RV_GT_IV',
  'IV_GT_RV',
  'BUY_WINGS',
  'SELL_WINGS',
] as const;
export type SignalDirection = (typeof SIGNAL_DIRECTIONS)[number];

export const SIGNAL_STATUSES = ['NEW', 'ACTIVE', 'CLOSED', 'INVALID'] as const;
export type SignalStatus = (typeof SIGNAL_STATUSES)[number];

export const EXPIRY_RANGES = ['7d', '14d', '30d', '90d'] as const;
export type ExpiryRange = (typeof EXPIRY_RANGES)[number];

export interface OptionsSignal {
  id: string;
  created_at: string;
  exchange: string;
  symbol: string;
  expiry: string;
  signal_type: string;
  direction: string;
  severity: number;
  score: number;
  summary: string;
  details: Record<string, any> | null;
  status: string;
  link: string | null;
}

export interface IVSurfaceSnapshot {
  id: string;
  created_at: string;
  exchange: string;
  symbol: string;
  expiry: string;
  atm_iv: number | null;
  iv_10d_put: number | null;
  iv_25d_put: number | null;
  iv_50d: number | null;
  iv_25d_call: number | null;
  iv_10d_call: number | null;
  skew_25d: number | null;
  curvature_10d: number | null;
  raw: Record<string, any> | null;
}

export interface RealizedVolSnapshot {
  id: string;
  created_at: string;
  symbol: string;
  rv_7d: number | null;
  rv_14d: number | null;
  rv_30d: number | null;
  rv_60d: number | null;
  source: string | null;
  raw: Record<string, any> | null;
}

export interface OptionsFilters {
  symbol: OptionsSymbol | 'all';
  exchange: OptionsExchange | 'all';
  expiryRange: ExpiryRange;
  signalTypes: SignalType[];
  minSeverity: number;
  search: string;
}
