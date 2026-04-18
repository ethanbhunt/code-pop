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

type MachineRow = { status?: string };
type TransferRow = {
  sourceStoreId?: number;
  destStoreId?: number;
  status?: string;
};
type StoreRow = { storeId: number; region?: string };

function orbitInnerDataArray<T>(res: {
  ok: boolean;
  data?: unknown;
}): T[] {
  if (!res.ok || res.data == null || typeof res.data !== "object") return [];
  const wrap = res.data as { data?: unknown };
  if (Array.isArray(wrap.data)) return wrap.data as T[];
  return [];
}

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

  type MultiStorePayload = {
    aggregates?: { storeCount?: number; totalRevenue?: number; totalOrders?: number };
  };
  const now = new Date().toISOString();
  const [
    usersR,
    revToday,
    revWeek,
    revMonth,
    multiStoreR,
    machR,
    transR,
    storesR,
  ] = await Promise.all([
    orbitJson<UsersPayload>(token, "/users", { method: "GET" }),
    orbitJson<unknown>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfTodayIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
    orbitJson<unknown>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfWeekIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
    orbitJson<unknown>(
      token,
      `/revenues/report?startDate=${encodeURIComponent(startOfMonthIso())}&endDate=${encodeURIComponent(now)}`,
      { method: "GET" }
    ),
    orbitJson<MultiStorePayload>(token, "/admin/system-reports/multi-store", {
      method: "GET",
    }),
    orbitJson<unknown>(token, "/maintenance/machines?limit=200", { method: "GET" }),
    orbitJson<unknown>(token, "/logistics/transfers?limit=200", { method: "GET" }),
    orbitJson<unknown>(token, "/stores?limit=200", { method: "GET" }),
  ]);

  if (!usersR.ok) {
    return new Response(usersR.body, { status: usersR.status });
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

  const storesList = orbitInnerDataArray<StoreRow>(storesR);
  const storeIds = storeIdsFromOrbitStoresPayload(storesR.ok ? storesR.data : null);
  const inventoryRows = await fetchInventoryMergedAcrossStores(
    token,
    storeIds.length ? storeIds : [1, 2, 3]
  );
  const lowCount = countLowStockRows(inventoryRows);

  const machines = orbitInnerDataArray<MachineRow>(machR);
  const transfers = orbitInnerDataArray<TransferRow>(transR);

  const inWarning = machines.filter(
    (m) => String(m.status ?? "").toLowerCase() === "warning"
  ).length;
  const inError = machines.filter((m) => {
    const s = String(m.status ?? "").toLowerCase();
    return s === "error" || s === "out-of-order";
  }).length;

  const pendingStatuses = new Set(["pending", "approved", "in_transit"]);
  const pendingTransfers = transfers.filter((t) =>
    pendingStatuses.has(String(t.status ?? "").toLowerCase())
  );

  const generatedAt = new Date().toISOString();

  const REGION_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;
  function storeTouchesRegion(storeId: number, letter: string): boolean {
    const s = storesList.find((x) => x.storeId === storeId);
    if (!s?.region) return false;
    const r = s.region.toUpperCase();
    return r.includes(letter) || r.includes(`REGION ${letter}`);
  }
  const hubActivity = REGION_LETTERS.map((letter) => {
    const pending = pendingTransfers.filter(
      (t) =>
        (t.sourceStoreId != null && storeTouchesRegion(t.sourceStoreId, letter)) ||
        (t.destStoreId != null && storeTouchesRegion(t.destStoreId, letter))
    ).length;
    return {
      region: `Region ${letter}`,
      online: true,
      pendingShipments: pending,
      lastHeartbeat: generatedAt,
    };
  });

  const today = totalRevenueFromOrbitRevenueReportBody(revToday.data);
  const week = totalRevenueFromOrbitRevenueReportBody(revWeek.data);
  const month = totalRevenueFromOrbitRevenueReportBody(revMonth.data);
  const multiBody = multiStoreR.ok ? multiStoreR.data : null;
  const multiInner =
    multiBody &&
    typeof multiBody === "object" &&
    multiBody !== null &&
    "data" in multiBody &&
    (multiBody as { data: MultiStorePayload }).data != null
      ? (multiBody as { data: MultiStorePayload }).data
      : (multiBody as MultiStorePayload | null);
  const storeCountFromMulti =
    multiInner?.aggregates?.storeCount != null ? multiInner.aggregates.storeCount : null;
  const totalRevenueLast30Days =
    multiInner?.aggregates?.totalRevenue != null &&
    typeof multiInner.aggregates.totalRevenue === "number"
      ? multiInner.aggregates.totalRevenue
      : undefined;

  const useHubRows =
    hubActivity.some((h) => h.pendingShipments > 0) || storesList.length > 0;
  const hubActivityOut = useHubRows
    ? hubActivity
    : [
        {
          region: "All regions (aggregate)",
          online: true,
          pendingShipments: pendingTransfers.length,
          lastHeartbeat: generatedAt,
        },
      ];

  return Response.json({
    generatedAt,
    metrics: {
      inventoryLowCount: lowCount,
      totalStores: storeCountFromMulti ?? (storesList.length > 0 ? storesList.length : 1),
      totalRevenueToday: today,
      totalRevenueLast30Days,
    },
    revenue: { today, week, month },
    maintenance: {
      totalMachines: machines.length,
      inWarning,
      inError,
      repairsThisMonth: 0,
    },
    hubActivity: hubActivityOut,
    note:
      machines.length > 0 || pendingTransfers.length > 0
        ? "Revenue, inventory, users, store counts, maintenance machines, and regional transfer activity from Orbit when authorized."
        : storeCountFromMulti != null
          ? "Revenue and inventory/users from OrbitDB; store count from multi-store report. Maintenance/transfers returned no rows or were not permitted."
          : "Revenue and inventory/users from OrbitDB; maintenance, transfers, and store list are best-effort.",
  });
}
