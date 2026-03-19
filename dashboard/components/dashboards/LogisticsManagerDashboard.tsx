"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StoreRegionPicker } from "@/components/context/StoreRegionPicker";
import type { StoreRegionContext } from "@/components/context/StoreRegionPicker";

type AiDemandPrediction = {
  region: string;
  storeId: string;
  horizonDays: number;
  generatedAt: string;
  confidence: { model: string; confidenceLevel: number; methodology: string };
  forecast: Array<{
    date: string;
    items: Array<{ item: string; forecast: number; lower: number; upper: number }>;
  }>;
  safetyStockRecommendations: Array<{ item: string; safetyStock: number }>;
  reorderRecommendations: Array<{ item: string; suggestedReorderQty: number; reason: string }>;
};

type ForecastComparison = {
  region: string;
  storeId: string;
  generatedAt: string;
  metrics: { mae: number; model: string };
  rows: Array<{ date: string; item: string; forecast: number; actual: number; absError: number }>;
};

type SupplyScheduleExport = {
  region: string;
  storeId: string;
  filename: string;
  mimeType: string;
  csvPreviewRows: Array<{ date: string; store: string; hub: string; item: string; qty: number }>;
  downloadUrl: string | null;
};

export function LogisticsManagerDashboard() {
  const [ctx, setCtx] = useState<StoreRegionContext | null>(null);
  const [aiPrediction, setAiPrediction] = useState<AiDemandPrediction | null>(null);
  const [forecastComparison, setForecastComparison] =
    useState<ForecastComparison | null>(null);
  const [exportMeta, setExportMeta] = useState<SupplyScheduleExport | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const region = ctx?.region ?? "Region C";
  const storeId = ctx?.storeId ?? "1";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAi(true);
      try {
        const [aiRes, cmpRes, expRes] = await Promise.all([
          fetch(
            `/api/service-stubs/logistics/ai-demand-prediction?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/service-stubs/logistics/forecast-comparison?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/service-stubs/logistics/supply-schedule-export?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
        ]);

        const [ai, cmp, exp] = await Promise.all([
          aiRes.json(),
          cmpRes.json(),
          expRes.json(),
        ]);

        if (!cancelled) {
          setAiPrediction(ai as AiDemandPrediction);
          setForecastComparison(cmp as ForecastComparison);
          setExportMeta(exp as SupplyScheduleExport);
        }
      } finally {
        if (!cancelled) setLoadingAi(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [region, storeId]);

  const mockInventory = [
    { item: "Coke", type: "Soda", qty: 120, low: false },
    { item: "Dr. Pepper", type: "Soda", qty: 38, low: true },
    { item: "Vanilla", type: "Syrup", qty: 75, low: false },
    { item: "Coconut", type: "Add In", qty: 12, low: true },
  ];

  return (
    <section className="space-y-4">
      <StoreRegionPicker onContextChange={setCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Logistics Manager Dashboard</CardTitle>
          <CardDescription>
            Regional supply coordination and forecasting (scaffold). {ctx
              ? `Context: ${ctx.region} / ${ctx.storeLabel}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Real-Time Regional Inventory</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Item</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInventory.map((inv) => (
                    <tr key={inv.item} className="border-t">
                      <td className="p-2">{inv.item}</td>
                      <td className="p-2">{inv.type}</td>
                      <td className="p-2">{inv.qty}</td>
                      <td className="p-2">
                        {inv.low ? (
                          <span className="text-destructive">Low</span>
                        ) : (
                          <span className="text-muted-foreground">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              TODO: populate with backend inventory + low-stock thresholds.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">CSV Import: Historical Usage</h3>
              <div className="rounded-lg border p-3">
                <input type="file" accept=".csv,text/csv" disabled />
                <div className="mt-3 flex gap-2">
                  <Button disabled>Import CSV</Button>
                  <Button variant="outline" disabled>
                    Use Template
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: implement CSV parsing and AI demand prediction triggers.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Assign Deliveries (&lt;= 1000 Miles)
              </h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  TODO: delivery assignment UI within and outside region.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="shipFrom">
                      From Store
                    </label>
                    <input
                      id="shipFrom"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      disabled
                      placeholder="TODO"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="shipTo">
                      To Store
                    </label>
                    <input
                      id="shipTo"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      disabled
                      placeholder="TODO"
                    />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button disabled>Assign Delivery</Button>
                  <Button variant="outline" disabled>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Coordinate Supply Transfers</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                TODO: coordinate transfers between local stores and shared regional suppliers.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr className="text-left">
                      <th className="p-2">Transfer</th>
                      <th className="p-2">Item</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-2">T-102</td>
                      <td className="p-2">Coconut</td>
                      <td className="p-2">60</td>
                      <td className="p-2 text-muted-foreground">Scheduled</td>
                    </tr>
                    <tr className="border-t">
                      <td className="p-2">T-091</td>
                      <td className="p-2">Dr. Pepper</td>
                      <td className="p-2">90</td>
                      <td className="p-2 text-muted-foreground">In Transit</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Generate/Update Supply Schedules</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Date</th>
                    <th className="p-2">Store</th>
                    <th className="p-2">Hub</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2">2026-03-10</td>
                    <td className="p-2">Store 12</td>
                    <td className="p-2">Hub X</td>
                    <td className="p-2 text-muted-foreground">Planned</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">2026-03-12</td>
                    <td className="p-2">Store 04</td>
                    <td className="p-2">Hub X</td>
                    <td className="p-2 text-muted-foreground">Planned</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <Button disabled>Generate Schedule</Button>
              <Button variant="outline" disabled>
                Save Updates
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">AI Demand Prediction</h3>
              <div className="rounded-lg border p-3">
                {loadingAi && !aiPrediction ? (
                  <p className="text-sm text-muted-foreground">Loading forecast…</p>
                ) : aiPrediction ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Model</p>
                      <p className="text-sm text-muted-foreground">
                        {aiPrediction.confidence.model}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Confidence</p>
                      <p className="text-sm text-muted-foreground">
                        {(aiPrediction.confidence.confidenceLevel * 100).toFixed(0)}%
                      </p>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/30">
                          <tr className="text-left">
                            <th className="p-2">Date</th>
                            <th className="p-2">Item</th>
                            <th className="p-2">Forecast</th>
                            <th className="p-2">Range</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiPrediction.forecast[0]?.items.map((it) => (
                            <tr key={it.item} className="border-t">
                              <td className="p-2 text-muted-foreground">
                                {aiPrediction.forecast[0].date}
                              </td>
                              <td className="p-2">{it.item}</td>
                              <td className="p-2">{it.forecast}</td>
                              <td className="p-2 text-muted-foreground">
                                {it.lower} - {it.upper}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Reorder recommendations
                      </p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {aiPrediction.reorderRecommendations.map((r) => (
                          <li
                            key={r.item}
                            className="flex items-start justify-between gap-3"
                          >
                            <span>{r.item}</span>
                            <span className="text-muted-foreground">
                              {r.suggestedReorderQty} (TODO hook)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">AI forecast unavailable.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Forecast vs Actual (Analytics)</h3>
              <div className="rounded-lg border p-3">
                {loadingAi && !forecastComparison ? (
                  <p className="text-sm text-muted-foreground">Loading analytics…</p>
                ) : forecastComparison ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">MAE</p>
                      <p className="text-sm text-muted-foreground">
                        {forecastComparison.metrics.mae.toFixed(2)}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/30">
                          <tr className="text-left">
                            <th className="p-2">Date</th>
                            <th className="p-2">Item</th>
                            <th className="p-2">Forecast</th>
                            <th className="p-2">Actual</th>
                            <th className="p-2">Abs Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {forecastComparison.rows.slice(0, 6).map((r) => (
                            <tr key={`${r.date}-${r.item}`} className="border-t">
                              <td className="p-2 text-muted-foreground">{r.date}</td>
                              <td className="p-2">{r.item}</td>
                              <td className="p-2">{r.forecast}</td>
                              <td className="p-2">{r.actual}</td>
                              <td className="p-2 text-muted-foreground">
                                {r.absError}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      TODO: confidence intervals + deeper comparison dashboards.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-destructive">Comparison unavailable.</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Low Inventory Notifications</h3>
              <div className="rounded-lg border p-3">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-destructive">Coconut</span>
                    <span className="text-muted-foreground">Suggested: 50 units</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-destructive">Dr. Pepper</span>
                    <span className="text-muted-foreground">Suggested: 35 units</span>
                  </li>
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: notifications + reorder recommendations.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Export Schedules & Demand Reports</h3>
              <div className="rounded-lg border p-3">
                {exportMeta ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Mock CSV export payload for this region/store context.
                    </p>
                    <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                      Filename: {exportMeta.filename}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b bg-muted/30">
                          <tr className="text-left">
                            <th className="p-2">Date</th>
                            <th className="p-2">Item</th>
                            <th className="p-2">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exportMeta.csvPreviewRows.slice(0, 5).map((row) => (
                            <tr key={`${row.date}-${row.item}-${row.qty}`} className="border-t">
                              <td className="p-2 text-muted-foreground">{row.date}</td>
                              <td className="p-2">{row.item}</td>
                              <td className="p-2">{row.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    TODO: export to CSV for logistics partners.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button disabled>Export CSV</Button>
                  <Button variant="outline" disabled>
                    Export Summary
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

