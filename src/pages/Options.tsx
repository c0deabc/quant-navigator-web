import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity } from 'lucide-react';
import { OptionsFilters } from '@/types/options';
import { OptionsFiltersBar } from '@/components/options/OptionsFiltersBar';
import { OptionsSignalTable } from '@/components/options/OptionsSignalTable';
import { VRPTab } from '@/components/options/VRPTab';
import { SmileTermTab } from '@/components/options/SmileTermTab';
import { useOptionsSignals } from '@/hooks/useOptionsData';

export default function Options() {
  const [filters, setFilters] = useState<OptionsFilters>({
    symbol: 'all',
    exchange: 'all',
    expiryRange: '30d',
    signalTypes: [],
    minSeverity: 1,
    search: '',
  });

  const { signals, loading, error, refetch } = useOptionsSignals(filters);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            Options
          </h1>
          <p className="text-muted-foreground mt-1">
            Volatility relative value signals: VRP, smile/skew, term structure, cross-exchange IV.
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Filter options signals by symbol, exchange, expiry range, and signal type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OptionsFiltersBar
              filters={filters}
              setFilters={setFilters}
              onRefresh={refetch}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="vrp">VRP (IV vs RV)</TabsTrigger>
            <TabsTrigger value="smile">Smile & Term</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Latest Options Signals</CardTitle>
                <CardDescription>
                  All volatility signals ordered by creation time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OptionsSignalTable signals={signals} loading={loading} error={error} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vrp">
            <VRPTab filters={filters} />
          </TabsContent>

          <TabsContent value="smile">
            <SmileTermTab filters={filters} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
