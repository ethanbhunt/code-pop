import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

type UsersPayload = { data?: unknown[] };
type InventoryPayload = {
  data?: Array<{ quantity?: number; thresholdLevel?: number }>;
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
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
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const now = new Date().toISOString();
  const [usersR, invR, revToday, revWeek, revMonth] = await Promise.all([
    orbitJson<UsersPayload>(token, "/users", { method: "GET" }),
    orbitJson<InventoryPayload>(token, "/inventory", { method: "GET" }),
    orbitJson<{ totalRevenue?: number }>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfTodayIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
    orbitJson<{ totalRevenue?: number }>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfWeekIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
    orbitJson<{ totalRevenue?: number }>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfMonthIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
  ]);

  if (!usersR.ok) {
    return new Response(usersR.body, { status: usersR.status });
  }
  if (!invR.ok) {
    return new Response(invR.body, { status: invR.status });
  }
  if (!revToday.ok) {
    return new Response(revToday.body, { status: revToday.status });
  }
  if (!revWeek.ok) {
    return new Response(revWeek.body, { status: revWeek.status });
  }
  if (!revMonth.ok) {
    return new Response(revMonth.body, { status: revMonth.status });
  }

  const items = invR.data.data ?? [];
  const lowCount = items.filter(
    (i) =>
      typeof i.quantity === "number" &&
      typeof i.thresholdLevel === "number" &&
      i.quantity < i.thresholdLevel
  ).length;

  const userCount = usersR.data.data?.length ?? 0;
  const today = revToday.data.totalRevenue ?? 0;
  const week = revWeek.data.totalRevenue ?? 0;
  const month = revMonth.data.totalRevenue ?? 0;

  const generatedAt = new Date().toISOString();

  return Response.json({
    generatedAt,
    metrics: {
      inventoryLowCount: lowCount,
      totalStores: 1,
      totalRevenueToday: today,
    },
    revenue: { today, week, month },
    maintenance: {
      totalMachines: 0,
      inWarning: 0,
      inError: 0,
      repairsThisMonth: 0,
    },
    hubActivity: [
      {
        region: "Global",
        online: true,
        pendingShipments: lowCount,
        lastHeartbeat: generatedAt,
      },
    ],
    note: "Revenue and inventory/users from OrbitDB. Maintenance, hubs, and store counts are placeholders until those APIs exist.",
  });
}
