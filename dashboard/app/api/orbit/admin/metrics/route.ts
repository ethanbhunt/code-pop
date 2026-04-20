import { auth } from "@/auth";
import {
  countLowStockRows,
  fetchInventoryMergedAcrossStores,
  storeIdsFromOrbitStoresPayload,
} from "@/lib/orbit-inventory-by-store";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";
import { totalRevenueFromOrbitRevenueReportBody } from "@/lib/orbit-revenue-report";

type UsersPayload = { data?: unknown[] };

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET() {
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

  const end = new Date().toISOString();
  const start = startOfTodayIso();

  const [usersR, storesR, revR] = await Promise.all([
    orbitJson<UsersPayload>(token, "/users", { method: "GET" }),
    orbitJson<unknown>(token, "/stores?limit=200", { method: "GET" }),
    orbitJson<unknown>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
      { method: "GET" }
    ),
  ]);

  if (!usersR.ok) {
    return new Response(usersR.body, { status: usersR.status });
  }
  if (!revR.ok) {
    return new Response(revR.body, { status: revR.status });
  }

  const userCount = usersR.data.data?.length ?? 0;
  const storeIds = storeIdsFromOrbitStoresPayload(storesR.ok ? storesR.data : null);
  const items = await fetchInventoryMergedAcrossStores(
    token,
    storeIds.length ? storeIds : [1, 2, 3]
  );
  const lowCount = countLowStockRows(items);

  return Response.json({
    generatedAt: new Date().toISOString(),
    totalUsers: userCount,
    activeAccounts: userCount,
    inventoryLowCount: lowCount,
    totalRevenueToday: totalRevenueFromOrbitRevenueReportBody(revR.data),
  });
}
