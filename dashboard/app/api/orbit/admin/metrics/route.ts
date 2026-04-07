import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

type UsersPayload = { data?: unknown[] };
type InventoryPayload = {
  data?: Array<{
    quantity?: number;
    thresholdLevel?: number;
    minThreshold?: number;
  }>;
};

function itemThreshold(i: {
  thresholdLevel?: number;
  minThreshold?: number;
}): number {
  if (typeof i.thresholdLevel === "number") return i.thresholdLevel;
  if (typeof i.minThreshold === "number") return i.minThreshold;
  return 0;
}
type RevenueReportPayload = { totalRevenue?: number };

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
      { error: "ORBITDB_API_URL is not configured" },
      { status: 503 }
    );
  }

  const end = new Date().toISOString();
  const start = startOfTodayIso();

  const [usersR, invR, revR] = await Promise.all([
    orbitJson<UsersPayload>(token, "/users", { method: "GET" }),
    orbitJson<InventoryPayload>(token, "/inventory", { method: "GET" }),
    orbitJson<RevenueReportPayload>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
      { method: "GET" }
    ),
  ]);

  if (!usersR.ok) {
    return new Response(usersR.body, { status: usersR.status });
  }
  if (!invR.ok) {
    return new Response(invR.body, { status: invR.status });
  }
  if (!revR.ok) {
    return new Response(revR.body, { status: revR.status });
  }

  const userCount = usersR.data.data?.length ?? 0;
  const items = invR.data.data ?? [];
  const lowCount = items.filter((i) => {
    if (typeof i.quantity !== "number") return false;
    const thr = itemThreshold(i);
    return thr > 0 && i.quantity < thr;
  }).length;

  return Response.json({
    generatedAt: new Date().toISOString(),
    totalUsers: userCount,
    activeAccounts: userCount,
    inventoryLowCount: lowCount,
    totalRevenueToday: revR.data.totalRevenue ?? 0,
  });
}
