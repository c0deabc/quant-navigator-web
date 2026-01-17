import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Database, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logAuditEvent } from '@/lib/audit';
import type { Database as DB } from '@/integrations/supabase/types';

type PairMetrics = DB['public']['Tables']['pair_metrics']['Row'];
type Signal = DB['public']['Tables']['signals']['Row'];

interface SignalWithPair extends Signal {
  pair_metrics: PairMetrics | null;
}

function directionLabel(signalDirection: string | null | undefined): { label: string; variantClass: string; isLong: boolean } {
  const dir = (signalDirection ?? '').toLowerCase();

  // Support both formats:
  // - lovable mock: long_a_short_b / short_a_long_b
  // - python simple: LONG / SHORT
  const isLongA =
    dir === 'long' ||
    dir === 'buy' ||
    dir === 'long_a_short_b';

  const isShortA =
    dir === 'short' ||
    dir === 'sell' ||
    dir === 'short_a_long_b';

  if (isLongA) {
    return { label: 'Long A', variantClass: 'text-long border-long/50', isLong: true };
  }
  if (isShortA) {
    return { label: 'Short A', variantClass: 'text-short border-short/50', isLong: false };
  }

  // Unknown / legacy
  return { label: signalDirection ?? '—', variantClass: 'text-muted-foreground border-muted/50', isLong: false };
}

export default function DataManagement() {
  const [pairMetrics, setPairMetrics] = useState<PairMetrics[]>([]);
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);

  const fetchPairMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('pair_metrics')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      setPairMetrics(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching pair metrics:', error);
      toast.error('Failed to load pair metrics');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchSignals = async () => {
    setIsLoadingSignals(true);
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*, pair_metrics(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching signals:', error);
      toast.error('Failed to load signals');
    } finally {
      setIsLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchPairMetrics();
    fetchSignals();
  }, []);

  const clearAllData = async () => {
    try {
      // Delete signals first (foreign key constraint)
      await supabase.from('signals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('pair_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      await logAuditEvent({
        action: 'data_cleared_all',
        entityType: 'data_management',
        entityId: null,
        details: { tables: ['signals', 'pair_metrics'] },
      });

      toast.success('All data cleared');
      fetchPairMetrics();
      fetchSignals();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Management</h1>
            <p className="text-muted-foreground">
              View and manage pair metrics and trading signals
            </p>
          </div>
        </div>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Actions
            </CardTitle>
            <CardDescription>
              Refresh live data from Supabase or clear existing data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { fetchPairMetrics(); fetchSignals(); }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="destructive" onClick={clearAllData}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Tables */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="pairs">
              <TabsList>
                <TabsTrigger value="pairs">
                  Pair Metrics ({pairMetrics.length})
                </TabsTrigger>
                <TabsTrigger value="signals">
                  Signals ({signals.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pairs" className="mt-4">
                {isLoadingMetrics ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Correlation</TableHead>
                        <TableHead className="text-right">Coint. P-Val</TableHead>
                        <TableHead className="text-right">OU Theta</TableHead>
                        <TableHead className="text-right">Half-Life</TableHead>
                        <TableHead className="text-right">Beta</TableHead>
                        <TableHead className="text-right">Hurst</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pairMetrics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No pair metrics yet. Run your scanner to populate data.
                          </TableCell>
                        </TableRow>
                      ) : (
                        pairMetrics.map((pair) => (
                          <TableRow key={pair.id}>
                            <TableCell className="font-mono font-medium">
                              {pair.symbol_a} / {pair.symbol_b}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.correlation?.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.cointegration_pvalue?.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.ou_theta?.toFixed(4)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.half_life_hours?.toFixed(1)}h
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.beta?.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {pair.hurst_exponent?.toFixed(3)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {pair.last_updated ? new Date(pair.last_updated).toLocaleString() : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              <TabsContent value="signals" className="mt-4">
                {isLoadingSignals ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Z-OU Score</TableHead>
                        <TableHead className="text-right">USD Spread</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No signals yet. Run your scanner to populate data.
                          </TableCell>
                        </TableRow>
                      ) : (
                        signals.map((signal) => {
                          const dir = directionLabel(signal.signal_direction);
                          const z = Number(signal.z_ou_score ?? 0);
                          return (
                            <TableRow key={signal.id}>
                              <TableCell className="font-mono font-medium">
                                {signal.pair_metrics?.symbol_a ?? '—'} / {signal.pair_metrics?.symbol_b ?? '—'}
                              </TableCell>
                              <TableCell className={`text-right font-mono ${z > 0 ? 'text-long' : 'text-short'}`}>
                                {z > 0 ? '+' : ''}{z.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${Math.abs(Number(signal.usd_spread || 0)).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={dir.variantClass}>
                                  {dir.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {signal.confidence_score == null
                                  ? '—'
                                  : `${(Number(signal.confidence_score) * 100).toFixed(0)}%`}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {signal.expires_at ? new Date(signal.expires_at).toLocaleTimeString() : '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {signal.created_at ? new Date(signal.created_at).toLocaleString() : '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
