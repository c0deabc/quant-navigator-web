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
import { History as HistoryIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock execution history
const mockExecutions = [
  {
    id: '1',
    pair: 'BTCUSDT / ETHUSDT',
    direction: 'long_a_short_b',
    status: 'success',
    leverage: '3x / 3x',
    size: '$500',
    pnl: '+$12.50',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    pair: 'SOLUSDT / AVAXUSDT',
    direction: 'short_a_long_b',
    status: 'failed',
    leverage: '2x / 2x',
    size: '$300',
    pnl: null,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    pair: 'LINKUSDT / AAVEUSDT',
    direction: 'long_a_short_b',
    status: 'pending',
    leverage: '4x / 4x',
    size: '$750',
    pnl: null,
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
  },
];

const statusColors = {
  success: 'bg-success/10 text-success border-success/50',
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
            </div>
          </CardHeader>
          <CardContent>
            {mockExecutions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No executions yet</p>
                <p className="text-sm">Your trade history will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Leverage</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockExecutions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-mono font-medium">
                        {execution.pair}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          execution.direction === 'long_a_short_b'
                            ? 'border-long/50 text-long'
                            : 'border-short/50 text-short'
                        )}>
                          {execution.direction === 'long_a_short_b' ? 'Long A' : 'Short A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {execution.leverage}
                      </TableCell>
                      <TableCell className="font-mono">
                        {execution.size}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[execution.status as keyof typeof statusColors]}
                        >
                          {execution.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {execution.pnl ? (
                          <span className={cn(
                            execution.pnl.startsWith('+') ? 'text-long' : 'text-short'
                          )}>
                            {execution.pnl}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        <div>{formatTime(execution.timestamp)}</div>
                        <div className="text-xs">{formatDate(execution.timestamp)}</div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
