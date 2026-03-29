"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { defaultDashboardRoleForOrbit } from "@/lib/orbit-role-map";

type InventoryAuditLog = {
  id: string;
  timestamp: string;
  actor: { id: string; name: string; role: string };
  action: "inventory_update" | "threshold_update" | "inventory_import";
  target: { item: string; type: string; storeId: string };
  changes: {
    fromQty?: number;
    toQty?: number;
    fromThreshold?: number;
    toThreshold?: number;
  };
};

type OrbitInventoryItem = {
  inventoryId: number;
  itemName: string;
  itemType: string;
  quantity: number;
  thresholdLevel: number;
  lastUpdated?: string;
};

type OrbitUser = {
  userId: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

type AdminMetrics = {
  totalUsers: number;
  activeAccounts: number;
  inventoryLowCount: number;
  totalRevenueToday: number;
};

export function AdminDashboard() {
  const { data: session } = useSession();
  const myUserId = session?.user?.id ? Number(session.user.id) : null;

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [inventory, setInventory] = useState<OrbitInventoryItem[] | null>(null);
  const [users, setUsers] = useState<OrbitUser[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<InventoryAuditLog[] | null>(null);

  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);

  const [draftQty, setDraftQty] = useState<Record<number, string>>({});

  const loadMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/orbit/admin/metrics");
      if (!res.ok) {
        setMetrics(null);
        return;
      }
      const data = (await res.json()) as AdminMetrics;
      setMetrics(data);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    setLoadingInv(true);
    try {
      const res = await fetch("/api/orbit/inventory");
      if (!res.ok) {
        setInventory(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitInventoryItem[] };
      setInventory(json.data ?? []);
    } finally {
      setLoadingInv(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/orbit/users");
      if (!res.ok) {
        setUsers(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitUser[] };
      setUsers(json.data ?? []);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch(
        "/api/orbit/admin/audit-inventory?storeId=global&limit=25"
      );
      if (!res.ok) {
        setAuditLogs(null);
        return;
      }
      const data = await res.json();
      setAuditLogs(data.logs as InventoryAuditLog[]);
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
    void loadInventory();
    void loadUsers();
    void loadAudit();
  }, [loadMetrics, loadInventory, loadUsers, loadAudit]);

  async function saveQuantity(item: OrbitInventoryItem) {
    const raw = draftQty[item.inventoryId];
    const q = raw !== undefined ? parseInt(raw, 10) : item.quantity;
    if (Number.isNaN(q) || q < 0) return;
    setSavingId(item.inventoryId);
    try {
      const res = await fetch(`/api/orbit/inventory/${item.inventoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: q }),
      });
      if (res.ok) {
        setDraftQty((d) => {
          const next = { ...d };
          delete next[item.inventoryId];
          return next;
        });
        await loadInventory();
        await loadAudit();
        await loadMetrics();
      }
    } finally {
      setSavingId(null);
    }
  }

  async function deleteUserRow(u: OrbitUser) {
    if (myUserId != null && u.userId === myUserId) return;
    if (!window.confirm(`Delete user ${u.username}?`)) return;
    const res = await fetch(`/api/orbit/users/${u.userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadUsers();
      await loadMetrics();
    }
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>
            Inventory, users, and revenue metrics from the OrbitDB API (admin role on
            backend).
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-semibold">
                {loadingMetrics ? "…" : (metrics?.totalUsers ?? "—")}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Accounts (listed)</p>
              <p className="text-2xl font-semibold">
                {loadingMetrics ? "…" : (metrics?.activeAccounts ?? "—")}
              </p>
              <p className="text-xs text-muted-foreground">
                No separate &quot;active&quot; flag in OrbitDB yet.
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Inventory (Low)</p>
              <p className="text-2xl font-semibold">
                {loadingMetrics ? "…" : (metrics?.inventoryLowCount ?? "—")}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Revenue (Today)</p>
              <p className="text-2xl font-semibold">
                {loadingMetrics
                  ? "…"
                  : metrics
                    ? `$${(metrics.totalRevenueToday ?? 0).toLocaleString()}`
                    : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Inventory Tracking</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadInventory()}>
                Refresh
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Item</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Threshold</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Save</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingInv && !inventory ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={6}>
                        Loading inventory…
                      </td>
                    </tr>
                  ) : !inventory?.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={6}>
                        No inventory rows (or failed to load).
                      </td>
                    </tr>
                  ) : (
                    inventory.map((row) => {
                      const low = row.quantity < row.thresholdLevel;
                      const draft =
                        draftQty[row.inventoryId] ?? String(row.quantity);
                      return (
                        <tr key={row.inventoryId} className="border-t">
                          <td className="p-2">{row.itemName}</td>
                          <td className="p-2">{row.itemType}</td>
                          <td className="p-2">
                            <input
                              className="h-8 w-20 rounded border bg-transparent px-2"
                              value={draft}
                              onChange={(e) =>
                                setDraftQty((d) => ({
                                  ...d,
                                  [row.inventoryId]: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="p-2">{row.thresholdLevel}</td>
                          <td className="p-2">
                            {low ? (
                              <span className="text-destructive">Low</span>
                            ) : (
                              <span className="text-muted-foreground">OK</span>
                            )}
                          </td>
                          <td className="p-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingId === row.inventoryId}
                              onClick={() => void saveQuantity(row)}
                            >
                              Save
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">User accounts</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadUsers()}>
                Refresh
              </Button>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Username</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && !users ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        Loading users…
                      </td>
                    </tr>
                  ) : !users?.length ? (
                    <tr>
                      <td className="p-2 text-muted-foreground" colSpan={4}>
                        No users (or forbidden / not configured).
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.userId} className="border-t">
                        <td className="p-2">{u.username}</td>
                        <td className="p-2">
                          {defaultDashboardRoleForOrbit(u.role)}
                        </td>
                        <td className="p-2 text-muted-foreground">{u.email}</td>
                        <td className="p-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={myUserId != null && u.userId === myUserId}
                            onClick={() => void deleteUserRow(u)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Disable/enable and role edits need PUT /api/orbit/users/:id (UI not wired
              here).
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Cost Tracking</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm">
                  Use inventory <code className="text-xs">costPerUnit</code> via API when
                  populated; no aggregate endpoint yet.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Revenue Totals</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm">
                  Today&apos;s total is in the KPI tile. Detailed reports:{" "}
                  <code className="text-xs">GET /api/orbit/revenues/report</code>.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Complaints</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                No complaints model in OrbitDB. Consider notifications API later.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Inventory audit (derived)</h3>
            <div className="rounded-lg border p-3">
              {loadingAudit && !auditLogs ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : auditLogs?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-left">
                        <th className="p-2">Timestamp</th>
                        <th className="p-2">Target</th>
                        <th className="p-2">Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="border-t">
                          <td className="p-2 text-muted-foreground">{log.timestamp}</td>
                          <td className="p-2">
                            <div className="font-medium">{log.target.item}</div>
                            <div className="text-xs text-muted-foreground">
                              {log.target.type}
                            </div>
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            qty: {String(log.changes.toQty ?? "—")}, thr:{" "}
                            {String(log.changes.toThreshold ?? "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-destructive">Audit data unavailable.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
