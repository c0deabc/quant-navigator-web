-- Create options_signals table
CREATE TABLE public.options_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  exchange text NOT NULL,
  symbol text NOT NULL,
  expiry date NOT NULL,
  signal_type text NOT NULL,
  direction text NOT NULL,
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 5),
  score numeric NOT NULL,
  summary text NOT NULL,
  details jsonb,
  status text NOT NULL DEFAULT 'NEW',
  link text
);

-- Create options_iv_surface_snapshots table
CREATE TABLE public.options_iv_surface_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  exchange text NOT NULL,
  symbol text NOT NULL,
  expiry date NOT NULL,
  atm_iv numeric,
  iv_10d_put numeric,
  iv_25d_put numeric,
  iv_50d numeric,
  iv_25d_call numeric,
  iv_10d_call numeric,
  skew_25d numeric,
  curvature_10d numeric,
  raw jsonb
);

-- Create options_realized_vol_snapshots table
CREATE TABLE public.options_realized_vol_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  symbol text NOT NULL,
  rv_7d numeric,
  rv_14d numeric,
  rv_30d numeric,
  rv_60d numeric,
  source text,
  raw jsonb
);

-- Enable RLS on all tables
ALTER TABLE public.options_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_iv_surface_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options_realized_vol_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for options_signals
CREATE POLICY "Active users can view options signals"
  ON public.options_signals FOR SELECT
  USING (is_user_active(auth.uid()));

CREATE POLICY "Admins can manage options signals"
  ON public.options_signals FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for options_iv_surface_snapshots
CREATE POLICY "Active users can view IV surface snapshots"
  ON public.options_iv_surface_snapshots FOR SELECT
  USING (is_user_active(auth.uid()));

CREATE POLICY "Admins can manage IV surface snapshots"
  ON public.options_iv_surface_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS policies for options_realized_vol_snapshots
CREATE POLICY "Active users can view RV snapshots"
  ON public.options_realized_vol_snapshots FOR SELECT
  USING (is_user_active(auth.uid()));

CREATE POLICY "Admins can manage RV snapshots"
  ON public.options_realized_vol_snapshots FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create indexes for common queries
CREATE INDEX idx_options_signals_symbol ON public.options_signals(symbol);
CREATE INDEX idx_options_signals_created_at ON public.options_signals(created_at DESC);
CREATE INDEX idx_options_signals_status ON public.options_signals(status);
CREATE INDEX idx_options_iv_surface_symbol_expiry ON public.options_iv_surface_snapshots(symbol, expiry);
CREATE INDEX idx_options_rv_symbol ON public.options_realized_vol_snapshots(symbol);