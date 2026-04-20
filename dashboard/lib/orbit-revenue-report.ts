/**
 * Orbit `GET /revenues/report` responds as `{ status: "success", data: { totalRevenue, ... } }`.
 * `orbitJson` returns that whole object as `.data` on the result.
 */
export function totalRevenueFromOrbitRevenueReportBody(root: unknown): number {
  if (!root || typeof root !== "object") return 0;
  const o = root as Record<string, unknown>;
  const inner = o.data;
  if (inner && typeof inner === "object") {
    const tr = (inner as { totalRevenue?: unknown }).totalRevenue;
    if (typeof tr === "number" && !Number.isNaN(tr)) return tr;
  }
  if (typeof o.totalRevenue === "number" && !Number.isNaN(o.totalRevenue)) return o.totalRevenue;
  return 0;
}
