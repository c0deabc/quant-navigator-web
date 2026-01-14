import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, RefreshCw, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ScanConfig = Database['public']['Tables']['global_scan_config']['Row'];

export default function ScanConfig() {
  const [config, setConfig] = useState<ScanConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('global_scan_config')
        .select('*')
        .single();

      if (error) throw error;
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load scan configuration');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('global_scan_config')
        .update({
          scan_interval_minutes: config.scan_interval_minutes,
          min_volume_filter: config.min_volume_filter,
          correlation_threshold: config.correlation_threshold,
          cointegration_pvalue_limit: config.cointegration_pvalue_limit,
          ou_theta_min: config.ou_theta_min,
          hurst_max: config.hurst_max,
        })
        .eq('id', config.id);

      if (error) throw error;

      toast.success('Scan configuration saved');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerScan = () => {
    toast.info('Scan trigger will be available once Python API is connected');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!config) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-muted-foreground">
          Failed to load configuration
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Global Scan Configuration</h1>
            <p className="text-muted-foreground">
              Configure parameters for the automated pair scanning system
            </p>
          </div>
        </div>

        {/* Scan Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scan Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${config.is_scanning ? 'bg-warning animate-pulse' : 'bg-success'}`} />
                  <span className="font-medium">
                    {config.is_scanning ? 'Scanning in progress...' : 'Idle'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last scan: {config.last_scan_at ? new Date(config.last_scan_at).toLocaleString() : 'Never'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Next scan: {config.next_scan_at ? new Date(config.next_scan_at).toLocaleString() : 'Not scheduled'}
                </div>
              </div>
              <Button onClick={handleTriggerScan} disabled={config.is_scanning}>
                <RefreshCw className={`mr-2 h-4 w-4 ${config.is_scanning ? 'animate-spin' : ''}`} />
                Trigger Scan Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scan Parameters</CardTitle>
                <CardDescription>
                  These settings apply globally to all automated scans
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Timing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Timing</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interval">Scan Interval (minutes)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={config.scan_interval_minutes || 15}
                    onChange={(e) => setConfig(c => c ? { ...c, scan_interval_minutes: parseInt(e.target.value) || 15 } : c)}
                    min={5}
                    max={60}
                  />
                  <p className="text-xs text-muted-foreground">
                    How often the system scans for new signals (5-60 min)
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Pair Filters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pair Filters</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="volume">Min Volume (USD)</Label>
                  <Input
                    id="volume"
                    type="number"
                    value={config.min_volume_filter || 100000}
                    onChange={(e) => setConfig(c => c ? { ...c, min_volume_filter: parseInt(e.target.value) || 100000 } : c)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 24h trading volume for pair consideration
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Correlation Threshold</Label>
                    <span className="font-mono text-sm">{(config.correlation_threshold || 0.7).toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[config.correlation_threshold || 0.7]}
                    onValueChange={([v]) => setConfig(c => c ? { ...c, correlation_threshold: v } : c)}
                    min={0.5}
                    max={0.95}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum correlation coefficient between pairs
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Cointegration P-Value Limit</Label>
                    <span className="font-mono text-sm">{(config.cointegration_pvalue_limit || 0.05).toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[config.cointegration_pvalue_limit || 0.05]}
                    onValueChange={([v]) => setConfig(c => c ? { ...c, cointegration_pvalue_limit: v } : c)}
                    min={0.01}
                    max={0.1}
                    step={0.01}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum p-value for cointegration test
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* OU Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">OU / Mean Reversion</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Min OU Theta</Label>
                    <span className="font-mono text-sm">{(config.ou_theta_min || 0.01).toFixed(3)}</span>
                  </div>
                  <Slider
                    value={[config.ou_theta_min || 0.01]}
                    onValueChange={([v]) => setConfig(c => c ? { ...c, ou_theta_min: v } : c)}
                    min={0.001}
                    max={0.1}
                    step={0.001}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum mean-reversion speed parameter
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Hurst Exponent</Label>
                    <span className="font-mono text-sm">{(config.hurst_max || 0.5).toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[config.hurst_max || 0.5]}
                    onValueChange={([v]) => setConfig(c => c ? { ...c, hurst_max: v } : c)}
                    min={0.3}
                    max={0.6}
                    step={0.05}
                  />
                  <p className="text-xs text-muted-foreground">
                    Filter for mean-reverting series (H &lt; 0.5)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
