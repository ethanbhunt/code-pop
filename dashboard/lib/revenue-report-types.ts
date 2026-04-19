/** Rows returned inside Orbit `generateRevenueReport` payload. */
export type OrbitRevenueRow = {
  revenueId?: number;
  amount?: number;
  timestamp?: string;
  orderId?: unknown;
  description?: string;
};

/** Body returned by `GET /api/orbit/revenues/report` after BFF unwrap. */
export type RevenueReportPayload = {
  totalRevenue?: number;
  transactionCount?: number;
  averageTransaction?: number;
  startDate?: string;
  endDate?: string;
  revenues?: OrbitRevenueRow[];
};
