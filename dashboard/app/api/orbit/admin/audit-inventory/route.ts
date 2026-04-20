import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import {
  fetchInventoryMergedAcrossStores,
  storeIdsFromOrbitStoresPayload,
  type OrbitInventoryRow,
} from "@/lib/orbit-inventory-by-store";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

type InventoryPayload = { data?: OrbitInventoryRow[] };

export async function GET(req: NextRequest) {
  const storeIdParam = req.nextUrl.searchParams.get("storeId") ?? "global";
  const limitParam = req.nextUrl.searchParams.get("limit") ?? "25";
  const limit = Math.min(Math.max(Number(limitParam) || 25, 1), 100);

  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitAdminDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "Data service URL is not configured" },
      { status: 503 }
    );
  }

  let items: OrbitInventoryRow[] = [];
  let storeIdLabel = storeIdParam;

  if (storeIdParam === "global") {
    const storesR = await orbitJson<unknown>(token, "/stores?limit=200", { method: "GET" });
    const storeIds = storeIdsFromOrbitStoresPayload(storesR.ok ? storesR.data : null);
    items = await fetchInventoryMergedAcrossStores(
      token,
      storeIds.length ? storeIds : [1, 2, 3]
    );
  } else {
    const sid = parseInt(storeIdParam, 10);
    if (!Number.isInteger(sid) || sid < 1) {
      return Response.json({ error: "Invalid storeId" }, { status: 400 });
    }
    storeIdLabel = String(sid);
    const result = await orbitJson<InventoryPayload>(
      token,
      `/inventory?storeId=${sid}&limit=500`,
      { method: "GET" }
    );
    if (!result.ok) {
      return new Response(result.body, { status: result.status });
    }
    items = [...(result.data.data ?? [])];
  }

  const itemsSorted = [...items].sort((a, b) => {
    const ta = new Date(a.lastUpdated ?? 0).getTime();
    const tb = new Date(b.lastUpdated ?? 0).getTime();
    return tb - ta;
  });

  const logs = itemsSorted.slice(0, limit).map((item) => ({
    id: `inv-${item.inventoryId ?? "?"}`,
    timestamp: item.lastUpdated ?? new Date().toISOString(),
    actor: { id: "system", name: "Inventory", role: "system" },
    action: "inventory_update" as const,
    target: {
      item: item.itemName ?? "Unknown",
      type: item.itemType ?? "—",
      storeId: item.storeId != null ? String(item.storeId) : storeIdLabel,
    },
    changes: { toQty: item.quantity, toThreshold: item.thresholdLevel },
  }));

  return Response.json({
    storeId: storeIdLabel,
    note: "Derived from inventory last-updated timestamps; a dedicated audit log is not available yet.",
    generatedAt: new Date().toISOString(),
    logs,
  });
}
