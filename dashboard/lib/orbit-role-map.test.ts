import { describe, expect, it } from "vitest";

import {
  dashboardRoleToOrbit,
  defaultDashboardRoleForOrbit,
  orbitRoleToDashboardRoles,
} from "./orbit-role-map";
import { Role } from "./roles";

describe("dashboardRoleToOrbit", () => {
  it("maps admin tiers to Orbit admin", () => {
    expect(dashboardRoleToOrbit(Role.Admin)).toBe("admin");
    expect(dashboardRoleToOrbit(Role.SuperAdmin)).toBe("admin");
  });

  it("maps staff, manager, and logistics to Orbit staff", () => {
    expect(dashboardRoleToOrbit(Role.Staff)).toBe("staff");
    expect(dashboardRoleToOrbit(Role.Manager)).toBe("staff");
    expect(dashboardRoleToOrbit(Role.LogisticsManager)).toBe("staff");
  });

  it("maps repair staff to Orbit repair", () => {
    expect(dashboardRoleToOrbit(Role.RepairStaff)).toBe("repair");
  });

  it("maps customer to Orbit customer", () => {
    expect(dashboardRoleToOrbit(Role.Customer)).toBe("customer");
  });
});

describe("orbitRoleToDashboardRoles", () => {
  it("expands Orbit admin to SuperAdmin and Admin", () => {
    expect(orbitRoleToDashboardRoles("admin")).toEqual([
      Role.SuperAdmin,
      Role.Admin,
    ]);
  });

  it("expands Orbit staff to Staff, Manager, LogisticsManager", () => {
    expect(orbitRoleToDashboardRoles("staff")).toEqual([
      Role.Staff,
      Role.Manager,
      Role.LogisticsManager,
    ]);
  });

  it("maps repair to RepairStaff", () => {
    expect(orbitRoleToDashboardRoles("repair")).toEqual([Role.RepairStaff]);
  });

  it("maps superadmin to SuperAdmin", () => {
    expect(orbitRoleToDashboardRoles("superadmin")).toEqual([Role.SuperAdmin]);
  });

  it("defaults unknown roles to Customer", () => {
    expect(orbitRoleToDashboardRoles(undefined)).toEqual([Role.Customer]);
    expect(orbitRoleToDashboardRoles("")).toEqual([Role.Customer]);
    expect(orbitRoleToDashboardRoles("unknown")).toEqual([Role.Customer]);
  });

  it("is case-insensitive on Orbit role string", () => {
    expect(orbitRoleToDashboardRoles("REPAIR")).toEqual([Role.RepairStaff]);
  });
});

describe("defaultDashboardRoleForOrbit", () => {
  it("prefers SuperAdmin for admin and superadmin", () => {
    expect(defaultDashboardRoleForOrbit("admin")).toBe(Role.SuperAdmin);
    expect(defaultDashboardRoleForOrbit("superadmin")).toBe(Role.SuperAdmin);
  });

  it("uses Staff for Orbit staff", () => {
    expect(defaultDashboardRoleForOrbit("staff")).toBe(Role.Staff);
  });

  it("uses RepairStaff for Orbit repair", () => {
    expect(defaultDashboardRoleForOrbit("repair")).toBe(Role.RepairStaff);
  });

  it("defaults to Customer", () => {
    expect(defaultDashboardRoleForOrbit(undefined)).toBe(Role.Customer);
  });
});
