import type { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "Region C";
  const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `supply-schedule_${region}_store-${storeId}_${timestamp}.csv`;

  return Response.json({
    region,
    storeId,
    filename,
    mimeType: "text/csv",
    // Preview rows so the UI can render without a real file download yet.
    csvPreviewRows: [
      { date: "2026-03-10", store: `Store ${storeId}`, hub: "Hub X", item: "Dr. Pepper", qty: 30 },
      { date: "2026-03-10", store: `Store ${storeId}`, hub: "Hub X", item: "Coconut", qty: 20 },
      { date: "2026-03-11", store: `Store ${storeId}`, hub: "Hub X", item: "Dr. Pepper", qty: 25 },
    ],
    downloadUrl: null, // TODO: replace with real downloadable file endpoint later.
  });
}

