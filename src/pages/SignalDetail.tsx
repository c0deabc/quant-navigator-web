import { useEffect, useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import PriceChart from '@/components/charts/PriceChart';
import SpreadChart from '@/components/charts/SpreadChart';
import ZScoreChart from '@/components/charts/ZScoreChart';
import SyntheticPairChart from '@/components/charts/SyntheticPairChart';
import { generateSignalChartData, SignalChartData } from '@/lib/mockChartData';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Signal = Database['public']['Tables']['signals']['Row'];
type PairMetrics = Database['public']['Tables']['pair_metrics']['Row'];

interface SignalWithMetrics extends Signal {
  pair_metrics: PairMetrics | null;
}

// Mock signal data for when no real data exists
const mockSignalData = {
  id: 'mock-1',
  symbolA: 'BTCUSDT',
  symbolB: 'ETHUSDT',
  zScore: 2.34,
  usdSpread: 125.50,
  correlation: 0.89,
  cointegrationPvalue: 0.02,
  ouTheta: 0.045,
  halfLife: 18,
  beta: 0.72,
  hurst: 0.38,
  direction: 'long_a_short_b' as const,
  confidence: 0.85,
  entryPriceA: 45000,
  entryPriceB: 2800,
  expiresIn: 12,
};

export default function SignalDetail() {
  const { id } = useParams<{ id: string }>();
  const [signal, setSignal] = useState<SignalWithMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState<SignalChartData | null>(null);

  useEffect(() => {
    const fetchSignal = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*, pair_metrics(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setSignal(data);
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error fetching signal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSignal();
  }, [id]);

  // Generate chart data
  const displayData = useMemo(() => {
    if (signal?.pair_metrics) {
      return {
        symbolA: signal.pair_metrics.symbol_a,
        symbolB: signal.pair_metrics.symbol_b,
        zScore: Number(signal.z_ou_score),
        usdSpread: Number(signal.usd_spread || 0),
        correlation: Number(signal.pair_metrics.correlation || 0.85),
        cointegrationPvalue: Number(signal.pair_metrics.cointegration_pvalue || 0.03),
        ouTheta: Number(signal.pair_metrics.ou_theta || 0.04),
        halfLife: Number(signal.pair_metrics.half_life_hours || 20),
        beta: Number(signal.pair_metrics.beta || 0.75),
        hurst: Number(signal.pair_metrics.hurst_exponent || 0.4),
        direction: signal.signal_direction as 'long_a_short_b' | 'short_a_long_b',
        confidence: Number(signal.confidence_score || 0.8),
        entryPriceA: Number(signal.entry_price_a || 45000),
        entryPriceB: Number(signal.entry_price_b || 2800),
        expiresIn: Math.max(0, Math.ceil((new Date(signal.expires_at).getTime() - Date.now()) / 60000)),
      };
    }
    return mockSignalData;
  }, [signal]);

  useEffect(() => {
    // Generate chart data based on signal metrics
    const data = generateSignalChartData(
      displayData.entryPriceA,
      displayData.entryPriceB,
      displayData.correlation,
      displayData.beta,
      displayData.halfLife,
      100
    );
    setChartData(data);
  }, [displayData]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const isLong = displayData.direction === 'long_a_short_b';

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
              <p className="text-muted-foreground">Signal analysis and visualization</p>
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

        {/* Synthetic Pair Chart with Z-Score + RSI Arrows */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Synthetic Pair Price</CardTitle>
            <CardDescription>
              {displayData.symbolA}/{displayData.symbolB} ratio with Z-Score + RSI combined signals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyntheticPairChart
              entryPriceA={displayData.entryPriceA}
              entryPriceB={displayData.entryPriceB}
              symbolA={displayData.symbolA}
              symbolB={displayData.symbolB}
              height={400}
            />
          </CardContent>
        </Card>

        {/* Charts */}
        {chartData && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Normalized Price Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Normalized Log Prices</CardTitle>
                <CardDescription>
                  Percentage change from start - {displayData.symbolA} (gold) vs {displayData.symbolB} (blue)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PriceChart
                  dataA={chartData.normalizedPriceA}
                  dataB={chartData.normalizedPriceB}
                  symbolA={displayData.symbolA}
                  symbolB={displayData.symbolB}
                  height={350}
                />
              </CardContent>
            </Card>

            {/* Spread Chart */}
            <Card>
              <CardHeader>
                <CardTitle>OU Spread</CardTitle>
                <CardDescription>
                  Log spread with ±2σ bands
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpreadChart
                  spreadData={chartData.spreadData}
                  upperBand={chartData.upperBand}
                  lowerBand={chartData.lowerBand}
                  meanLine={chartData.meanLine}
                  height={280}
                />
              </CardContent>
            </Card>

            {/* Z-Score Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Z-OU Score</CardTitle>
                <CardDescription>
                  Normalized mean-reversion signal with entry/exit thresholds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ZScoreChart
                  zScoreData={chartData.zScoreData}
                  entryThreshold={2.0}
                  exitThreshold={0.5}
                  height={280}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
