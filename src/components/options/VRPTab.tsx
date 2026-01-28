import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useIVSurface, useRealizedVol, useOptionsSignals } from '@/hooks/useOptionsData';
import { OptionsFilters } from '@/types/options';
import { OptionsSignalTable } from './OptionsSignalTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface VRPTabProps {
  filters: OptionsFilters;
}

function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(2)}%`;
}

export function VRPTab({ filters }: VRPTabProps) {
  const symbol = filters.symbol === 'all' ? 'BTC' : filters.symbol;
  const { snapshots: ivSnapshots, loading: ivLoading, error: ivError } = useIVSurface(symbol, filters.exchange);
  const { snapshot: rvSnapshot, loading: rvLoading, error: rvError } = useRealizedVol(symbol);

  const vrpFilters: OptionsFilters = {
    ...filters,
    signalTypes: ['VRP_DIVERGENCE'],
  };
  const { signals: vrpSignals, loading: signalsLoading, error: signalsError } = useOptionsSignals(vrpFilters);

  const latestIV = ivSnapshots.length > 0 ? ivSnapshots[0] : null;

  const chartData = useMemo(() => {
    if (!latestIV || !rvSnapshot) return [];

    return [
      { horizon: '7d', IV: latestIV.atm_iv, RV: rvSnapshot.rv_7d },
      { horizon: '14d', IV: latestIV.atm_iv, RV: rvSnapshot.rv_14d },
      { horizon: '30d', IV: latestIV.atm_iv, RV: rvSnapshot.rv_30d },
    ].filter((d) => d.IV !== null || d.RV !== null);
  }, [latestIV, rvSnapshot]);

  const vrpSpread = useMemo(() => {
    if (!latestIV?.atm_iv || !rvSnapshot?.rv_30d) return null;
    return latestIV.atm_iv - rvSnapshot.rv_30d;
  }, [latestIV, rvSnapshot]);

  const isLoading = ivLoading || rvLoading;
  const hasError = ivError || rvError;
  const hasData = latestIV || rvSnapshot;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ATM Implied Vol
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatPercent(latestIV?.atm_iv)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Realized Vol (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatPercent(rvSnapshot?.rv_30d)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">VRP Spread (IV - RV)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : vrpSpread !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono">
                  {vrpSpread >= 0 ? '+' : ''}{vrpSpread.toFixed(2)}%
                </span>
                <Badge variant={vrpSpread > 0 ? 'default' : 'destructive'}>
                  {vrpSpread > 0 ? 'IV > RV' : 'RV > IV'}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">IV vs RV Comparison</CardTitle>
          <CardDescription>
            Implied volatility (ATM) vs Realized volatility across horizons for {symbol}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : hasError ? (
            <div className="text-center py-12 text-destructive">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
              <p>{ivError || rvError}</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>No data yet. Insert snapshots into Supabase to populate.</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="horizon" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value?.toFixed(2)}%`, '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="IV" fill="hsl(var(--primary))" name="Implied Vol" />
                  <Bar dataKey="RV" fill="hsl(var(--muted-foreground))" name="Realized Vol" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">VRP Divergence Signals</CardTitle>
          <CardDescription>Recent signals where IV significantly diverges from RV</CardDescription>
        </CardHeader>
        <CardContent>
          <OptionsSignalTable
            signals={vrpSignals}
            loading={signalsLoading}
            error={signalsError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
