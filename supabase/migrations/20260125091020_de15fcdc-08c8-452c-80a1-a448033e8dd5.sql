-- Create funding_snapshot table for latest funding rates per exchange+symbol
CREATE TABLE public.funding_snapshot (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quote TEXT,
  funding_rate NUMERIC NOT NULL,
  next_funding_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exchange, symbol)
);

-- Create index for efficient querying
CREATE INDEX idx_funding_snapshot_exchange ON public.funding_snapshot(exchange);
CREATE INDEX idx_funding_snapshot_symbol ON public.funding_snapshot(symbol);
CREATE INDEX idx_funding_snapshot_funding_rate ON public.funding_snapshot(funding_rate);

-- Enable RLS
ALTER TABLE public.funding_snapshot ENABLE ROW LEVEL SECURITY;

-- Active users can view funding snapshots
CREATE POLICY "Active users can view funding snapshots"
ON public.funding_snapshot
FOR SELECT
USING (is_user_active(auth.uid()));

-- Admins can manage funding snapshots
CREATE POLICY "Admins can manage funding snapshots"
ON public.funding_snapshot
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create funding_series table for historical time series (phase 2)
CREATE TABLE public.funding_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  funding_rate NUMERIC NOT NULL
);

-- Create indexes for efficient time series queries
CREATE INDEX idx_funding_series_exchange_symbol ON public.funding_series(exchange, symbol);
CREATE INDEX idx_funding_series_ts ON public.funding_series(ts DESC);

-- Enable RLS
ALTER TABLE public.funding_series ENABLE ROW LEVEL SECURITY;

-- Active users can view funding series
CREATE POLICY "Active users can view funding series"
ON public.funding_series
FOR SELECT
USING (is_user_active(auth.uid()));

-- Admins can manage funding series
CREATE POLICY "Admins can manage funding series"
ON public.funding_series
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));