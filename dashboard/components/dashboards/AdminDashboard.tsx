"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ALL_ROLES, Role } from "@/lib/roles";
import {
  dashboardRoleToOrbit,
  defaultDashboardRoleForOrbit,
} from "@/lib/orbit-role-map";
import { downloadTextFile, rowsToCsv } from "@/lib/csv";

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
  itemType?: string;
  storeId?: number;
  quantity: number;
  thresholdLevel?: number;
  minThreshold?: number;
  costPerUnit?: number | null;
  lastUpdated?: string;
};

type InventoryReportPayload = {
  totalItems: number;
  lowStockCount: number;
  generatedAt: string;
  items?: OrbitInventoryItem[];
};

type OrbitNotification = {
  notificationId: number;
  message?: string;
  type?: string;
  timestamp?: string;
  userId?: number | null;
  global?: boolean;
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

  const [inventoryReport, setInventoryReport] = useState<InventoryReportPayload | null>(
    null
  );
  const [loadingInvReport, setLoadingInvReport] = useState(false);
  const [notifications, setNotifications] = useState<OrbitNotification[] | null>(null);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const [revenue30d, setRevenue30d] = useState<number | null>(null);
  const [loadingRev30d, setLoadingRev30d] = useState(false);
  const [roleDraft, setRoleDraft] = useState<Record<number, Role>>({});
  const [initialRolePick, setInitialRolePick] = useState<Record<number, Role>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [userMgmtError, setUserMgmtError] = useState<string | null>(null);

  function rowThreshold(row: OrbitInventoryItem): number {
    if (typeof row.thresholdLevel === "number") return row.thresholdLevel;
    if (typeof row.minThreshold === "number") return row.minThreshold;
    return 0;
  }

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
      const list = json.data ?? [];
      const picks: Record<number, Role> = {};
      for (const u of list) {
        picks[u.userId] = defaultDashboardRoleForOrbit(u.role);
      }
      setInitialRolePick(picks);
      setRoleDraft(picks);
      setUsers(list);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadInventoryReport = useCallback(async () => {
    setLoadingInvReport(true);
    try {
      const res = await fetch("/api/orbit/inventory/report");
      if (!res.ok) {
        setInventoryReport(null);
        return;
      }
      const data = (await res.json()) as InventoryReportPayload;
      setInventoryReport(data);
    } finally {
      setLoadingInvReport(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotif(true);
    try {
      const res = await fetch("/api/orbit/notifications?limit=100");
      if (!res.ok) {
        setNotifications(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitNotification[] };
      setNotifications(json.data ?? []);
    } finally {
      setLoadingNotif(false);
    }
  }, []);

  const loadRevenue30d = useCallback(async () => {
    setLoadingRev30d(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setUTCDate(start.getUTCDate() - 30);
      const url = `/api/orbit/revenues/report?startDate=${encodeURIComponent(
        start.toISOString()
      )}&endDate=${encodeURIComponent(end.toISOString())}`;
      const res = await fetch(url);
      if (!res.ok) {
        setRevenue30d(null);
        return;
      }
      const json = (await res.json()) as { totalRevenue?: number };
      setRevenue30d(json.totalRevenue ?? 0);
    } finally {
      setLoadingRev30d(false);
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
    void loadInventoryReport();
    void loadNotifications();
    void loadRevenue30d();
  }, [
    loadMetrics,
    loadInventory,
    loadUsers,
    loadAudit,
    loadInventoryReport,
    loadNotifications,
    loadRevenue30d,
  ]);

  async function saveUserRole(u: OrbitUser) {
    setUserMgmtError(null);
    const draft = roleDraft[u.userId] ?? defaultDashboardRoleForOrbit(u.role);
    const baseline = initialRolePick[u.userId] ?? defaultDashboardRoleForOrbit(u.role);
    if (draft === baseline) return;
    if (myUserId != null && u.userId === myUserId) {
      setUserMgmtError("You cannot change your own role.");
      return;
    }
    setSavingUserId(u.userId);
    try {
      const res = await fetch(`/api/orbit/users/${u.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: dashboardRoleToOrbit(draft) }),
      });
      if (!res.ok) {
        setUserMgmtError(await res.text().catch(() => res.statusText));
        return;
      }
      await loadUsers();
      await loadMetrics();
    } finally {
      setSavingUserId(null);
    }
  }

  function exportInventoryReportCsv() {
    const rows = inventoryReport?.items ?? [];
    if (!rows.length) return;
    const header = [
      "inventoryId",
      "itemName",
      "itemType",
      "storeId",
      "quantity",
      "threshold",
      "costPerUnit",
      "lineValue",
    ];
    const body = rows.map((r) => {
      const thr = rowThreshold(r);
      const cost = r.costPerUnit != null ? Number(r.costPerUnit) : 0;
      return [
        String(r.inventoryId),
        r.itemName ?? "",
        r.itemType ?? "",
        String(r.storeId ?? ""),
        String(r.quantity),
        String(thr),
        String(cost),
        String(cost * r.quantity),
      ];
    });
    downloadTextFile(
      `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv([header, ...body])
    );
  }

  const inventoryOnHandValue = useMemo(() => {
    const items = inventoryReport?.items ?? [];
    let sum = 0;
    let withCost = 0;
    for (const r of items) {
      const c = r.costPerUnit != null ? Number(r.costPerUnit) : NaN;
      if (!Number.isNaN(c) && c > 0) {
        sum += c * r.quantity;
        withCost += 1;
      }
    }
    return { sum, withCost, totalLines: items.length };
  }, [inventoryReport]);

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
                      const thr = rowThreshold(row);
                      const low = thr > 0 && row.quantity < thr;
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
                          <td className="p-2">{thr || "—"}</td>
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
            {userMgmtError ? (
              <p className="text-sm text-destructive" role="alert">
                {userMgmtError}
              </p>
            ) : null}
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
                    users.map((u) => {
                      const isSelf = myUserId != null && u.userId === myUserId;
                      const baseline =
                        initialRolePick[u.userId] ?? defaultDashboardRoleForOrbit(u.role);
                      const draft = roleDraft[u.userId] ?? baseline;
                      const roleDirty = draft !== baseline;
                      return (
                        <tr key={u.userId} className="border-t">
                          <td className="p-2">{u.username}</td>
                          <td className="p-2">
                            {isSelf ? (
                              <span className="text-muted-foreground">{draft}</span>
                            ) : (
                              <select
                                className="h-8 w-full min-w-36 rounded-md border border-input bg-transparent px-2 text-sm"
                                value={draft}
                                onChange={(e) =>
                                  setRoleDraft((d) => ({
                                    ...d,
                                    [u.userId]: e.target.value as Role,
                                  }))
                                }
                              >
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="p-2 text-muted-foreground">{u.email}</td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={isSelf || !roleDirty || savingUserId === u.userId}
                                onClick={() => void saveUserRole(u)}
                              >
                                {savingUserId === u.userId ? "Saving…" : "Save role"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isSelf}
                                onClick={() => void deleteUserRow(u)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Role changes call <code className="text-xs">PUT /api/orbit/users/:id</code> (Orbit
              role tier). Grant manager/logistics/repair by selecting the matching dashboard role.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Cost tracking (inventory report)</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadInventoryReport()}
                >
                  Refresh
                </Button>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                {loadingInvReport && !inventoryReport ? (
                  <p className="text-sm text-muted-foreground">Loading report…</p>
                ) : inventoryReport ? (
                  <>
                    <p className="text-sm">
                      Lines in report:{" "}
                      <span className="font-medium">{inventoryReport.totalItems}</span> · Low-stock
                      lines:{" "}
                      <span className="font-medium">{inventoryReport.lowStockCount}</span>
                    </p>
                    <p className="text-sm">
                      On-hand value (qty × cost where{" "}
                      <code className="text-xs">costPerUnit</code> is set):{" "}
                      <span className="font-semibold">
                        ${inventoryOnHandValue.sum.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inventoryOnHandValue.withCost} of {inventoryOnHandValue.totalLines} rows
                      include unit cost. Maintenance spend is not aggregated in Orbit yet.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!inventoryReport.items?.length}
                      onClick={() => exportInventoryReportCsv()}
                    >
                      Export report CSV
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-destructive">Could not load inventory report.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Revenue totals</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadRevenue30d()}
                >
                  Refresh
                </Button>
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm">
                  Today (KPI tile) and trailing{" "}
                  <span className="font-medium">30 days</span> from{" "}
                  <code className="text-xs">/api/orbit/revenues/report</code>.
                </p>
                <p className="text-sm">
                  Last 30 days revenue:{" "}
                  {loadingRev30d ? (
                    "…"
                  ) : revenue30d != null ? (
                    <span className="font-semibold">
                      ${revenue30d.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unavailable</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Complaints &amp; inbound messages</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadNotifications()}>
                Refresh
              </Button>
            </div>
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Orbit notifications feed (types such as <code className="text-xs">complaint</code>{" "}
                surface here when recorded). There is no separate complaints table yet.
              </p>
              {loadingNotif && !notifications ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : notifications?.length ? (
                <div className="max-h-64 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/30">
                      <tr className="text-left">
                        <th className="p-2">When</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map((n) => {
                        const t = (n.type ?? "").toLowerCase();
                        const complaintLike =
                          t.includes("complaint") || t.includes("issue") || t.includes("support");
                        return (
                          <tr
                            key={n.notificationId}
                            className={
                              complaintLike ? "border-t bg-amber-500/5" : "border-t"
                            }
                          >
                            <td className="p-2 text-muted-foreground whitespace-nowrap">
                              {n.timestamp ?? "—"}
                            </td>
                            <td className="p-2">{n.type ?? "—"}</td>
                            <td className="p-2">{n.message ?? "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No notifications returned.</p>
              )}
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
