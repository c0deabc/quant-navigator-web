-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for user status
CREATE TYPE public.user_status AS ENUM ('pending', 'active', 'disabled');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  status user_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create user_settings table for indicator preferences
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Data & Sampling
  lookback_days INTEGER DEFAULT 90,
  bar_interval TEXT DEFAULT '15m',
  
  -- Pair Filters
  min_correlation NUMERIC DEFAULT 0.7,
  max_cointegration_pvalue NUMERIC DEFAULT 0.05,
  min_volume_usd NUMERIC DEFAULT 100000,
  
  -- OU/Mean Reversion
  ou_theta_min NUMERIC DEFAULT 0.01,
  half_life_max_hours INTEGER DEFAULT 72,
  zscore_entry_threshold NUMERIC DEFAULT 2.0,
  zscore_exit_threshold NUMERIC DEFAULT 0.5,
  
  -- Hurst Filter
  hurst_max NUMERIC DEFAULT 0.5,
  
  -- Execution Defaults (for future use)
  margin_mode TEXT DEFAULT 'isolated',
  leverage_long INTEGER DEFAULT 3,
  leverage_short INTEGER DEFAULT 3,
  order_type TEXT DEFAULT 'market',
  position_size_mode TEXT DEFAULT 'percent_equity',
  position_size_value NUMERIC DEFAULT 5.0,
  max_slippage_percent NUMERIC DEFAULT 0.5,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create exchange_accounts table (for future API key storage)
CREATE TABLE public.exchange_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exchange_name TEXT NOT NULL,
  api_key_hint TEXT, -- Only store last 4 chars for display
  is_connected BOOLEAN DEFAULT false,
  permissions TEXT[] DEFAULT ARRAY['trade'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit_logs table for tracking sensitive actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create pair_metrics table for storing computed pair data
CREATE TABLE public.pair_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_a TEXT NOT NULL,
  symbol_b TEXT NOT NULL,
  correlation NUMERIC,
  cointegration_pvalue NUMERIC,
  ou_theta NUMERIC,
  half_life_hours NUMERIC,
  beta NUMERIC,
  hurst_exponent NUMERIC,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (symbol_a, symbol_b)
);

-- Create signals table for ranked trading signals
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_metrics_id UUID REFERENCES public.pair_metrics(id) ON DELETE CASCADE NOT NULL,
  z_ou_score NUMERIC NOT NULL,
  usd_spread NUMERIC,
  entry_price_a NUMERIC,
  entry_price_b NUMERIC,
  signal_direction TEXT, -- 'long_a_short_b' or 'short_a_long_b'
  confidence_score NUMERIC,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create global_scan_config table (admin-controlled)
CREATE TABLE public.global_scan_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_interval_minutes INTEGER DEFAULT 15,
  min_volume_filter NUMERIC DEFAULT 100000,
  correlation_threshold NUMERIC DEFAULT 0.7,
  cointegration_pvalue_limit NUMERIC DEFAULT 0.05,
  ou_theta_min NUMERIC DEFAULT 0.01,
  hurst_max NUMERIC DEFAULT 0.5,
  last_scan_at TIMESTAMPTZ,
  next_scan_at TIMESTAMPTZ,
  is_scanning BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create executions table for tracking trade attempts
CREATE TABLE public.executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_id UUID REFERENCES public.signals(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, preview, confirmed, success, failed, cancelled
  leverage_long INTEGER,
  leverage_short INTEGER,
  margin_mode TEXT,
  position_size NUMERIC,
  estimated_margin NUMERIC,
  slippage_tolerance NUMERIC,
  order_details JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pair_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_scan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user status
CREATE OR REPLACE FUNCTION public.get_user_status(_user_id UUID)
RETURNS user_status
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id AND status = 'active'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile display_name"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User settings policies
CREATE POLICY "Users can manage own settings"
  ON public.user_settings FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exchange accounts policies
CREATE POLICY "Users can manage own exchange accounts"
  ON public.exchange_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Audit logs policies (admins can view all, users can view own)
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Pair metrics policies (active users can view)
CREATE POLICY "Active users can view pair metrics"
  ON public.pair_metrics FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Admins can manage pair metrics"
  ON public.pair_metrics FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Signals policies (active users can view)
CREATE POLICY "Active users can view signals"
  ON public.signals FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Admins can manage signals"
  ON public.signals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Global scan config policies (admins only for write, active users can read)
CREATE POLICY "Active users can view scan config"
  ON public.global_scan_config FOR SELECT
  TO authenticated
  USING (public.is_user_active(auth.uid()));

CREATE POLICY "Admins can manage scan config"
  ON public.global_scan_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Executions policies
CREATE POLICY "Users can view own executions"
  ON public.executions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own executions"
  ON public.executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update own executions"
  ON public.executions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all executions"
  ON public.executions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to handle new user signup (creates profile and default role)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with pending status
  INSERT INTO public.profiles (user_id, email, display_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pending'
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Create default settings
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update triggers for tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchange_accounts_updated_at
  BEFORE UPDATE ON public.exchange_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_scan_config_updated_at
  BEFORE UPDATE ON public.global_scan_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_executions_updated_at
  BEFORE UPDATE ON public.executions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial global scan config
INSERT INTO public.global_scan_config (
  scan_interval_minutes,
  min_volume_filter,
  correlation_threshold,
  cointegration_pvalue_limit,
  ou_theta_min,
  hurst_max
) VALUES (15, 100000, 0.7, 0.05, 0.01, 0.5);