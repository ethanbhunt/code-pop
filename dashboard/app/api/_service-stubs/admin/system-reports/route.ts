type RevenueTotals = {
  today: number;
  week: number;
  month: number;
};

type MaintenanceSummary = {
  totalMachines: number;
  inWarning: number;
  inError: number;
  repairsThisMonth: number;
};

type HubActivity = {
  region: string;
  online: boolean;
  pendingShipments: number;
  lastHeartbeat: string;
};

export async function GET() {
  const generatedAt = new Date().toISOString();

  const revenue: RevenueTotals = { today: 1204, week: 8240, month: 35600 };
  const maintenance: MaintenanceSummary = {
    totalMachines: 36,
    inWarning: 9,
    inError: 6,
    repairsThisMonth: 22,
  };
  const hubActivity: HubActivity[] = [
    {
      region: "Region A",
      online: true,
      pendingShipments: 2,
      lastHeartbeat: "2026-03-05T10:00:00.000Z",
    },
    {
      region: "Region B",
      online: false,
      pendingShipments: 5,
      lastHeartbeat: "2026-03-04T18:10:00.000Z",
    },
    {
      region: "Region C",
      online: true,
      pendingShipments: 1,
      lastHeartbeat: "2026-03-05T09:45:00.000Z",
    },
  ];

  return Response.json({
    generatedAt,
    metrics: {
      inventoryLowCount: 8,
      totalStores: 20,
      totalRevenueToday: revenue.today,
    },
    revenue,
    maintenance,
    hubActivity,
  });
}

