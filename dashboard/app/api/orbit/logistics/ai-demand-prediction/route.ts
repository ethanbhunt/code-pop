import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type ForecastItem = {
	item: string;
	forecast: number;
	lower: number;
	upper: number;
};

type ForecastDay = {
	date: string;
	items: ForecastItem[];
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
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
	const region = req.nextUrl.searchParams.get("region") ?? "Region C";
	const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";
	const horizonDays = 7;
	const generatedAt = new Date().toISOString();

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

	const liveItems = (inventoryResult.data.data ?? [])
		.filter((item) => item.itemName && typeof item.quantity === "number")
		.sort((a, b) => {
			const qa = a.quantity ?? 0;
			const qb = b.quantity ?? 0;
			return qa - qb;
		})
		.slice(0, 8);

	const forecast: ForecastDay[] = [0, 1, 2].map((dayOffset) => {
		const dayFactor = 1 + dayOffset * 0.04;
		return {
			date: dateOffsetIso(dayOffset),
			items: liveItems.map((item) => {
				const threshold = item.thresholdLevel ?? 8;
				const quantity = item.quantity ?? 0;
				const base = Math.max(1, Math.ceil(threshold * 0.5));
				const pressure = quantity < threshold ? 2 : 0;
				const demand = Math.max(1, Math.round((base + pressure) * dayFactor));
				const spread = Math.max(1, Math.round(demand * 0.15));

				return {
					item: item.itemName as string,
					forecast: demand,
					lower: Math.max(0, demand - spread),
					upper: demand + spread,
				};
			}),
		};
	});

	const safetyStockRecommendations = liveItems.map((item) => {
		const threshold = item.thresholdLevel ?? 8;
		return {
			item: item.itemName as string,
			safetyStock: threshold + Math.ceil(threshold * 0.4),
		};
	});

	const reorderRecommendations = liveItems.map((item) => {
		const threshold = item.thresholdLevel ?? 8;
		const quantity = item.quantity ?? 0;
		const projectedDemand = Math.max(1, Math.ceil(threshold * 0.6)) * horizonDays;
		const target = threshold + projectedDemand;
		return {
			item: item.itemName as string,
			suggestedReorderQty: Math.max(0, target - quantity),
			reason: "live inventory thresholds + projected short-horizon demand",
		};
	});

	return Response.json({
		region,
		storeId,
		horizonDays,
		generatedAt,
		confidence: {
			model: "orbitdb-threshold-heuristic-v1",
			confidenceLevel: 0.72,
			methodology: "Inventory-aware demand heuristic from OrbitDB levels and thresholds",
		},
		forecast,
		safetyStockRecommendations,
		reorderRecommendations,
	});
}
