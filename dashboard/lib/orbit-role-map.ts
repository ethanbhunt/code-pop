import { Role } from "@/lib/roles";

/** Prefer first non-empty string (`??` alone fails when `userRole` is `""`). */
function pickAccessString(
  userRole?: string,
  enumField?: string
): string {
  if (typeof userRole === "string" && userRole.trim() !== "") {
    return userRole.trim();
  }
  if (typeof enumField === "string" && enumField.trim() !== "") {
    return enumField.trim();
  }
  return "";
}

function normalizeOrbitTier(orbit: string | undefined): string {
  return String(orbit ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

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
  userRole:
    | "customer"
    | "staff"
    | "repair"
    | "manager"
    | "logistics_manager"
    | "admin"
    | "super_admin";
  enum:
    | "customer"
    | "staff"
    | "repair"
    | "manager"
    | "logistics_manager"
    | "admin"
    | "super_admin";
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
    case Role.LogisticsManager:
      return {
        role: "staff",
        userRole: "logistics_manager",
        enum: "logistics_manager",
      };
    case Role.Staff:
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
  const r = normalizeOrbitTier(orbit);
  if (r === "admin" || r === "super_admin" || r === "superadmin") {
    return [Role.SuperAdmin, Role.Admin];
  }
  /** Coarse Orbit tier only — prefer `dashboardRolesFromOrbitLogin` when `userRole` is present. */
  if (r === "staff") return [Role.Staff];
  if (r === "repair") return [Role.RepairStaff];
  return [Role.Customer];
}

/**
 * Build session `roles` after login when Orbit returns coarse `role` plus optional `userRole`/`enum`.
 */
export function dashboardRolesFromOrbitLogin(
  orbitRole?: string,
  userRole?: string,
  enumField?: string
): Role[] {
  const picked = pickAccessString(userRole, enumField);
  const ur = picked
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (ur === "super_admin" || ur === "superadmin") return [Role.SuperAdmin];
  if (ur === "admin") return [Role.Admin];
  if (ur === "logistics_manager") return [Role.LogisticsManager];
  if (ur === "manager") return [Role.Manager];
  if (ur === "staff") return [Role.Staff];
  if (ur === "repair") return [Role.RepairStaff];
  if (ur === "customer") return [Role.Customer];
  /** `userRole` / `enum` missing on older peers — infer from coarse Orbit `role` only. */
  const coarse = normalizeOrbitTier(orbitRole);
  if (coarse === "staff") return [Role.Staff];
  return orbitRoleToDashboardRoles(orbitRole);
}

/**
 * Collapse impossible / legacy JWT role sets: store staff or store manager must not also carry
 * `Logistics Manager` unless the user is admin-tier (who may preview everything).
 */
export function sanitizeDashboardRoles(roles: Role[]): Role[] {
  const unique = [...new Set(roles)];
  const hasLogistics = unique.includes(Role.LogisticsManager);
  const hasStoreOps =
    unique.includes(Role.Manager) || unique.includes(Role.Staff);
  const isAdminTier =
    unique.includes(Role.Admin) || unique.includes(Role.SuperAdmin);
  if (hasLogistics && hasStoreOps && !isAdminTier) {
    return unique.filter((r) => r !== Role.LogisticsManager);
  }
  return unique;
}

/** One `Role` per Orbit tier for role-picker defaults (editing users). */
export function defaultDashboardRoleForOrbit(orbit: string | undefined): Role {
  const r = normalizeOrbitTier(orbit);
  if (r === "admin" || r === "superadmin" || r === "super_admin") {
    return Role.SuperAdmin;
  }
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
  const picked = pickAccessString(userRole, enumField);
  const ur = picked.toLowerCase().replace(/\s+/g, "_");
  if (ur === "super_admin" || ur === "superadmin") return Role.SuperAdmin;
  if (ur === "admin") return Role.Admin;
  if (ur === "manager") return Role.Manager;
  if (ur === "logistics_manager") return Role.LogisticsManager;
  if (ur === "repair") return Role.RepairStaff;
  if (ur === "staff") return Role.Staff;
  return defaultDashboardRoleForOrbit(orbit);
}
