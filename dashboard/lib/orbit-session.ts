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
