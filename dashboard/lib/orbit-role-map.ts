import { Role } from "@/lib/roles";

/**
 * OrbitDB persists `customer` | `staff` | `admin` | `repair`. Map to/from `Role` for UI.
 */
export function dashboardRoleToOrbit(
  role: Role
): "customer" | "staff" | "admin" | "repair" {
  switch (role) {
    case Role.SuperAdmin:
    case Role.Admin:
      return "admin";
    case Role.LogisticsManager:
    case Role.Manager:
    case Role.Staff:
      return "staff";
    case Role.RepairStaff:
      return "repair";
    case Role.Customer:
    default:
      return "customer";
  }
}

type OrbitAccessPayload = {
  role: "customer" | "staff" | "admin" | "repair";
  userRole: "customer" | "staff" | "repair" | "manager" | "admin" | "super_admin";
  enum: "customer" | "staff" | "repair" | "manager" | "admin" | "super_admin";
};

/**
 * Persist Orbit role plus access fields so manager/admin picks survive a reload.
 * Orbit `role` stays coarse; `userRole`/`enum` carry the finer dashboard intent.
 */
export function dashboardRoleToOrbitAccess(role: Role): OrbitAccessPayload {
  switch (role) {
    case Role.SuperAdmin:
      return { role: "admin", userRole: "super_admin", enum: "super_admin" };
    case Role.Admin:
      return { role: "admin", userRole: "admin", enum: "admin" };
    case Role.Manager:
      return { role: "staff", userRole: "manager", enum: "manager" };
    case Role.Staff:
    case Role.LogisticsManager:
      return { role: "staff", userRole: "staff", enum: "staff" };
    case Role.RepairStaff:
      return { role: "repair", userRole: "repair", enum: "repair" };
    case Role.Customer:
    default:
      return { role: "customer", userRole: "customer", enum: "customer" };
  }
}

/** JWT / session roles for a user after login (mirrors dashboard permission tiers). */
export function orbitRoleToDashboardRoles(orbit: string | undefined): Role[] {
  const r = (orbit ?? "").toLowerCase();
  if (r === "admin") return [Role.SuperAdmin, Role.Admin];
  if (r === "staff") return [Role.Staff, Role.Manager, Role.LogisticsManager];
  if (r === "repair") return [Role.RepairStaff];
  if (r === "superadmin") return [Role.SuperAdmin];
  return [Role.Customer];
}

/** One `Role` per Orbit tier for role-picker defaults (editing users). */
export function defaultDashboardRoleForOrbit(orbit: string | undefined): Role {
  const r = (orbit ?? "").toLowerCase();
  if (r === "admin" || r === "superadmin") return Role.SuperAdmin;
  if (r === "staff") return Role.Staff;
  if (r === "repair") return Role.RepairStaff;
  return Role.Customer;
}

/**
 * Choose picker default from Orbit role + optional userRole/enum details.
 */
export function defaultDashboardRoleForOrbitAccess(
  orbit: string | undefined,
  userRole?: string,
  enumField?: string
): Role {
  const ur = (userRole ?? enumField ?? "").toLowerCase();
  if (ur === "super_admin" || ur === "superadmin") return Role.SuperAdmin;
  if (ur === "admin") return Role.Admin;
  if (ur === "manager") return Role.Manager;
  if (ur === "repair") return Role.RepairStaff;
  if (ur === "staff") return Role.Staff;
  return defaultDashboardRoleForOrbit(orbit);
}
