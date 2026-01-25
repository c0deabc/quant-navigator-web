import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FundingSnapshot, SUPPORTED_EXCHANGES, FundingStats } from '@/types/funding';
import { cn } from '@/lib/utils';

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(3)}%`;
}

function formatTime(time: string | null): string {
  if (!time) return '—';
  const date = new Date(time);
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' UTC';
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
          .in('exchange', SUPPORTED_EXCHANGES as unknown as string[]);

        if (fetchError) throw fetchError;

        setSnapshots((data || []) as FundingSnapshot[]);
      } catch (err) {
        console.error('Error fetching funding data:', err);
        setError('Failed to load funding data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol]);

  // Compute stats
  const stats: FundingStats | null = (() => {
    const validSnapshots = snapshots.filter((s) => s.funding_rate !== null);
    if (validSnapshots.length === 0) return null;

    const rates = validSnapshots.map((s) => ({ exchange: s.exchange, rate: s.funding_rate }));
    const maxEntry = rates.reduce((a, b) => (a.rate > b.rate ? a : b));
    const minEntry = rates.reduce((a, b) => (a.rate < b.rate ? a : b));

    return {
      spread: maxEntry.rate - minEntry.rate,
      maxRate: maxEntry.rate,
      minRate: minEntry.rate,
      bestLongExchange: minEntry.exchange,
      bestShortExchange: maxEntry.exchange,
    };
  })();

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
              {symbol}
            </h1>
            <p className="text-muted-foreground">
              Cross-exchange funding rate comparison
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Spread</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {formatRate(stats.spread)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Max Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-green-500">
                  {formatRate(stats.maxRate)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.bestShortExchange.toUpperCase()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Min Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-red-500">
                  {formatRate(stats.minRate)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.bestLongExchange.toUpperCase()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Best For</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Exchange Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Funding Rates by Exchange</CardTitle>
            <CardDescription>Current funding rates across all supported exchanges</CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No funding data available for {symbol}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {SUPPORTED_EXCHANGES.map((exchange) => {
                  const snapshot = snapshots.find((s) => s.exchange === exchange);
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
                            !snapshot
                              ? 'text-muted-foreground'
                              : snapshot.funding_rate >= 0
                              ? 'text-green-500'
                              : 'text-red-500'
                          )}
                        >
                          {snapshot ? formatRate(snapshot.funding_rate) : '—'}
                        </div>
                        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <div>
                            <span className="font-medium">Next: </span>
                            {formatTime(snapshot?.next_funding_time ?? null)}
                          </div>
                          <div>
                            <span className="font-medium">Updated: </span>
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

        {/* Placeholder for future time series chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Historical Funding Rates</CardTitle>
            <CardDescription>Time series chart (Phase 2)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Historical funding rate chart will be available when time series data is ingested.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
