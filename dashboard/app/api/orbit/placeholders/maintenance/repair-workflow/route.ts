import type { NextRequest } from "next/server";

type Machine = {
  id: string;
  type: string;
  status: string;
  lastServiceDate: string;
};

type ConstraintMetadata = {
  warningMaxOperationalHours: number;
  maxTimeBetweenServiceDays: number;
  notes: string;
};

type RepairScheduleStop = {
  stop: number;
  machineId: string;
  plannedDate: string;
  travelTime: string;
  priority: "High" | "Medium" | "Low";
};

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "Region C";
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const machines: Machine[] = [
    {
      id: "M-1001",
      type: "Soda Dispenser",
      status: "normal",
      lastServiceDate: "2026-03-01",
    },
    {
      id: "M-1002",
      type: "Syrup Pump",
      status: "warning",
      lastServiceDate: "2026-03-03",
    },
    {
      id: "M-1003",
      type: "Mix Module",
      status: "error",
      lastServiceDate: "2026-03-04",
    },
  ];

  const constraints: ConstraintMetadata = {
    warningMaxOperationalHours: 48,
    maxTimeBetweenServiceDays: 30,
    notes:
      "Mock constraints for scaffolding. Replace with backend constraints once maintenance tables exist.",
  };

  const optimizedSchedule: RepairScheduleStop[] = [
    {
      stop: 1,
      machineId: "M-1003",
      plannedDate: "2026-03-06",
      travelTime: "2h 10m",
      priority: "High",
    },
    {
      stop: 2,
      machineId: "M-1002",
      plannedDate: "2026-03-07",
      travelTime: "1h 40m",
      priority: "Medium",
    },
    {
      stop: 3,
      machineId: "M-1001",
      plannedDate: "2026-03-08",
      travelTime: "0h 25m",
      priority: "Low",
    },
  ];

  const statusTransitionOptions = [
    "normal",
    "warning",
    "repair-start",
    "repair-end",
    "error",
    "out-of-order",
    "schedule-service",
  ];

  return Response.json({
    region,
    storeId,
    generatedAt: new Date().toISOString(),
    machines,
    constraints,
    optimizedSchedule,
    statusTransitionOptions,
    workflow: [
      { step: "View Machines", done: true },
      { step: "Import CSV Repair Schedules", done: false },
      { step: "Update Machine Statuses", done: false },
      { step: "Generate Optimized Schedule", done: false },
      { step: "Apply Constraints", done: false },
      { step: "Record Maintenance", done: false },
      { step: "View Historical Records", done: false },
    ],
  });
}

