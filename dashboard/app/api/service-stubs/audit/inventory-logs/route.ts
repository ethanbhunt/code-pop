import type { NextRequest } from "next/server";

type InventoryAuditLog = {
  id: string;
  timestamp: string;
  actor: {
    id: string;
    name: string;
    role: string;
  };
  action: "inventory_update" | "threshold_update" | "inventory_import";
  target: {
    item: string;
    type: string;
    storeId: string;
  };
  changes: {
    fromQty?: number;
    toQty?: number;
    fromThreshold?: number;
    toThreshold?: number;
  };
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";
  const limitParam = req.nextUrl.searchParams.get("limit") ?? "25";
  const limit = Number(limitParam);

  const logs: InventoryAuditLog[] = [
    {
      id: "AUD-1001",
      timestamp: "2026-03-01T14:23:00.000Z",
      actor: { id: "u-1", name: "Orlando", role: "Manager" },
      action: "inventory_update",
      target: { item: "Coconut", type: "Add In", storeId },
      changes: { fromQty: 8, toQty: 50 },
    },
    {
      id: "AUD-1002",
      timestamp: "2026-03-02T10:05:00.000Z",
      actor: { id: "u-2", name: "Ada", role: "Admin" },
      action: "threshold_update",
      target: { item: "Dr. Pepper", type: "Soda", storeId },
      changes: { fromThreshold: 40, toThreshold: 45 },
    },
    {
      id: "AUD-1003",
      timestamp: "2026-03-03T18:41:00.000Z",
      actor: { id: "u-3", name: "Rin", role: "Logistics Manager" },
      action: "inventory_import",
      target: { item: "Vanilla", type: "Syrup", storeId },
      changes: { fromQty: 70, toQty: 75 },
    },
  ];

  return Response.json({
    storeId,
    generatedAt: new Date().toISOString(),
    logs: logs.slice(0, Number.isFinite(limit) ? limit : 25),
  });
}

