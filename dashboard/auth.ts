import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { Role } from "@/lib/roles";

/**
 * Auth.js config: validates users against codepop_backend (Django).
 *
 * Backend: POST { baseUrl }/auth/login/
 *   Body: username & password (form-urlencoded or JSON)
 *   Success (200): { token, user_id, first_name, is_admin, is_manager }
 *
 * NOTE: Your backend does not yet model fine-grained roles.
 * For now we infer a temporary role set from `is_admin` and `is_manager`.
 */
const djangoLoginUrl = process.env.DJANGO_API_URL
  ? `${process.env.DJANGO_API_URL.replace(/\/$/, "")}/auth/login/`
  : "";

const devBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    process.env.DEV_AUTH_BYPASS === "true");

const devUsername = process.env.DEV_AUTH_BYPASS_USERNAME ?? "dev";

function inferRoles(data: { is_admin?: boolean; is_manager?: boolean }): Role[] {
  // Temporary mapping until backend roles exist.
  if (data.is_admin) return [Role.SuperAdmin, Role.Admin];
  if (data.is_manager) return [Role.Manager, Role.LogisticsManager];
  return [Role.RepairStaff];
}

function coerceRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const values = Object.values(Role);
  return values.includes(value as Role) ? (value as Role) : null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        // Dev-mode bypass: when enabled, do not call Django at all.
        if (devBypassEnabled) {
          const usernameValue =
            typeof credentials?.username === "string"
              ? credentials.username
              : devUsername;
          const selected = coerceRole((credentials as { role?: unknown }).role);
          return {
            id: "dev",
            email: usernameValue,
            name: "Dev",
            roles: [selected ?? Role.RepairStaff],
          };
        }

        if (!credentials?.username || !credentials?.password || !djangoLoginUrl) {
          return null;
        }

        const body = new URLSearchParams({
          username: credentials.username as string,
          password: credentials.password as string,
        });

        const res = await fetch(djangoLoginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (!res.ok) return null;

        const data = (await res.json()) as {
          token?: string;
          user_id?: number;
          first_name?: string;
          is_admin?: boolean;
          is_manager?: boolean;
        };
        if (!data?.token || data.user_id == null) return null;

        const roles = inferRoles({ is_admin: data.is_admin, is_manager: data.is_manager });

        return {
          id: String(data.user_id),
          email: credentials.username as string,
          name: (data.first_name ?? credentials.username) as string,
          roles,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.roles = (user as unknown as { roles?: Role[] }).roles ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as unknown as { roles?: Role[] }).roles =
          (token.roles ?? []) as Role[];
      }
      return session;
    },
  },
});
