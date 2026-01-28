import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FundingFilters } from '@/components/funding/FundingFilters';
import { Loader2, DollarSign, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupportedExchange, QuoteFilter, FundingSnapshot, SUPPORTED_EXCHANGES } from '@/types/funding';
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

function asPercentDisplay(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
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

type AnomalyRow = FundingSnapshot & {
  crossData?: FundingSnapshot[];
  spread?: number;
};

export default function FundingMonitor() {
  const [triggerExchange, setTriggerExchange] = useState<SupportedExchange>('bybit');
  const [threshold, setThreshold] = useState(0.3);
  const [showDirection, setShowDirection] = useState<'positive' | 'negative' | 'both'>('both');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query anomalies from trigger exchange
      let q = supabase
        .from('funding_snapshot')
        .select('*', { count: 'exact' })
        .eq('exchange', triggerExchange)
        .order('updated_at', { ascending: false });

      // Symbol search
      const s = searchSymbol.trim().toUpperCase();
      if (s.length > 0) {
        q = q.ilike('symbol', `%${s}%`);
      }

      // Quote filter
      if (quoteFilter !== 'all') {
        q = q.eq('quote', quoteFilter.toUpperCase());
      }

      // Direction + threshold filter
      if (showDirection === 'positive') {
        q = q.gte('funding_rate', threshold);
      } else if (showDirection === 'negative') {
        q = q.lte('funding_rate', -threshold);
      } else {
        q = q.or(`funding_rate.gte.${threshold},funding_rate.lte.${-threshold}`);
      }

      const { data: anomalies, error: fetchError, count } = await q
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      if (!anomalies || anomalies.length === 0) {
        setRows([]);
        setTotalCount(count || 0);
        return;
      }

      // Fetch cross-exchange data for anomaly symbols
      const symbols = [...new Set(anomalies.map((a) => a.symbol))];
      const { data: crossData, error: crossError } = await supabase
        .from('funding_snapshot')
        .select('*')
        .in('symbol', symbols)
        .in('exchange', SUPPORTED_EXCHANGES);

      if (crossError) throw crossError;

      // Group cross data by symbol
      const crossMap = new Map<string, FundingSnapshot[]>();
      (crossData || []).forEach((item) => {
        const existing = crossMap.get(item.symbol) || [];
        existing.push(item);
        crossMap.set(item.symbol, existing);
      });

      // Build rows with cross data and spread
      const enrichedRows: AnomalyRow[] = anomalies.map((a) => {
        const cross = crossMap.get(a.symbol) || [];
        const rates = cross.map((c) => c.funding_rate).filter((r): r is number => r !== null);
        const spread = rates.length > 1 ? Math.max(...rates) - Math.min(...rates) : undefined;
        return { ...a, crossData: cross, spread };
      });

      setRows(enrichedRows);
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

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter, page]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, triggerExchange, threshold, showDirection, searchSymbol, quoteFilter, page]);

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
            Detect funding rate anomalies and compare across exchanges
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
              Threshold: funding rate ≥ +{threshold}% or ≤ -{threshold}%
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
            ) : rows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No anomalies found with current filters. Data will appear when funding_snapshot is populated.</p>
              </div>
            ) : (
              <>
                <div className="w-full overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="text-left py-3 pr-4">Symbol</th>
                        <th className="text-left py-3 pr-4">Exchange</th>
                        <th className="text-left py-3 pr-4">Funding Rate</th>
                        <th className="text-left py-3 pr-4">Next Funding</th>
                        <th className="text-left py-3 pr-4">Spread</th>
                        <th className="text-left py-3 pr-4">Updated</th>
                        <th className="text-right py-3"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40">
                          <td className="py-3 pr-4 font-mono font-semibold">{r.symbol}</td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline" className="uppercase">
                              {r.exchange.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 font-mono">
                            {asPercentDisplay(r.funding_rate)}
                          </td>
                          <td className="py-3 pr-4">{formatUtc(r.next_funding_time)}</td>
                          <td className="py-3 pr-4 font-mono">{r.spread !== undefined ? asPercentDisplay(r.spread) : '—'}</td>
                          <td className="py-3 pr-4">{formatUtc(r.updated_at)}</td>
                          <td className="py-3 text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/funding/${encodeURIComponent(r.symbol)}`}>
                                Details
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
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
