import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Search } from 'lucide-react';
import { SUPPORTED_EXCHANGES, QUOTE_FILTERS, SupportedExchange, QuoteFilter } from '@/types/funding';

interface FundingFiltersProps {
  triggerExchange: SupportedExchange;
  setTriggerExchange: (exchange: SupportedExchange) => void;
  threshold: number;
  setThreshold: (value: number) => void;
  showDirection: 'positive' | 'negative' | 'both';
  setShowDirection: (value: 'positive' | 'negative' | 'both') => void;
  searchSymbol: string;
  setSearchSymbol: (value: string) => void;
  quoteFilter: QuoteFilter;
  setQuoteFilter: (value: QuoteFilter) => void;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  onRefresh: () => void;
  loading: boolean;
}

export function FundingFilters({
  triggerExchange,
  setTriggerExchange,
  threshold,
  setThreshold,
  showDirection,
  setShowDirection,
  searchSymbol,
  setSearchSymbol,
  quoteFilter,
  setQuoteFilter,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  loading,
}: FundingFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 items-end">
      {/* Trigger Exchange */}
      <div className="space-y-2">
        <Label htmlFor="trigger-exchange">Trigger Exchange</Label>
        <Select value={triggerExchange} onValueChange={(v) => setTriggerExchange(v as SupportedExchange)}>
          <SelectTrigger id="trigger-exchange">
            <SelectValue placeholder="Select exchange" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {SUPPORTED_EXCHANGES.map((ex) => (
              <SelectItem key={ex} value={ex}>
                {ex.charAt(0).toUpperCase() + ex.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <Label htmlFor="threshold">Threshold (%)</Label>
        <Input
          id="threshold"
          type="number"
          step="0.01"
          min="0"
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
          className="font-mono"
        />
      </div>

      {/* Direction Filter */}
      <div className="space-y-2">
        <Label htmlFor="direction">Direction</Label>
        <Select value={showDirection} onValueChange={(v) => setShowDirection(v as 'positive' | 'negative' | 'both')}>
          <SelectTrigger id="direction">
            <SelectValue placeholder="Show" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="both">Both</SelectItem>
            <SelectItem value="positive">Positive Only</SelectItem>
            <SelectItem value="negative">Negative Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quote Filter */}
      <div className="space-y-2">
        <Label htmlFor="quote">Quote</Label>
        <Select value={quoteFilter} onValueChange={(v) => setQuoteFilter(v as QuoteFilter)}>
          <SelectTrigger id="quote">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            {QUOTE_FILTERS.map((q) => (
              <SelectItem key={q} value={q}>
                {q === 'all' ? 'All' : q}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Symbol Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Symbol</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="e.g. BTCUSDT"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Auto Refresh Toggle */}
      <div className="space-y-2">
        <Label>Auto Refresh</Label>
        <div className="flex items-center gap-2 h-10">
          <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          <span className="text-sm text-muted-foreground">{autoRefresh ? 'On' : 'Off'}</span>
        </div>
      </div>

      {/* Manual Refresh Button */}
      <div className="space-y-2">
        <Label className="invisible">Refresh</Label>
        <Button onClick={onRefresh} disabled={loading} variant="outline" className="w-full">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
