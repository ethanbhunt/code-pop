import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth.js config: validates users against codepop_backend (Django).
 *
 * Backend: POST { baseUrl }/backend/auth/login/
 *   Body: username & password (form-urlencoded or JSON)
 *   Success (200): { token, user_id, first_name, is_admin, is_manager }
 */
const djangoLoginUrl = process.env.DJANGO_API_URL
  ? `${process.env.DJANGO_API_URL.replace(/\/$/, "")}/auth/login/`
  : "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
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

        return {
          id: String(data.user_id),
          email: credentials.username as string,
          name: (data.first_name ?? credentials.username) as string,
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
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
});
