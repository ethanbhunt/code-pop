"use client";

import { useSession } from "next-auth/react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Role, USER_MANAGEMENT_ROLES } from "@/lib/roles";
import {
  dashboardRoleToOrbitAccess,
  defaultDashboardRoleForOrbitAccess,
} from "@/lib/orbit-role-map";
import {
  hasOrbitAdminDashboardRole,
  hasSuperAdminDashboardRole,
} from "@/lib/orbit-session";
import Link from "next/link";
import { downloadTextFile, rowsToCsv } from "@/lib/csv";

type SystemReports = {
  generatedAt: string;
  note?: string;
  metrics: {
    inventoryLowCount: number;
    totalStores: number;
    totalRevenueToday: number;
    /** Default multi-store report window (last 30 days). */
    totalRevenueLast30Days?: number;
  };
  revenue: { today: number; week: number; month: number };
  maintenance: {
    totalMachines: number;
    inWarning: number;
    inError: number;
    repairsThisMonth: number;
  };
  hubActivity: Array<{
    region: string;
    online: boolean;
    pendingShipments: number;
    lastHeartbeat: string;
  }>;
};

type OrbitUser = {
  userId: number;
  username: string;
  role: string;
  userRole?: string;
  enum?: string;
};

type OrbitStoreRow = {
  storeId: number;
  name?: string;
  city?: string;
  region?: string;
};

type MultiStoreReport = {
  storeReports: Array<{
    storeId: number;
    storeName: string;
    city?: string;
    region?: string;
    revenue: { total: number };
    orders: { total: number; completed?: number };
    inventory: { lowStockItems: number; criticalItems: number; totalItems?: number };
  }>;
  aggregates: {
    totalRevenue: number;
    totalOrders: number;
    storeCount: number;
    topStore: string | null;
  };
};

export function SuperAdminDashboard() {
  const { data: session } = useSession();
  const myUserId = session?.user?.id ? Number(session.user.id) : null;
  const canManageUsers = session ? hasOrbitAdminDashboardRole(session) : false;
  const canListStores = Boolean(session && hasSuperAdminDashboardRole(session));
  const canMultiStoreReport = Boolean(session && hasOrbitAdminDashboardRole(session));

  const [reports, setReports] = useState<SystemReports | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
  const [systemReportError, setSystemReportError] = useState<string | null>(null);
  const [users, setUsers] = useState<OrbitUser[] | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<number, Role>>({});
  const [initialRolePick, setInitialRolePick] = useState<Record<number, Role>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [userActionError, setUserActionError] = useState<string | null>(null);

  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<Role>(Role.Customer);
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [orbitStores, setOrbitStores] = useState<OrbitStoreRow[] | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [multiStoreReport, setMultiStoreReport] = useState<MultiStoreReport | null>(null);
  const [loadingMultiStore, setLoadingMultiStore] = useState(false);
  const [multiStoreError, setMultiStoreError] = useState<string | null>(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setSystemReportError(null);
    try {
      const res = await fetch("/api/orbit/admin/system-reports");
      if (!res.ok) {
        setReports(null);
        const body = (await res.text().catch(() => res.statusText)).trim();
        setSystemReportError(
          body
            ? `HTTP ${res.status}: ${body.slice(0, 280)}${body.length > 280 ? "…" : ""}`
            : `HTTP ${res.status}`
        );
        return;
      }
      const data = (await res.json()) as SystemReports;
      setReports(data);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const loadStores = useCallback(async () => {
    if (!canListStores) return;
    setLoadingStores(true);
    try {
      const res = await fetch("/api/orbit/stores?limit=100");
      if (!res.ok) {
        setOrbitStores(null);
        return;
      }
      const json = (await res.json()) as { data?: OrbitStoreRow[] };
      setOrbitStores(json.data ?? []);
    } finally {
      setLoadingStores(false);
    }
  }, [canListStores]);

  const loadMultiStore = useCallback(async () => {
    if (!canMultiStoreReport) return;
    setLoadingMultiStore(true);
    setMultiStoreError(null);
    try {
      const params = new URLSearchParams();
      if (reportStartDate.trim()) params.set("startDate", reportStartDate.trim());
      if (reportEndDate.trim()) params.set("endDate", reportEndDate.trim());
      if (selectedStoreIds.length > 0) {
        params.set("storeIds", selectedStoreIds.join(","));
      }
      const q = params.toString();
      const res = await fetch(
        `/api/orbit/admin/system-reports/multi-store${q ? `?${q}` : ""}`
      );
      if (!res.ok) {
        setMultiStoreReport(null);
        setMultiStoreError(await res.text().catch(() => res.statusText));
        return;
      }
      const data = (await res.json()) as MultiStoreReport;
      setMultiStoreReport(data);
    } catch (e) {
      setMultiStoreReport(null);
      setMultiStoreError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoadingMultiStore(false);
    }
  }, [
    canMultiStoreReport,
    reportStartDate,
    reportEndDate,
    selectedStoreIds,
  ]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    void loadMultiStore();
  }, [loadMultiStore]);

  function toggleStoreFilter(id: number) {
    setSelectedStoreIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exportSystemReportCsv() {
    if (!reports) return;
    const rows: string[][] = [
      ["metric", "value"],
      ["generatedAt", reports.generatedAt],
      ["inventoryLowCount", String(reports.metrics.inventoryLowCount)],
      ["totalStores_reported", String(reports.metrics.totalStores)],
      ["totalRevenueToday", String(reports.metrics.totalRevenueToday)],
      [
        "totalRevenueLast30Days",
        String(reports.metrics.totalRevenueLast30Days ?? ""),
      ],
      ["revenue_today", String(reports.revenue.today)],
      ["revenue_week", String(reports.revenue.week)],
      ["revenue_month", String(reports.revenue.month)],
      ["maintenance_totalMachines", String(reports.maintenance.totalMachines)],
      ["maintenance_inWarning", String(reports.maintenance.inWarning)],
      ["maintenance_inError", String(reports.maintenance.inError)],
      ["maintenance_repairsThisMonth", String(reports.maintenance.repairsThisMonth)],
      ["note", reports.note ?? ""],
    ];
    downloadTextFile(
      `system-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rowsToCsv(rows)
    );
  }

  const loadUsers = useCallback(async () => {
    setUserActionError(null);
    const res = await fetch("/api/orbit/users");
    if (!res.ok) {
      setUsers(null);
      return;
    }
    const json = (await res.json()) as { data?: OrbitUser[] };
    const list = json.data ?? [];
    const picks: Record<number, Role> = {};
    for (const u of list) {
      picks[u.userId] = defaultDashboardRoleForOrbitAccess(
        u.role,
        u.userRole,
        u.enum
      );
    }
    setInitialRolePick(picks);
    setRoleDraft(picks);
    setUsers(list);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const storesOnline = useMemo(() => {
    if (!reports) return 0;
    return reports.hubActivity.filter((h) => h.online).length;
  }, [reports]);

  const machinesNeedingRepair = useMemo(() => {
    if (!reports) return 0;
    return reports.maintenance.inWarning + reports.maintenance.inError;
  }, [reports]);

  async function saveRoleForUser(u: OrbitUser) {
    setUserActionError(null);
    const draft =
      roleDraft[u.userId] ??
      defaultDashboardRoleForOrbitAccess(u.role, u.userRole, u.enum);
    const nextOrbit = dashboardRoleToOrbitAccess(draft);
    if (myUserId != null && u.userId === myUserId) {
      setUserActionError("You cannot change your own role.");
      return;
    }
    setSavingUserId(u.userId);
    try {
      const res = await fetch(`/api/orbit/users/${u.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextOrbit),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const err = JSON.parse(text) as { error?: string; message?: string };
          setUserActionError(
            err.error ?? err.message ?? (text || res.statusText)
          );
        } catch {
          setUserActionError(text || res.statusText);
        }
        return;
      }
      await loadUsers();
    } finally {
      setSavingUserId(null);
    }
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setCreateMessage(null);
    setUserActionError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/orbit/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword,
          email: createEmail.trim(),
          firstName: createFirstName.trim() || undefined,
          lastName: createLastName.trim() || undefined,
          ...dashboardRoleToOrbitAccess(createRole),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        setCreateMessage(text || res.statusText);
        return;
      }
      setCreateMessage("User created.");
      setCreateUsername("");
      setCreatePassword("");
      setCreateEmail("");
      setCreateFirstName("");
      setCreateLastName("");
      setCreateRole(Role.Customer);
      await loadUsers();
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Super Admin Dashboard</CardTitle>
          <CardDescription>System-wide visibility and cross-store control.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                {canListStores ? "Stores" : "Hubs online"}
              </p>
              <p className="text-2xl font-semibold">
                {canListStores
                  ? loadingStores
                    ? "…"
                    : (orbitStores?.length ?? "—")
                  : loadingReports
                    ? "…"
                    : storesOnline}
              </p>
              <p className="text-xs text-muted-foreground">
                {canListStores
                  ? "Live store directory"
                  : reports?.note
                    ? "Partially live"
                    : reports
                      ? "Connected"
                      : "—"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Machines Needing Repair</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : machinesNeedingRepair}
              </p>
              <p className="text-xs text-muted-foreground">
                From system report when maintenance data is available
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Low Inventory Alerts</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : reports?.metrics.inventoryLowCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">From inventory metrics</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">System revenue</p>
              <p className="text-2xl font-semibold">
                {loadingReports
                  ? "…"
                  : `$${(
                      reports?.metrics.totalRevenueLast30Days ??
                      reports?.metrics.totalRevenueToday ??
                      0
                    ).toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Primary figure: last 30 days (multi-store aggregate). Today: $
                {(reports?.metrics.totalRevenueToday ?? 0).toLocaleString()} · Week: $
                {(reports?.revenue.week ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          {systemReportError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              System report failed — machines, low-stock, and revenue cards above may be empty or
              zero: {systemReportError}
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Stores & report scope</h3>
              <div className="rounded-lg border p-3">
                {!canListStores ? (
                  <p className="text-sm text-muted-foreground">
                    Listing all stores requires a Super Admin session.
                  </p>
                ) : loadingStores && !orbitStores?.length ? (
                  <p className="text-sm text-muted-foreground">Loading stores…</p>
                ) : !orbitStores?.length ? (
                  <p className="text-sm text-muted-foreground">No stores returned.</p>
                ) : (
                  <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                    {orbitStores.map((s) => (
                      <li key={s.storeId} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selectedStoreIds.includes(s.storeId)}
                          onChange={() => toggleStoreFilter(s.storeId)}
                          id={`store-${s.storeId}`}
                        />
                        <label htmlFor={`store-${s.storeId}`} className="cursor-pointer">
                          <span className="font-medium">{s.name ?? `Store ${s.storeId}`}</span>
                          {s.city || s.region ? (
                            <span className="block text-xs text-muted-foreground">
                              {[s.city, s.region].filter(Boolean).join(" · ")}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Leave all unchecked to include every store in the multi-store report. Checked
                  ids are sent as <code className="text-xs">storeIds</code>.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Multi-store report</h3>
              <div className="rounded-lg border p-3">
                {!canMultiStoreReport ? (
                  <p className="text-sm text-muted-foreground">
                    An admin-level session is required for the multi-store revenue report.
                  </p>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="ms-start">Start date (optional)</Label>
                        <Input
                          id="ms-start"
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ms-end">End date (optional)</Label>
                        <Input
                          id="ms-end"
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loadingMultiStore}
                        onClick={() => void loadMultiStore()}
                      >
                        {loadingMultiStore ? "Loading…" : "Refresh report"}
                      </Button>
                    </div>
                    {multiStoreError ? (
                      <p className="mt-2 text-xs text-destructive">{multiStoreError}</p>
                    ) : null}
                    {multiStoreReport ? (
                      <div className="mt-3 space-y-3">
                        <div className="rounded-md bg-muted/30 p-2 text-xs">
                          <p>
                            Stores in scope: {multiStoreReport.aggregates.storeCount} · Total
                            revenue: $
                            {multiStoreReport.aggregates.totalRevenue.toLocaleString()} · Orders:{" "}
                            {multiStoreReport.aggregates.totalOrders}
                          </p>
                          {multiStoreReport.aggregates.topStore ? (
                            <p className="text-muted-foreground">
                              Top store: {multiStoreReport.aggregates.topStore}
                            </p>
                          ) : null}
                        </div>
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-sm">
                            <thead className="border-b bg-muted/30">
                              <tr className="text-left">
                                <th className="p-2">Store</th>
                                <th className="p-2">Revenue</th>
                                <th className="p-2">Orders</th>
                                <th className="p-2">Low / critical stock</th>
                              </tr>
                            </thead>
                            <tbody>
                              {multiStoreReport.storeReports.map((r) => (
                                <tr key={r.storeId} className="border-t">
                                  <td className="p-2">{r.storeName}</td>
                                  <td className="p-2">${r.revenue.total.toLocaleString()}</td>
                                  <td className="p-2">{r.orders.total}</td>
                                  <td className="p-2 text-muted-foreground">
                                    {r.inventory.lowStockItems} / {r.inventory.criticalItems}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : loadingMultiStore ? (
                      <p className="mt-2 text-xs text-muted-foreground">Loading aggregates…</p>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">No report data yet.</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      The snapshot cards above summarize system-wide metrics. This table breaks results
                      down by store.
                    </p>
                  </>
                )}
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Quick snapshot</p>
                  <div className="mt-2 overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b">
                          <td className="p-2 text-muted-foreground">Revenue (today)</td>
                          <td className="p-2 font-medium">
                            {loadingReports
                              ? "…"
                              : `$${(reports?.metrics.totalRevenueToday ?? 0).toLocaleString()}`}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 text-muted-foreground">Revenue (30d, multi-store)</td>
                          <td className="p-2">
                            {loadingReports
                              ? "…"
                              : `$${(reports?.metrics.totalRevenueLast30Days ?? 0).toLocaleString()}`}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 text-muted-foreground">Revenue (week)</td>
                          <td className="p-2">
                            {loadingReports
                              ? "…"
                              : `$${(reports?.revenue.week ?? 0).toLocaleString()}`}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-2 text-muted-foreground">Low inventory rows</td>
                          <td className="p-2">
                            {loadingReports ? "…" : (reports?.metrics.inventoryLowCount ?? 0)}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 text-muted-foreground">Maintenance</td>
                          <td className="p-2 text-xs">
                            {loadingReports
                              ? "…"
                              : `machines ${reports?.maintenance.totalMachines ?? 0} · warn ${reports?.maintenance.inWarning ?? 0} · err ${reports?.maintenance.inError ?? 0}`}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Manage Roles & Permissions</h3>
            {userActionError && (
              <p className="text-sm text-destructive" role="alert">
                {userActionError}
              </p>
            )}

            {canManageUsers ? (
              <div className="rounded-lg border p-4">
                <h4 className="text-sm font-medium">Create user</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  Admin-level accounts can register new users from this form.
                </p>
                <form onSubmit={createUser} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="su-username">Username</Label>
                    <Input
                      id="su-username"
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="su-password">Password</Label>
                    <Input
                      id="su-password"
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="su-email">Email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="su-first">First name</Label>
                    <Input
                      id="su-first"
                      value={createFirstName}
                      onChange={(e) => setCreateFirstName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="su-last">Last name</Label>
                    <Input
                      id="su-last"
                      value={createLastName}
                      onChange={(e) => setCreateLastName(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="su-role">Role</Label>
                    <select
                      id="su-role"
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as Role)}
                    >
                      {USER_MANAGEMENT_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating…" : "Create user"}
                    </Button>
                    {createMessage && (
                      <span className="text-xs text-muted-foreground">{createMessage}</span>
                    )}
                  </div>
                </form>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only admin-level accounts can create users from the dashboard.
              </p>
            )}

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">User</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!users?.length ? (
                    <tr className="border-t">
                      <td className="p-2 text-muted-foreground" colSpan={3}>
                        No users loaded. Check permissions or try again later.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = myUserId != null && u.userId === myUserId;
                      const baseline =
                        initialRolePick[u.userId] ??
                        defaultDashboardRoleForOrbitAccess(
                          u.role,
                          u.userRole,
                          u.enum
                        );
                      const draft = roleDraft[u.userId] ?? baseline;
                      const unchanged = draft === baseline;
                      return (
                        <tr key={u.userId} className="border-t">
                          <td className="p-2">{u.username}</td>
                          <td className="p-2">
                            {canManageUsers && !isSelf ? (
                              <select
                                className="h-8 w-full min-w-32 rounded-md border border-input bg-transparent px-2 text-sm"
                                value={draft}
                                onChange={(e) =>
                                  setRoleDraft((d) => ({
                                    ...d,
                                    [u.userId]: e.target.value as Role,
                                  }))
                                }
                              >
                                {USER_MANAGEMENT_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              defaultDashboardRoleForOrbitAccess(
                                u.role,
                                u.userRole,
                                u.enum
                              )
                            )}
                          </td>
                          <td className="p-2">
                            {canManageUsers && !isSelf ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={unchanged || savingUserId === u.userId}
                                onClick={() => void saveRoleForUser(u)}
                              >
                                {savingUserId === u.userId ? "Saving…" : "Save role"}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {isSelf ? "Your account" : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadUsers()}>
              Refresh users
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">System-Wide Reports</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Summaries combine inventory, revenue, and maintenance machine counts when available.
                </p>
                {reports?.note ? (
                  <p className="mt-2 text-xs text-muted-foreground">{reports.note}</p>
                ) : null}
                <ul className="mt-3 space-y-1 text-sm">
                  <li>
                    Low inventory count:{" "}
                    <span className="font-medium">
                      {loadingReports ? "…" : (reports?.metrics.inventoryLowCount ?? 0)}
                    </span>
                  </li>
                  <li>
                    Revenue today:{" "}
                    <span className="font-medium">
                      {loadingReports
                        ? "…"
                        : `$${(reports?.metrics.totalRevenueToday ?? 0).toLocaleString()}`}
                    </span>
                  </li>
                  <li>
                    Revenue last 30 days:{" "}
                    <span className="font-medium">
                      {loadingReports
                        ? "…"
                        : `$${(reports?.metrics.totalRevenueLast30Days ?? 0).toLocaleString()}`}
                    </span>
                  </li>
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadReports()}
                    disabled={loadingReports}
                  >
                    {loadingReports ? "Refreshing…" : "Refresh"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!reports || loadingReports}
                    onClick={() => exportSystemReportCsv()}
                  >
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <h3 className="text-sm font-medium">Supply Hub Activity</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr className="text-left">
                      <th className="p-2">Region</th>
                      <th className="p-2">Online</th>
                      <th className="p-2">Pending Shipments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reports?.hubActivity ?? []).map((hub) => (
                      <tr key={hub.region} className="border-t">
                        <td className="p-2">{hub.region}</td>
                        <td className="p-2">
                          {hub.online ? (
                            <span className="text-emerald-600">Online</span>
                          ) : (
                            <span className="text-destructive">Offline</span>
                          )}
                        </td>
                        <td className="p-2">{hub.pendingShipments}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">See Any Page</h3>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">
                Open another role dashboard in a preview panel (navigation only). Your account still
                controls which areas you can access.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/?preview=admin">Open Admin</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/?preview=manager">Open Manager</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/?preview=logistics">Open Logistics</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/?preview=repair">Open Repair</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

