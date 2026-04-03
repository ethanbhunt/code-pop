"use client";

import { useEffect, useState, useCallback } from "react";
import { parseCsvText, rowsToCsv, downloadTextFile } from "@/lib/csv";
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

type OrbitInventoryItem = {
  inventoryId: number;
  itemName: string;
  itemType: string;
  quantity: number;
  thresholdLevel: number;
};

type TransferRow = {
  transferId: number;
  sourceStoreId: number;
  destStoreId: number;
  status: string;
  createdAt: string;
  items: Array<{ inventoryId?: number; itemName?: string; quantity: number }>;
};

const DELIVERY_STORE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export function LogisticsManagerDashboard() {
  const [ctx, setCtx] = useState<StoreRegionContext | null>(null);
  const [orbitInventory, setOrbitInventory] = useState<OrbitInventoryItem[] | null>(
    null
  );
  const [loadingInv, setLoadingInv] = useState(false);

  const [aiPrediction, setAiPrediction] = useState<AiDemandPrediction | null>(null);
  const [forecastComparison, setForecastComparison] =
    useState<ForecastComparison | null>(null);
  const [exportMeta, setExportMeta] = useState<SupplyScheduleExport | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [transferRows, setTransferRows] = useState<TransferRow[] | null>(null);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);

  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(
    null
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [shipFrom, setShipFrom] = useState<string>("1");
  const [shipTo, setShipTo] = useState<string>("2");
  const [deliveryDraft, setDeliveryDraft] = useState<string | null>(null);

  const region = ctx?.region ?? "Region C";
  const storeId = ctx?.storeId ?? "1";

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    try {
      const res = await fetch("/api/orbit/inventory");
      if (!res.ok) {
        setOrbitInventory(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitInventoryItem[] };
      setOrbitInventory(json.data ?? []);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAi(true);
      try {
        const [aiRes, cmpRes, expRes] = await Promise.all([
          fetch(
            `/api/orbit/logistics/ai-demand-prediction?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/orbit/logistics/forecast-comparison?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/orbit/logistics/supply-schedule-export?region=${encodeURIComponent(
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

  const loadTransfers = useCallback(async () => {
    setLoadingTransfers(true);
    try {
      const res = await fetch(`/api/orbit/logistics/transfers?storeId=${encodeURIComponent(storeId)}&limit=20`);
      if (!res.ok) {
        setTransferRows(null);
        return;
      }
      const json = (await res.json()) as { data?: TransferRow[] };
      setTransferRows(json.data ?? []);
    } finally {
      setLoadingTransfers(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const reloadAiInsights = useCallback(async () => {
    setLoadingAi(true);
    try {
      const [aiRes, cmpRes, expRes] = await Promise.all([
        fetch(
          `/api/orbit/logistics/ai-demand-prediction?region=${encodeURIComponent(
            region
          )}&storeId=${encodeURIComponent(storeId)}`
        ),
        fetch(
          `/api/orbit/logistics/forecast-comparison?region=${encodeURIComponent(
            region
          )}&storeId=${encodeURIComponent(storeId)}`
        ),
        fetch(
          `/api/orbit/logistics/supply-schedule-export?region=${encodeURIComponent(
            region
          )}&storeId=${encodeURIComponent(storeId)}`
        ),
      ]);
      const [ai, cmp, exp] = await Promise.all([
        aiRes.json(),
        cmpRes.json(),
        expRes.json(),
      ]);
      setAiPrediction(ai as AiDemandPrediction);
      setForecastComparison(cmp as ForecastComparison);
      setExportMeta(exp as SupplyScheduleExport);
    } finally {
      setLoadingAi(false);
    }
  }, [region, storeId]);

  const createTransfer = useCallback(async () => {
    if (shipFrom === shipTo) {
      setTransferNotice("Source and destination stores must be different.");
      return;
    }

    const preferred = lowStockItems[0] ?? (orbitInventory ?? [])[0];
    if (!preferred) {
      setTransferNotice("No inventory rows available to build a transfer.");
      return;
    }

    setCreatingTransfer(true);
    setTransferNotice(null);
    try {
      const payload = {
        sourceStoreId: Number(shipFrom),
        destStoreId: Number(shipTo),
        items: [
          {
            inventoryId: preferred.inventoryId,
            itemName: preferred.itemName,
            quantity: Math.max(1, preferred.thresholdLevel - preferred.quantity),
          },
        ],
      };

      const res = await fetch("/api/orbit/logistics/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        setTransferNotice(`Could not create transfer: ${text || `HTTP ${res.status}`}`);
        return;
      }

      setTransferNotice("Transfer created successfully.");
      await Promise.all([loadTransfers(), reloadAiInsights()]);
    } finally {
      setCreatingTransfer(false);
    }
  }, [shipFrom, shipTo, lowStockItems, orbitInventory, loadTransfers, reloadAiInsights]);

  function onCsvFile(file: File) {
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        setCsvPreview(parseCsvText(text));
      } catch (e) {
        setCsvPreview(null);
        setCsvError(e instanceof Error ? e.message : "Could not parse CSV");
      }
    };
    reader.readAsText(file);
  }

  function exportLogisticsCsv() {
    if (!exportMeta?.csvPreviewRows?.length) return;
    const header = ["date", "store", "hub", "item", "qty"];
    const body = exportMeta.csvPreviewRows.map((r) => [
      r.date,
      r.store,
      r.hub,
      r.item,
      String(r.qty),
    ]);
    downloadTextFile(
      exportMeta.filename || "supply-schedule.csv",
      rowsToCsv([header, ...body])
    );
  }

  function exportSummaryCsv() {
    if (!aiPrediction) return;
    const rows: string[][] = [
      ["field", "value"],
      ["region", aiPrediction.region],
      ["storeId", aiPrediction.storeId],
      ["generatedAt", aiPrediction.generatedAt],
      ["model", aiPrediction.confidence.model],
    ];
    aiPrediction.reorderRecommendations.forEach((r) => {
      rows.push(["reorder", `${r.item}:${r.suggestedReorderQty}:${r.reason}`]);
    });
    downloadTextFile(`demand-summary-${storeId}.csv`, rowsToCsv(rows));
  }

  const lowStockItems = (orbitInventory ?? []).filter(
    (i) => i.quantity < i.thresholdLevel
  );
  const lowStockNames = new Set(lowStockItems.map((i) => i.itemName));

  return (
    <section className="space-y-4">
      <StoreRegionPicker onContextChange={setCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Logistics Manager Dashboard</CardTitle>
          <CardDescription>
            Regional supply coordination with live OrbitDB-backed insights. OrbitDB inventory is{" "}
            <span className="font-medium">currently global</span>, so region/store context is advisory until
            location partitioning lands. {" "}
            {ctx ? `Context: ${ctx.region} / ${ctx.storeLabel}` : ""}
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
                  {loadingInv && !orbitInventory ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        Loading inventory…
                      </td>
                    </tr>
                  ) : !orbitInventory?.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        No inventory rows.
                      </td>
                    </tr>
                  ) : (
                    orbitInventory.map((inv) => {
                      const low = inv.quantity < inv.thresholdLevel;
                      return (
                        <tr key={inv.inventoryId} className="border-t">
                          <td className="p-2">{inv.itemName}</td>
                          <td className="p-2">{inv.itemType}</td>
                          <td className="p-2">{inv.quantity}</td>
                          <td className="p-2">
                            {low ? (
                              <span className="text-destructive">Low</span>
                            ) : (
                              <span className="text-muted-foreground">OK</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void loadInventory()}>
                Refresh inventory
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">CSV Import: Historical Usage</h3>
              <div className="rounded-lg border p-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCsvFile(f);
                  }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={!csvPreview}
                    onClick={() => void reloadAiInsights()}
                  >
                    Recompute AI forecast
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadTextFile(
                        "usage-template.csv",
                        rowsToCsv([
                          ["date", "item", "units"],
                          ["2026-03-01", "Example", "10"],
                        ])
                      )
                    }
                  >
                    Use Template
                  </Button>
                </div>
                {csvError ? (
                  <p className="mt-2 text-xs text-destructive">{csvError}</p>
                ) : null}
                {csvPreview ? (
                  <div className="mt-3 max-h-40 overflow-auto rounded-md border text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          {csvPreview.headers.map((h) => (
                            <th key={h} className="p-1 text-left font-medium">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.slice(0, 8).map((row, i) => (
                          <tr key={i} className="border-t">
                            {row.map((c, j) => (
                              <td key={j} className="p-1">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Choose a CSV to preview locally. Persisted usage ingestion requires Orbit.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">
                Assign Deliveries (&lt;= 1000 Miles)
              </h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Draft assignment (client only). Persisted routing and distance rules require
                  Orbit logistics APIs.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="shipFrom">
                      From Store
                    </label>
                    <select
                      id="shipFrom"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      value={shipFrom}
                      onChange={(e) => setShipFrom(e.target.value)}
                    >
                      {DELIVERY_STORE_OPTIONS.map((id) => (
                        <option key={`from-${id}`} value={id}>
                          Store {id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="shipTo">
                      To Store
                    </label>
                    <select
                      id="shipTo"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      value={shipTo}
                      onChange={(e) => setShipTo(e.target.value)}
                    >
                      {DELIVERY_STORE_OPTIONS.map((id) => (
                        <option key={`to-${id}`} value={id}>
                          Store {id}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={creatingTransfer}
                    onClick={() => void createTransfer()}
                  >
                    {creatingTransfer ? "Assigning…" : "Assign Delivery"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDeliveryDraft(null)}>
                    Clear
                  </Button>
                </div>
                {transferNotice ? (
                  <p className="mt-2 text-xs text-muted-foreground">{transferNotice}</p>
                ) : null}
                {deliveryDraft ? (
                  <p className="mt-2 text-xs text-muted-foreground">{deliveryDraft}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Coordinate Supply Transfers</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                Active transfers from OrbitDB logistics service.
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
                    {loadingTransfers && !transferRows ? (
                      <tr>
                        <td className="p-2 text-muted-foreground" colSpan={4}>
                          Loading transfers…
                        </td>
                      </tr>
                    ) : !(transferRows ?? []).length ? (
                      <tr>
                        <td className="p-2 text-muted-foreground" colSpan={4}>
                          No transfer rows available.
                        </td>
                      </tr>
                    ) : (
                      (transferRows ?? []).map((row) => (
                        <tr key={row.transferId} className="border-t">
                          <td className="p-2">T-{row.transferId}</td>
                          <td className="p-2">{row.items?.[0]?.itemName ?? `Inventory ${row.items?.[0]?.inventoryId ?? "?"}`}</td>
                          <td className="p-2">{row.items?.[0]?.quantity ?? 0}</td>
                          <td className="p-2 text-muted-foreground">{row.status}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void loadTransfers()}>
                  Refresh transfers
                </Button>
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
              <Button type="button" onClick={() => void reloadAiInsights()}>Generate Schedule</Button>
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
                              Suggested {r.suggestedReorderQty} — {r.reason}
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
                      Confidence bands come from forecast `lower`/`upper` values produced by the
                      logistics forecast service.
                      Deeper analytics need historical actuals in Orbit.
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
                {lowStockItems.length === 0 && !aiPrediction?.reorderRecommendations?.length ? (
                  <p className="text-sm text-muted-foreground">No low-stock rows from inventory.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {lowStockItems.map((i) => (
                      <li
                        key={i.inventoryId}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-destructive">{i.itemName}</span>
                        <span className="text-muted-foreground">
                          {i.quantity} / {i.thresholdLevel} (threshold)
                        </span>
                      </li>
                    ))}
                    {(aiPrediction?.reorderRecommendations ?? [])
                      .filter((r) => !lowStockNames.has(r.item))
                      .map((r) => (
                        <li
                          key={`rec-${r.item}`}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-foreground">{r.item}</span>
                          <span className="text-muted-foreground">
                            Suggested reorder: {r.suggestedReorderQty}
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Push/email notifications require a notification service; this list combines live
                  inventory thresholds with AI suggestions.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Export Schedules & Demand Reports</h3>
              <div className="rounded-lg border p-3">
                {exportMeta ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      CSV export preview generated from live logistics and inventory data.
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
                    Load export metadata for the selected region/store context.
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={!exportMeta?.csvPreviewRows?.length}
                    onClick={() => exportLogisticsCsv()}
                  >
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!aiPrediction}
                    onClick={() => exportSummaryCsv()}
                  >
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

