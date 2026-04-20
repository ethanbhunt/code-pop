import type { OrbitRevenueRow } from "@/lib/revenue-report-types";

export type DailyRevenuePoint = {
  /** ISO date `YYYY-MM-DD` (UTC). */
  key: string;
  /** Short label for axis (e.g. `3/15`). */
  shortLabel: string;
  amount: number;
};

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * One row per calendar day in `[rangeStart, rangeEnd]` (UTC), summing `amount` by day.
 */
export function dailyRevenueSeries(
  revenues: OrbitRevenueRow[],
  rangeStart: Date,
  rangeEnd: Date
): DailyRevenuePoint[] {
  const byDay = new Map<string, number>();
  for (const r of revenues) {
    if (typeof r.amount !== "number" || Number.isNaN(r.amount)) continue;
    if (!r.timestamp || typeof r.timestamp !== "string") continue;
    const t = new Date(r.timestamp).getTime();
    if (Number.isNaN(t)) continue;
    const key = utcDayKey(new Date(t));
    byDay.set(key, (byDay.get(key) ?? 0) + r.amount);
  }

  const out: DailyRevenuePoint[] = [];
  const cur = new Date(rangeStart);
  cur.setUTCHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setUTCHours(23, 59, 59, 999);

  while (cur.getTime() <= end.getTime()) {
    const key = utcDayKey(cur);
    const m = cur.getUTCMonth() + 1;
    const day = cur.getUTCDate();
    out.push({
      key,
      shortLabel: `${m}/${day}`,
      amount: byDay.get(key) ?? 0,
    });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
