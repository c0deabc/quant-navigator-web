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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for signals
const mockSignals = [
  {
    id: '1',
    symbolA: 'BTCUSDT',
    symbolB: 'ETHUSDT',
    zScore: 2.34,
    usdSpread: 125.50,
    correlation: 0.89,
    halfLife: 18,
    direction: 'long_a_short_b' as const,
    confidence: 0.85,
    expiresIn: 12,
  },
  {
    id: '2',
    symbolA: 'SOLUSDT',
    symbolB: 'AVAXUSDT',
    zScore: -1.98,
    usdSpread: -45.20,
    correlation: 0.76,
    halfLife: 24,
    direction: 'short_a_long_b' as const,
    confidence: 0.72,
    expiresIn: 8,
  },
  {
    id: '3',
    symbolA: 'LINKUSDT',
    symbolB: 'AAVEUSDT',
    zScore: 2.85,
    usdSpread: 89.30,
    correlation: 0.82,
    halfLife: 32,
    direction: 'long_a_short_b' as const,
    confidence: 0.91,
    expiresIn: 15,
  },
  {
    id: '4',
    symbolA: 'BNBUSDT',
    symbolB: 'MATICUSDT',
    zScore: -2.12,
    usdSpread: -67.80,
    correlation: 0.71,
    halfLife: 28,
    direction: 'short_a_long_b' as const,
    confidence: 0.68,
    expiresIn: 5,
  },
  {
    id: '5',
    symbolA: 'DOGEUSDT',
    symbolB: 'SHIBUSDT',
    zScore: 1.67,
    usdSpread: 12.40,
    correlation: 0.94,
    halfLife: 14,
    direction: 'long_a_short_b' as const,
    confidence: 0.59,
    expiresIn: 18,
  },
];

const mockScanStatus = {
  lastScan: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
  nextScan: new Date(Date.now() + 7 * 60 * 1000), // 7 minutes from now
  isScanning: false,
};

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
                  mockScanStatus.isScanning ? "bg-warning animate-pulse" : "bg-success"
                )} />
                <span className="text-sm font-medium">
                  {mockScanStatus.isScanning ? 'Scanning...' : 'Idle'}
                </span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Last: {formatTimeAgo(mockScanStatus.lastScan)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Next: {formatTimeUntil(mockScanStatus.nextScan)}</span>
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
              <div className="text-2xl font-bold">{mockSignals.length}</div>
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
                {mockSignals.filter(s => s.direction === 'long_a_short_b').length}
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
                {mockSignals.filter(s => s.direction === 'short_a_long_b').length}
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
                {(mockSignals.reduce((a, b) => a + b.confidence, 0) / mockSignals.length * 100).toFixed(0)}%
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
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                {mockSignals.map((signal) => (
                  <TableRow key={signal.id} className="trading-row">
                    <TableCell>
                      <div className="font-medium font-mono">
                        {signal.symbolA} / {signal.symbolB}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono font-medium",
                        signal.zScore > 0 ? "text-long" : "text-short"
                      )}>
                        {signal.zScore > 0 ? '+' : ''}{signal.zScore.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono",
                        signal.usdSpread > 0 ? "text-long" : "text-short"
                      )}>
                        ${Math.abs(signal.usdSpread).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {signal.correlation.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {signal.halfLife}h
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          signal.direction === 'long_a_short_b'
                            ? 'border-long/50 text-long bg-long/10'
                            : 'border-short/50 text-short bg-short/10'
                        )}
                      >
                        {signal.direction === 'long_a_short_b' ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {signal.direction === 'long_a_short_b' ? 'Long A' : 'Short A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              signal.confidence >= 0.8
                                ? "bg-long"
                                : signal.confidence >= 0.6
                                ? "bg-warning"
                                : "bg-muted-foreground"
                            )}
                            style={{ width: `${signal.confidence * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-sm w-10">
                          {(signal.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-mono text-sm",
                        signal.expiresIn <= 5 && "text-warning"
                      )}>
                        {signal.expiresIn}m
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
