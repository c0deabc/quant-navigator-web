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
import { ArrowLeft, Database, Plus, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database as DB } from '@/integrations/supabase/types';

type PairMetrics = DB['public']['Tables']['pair_metrics']['Row'];
type Signal = DB['public']['Tables']['signals']['Row'];

interface SignalWithPair extends Signal {
  pair_metrics: PairMetrics | null;
}

export default function DataManagement() {
  const [pairMetrics, setPairMetrics] = useState<PairMetrics[]>([]);
  const [signals, setSignals] = useState<SignalWithPair[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingSignals, setIsLoadingSignals] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

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
      console.error('Error fetching pair metrics:', error);
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
      console.error('Error fetching signals:', error);
      toast.error('Failed to load signals');
    } finally {
      setIsLoadingSignals(false);
    }
  };

  useEffect(() => {
    fetchPairMetrics();
    fetchSignals();
  }, []);

  const seedMockData = async () => {
    setIsSeeding(true);
    try {
      // Insert mock pair metrics
      const mockPairs = [
        { symbol_a: 'BTCUSDT', symbol_b: 'ETHUSDT', correlation: 0.89, cointegration_pvalue: 0.02, ou_theta: 0.045, half_life_hours: 18, beta: 0.72, hurst_exponent: 0.38 },
        { symbol_a: 'SOLUSDT', symbol_b: 'AVAXUSDT', correlation: 0.76, cointegration_pvalue: 0.04, ou_theta: 0.032, half_life_hours: 24, beta: 0.85, hurst_exponent: 0.42 },
        { symbol_a: 'LINKUSDT', symbol_b: 'AAVEUSDT', correlation: 0.82, cointegration_pvalue: 0.01, ou_theta: 0.028, half_life_hours: 32, beta: 0.68, hurst_exponent: 0.35 },
        { symbol_a: 'BNBUSDT', symbol_b: 'MATICUSDT', correlation: 0.71, cointegration_pvalue: 0.05, ou_theta: 0.038, half_life_hours: 28, beta: 0.91, hurst_exponent: 0.44 },
        { symbol_a: 'DOGEUSDT', symbol_b: 'SHIBUSDT', correlation: 0.94, cointegration_pvalue: 0.008, ou_theta: 0.055, half_life_hours: 14, beta: 0.95, hurst_exponent: 0.31 },
      ];

      const { data: insertedPairs, error: pairsError } = await supabase
        .from('pair_metrics')
        .upsert(mockPairs, { onConflict: 'symbol_a,symbol_b' })
        .select();

      if (pairsError) throw pairsError;

      // Insert mock signals for each pair
      if (insertedPairs) {
        const mockSignals = insertedPairs.map((pair, idx) => ({
          pair_metrics_id: pair.id,
          z_ou_score: [2.34, -1.98, 2.85, -2.12, 1.67][idx],
          usd_spread: [125.50, -45.20, 89.30, -67.80, 12.40][idx],
          entry_price_a: [45000, 120, 18, 320, 0.12][idx],
          entry_price_b: [2800, 35, 95, 0.85, 0.000012][idx],
          signal_direction: idx % 2 === 0 ? 'long_a_short_b' : 'short_a_long_b',
          confidence_score: [0.85, 0.72, 0.91, 0.68, 0.59][idx],
          expires_at: new Date(Date.now() + (12 + idx * 3) * 60 * 1000).toISOString(),
        }));

        const { error: signalsError } = await supabase
          .from('signals')
          .insert(mockSignals);

        if (signalsError) throw signalsError;
      }

      toast.success('Mock data seeded successfully');
      fetchPairMetrics();
      fetchSignals();
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed mock data');
    } finally {
      setIsSeeding(false);
    }
  };

  const clearAllData = async () => {
    try {
      // Delete signals first (foreign key constraint)
      await supabase.from('signals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('pair_metrics').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      toast.success('All data cleared');
      fetchPairMetrics();
      fetchSignals();
    } catch (error) {
      console.error('Error clearing data:', error);
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
              Seed mock data for testing or clear existing data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={seedMockData} disabled={isSeeding}>
                {isSeeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Seed Mock Data
              </Button>
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
                            No pair metrics data. Click "Seed Mock Data" to add sample data.
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
                              {new Date(pair.last_updated).toLocaleString()}
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
                            No signals. Seed mock data to see sample signals.
                          </TableCell>
                        </TableRow>
                      ) : (
                        signals.map((signal) => (
                          <TableRow key={signal.id}>
                            <TableCell className="font-mono font-medium">
                              {signal.pair_metrics?.symbol_a} / {signal.pair_metrics?.symbol_b}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${Number(signal.z_ou_score) > 0 ? 'text-long' : 'text-short'}`}>
                              {Number(signal.z_ou_score) > 0 ? '+' : ''}{Number(signal.z_ou_score).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              ${Math.abs(Number(signal.usd_spread || 0)).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={signal.signal_direction === 'long_a_short_b' ? 'text-long border-long/50' : 'text-short border-short/50'}>
                                {signal.signal_direction === 'long_a_short_b' ? 'Long A' : 'Short A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {((signal.confidence_score || 0) * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(signal.expires_at).toLocaleTimeString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(signal.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
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
