import { useState } from 'react';
import { OptionsSignal } from '@/types/options';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { format } from 'date-fns';
import { ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionsSignalTableProps {
  signals: OptionsSignal[];
  loading: boolean;
  error: string | null;
}

function formatPercent(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return `${v.toFixed(2)}%`;
}

function getSeverityColor(severity: number): string {
  if (severity >= 4) return 'text-red-500';
  if (severity >= 3) return 'text-yellow-500';
  return 'text-muted-foreground';
}

function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'NEW':
      return 'default';
    case 'ACTIVE':
      return 'secondary';
    case 'CLOSED':
      return 'outline';
    case 'INVALID':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function OptionsSignalTable({ signals, loading, error }: OptionsSignalTableProps) {
  const [selectedSignal, setSelectedSignal] = useState<OptionsSignal | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  if (signals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertTriangle className="h-8 w-8 mx-auto mb-4 opacity-50" />
        <p>No signals found. Insert data into options_signals table to populate.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Exchange</TableHead>
              <TableHead>Symbol</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signals.map((signal) => (
              <TableRow
                key={signal.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedSignal(signal)}
              >
                <TableCell className="font-mono text-sm">
                  {format(new Date(signal.created_at), 'MMM dd HH:mm')}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="uppercase">
                    {signal.exchange}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold">{signal.symbol}</TableCell>
                <TableCell className="font-mono text-sm">
                  {format(new Date(signal.expiry), 'MMM dd')}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {signal.signal_type.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{signal.direction}</TableCell>
                <TableCell>
                  <span className={cn('font-bold', getSeverityColor(signal.severity))}>
                    {signal.severity}
                  </span>
                </TableCell>
                <TableCell className="font-mono">{signal.score.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(signal.status)}>{signal.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {signal.link && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={signal.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={!!selectedSignal} onOpenChange={() => setSelectedSignal(null)}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          {selectedSignal && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedSignal.symbol} — {selectedSignal.signal_type.replace(/_/g, ' ')}
                </SheetTitle>
                <SheetDescription>{selectedSignal.summary}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="uppercase">
                    {selectedSignal.exchange}
                  </Badge>
                  <Badge variant="secondary">{selectedSignal.direction}</Badge>
                  <Badge variant={getStatusBadgeVariant(selectedSignal.status)}>
                    {selectedSignal.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Expiry</span>
                    <p className="font-mono">{format(new Date(selectedSignal.expiry), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Severity</span>
                    <p className={cn('font-bold', getSeverityColor(selectedSignal.severity))}>
                      {selectedSignal.severity} / 5
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Score</span>
                    <p className="font-mono">{selectedSignal.score.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p className="font-mono text-sm">
                      {format(new Date(selectedSignal.created_at), 'MMM dd, yyyy HH:mm')} UTC
                    </p>
                  </div>
                </div>

                {selectedSignal.details && Object.keys(selectedSignal.details).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Details</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedSignal.details).map(([key, value]) => (
                        <div key={key} className="bg-muted rounded-md px-3 py-1.5">
                          <span className="text-xs text-muted-foreground">{key}: </span>
                          <span className="font-mono text-sm">
                            {typeof value === 'number' ? formatPercent(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSignal.link && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={selectedSignal.link} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open External Link
                    </a>
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
