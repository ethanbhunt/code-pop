import { describe, expect, it } from 'vitest';

import {
  getAccessToken,
  hasOrbitAdminDashboardRole,
  hasOrbitLogisticsDashboardRole,
  hasOrbitManagerDashboardRole,
  hasOrbitRepairDashboardRole,
  hasOrbitStaffDashboardRole,
  hasSuperAdminDashboardRole,
} from './orbit-session';
import { Role } from './roles';

const makeSession = (roles: Role[] = [], accessToken = 'token-1') => ({
  user: {
    roles,
    accessToken,
  },
});

describe('orbit-session role guards', () => {
  it('returns null when access token is missing or empty', () => {
    expect(getAccessToken(null as never)).toBeNull();
    expect(getAccessToken({ user: { accessToken: '' } } as never)).toBeNull();
  });

  it('returns access token when available', () => {
    expect(getAccessToken(makeSession([Role.Customer], 'abc') as never)).toBe('abc');
  });

  it('identifies admin and super admin permissions', () => {
    expect(hasOrbitAdminDashboardRole(makeSession([Role.Admin]) as never)).toBe(true);
    expect(hasOrbitAdminDashboardRole(makeSession([Role.SuperAdmin]) as never)).toBe(true);
    expect(hasOrbitAdminDashboardRole(makeSession([Role.Manager]) as never)).toBe(false);

    expect(hasSuperAdminDashboardRole(makeSession([Role.SuperAdmin]) as never)).toBe(true);
    expect(hasSuperAdminDashboardRole(makeSession([Role.Admin]) as never)).toBe(false);
  });

  it('identifies manager/logistics permissions', () => {
    expect(hasOrbitManagerDashboardRole(makeSession([Role.Manager]) as never)).toBe(true);
    expect(hasOrbitManagerDashboardRole(makeSession([Role.LogisticsManager]) as never)).toBe(true);
    expect(hasOrbitManagerDashboardRole(makeSession([Role.Staff]) as never)).toBe(false);

    expect(hasOrbitLogisticsDashboardRole(makeSession([Role.Admin]) as never)).toBe(true);
  });

  it('identifies staff and repair permissions', () => {
    expect(hasOrbitStaffDashboardRole(makeSession([Role.RepairStaff]) as never)).toBe(true);
    expect(hasOrbitStaffDashboardRole(makeSession([Role.Staff]) as never)).toBe(true);
    expect(hasOrbitStaffDashboardRole(makeSession([Role.Customer]) as never)).toBe(false);

    expect(hasOrbitRepairDashboardRole(makeSession([Role.RepairStaff]) as never)).toBe(true);
    expect(hasOrbitRepairDashboardRole(makeSession([Role.Admin]) as never)).toBe(true);
    expect(hasOrbitRepairDashboardRole(makeSession([Role.Customer]) as never)).toBe(false);
  });
});
