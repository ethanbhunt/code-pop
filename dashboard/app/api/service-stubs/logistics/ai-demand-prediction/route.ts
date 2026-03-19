import type { NextRequest } from "next/server";

type ForecastItem = {
  item: string;
  forecast: number;
  lower: number;
  upper: number;
};

type ForecastDay = {
  date: string; // YYYY-MM-DD
  items: ForecastItem[];
};

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "Region C";
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const horizonDays = 7;
  const generatedAt = new Date().toISOString();

  const forecast: ForecastDay[] = [
    {
      date: "2026-03-10",
      items: [
        { item: "Dr. Pepper", forecast: 42, lower: 36, upper: 49 },
        { item: "Coconut", forecast: 26, lower: 21, upper: 32 },
      ],
    },
    {
      date: "2026-03-11",
      items: [
        { item: "Dr. Pepper", forecast: 44, lower: 38, upper: 51 },
        { item: "Coconut", forecast: 25, lower: 20, upper: 31 },
      ],
    },
    {
      date: "2026-03-12",
      items: [
        { item: "Dr. Pepper", forecast: 41, lower: 35, upper: 48 },
        { item: "Coconut", forecast: 27, lower: 22, upper: 33 },
      ],
    },
  ];

  return Response.json({
    region,
    storeId,
    horizonDays,
    generatedAt,
    confidence: {
      model: "mock-scikit-learn",
      confidenceLevel: 0.9,
      methodology: "mock: forecast with safety stock",
    },
    forecast,
    safetyStockRecommendations: [
      { item: "Dr. Pepper", safetyStock: 18 },
      { item: "Coconut", safetyStock: 12 },
    ],
    reorderRecommendations: [
      { item: "Dr. Pepper", suggestedReorderQty: 30, reason: "predicted demand + safety stock" },
      { item: "Coconut", suggestedReorderQty: 20, reason: "predicted demand + safety stock" },
    ],
  });
}

