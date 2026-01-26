import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

type CrossRow = {
  exchange: string;
  funding_pct?: number | null;
  funding_rate?: number | null;
  next?: string | null;
};

type FundingAnomalyRow = {
  id: string;
  created_at: string | null;
  symbol: string;
  trigger_exchange: string;
  trigger_funding: number;
  next_funding_ts: string;
  pre_window_min?: number | null;
  threshold?: number | null;
  spread_max_min?: number | null;
  cross_data?: CrossRow[] | any;
  status?: string | null;
};

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

function asPercentNumber(v: number | null | undefined): number | null {
  if (v === null || v === undefined || Number.isNaN(v)) return null;
  // эвристика: доля обычно <= 0.2, процент чаще > 0.2
  return Math.abs(v) <= 0.2 ? v * 100 : v;
}

function asPercentDisplay(v: number | null | undefined): string {
  const pct = asPercentNumber(v);
  if (pct === null) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(3)}%`;
}

export default function FundingSymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [row, setRow] = useState<FundingAnomalyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!symbol) return;

      try {
        setLoading(true);
        setError(null);

        // Берём самую свежую аномалию по символу
        const { data, error: fetchError } = await supabase
          .from('funding_anomalies')
          .select('*')
          .eq('symbol', symbol)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        const latest = (data && data[0]) ? (data[0] as FundingAnomalyRow) : null;
        setRow(latest);
      } catch (err: any) {
        console.error('Error fetching funding anomaly:', err);
        setError(err?.message || 'Failed to load funding anomaly');
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, [symbol]);

  const crossRows: CrossRow[] = useMemo(() => {
    if (!row) return [];
    const cd: any = row.cross_data;

    if (Array.isArray(cd)) return cd as CrossRow[];
    // если вдруг прилетело объектом — попробуем привести
    if (cd && typeof cd === 'object') {
      return Object.keys(cd).map((k) => ({
        exchange: k,
        ...(cd[k] || {}),
      }));
    }
    return [];
  }, [row]);

  const stats = useMemo(() => {
    const valid = crossRows
      .map((r) => {
        const v = (r.funding_rate ?? r.funding_pct) as number | null | undefined;
        const pct = asPercentNumber(v);
        return pct === null ? null : { exchange: r.exchange, pct };
      })
      .filter(Boolean) as { exchange: string; pct: number }[];

    if (valid.length === 0) return null;

    const max = valid.reduce((a, b) => (a.pct > b.pct ? a : b));
    const min = valid.reduce((a, b) => (a.pct < b.pct ? a : b));
    return {
      spread: max.pct - min.pct,
      maxRate: max.pct,
      minRate: min.pct,
      bestLongExchange: min.exchange,
      bestShortExchange: max.exchange,
    };
  }, [crossRows]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading funding anomaly...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/funding">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Funding Monitor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!row) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                No data
              </CardTitle>
              <CardDescription>Нет аномалий для {symbol}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/funding">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Funding Monitor
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const triggerFundingPct = asPercentNumber(row.trigger_funding);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link to="/funding">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              {row.symbol}
            </h1>
            <p className="text-muted-foreground">
              Latest anomaly from <span className="font-mono">{row.trigger_exchange}</span> • Next funding: {formatUtc(row.next_funding_ts)}
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trigger</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Badge variant="outline" className="uppercase">
                {row.trigger_exchange}
              </Badge>
              <div className={cn('text-2xl font-bold font-mono', (triggerFundingPct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                {triggerFundingPct === null ? '—' : `${triggerFundingPct >= 0 ? '+' : ''}${triggerFundingPct.toFixed(3)}%`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spread (max-min)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {asPercentDisplay(row.spread_max_min ?? null)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best For</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats ? (
                <>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Long:</span>
                    <Badge variant="outline">{stats.bestLongExchange.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Short:</span>
                    <Badge variant="outline">{stats.bestShortExchange.toUpperCase()}</Badge>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No cross-exchange rates</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-mono">{formatUtc(row.created_at)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Exchange cards from cross_data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funding rates by exchange</CardTitle>
            <CardDescription>Из поля <span className="font-mono">cross_data</span> в funding_anomalies</CardDescription>
          </CardHeader>
          <CardContent>
            {crossRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No cross-exchange data for {row.symbol}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {crossRows.map((r) => {
                  const v = (r.funding_rate ?? r.funding_pct) as number | null | undefined;
                  const pct = asPercentNumber(v);
                  const isMax = stats && pct !== null && pct === stats.maxRate;
                  const isMin = stats && pct !== null && pct === stats.minRate;

                  return (
                    <Card
                      key={r.exchange}
                      className={cn(
                        'border-2',
                        isMax && 'border-green-500 bg-green-500/5',
                        isMin && 'border-red-500 bg-red-500/5',
                        !isMax && !isMin && 'border-border'
                      )}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium uppercase flex items-center justify-between">
                          {r.exchange}
                          {isMax && <Badge variant="default" className="bg-green-500">Max</Badge>}
                          {isMin && <Badge variant="destructive">Min</Badge>}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div
                          className={cn(
                            'text-3xl font-bold font-mono',
                            pct === null
                              ? 'text-muted-foreground'
                              : pct >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          )}
                        >
                          {pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(3)}%`}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Next: </span>
                            {r.next ? r.next : '—'}
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

        {/* Phase 2 placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historical Funding Rates</CardTitle>
            <CardDescription>Time series chart (Phase 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground">
              Будет добавлено позже: история funding по времени.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
