import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { Role } from "@/lib/roles";
import { orbitRoleToDashboardRoles } from "@/lib/orbit-role-map";

/**
 * Auth.js config: validates users against codepop_backend/orbitdb REST API.
 *
 * Backend: POST { baseUrl }/auth/login
 *   Body: JSON { username, password }
 *   Success (200): { status: "authenticated", data: { userId, username, email,
 *     firstName, lastName, role, token } }
 *
 * API auth header for protected routes: Authorization: Token {token}
 *
 * OrbitDB roles map to dashboard `Role` via `orbitRoleToDashboardRoles`.
 */
const orbitDbBaseUrl = (
  process.env.ORBITDB_API_URL ?? process.env.DJANGO_API_URL
)?.replace(/\/$/, "");

const orbitDbLoginUrl = orbitDbBaseUrl ? `${orbitDbBaseUrl}/auth/login` : "";

const devBypassEnabled =
  process.env.NODE_ENV !== "production" &&
  (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true" ||
    process.env.DEV_AUTH_BYPASS === "true");

const devUsername = process.env.DEV_AUTH_BYPASS_USERNAME ?? "dev";

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
            roles: [selected ?? Role.Customer],
          };
        }

        if (!credentials?.username || !credentials?.password || !orbitDbLoginUrl) {
          return null;
        }

        const res = await fetch(orbitDbLoginUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: credentials.username as string,
            password: credentials.password as string,
          }),
        });

        if (!res.ok) return null;

        const payload = (await res.json()) as {
          status?: string;
          data?: {
            userId?: number;
            username?: string;
            email?: string;
            firstName?: string;
            lastName?: string;
            role?: string;
            token?: string;
          };
        };
        const data = payload?.data;
        if (!data?.token || data.userId == null) return null;

        const displayName =
          [data.firstName, data.lastName].filter(Boolean).join(" ").trim() ||
          data.username ||
          (credentials.username as string);
        
        const roles = orbitRoleToDashboardRoles(data.role);

        return {
          id: String(data.userId),
          email: data.email ?? (credentials.username as string),
          name: displayName,
          roles,
          accessToken: data.token,
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
        token.accessToken = (user as { accessToken?: string }).accessToken;
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
        session.user.accessToken = token.accessToken as string | undefined;
      }
      return session;
    },
  },
});
