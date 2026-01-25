import { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { FundingAnomaly, CrossExchangeComparison, FundingStats } from '@/types/funding';
import { cn } from '@/lib/utils';

interface FundingAnomalyTableProps {
  anomalies: FundingAnomaly[];
  comparisons: Map<string, CrossExchangeComparison[]>;
  stats: Map<string, FundingStats>;
}

function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(3)}%`;
}

function formatTime(time: string | null): string {
  if (!time) return '—';
  const date = new Date(time);
  return date.toLocaleString('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }) + ' UTC';
}

function formatUpdatedAt(time: string | null): string {
  if (!time) return '—';
  const date = new Date(time);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export function FundingAnomalyTable({ anomalies, comparisons, stats }: FundingAnomalyTableProps) {
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

  const toggleExpanded = (symbol: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  if (anomalies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No funding anomalies found with current filters.</p>
        <p className="text-sm mt-2">Try adjusting the threshold or exchange.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Funding Rate</TableHead>
          <TableHead>Next Funding (UTC)</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Spread</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {anomalies.map((anomaly) => {
          const isExpanded = expandedSymbols.has(anomaly.symbol);
          const symbolStats = stats.get(anomaly.symbol);
          const symbolComparisons = comparisons.get(anomaly.symbol) || [];

          return (
            <Collapsible key={anomaly.symbol} open={isExpanded} asChild>
              <>
                <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpanded(anomaly.symbol)}>
                  <TableCell>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell className="font-mono font-medium">{anomaly.symbol}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-mono font-bold',
                        anomaly.triggerRate >= 0 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {formatRate(anomaly.triggerRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatTime(anomaly.nextFundingTime)}</TableCell>
                  <TableCell>
                    <Badge variant={anomaly.direction === 'positive' ? 'default' : 'destructive'}>
                      {anomaly.direction === 'positive' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {anomaly.direction === 'positive' ? 'Positive' : 'Negative'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {symbolStats ? formatRate(symbolStats.spread) : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatUpdatedAt(anomaly.updatedAt)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" asChild className="h-6 w-6">
                      <Link to={`/funding/${anomaly.symbol}`}>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>

                <CollapsibleContent asChild>
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={8} className="p-0">
                      <div className="p-4 space-y-4">
                        {/* Cross-Exchange Comparison */}
                        <div className="bg-background rounded-lg border p-4">
                          <h4 className="text-sm font-medium mb-3">Cross-Exchange Comparison</h4>
                          <div className="grid grid-cols-5 gap-4">
                            {symbolComparisons.map((comp) => {
                              const isMax = symbolStats && comp.fundingRate === symbolStats.maxRate;
                              const isMin = symbolStats && comp.fundingRate === symbolStats.minRate;

                              return (
                                <div
                                  key={comp.exchange}
                                  className={cn(
                                    'p-3 rounded-lg border',
                                    isMax && 'border-green-500 bg-green-500/10',
                                    isMin && 'border-red-500 bg-red-500/10'
                                  )}
                                >
                                  <div className="text-xs text-muted-foreground uppercase mb-1">
                                    {comp.exchange}
                                  </div>
                                  <div
                                    className={cn(
                                      'font-mono font-bold text-lg',
                                      comp.fundingRate === null
                                        ? 'text-muted-foreground'
                                        : comp.fundingRate >= 0
                                        ? 'text-green-500'
                                        : 'text-red-500'
                                    )}
                                  >
                                    {formatRate(comp.fundingRate)}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {formatTime(comp.nextFundingTime)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Stats Summary */}
                        {symbolStats && (
                          <div className="flex gap-6 text-sm">
                            <div>
                              <span className="text-muted-foreground">Spread: </span>
                              <span className="font-mono font-medium">{formatRate(symbolStats.spread)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Best Long: </span>
                              <span className="font-medium text-green-500">
                                {symbolStats.bestLongExchange.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Best Short: </span>
                              <span className="font-medium text-red-500">
                                {symbolStats.bestShortExchange.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                </CollapsibleContent>
              </>
            </Collapsible>
          );
        })}
      </TableBody>
    </Table>
  );
}
