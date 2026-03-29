"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { ALL_ROLES, Role } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const devBypassEnabled =
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";
  const [devRole, setDevRole] = useState<Role>(Role.Customer);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const form = e.currentTarget;
            const formData = new FormData(form);
            const username = formData.get("username") as string;
            const password = formData.get("password") as string;
            const role = (formData.get("role") as string | null) ?? undefined;

            const result = await signIn("credentials", {
              username,
              password,
              role,
              redirect: false,
            });

            setLoading(false);
            if (result?.error) {
              setError("Invalid username or password.");
              return;
            }
            router.push(callbackUrl);
            router.refresh();
          }}
        >
          <CardContent className="flex flex-col gap-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Field>
              <FieldLabel>
                <Label htmlFor="username">Username</Label>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  required={!devBypassEnabled}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>
                <Label htmlFor="password">Password</Label>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required={!devBypassEnabled}
                />
              </FieldContent>
            </Field>

            {devBypassEnabled && (
              <Field>
                <FieldLabel>
                  <Label htmlFor="role">Dev Role</Label>
                </FieldLabel>
                <FieldContent>
                  <select
                    id="role"
                    name="role"
                    value={devRole}
                    onChange={(e) =>
                      setDevRole(e.target.value as unknown as Role)
                    }
                    className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none"
                  >
                    {ALL_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </FieldContent>
              </Field>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
