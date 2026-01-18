import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  RefreshCw,
  Eye,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Signal = Database['public']['Tables']['signals']['Row'];
type PairMetrics = Database['public']['Tables']['pair_metrics']['Row'];
type GlobalScanConfig = Database['public']['Tables']['global_scan_config']['Row'];

interface SignalWithMetrics extends Signal {
  pair_metrics: PairMetrics | null;
}

function formatTimeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} mins ago`;
}

function formatTimeUntil(date: Date): string {
  const minutes = Math.ceil((date.getTime() - Date.now()) / 60000);
  if (minutes <= 0) return 'Soon';
  if (minutes === 1) return '1 min';
  return `${minutes} mins`;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [signals, setSignals] = useState<SignalWithMetrics[]>([]);
  const [scanConfig, setScanConfig] = useState<GlobalScanConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [signalsRes, configRes] = await Promise.all([
        supabase
          .from('signals')
          .select('*, pair_metrics(*)')
          .gte('expires_at', new Date().toISOString())
          .order('z_ou_score', { ascending: false }),
        supabase
          .from('global_scan_config')
          .select('*')
          .limit(1)
          .maybeSingle(),
      ]);

      if (signalsRes.error) throw signalsRes.error;
      setSignals(signalsRes.data || []);
      
      if (!configRes.error && configRes.data) {
        setScanConfig(configRes.data);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const longSignals = signals.filter(s => 
    s.signal_direction?.toLowerCase() === 'long_a_short_b' || 
    s.signal_direction?.toLowerCase() === 'long'
  );
  const shortSignals = signals.filter(s => 
    s.signal_direction?.toLowerCase() === 'short_a_long_b' || 
    s.signal_direction?.toLowerCase() === 'short'
  );
  const avgConfidence = signals.length > 0
    ? signals.reduce((a, b) => a + Number(b.confidence_score || 0), 0) / signals.length
    : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trading Signals</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.display_name || 'Trader'}
            </p>
          </div>
          
          {/* Scan Status */}
          <Card className="sm:w-auto">
            <CardContent className="flex items-center gap-4 p-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  scanConfig?.is_scanning ? "bg-warning animate-pulse" : "bg-success"
                )} />
                <span className="text-sm font-medium">
                  {scanConfig?.is_scanning ? 'Scanning...' : 'Idle'}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Last: {scanConfig?.last_scan_at 
                    ? formatTimeAgo(new Date(scanConfig.last_scan_at)) 
                    : 'Never'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>
                  Next: {scanConfig?.next_scan_at 
                    ? formatTimeUntil(new Date(scanConfig.next_scan_at)) 
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Signals
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signals.length}</div>
              <p className="text-xs text-muted-foreground">
                Above threshold
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Long Signals
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-long" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-long">
                {longSignals.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Long A / Short B
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Short Signals
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-short" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-short">
                {shortSignals.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Short A / Long B
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Confidence
              </CardTitle>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {signals.length > 0 ? `${(avgConfidence * 100).toFixed(0)}%` : '—'}
              </div>
              <p className="text-xs text-muted-foreground">
                Signal quality
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Signals Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Signal Overview</CardTitle>
                <CardDescription>
                  Current arbitrage opportunities ranked by Z-score
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : signals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No active signals</p>
                <p className="text-sm">
                  Signals will appear here when the scanner detects trading opportunities.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead className="text-right">Z-Score</TableHead>
                    <TableHead className="text-right">USD Spread</TableHead>
                    <TableHead className="text-right">Correlation</TableHead>
                    <TableHead className="text-right">Half-Life</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                    <TableHead className="text-right">Expires</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals.map((signal) => {
                    const zScore = Number(signal.z_ou_score);
                    const usdSpread = Number(signal.usd_spread || 0);
                    const correlation = Number(signal.pair_metrics?.correlation || 0);
                    const halfLife = Number(signal.pair_metrics?.half_life_hours || 0);
                    const confidence = Number(signal.confidence_score || 0);
                    const expiresIn = Math.max(0, Math.ceil((new Date(signal.expires_at).getTime() - Date.now()) / 60000));
                    const isLong = signal.signal_direction?.toLowerCase() === 'long_a_short_b' || 
                                   signal.signal_direction?.toLowerCase() === 'long';
                    
                    return (
                      <TableRow key={signal.id} className="trading-row">
                        <TableCell>
                          <div className="font-medium font-mono">
                            {signal.pair_metrics?.symbol_a || '—'} / {signal.pair_metrics?.symbol_b || '—'}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-mono font-medium",
                            zScore > 0 ? "text-long" : "text-short"
                          )}>
                            {zScore > 0 ? '+' : ''}{zScore.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-mono",
                            usdSpread > 0 ? "text-long" : "text-short"
                          )}>
                            ${Math.abs(usdSpread).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {correlation.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {halfLife.toFixed(1)}h
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
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
                            {isLong ? 'Long A' : 'Short A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  confidence >= 0.8
                                    ? "bg-long"
                                    : confidence >= 0.6
                                    ? "bg-warning"
                                    : "bg-muted-foreground"
                                )}
                                style={{ width: `${confidence * 100}%` }}
                              />
                            </div>
                            <span className="font-mono text-sm w-10">
                              {(confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-mono text-sm",
                            expiresIn <= 5 && "text-warning"
                          )}>
                            {expiresIn}m
                          </span>
                        </TableCell>
                        <TableCell>
                          <Link to={`/signal/${signal.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
