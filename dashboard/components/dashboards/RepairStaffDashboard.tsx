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
import { StoreRegionPicker } from "@/components/context/StoreRegionPicker";
import type { StoreRegionContext } from "@/components/context/StoreRegionPicker";

type RepairScheduleStop = {
  stop: number;
  machineId: string;
  plannedDate: string;
  travelTime: string;
  priority: "High" | "Medium" | "Low";
};

type RepairConstraints = {
  warningMaxOperationalHours: number;
  maxTimeBetweenServiceDays: number;
  notes: string;
};

type RepairWorkflowMachine = {
  id: string;
  type: string;
  status: string;
  lastServiceDate: string;
};

type RepairWorkflowStep = { step: string; done: boolean };

type RepairWorkflowResponse = {
  region: string;
  storeId: string;
  generatedAt: string;
  machines: RepairWorkflowMachine[];
  constraints: RepairConstraints;
  optimizedSchedule: RepairScheduleStop[];
  statusTransitionOptions: string[];
  workflow: RepairWorkflowStep[];
};

type HistoricalMaintenanceRecord = {
  id: string;
  machineId: string;
  date: string;
  logType: string;
  note: string;
  laborHours?: number;
  cost?: number;
};

export function RepairStaffDashboard() {
  const [ctx, setCtx] = useState<StoreRegionContext | null>(null);

  const region = ctx?.region ?? "Region C";
  const storeId = ctx?.storeId ?? "1";

  const [repairWorkflow, setRepairWorkflow] =
    useState<RepairWorkflowResponse | null>(null);
  const [historicalRecords, setHistoricalRecords] = useState<
    HistoricalMaintenanceRecord[] | null
  >(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMaintenance(true);
      try {
        const [workflowRes, historyRes] = await Promise.all([
          fetch(
            `/api/service-stubs/maintenance/repair-workflow?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/service-stubs/maintenance/historical-records?storeId=${encodeURIComponent(
              storeId
            )}`
          ),
        ]);

        const [workflow, history] = await Promise.all([
          workflowRes.json(),
          historyRes.json(),
        ]);

        if (!cancelled) {
          setRepairWorkflow(workflow as RepairWorkflowResponse);
          setHistoricalRecords(history.records as HistoricalMaintenanceRecord[]);
        }
      } finally {
        if (!cancelled) setLoadingMaintenance(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [region, storeId]);

  return (
    <section className="space-y-4">
      <StoreRegionPicker onContextChange={setCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Repair Staff Dashboard</CardTitle>
          <CardDescription>
            Machine maintenance scheduling and status updates (scaffold). {ctx
              ? `Context: ${ctx.region} / ${ctx.storeLabel}`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Repair Workflow</h3>
            <div className="rounded-lg border p-3">
              {loadingMaintenance && !repairWorkflow ? (
                <p className="text-sm text-muted-foreground">Loading workflow…</p>
              ) : repairWorkflow ? (
                <ol className="space-y-2 text-sm">
                  {repairWorkflow.workflow.map((s) => (
                    <li
                      key={s.step}
                      className="flex items-start gap-2"
                    >
                      <span className={s.done ? "text-emerald-600" : "text-muted-foreground"}>
                        {s.done ? "✓" : "•"}
                      </span>
                      <span>{s.step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-destructive">Workflow unavailable.</p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Assigned Machines</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Machine ID</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(repairWorkflow?.machines ?? []).map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.id}</td>
                      <td className="p-2">{m.type}</td>
                      <td className="p-2">
                        {m.status === "error" ? (
                          <span className="text-destructive">error</span>
                        ) : m.status === "warning" ? (
                          <span className="text-amber-600">warning</span>
                        ) : (
                          <span className="text-muted-foreground">{m.status}</span>
                        )}
                      </td>
                      <td className="p-2 text-muted-foreground">{m.lastServiceDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              TODO: filter by assignments from backend once roles are scoped.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">CSV Import: Repair Schedules</h3>
              <div className="rounded-lg border p-3">
                <input type="file" accept=".csv,text/csv" disabled />
                <div className="mt-3 flex gap-2">
                  <Button disabled>Import CSV</Button>
                  <Button variant="outline" disabled>
                    Use Template
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: parse CSV and prefill machine statuses/schedules.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Update Machine Statuses</h3>
              <div className="rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="machineId">
                      Machine
                    </label>
                    <select
                      id="machineId"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      disabled
                      defaultValue="M-1002"
                    >
                      <option value="M-1002">M-1002</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="machineStatus">
                      New Status
                    </label>
                    <select
                      id="machineStatus"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      defaultValue="warning"
                    >
                      <option value="normal">normal</option>
                      <option value="warning">warning</option>
                      <option value="repair-start">repair-start</option>
                      <option value="repair-end">repair-end</option>
                      <option value="error">error</option>
                      <option value="out-of-order">out-of-order</option>
                      <option value="schedule-service">schedule-service</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button disabled>Update Status</Button>
                  <Button variant="outline" disabled>
                    Cancel
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: persist status transitions with timestamps/responsible personnel.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Optimized Repair Schedule</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/30">
                  <tr className="text-left">
                    <th className="p-2">Stop #</th>
                    <th className="p-2">Machine</th>
                    <th className="p-2">Planned Date</th>
                    <th className="p-2">Travel Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(repairWorkflow?.optimizedSchedule ?? []).map((s) => (
                    <tr key={s.stop} className="border-t">
                      <td className="p-2">{s.stop}</td>
                      <td className="p-2">{s.machineId}</td>
                      <td className="p-2">{s.plannedDate}</td>
                      <td className="p-2 text-muted-foreground">{s.travelTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-2">
              <Button disabled>Generate Optimized Plan</Button>
              <Button variant="outline" disabled>
                Save
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Warning-State Alerts</h3>
              <div className="rounded-lg border p-3">
                <ul className="space-y-2 text-sm">
                  {(repairWorkflow?.machines ?? [])
                    .filter((m) => m.status === "warning")
                    .map((m) => (
                      <li
                        key={m.id}
                        className="flex items-start justify-between gap-3"
                      >
                        <span>
                          Machine {m.id} nearing max operational time
                        </span>
                        <span className="text-amber-600">
                          {repairWorkflow?.constraints.warningMaxOperationalHours ?? 48}h
                        </span>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  TODO: compute approaching maximum allowed time based on timestamps.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Compliance: Max Time Between Visits</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Max time between service visits:{" "}
                  <span className="font-medium text-foreground">
                    {repairWorkflow?.constraints.maxTimeBetweenServiceDays ?? 30}{" "}
                    days
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Warning-state max operational hours:{" "}
                  <span className="font-medium text-foreground">
                    {repairWorkflow?.constraints.warningMaxOperationalHours ?? 48}h
                  </span>
                  . {repairWorkflow?.constraints.notes ?? ""}
                </p>
                <div className="mt-3 h-24 rounded-md bg-muted/40" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Historical Maintenance Records</h3>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr className="text-left">
                      <th className="p-2">Machine</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(historicalRecords ?? []).map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-2">{h.machineId}</td>
                        <td className="p-2 text-muted-foreground">{h.date}</td>
                        <td className="p-2">{h.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                TODO: support selecting a machine and paginating history.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Export Repair Schedules to CSV</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  TODO: export schedules for external sharing.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button disabled>Export CSV</Button>
                  <Button variant="outline" disabled>
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

