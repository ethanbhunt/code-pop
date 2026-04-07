"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { parseCsvText, rowsToCsv, downloadTextFile } from "@/lib/csv";
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

type MachineFilter = "all" | "warning" | "error" | "normal";

type ApiMaintenanceMachine = {
  machineId: number;
  name?: string;
  model?: string;
  status: string;
  lastServiceDate?: string | null;
  updatedAt?: string;
  storeId?: number;
  storeName?: string;
};

type StatusTransitionRow = {
  transitionId: number;
  machineId: number;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
  reason?: string;
  notes?: string;
};

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

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

  const [machineFilter, setMachineFilter] = useState<MachineFilter>("all");
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(
    null
  );
  const [historyMachineId, setHistoryMachineId] = useState<string>("all");
  const [historyPage, setHistoryPage] = useState(0);
  const [statusMachineId, setStatusMachineId] = useState("");
  const [newStatusPick, setNewStatusPick] = useState("warning");
  const [statusReason, setStatusReason] = useState("Routine check");
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [apiMachines, setApiMachines] = useState<RepairWorkflowMachine[]>([]);
  const [orbitHistoryRows, setOrbitHistoryRows] = useState<HistoricalMaintenanceRecord[] | null>(
    null
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const pageSize = 5;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingMaintenance(true);
      try {
        const [workflowRes, historyRes] = await Promise.all([
          fetch(
            `/api/orbit/placeholders/maintenance/repair-workflow?region=${encodeURIComponent(
              region
            )}&storeId=${encodeURIComponent(storeId)}`
          ),
          fetch(
            `/api/orbit/placeholders/maintenance/historical-records?storeId=${encodeURIComponent(
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

  const loadAssignments = useCallback(async () => {
    try {
      const res = await fetch("/api/orbit/maintenance/assignments/me");
      if (!res.ok) {
        setApiMachines([]);
        return;
      }
      const json = (await res.json()) as { data?: ApiMaintenanceMachine[] };
      const mapped: RepairWorkflowMachine[] = (json.data ?? []).map((m) => ({
        id: String(m.machineId),
        type: m.model || m.name || "machine",
        status: m.status,
        lastServiceDate: m.lastServiceDate || m.updatedAt || "—",
      }));
      setApiMachines(mapped);
    } catch {
      setApiMachines([]);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const displayMachines = useMemo(() => {
    if (apiMachines.length > 0) return apiMachines;
    return repairWorkflow?.machines ?? [];
  }, [apiMachines, repairWorkflow?.machines]);

  useEffect(() => {
    const first = displayMachines[0]?.id;
    if (first && !statusMachineId) {
      setStatusMachineId(first);
    }
  }, [displayMachines, statusMachineId]);

  const filteredMachines = useMemo(() => {
    const list = displayMachines;
    if (machineFilter === "all") return list;
    return list.filter((m) => m.status === machineFilter);
  }, [displayMachines, machineFilter]);

  useEffect(() => {
    let cancelled = false;
    async function loadOrbitHistory() {
      if (historyMachineId === "all") {
        setOrbitHistoryRows(null);
        return;
      }
      const mid = parseInt(historyMachineId, 10);
      if (Number.isNaN(mid)) {
        setOrbitHistoryRows(null);
        return;
      }
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/orbit/maintenance/history?machineId=${mid}&page=${historyPage + 1}&limit=${pageSize}`
        );
        if (!res.ok || cancelled) {
          if (!cancelled) setOrbitHistoryRows([]);
          return;
        }
        const json = (await res.json()) as {
          data?: StatusTransitionRow[];
        };
        const rows = (json.data ?? []).map((t) => ({
          id: String(t.transitionId),
          machineId: String(t.machineId),
          date: t.timestamp,
          logType: `${t.oldStatus} → ${t.newStatus}`,
          note: [t.reason, t.notes].filter(Boolean).join(" — "),
        }));
        if (!cancelled) setOrbitHistoryRows(rows);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }
    void loadOrbitHistory();
    return () => {
      cancelled = true;
    };
  }, [historyMachineId, historyPage, pageSize]);

  const filteredHistory = useMemo(() => {
    if (historyMachineId === "all") {
      return historicalRecords ?? [];
    }
    return orbitHistoryRows ?? [];
  }, [historicalRecords, historyMachineId, orbitHistoryRows]);

  async function submitStatusTransition() {
    setStatusActionError(null);
    const machineId = parseInt(statusMachineId, 10);
    if (Number.isNaN(machineId)) {
      setStatusActionError("Select a machine.");
      return;
    }
    setStatusSaving(true);
    try {
      const res = await fetch("/api/orbit/maintenance/status-transitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId,
          newStatus: newStatusPick,
          reason: statusReason.trim() || "dashboard update",
          notes: "",
        }),
      });
      if (!res.ok) {
        setStatusActionError(await res.text().catch(() => res.statusText));
        return;
      }
      await loadAssignments();
      if (historyMachineId !== "all" && historyMachineId === statusMachineId) {
        setHistoryLoading(true);
        const h = await fetch(
          `/api/orbit/maintenance/history?machineId=${machineId}&page=${historyPage + 1}&limit=${pageSize}`
        );
        if (h.ok) {
          const json = (await h.json()) as { data?: StatusTransitionRow[] };
          setOrbitHistoryRows(
            (json.data ?? []).map((t) => ({
              id: String(t.transitionId),
              machineId: String(t.machineId),
              date: t.timestamp,
              logType: `${t.oldStatus} → ${t.newStatus}`,
              note: [t.reason, t.notes].filter(Boolean).join(" — "),
            }))
          );
        }
        setHistoryLoading(false);
      }
    } finally {
      setStatusSaving(false);
    }
  }

  const historyPageRows = useMemo(() => {
    const start = historyPage * pageSize;
    return filteredHistory.slice(start, start + pageSize);
  }, [filteredHistory, historyPage, pageSize]);

  const historyPageCount = Math.max(1, Math.ceil(filteredHistory.length / pageSize));

  function onRepairCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setCsvPreview(parseCsvText(String(reader.result ?? "")));
      } catch {
        setCsvPreview(null);
      }
    };
    reader.readAsText(file);
  }

  function exportScheduleCsv() {
    const sched = repairWorkflow?.optimizedSchedule ?? [];
    if (!sched.length) return;
    const header = ["stop", "machineId", "plannedDate", "travelTime", "priority"];
    const rows = sched.map((s) => [
      String(s.stop),
      s.machineId,
      s.plannedDate,
      s.travelTime,
      s.priority,
    ]);
    downloadTextFile(
      `repair-schedule-${storeId}.csv`,
      rowsToCsv([header, ...rows])
    );
  }

  return (
    <section className="space-y-4">
      <StoreRegionPicker onContextChange={setCtx} />

      <Card>
        <CardHeader>
          <CardTitle>Repair Staff Dashboard</CardTitle>
          <CardDescription>
            Assigned machines, status transitions, and per-machine history use Orbit maintenance
            routes when your session is repair-capable; workflow mock still loads as a fallback.{" "}
            {ctx ? `Context: ${ctx.region} / ${ctx.storeLabel}` : ""}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Show:</span>
              <select
                className="h-8 rounded-md border bg-transparent px-2 text-xs"
                value={machineFilter}
                onChange={(e) => setMachineFilter(e.target.value as MachineFilter)}
              >
                <option value="all">All</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="normal">Normal</option>
              </select>
            </div>
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
                  {filteredMachines.map((m) => (
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
              Client-side filter on scaffold data. Requires Orbit: assignments keyed to user
              roles and a machine registry.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">CSV Import: Repair Schedules</h3>
              <div className="rounded-lg border p-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onRepairCsv(f);
                  }}
                />
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      downloadTextFile(
                        "repair-import-template.csv",
                        rowsToCsv([
                          ["machineId", "plannedDate", "note"],
                          ["M-1001", "2026-03-15", "example"],
                        ])
                      )
                    }
                  >
                    Use Template
                  </Button>
                </div>
                {csvPreview ? (
                  <div className="mt-3 max-h-32 overflow-auto rounded-md border text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          {csvPreview.headers.map((h) => (
                            <th key={h} className="p-1 text-left">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.rows.slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-t">
                            {row.map((c, j) => (
                              <td key={j} className="p-1">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Parsed locally for review. Applying rows to Orbit requires a maintenance API.
                  </p>
                )}
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
                      value={statusMachineId || displayMachines[0]?.id || ""}
                      onChange={(e) => setStatusMachineId(e.target.value)}
                    >
                      {displayMachines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground" htmlFor="machineStatus">
                      New Status
                    </label>
                    <select
                      id="machineStatus"
                      className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                      value={newStatusPick}
                      onChange={(e) => setNewStatusPick(e.target.value)}
                    >
                      <option value="operational">operational</option>
                      <option value="normal">normal</option>
                      <option value="warning">warning</option>
                      <option value="error">error</option>
                      <option value="out-of-order">out-of-order</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="statusReason">
                    Reason
                  </label>
                  <input
                    id="statusReason"
                    className="h-8 w-full rounded-lg border bg-transparent px-2 text-sm"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                  />
                </div>
                {statusActionError ? (
                  <p className="mt-2 text-xs text-destructive">{statusActionError}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={statusSaving}
                    onClick={() => void submitStatusTransition()}
                  >
                    {statusSaving ? "Saving…" : "Update Status"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStatusActionError(null)}>
                    Clear
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Persists via <code className="text-xs">POST /maintenance/status-transitions</code>{" "}
                  (Orbit enforces assignment / store rules).
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
              <Button type="button" disabled>
                Generate Optimized Plan
              </Button>
              <Button type="button" variant="outline" disabled>
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
                    .map((m) => {
                      const daysSince = daysBetween(
                        m.lastServiceDate,
                        repairWorkflow?.generatedAt ?? new Date().toISOString()
                      );
                      const maxDays = repairWorkflow?.constraints.maxTimeBetweenServiceDays ?? 30;
                      return (
                        <li
                          key={m.id}
                          className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <span>
                            Machine {m.id} — {daysSince} days since last service (limit {maxDays}{" "}
                            days)
                          </span>
                          <span className="text-amber-600">
                            warn ≤ {repairWorkflow?.constraints.warningMaxOperationalHours ?? 48}h
                            ops
                          </span>
                        </li>
                      );
                    })}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Computed client-side from `lastServiceDate` vs workflow timestamp; telemetry would
                  refine this in Orbit.
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
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="histMachine">
                  Machine
                </label>
                <select
                  id="histMachine"
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={historyMachineId}
                  onChange={(e) => {
                    setHistoryMachineId(e.target.value);
                    setHistoryPage(0);
                  }}
                >
                  <option value="all">All machines</option>
                  {displayMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
                {historyLoading ? (
                  <span className="text-xs text-muted-foreground">Loading history…</span>
                ) : null}
              </div>
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
                    {historyPageRows.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="p-2">{h.machineId}</td>
                        <td className="p-2 text-muted-foreground">{h.date}</td>
                        <td className="p-2">{h.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 0}
                  onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                >
                  Prev
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {historyPage + 1} / {historyPageCount} ({filteredHistory.length} rows)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= historyPageCount - 1}
                  onClick={() =>
                    setHistoryPage((p) => Math.min(historyPageCount - 1, p + 1))
                  }
                >
                  Next
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">Export Repair Schedules to CSV</h3>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-muted-foreground">
                  Download the optimized schedule from placeholder data as CSV.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    disabled={!repairWorkflow?.optimizedSchedule?.length}
                    onClick={() => exportScheduleCsv()}
                  >
                    Export CSV
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!repairWorkflow}
                    onClick={() => {
                      if (!repairWorkflow) return;
                      const rows: string[][] = [
                        ["field", "value"],
                        ["region", repairWorkflow.region],
                        ["storeId", repairWorkflow.storeId],
                        ["generatedAt", repairWorkflow.generatedAt],
                      ];
                      repairWorkflow.machines.forEach((m) => {
                        rows.push(["machine", `${m.id}:${m.status}:${m.lastServiceDate}`]);
                      });
                      downloadTextFile(`repair-summary-${storeId}.csv`, rowsToCsv(rows));
                    }}
                  >
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

