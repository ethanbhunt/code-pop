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

type SystemReports = {
  generatedAt: string;
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

export function SuperAdminDashboard() {
  const [reports, setReports] = useState<SystemReports | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingReports(true);
      try {
        const res = await fetch("/api/service-stubs/admin/system-reports");
        const data = (await res.json()) as SystemReports;
        if (!cancelled) setReports(data);
      } finally {
        if (!cancelled) setLoadingReports(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const storesOnline = useMemo(() => {
    if (!reports) return 0;
    return reports.hubActivity.filter((h) => h.online).length;
  }, [reports]);

  const machinesNeedingRepair = useMemo(() => {
    if (!reports) return 0;
    return reports.maintenance.inWarning + reports.maintenance.inError;
  }, [reports]);

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
                {reports ? "Mock from stub" : "TODO backend"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Machines Needing Repair</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : machinesNeedingRepair}
              </p>
              <p className="text-xs text-muted-foreground">
                {reports ? "Mock from stub" : "TODO backend"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Low Inventory Alerts</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : reports?.metrics.inventoryLowCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {reports ? "Mock from stub" : "TODO backend"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">System Revenue (Today)</p>
              <p className="text-2xl font-semibold">
                {loadingReports ? "…" : `$${(reports?.metrics.totalRevenueToday ?? 0).toLocaleString()}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {reports ? "Mock from stub" : "TODO backend"}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Cross-Store Access</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  TODO: enable selecting any store and viewing its data.
                </p>
                <div className="mt-3 space-y-2">
                  <label className="text-sm text-muted-foreground" htmlFor="superRegion">
                    Region
                  </label>
                  <select
                    id="superRegion"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    defaultValue="All"
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
                    defaultValue="All"
                    disabled
                  >
                    <option value="All">All Stores (TODO)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Performance Metrics</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  TODO: show multi-store comparisons and national trends.
                </p>
                <div className="mt-3 h-40 rounded-md bg-muted/40" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Manage Roles & Permissions</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">User</th>
                    <th className="p-2">Current Role</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="p-2">staff</td>
                    <td className="p-2">Repair Staff</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>
                          Change Role
                        </Button>
                        <Button variant="outline" size="sm" disabled>
                          Grant Permissions
                        </Button>
                      </div>
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="p-2">super</td>
                    <td className="p-2">Super Admin</td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled>
                          Manage
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">System-Wide Reports</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  TODO: inventory, revenue, and maintenance performance summaries.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button disabled>Generate Report</Button>
                  <Button variant="outline" disabled>
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
                TODO: implement page-level permission pass-through.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" disabled>
                  Open Admin
                </Button>
                <Button variant="outline" disabled>
                  Open Manager
                </Button>
                <Button variant="outline" disabled>
                  Open Logistics
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

