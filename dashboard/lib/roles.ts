export enum Role {
  /** Store lead (Orbit `userRole`: manager) — not logistics. */
  Manager = "Store Manager",
  Admin = "Admin",
  RepairStaff = "Repair Staff",
  LogisticsManager = "Logistics Manager",
  SuperAdmin = "Super Admin",
  Customer = "Customer",
  Staff = "Staff",
}

/** Every dashboard role — use for selects and validation (single source of truth). */
export const ALL_ROLES: readonly Role[] = [
  Role.SuperAdmin,
  Role.Admin,
  Role.LogisticsManager,
  Role.Manager,
  Role.Staff,
  Role.RepairStaff,
  Role.Customer,
] as const;

/** Roles shown when creating/editing users (distinct store vs logistics tiers). */
export const USER_MANAGEMENT_ROLES: readonly Role[] = [
  Role.SuperAdmin,
  Role.Admin,
  Role.LogisticsManager,
  Role.Manager,
  Role.Staff,
  Role.RepairStaff,
  Role.Customer,
] as const;
