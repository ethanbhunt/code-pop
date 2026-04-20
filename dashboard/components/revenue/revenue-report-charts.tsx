"use client";

import { useState } from "react";

import type { DailyRevenuePoint } from "@/lib/revenue-buckets";

type RevenueReportChartsProps = {
  series: DailyRevenuePoint[];
  totalRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  loading?: boolean;
};

function formatMoney(n: number): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function RevenueReportCharts({
  series,
  totalRevenue,
  transactionCount,
  averageTransaction,
  loading,
}: RevenueReportChartsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const max =
    series.length === 0 ? 1 : Math.max(...series.map((s) => s.amount), 1);
  const linePoints =
    series.length === 0
      ? ""
      : series.length === 1
        ? (() => {
            const y = 40 - (series[0].amount / max) * 36;
            return `0,${y} 100,${y}`;
          })()
        : series
            .map((s, i) => {
              const x = (i / (series.length - 1)) * 100;
              const y = 40 - (s.amount / max) * 36;
              return `${x},${y}`;
            })
            .join(" ");

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-md bg-muted" />
          ))}
        </div>
        <div className="h-36 rounded-md bg-muted" />
        <div className="h-24 rounded-md bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Total (period)</p>
          <p className="text-lg font-semibold tabular-nums">${formatMoney(totalRevenue)}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-lg font-semibold tabular-nums">{transactionCount}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Avg. ticket</p>
          <p className="text-lg font-semibold tabular-nums">${formatMoney(averageTransaction)}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Daily revenue</p>
        <div
          className="relative rounded-md border bg-muted/10 px-1 py-2"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {hoveredIndex != null && series[hoveredIndex] != null ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-1 z-20 flex justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-md">
                <span className="font-medium tabular-nums">{series[hoveredIndex].key}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="tabular-nums">${formatMoney(series[hoveredIndex].amount)}</span>
              </div>
            </div>
          ) : null}
          <div
            className="flex h-40 items-stretch gap-px"
            role="img"
            aria-label="Bar chart of daily revenue"
          >
            {series.map((d, i) => {
              const pct = max > 0 ? (d.amount / max) * 100 : 0;
              const barH = d.amount > 0 && pct < 6 ? 6 : pct;
              const active = hoveredIndex === i;
              return (
                <button
                  key={d.key}
                  type="button"
                  className="flex min-h-0 min-w-0 flex-1 cursor-crosshair flex-col justify-end border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onFocus={() => setHoveredIndex(i)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setHoveredIndex(null);
                    }
                  }}
                  aria-label={`${d.key}, ${formatMoney(d.amount)} dollars`}
                >
                  <span
                    className={`w-full rounded-t-sm transition-colors ${
                      active ? "bg-primary" : "bg-primary/85"
                    }`}
                    style={{ height: `${barH}%` }}
                  />
                </button>
              );
            })}
          </div>
        </div>
        {series.length > 14 ? (
          <p className="mt-5 text-center text-[10px] text-muted-foreground sm:mt-4">
            Point at a day for date and amount · {series.length} days
          </p>
        ) : (
          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            {series.length} days
          </p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Trend</p>
        <div className="rounded-md border bg-muted/10 p-2">
          <svg
            viewBox="0 0 100 40"
            className="h-28 w-full text-primary"
            preserveAspectRatio="none"
            role="img"
            aria-label="Line chart of daily revenue trend"
          >
            {linePoints ? (
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                points={linePoints}
              />
            ) : null}
          </svg>
        </div>
      </div>
    </div>
  );
}
