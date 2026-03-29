import type { NextRequest } from "next/server";

type ComparisonRow = {
  date: string;
  item: string;
  forecast: number;
  actual: number;
  absError: number;
};

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "Region C";
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const rows: ComparisonRow[] = [
    { date: "2026-03-10", item: "Dr. Pepper", forecast: 42, actual: 45, absError: 3 },
    { date: "2026-03-10", item: "Coconut", forecast: 26, actual: 24, absError: 2 },
    { date: "2026-03-11", item: "Dr. Pepper", forecast: 44, actual: 40, absError: 4 },
    { date: "2026-03-11", item: "Coconut", forecast: 25, actual: 27, absError: 2 },
    { date: "2026-03-12", item: "Dr. Pepper", forecast: 41, actual: 43, absError: 2 },
    { date: "2026-03-12", item: "Coconut", forecast: 27, actual: 28, absError: 1 },
  ];

  const mae =
    rows.reduce((sum, r) => sum + r.absError, 0) / Math.max(1, rows.length);

  return Response.json({
    region,
    storeId,
    generatedAt: new Date().toISOString(),
    metrics: {
      mae,
      model: "mock-scikit-learn",
    },
    rows,
  });
}

