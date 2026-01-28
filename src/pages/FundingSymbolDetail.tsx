import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { FundingSnapshot, SUPPORTED_EXCHANGES } from '@/types/funding';

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

function asPercentDisplay(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(3)}%`;
}

export default function FundingSymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const [snapshots, setSnapshots] = useState<FundingSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbol) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('funding_snapshot')
          .select('*')
          .eq('symbol', symbol)
          .in('exchange', SUPPORTED_EXCHANGES)
          .order('exchange');

        if (fetchError) throw fetchError;

        setSnapshots(data || []);
      } catch (err: any) {
        console.error('Error fetching funding data:', err);
        setError(err?.message || 'Failed to load funding data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  const stats = useMemo(() => {
    const rates = snapshots
      .map((s) => ({ exchange: s.exchange, rate: s.funding_rate }))
      .filter((r): r is { exchange: string; rate: number } => r.rate !== null);

    if (rates.length === 0) return null;

    const max = rates.reduce((a, b) => (a.rate > b.rate ? a : b));
    const min = rates.reduce((a, b) => (a.rate < b.rate ? a : b));

    return {
      spread: max.rate - min.rate,
      maxRate: max.rate,
      minRate: min.rate,
      bestLongExchange: min.exchange,
      bestShortExchange: max.exchange,
    };
  }, [snapshots]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading funding data...</p>
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

  if (snapshots.length === 0) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                No Data
              </CardTitle>
              <CardDescription>No funding data available for {symbol}</CardDescription>
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

  return (
    <AppLayout>
      <div className="space-y-6">
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
              {symbol}
            </h1>
            <p className="text-muted-foreground">
              Cross-exchange funding rate comparison
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spread (max-min)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {stats ? asPercentDisplay(stats.spread) : '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best For Long</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {stats ? (
                <>
                  <Badge variant="outline" className="uppercase">{stats.bestLongExchange}</Badge>
                  <span className="font-mono text-sm">{asPercentDisplay(stats.minRate)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Best For Short</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              {stats ? (
                <>
                  <Badge variant="outline" className="uppercase">{stats.bestShortExchange}</Badge>
                  <span className="font-mono text-sm">{asPercentDisplay(stats.maxRate)}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exchange cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funding Rates by Exchange</CardTitle>
            <CardDescription>Latest snapshot from each exchange</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {snapshots.map((s) => {
                const isMax = stats && s.funding_rate === stats.maxRate;
                const isMin = stats && s.funding_rate === stats.minRate;

                return (
                  <Card
                    key={s.id}
                    className={cn(
                      'border-2',
                      isMax && 'border-green-500 bg-green-500/5',
                      isMin && 'border-red-500 bg-red-500/5',
                      !isMax && !isMin && 'border-border'
                    )}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase flex items-center justify-between">
                        {s.exchange}
                        {isMax && <Badge variant="default" className="bg-green-500">Max</Badge>}
                        {isMin && <Badge variant="destructive">Min</Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className={cn(
                          'text-3xl font-bold font-mono',
                          s.funding_rate === null
                            ? 'text-muted-foreground'
                            : s.funding_rate >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                        )}
                      >
                        {asPercentDisplay(s.funding_rate)}
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Next: </span>
                          {formatUtc(s.next_funding_time)}
                        </div>
                        <div>
                          <span className="font-medium">Updated: </span>
                          {formatUtc(s.updated_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Historical chart placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historical Funding Rates</CardTitle>
            <CardDescription>Time series chart (Phase 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-10 text-muted-foreground">
              Historical funding rate chart will be added when funding_series data is available.
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
