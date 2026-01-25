import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { FundingSnapshot, FundingAnomaly, CrossExchangeComparison, FundingStats, SupportedExchange, QuoteFilter } from '@/types/funding';
import { SUPPORTED_EXCHANGES } from '@/types/funding';

interface UseFundingAnomaliesParams {
  triggerExchange: SupportedExchange;
  threshold: number;
  showDirection: 'positive' | 'negative' | 'both';
  searchSymbol: string;
  quoteFilter: QuoteFilter;
  page: number;
  pageSize: number;
}

interface UseFundingAnomaliesResult {
  anomalies: FundingAnomaly[];
  comparisons: Map<string, CrossExchangeComparison[]>;
  stats: Map<string, FundingStats>;
  loading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

export function useFundingAnomalies({
  triggerExchange,
  threshold,
  showDirection,
  searchSymbol,
  quoteFilter,
  page,
  pageSize,
}: UseFundingAnomaliesParams): UseFundingAnomaliesResult {
  const [anomalies, setAnomalies] = useState<FundingAnomaly[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<FundingSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Fetch anomalies from the trigger exchange
      let anomalyQuery = supabase
        .from('funding_snapshot')
        .select('*', { count: 'exact' })
        .eq('exchange', triggerExchange);

      // Filter by threshold: funding_rate >= threshold OR funding_rate <= -threshold
      if (showDirection === 'positive') {
        anomalyQuery = anomalyQuery.gte('funding_rate', threshold);
      } else if (showDirection === 'negative') {
        anomalyQuery = anomalyQuery.lte('funding_rate', -threshold);
      } else {
        // Both: need OR condition
        anomalyQuery = anomalyQuery.or(`funding_rate.gte.${threshold},funding_rate.lte.${-threshold}`);
      }

      // Quote filter
      if (quoteFilter !== 'all') {
        anomalyQuery = anomalyQuery.eq('quote', quoteFilter);
      }

      // Symbol search
      if (searchSymbol.trim()) {
        anomalyQuery = anomalyQuery.ilike('symbol', `%${searchSymbol.trim()}%`);
      }

      // Pagination
      const from = page * pageSize;
      const to = from + pageSize - 1;
      anomalyQuery = anomalyQuery.range(from, to).order('funding_rate', { ascending: false });

      const { data: anomalyData, error: anomalyError, count } = await anomalyQuery;

      if (anomalyError) throw anomalyError;

      const anomalySnapshots = (anomalyData || []) as FundingSnapshot[];
      setTotalCount(count || 0);

      // Convert to FundingAnomaly format
      const fundingAnomalies: FundingAnomaly[] = anomalySnapshots.map((snap) => ({
        symbol: snap.symbol,
        triggerExchange: snap.exchange,
        triggerRate: snap.funding_rate,
        nextFundingTime: snap.next_funding_time,
        updatedAt: snap.updated_at,
        direction: snap.funding_rate >= 0 ? 'positive' : 'negative',
      }));

      setAnomalies(fundingAnomalies);

      // Step 2: Fetch all snapshots for the anomaly symbols across all exchanges
      if (anomalySnapshots.length > 0) {
        const symbols = [...new Set(anomalySnapshots.map((s) => s.symbol))];
        
        const { data: allData, error: allError } = await supabase
          .from('funding_snapshot')
          .select('*')
          .in('symbol', symbols)
          .in('exchange', SUPPORTED_EXCHANGES as unknown as string[]);

        if (allError) throw allError;

        setAllSnapshots((allData || []) as FundingSnapshot[]);
      } else {
        setAllSnapshots([]);
      }
    } catch (err) {
      console.error('Error fetching funding anomalies:', err);
      setError('Failed to fetch funding data');
    } finally {
      setLoading(false);
    }
  }, [triggerExchange, threshold, showDirection, searchSymbol, quoteFilter, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build comparison map
  const comparisons = useMemo(() => {
    const map = new Map<string, CrossExchangeComparison[]>();
    
    anomalies.forEach((anomaly) => {
      const symbolSnapshots = allSnapshots.filter((s) => s.symbol === anomaly.symbol);
      
      const comparisonsForSymbol: CrossExchangeComparison[] = SUPPORTED_EXCHANGES.map((exchange) => {
        const snapshot = symbolSnapshots.find((s) => s.exchange === exchange);
        return {
          exchange,
          fundingRate: snapshot?.funding_rate ?? null,
          nextFundingTime: snapshot?.next_funding_time ?? null,
          updatedAt: snapshot?.updated_at ?? null,
        };
      });

      map.set(anomaly.symbol, comparisonsForSymbol);
    });

    return map;
  }, [anomalies, allSnapshots]);

  // Build stats map
  const stats = useMemo(() => {
    const map = new Map<string, FundingStats>();

    anomalies.forEach((anomaly) => {
      const comps = comparisons.get(anomaly.symbol) || [];
      const validRates = comps.filter((c) => c.fundingRate !== null);

      if (validRates.length === 0) {
        map.set(anomaly.symbol, {
          spread: 0,
          maxRate: 0,
          minRate: 0,
          bestLongExchange: '—',
          bestShortExchange: '—',
        });
        return;
      }

      const rates = validRates.map((c) => ({ exchange: c.exchange, rate: c.fundingRate! }));
      const maxEntry = rates.reduce((a, b) => (a.rate > b.rate ? a : b));
      const minEntry = rates.reduce((a, b) => (a.rate < b.rate ? a : b));

      map.set(anomaly.symbol, {
        spread: maxEntry.rate - minEntry.rate,
        maxRate: maxEntry.rate,
        minRate: minEntry.rate,
        bestLongExchange: minEntry.exchange, // Most negative = best for long
        bestShortExchange: maxEntry.exchange, // Most positive = best for short
      });
    });

    return map;
  }, [anomalies, comparisons]);

  return {
    anomalies,
    comparisons,
    stats,
    loading,
    error,
    totalCount,
    refetch: fetchData,
  };
}
