"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type LowStockAlert = {
  item: string;
  type: string;
  currentQty: number;
  thresholdQty: number;
  suggestedReorderQty: number;
  severity: "High" | "Medium" | "Low";
};

export function ManagerDashboard() {
  const [storeId] = useState<string>("1");
  const [alerts, setAlerts] = useState<LowStockAlert[] | null>(null);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const primaryAlert = useMemo(() => alerts?.[0] ?? null, [alerts]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAlerts(true);
      try {
        const res = await fetch(
          `/api/service-stubs/manager/low-stock-alerts?storeId=${encodeURIComponent(
            storeId
          )}`
        );
        const data = await res.json();
        if (!cancelled) setAlerts(data.alerts as LowStockAlert[]);
      } finally {
        if (!cancelled) setLoadingAlerts(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [storeId]);

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
              <p className="text-sm text-muted-foreground">
                TODO: render revenue chart and historical breakdowns.
              </p>
              <div className="mt-3 h-40 rounded-md bg-muted/40" aria-hidden="true" />
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
                    Item (placeholder)
                  </label>
                  <select
                    id="orderItem"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    disabled
                  >
                    <option>
                      {primaryAlert ? `Reorder ${primaryAlert.item}` : "TODO: populate"}
                    </option>
                  </select>
                  <label className="text-sm text-muted-foreground" htmlFor="orderQty">
                    Quantity (placeholder)
                  </label>
                  <input
                    id="orderQty"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    placeholder={
                      primaryAlert
                        ? `Suggested: ${primaryAlert.suggestedReorderQty}`
                        : "TODO"
                    }
                    disabled
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button disabled>Request Restock</Button>
                  <Button variant="outline" disabled>
                    Cancel
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: wire to inventory ordering endpoints.
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
                  <tr className="border-t">
                    <td className="p-2">Coke</td>
                    <td className="p-2">14</td>
                    <td className="p-2">~28</td>
                    <td className="p-2 text-destructive">Up</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Vanilla</td>
                    <td className="p-2">62</td>
                    <td className="p-2">~19</td>
                    <td className="p-2 text-muted-foreground">Flat</td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">Cream</td>
                    <td className="p-2">8</td>
                    <td className="p-2">~24</td>
                    <td className="p-2 text-destructive">Up</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              TODO: hook up inventory usage reporting.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">AI Supply Ordering Recommendations</h3>
            <div className="rounded-lg border p-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span>Reorder Coke</span>
                  <span className="text-muted-foreground">Suggested: 30 units</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span>Reorder Cream</span>
                  <span className="text-muted-foreground">Suggested: 22 units</span>
                </li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button disabled>Apply Recommendations</Button>
                <Button variant="outline" disabled>
                  Export
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                TODO: wire AI recommendations output.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

