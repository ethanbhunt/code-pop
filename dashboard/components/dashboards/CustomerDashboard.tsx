"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function CustomerDashboard() {
  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer</CardTitle>
          <CardDescription>
            Account home for customer-tier users. Orders, favorites, and menu appear here when
            available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are signed in with a customer role. Use the mobile app or future web
            flows for ordering.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
