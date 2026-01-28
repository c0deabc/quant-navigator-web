import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  OptionsSignal,
  IVSurfaceSnapshot,
  RealizedVolSnapshot,
  OptionsFilters,
  ExpiryRange,
} from '@/types/options';
import { addDays, format } from 'date-fns';

function getExpiryDate(range: ExpiryRange): string {
  const days = parseInt(range.replace('d', ''), 10);
  return format(addDays(new Date(), days), 'yyyy-MM-dd');
}

export function useOptionsSignals(filters: OptionsFilters) {
  const [signals, setSignals] = useState<OptionsSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('options_signals')
        .select('*')
        .order('created_at', { ascending: false })
        .lte('expiry', getExpiryDate(filters.expiryRange))
        .gte('severity', filters.minSeverity);

      if (filters.symbol !== 'all') {
        query = query.eq('symbol', filters.symbol);
      }

      if (filters.exchange !== 'all') {
        query = query.eq('exchange', filters.exchange);
      }

      if (filters.signalTypes.length > 0) {
        query = query.in('signal_type', filters.signalTypes);
      }

      if (filters.search.trim()) {
        query = query.or(`summary.ilike.%${filters.search}%,symbol.ilike.%${filters.search}%`);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;

      setSignals((data || []) as OptionsSignal[]);
    } catch (e: any) {
      console.error('Error fetching options signals:', e);
      setError(e?.message || 'Failed to load options signals');
      setSignals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.symbol, filters.exchange, filters.expiryRange, filters.signalTypes.join(','), filters.minSeverity, filters.search]);

  return { signals, loading, error, refetch };
}

export function useIVSurface(symbol: string, exchange: string | 'all') {
  const [snapshots, setSnapshots] = useState<IVSurfaceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('options_iv_surface_snapshots')
        .select('*')
        .eq('symbol', symbol)
        .order('expiry', { ascending: true });

      if (exchange !== 'all') {
        query = query.eq('exchange', exchange);
      }

      const { data, error: fetchError } = await query.limit(50);

      if (fetchError) throw fetchError;

      setSnapshots((data || []) as IVSurfaceSnapshot[]);
    } catch (e: any) {
      console.error('Error fetching IV surface:', e);
      setError(e?.message || 'Failed to load IV surface data');
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, exchange]);

  return { snapshots, loading, error, refetch };
}

export function useRealizedVol(symbol: string) {
  const [snapshot, setSnapshot] = useState<RealizedVolSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('options_realized_vol_snapshots')
        .select('*')
        .eq('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      setSnapshot(data && data[0] ? (data[0] as RealizedVolSnapshot) : null);
    } catch (e: any) {
      console.error('Error fetching realized vol:', e);
      setError(e?.message || 'Failed to load realized volatility data');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (symbol) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return { snapshot, loading, error, refetch };
}
