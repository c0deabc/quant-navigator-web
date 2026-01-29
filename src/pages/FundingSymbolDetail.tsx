import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FundingAnomalyRow = {
  id: string;
  created_at: string;
  symbol: string;
  trigger_exchange: string;
  trigger_funding: number | string | null;
  next_funding_ts: string;
  pre_window_min?: number | null;
  threshold?: number | string | null;
  spread_max_min?: number | null;
  cross_data?: unknown;
  status?: string | null;
};

type CrossItem = {
  exchange?: string;
  funding?: number | string | null;
  next?: string | null;
};

function asNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatPct(v: number | null): string {
  if (v === null) return "—";
  return `${(v * 100).toFixed(3)}%`;
}

function formatDate(isoLike?: string | null): string {
  if (!isoLike) return "—";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return String(isoLike);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * cross_data может быть:
 * - массивом объектов [{exchange, funding, next}, ...]
 * - объектом с полем cross_data / data / cross
 * - вообще чем угодно (на всякий случай)
 */
function normalizeCrossData(input: unknown): CrossItem[] {
  if (!input) return [];
  if (Array.isArray(input)) return input as CrossItem[];

  if (typeof input === "object") {
    const obj = input as Record<string, unknown>;
    const candidate =
      (obj["cross_data"] as unknown) ??
      (obj["data"] as unknown) ??
      (obj["cross"] as unknown) ??
      null;

    if (Array.isArray(candidate)) return candidate as CrossItem[];
  }

  return [];
}

export default function FundingSymbolDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [row, setRow] = useState<FundingAnomalyRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cross = useMemo(() => normalizeCrossData(row?.cross_data), [row?.cross_data]);

  async function fetchLatest() {
    if (!symbol) {
      setError("Missing symbol in route params.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch the latest snapshot for this symbol from funding_snapshot table
    const { data, error: fetchError } = await supabase
      .from("funding_snapshot")
      .select("id, updated_at, symbol, exchange, funding_rate, next_funding_time, quote")
      .eq("symbol", symbol)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setRow(null);
      setLoading(false);
      return;
    }

    if (!data) {
      setError(`No funding data found for ${symbol}`);
      setRow(null);
      setLoading(false);
      return;
    }

    // Transform to expected shape
    const transformed: FundingAnomalyRow = {
      id: data.id,
      created_at: data.updated_at,
      symbol: data.symbol,
      trigger_exchange: data.exchange,
      trigger_funding: data.funding_rate,
      next_funding_ts: data.next_funding_time || data.updated_at,
      pre_window_min: 30,
      threshold: null,
      spread_max_min: null,
      cross_data: null,
      status: null,
    };

    setRow(transformed);
    setLoading(false);
  }

  useEffect(() => {
    fetchLatest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  return (
    <div className="container mx-auto max-w-6xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/funding")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">Funding anomaly detail</div>
            <div className="text-2xl font-semibold">{symbol ?? "—"}</div>
          </div>
        </div>

        <Button onClick={fetchLatest} className="gap-2" variant="secondary">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-muted-foreground">{error}</div>
            <Button onClick={() => navigate("/funding")} variant="secondary">
              Back to Funding Monitor
            </Button>
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
                  <Badge variant="secondary" className="uppercase">
                    {row.trigger_exchange}
                  </Badge>
                  <span className="text-lg font-semibold">{formatPct(asNumber(row.trigger_funding))}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Threshold: {formatPct(asNumber(row.threshold))} · Pre-window: {row.pre_window_min ?? 30}m
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
                <CardTitle className="text-sm text-muted-foreground">Spread</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-lg font-semibold">{formatPct(asNumber(row.spread_max_min))}</div>
                <div className="text-sm text-muted-foreground">max(funding) − min(funding)</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Cross-exchange</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Data from <span className="font-mono">funding_anomalies.cross_data</span>
                </div>
              </div>
              {row.status && <Badge variant="outline" className="uppercase">{row.status}</Badge>}
            </CardHeader>
            <CardContent>
              {cross.length === 0 ? (
                <div className="text-muted-foreground">No cross-exchange data in this row.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 text-left">Exchange</th>
                        <th className="py-2 text-right">Funding</th>
                        <th className="py-2 text-left">Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cross.map((c, idx) => (
                        <tr key={idx} className="border-b last:border-b-0">
                          <td className="py-2">
                            <Badge variant="secondary" className="uppercase">
                              {c.exchange ?? "—"}
                            </Badge>
                          </td>
                          <td className="py-2 text-right font-medium">
                            {formatPct(asNumber(c.funding))}
                          </td>
                          <td className="py-2">{formatDate(c.next ?? null)}</td>
                        </tr>
                      ))}
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
