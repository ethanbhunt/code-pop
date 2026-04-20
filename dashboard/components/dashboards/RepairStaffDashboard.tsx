"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { parseCsvText, rowsToCsv, downloadTextFile } from "@/lib/csv";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  /** From the server when present */
  name?: string;
  model?: string;
  /** Store ID from the server (numeric). Workflow rows may omit this. */
  storeId?: number;
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

/** Label for status dropdown: ID plus name/model when available. */
function formatMachineOptionLabel(m: RepairWorkflowMachine): string {
  const name = m.name?.trim();
  const model = m.model?.trim();
  const parts: string[] = [];
  if (name) parts.push(name);
  if (model) parts.push(model);
  if (parts.length > 0) {
    return `${m.id} — ${parts.join(" · ")}`;
  }
  if (m.type && m.type !== "machine") {
    return `${m.id} — ${m.type}`;
  }
  return m.id;
}

const STATUS_FORM_OPTIONS = [
  "operational",
  "normal",
  "warning",
  "error",
  "out-of-order",
] as const;

/** Map server and workflow status strings onto the update form select values. */
function mapMachineStatusToFormValue(raw: string | undefined): string {
  const s = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

  if ((STATUS_FORM_OPTIONS as readonly string[]).includes(s)) {
    return s;
  }

  const snake = s.replace(/-/g, "_");
  const alias: Record<string, (typeof STATUS_FORM_OPTIONS)[number]> = {
    in_service: "operational",
    repair_start: "warning",
    repair_end: "operational",
    schedule_service: "warning",
    out_of_order: "out-of-order",
  };
  if (alias[snake]) return alias[snake];

  if (s.includes("error")) return "error";
  if (s.includes("warn")) return "warning";
  if (s.includes("out") && s.includes("order")) return "out-of-order";
  if (s.includes("operational") || snake === "in_service") return "operational";
  return "normal";
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
  const [createStoreId, setCreateStoreId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createModel, setCreateModel] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const pageSize = 5;

  useEffect(() => {
    setCreateStoreId(storeId);
  }, [storeId]);

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
        storeId:
          m.storeId != null ? parseInt(String(m.storeId), 10) : undefined,
        name: m.name,
        model: m.model,
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

  const selectedStoreIdNum = useMemo(() => parseInt(storeId, 10), [storeId]);

  /** Rows narrowed to the store selected in the picker (same scope as repair, filtered by UI store). */
  const apiMachinesForSelectedStore = useMemo(() => {
    if (apiMachines.length === 0) return [];
    if (!Number.isInteger(selectedStoreIdNum) || selectedStoreIdNum < 1) {
      return apiMachines;
    }
    return apiMachines.filter((m) => {
      if (!Number.isInteger(m.storeId)) return false;
      return m.storeId === selectedStoreIdNum;
    });
  }, [apiMachines, selectedStoreIdNum]);

  const displayMachines = useMemo(() => {
    if (apiMachines.length > 0) return apiMachinesForSelectedStore;
    return repairWorkflow?.machines ?? [];
  }, [apiMachines, apiMachinesForSelectedStore, repairWorkflow?.machines]);

  const statusMachines = apiMachines.length > 0 ? apiMachinesForSelectedStore : [];

  useEffect(() => {
    if (statusMachines.length === 0) {
      if (statusMachineId) setStatusMachineId("");
      return;
    }
    const hasSelected = statusMachines.some((m) => m.id === statusMachineId);
    if (!hasSelected) {
      setStatusMachineId(statusMachines[0].id);
    }
  }, [statusMachines, statusMachineId]);

  const prevStatusMachineId = useRef<string>("");

  useEffect(() => {
    if (!statusMachineId || statusMachines.length === 0) return;
    const sel = statusMachines.find((m) => m.id === statusMachineId);
    if (!sel) return;
    setNewStatusPick(mapMachineStatusToFormValue(sel.status));
    setStatusActionError(null);
    if (
      prevStatusMachineId.current !== "" &&
      prevStatusMachineId.current !== statusMachineId
    ) {
      setStatusReason("");
    }
    prevStatusMachineId.current = statusMachineId;
  }, [statusMachineId, statusMachines]);

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

  async function submitCreateMachine() {
    setCreateError(null);
    const sid = parseInt(createStoreId, 10);
    const name = createName.trim();
    const model = createModel.trim();
    if (!name || !model || Number.isNaN(sid) || sid < 1) {
      setCreateError("Enter a valid store ID, name, and model.");
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch("/api/orbit/maintenance/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: sid,
          name,
          model,
          status: "operational",
          serviceInterval: 30,
        }),
      });
      if (!res.ok) {
        setCreateError(await res.text().catch(() => res.statusText));
        return;
      }
      setCreateName("");
      setCreateModel("");
      await loadAssignments();
    } finally {
      setCreateSaving(false);
    }
  }

  async function submitStatusTransition() {
    setStatusActionError(null);
    if (!statusMachineId) {
      setStatusActionError("No machines in your assigned stores.");
      return;
    }
    const machineId = parseInt(statusMachineId, 10);
    if (Number.isNaN(machineId)) {
      setStatusActionError("Selected machine is invalid for status updates.");
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
            Machines are scoped to stores; repair staff see machines in stores they cover. Status and
            history load from maintenance when your session allows it; a local workflow view is used
            when needed. {ctx ? `Context: ${ctx.region} / ${ctx.storeLabel}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          <div className="space-y-3">
            <h3 className="text-sm font-medium">Machines in your stores</h3>
            <div className="rounded-lg border p-3">
              <h4 className="text-xs font-medium text-muted-foreground">Add machine</h4>
              <p className="mt-1 text-xs text-muted-foreground">
                Creates the machine for the store below (must be within your repair store scope).
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="createStoreId">
                    Store ID
                  </label>
                  <Input
                    id="createStoreId"
                    className="h-8"
                    value={createStoreId}
                    onChange={(e) => setCreateStoreId(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="createName">
                    Name
                  </label>
                  <Input
                    id="createName"
                    className="h-8"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. Front espresso"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground" htmlFor="createModel">
                    Model
                  </label>
                  <Input
                    id="createModel"
                    className="h-8"
                    value={createModel}
                    onChange={(e) => setCreateModel(e.target.value)}
                    placeholder="e.g. Rancilio Silvia"
                  />
                </div>
              </div>
              {createError ? (
                <p className="mt-2 text-xs text-destructive">{createError}</p>
              ) : null}
              <div className="mt-3">
                <Button
                  type="button"
                  size="sm"
                  disabled={createSaving}
                  onClick={() => void submitCreateMachine()}
                >
                  {createSaving ? "Creating…" : "Create machine"}
                </Button>
              </div>
            </div>
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
                    <th className="p-2">Name</th>
                    <th className="p-2">Model</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">{m.id}</td>
                      <td className="p-2 text-muted-foreground">
                        {m.name?.trim() ||
                          (!m.name && !m.model && m.type && m.type !== "machine"
                            ? m.type
                            : "—")}
                      </td>
                      <td className="p-2 text-muted-foreground">{m.model?.trim() || "—"}</td>
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
              Status filters below apply to the table. When maintenance data is loaded, the rows
              shown are machines whose <code className="text-xs">storeId</code> matches the Store
              number in the region picker (within your account’s store scope).
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
                    Parsed locally for review. Applying imported rows to the server is available when
                    your account can submit maintenance updates.
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
                      value={statusMachineId}
                      disabled={statusMachines.length === 0}
                      onChange={(e) => setStatusMachineId(e.target.value)}
                    >
                      {statusMachines.length === 0 ? (
                        <option value="">No machines in your stores</option>
                      ) : (
                        statusMachines.map((m) => (
                          <option key={m.id} value={m.id}>
                            {formatMachineOptionLabel(m)}
                          </option>
                        ))
                      )}
                    </select>
                    {statusMachines.length > 0 && statusMachineId
                      ? (() => {
                          const sel = statusMachines.find((x) => x.id === statusMachineId);
                          if (!sel) return null;
                          const name = sel.name?.trim();
                          const model = sel.model?.trim();
                          let line: string | null = null;
                          if (name || model) {
                            line = [name, model].filter(Boolean).join(" · ");
                          } else if (sel.type && sel.type !== "machine") {
                            line = sel.type;
                          }
                          if (!line) return null;
                          return (
                            <p className="mt-1 text-xs text-muted-foreground">{line}</p>
                          );
                        })()
                      : null}
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
                {statusMachineId && statusMachines.length > 0 ? (() => {
                  const cur = statusMachines.find((x) => x.id === statusMachineId);
                  if (!cur) return null;
                  return (
                    <p className="text-xs text-muted-foreground">
                      Current status:{" "}
                      <span className="font-medium text-foreground">{cur.status}</span>
                      {cur.lastServiceDate && cur.lastServiceDate !== "—" ? (
                        <span> · Last updated {cur.lastServiceDate}</span>
                      ) : null}
                    </p>
                  );
                })() : null}
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
                    disabled={statusSaving || statusMachines.length === 0}
                    onClick={() => void submitStatusTransition()}
                  >
                    {statusSaving ? "Saving…" : "Update Status"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setStatusActionError(null)}>
                    Clear
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Saves your change when the machine’s store is within your scope.
                </p>
                {statusMachines.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No machines were returned for your store scope. Ensure machines exist for that
                    store and your account has those stores in{" "}
                    <code className="text-xs">assignedStores</code>.
                  </p>
                ) : null}
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
                  Computed from last service date versus the workflow timestamp; live telemetry can
                  refine these estimates.
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
                  Download the optimized schedule as CSV.
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

