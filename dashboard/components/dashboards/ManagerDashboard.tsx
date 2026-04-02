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

type AiReorderRow = { item: string; suggestedReorderQty: number; reason: string };

export function ManagerDashboard() {
  const { data: session } = useSession();
  const roles = session?.user?.roles ?? [];
  const canViewRevenue =
    roles.includes(Role.Admin) || roles.includes(Role.SuperAdmin);

  const [storeId] = useState<string>("1");
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

  const primaryAlert = useMemo(() => alerts?.[0] ?? null, [alerts]);

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
        const res = await fetch("/api/orbit/inventory");
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
  }, []);

  useEffect(() => {
    if (primaryAlert?.item) {
      setOrderItemName(primaryAlert.item);
      setOrderQty(String(primaryAlert.suggestedReorderQty));
    } else if (inventory?.length && !orderItemName) {
      setOrderItemName(inventory[0].itemName);
    }
  }, [primaryAlert, inventory, orderItemName]);

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
            Store revenue, inventory health, and ordering recommendations (scaffold).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                    disabled={!inventory?.length && !primaryAlert}
                  >
                    {!inventory?.length && !primaryAlert ? (
                      <option value="">No items loaded</option>
                    ) : (
                      <>
                        {primaryAlert ? (
                          <option value={primaryAlert.item}>
                            {primaryAlert.item} (alert)
                          </option>
                        ) : null}
                        {(inventory ?? [])
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
                    disabled={!orderItemName.trim()}
                    onClick={() => {
                      window.alert(
                        "Restock by updating quantity in the Admin inventory table or PATCH /api/orbit/inventory/:id."
                      );
                    }}
                  >
                    Restock hint
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
                <p className="mt-2 text-xs text-muted-foreground">
                  Quantity updates go through the inventory API (admin UI or PATCH).
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
                  {loadingInv && !inventory ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        Loading…
                      </td>
                    </tr>
                  ) : !inventory?.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        No rows.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((row) => (
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
              On-hand from OrbitDB; usage/trend columns need usage telemetry.
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

