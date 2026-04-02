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
import { ALL_ROLES, Role } from "@/lib/roles";
import {
  dashboardRoleToOrbit,
  defaultDashboardRoleForOrbit,
} from "@/lib/orbit-role-map";
import { hasOrbitAdminDashboardRole } from "@/lib/orbit-session";
import Link from "next/link";
import { downloadTextFile, rowsToCsv } from "@/lib/csv";

type SystemReports = {
  generatedAt: string;
  note?: string;
  metrics: {
    inventoryLowCount: number;
    totalStores: number;
    totalRevenueToday: number;
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
};

export function SuperAdminDashboard() {
  const { data: session } = useSession();
  const myUserId = session?.user?.id ? Number(session.user.id) : null;
  const canManageUsers = session ? hasOrbitAdminDashboardRole(session) : false;

  const [reports, setReports] = useState<SystemReports | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);
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

  const [superRegion, setSuperRegion] = useState("All");
  const [superStore, setSuperStore] = useState("All");

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/orbit/admin/system-reports");
      if (!res.ok) {
        setReports(null);
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

  function exportSystemReportCsv() {
    if (!reports) return;
    const rows: string[][] = [
      ["metric", "value"],
      ["generatedAt", reports.generatedAt],
      ["inventoryLowCount", String(reports.metrics.inventoryLowCount)],
      ["totalStores_reported", String(reports.metrics.totalStores)],
      ["totalRevenueToday", String(reports.metrics.totalRevenueToday)],
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
      picks[u.userId] = defaultDashboardRoleForOrbit(u.role);
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
      roleDraft[u.userId] ?? defaultDashboardRoleForOrbit(u.role);
    const nextOrbit = dashboardRoleToOrbit(draft);
    if (myUserId != null && u.userId === myUserId) {
      setUserActionError("You cannot change your own role.");
      return;
    }
    setSavingUserId(u.userId);
    try {
      const res = await fetch(`/api/orbit/users/${u.userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextOrbit }),
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
          role: dashboardRoleToOrbit(createRole),
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
          <CardDescription>System-wide visibility and cross-store control (scaffold).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Stores Online</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : storesOnline}
              </p>
              <p className="text-xs text-muted-foreground">
                {reports?.note ? "Partially live" : reports ? "OrbitDB" : "—"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Machines Needing Repair</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : machinesNeedingRepair}
              </p>
              <p className="text-xs text-muted-foreground">
                Placeholder until maintenance API exists
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Low Inventory Alerts</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : reports?.metrics.inventoryLowCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">From OrbitDB inventory</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">System Revenue (Today)</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : `$${(reports?.metrics.totalRevenueToday ?? 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">From OrbitDB revenues</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Cross-Store Access</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Region and store are UI context only. Inventory and revenue in Orbit are{" "}
                  <span className="font-medium text-foreground">not store-scoped</span> yet—per-store
                  views require Orbit APIs.
                </p>
                <div className="mt-3 space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="superRegion">
                    Region
                  </label>
                  <select
                    id="superRegion"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={superRegion}
                    onChange={(e) => setSuperRegion(e.target.value)}
                  >
                    <option value="All">All Regions</option>
                    <option value="A">Region A</option>
                    <option value="B">Region B</option>
                    <option value="C">Region C</option>
                  </select>

                  <label className="text-sm text-muted-foreground" htmlFor="superStore">
                    Store
                  </label>
                  <select
                    id="superStore"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={superStore}
                    onChange={(e) => setSuperStore(e.target.value)}
                  >
                    <option value="All">All Stores</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={String(n)}>
                        Store {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Performance Metrics</h3>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Multi-store and national trends need aggregated Orbit data. Below: current
                  system-report snapshot (global).
                </p>
                <div className="mt-3 overflow-x-auto rounded-md border">
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
                        <td className="p-2 text-muted-foreground">Revenue (week)</td>
                        <td className="p-2">
                          {loadingReports
                            ? "…"
                            : `$${(reports?.revenue.week ?? 0).toLocaleString()}`}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-muted-foreground">Revenue (month)</td>
                        <td className="p-2">
                          {loadingReports
                            ? "…"
                            : `$${(reports?.revenue.month ?? 0).toLocaleString()}`}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 text-muted-foreground">Low inventory rows</td>
                        <td className="p-2">
                          {loadingReports ? "…" : (reports?.metrics.inventoryLowCount ?? 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-muted-foreground">Maintenance (placeholder)</td>
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
                  Admin-level accounts can register users on the OrbitDB backend (same as{" "}
                  <code className="text-xs">POST /backend/auth/register</code>).
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
                      {ALL_ROLES.map((r) => (
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
                        No users loaded (forbidden or API unavailable).
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const isSelf = myUserId != null && u.userId === myUserId;
                      const baseline =
                        initialRolePick[u.userId] ??
                        defaultDashboardRoleForOrbit(u.role);
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
                                {ALL_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              defaultDashboardRoleForOrbit(u.role)
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
                  Summaries from{" "}
                  <code className="text-xs">/api/orbit/admin/system-reports</code>. Maintenance
                  figures stay placeholder until Orbit exposes machines.
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
                Open another role dashboard in a preview panel (navigation only). Requires Orbit:
                enforced page-level permissions and middleware.
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

