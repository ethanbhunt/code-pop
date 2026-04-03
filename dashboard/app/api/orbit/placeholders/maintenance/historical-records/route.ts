import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type HistoricalMaintenanceRecord = {
  id: string;
  machineId: string;
  date: string;
  logType: "status_change" | "repair" | "routine_maintenance" | "inspection";
  note: string;
  laborHours?: number;
  cost?: number;
};

type OrbitMachine = {
  machineId?: number;
};

type MachinesPayload = {
  data?: OrbitMachine[];
};

type OrbitHistoryTransition = {
  transitionId?: number;
  machineId?: number;
  oldStatus?: string;
  newStatus?: string;
  reason?: string;
  notes?: string;
  timestamp?: string;
};

type OrbitMachineHistory = {
  data?: OrbitHistoryTransition[];
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitStaffDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json({ error: "ORBITDB_API_URL is not configured" }, { status: 503 });
  }

  let machinesResult = await orbitJson<MachinesPayload>(
    token,
    `/maintenance/machines?storeId=${encodeURIComponent(storeId)}&limit=50`,
    { method: "GET" }
  );
  if (!machinesResult.ok && machinesResult.status === 403) {
    machinesResult = await orbitJson<MachinesPayload>(token, "/maintenance/assignments/me?limit=50", {
      method: "GET",
    });
  }
  if (!machinesResult.ok) {
    return new Response(machinesResult.body, { status: machinesResult.status });
  }

  const machineIds = (machinesResult.data.data ?? [])
    .map((machine) => machine.machineId)
    .filter((machineId): machineId is number => typeof machineId === "number")
    .slice(0, 12);

  const histories = await Promise.all(
    machineIds.map(async (machineId) => {
      const historyResult = await orbitJson<{ data?: OrbitMachineHistory }>(
        token,
        `/maintenance/history?machineId=${machineId}&page=1&limit=25`,
        { method: "GET" }
      );
      if (!historyResult.ok) {
        return [] as HistoricalMaintenanceRecord[];
      }

      const transitions = historyResult.data.data?.data ?? [];
      return transitions.map((transition) => ({
        id: `HIST-${transition.transitionId ?? 0}`,
        machineId: `M-${transition.machineId ?? machineId}`,
        date: (transition.timestamp || new Date().toISOString()).slice(0, 10),
        logType: "status_change" as const,
        note: transition.notes || transition.reason || `${transition.oldStatus ?? "unknown"} -> ${transition.newStatus ?? "unknown"}`,
      }));
    })
  );

  const records = histories
    .flat()
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return Response.json({
    storeId,
    generatedAt: new Date().toISOString(),
    records,
  });
}

