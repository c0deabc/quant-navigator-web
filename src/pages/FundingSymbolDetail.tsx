import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// NOTE: This page reads from public.funding_anomalies (not funding_snapshot).
// Expected columns (typical):
// id, created_at, symbol, trigger_exchange, trigger_funding, next_funding_ts,
// pre_window_min, threshold, spread_pct, cross (jsonb), status

type CrossItem = {
  exchange?: string;
  funding?: number | string | null;
  next?: string | number | null;
  next_funding_ts?: string | null;
  next_funding_at?: string | null;
  next_funding_time?: string | null;
  [k: string]: unknown;
};

type FundingAnomalyRow = {
  id: string;
  created_at: string;
  symbol: string;
  trigger_exchange: string;
  trigger_funding: number;
  next_funding_ts: string;
  pre_window_min?: number | null;
  threshold?: number | null;
  spread_pct?: number | null;
  cross?: CrossItem[] | null;
  status?: string | null;
};

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatPct(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return "—";
  return `${(x * 100).toFixed(digits)}%`;
}

function formatDate(x: string | number | null | undefined): string {
  if (!x) return "—";
  const d = typeof x === "number" ? new Date(x) : new Date(x);
  if (Number.isNaN(d.getTime())) return String(x);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: undefined,
    timeZoneName: "short",
  });
}

function computeSpreadPctFromCross(cross: CrossItem[] | null | undefined): number | null {
  if (!cross || cross.length === 0) return null;
  const vals = cross
    .map((c) => asNumber(c.funding))
    .filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  return Math.max(...vals) - Math.min(...vals);
}

function normalizeCrossItem(c: CrossItem): { exchange: string; funding: number | null; next: string | number | null } {
  const exchange = String(c.exchange ?? "—").toUpperCase();
  const funding = asNumber(c.funding);
  const next =
    c.next_funding_ts ??
    c.next_funding_at ??
    c.next_funding_time ??
    c.next ??
    null;
  return { exchange, funding, next };
}

export default function FundingSymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<FundingAnomalyRow | null>(null);

  const load = async () => {
    if (!symbol) return;

    setLoading(true);
    setError(null);

    // Fetch the most recent anomaly for this symbol.
    const { data, error } = await supabase
      .from("funding_anomalies")
      .select(
        "id, created_at, symbol, trigger_exchange, trigger_funding, next_funding_ts, pre_window_min, threshold, spread_pct, cross, status"
      )
      .eq("symbol", symbol)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setRow(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("No anomaly found for this symbol.");
      setRow(null);
      setLoading(false);
      return;
    }

    setRow(data as FundingAnomalyRow);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  const cross = useMemo(() => {
    const raw = (row?.cross ?? []) as CrossItem[];
    const normalized = raw.map(normalizeCrossItem);
    // sort: trigger first, then by funding (desc)
    const trig = (row?.trigger_exchange ?? "").toUpperCase();
    normalized.sort((a, b) => {
      const aIsTrig = a.exchange === trig;
      const bIsTrig = b.exchange === trig;
      if (aIsTrig && !bIsTrig) return -1;
      if (!aIsTrig && bIsTrig) return 1;
      const af = a.funding ?? -Infinity;
      const bf = b.funding ?? -Infinity;
      return bf - af;
    });
    return normalized;
  }, [row]);

  const spreadPct = useMemo(() => {
    if (!row) return null;
    return row.spread_pct ?? computeSpreadPctFromCross(row.cross ?? null);
  }, [row]);

  const maxMin = useMemo(() => {
    if (!cross.length) return null;
    const valid = cross.filter((c) => c.funding !== null) as Array<{
      exchange: string;
      funding: number;
      next: string | number | null;
    }>;
    if (valid.length === 0) return null;
    let max = valid[0];
    let min = valid[0];
    for (const v of valid) {
      if (v.funding > max.funding) max = v;
      if (v.funding < min.funding) min = v;
    }
    return { max, min };
  }, [cross]);

  return (
    <div className="container mx-auto max-w-5xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/funding")}
            className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">Funding anomaly detail</div>
            <div className="text-2xl font-semibold leading-tight">{symbol ?? "—"}</div>
          </div>
        </div>

        <Button onClick={load} variant="secondary" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">{error}</div>
            <Button variant="outline" onClick={() => navigate("/funding")}>Back to Funding Monitor</Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && row && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Trigger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="uppercase">{row.trigger_exchange}</Badge>
                  <span className="text-lg font-semibold">
                    {formatPct(row.trigger_funding)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Threshold: {formatPct(row.threshold ?? null)} · Pre-window: {row.pre_window_min ?? 30}m
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Next funding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold">{formatDate(row.next_funding_ts)}</div>
                <div className="text-sm text-muted-foreground">Created: {formatDate(row.created_at)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Spread (max-min)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold">{formatPct(spreadPct)}</div>
                {maxMin ? (
                  <div className="text-sm text-muted-foreground">
                    Max: <span className="font-medium">{maxMin.max.exchange}</span> {formatPct(maxMin.max.funding)} · Min: <span className="font-medium">{maxMin.min.exchange}</span> {formatPct(maxMin.min.funding)}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Cross-exchange</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cross.length === 0 ? (
                <div className="text-sm text-muted-foreground">No cross-exchange data in this anomaly row.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3">Exchange</th>
                        <th className="py-2 pr-3">Funding</th>
                        <th className="py-2 pr-3">Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cross.map((c, idx) => {
                        const isTrig = c.exchange === String(row.trigger_exchange).toUpperCase();
                        return (
                          <tr key={`${c.exchange}-${idx}`} className="border-b last:border-b-0">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{c.exchange}</span>
                                {isTrig && <Badge variant="outline">trigger</Badge>}
                              </div>
                            </td>
                            <td className="py-2 pr-3 font-medium">{formatPct(c.funding)}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{formatDate(c.next)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
