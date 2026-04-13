import { describe, expect, it } from 'vitest';

import {
  dashboardRoleToOrbit,
  defaultDashboardRoleForOrbit,
  orbitRoleToDashboardRoles,
} from './orbit-role-map';
import { Role } from './roles';

describe('orbit-role-map', () => {
  it('maps Orbit admin and staff tiers to dashboard roles', () => {
    expect(orbitRoleToDashboardRoles('admin')).toEqual([Role.SuperAdmin, Role.Admin]);
    expect(orbitRoleToDashboardRoles('staff')).toEqual([Role.Staff, Role.Manager, Role.LogisticsManager]);
  });

  it('treats super admin aliases consistently', () => {
    expect(orbitRoleToDashboardRoles('superadmin')).toEqual([Role.SuperAdmin]);
    expect(defaultDashboardRoleForOrbit('superadmin')).toBe(Role.SuperAdmin);
  });

  it('maps repair role and unknown role fallbacks', () => {
    expect(orbitRoleToDashboardRoles('repair')).toEqual([Role.RepairStaff]);
    expect(defaultDashboardRoleForOrbit('repair')).toBe(Role.RepairStaff);
    expect(orbitRoleToDashboardRoles('unknown')).toEqual([Role.Customer]);
    expect(defaultDashboardRoleForOrbit(undefined)).toBe(Role.Customer);
  });

  it('maps dashboard roles to orbit role tiers', () => {
    expect(dashboardRoleToOrbit(Role.SuperAdmin)).toBe('admin');
    expect(dashboardRoleToOrbit(Role.Admin)).toBe('admin');
    expect(dashboardRoleToOrbit(Role.LogisticsManager)).toBe('staff');
    expect(dashboardRoleToOrbit(Role.Staff)).toBe('staff');
    expect(dashboardRoleToOrbit(Role.RepairStaff)).toBe('repair');
    expect(dashboardRoleToOrbit(Role.Customer)).toBe('customer');
  });
});
