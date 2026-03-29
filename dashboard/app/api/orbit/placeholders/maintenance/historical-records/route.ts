import type { NextRequest } from "next/server";

type HistoricalMaintenanceRecord = {
  id: string;
  machineId: string;
  date: string;
  logType: "status_change" | "repair" | "routine_maintenance" | "inspection";
  note: string;
  laborHours?: number;
  cost?: number;
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const records: HistoricalMaintenanceRecord[] = [
    {
      id: "HIST-2001",
      machineId: "M-1002",
      date: "2026-02-10",
      logType: "routine_maintenance",
      note: "Replaced filter cartridge.",
      laborHours: 1.5,
      cost: 220,
    },
    {
      id: "HIST-2002",
      machineId: "M-1002",
      date: "2026-02-21",
      logType: "inspection",
      note: "Calibrated flow sensor.",
      laborHours: 0.9,
      cost: 140,
    },
    {
      id: "HIST-2003",
      machineId: "M-1003",
      date: "2026-02-25",
      logType: "repair",
      note: "Fixed motor jam; reset controller.",
      laborHours: 2.1,
      cost: 410,
    },
  ];

  return Response.json({
    storeId,
    generatedAt: new Date().toISOString(),
    records,
  });
}

