import { describe, expect, it } from 'vitest';

import { defaultDashboardRoleForOrbit, orbitRoleToDashboardRoles } from './orbit-role-map';
import { Role } from './roles';

describe('orbit-role-map', () => {
  it('maps Orbit admin and staff tiers to dashboard roles', () => {
    expect(orbitRoleToDashboardRoles('admin')).toEqual([Role.SuperAdmin, Role.Admin]);
    expect(orbitRoleToDashboardRoles('staff')).toEqual([Role.Staff, Role.Manager, Role.LogisticsManager]);
  });

  it('treats super admin aliases consistently', () => {
    expect(orbitRoleToDashboardRoles('super_admin')).toEqual([Role.SuperAdmin]);
    expect(defaultDashboardRoleForOrbit('superadmin')).toBe(Role.SuperAdmin);
    expect(defaultDashboardRoleForOrbit('super_admin')).toBe(Role.SuperAdmin);
  });

  it('falls back to customer for unknown orbit roles', () => {
    expect(orbitRoleToDashboardRoles('repair')).toEqual([Role.Customer]);
    expect(defaultDashboardRoleForOrbit('repair')).toBe(Role.Customer);
  });
});
