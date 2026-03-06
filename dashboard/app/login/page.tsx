"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

            const result = await signIn("credentials", {
              username,
              password,
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
                  required
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
                  required
                />
              </FieldContent>
            </Field>
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
