import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

type InventoryPayload = {
  data?: Array<{
    inventoryId?: number;
    itemName?: string;
    itemType?: string;
    quantity?: number;
    thresholdLevel?: number;
    lastUpdated?: string;
  }>;
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "global";
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
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<InventoryPayload>(token, "/inventory", { method: "GET" });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }

  const items = [...(result.data.data ?? [])].sort((a, b) => {
    const ta = new Date(a.lastUpdated ?? 0).getTime();
    const tb = new Date(b.lastUpdated ?? 0).getTime();
    return tb - ta;
  });

  const logs = items.slice(0, limit).map((item) => ({
    id: `inv-${item.inventoryId ?? "?"}`,
    timestamp: item.lastUpdated ?? new Date().toISOString(),
    actor: { id: "system", name: "Inventory", role: "system" },
    action: "inventory_update" as const,
    target: {
      item: item.itemName ?? "Unknown",
      type: item.itemType ?? "—",
      storeId,
    },
    changes: { toQty: item.quantity, toThreshold: item.thresholdLevel },
  }));

  return Response.json({
    storeId,
    note: "Derived from inventory lastUpdated; no dedicated audit log in OrbitDB.",
    generatedAt: new Date().toISOString(),
    logs,
  });
}
