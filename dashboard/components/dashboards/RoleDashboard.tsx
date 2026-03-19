import type { Role } from "@/lib/roles";
import { Role as RoleEnum } from "@/lib/roles";
import type { ReactNode } from "react";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { LogisticsManagerDashboard } from "@/components/dashboards/LogisticsManagerDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { RepairStaffDashboard } from "@/components/dashboards/RepairStaffDashboard";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";

const precedence: RoleEnum[] = [
  RoleEnum.SuperAdmin,
  RoleEnum.Admin,
  RoleEnum.LogisticsManager,
  RoleEnum.Manager,
  RoleEnum.RepairStaff,
];

export function RoleDashboard({ roles }: { roles: Role[] }) {
  const roleSet = new Set(roles);

  if (roles.length === 0) {
    return (
      <div className="mt-6 rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          No role dashboard available for this user.
        </p>
      </div>
    );
  }

  const modules: ReactNode[] = [];
  for (const role of precedence) {
    if (roleSet.has(role)) {
      switch (role) {
        case RoleEnum.SuperAdmin:
          modules.push(<SuperAdminDashboard key={role} />);
          break;
        case RoleEnum.Admin:
          modules.push(<AdminDashboard key={role} />);
          break;
        case RoleEnum.LogisticsManager:
          modules.push(<LogisticsManagerDashboard key={role} />);
          break;
        case RoleEnum.Manager:
          modules.push(<ManagerDashboard key={role} />);
          break;
        case RoleEnum.RepairStaff:
          modules.push(<RepairStaffDashboard key={role} />);
          break;
      }
    }
  }

  return <div className="mt-6 space-y-6">{modules}</div>;
}

