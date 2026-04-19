"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback, useMemo } from "react";
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
  thresholdLevel?: number;
  minThreshold?: number;
};

type OrbitTransfer = {
  transferId: number;
  sourceStoreId: number;
  destStoreId: number;
  status: string;
  items?: Array<{ inventoryId?: number; quantity?: number }>;
};

type DeliveryAssignmentRow = {
  assignmentId: number;
  transferId: number;
  driverId: number;
  status?: string;
  vehicle?: string | null;
};

type ReorderNotificationRow = {
  notificationId: number;
  storeId: number;
  itemName?: string;
  status?: string;
  message?: string;
};

const DELIVERY_STORE_OPTIONS = Array.from({ length: 12 }, (_, i) => String(i + 1));

const TRANSFER_STATUSES = ["pending", "approved", "in_transit", "delivered", "cancelled"] as const;

export function LogisticsManagerDashboard() {
  const { data: session } = useSession();
  const driverId = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;

  const [ctx, setCtx] = useState<StoreRegionContext | null>(null);
  const [orbitInventory, setOrbitInventory] = useState<OrbitInventoryItem[] | null>(
    null
  );
  const [loadingInv, setLoadingInv] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);

  const [aiPrediction, setAiPrediction] = useState<AiDemandPrediction | null>(null);
  const [forecastComparison, setForecastComparison] =
    useState<ForecastComparison | null>(null);
  const [exportMeta, setExportMeta] = useState<SupplyScheduleExport | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(
    null
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const [shipFrom, setShipFrom] = useState<string>("1");
  const [shipTo, setShipTo] = useState<string>("2");
  const [deliveryDraft, setDeliveryDraft] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<OrbitTransfer[] | null>(null);
  const [assignments, setAssignments] = useState<DeliveryAssignmentRow[] | null>(null);
  const [reorderNotifications, setReorderNotifications] = useState<ReorderNotificationRow[] | null>(
    null
  );
  const [loadingLogisticsApi, setLoadingLogisticsApi] = useState(false);
  const [logisticsApiError, setLogisticsApiError] = useState<string | null>(null);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [deliveryTransferId, setDeliveryTransferId] = useState<string>("");
  const [patchingTransferId, setPatchingTransferId] = useState<number | null>(null);

  const region = ctx?.region ?? "Region C";
  const storeId = ctx?.storeId ?? "1";

  function itemThreshold(row: OrbitInventoryItem): number {
    if (typeof row.thresholdLevel === "number") return row.thresholdLevel;
    if (typeof row.minThreshold === "number") return row.minThreshold;
    return 0;
  }

  /**
   * Same store can contain multiple inventory rows for one flavor (e.g. repeated seed runs).
   * Show one row per item+type; keep the row with the largest inventoryId for transfers.
   */
  const inventoryRowsForDisplay = useMemo(() => {
    const rows = orbitInventory ?? [];
    const byKey = new Map<string, OrbitInventoryItem>();
    for (const r of rows) {
      const k = `${(r.itemName ?? "").trim().toLowerCase()}\0${(r.itemType ?? "").trim().toLowerCase()}`;
      const prev = byKey.get(k);
      if (!prev || r.inventoryId > prev.inventoryId) {
        byKey.set(k, r);
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      (a.itemName ?? "").localeCompare(b.itemName ?? "", undefined, { sensitivity: "base" })
    );
  }, [orbitInventory]);

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    setInventoryError(null);
    try {
      const res = await fetch(
        `/api/orbit/inventory?storeId=${encodeURIComponent(storeId)}&limit=100`
      );
      if (!res.ok) {
        setOrbitInventory(null);
        setInventoryError(
          res.status === 403
            ? "Inventory forbidden for this session."
            : (await res.text().catch(() => res.statusText)) || `Error ${res.status}`
        );
        return;
      }
      const json = (await res.json()) as { data?: OrbitInventoryItem[] };
      setOrbitInventory(json.data ?? []);
    } finally {
      setLoadingInv(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const loadLogisticsApi = useCallback(async () => {
    const sid = parseInt(storeId, 10);
    if (Number.isNaN(sid)) return;
    setLoadingLogisticsApi(true);
    setLogisticsApiError(null);
    try {
      const [trRes, asgRes, roRes] = await Promise.all([
        fetch(`/api/orbit/logistics/transfers?storeId=${encodeURIComponent(String(sid))}`),
        fetch("/api/orbit/logistics/delivery-assignments"),
        fetch(`/api/orbit/notifications/reorder?storeId=${encodeURIComponent(String(sid))}`),
      ]);
      if (trRes.ok) {
        const j = (await trRes.json()) as { data?: OrbitTransfer[] };
        setTransfers(j.data ?? []);
      } else {
        setTransfers(null);
        const body = await trRes.text().catch(() => trRes.statusText);
        if (trRes.status === 403) {
          setLogisticsApiError(
            "Transfers are not available for this session. Sign in with an account whose role includes Logistics Manager, Manager, or Admin."
          );
        } else if (body) {
          setLogisticsApiError(body);
        }
      }
      if (asgRes.ok) {
        const j = (await asgRes.json()) as { data?: DeliveryAssignmentRow[] };
        setAssignments(j.data ?? []);
      } else {
        setAssignments(null);
        if (asgRes.status === 403 && trRes.ok) {
          setLogisticsApiError(
            (p) =>
              p ??
              "Delivery assignments are not available for this session while transfers loaded. Check logistics permissions for your account."
          );
        } else if (asgRes.status !== 403) {
          const msg = await asgRes.text().catch(() => asgRes.statusText);
          if (msg) setLogisticsApiError((p) => p ?? msg);
        }
      }
      if (roRes.ok) {
        const j = (await roRes.json()) as { data?: ReorderNotificationRow[] };
        setReorderNotifications(j.data ?? []);
      } else {
        setReorderNotifications(null);
      }
    } catch (e) {
      setLogisticsApiError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoadingLogisticsApi(false);
    }
  }, [storeId]);

  useEffect(() => {
    void loadLogisticsApi();
  }, [loadLogisticsApi]);

  async function createOrbitTransfer() {
    const inv = inventoryRowsForDisplay[0];
    if (!inv) {
      setLogisticsApiError("Need at least one inventory row to draft a transfer line.");
      return;
    }
    setCreatingTransfer(true);
    setLogisticsApiError(null);
    try {
      const res = await fetch("/api/orbit/logistics/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceStoreId: parseInt(shipFrom, 10),
          destStoreId: parseInt(shipTo, 10),
          items: [{ inventoryId: inv.inventoryId, quantity: 1 }],
        }),
      });
      if (!res.ok) {
        setLogisticsApiError(await res.text().catch(() => res.statusText));
        return;
      }
      await loadLogisticsApi();
    } finally {
      setCreatingTransfer(false);
    }
  }

  async function patchTransferStatus(transferId: number, status: string) {
    setPatchingTransferId(transferId);
    setLogisticsApiError(null);
    try {
      const res = await fetch(`/api/orbit/logistics/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setLogisticsApiError(await res.text().catch(() => res.statusText));
        return;
      }
      await loadLogisticsApi();
    } finally {
      setPatchingTransferId(null);
    }
  }

  async function submitDeliveryAssignment() {
    const tid = parseInt(deliveryTransferId, 10);
    if (Number.isNaN(tid)) {
      setDeliveryDraft("Select a transfer id.");
      return;
    }
    if (Number.isNaN(driverId)) {
      setDeliveryDraft("Session user id required as driverId.");
      return;
    }
    setLogisticsApiError(null);
    const res = await fetch("/api/orbit/logistics/delivery-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transferId: tid,
        driverId,
        vehicle: `Van (${region})`,
      }),
    });
    if (!res.ok) {
      setDeliveryDraft(await res.text().catch(() => res.statusText));
      return;
    }
    setDeliveryDraft(`Created delivery assignment for transfer ${tid}.`);
    await loadLogisticsApi();
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAi(true);
      try {
        const [aiRes, cmpRes, expRes] = await Promise.all([
          fetch(
            `/api/orbit/placeholders/logistics/ai-demand-prediction?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/orbit/placeholders/logistics/forecast-comparison?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/orbit/placeholders/logistics/supply-schedule-export?region=${encodeURIComponent(
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

  const reloadAiPlaceholders = useCallback(async () => {
    setLoadingAi(true);
    try {
      const [aiRes, cmpRes, expRes] = await Promise.all([
        fetch(
          `/api/orbit/placeholders/logistics/ai-demand-prediction?region=${encodeURIComponent(
            region
          )}&storeId=${encodeURIComponent(storeId)}`
        ),
        fetch(
          `/api/orbit/placeholders/logistics/forecast-comparison?region=${encodeURIComponent(
            region
          )}&storeId=${encodeURIComponent(storeId)}`
        ),
        fetch(
          `/api/orbit/placeholders/logistics/supply-schedule-export?region=${encodeURIComponent(
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

  const lowStockItems = inventoryRowsForDisplay.filter((i) => {
    const thr = itemThreshold(i);
    return thr > 0 && i.quantity < thr;
  });
  const lowStockNames = new Set(lowStockItems.map((i) => i.itemName));

  return (
    <section className="space-y-4">
      <StoreRegionPicker onContextChange={setCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Logistics Manager Dashboard</CardTitle>
          <CardDescription>
            Inventory is loaded{" "}
            <span className="font-medium">per selected store</span>. Global inventory is not listed in
            this view. Transfers and delivery assignments need a staff or manager-capable account.{" "}
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
                  ) : !inventoryRowsForDisplay.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        {inventoryError
                          ? inventoryError
                          : "No inventory rows for this store."}
                      </td>
                    </tr>
                  ) : (
                    inventoryRowsForDisplay.map((inv) => {
                      const thr = itemThreshold(inv);
                      const low = thr > 0 && inv.quantity < thr;
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
            {orbitInventory && orbitInventory.length > inventoryRowsForDisplay.length ? (
              <p className="text-xs text-muted-foreground">
                Multiple records matched the same item for this store.
                Showing one line per item using the newest record.
              </p>
            ) : null}
            {inventoryError && orbitInventory && orbitInventory.length > 0 ? (
              <p className="text-xs text-destructive">{inventoryError}</p>
            ) : null}
          </div>

          {logisticsApiError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {logisticsApiError}
            </p>
          ) : null}

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
                    onClick={() => void reloadAiPlaceholders()}
                  >
                    Refresh AI forecast
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
                    Choose a CSV to preview locally. Saving usage to the server is available when your
                    account can upload usage data.
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
                  Creates a delivery assignment for the selected route and transfer. You are recorded
                  as the driver for the assignment.
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
                <div className="mt-3 space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="deliveryTransfer">
                    Transfer
                  </label>
                  <select
                    id="deliveryTransfer"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={deliveryTransferId}
                    onChange={(e) => setDeliveryTransferId(e.target.value)}
                  >
                    <option value="">Select transfer…</option>
                    {(transfers ?? []).map((t) => (
                      <option key={t.transferId} value={String(t.transferId)}>
                        #{t.transferId} {t.sourceStoreId}→{t.destStoreId} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitDeliveryAssignment()}>
                    Create assignment
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDeliveryDraft(null)}>
                    Clear message
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={creatingTransfer}
                    onClick={() => void createOrbitTransfer()}
                  >
                    {creatingTransfer ? "Creating…" : "Create transfer (1 line)"}
                  </Button>
                </div>
                {deliveryDraft ? (
                  <p className="mt-2 text-xs text-muted-foreground">{deliveryDraft}</p>
                ) : null}
                {assignments?.length ? (
                  <div className="mt-4 overflow-x-auto">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Assignments</p>
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr className="text-left">
                          <th className="p-2">ID</th>
                          <th className="p-2">Transfer</th>
                          <th className="p-2">Driver</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a.assignmentId} className="border-t">
                            <td className="p-2">{a.assignmentId}</td>
                            <td className="p-2">{a.transferId}</td>
                            <td className="p-2">{a.driverId}</td>
                            <td className="p-2 text-muted-foreground">{a.status ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Coordinate Supply Transfers</h3>
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Transfers are scoped to store <span className="font-medium">{storeId}</span>.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingLogisticsApi}
                  onClick={() => void loadLogisticsApi()}
                >
                  {loadingLogisticsApi ? "Refreshing…" : "Refresh"}
                </Button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr className="text-left">
                      <th className="p-2">Transfer</th>
                      <th className="p-2">Route</th>
                      <th className="p-2">Lines</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingLogisticsApi && !transfers?.length ? (
                      <tr className="border-t">
                        <td className="p-2 text-muted-foreground" colSpan={4}>
                          Loading…
                        </td>
                      </tr>
                    ) : !transfers?.length ? (
                      <tr className="border-t">
                        <td className="p-2 text-muted-foreground" colSpan={4}>
                          No transfers (or forbidden for this session).
                        </td>
                      </tr>
                    ) : (
                      transfers.map((t) => (
                        <tr key={t.transferId} className="border-t">
                          <td className="p-2">#{t.transferId}</td>
                          <td className="p-2">
                            {t.sourceStoreId} → {t.destStoreId}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {(t.items ?? []).length} line(s)
                          </td>
                          <td className="p-2">
                            <select
                              className="h-8 rounded-md border bg-transparent px-2 text-xs"
                              value={t.status}
                              disabled={patchingTransferId === t.transferId}
                              onChange={(e) =>
                                void patchTransferStatus(t.transferId, e.target.value)
                              }
                            >
                              {TRANSFER_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
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
                      Confidence bands use the forecast lower and upper range. Deeper analytics need
                      enough historical actuals in the dataset.
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
                {reorderNotifications && reorderNotifications.length > 0 ? (
                  <div className="mb-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Reorder queue (store {storeId})
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {reorderNotifications.map((n) => (
                        <li
                          key={n.notificationId}
                          className="flex flex-col gap-1 border-b border-dashed pb-2 last:border-0"
                        >
                          <span className="font-medium">{n.itemName ?? `Item ${n.notificationId}`}</span>
                          <span className="text-xs text-muted-foreground">{n.message}</span>
                          <span className="text-xs text-muted-foreground">Status: {n.status}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                          {i.quantity} / {itemThreshold(i) || "—"} (threshold)
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
                  Reorder notifications appear when recorded; suggestions may also come from live
                  inventory and AI-assisted forecasts.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Export Schedules & Demand Reports</h3>
              <div className="rounded-lg border p-3">
                {exportMeta ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Sample export for this region and store context.
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
                    Load export metadata for the current region and store context.
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

