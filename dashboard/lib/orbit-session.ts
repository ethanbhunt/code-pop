import type { Session } from "next-auth";

import { Role } from "@/lib/roles";

export function getAccessToken(session: Session | null): string | null {
  const token = session?.user?.accessToken;
  return typeof token === "string" && token.length > 0 ? token : null;
}

/** Matches OrbitDB `requireAdmin` (role string `admin`). */
export function hasOrbitAdminDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return roles.includes(Role.Admin) || roles.includes(Role.SuperAdmin);
}

/** Create users and change other users' roles (dashboard Super Admin). */
export function hasSuperAdminDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return roles.includes(Role.SuperAdmin);
}

/** Staff-facing features (inventory reads, low-stock); Orbit uses `staff` or higher. */
export function hasOrbitStaffDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return (
    roles.includes(Role.RepairStaff) ||
    roles.includes(Role.Staff) ||
    roles.includes(Role.Manager) ||
    roles.includes(Role.LogisticsManager) ||
    roles.includes(Role.Admin) ||
    roles.includes(Role.SuperAdmin)
  );
}

/** Store managers, logistics, and admins — mirrors Orbit `requireManager` callers. */
export function hasOrbitManagerDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return (
    roles.includes(Role.Manager) ||
    roles.includes(Role.LogisticsManager) ||
    roles.includes(Role.Admin) ||
    roles.includes(Role.SuperAdmin)
  );
}

/** Logistics transfers / delivery assignments — logistics lead or admins only. */
export function hasOrbitLogisticsDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return (
    roles.includes(Role.LogisticsManager) ||
    roles.includes(Role.Admin) ||
    roles.includes(Role.SuperAdmin)
  );
}

/** Aggregate revenue report (`GET /revenues/report`) — store ops + logistics + admins. */
export function hasOrbitRevenueReportDashboardRole(
  session: Session | null
): boolean {
  const roles = session?.user?.roles ?? [];
  return (
    hasOrbitAdminDashboardRole(session) ||
    roles.includes(Role.Manager) ||
    roles.includes(Role.Staff) ||
    roles.includes(Role.LogisticsManager)
  );
}

/** Repair store-scoped machines list (`/maintenance/assignments/me`); admins may preview the same proxy. */
export function hasOrbitRepairDashboardRole(session: Session | null): boolean {
  const roles = session?.user?.roles ?? [];
  return roles.includes(Role.RepairStaff) || hasOrbitAdminDashboardRole(session);
}
