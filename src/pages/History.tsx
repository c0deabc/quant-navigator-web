import { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Execution = Database['public']['Tables']['executions']['Row'];
type Signal = Database['public']['Tables']['signals']['Row'];
type PairMetrics = Database['public']['Tables']['pair_metrics']['Row'];

interface ExecutionWithSignal extends Execution {
  signals: (Signal & { pair_metrics: PairMetrics | null }) | null;
}

const statusColors = {
  success: 'bg-success/10 text-success border-success/50',
  completed: 'bg-success/10 text-success border-success/50',
  failed: 'bg-destructive/10 text-destructive border-destructive/50',
  pending: 'bg-warning/10 text-warning border-warning/50',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function History() {
  const [executions, setExecutions] = useState<ExecutionWithSignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchExecutions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('executions')
        .select('*, signals(*, pair_metrics(*))')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Execution History</h1>
          <p className="text-muted-foreground">
            View your past trade executions and their outcomes
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  Recent Executions
                </CardTitle>
                <CardDescription>
                  Your trade history for the last 30 days
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchExecutions} disabled={isLoading}>
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
            ) : executions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No executions yet</p>
                <p className="text-sm">Your trade history will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Leverage</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => {
                    const pair = execution.signals?.pair_metrics;
                    const pairDisplay = pair 
                      ? `${pair.symbol_a} / ${pair.symbol_b}`
                      : '—';
                    const leverageDisplay = execution.leverage_long && execution.leverage_short
                      ? `${execution.leverage_long}x / ${execution.leverage_short}x`
                      : '—';
                    const sizeDisplay = execution.position_size
                      ? `$${Number(execution.position_size).toLocaleString()}`
                      : '—';
                    const timestamp = new Date(execution.created_at);
                    
                    return (
                      <TableRow key={execution.id}>
                        <TableCell className="font-mono font-medium">
                          {pairDisplay}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {leverageDisplay}
                        </TableCell>
                        <TableCell className="font-mono">
                          {sizeDisplay}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[execution.status as keyof typeof statusColors] || statusColors.pending}
                          >
                            {execution.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          <div>{formatTime(timestamp)}</div>
                          <div className="text-xs">{formatDate(timestamp)}</div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
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
