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

type FundingAnomalyRow = {
  id: string;
  created_at: string | null;
  symbol: string;
  trigger_exchange: string;
  trigger_funding: number; // обычно доля (например -0.00711), но может быть и %
  next_funding_ts: string; // timestamptz (NOT NULL у тебя)
  pre_window_min?: number | null;
  threshold?: number | null; // обычно доля (0.003)
  spread_max_min?: number | null; // обычно доля
  cross_data?: any; // jsonb
  status?: string | null;
};

function asPercentDisplay(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  // эвристика: funding как доля обычно << 1.0, как процент обычно ~0.1..2.0
  const pct = Math.abs(v) <= 0.2 ? v * 100 : v;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(3)}%`;
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

export default function FundingMonitor() {
  // Filters (оставляем UI как было)
  const [triggerExchange, setTriggerExchange] = useState<SupportedExchange>('bybit');
  const [threshold, setThreshold] = useState(0.3); // в %, как в UI
  const [showDirection, setShowDirection] = useState<'positive' | 'negative' | 'both'>('both');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all'); // пока не используем (нет поля quote)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);

  // Data
  const [rows, setRows] = useState<FundingAnomalyRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const thresholdFraction = useMemo(() => threshold / 100, [threshold]); // 0.3% -> 0.003

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      let q = supabase
        .from('funding_anomalies')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      // exchange filter (в таблице это text)
      if (triggerExchange) {
        q = q.eq('trigger_exchange', triggerExchange);
      }

      // symbol search
      const s = searchSymbol.trim().toUpperCase();
      if (s.length > 0) {
        q = q.ilike('symbol', `%${s}%`);
      }

      // direction + threshold filter по trigger_funding (у тебя NOT NULL)
      // В БД trigger_funding хранится как ДОЛЯ (например -0.00711), а UI threshold в %
      // Поэтому сравниваем с thresholdFraction
      if (showDirection === 'positive') {
        q = q.gte('trigger_funding', thresholdFraction);
      } else if (showDirection === 'negative') {
        q = q.lte('trigger_funding', -thresholdFraction);
      } else {
        // both: |x| >= threshold -> (x>=t OR x<=-t)
        // PostgREST OR syntax
        q = q.or(`trigger_funding.gte.${thresholdFraction},trigger_funding.lte.${-thresholdFraction}`);
      }

      // status filter, если колонка есть
      // (если её нет — Supabase вернёт ошибку; поэтому делаем мягко: не фильтруем)
      // Для стабильности: лучше НЕ трогать, т.к. у тебя схема могла быть без status на ранних шагах.
      const { data, error: fetchError, count } = await q;

      if (fetchError) throw fetchError;

      setRows((data || []) as FundingAnomalyRow[]);
      setTotalCount(count || 0);
    } catch (e: any) {
      console.error('FundingMonitor fetch error:', e);
      setError(e?.message || 'Failed to load funding anomalies');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // initial & when filters change
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter, page]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetch();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, triggerExchange, threshold, showDirection, searchSymbol, quoteFilter, page]);

  // Reset page when filters change (кроме page)
  useEffect(() => {
    setPage(0);
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter]);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            Funding Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Аномальный funding на триггерной бирже + сравнение на остальных (данные из funding_anomalies)
          </p>
        </div>

        {/* Filters */}
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
              Threshold: funding rate ≥ +{threshold}% or ≤ -{threshold}% triggers an anomaly (pre-window 30m)
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

        {/* Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Funding Anomalies
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({totalCount} found)</span>
              )}
            </CardTitle>
            <CardDescription>
              Таблица читает <span className="font-mono">public.funding_anomalies</span>
            </CardDescription>
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
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>Пока нет аномалий в выбранных фильтрах.</p>
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
                      {rows.map((r) => {
                        const spreadPct = r.spread_max_min ?? null;
                        return (
                          <tr key={r.id} className="border-b hover:bg-muted/40">
                            <td className="py-3 pr-4 font-mono font-semibold">{r.symbol}</td>
                            <td className="py-3 pr-4">
                              <Badge variant="outline" className="uppercase">
                                {String(r.trigger_exchange || '').toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 font-mono">
                              {asPercentDisplay(r.trigger_funding)}
                            </td>
                            <td className="py-3 pr-4">{formatUtc(r.next_funding_ts)}</td>
                            <td className="py-3 pr-4 font-mono">{asPercentDisplay(spreadPct)}</td>
                            <td className="py-3 pr-4">{formatUtc(r.created_at)}</td>
                            <td className="py-3 text-right">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/funding/${encodeURIComponent(r.symbol)}`}>
                                  Details
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
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
