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

type InventoryAuditLog = {
  id: string;
  timestamp: string;
  actor: { id: string; name: string; role: string };
  action: "inventory_update" | "threshold_update" | "inventory_import";
  target: { item: string; type: string; storeId: string };
  changes: { fromQty?: number; toQty?: number; fromThreshold?: number; toThreshold?: number };
};

export function AdminDashboard() {
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[] | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingAudit(true);
      try {
        const res = await fetch(
          "/api/service-stubs/audit/inventory-logs?storeId=1&limit=25"
        );
        const data = await res.json();
        if (!cancelled) setAuditLogs(data.logs as InventoryAuditLog[]);
      } finally {
        if (!cancelled) setLoadingAudit(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const mockUsers = [
    { username: "test", role: "Repair Staff", active: true },
    { username: "test2", role: "Manager", active: true },
    { username: "staff", role: "Logistics Manager", active: true },
    { username: "super", role: "Super Admin", active: false },
  ];

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Inventory tracking, user/account management, and reporting (scaffold).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold">4</p>
              <p className="text-xs text-muted-foreground">TODO: backend-driven</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Active Accounts</p>
              <p className="text-2xl font-semibold">3</p>
              <p className="text-xs text-muted-foreground">TODO: backend-driven</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Inventory (Low)</p>
              <p className="text-2xl font-semibold">8</p>
              <p className="text-xs text-muted-foreground">TODO: backend-driven</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-semibold">$12,450</p>
              <p className="text-xs text-muted-foreground">TODO: backend-driven</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Inventory Tracking</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Item</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Threshold</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2">Coke</td>
                    <td className="p-2">Soda</td>
                    <td className="p-2">14</td>
                    <td className="p-2">20</td>
                    <td className="p-2 text-destructive">Low</td>
                  </tr>
                  <tr>
                    <td className="p-2">Vanilla</td>
                    <td className="p-2">Syrup</td>
                    <td className="p-2">62</td>
                    <td className="p-2">30</td>
                    <td className="p-2 text-muted-foreground">OK</td>
                  </tr>
                  <tr>
                    <td className="p-2">Cream</td>
                    <td className="p-2">Add In</td>
                    <td className="p-2">8</td>
                    <td className="p-2">10</td>
                    <td className="p-2 text-destructive">Low</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              TODO: wire inventory data + low-stock thresholds.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">User/Account Metrics</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Username</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Active</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((u) => (
                    <tr key={u.username} className="border-t">
                      <td className="p-2">{u.username}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2">
                        {u.active ? (
                          <span className="text-emerald-600">Yes</span>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" disabled>
                            Disable
                          </Button>
                          <Button variant="outline" size="sm" disabled>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              TODO: hook to user management endpoints once implemented.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Cost Tracking</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm">
                  TODO: inventory + maintenance cost summaries.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Revenue Totals</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm">
                  TODO: total revenue, trends, and breakdowns.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Complaints</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                TODO: list general and account user complaints.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Manage User Accounts</h3>
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled>
                  Override Locked Accounts
                </Button>
                <Button variant="outline" disabled>
                  Disable/Enable Accounts
                </Button>
                <Button variant="outline" disabled>
                  Delete Accounts
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                TODO: implement confirmation dialogs and backend calls.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Permissions for Managers</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                TODO: UI for granting manager permissions.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" disabled>
                  Grant Permission
                </Button>
                <Button variant="outline" disabled>
                  Revoke Permission
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Inventory Audit Log</h3>
            <div className="rounded-lg border p-3">
              {loadingAudit && !auditLogs ? (
                <p className="text-sm text-muted-foreground">Loading audit logs…</p>
              ) : auditLogs ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-left">
                        <th className="p-2">Timestamp</th>
                        <th className="p-2">Actor</th>
                        <th className="p-2">Action</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t">
                          <td className="p-2 text-muted-foreground">{log.timestamp}</td>
                          <td className="p-2">
                            <div className="font-medium">{log.actor.name}</div>
                            <div className="text-xs text-muted-foreground">{log.actor.role}</div>
                          </td>
                          <td className="p-2">{log.action}</td>
                          <td className="p-2">
                            <div className="font-medium">{log.target.item}</div>
                            <div className="text-xs text-muted-foreground">{log.target.type}</div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {typeof log.changes.fromQty === "number" || typeof log.changes.toQty === "number"
                              ? `qty: ${log.changes.fromQty ?? "?"} → ${log.changes.toQty ?? "?"}`
                              : log.changes.fromThreshold != null || log.changes.toThreshold != null
                                ? `threshold: ${log.changes.fromThreshold ?? "?"} → ${
                                    log.changes.toThreshold ?? "?"
                                  }`
                                : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-destructive">Audit logs unavailable.</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                TODO: add filters, pagination, and real backend wiring later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

