import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  Target,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Signal = Database['public']['Tables']['signals']['Row'];
type PairMetrics = Database['public']['Tables']['pair_metrics']['Row'];

interface SignalWithMetrics extends Signal {
  pair_metrics: PairMetrics | null;
}

export default function SignalDetail() {
  const { id } = useParams<{ id: string }>();
  const [signal, setSignal] = useState<SignalWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignal = async () => {
      if (!id) {
        setError('No signal ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('signals')
          .select('*, pair_metrics(*)')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        
        if (!data) {
          setError('Signal not found');
        } else {
          setSignal(data);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Error fetching signal:', err);
        setError('Failed to load signal');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignal();
  }, [id]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (error || !signal || !signal.pair_metrics) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="text-center py-12 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">{error || 'Signal not found'}</p>
            <p className="text-sm mt-2">
              The signal you're looking for doesn't exist or has expired.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-4">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const displayData = {
    symbolA: signal.pair_metrics.symbol_a,
    symbolB: signal.pair_metrics.symbol_b,
    zScore: Number(signal.z_ou_score),
    usdSpread: Number(signal.usd_spread || 0),
    correlation: Number(signal.pair_metrics.correlation || 0),
    cointegrationPvalue: Number(signal.pair_metrics.cointegration_pvalue || 0),
    ouTheta: Number(signal.pair_metrics.ou_theta || 0),
    halfLife: Number(signal.pair_metrics.half_life_hours || 0),
    beta: Number(signal.pair_metrics.beta || 0),
    hurst: Number(signal.pair_metrics.hurst_exponent || 0),
    direction: signal.signal_direction as 'long_a_short_b' | 'short_a_long_b',
    confidence: Number(signal.confidence_score || 0),
    entryPriceA: Number(signal.entry_price_a || 0),
    entryPriceB: Number(signal.entry_price_b || 0),
    expiresIn: Math.max(0, Math.ceil((new Date(signal.expires_at).getTime() - Date.now()) / 60000)),
  };

  const isLong = displayData.direction === 'long_a_short_b' || 
                 displayData.direction?.toLowerCase() === 'long';

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold font-mono tracking-tight">
                  {displayData.symbolA} / {displayData.symbolB}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-sm',
                    isLong
                      ? 'border-long/50 text-long bg-long/10'
                      : 'border-short/50 text-short bg-short/10'
                  )}
                >
                  {isLong ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {isLong ? 'Long A / Short B' : 'Short A / Long B'}
                </Badge>
              </div>
              <p className="text-muted-foreground">Signal analysis and metrics</p>
            </div>
          </div>

          <Button className="glow-primary">
            <Zap className="mr-2 h-4 w-4" />
            Open Trade
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Z-OU Score</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold font-mono',
                displayData.zScore > 0 ? 'text-long' : 'text-short'
              )}>
                {displayData.zScore > 0 ? '+' : ''}{displayData.zScore.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>USD Spread</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                ${Math.abs(displayData.usdSpread).toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Correlation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {displayData.correlation.toFixed(3)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Coint. P-Val</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {displayData.cointegrationPvalue.toFixed(4)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>OU Theta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {displayData.ouTheta.toFixed(4)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Half-Life</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {displayData.halfLife.toFixed(1)}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Beta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {displayData.beta.toFixed(3)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Hurst</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={cn(
                'text-2xl font-bold font-mono',
                displayData.hurst < 0.5 ? 'text-long' : 'text-warning'
              )}>
                {displayData.hurst.toFixed(3)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Signal Status Bar */}
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Confidence</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        displayData.confidence >= 0.8
                          ? 'bg-long'
                          : displayData.confidence >= 0.6
                          ? 'bg-warning'
                          : 'bg-muted-foreground'
                      )}
                      style={{ width: `${displayData.confidence * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-sm">
                    {(displayData.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Clock className={cn(
                  'h-4 w-4',
                  displayData.expiresIn <= 5 ? 'text-warning' : 'text-muted-foreground'
                )} />
                <span className="text-sm font-medium">Expires in</span>
                <span className={cn(
                  'font-mono',
                  displayData.expiresIn <= 5 ? 'text-warning' : ''
                )}>
                  {displayData.expiresIn}m
                </span>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Entry Prices</span>
                <span className="font-mono text-sm">
                  {displayData.symbolA}: ${displayData.entryPriceA.toLocaleString()}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="font-mono text-sm">
                  {displayData.symbolB}: ${displayData.entryPriceB.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts placeholder - requires real OHLC data from external source */}
        <Card>
          <CardHeader>
            <CardTitle>Price Charts</CardTitle>
            <CardDescription>
              Charts require real-time OHLC data from the trading service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Charts require external data</p>
              <p className="text-sm mt-2">
                Price charts will be available when OHLC data is provided by the Python scanner service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
