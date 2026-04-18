import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import {
  getAccessToken,
  hasOrbitAdminDashboardRole,
  hasOrbitLogisticsDashboardRole,
  hasOrbitManagerDashboardRole,
  hasOrbitRepairDashboardRole,
  hasOrbitStaffDashboardRole,
  hasSuperAdminDashboardRole,
} from "./orbit-session";
import { Role } from "./roles";

function sessionWith(
  partial: Partial<NonNullable<Session["user"]>>
): Session {
  return {
    expires: "2099-01-01",
    user: {
      id: "1",
      email: "u@example.com",
      roles: [],
      ...partial,
    },
  };
}

describe("getAccessToken", () => {
  it("returns null when session is null", () => {
    expect(getAccessToken(null)).toBeNull();
  });

  it("returns null when accessToken is missing or empty", () => {
    expect(getAccessToken(sessionWith({}))).toBeNull();
    expect(getAccessToken(sessionWith({ accessToken: "" }))).toBeNull();
  });

  it("returns the token string when set", () => {
    expect(getAccessToken(sessionWith({ accessToken: "orbit-token" }))).toBe(
      "orbit-token"
    );
  });
});

describe("hasSuperAdminDashboardRole", () => {
  it("is true only for SuperAdmin role", () => {
    expect(hasSuperAdminDashboardRole(null)).toBe(false);
    expect(
      hasSuperAdminDashboardRole(sessionWith({ roles: [Role.Admin] }))
    ).toBe(false);
    expect(
      hasSuperAdminDashboardRole(sessionWith({ roles: [Role.SuperAdmin] }))
    ).toBe(true);
  });
});

describe("hasOrbitAdminDashboardRole", () => {
  it("includes Admin and SuperAdmin", () => {
    expect(
      hasOrbitAdminDashboardRole(sessionWith({ roles: [Role.Admin] }))
    ).toBe(true);
    expect(
      hasOrbitAdminDashboardRole(sessionWith({ roles: [Role.SuperAdmin] }))
    ).toBe(true);
    expect(
      hasOrbitAdminDashboardRole(sessionWith({ roles: [Role.Manager] }))
    ).toBe(false);
  });
});

describe("hasOrbitStaffDashboardRole", () => {
  it("allows repair, staff, manager, logistics, admin, and superadmin", () => {
    const allowed = [
      Role.RepairStaff,
      Role.Staff,
      Role.Manager,
      Role.LogisticsManager,
      Role.Admin,
      Role.SuperAdmin,
    ];
    for (const r of allowed) {
      expect(hasOrbitStaffDashboardRole(sessionWith({ roles: [r] }))).toBe(
        true
      );
    }
  });

  it("denies customer-only sessions for staff BFF routes", () => {
    expect(
      hasOrbitStaffDashboardRole(sessionWith({ roles: [Role.Customer] }))
    ).toBe(false);
  });
});

describe("hasOrbitManagerDashboardRole", () => {
  it("allows manager, logistics, admin, superadmin", () => {
    expect(
      hasOrbitManagerDashboardRole(sessionWith({ roles: [Role.Manager] }))
    ).toBe(true);
    expect(
      hasOrbitManagerDashboardRole(
        sessionWith({ roles: [Role.LogisticsManager] })
      )
    ).toBe(true);
  });

  it("denies staff and repair for manager-tier gates", () => {
    expect(
      hasOrbitManagerDashboardRole(sessionWith({ roles: [Role.Staff] }))
    ).toBe(false);
    expect(
      hasOrbitManagerDashboardRole(sessionWith({ roles: [Role.RepairStaff] }))
    ).toBe(false);
  });
});

describe("hasOrbitLogisticsDashboardRole", () => {
  it("matches manager dashboard role", () => {
    expect(
      hasOrbitLogisticsDashboardRole(sessionWith({ roles: [Role.Manager] }))
    ).toBe(true);
    expect(
      hasOrbitLogisticsDashboardRole(sessionWith({ roles: [Role.Staff] }))
    ).toBe(false);
  });
});

describe("hasOrbitRepairDashboardRole", () => {
  it("allows RepairStaff and admins", () => {
    expect(
      hasOrbitRepairDashboardRole(sessionWith({ roles: [Role.RepairStaff] }))
    ).toBe(true);
    expect(
      hasOrbitRepairDashboardRole(sessionWith({ roles: [Role.Admin] }))
    ).toBe(true);
  });

  it("denies manager-only sessions", () => {
    expect(
      hasOrbitRepairDashboardRole(sessionWith({ roles: [Role.Manager] }))
    ).toBe(false);
  });
});
