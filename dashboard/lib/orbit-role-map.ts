import { Role } from "@/lib/roles";

/**
 * OrbitDB persists `customer` | `staff` | `admin`. Map to/from `Role` for UI.
 */
export function dashboardRoleToOrbit(role: Role): "customer" | "staff" | "admin" {
  switch (role) {
    case Role.SuperAdmin:
    case Role.Admin:
      return "admin";
    case Role.LogisticsManager:
    case Role.Manager:
    case Role.Staff:
      return "staff";
    case Role.Customer:
    case Role.RepairStaff:
    default:
      return "customer";
  }
}

/** JWT / session roles for a user after login (mirrors dashboard permission tiers). */
export function orbitRoleToDashboardRoles(orbit: string | undefined): Role[] {
  const r = (orbit ?? "").toLowerCase();
  if (r === "admin") return [Role.SuperAdmin, Role.Admin];
  if (r === "staff") return [Role.Staff, Role.Manager, Role.LogisticsManager];
  if (r === "superadmin") return [Role.SuperAdmin];
  return [Role.Customer];
}

/** One `Role` per Orbit tier for role-picker defaults (editing users). */
export function defaultDashboardRoleForOrbit(orbit: string | undefined): Role {
  const r = (orbit ?? "").toLowerCase();
  if (r === "admin" || r === "superadmin") return Role.SuperAdmin;
  if (r === "staff") return Role.Staff;
  return Role.Customer;
}
