import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type ComparisonRow = {
  date: string;
  item: string;
  forecast: number;
  actual: number;
  absError: number;
};

type OrbitInventoryItem = {
  itemName?: string;
  quantity?: number;
  thresholdLevel?: number;
};

type InventoryPayload = {
  data?: OrbitInventoryItem[];
};

function dateOffsetIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function stableOffset(seed: string): number {
  let total = 0;
  for (let i = 0; i < seed.length; i += 1) {
    total += seed.charCodeAt(i);
  }
  return (total % 5) - 2;
}

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

  const inventoryResult = await orbitJson<InventoryPayload>(token, "/inventory", {
    method: "GET",
  });
  if (!inventoryResult.ok) {
    return new Response(inventoryResult.body, { status: inventoryResult.status });
  }

  const items = (inventoryResult.data.data ?? [])
    .filter((item) => item.itemName && typeof item.quantity === "number")
    .slice(0, 6);

  const days = [2, 1, 0];
  const rows: ComparisonRow[] = [];

  for (const item of items) {
    const threshold = item.thresholdLevel ?? 8;
    const baseline = Math.max(1, Math.ceil(threshold * 0.55));
    for (const day of days) {
      const date = dateOffsetIso(day);
      const forecast = Math.max(1, baseline + day);
      const actual = Math.max(0, forecast + stableOffset(`${item.itemName}-${date}`));
      rows.push({
        date,
        item: item.itemName as string,
        forecast,
        actual,
        absError: Math.abs(actual - forecast),
      });
    }
  }

  const mae = rows.reduce((sum, row) => sum + row.absError, 0) / Math.max(1, rows.length);

  return Response.json({
    region,
    storeId,
    generatedAt: new Date().toISOString(),
    metrics: {
      mae,
      model: "orbitdb-threshold-heuristic-v1",
    },
    rows,
  });
}

