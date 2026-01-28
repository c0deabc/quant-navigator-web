import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FundingFilters } from '@/components/funding/FundingFilters';
import { Loader2, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupportedExchange, QuoteFilter } from '@/types/funding';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 20;

// Достаём побольше и фильтруем локально — так мы:
// 1) не зависим от “единиц измерения” funding в БД (0.003 vs 0.3)
// 2) не падаем на отсутствии каких-то колонок
const FETCH_LIMIT = 500;

type FundingCrossItem = {
  exchange?: string;
  funding?: number | null;
  next?: string | null;
  next_funding_ts?: string | null;
  next_funding_time?: string | null;
};

type FundingAnomalyRow = {
  id: string;
  created_at?: string | null;

  symbol?: string | null;

  // триггерные поля (как в твоей таблице funding_anomalies)
  trigger_exchange?: string | null;
  trigger_funding?: number | null;
  next_funding_ts?: string | null;

  // может быть, если добавлял
  quote?: string | null;

  // cross-exchange массив (jsonb)
  cross?: FundingCrossItem[] | null;

  // возможно есть готовый spread
  spread?: number | null;
  spread_pct?: number | null;

  status?: string | null;
};

function normalizeRateToPercent(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;

  // Эвристика:
  // - если значение похоже на дробь (0.003 = 0.3%), переводим в %
  // - если значение уже похоже на проценты (0.3 = 0.3% или 1.2 = 1.2%), оставляем как есть
  // В реальности аномальные funding обычно в диапазоне +-5%.
  const abs = Math.abs(v);

  // 0.003, 0.01, 0.02 — почти наверняка “доля”
  if (abs > 0 && abs < 0.05) return v * 100;

  // 0.3, 1.4, 2.5 — уже похоже на проценты
  return v;
}

function asPercentDisplayFromRaw(vRaw: number | null | undefined): string {
  const v = normalizeRateToPercent(vRaw);
  if (v === null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(3)}%`;
}

function formatUtc(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return (
    d.toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' UTC'
  );
}

function getQuoteFromSymbol(symbol: string | null | undefined): 'USDT' | 'USD' | 'USDC' | null {
  if (!symbol) return null;
  const s = symbol.toUpperCase();
  if (s.endsWith('USDT')) return 'USDT';
  if (s.endsWith('USDC')) return 'USDC';
  if (s.endsWith('USD')) return 'USD';
  return null;
}

function computeSpreadFromCross(cross?: FundingCrossItem[] | null): number | null {
  if (!cross || cross.length === 0) return null;
  const ratesPct = cross
    .map((c) => normalizeRateToPercent(c.funding ?? null))
    .filter((x): x is number => x !== null);

  if (ratesPct.length < 2) return null;
  return Math.max(...ratesPct) - Math.min(...ratesPct);
}

function getNextFundingTs(row: FundingAnomalyRow): string | null {
  // основной вариант (как у тебя в not-null constraint)
  if (row.next_funding_ts) return row.next_funding_ts;

  // fallback: пробуем вытащить из cross для trigger_exchange
  const cross = row.cross || [];
  const trig = (row.trigger_exchange || '').toLowerCase();
  const item = cross.find((c) => (c.exchange || '').toLowerCase() === trig);
  return (item?.next_funding_ts || item?.next_funding_time || item?.next || null) ?? null;
}

export default function FundingMonitor() {
  const [triggerExchange, setTriggerExchange] = useState<SupportedExchange>('bybit');
  const [threshold, setThreshold] = useState(0.3);
  const [showDirection, setShowDirection] = useState<'positive' | 'negative' | 'both'>('both');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);

  const [rawRows, setRawRows] = useState<FundingAnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    let rows = [...rawRows];

    // symbol search
    const s = searchSymbol.trim().toUpperCase();
    if (s.length > 0) {
      rows = rows.filter((r) => (r.symbol || '').toUpperCase().includes(s));
    }

    // quote filter (если в БД нет quote — вычислим из suffix)
    if (quoteFilter !== 'all') {
      const q = quoteFilter.toUpperCase();
      rows = rows.filter((r) => {
        const rowQ = (r.quote || getQuoteFromSymbol(r.symbol || ''))?.toUpperCase() || '';
        return rowQ === q;
      });
    }

    // threshold + direction по trigger_funding (нормализуем к %)
    rows = rows.filter((r) => {
      const v = normalizeRateToPercent(r.trigger_funding ?? null);
      if (v === null) return false;

      if (showDirection === 'positive') return v >= threshold;
      if (showDirection === 'negative') return v <= -threshold;
      return v >= threshold || v <= -threshold;
    });

    return rows;
  }, [rawRows, searchSymbol, quoteFilter, showDirection, threshold]);

  const totalCount = filteredRows.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      // ВАЖНО: возвращаемся к реальной таблице
      const { data, error: fetchError } = await supabase
        .from('funding_anomalies')
        .select('*')
        .eq('trigger_exchange', triggerExchange)
        .order('created_at', { ascending: false })
        .limit(FETCH_LIMIT);

      if (fetchError) throw fetchError;

      setRawRows((data as any) || []);
    } catch (e: any) {
      console.error('FundingMonitor fetch error:', e);
      setError(e?.message || 'Failed to load funding anomalies');
      setRawRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExchange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, triggerExchange]);

  useEffect(() => {
    setPage(0);
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            Funding Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Аномальный funding на триггерной бирже + сравнение по остальным (источник: funding_anomalies)
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Filters</span>
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardTitle>
            <CardDescription>
              Threshold: funding rate ≥ +{threshold}% or ≤ -{threshold}% (pre-window 30m)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FundingFilters
              triggerExchange={triggerExchange}
              setTriggerExchange={setTriggerExchange}
              threshold={threshold}
              setThreshold={setThreshold}
              showDirection={showDirection}
              setShowDirection={setShowDirection}
              searchSymbol={searchSymbol}
              setSearchSymbol={setSearchSymbol}
              quoteFilter={quoteFilter}
              setQuoteFilter={setQuoteFilter}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              onRefresh={refetch}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Funding Anomalies
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({totalCount} found)</span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
                <p>{error}</p>
              </div>
            ) : pageRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No anomalies found with current filters. Data will appear when funding_anomalies is populated.</p>
              </div>
            ) : (
              <>
                <div className="w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-3 pr-4">Symbol</th>
                        <th className="text-left py-3 pr-4">Trigger</th>
                        <th className="text-left py-3 pr-4">Trigger funding</th>
                        <th className="text-left py-3 pr-4">Next funding</th>
                        <th className="text-left py-3 pr-4">Spread</th>
                        <th className="text-left py-3 pr-4">Created</th>
                        <th className="text-right py-3"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((r) => {
                        const symbol = (r.symbol || '').toUpperCase();
                        const trig = (r.trigger_exchange || '').toUpperCase();
                        const nextTs = getNextFundingTs(r);
                        const spreadPct =
                          normalizeRateToPercent(r.spread_pct ?? null) ??
                          (r.spread !== null && r.spread !== undefined
                            ? normalizeRateToPercent(r.spread)
                            : computeSpreadFromCross(r.cross));

                        return (
                          <tr key={r.id} className="border-b hover:bg-muted/40">
                            <td className="py-3 pr-4 font-mono font-semibold">{symbol || '—'}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className="uppercase">
                                {trig || '—'}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 font-mono">{asPercentDisplayFromRaw(r.trigger_funding)}</td>
                            <td className="py-3 pr-4">{formatUtc(nextTs)}</td>
                            <td className="py-3 pr-4 font-mono">
                              {spreadPct !== null && spreadPct !== undefined ? `${spreadPct.toFixed(3)}%` : '—'}
                            </td>
                            <td className="py-3 pr-4">{formatUtc(r.created_at || null)}</td>
                            <td className="py-3 text-right">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/funding/${encodeURIComponent(symbol)}`}>Details</Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) pageNum = i;
                          else if (page < 3) pageNum = i;
                          else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                          else pageNum = page - 2 + i;

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setPage(pageNum)}
                                isActive={page === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
