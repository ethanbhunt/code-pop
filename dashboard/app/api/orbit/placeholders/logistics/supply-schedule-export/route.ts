import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type TransferItem = {
  inventoryId?: number;
  quantity?: number;
  itemName?: string;
};

type TransferRecord = {
  transferId?: number;
  sourceStoreId?: number;
  destStoreId?: number;
  items?: TransferItem[];
  status?: string;
  createdAt?: string;
  scheduledDate?: string | null;
};

type TransfersPayload = {
  data?: TransferRecord[];
};

type OrbitInventoryItem = {
  inventoryId?: number;
  itemName?: string;
  quantity?: number;
  thresholdLevel?: number;
};

type InventoryPayload = {
  data?: OrbitInventoryItem[];
};

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "Region C";
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

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `supply-schedule_${region}_store-${storeId}_${timestamp}.csv`;

  const [transfersResult, inventoryResult] = await Promise.all([
    orbitJson<TransfersPayload>(token, `/logistics/transfers?storeId=${encodeURIComponent(storeId)}&limit=25`, {
      method: "GET",
    }),
    orbitJson<InventoryPayload>(token, "/inventory", { method: "GET" }),
  ]);

  const inventoryById = new Map<number, string>();
  if (inventoryResult.ok) {
    for (const item of inventoryResult.data.data ?? []) {
      if (typeof item.inventoryId === "number" && item.itemName) {
        inventoryById.set(item.inventoryId, item.itemName);
      }
    }
  }

  let csvPreviewRows: Array<{ date: string; store: string; hub: string; item: string; qty: number }> = [];

  if (transfersResult.ok) {
    csvPreviewRows = (transfersResult.data.data ?? [])
      .flatMap((transfer) => {
        const date = (transfer.scheduledDate || transfer.createdAt || new Date().toISOString()).slice(0, 10);
        const hub = `Store ${transfer.sourceStoreId ?? "-"}`;
        const store = `Store ${transfer.destStoreId ?? storeId}`;
        return (transfer.items ?? []).map((item) => ({
          date,
          store,
          hub,
          item:
            item.itemName ||
            (typeof item.inventoryId === "number" ? inventoryById.get(item.inventoryId) : undefined) ||
            `Inventory ${item.inventoryId ?? "?"}`,
          qty: item.quantity ?? 0,
        }));
      })
      .slice(0, 12);
  }

  // Fallback from live inventory if no transfer rows are currently available.
  if (!csvPreviewRows.length && inventoryResult.ok) {
    csvPreviewRows = (inventoryResult.data.data ?? [])
      .filter(
        (item) =>
          typeof item.quantity === "number" &&
          typeof item.thresholdLevel === "number" &&
          item.quantity < item.thresholdLevel
      )
      .slice(0, 8)
      .map((item) => ({
        date: new Date().toISOString().slice(0, 10),
        store: `Store ${storeId}`,
        hub: `Region ${region}`,
        item: item.itemName ?? "Unknown",
        qty: Math.max((item.thresholdLevel ?? 0) - (item.quantity ?? 0), 1),
      }));
  }

  return Response.json({
    region,
    storeId,
    filename,
    mimeType: "text/csv",
    csvPreviewRows,
    downloadUrl: null,
  });
}

