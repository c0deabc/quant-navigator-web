import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Save, RotateCcw, Plus, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // Indicator settings (mock initial values)
  const [settings, setSettings] = useState({
    // Data & Sampling
    lookbackDays: 90,
    barInterval: '15m',
    // Pair Filters
    minCorrelation: 0.7,
    maxCointegrationPvalue: 0.05,
    minVolumeUsd: 100000,
    // OU/Mean Reversion
    ouThetaMin: 0.01,
    halfLifeMaxHours: 72,
    zscoreEntryThreshold: 2.0,
    zscoreExitThreshold: 0.5,
    // Hurst
    hurstMax: 0.5,
  });

  // Execution settings
  const [execSettings, setExecSettings] = useState({
    marginMode: 'isolated',
    leverageLong: 3,
    leverageShort: 3,
    orderType: 'market',
    positionSizeMode: 'percent_equity',
    positionSizeValue: 5,
    maxSlippagePercent: 0.5,
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  };

  const handleReset = () => {
    setSettings({
      lookbackDays: 90,
      barInterval: '15m',
      minCorrelation: 0.7,
      maxCointegrationPvalue: 0.05,
      minVolumeUsd: 100000,
      ouThetaMin: 0.01,
      halfLifeMaxHours: 72,
      zscoreEntryThreshold: 2.0,
      zscoreExitThreshold: 0.5,
      hurstMax: 0.5,
    });
    toast.info('Settings reset to defaults');
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your indicator preferences and execution defaults
          </p>
        </div>

        <Tabs defaultValue="indicators" className="space-y-6">
          <TabsList>
            <TabsTrigger value="indicators">Indicator Filters</TabsTrigger>
            <TabsTrigger value="execution">Execution Defaults</TabsTrigger>
            <TabsTrigger value="exchange">Exchange Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="indicators" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Signal Filtering Preferences</CardTitle>
                    <CardDescription>
                      Customize which signals are displayed based on your thresholds
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Data & Sampling */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Data & Sampling</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="lookback">Lookback Period (days)</Label>
                      <Input
                        id="lookback"
                        type="number"
                        value={settings.lookbackDays}
                        onChange={(e) => setSettings(s => ({ ...s, lookbackDays: parseInt(e.target.value) || 0 }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Historical data window for correlation/cointegration
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interval">Bar Interval</Label>
                      <Select
                        value={settings.barInterval}
                        onValueChange={(v) => setSettings(s => ({ ...s, barInterval: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5m">5 minutes</SelectItem>
                          <SelectItem value="15m">15 minutes</SelectItem>
                          <SelectItem value="1h">1 hour</SelectItem>
                          <SelectItem value="4h">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pair Filters */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Pair Filters</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Min Correlation</Label>
                        <span className="font-mono text-sm">{settings.minCorrelation.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[settings.minCorrelation]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, minCorrelation: v }))}
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
                        <Label>Max Cointegration P-Value</Label>
                        <span className="font-mono text-sm">{settings.maxCointegrationPvalue.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[settings.maxCointegrationPvalue]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, maxCointegrationPvalue: v }))}
                        min={0.01}
                        max={0.1}
                        step={0.01}
                      />
                      <p className="text-xs text-muted-foreground">
                        Statistical significance threshold
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minVolume">Min Volume (USD)</Label>
                      <Input
                        id="minVolume"
                        type="number"
                        value={settings.minVolumeUsd}
                        onChange={(e) => setSettings(s => ({ ...s, minVolumeUsd: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* OU/Mean Reversion */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">OU / Mean Reversion</h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Z-Score Entry Threshold</Label>
                        <span className="font-mono text-sm">{settings.zscoreEntryThreshold.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[settings.zscoreEntryThreshold]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, zscoreEntryThreshold: v }))}
                        min={1.5}
                        max={3.0}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Z-Score Exit Threshold</Label>
                        <span className="font-mono text-sm">{settings.zscoreExitThreshold.toFixed(1)}</span>
                      </div>
                      <Slider
                        value={[settings.zscoreExitThreshold]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, zscoreExitThreshold: v }))}
                        min={0}
                        max={1.0}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="halfLife">Max Half-Life (hours)</Label>
                      <Input
                        id="halfLife"
                        type="number"
                        value={settings.halfLifeMaxHours}
                        onChange={(e) => setSettings(s => ({ ...s, halfLifeMaxHours: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Max Hurst Exponent</Label>
                        <span className="font-mono text-sm">{settings.hurstMax.toFixed(2)}</span>
                      </div>
                      <Slider
                        value={[settings.hurstMax]}
                        onValueChange={([v]) => setSettings(s => ({ ...s, hurstMax: v }))}
                        min={0.3}
                        max={0.6}
                        step={0.05}
                      />
                      <p className="text-xs text-muted-foreground">
                        Filter for mean-reverting behavior (H &lt; 0.5)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="execution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execution Defaults</CardTitle>
                <CardDescription>
                  Default settings for trade execution (used when opening positions)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Margin Mode</Label>
                    <Select
                      value={execSettings.marginMode}
                      onValueChange={(v) => setExecSettings(s => ({ ...s, marginMode: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="isolated">Isolated</SelectItem>
                        <SelectItem value="cross">Cross</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Order Type</Label>
                    <Select
                      value={execSettings.orderType}
                      onValueChange={(v) => setExecSettings(s => ({ ...s, orderType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="market">Market</SelectItem>
                        <SelectItem value="limit">Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="levLong">Long Leg Leverage</Label>
                    <Input
                      id="levLong"
                      type="number"
                      value={execSettings.leverageLong}
                      onChange={(e) => setExecSettings(s => ({ ...s, leverageLong: parseInt(e.target.value) || 1 }))}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="levShort">Short Leg Leverage</Label>
                    <Input
                      id="levShort"
                      type="number"
                      value={execSettings.leverageShort}
                      onChange={(e) => setExecSettings(s => ({ ...s, leverageShort: parseInt(e.target.value) || 1 }))}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Size Mode</Label>
                    <Select
                      value={execSettings.positionSizeMode}
                      onValueChange={(v) => setExecSettings(s => ({ ...s, positionSizeMode: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent_equity">% of Equity</SelectItem>
                        <SelectItem value="fixed_notional">Fixed Notional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posSize">
                      {execSettings.positionSizeMode === 'percent_equity' ? 'Position Size (%)' : 'Position Size (USD)'}
                    </Label>
                    <Input
                      id="posSize"
                      type="number"
                      value={execSettings.positionSizeValue}
                      onChange={(e) => setExecSettings(s => ({ ...s, positionSizeValue: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <Label>Max Slippage Tolerance (%)</Label>
                      <span className="font-mono text-sm">{execSettings.maxSlippagePercent.toFixed(1)}%</span>
                    </div>
                    <Slider
                      value={[execSettings.maxSlippagePercent]}
                      onValueChange={([v]) => setExecSettings(s => ({ ...s, maxSlippagePercent: v }))}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Execution Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exchange" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Accounts</CardTitle>
                <CardDescription>
                  Connect your exchange API keys for trade execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-warning/50 bg-warning/5 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-medium text-warning">Trade-Only Permissions Required</p>
                      <p className="text-sm text-muted-foreground">
                        Only create API keys with trade permissions. Never enable withdrawal permissions.
                        Your keys are encrypted and stored securely.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No exchange accounts connected</p>
                  <p className="text-sm mb-4">Connect your exchange to enable trade execution</p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Exchange Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
