import { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FundingFilters } from '@/components/funding/FundingFilters';
import { FundingAnomalyTable } from '@/components/funding/FundingAnomalyTable';
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react';
import { useFundingAnomalies } from '@/hooks/useFundingAnomalies';
import { SupportedExchange, QuoteFilter } from '@/types/funding';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE = 20;

export default function FundingMonitor() {
  // Filter state
  const [triggerExchange, setTriggerExchange] = useState<SupportedExchange>('bybit');
  const [threshold, setThreshold] = useState(0.3);
  const [showDirection, setShowDirection] = useState<'positive' | 'negative' | 'both'>('both');
  const [searchSymbol, setSearchSymbol] = useState('');
  const [quoteFilter, setQuoteFilter] = useState<QuoteFilter>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);

  const { anomalies, comparisons, stats, loading, error, totalCount, refetch } = useFundingAnomalies({
    triggerExchange,
    threshold,
    showDirection,
    searchSymbol,
    quoteFilter,
    page,
    pageSize: PAGE_SIZE,
  });

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refetch, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            Funding Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Detect and compare funding rate anomalies across exchanges
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Threshold: funding rate ≥ +{threshold}% or ≤ -{threshold}% triggers an anomaly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FundingFilters
              triggerExchange={triggerExchange}
              setTriggerExchange={setTriggerExchange}
              threshold={threshold}
              setThreshold={setThreshold}
              showDirection={showDirection}
              setShowDirection={setShowDirection}
              searchSymbol={searchSymbol}
              setSearchSymbol={setSearchSymbol}
              quoteFilter={quoteFilter}
              setQuoteFilter={setQuoteFilter}
              autoRefresh={autoRefresh}
              setAutoRefresh={setAutoRefresh}
              onRefresh={refetch}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Anomalies Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Funding Anomalies
              {totalCount > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalCount} found)
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Symbols with extreme funding rates on {triggerExchange.toUpperCase()}
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
            ) : (
              <>
                <FundingAnomalyTable
                  anomalies={anomalies}
                  comparisons={comparisons}
                  stats={stats}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            className={page === 0 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i;
                          } else if (page < 3) {
                            pageNum = i;
                          } else if (page > totalPages - 4) {
                            pageNum = totalPages - 5 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setPage(pageNum)}
                                isActive={page === pageNum}
                                className="cursor-pointer"
                              >
                                {pageNum + 1}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                            className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
