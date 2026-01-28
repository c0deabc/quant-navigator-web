import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RefreshCw } from "lucide-react";

type CrossRow = {
  exchange: string;
  funding: number | null;
  next: string | null;
};

type FundingAnomalyRow = {
  id: string;
  created_at: string;
  symbol: string;

  trigger_exchange: string;
  trigger_funding: number;
  next_funding_ts: string;

  pre_window_min: number | null;
  threshold: number | null;

  spread: number | null;
  max_exchange: string | null;
  min_exchange: string | null;
  max_funding: number | null;
  min_funding: number | null;

  cross: any; // jsonb: массив объектов
  status: string | null;
};

function pct(x: number | null | undefined): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "—";
  return `${(x * 100).toFixed(3)}%`;
}

function fmtTs(ts: string | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: undefined,
      timeZoneName: "short",
    });
  } catch {
    return String(ts);
  }
}

function normalizeExchange(x: string | null | undefined): string {
  return (x || "").toUpperCase();
}

export default function FundingSymbolDetail() {
  const { symbol: symbolParam } = useParams();
  const symbol = (symbolParam || "").toUpperCase();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const triggerExchange = useMemo(() => {
    const v = sp.get("trigger") || sp.get("trigger_exchange") || "bybit";
    return v.toLowerCase();
  }, [sp]);

  const thresholdPct = useMemo(() => {
    const v = sp.get("threshold") || sp.get("thresholdPct") || "0.3";
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : 0.3;
  }, [sp]);

  const direction = useMemo(() => {
    // both | pos | neg
    const v = (sp.get("dir") || sp.get("direction") || "both").toLowerCase();
    if (v === "pos" || v === "positive") return "pos";
    if (v === "neg" || v === "negative") return "neg";
    return "both";
  }, [sp]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FundingAnomalyRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    // ВАЖНО: таблица funding_anomalies (а не funding_snapshot)
    let q = supabase
      .from("funding_anomalies")
      .select(
        "id, created_at, symbol, trigger_exchange, trigger_funding, next_funding_ts, pre_window_min, threshold, spread, max_exchange, min_exchange, max_funding, min_funding, cross, status"
      )
      .eq("symbol", symbol)
      .order("created_at", { ascending: false })
      .limit(50);

    // фильтр триггерной биржи (если задан)
    if (triggerExchange) {
      q = q.eq("trigger_exchange", triggerExchange);
    }

    // фильтр направления/порога (в таблице значения в долях: 0.003 = 0.3%)
    const thr = thresholdPct / 100;
    if (direction === "pos") q = q.gte("trigger_funding", thr);
    else if (direction === "neg") q = q.lte("trigger_funding", -thr);
    else q = q.or(`trigger_funding.gte.${thr},trigger_funding.lte.${-thr}`);

    const { data, error } = await q;

    if (error) {
      setError(error.message || String(error));
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as FundingAnomalyRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, triggerExchange, thresholdPct, direction]);

  const top = rows[0] || null;

  const crossRows: CrossRow[] = useMemo(() => {
    if (!top?.cross) return [];
    if (Array.isArray(top.cross)) {
      return top.cross.map((x: any) => ({
        exchange: String(x?.exchange || ""),
        funding: x?.funding ?? null,
        next: x?.next ?? null,
      }));
    }
    // иногда jsonb может прийти объектом-словарём
    if (typeof top.cross === "object") {
      return Object.values(top.cross).map((x: any) => ({
        exchange: String(x?.exchange || ""),
        funding: x?.funding ?? null,
        next: x?.next ?? null,
      }));
    }
    return [];
  }, [top]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-sm text-muted-foreground">Funding anomaly detail</div>
            <div className="text-xl font-semibold">{symbol || "—"}</div>
          </div>
        </div>

        <Button onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {error}
            <div className="mt-3">
              <Button variant="secondary" onClick={() => navigate("/funding")}>
                Back to Funding Monitor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && !top && (
        <Card>
          <CardHeader>
            <CardTitle>No data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No anomalies found for this symbol with current filters.
          </CardContent>
        </Card>
      )}

      {!error && top && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Summary</CardTitle>
              <Badge variant="secondary">{String(top.status || "active")}</Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <div className="text-muted-foreground">Trigger</div>
                <div className="font-medium">{normalizeExchange(top.trigger_exchange)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Trigger funding</div>
                <div className="font-medium">{pct(top.trigger_funding)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Next funding</div>
                <div className="font-medium">{fmtTs(top.next_funding_ts)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Spread (max-min)</div>
                <div className="font-medium">{pct(top.spread)}</div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Rule</div>
                <div className="font-medium">
                  |funding| ≥ {Number.isFinite(thresholdPct) ? thresholdPct.toFixed(3) : "0.300"}% (pre-window{" "}
                  {top.pre_window_min ?? 30}m)
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-muted-foreground">Created</div>
                <div className="font-medium">{fmtTs(top.created_at)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cross-exchange</CardTitle>
            </CardHeader>
            <CardContent>
              {crossRows.length === 0 ? (
                <div className="text-sm text-muted-foreground">No cross-exchange rows in `cross`.</div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground">
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-3">Exchange</th>
                        <th className="text-left py-2 pr-3">Funding</th>
                        <th className="text-left py-2 pr-3">Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crossRows.map((r, idx) => (
                        <tr key={`${r.exchange}-${idx}`} className="border-b border-border/60">
                          <td className="py-2 pr-3 font-medium">{normalizeExchange(r.exchange)}</td>
                          <td className="py-2 pr-3">{pct(r.funding)}</td>
                          <td className="py-2 pr-3">{fmtTs(r.next)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent anomalies</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3">Created</th>
                    <th className="text-left py-2 pr-3">Trigger</th>
                    <th className="text-left py-2 pr-3">Trigger funding</th>
                    <th className="text-left py-2 pr-3">Next funding</th>
                    <th className="text-left py-2 pr-3">Spread</th>
                    <th className="text-left py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-3">{fmtTs(r.created_at)}</td>
                      <td className="py-2 pr-3 font-medium">{normalizeExchange(r.trigger_exchange)}</td>
                      <td className="py-2 pr-3">{pct(r.trigger_funding)}</td>
                      <td className="py-2 pr-3">{fmtTs(r.next_funding_ts)}</td>
                      <td className="py-2 pr-3">{pct(r.spread)}</td>
                      <td className="py-2 pr-3">{String(r.status || "active")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
