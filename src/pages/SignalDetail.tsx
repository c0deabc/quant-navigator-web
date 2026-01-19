import { useEffect, useMemo, useRef, useState } from 'react';
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
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// --- Types ---
type Signal = Database['public']['Tables']['signals']['Row'];
type PairMetrics = Database['public']['Tables']['pair_metrics']['Row'];

interface SignalWithMetrics extends Signal {
  pair_metrics: PairMetrics | null;
}

// --- TradingView widget helpers ---
function timeframeToTradingViewInterval(tf?: string | null): string {
  const t = (tf || '').toLowerCase().trim();
  // Common: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 1d
  if (!t) return '15';
  if (t.endsWith('m')) return t.replace('m', '');
  if (t.endsWith('h')) return String(Number(t.replace('h', '')) * 60);
  if (t.endsWith('d')) return 'D';
  if (t === 'd') return 'D';
  return '15';
}

function buildTvSymbol(symbol: string, exchange?: string): string {
  const s = symbol.trim();
  if (!s) return s;
  // If already has EXCHANGE:SYMBOL, keep as is
  if (s.includes(':')) return s;
  // Default exchange: BYBIT (works for perp symbols like XRPUSDT.P)
  const ex = (exchange || 'BYBIT').trim();
  return `${ex}:${s}`;
}

function buildRatioSymbol(symbolA: string, symbolB: string, exchange?: string): string {
  const a = buildTvSymbol(symbolA, exchange);
  const b = buildTvSymbol(symbolB, exchange);
  return `${a}/${b}`;
}

function TradingViewWidget(props: {
  title: string;
  symbol: string;
  interval: string;
  height?: number;
}) {
  const { title, symbol, interval, height = 520 } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Give each widget its own unique container id
  const containerId = useMemo(() => {
    const rand = Math.random().toString(36).slice(2);
    return `tv_${rand}`;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Clear previous widget (important on fast refresh / route changes)
    el.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      // @ts-expect-error - TradingView is injected by tv.js
      const TV = window.TradingView;
      if (!TV) return;

      // Create widget
      // Docs: https://www.tradingview.com/widget/advanced-chart/
      // Note: Custom/private indicators cannot be injected via this widget.
      // We use it to get candlesticks + the same "feel" as TradingView.
      // eslint-disable-next-line no-new
      new TV.widget({
        autosize: true,
        symbol,
        interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1', // 1 = candles
        locale: 'en',
        toolbar_bg: '#0b1220',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: false,
        container_id: containerId,
        withdateranges: true,
        details: true,
        hotlist: false,
        calendar: false,
        studies_overrides: {},
      });
    };

    el.appendChild(script);

    return () => {
      // Cleanup
      if (el) el.innerHTML = '';
    };
  }, [containerId, symbol, interval]);

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{title}</span>
          <a
            href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            title="Open in TradingView"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </CardTitle>
        <CardDescription className="text-xs">
          Candlesticks via TradingView widget (UTC)
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className="w-full rounded-md border bg-background"
          style={{ height }}
        >
          <div id={containerId} ref={containerRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}

const SignalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [signal, setSignal] = useState<SignalWithMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignal = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('signals')
          .select(`
            *,
            pair_metrics:pair_metrics_id(*)
          `)
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        setSignal(data as SignalWithMetrics);
      } catch (err) {
        console.error('Error fetching signal:', err);
        setError('Failed to load signal details');
      } finally {
        setLoading(false);
      }
    };

    fetchSignal();
  }, [id]);

  const getSignalDirection = () => {
    if (!signal) return { direction: 'Unknown', type: 'neutral' };

    // Prefer explicit signal_direction if present
    const dir = (signal as any).signal_direction as string | null;

    if (dir) {
      if (dir.toLowerCase().includes('long')) return { direction: dir, type: 'long' };
      if (dir.toLowerCase().includes('short')) return { direction: dir, type: 'short' };
      return { direction: dir, type: 'neutral' };
    }

    // Fallback to signal_type
    if (signal.signal_type?.includes('long')) return { direction: 'Long A / Short B', type: 'long' };
    if (signal.signal_type?.includes('short')) return { direction: 'Short A / Long B', type: 'short' };

    return { direction: signal.signal_type || 'Unknown', type: 'neutral' };
  };

  const directionInfo = getSignalDirection();

  const formatTimeUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'N/A';

    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // ---- TradingView symbols ----
  const exchange = 'BYBIT'; // Change here if you want OKX/BINANCE, etc.
  const tvInterval = '15';

  const tvSymbolA = useMemo(() => buildTvSymbol(signal?.symbol_a || '', exchange), [signal?.symbol_a]);
  const tvSymbolB = useMemo(() => buildTvSymbol(signal?.symbol_b || '', exchange), [signal?.symbol_b]);
  const tvRatio = useMemo(() => {
    const a = signal?.symbol_a || '';
    const b = signal?.symbol_b || '';
    if (!a || !b) return '';
    return buildRatioSymbol(a, b, exchange);
  }, [signal?.symbol_a, signal?.symbol_b]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading signal details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !signal) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error
              </CardTitle>
              <CardDescription>{error || 'Signal not found'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>

            <div>
              <h1 className="text-2xl font-bold">
                {signal.symbol_a} / {signal.symbol_b}
              </h1>
              <p className="text-muted-foreground">
                Signal analysis and metrics
              </p>
            </div>
          </div>

          <Badge
            variant={directionInfo.type === 'long' ? 'default' : directionInfo.type === 'short' ? 'destructive' : 'secondary'}
            className="text-sm px-3 py-1"
          >
            {directionInfo.type === 'long' ? (
              <TrendingUp className="h-4 w-4 mr-2" />
            ) : directionInfo.type === 'short' ? (
              <TrendingDown className="h-4 w-4 mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            {directionInfo.direction}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Z-Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(signal as any).z_ou_score?.toFixed?.(2) ?? signal.z_score?.toFixed?.(2) ?? 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                USD Spread
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.usd_spread ? `$${signal.usd_spread.toFixed(2)}` : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Correlation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.pair_metrics?.correlation?.toFixed(3) ?? 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Coint. P-Val
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.pair_metrics?.coint_p_val?.toFixed(4) ?? 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">OU Theta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.pair_metrics?.ou_theta?.toFixed(4) ?? 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Half-Life</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.pair_metrics?.half_life ? `${signal.pair_metrics.half_life.toFixed(1)}h` : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Beta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signal.pair_metrics?.beta?.toFixed(3) ?? 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signal Timing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Generated</span>
              </div>
              <span className="text-sm">
                {signal.signal_ts ? new Date(signal.signal_ts).toLocaleString() : 'N/A'}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expires In</span>
              </div>
              <span className={cn(
                "text-sm font-medium",
                signal.expires_at && new Date(signal.expires_at) < new Date() ? "text-destructive" : "text-primary"
              )}>
                {formatTimeUntilExpiry(signal.expires_at)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Charts</CardTitle>
              <CardDescription>
                Candlestick charts powered by TradingView (ratio + both legs). Interval: {tvInterval}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!tvRatio ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>Missing symbols for chart rendering</p>
                </div>
              ) : (
                <>
                  <TradingViewWidget
                    title={`Synthetic Ratio: ${signal.symbol_a}/${signal.symbol_b}`}
                    symbol={tvRatio}
                    interval={tvInterval}
                    height={560}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TradingViewWidget
                      title={`Leg A: ${signal.symbol_a}`}
                      symbol={tvSymbolA}
                      interval={tvInterval}
                      height={520}
                    />
                    <TradingViewWidget
                      title={`Leg B: ${signal.symbol_b}`}
                      symbol={tvSymbolB}
                      interval={tvInterval}
                      height={520}
                    />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Note: TradingView widget does not allow injecting private/custom indicators (like your “Z-score + RSI Combined Arrows”).
                    If you want the exact overlay arrows/lines inside the web app, we’ll implement it in the frontend and draw it ourselves.
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default SignalDetail;
