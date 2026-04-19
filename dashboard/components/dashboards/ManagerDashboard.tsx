"use client";

import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Role } from "@/lib/roles";

type LowStockAlert = {
  item: string;
  type: string;
  currentQty: number;
  thresholdQty: number;
  suggestedReorderQty: number;
  severity: "High" | "Medium" | "Low";
};

type OrbitInventoryItem = {
  inventoryId: number;
  itemName: string;
  itemType: string;
  quantity: number;
  thresholdLevel: number;
};

/** Same store can contain duplicate rows after multi-peer / repeated seeding; keep one row per item name. */
function dedupeInventoryByItemName(rows: OrbitInventoryItem[]): OrbitInventoryItem[] {
  const byName = new Map<string, OrbitInventoryItem>();
  for (const row of rows) {
    const key = String(row.itemName ?? "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const prev = byName.get(key);
    if (!prev || row.inventoryId > prev.inventoryId) {
      byName.set(key, row);
    }
  }
  return Array.from(byName.values()).sort((a, b) =>
    String(a.itemName).localeCompare(String(b.itemName))
  );
}

type AiReorderRow = { item: string; suggestedReorderQty: number; reason: string };

type OrbitReorderRow = {
  notificationId: number;
  itemName?: string;
  message?: string;
  status?: string;
};

export function ManagerDashboard() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const canViewRevenue =
    roles.includes(Role.Admin) || roles.includes(Role.SuperAdmin);

  const [storeId, setStoreId] = useState<string>("1");
  const [alerts, setAlerts] = useState<LowStockAlert[] | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [inventory, setInventory] = useState<OrbitInventoryItem[] | null>(null);
  const [loadingInv, setLoadingInv] = useState(false);
  const [revenueNote, setRevenueNote] = useState<string | null>(null);
  const [revenueTotal, setRevenueTotal] = useState<number | null>(null);
  const [orderItemName, setOrderItemName] = useState<string>("");
  const [orderQty, setOrderQty] = useState<string>("");
  const [aiRecommendations, setAiRecommendations] = useState<AiReorderRow[] | null>(
    null
  );
  const [loadingAiRec, setLoadingAiRec] = useState(false);
  const [orbitReorders, setOrbitReorders] = useState<OrbitReorderRow[] | null>(null);
  const [submittingReorder, setSubmittingReorder] = useState(false);
  const [reorderActionMessage, setReorderActionMessage] = useState<string | null>(null);

  const primaryAlert = useMemo(() => alerts?.[0] ?? null, [alerts]);

  const inventoryRows = useMemo(
    () => (inventory ? dedupeInventoryByItemName(inventory) : null),
    [inventory]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAlerts(true);
      try {
        const res = await fetch(
          `/api/orbit/manager/low-stock-alerts?storeId=${encodeURIComponent(
            storeId
          )}`
        );
        const data = await res.json();
        if (!cancelled) setAlerts((data.alerts as LowStockAlert[]) ?? []);
      } finally {
        if (!cancelled) setLoadingAlerts(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadInv() {
      setLoadingInv(true);
      try {
        const res = await fetch(
          `/api/orbit/stores/${encodeURIComponent(storeId)}/inventory`
        );
        if (!res.ok) {
          if (!cancelled) setInventory(null);
          return;
        }
        const json = (await res.json()) as { data?: OrbitInventoryItem[] };
        if (!cancelled) setInventory(json.data ?? []);
      } finally {
        if (!cancelled) setLoadingInv(false);
      }
    }
    void loadInv();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    let cancelled = false;
    async function loadReorder() {
      const sid = parseInt(storeId, 10);
      if (Number.isNaN(sid)) {
        setOrbitReorders(null);
        return;
      }
      const res = await fetch(
        `/api/orbit/notifications/reorder?storeId=${encodeURIComponent(String(sid))}`
      );
      if (cancelled) return;
      if (!res.ok) {
        setOrbitReorders(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitReorderRow[] };
      setOrbitReorders(json.data ?? []);
    }
    void loadReorder();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    if (primaryAlert?.item) {
      setOrderItemName(primaryAlert.item);
      setOrderQty(String(primaryAlert.suggestedReorderQty));
    } else if (inventoryRows?.length && !orderItemName) {
      setOrderItemName(inventoryRows[0].itemName);
    }
  }, [primaryAlert, inventoryRows, orderItemName]);

  async function submitReorderRequest() {
    setReorderActionMessage(null);
    const sid = parseInt(storeId, 10);
    if (Number.isNaN(sid)) {
      setReorderActionMessage("Invalid store id.");
      return;
    }
    const selected = (inventoryRows ?? []).find((row) => row.itemName === orderItemName);
    if (!selected) {
      setReorderActionMessage("Select an inventory item from the current store first.");
      return;
    }

    setSubmittingReorder(true);
    try {
      const res = await fetch("/api/orbit/notifications/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: sid,
          inventoryId: selected.inventoryId,
          itemName: selected.itemName,
          threshold: selected.thresholdLevel,
          currentQuantity: selected.quantity,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        setReorderActionMessage(text || "Could not create reorder request.");
        return;
      }
      const json = (await res.json()) as { data?: OrbitReorderRow };
      if (json.data) {
        setOrbitReorders((prev) => [json.data!, ...(prev ?? [])]);
      }
      setReorderActionMessage(
        `Reorder request created for ${selected.itemName} (store ${sid}).`
      );
    } finally {
      setSubmittingReorder(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadAi() {
      setLoadingAiRec(true);
      try {
        const res = await fetch(
          `/api/orbit/placeholders/logistics/ai-demand-prediction?region=${encodeURIComponent(
            "Region C"
          )}&storeId=${encodeURIComponent(storeId)}`
        );
        if (!res.ok) {
          if (!cancelled) setAiRecommendations(null);
          return;
        }
        const json = (await res.json()) as {
          reorderRecommendations?: AiReorderRow[];
        };
        if (!cancelled) setAiRecommendations(json.reorderRecommendations ?? []);
      } finally {
        if (!cancelled) setLoadingAiRec(false);
      }
    }
    void loadAi();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  useEffect(() => {
    if (!canViewRevenue) {
      setRevenueNote("Revenue reports require an admin account on the OrbitDB backend.");
      setRevenueTotal(null);
      return;
    }
    let cancelled = false;
    async function loadRev() {
      const end = new Date().toISOString();
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 30);
      const url = `/api/orbit/revenues/report?startDate=${encodeURIComponent(
        start.toISOString()
      )}&endDate=${encodeURIComponent(end)}`;
      const res = await fetch(url);
      if (cancelled) return;
      if (!res.ok) {
        setRevenueNote("Could not load revenue report.");
        setRevenueTotal(null);
        return;
      }
      const json = (await res.json()) as { totalRevenue?: number };
      setRevenueTotal(json.totalRevenue ?? 0);
      setRevenueNote(null);
    }
    void loadRev();
    return () => {
      cancelled = true;
    };
  }, [canViewRevenue]);

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manager Dashboard</CardTitle>
          <CardDescription>
            Store-scoped inventory and reorder notifications use Orbit; revenue and AI blocks stay
            as before.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="mgr-store">
                Store
              </label>
              <select
                id="mgr-store"
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
              >
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((id) => (
                  <option key={id} value={id}>
                    Store {id}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Inventory:{" "}
              <code className="text-xs">GET /api/orbit/stores/{"{id}"}/inventory</code>
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Store Revenue Reports</h3>
            <div className="rounded-lg border p-3">
              {revenueNote ? (
                <p className="text-sm text-muted-foreground">{revenueNote}</p>
              ) : (
                <p className="text-sm">
                  Last 30 days total revenue:{" "}
                  <span className="font-semibold">
                    ${(revenueTotal ?? 0).toLocaleString()}
                  </span>
                </p>
              )}
              <div className="mt-3 h-40 rounded-md bg-muted/40" aria-hidden="true" />
              <p className="mt-2 text-xs text-muted-foreground">
                Chart placeholder; data from{" "}
                <code className="text-xs">/api/orbit/revenues/report</code>.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Low Inventory Notifications</h3>
              <div className="rounded-lg border p-3">
                {orbitReorders && orbitReorders.length > 0 ? (
                  <div className="mb-3 border-b pb-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Orbit reorder notifications
                    </p>
                    <ul className="mt-2 space-y-2 text-sm">
                      {orbitReorders.map((n) => (
                        <li key={n.notificationId}>
                          <span className="font-medium">{n.itemName ?? `#${n.notificationId}`}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {n.status} — {n.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {loadingAlerts && !alerts ? (
                  <p className="text-sm text-muted-foreground">Loading alerts…</p>
                ) : alerts ? (
                  <ul className="space-y-2 text-sm">
                    {alerts.map((a) => (
                      <li
                        key={a.item}
                        className="flex items-center justify-between gap-3"
                      >
                        <span
                          className={
                            a.severity === "High"
                              ? "text-destructive"
                              : a.severity === "Medium"
                                ? "text-muted-foreground"
                                : ""
                          }
                        >
                          {a.item}
                        </span>
                        <span className="text-muted-foreground">
                          {a.currentQty} (thr {a.thresholdQty})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-destructive">No alerts available.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Order Inventory When Low</h3>
              <div className="rounded-lg border p-3">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="orderItem">
                    Item
                  </label>
                  <select
                    id="orderItem"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={orderItemName}
                    onChange={(e) => setOrderItemName(e.target.value)}
                    disabled={!inventoryRows?.length && !primaryAlert}
                  >
                    {!inventoryRows?.length && !primaryAlert ? (
                      <option value="">No items loaded</option>
                    ) : (
                      <>
                        {primaryAlert ? (
                          <option value={primaryAlert.item}>
                            {primaryAlert.item} (alert)
                          </option>
                        ) : null}
                        {(inventoryRows ?? [])
                          .filter((row) => row.itemName !== primaryAlert?.item)
                          .map((row) => (
                            <option key={row.inventoryId} value={row.itemName}>
                              {row.itemName}
                            </option>
                          ))}
                      </>
                    )}
                  </select>
                  <label className="text-sm text-muted-foreground" htmlFor="orderQty">
                    Quantity
                  </label>
                  <input
                    id="orderQty"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    placeholder={
                      primaryAlert
                        ? `Suggested: ${primaryAlert.suggestedReorderQty}`
                        : "Enter qty"
                    }
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={!orderItemName.trim() || submittingReorder}
                    onClick={() => {
                      void submitReorderRequest();
                    }}
                  >
                    {submittingReorder ? "Creating..." : "Create reorder request"}
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => {
                      if (primaryAlert) {
                        setOrderItemName(primaryAlert.item);
                        setOrderQty(String(primaryAlert.suggestedReorderQty));
                      }
                    }}
                  >
                    Reset to alert
                  </Button>
                </div>
                {reorderActionMessage ? (
                  <p className="mt-2 text-xs text-muted-foreground">{reorderActionMessage}</p>
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  Creates an Orbit reorder notification via
                  <code className="text-xs"> POST /api/orbit/notifications/reorder</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Inventory & Usage Reports</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Item</th>
                    <th className="p-2">On Hand</th>
                    <th className="p-2">Usage (30d)</th>
                    <th className="p-2">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingInv && !inventoryRows ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        Loading…
                      </td>
                    </tr>
                  ) : !inventoryRows?.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        No rows.
                      </td>
                    </tr>
                  ) : (
                    inventoryRows.map((row) => (
                      <tr key={row.inventoryId} className="border-t">
                        <td className="p-2">{row.itemName}</td>
                        <td className="p-2">{row.quantity}</td>
                        <td className="p-2 text-muted-foreground">—</td>
                        <td className="p-2 text-muted-foreground">—</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              On-hand from OrbitDB for the selected store; usage/trend columns need usage telemetry.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">AI Supply Ordering Recommendations</h3>
            <div className="rounded-lg border p-3">
              {loadingAiRec && !aiRecommendations ? (
                <p className="text-sm text-muted-foreground">Loading mock forecast…</p>
              ) : aiRecommendations?.length ? (
                <ul className="space-y-2 text-sm">
                  {aiRecommendations.map((r) => (
                    <li
                      key={r.item}
                      className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium">{r.item}</span>
                      <span className="text-muted-foreground">
                        Suggested: {r.suggestedReorderQty} — {r.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recommendations (placeholder API unavailable).
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button type="button" disabled>
                  Apply Recommendations
                </Button>
                <Button type="button" variant="outline" disabled>
                  Export
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Data from{" "}
                <code className="text-xs">
                  /api/orbit/placeholders/logistics/ai-demand-prediction
                </code>{" "}
                (mock). Applying orders requires inventory write access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

