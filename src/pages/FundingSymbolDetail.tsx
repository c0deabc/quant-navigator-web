import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

import AppLayout from '@/components/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORTED_EXCHANGES } from '@/types/funding';

/**
 * This page shows a cross-exchange comparison for a given symbol.
 * IMPORTANT: Our backend stores anomalies in `public.funding_anomalies` (one row per anomaly),
 * with a JSONB array column `cross` containing per-exchange funding values.
 *
 * Lovable accidentally changed this page to query `funding_snapshot`.
 * That table does not exist in your Supabase project, so we query `funding_anomalies` again.
 */

type CrossEntry = {
  exchange: string;
  funding?: number | null; // decimal, e.g. -0.0145 = -1.45%
  next?: string | null;    // ISO or human-readable
  next_funding_ts?: string | null;
  funding_rate?: number | null;
  next_funding_time?: string | null;
};

type FundingAnomalyRow = {
  id: string;
  created_at: string;
  symbol: string;
  trigger_exchange: string;
  trigger_funding: number;
  next_funding_ts: string;
  pre_window_mins: number;
  threshold: number;
  spread: number | null;
  cross: any;
  status?: string | null;
};

type FundingSnapshotLite = {
  exchange: string;
  funding_rate: number | null;
  next_funding_time: string | null;
  updated_at: string | null;
};

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '—';
  return `${(rate * 100).toFixed(3)}%`;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '—';

  // If it's a nice human string already, keep it
  // (our bot sometimes stores "2026-01-26 19:00:00 UTC")
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return value;

  return asDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function normalizeCross(cross: any): CrossEntry[] {
  if (!cross) return [];
  if (Array.isArray(cross)) return cross as CrossEntry[];

  // Sometimes JSONB might arrive as object keyed by exchange
  if (typeof cross === 'object') {
    return Object.entries(cross).map(([exchange, v]) => ({
      exchange,
      ...(typeof v === 'object' && v ? (v as any) : {}),
    }));
  }

  return [];
}

export default function FundingSymbolDetail() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const symbol = (rawSymbol ?? '').toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anomaly, setAnomaly] = useState<FundingAnomalyRow | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Fetch the latest anomaly for this symbol
        const { data, error } = await supabase
          .from('funding_anomalies')
          .select('*')
          .eq('symbol', symbol)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!alive) return;

        if (error) {
          setError(error.message);
          setAnomaly(null);
        } else {
          setAnomaly((data?.[0] as any) ?? null);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Unknown error');
        setAnomaly(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (symbol) load();

    return () => {
      alive = false;
    };
  }, [symbol]);

  const snapshots: FundingSnapshotLite[] = useMemo(() => {
    const row = anomaly;
    if (!row) return [];

    const crossRaw = (row as any).cross ?? (row as any).cross_data ?? (row as any).exchanges ?? null;
    const cross = normalizeCross(crossRaw);

    const mapped = cross.map((x) => {
      const funding =
        (x.funding_rate ?? x.funding ?? null) as number | null;

      const next =
        (x.next_funding_time ?? x.next_funding_ts ?? x.next ?? null) as string | null;

      return {
        exchange: (x.exchange ?? '').toLowerCase(),
        funding_rate: funding,
        next_funding_time: next,
        updated_at: row.created_at ?? null,
      } satisfies FundingSnapshotLite;
    });

    // Ensure we at least return entries for SUPPORTED_EXCHANGES if available
    if (Array.isArray(SUPPORTED_EXCHANGES) && SUPPORTED_EXCHANGES.length > 0) {
      const byEx = new Map(mapped.map((m) => [m.exchange, m]));
      return SUPPORTED_EXCHANGES.map((ex) => byEx.get(ex) ?? { exchange: ex, funding_rate: null, next_funding_time: null, updated_at: row.created_at ?? null });
    }

    return mapped;
  }, [anomaly]);

  const stats = useMemo(() => {
    const rates = snapshots
      .map((s) => (typeof s.funding_rate === 'number' ? s.funding_rate : null))
      .filter((v): v is number => v !== null && !Number.isNaN(v));

    if (rates.length === 0) return null;

    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);

    const bestLongExchange = snapshots.find((s) => s.funding_rate === maxRate)?.exchange ?? '—';
    const bestShortExchange = snapshots.find((s) => s.funding_rate === minRate)?.exchange ?? '—';

    return { maxRate, minRate, bestLongExchange, bestShortExchange };
  }, [snapshots]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="gap-2">
                <Link to="/funding">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">{symbol}</h1>
              {anomaly?.trigger_exchange && (
                <Badge variant="secondary" className="uppercase">
                  Trigger: {anomaly.trigger_exchange}
                </Badge>
              )}
              {anomaly?.status && (
                <Badge variant="outline" className="uppercase">
                  {anomaly.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Cross-exchange view based on the latest row in <span className="font-mono">public.funding_anomalies</span>
            </p>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/40">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div className="text-lg font-medium">Error</div>
              <div className="mt-1 text-sm text-muted-foreground">{error}</div>
              <div className="mt-6">
                <Button asChild>
                  <Link to="/funding">Back to Funding Monitor</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !anomaly ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>No anomaly found for {symbol}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trigger funding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn('text-2xl font-bold font-mono', anomaly.trigger_funding >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {formatRate(anomaly.trigger_funding)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 uppercase">{anomaly.trigger_exchange}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Next funding</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-mono">{formatTime(anomaly.next_funding_ts)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Pre-window: {anomaly.pre_window_mins}m</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Threshold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{(anomaly.threshold * 100).toFixed(3)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Rule: |funding| ≥ threshold</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Spread (max-min)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">{formatRate(anomaly.spread)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Across exchanges</p>
                </CardContent>
              </Card>
            </div>

            {/* Best long/short */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Max Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono text-green-500">{formatRate(stats.maxRate)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.bestLongExchange.toUpperCase()}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Min Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold font-mono text-red-500">{formatRate(stats.minRate)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{stats.bestShortExchange.toUpperCase()}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Exchange Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funding Rates by Exchange</CardTitle>
                <CardDescription>Values are read from the anomaly row’s JSONB cross-exchange payload</CardDescription>
              </CardHeader>
              <CardContent>
                {snapshots.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                    <p>No cross-exchange data available for {symbol}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {(SUPPORTED_EXCHANGES?.length ? SUPPORTED_EXCHANGES : snapshots.map((s) => s.exchange)).map((exchange) => {
                      const snapshot = snapshots.find((s) => s.exchange === exchange) ?? null;
                      const isMax = stats && snapshot?.funding_rate === stats.maxRate;
                      const isMin = stats && snapshot?.funding_rate === stats.minRate;

                      return (
                        <Card
                          key={exchange}
                          className={cn(
                            'border-2',
                            isMax && 'border-green-500 bg-green-500/5',
                            isMin && 'border-red-500 bg-red-500/5',
                            !isMax && !isMin && 'border-border'
                          )}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium uppercase flex items-center justify-between">
                              {exchange}
                              {isMax && <Badge variant="default" className="bg-green-500">Max</Badge>}
                              {isMin && <Badge variant="destructive">Min</Badge>}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div
                              className={cn(
                                'text-3xl font-bold font-mono',
                                snapshot?.funding_rate === null || snapshot?.funding_rate === undefined
                                  ? 'text-muted-foreground'
                                  : snapshot.funding_rate >= 0
                                  ? 'text-green-500'
                                  : 'text-red-500'
                              )}
                            >
                              {formatRate(snapshot?.funding_rate ?? null)}
                            </div>
                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                              <div>
                                <span className="font-medium">Next: </span>
                                {formatTime(snapshot?.next_funding_time ?? null)}
                              </div>
                              <div>
                                <span className="font-medium">Created: </span>
                                {formatTime(snapshot?.updated_at ?? null)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Historical Funding Rates</CardTitle>
                <CardDescription>Coming later (time series)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  <p>Phase 2: store a funding time series table and render charts here.</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
