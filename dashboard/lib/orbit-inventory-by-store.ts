import { orbitJson } from "@/lib/orbit-fetch";

/** Rows returned from Orbit `GET /inventory?storeId=` or global list. */
export type OrbitInventoryRow = {
  inventoryId?: number;
  itemName?: string;
  itemType?: string;
  storeId?: number;
  quantity?: number;
  thresholdLevel?: number;
  minThreshold?: number;
  lastUpdated?: string;
};

function itemThreshold(i: {
  thresholdLevel?: number;
  minThreshold?: number;
}): number {
  if (typeof i.thresholdLevel === "number") return i.thresholdLevel;
  if (typeof i.minThreshold === "number") return i.minThreshold;
  return 0;
}

/** Parse `storeId` values from Orbit `GET /stores` JSON body. */
export function storeIdsFromOrbitStoresPayload(data: unknown): number[] {
  if (!data || typeof data !== "object") return [];
  const wrap = data as { data?: unknown };
  if (!Array.isArray(wrap.data)) return [];
  const ids: number[] = [];
  for (const row of wrap.data) {
    if (row && typeof row === "object" && "storeId" in row) {
      const id = Number((row as { storeId?: number }).storeId);
      if (Number.isInteger(id) && id > 0) ids.push(id);
    }
  }
  return [...new Set(ids)].sort((a, b) => a - b);
}

/**
 * Loads inventory per store and concatenates rows. Uses public store-scoped
 * `GET /inventory?storeId=` so admin global list is not required (avoids 403 when
 * that route does not attach auth).
 */
export async function fetchInventoryMergedAcrossStores(
  accessToken: string,
  storeIds: number[]
): Promise<OrbitInventoryRow[]> {
  const uniq = [...new Set(storeIds.filter((n) => Number.isInteger(n) && n > 0))].sort(
    (a, b) => a - b
  );
  const ids = uniq.length > 0 ? uniq : [1, 2, 3];
  const batches = await Promise.all(
    ids.map((storeId) =>
      orbitJson<{ data?: OrbitInventoryRow[] }>(
        accessToken,
        `/inventory?storeId=${storeId}&limit=500`,
        { method: "GET" }
      )
    )
  );
  const out: OrbitInventoryRow[] = [];
  for (const r of batches) {
    if (!r.ok) continue;
    const rows = r.data?.data;
    if (Array.isArray(rows)) out.push(...rows);
  }
  return out;
}

export function countLowStockRows(items: OrbitInventoryRow[]): number {
  return items.filter((i) => {
    if (typeof i.quantity !== "number") return false;
    const thr = itemThreshold(i);
    return thr > 0 && i.quantity < thr;
  }).length;
}
