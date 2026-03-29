"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StaffDashboard() {
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>
            General staff home. Use Manager or Logistics sections below when those roles
            apply, or extend this card with shared staff tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are signed in with staff-level access on the backend.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
