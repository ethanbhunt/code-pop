import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type InventoryPayload = {
  data?: Array<{
    itemName?: string;
    itemType?: string;
    quantity?: number;
    thresholdLevel?: number;
  }>;
};

type LowStockAlert = {
  item: string;
  type: string;
  currentQty: number;
  thresholdQty: number;
  suggestedReorderQty: number;
  severity: "High" | "Medium" | "Low";
};

function toAlerts(items: NonNullable<InventoryPayload["data"]>): LowStockAlert[] {
  return items
    .filter(
      (i) =>
        typeof i.quantity === "number" &&
        typeof i.thresholdLevel === "number" &&
        i.quantity < i.thresholdLevel
    )
    .map((i) => {
      const q = i.quantity ?? 0;
      const t = i.thresholdLevel ?? 1;
      const ratio = t > 0 ? q / t : 0;
      const severity: LowStockAlert["severity"] =
        ratio < 0.5 ? "High" : ratio < 0.75 ? "Medium" : "Low";
      return {
        item: i.itemName ?? "Unknown",
        type: i.itemType ?? "—",
        currentQty: q,
        thresholdQty: t,
        suggestedReorderQty: Math.max(t - q, 1),
        severity,
      };
    });
}

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
    return Response.json(
      { error: "Data service URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<InventoryPayload>(token, "/inventory", { method: "GET" });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }

  const alerts = toAlerts(result.data.data ?? []);
  return Response.json({
    storeId,
    note: "Inventory is returned globally; the selected store is used for context in this view.",
    generatedAt: new Date().toISOString(),
    alerts,
  });
}
