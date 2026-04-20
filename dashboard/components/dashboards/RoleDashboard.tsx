import type { Role } from "@/lib/roles";
import { Role as RoleEnum } from "@/lib/roles";
import type { ReactNode } from "react";
import { AdminDashboard } from "@/components/dashboards/AdminDashboard";
import { LogisticsManagerDashboard } from "@/components/dashboards/LogisticsManagerDashboard";
import { ManagerDashboard } from "@/components/dashboards/ManagerDashboard";
import { CustomerDashboard } from "@/components/dashboards/CustomerDashboard";
import { RepairStaffDashboard } from "@/components/dashboards/RepairStaffDashboard";
import { SuperAdminDashboard } from "@/components/dashboards/SuperAdminDashboard";

/** Store-facing dashboards before logistics so manager/staff users see the right home first. */
const precedence: RoleEnum[] = [
  RoleEnum.SuperAdmin,
  RoleEnum.Admin,
  RoleEnum.Manager,
  RoleEnum.Staff,
  RoleEnum.LogisticsManager,
  RoleEnum.RepairStaff,
  RoleEnum.Customer,
];

function previewDashboard(preview: string): ReactNode | null {
  const key = `preview-${preview}`;
  switch (preview.toLowerCase()) {
    case "admin":
      return <AdminDashboard key={key} />;
    case "manager":
    case "staff":
      return <ManagerDashboard key={key} />;
    case "logistics":
      return <LogisticsManagerDashboard key={key} />;
    case "repair":
      return <RepairStaffDashboard key={key} />;
    default:
      return null;
  }
}

export function RoleDashboard({
  roles,
  preview,
}: {
  roles: Role[];
  preview?: string;
}) {
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

  const showPreview =
    Boolean(preview?.trim()) && roleSet.has(RoleEnum.SuperAdmin);
  const previewNode = showPreview ? previewDashboard(preview!.trim()) : null;

  const modules: ReactNode[] = [];
  let storeManagerStaffDashboardRendered = false;
  for (const role of precedence) {
    if (!roleSet.has(role)) continue;
    if (role === RoleEnum.Manager || role === RoleEnum.Staff) {
      if (!storeManagerStaffDashboardRendered) {
        modules.push(<ManagerDashboard key="store-manager-staff" />);
        storeManagerStaffDashboardRendered = true;
      }
      continue;
    }
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
      case RoleEnum.RepairStaff:
        modules.push(<RepairStaffDashboard key={role} />);
        break;
      case RoleEnum.Customer:
        modules.push(<CustomerDashboard key={role} />);
        break;
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {previewNode ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-muted/20 p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            UI preview from <code className="text-xs">?preview=…</code>. Navigation only—your signed-in
            session still controls what you can access.
          </p>
          {previewNode}
        </div>
      ) : null}
      <div className="space-y-6">{modules}</div>
    </div>
  );
}

