import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, X } from 'lucide-react';
import {
  OptionsFilters,
  OPTIONS_SYMBOLS,
  OPTIONS_EXCHANGES,
  EXPIRY_RANGES,
  SIGNAL_TYPES,
  SignalType,
} from '@/types/options';

interface OptionsFiltersBarProps {
  filters: OptionsFilters;
  setFilters: React.Dispatch<React.SetStateAction<OptionsFilters>>;
  onRefresh: () => void;
  loading: boolean;
}

export function OptionsFiltersBar({
  filters,
  setFilters,
  onRefresh,
  loading,
}: OptionsFiltersBarProps) {
  const toggleSignalType = (type: SignalType) => {
    setFilters((prev) => ({
      ...prev,
      signalTypes: prev.signalTypes.includes(type)
        ? prev.signalTypes.filter((t) => t !== type)
        : [...prev.signalTypes, type],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Symbol</label>
          <Select
            value={filters.symbol}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, symbol: v as any }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {OPTIONS_SYMBOLS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Exchange</label>
          <Select
            value={filters.exchange}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, exchange: v as any }))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {OPTIONS_EXCHANGES.map((e) => (
                <SelectItem key={e} value={e} className="capitalize">
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Expiry Range</label>
          <Select
            value={filters.expiryRange}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, expiryRange: v as any }))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_RANGES.map((r) => (
                <SelectItem key={r} value={r}>
                  Next {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Min Severity</label>
          <Select
            value={String(filters.minSeverity)}
            onValueChange={(v) => setFilters((prev) => ({ ...prev, minSeverity: parseInt(v, 10) }))}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}+
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <label className="text-sm font-medium">Search</label>
          <Input
            placeholder="Search summary or symbol..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
        </div>

        <Button variant="outline" size="icon" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-muted-foreground mr-2">Signal Types:</span>
        {SIGNAL_TYPES.map((type) => {
          const isActive = filters.signalTypes.includes(type);
          return (
            <Badge
              key={type}
              variant={isActive ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => toggleSignalType(type)}
            >
              {type.replace(/_/g, ' ')}
              {isActive && <X className="h-3 w-3 ml-1" />}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
