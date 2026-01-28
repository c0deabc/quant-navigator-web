import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useIVSurface, useOptionsSignals } from '@/hooks/useOptionsData';
import { OptionsFilters, IVSurfaceSnapshot } from '@/types/options';
import { OptionsSignalTable } from './OptionsSignalTable';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface SmileTermTabProps {
  filters: OptionsFilters;
}

function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(2)}%`;
}

export function SmileTermTab({ filters }: SmileTermTabProps) {
  const symbol = filters.symbol === 'all' ? 'BTC' : filters.symbol;
  const { snapshots, loading, error } = useIVSurface(symbol, filters.exchange);

  const smileFilters: OptionsFilters = {
    ...filters,
    signalTypes: ['CALENDAR_DISLOCATION', 'SMILE_CONVEXITY', 'CROSS_EXCHANGE_IV'],
  };
  const { signals, loading: signalsLoading, error: signalsError } = useOptionsSignals(smileFilters);

  const latestSnapshot = snapshots[0];
  const skew25d = latestSnapshot?.skew_25d;

  const smileData = useMemo(() => {
    const s = snapshots[0];
    if (!s) return [];
    return [
      { delta: '10Δ Put', iv: s.iv_10d_put },
      { delta: '25Δ Put', iv: s.iv_25d_put },
      { delta: 'ATM', iv: s.atm_iv },
      { delta: '25Δ Call', iv: s.iv_25d_call },
      { delta: '10Δ Call', iv: s.iv_10d_call },
    ].filter((d) => d.iv !== null);
  }, [snapshots]);

  const termData = useMemo(() => {
    return snapshots
      .filter((s) => s.atm_iv !== null)
      .map((s) => ({
        expiry: format(new Date(s.expiry), 'MMM dd'),
        atmIV: s.atm_iv,
      }));
  }, [snapshots]);

  return (
    <div className="space-y-6">
      {/* Smile metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ATM IV</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatPercent(latestSnapshot?.atm_iv)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">25Δ Skew</CardTitle>
            <CardDescription className="text-xs">Put IV - Call IV</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : skew25d != null ? (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono">
                  {skew25d >= 0 ? '+' : ''}{skew25d.toFixed(2)}%
                </span>
                <Badge variant={skew25d > 0 ? 'destructive' : 'default'}>
                  {skew25d > 0 ? 'Put Skew' : 'Call Skew'}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">10Δ Curvature</CardTitle>
            <CardDescription className="text-xs">Wings - 2×ATM</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {formatPercent(latestSnapshot?.curvature_10d)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smile Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Volatility Smile</CardTitle>
          <CardDescription>
            IV by delta for {symbol} (latest expiry)
          </CardDescription>
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
          ) : smileData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>No smile data available. Insert IV surface snapshots to populate.</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={smileData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="delta" />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(value: number) => [`${value?.toFixed(2)}%`, 'IV']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="iv"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Term Structure Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Term Structure</CardTitle>
          <CardDescription>
            ATM IV across expiries for {symbol}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : termData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
              <p>No term structure data available. Insert snapshots for multiple expiries.</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={termData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="expiry" />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(value: number) => [`${value?.toFixed(2)}%`, 'ATM IV']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="atmIV"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="ATM IV"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Smile & Term Structure Signals</CardTitle>
          <CardDescription>
            Calendar dislocations, smile convexity, and cross-exchange IV signals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OptionsSignalTable
            signals={signals}
            loading={signalsLoading}
            error={signalsError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
