import type { NextRequest } from "next/server";

type LowStockAlert = {
  item: string;
  type: string;
  currentQty: number;
  thresholdQty: number;
  suggestedReorderQty: number;
  severity: "High" | "Medium" | "Low";
};

export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const alerts: LowStockAlert[] = [
    {
      item: "Coconut",
      type: "Add In",
      currentQty: 12,
      thresholdQty: 20,
      suggestedReorderQty: 50,
      severity: "High",
    },
    {
      item: "Dr. Pepper",
      type: "Soda",
      currentQty: 38,
      thresholdQty: 45,
      suggestedReorderQty: 35,
      severity: "Medium",
    },
    {
      item: "Vanilla",
      type: "Syrup",
      currentQty: 75,
      thresholdQty: 80,
      suggestedReorderQty: 25,
      severity: "Low",
    },
  ];

  return Response.json({
    storeId,
    generatedAt: new Date().toISOString(),
    alerts,
  });
}

