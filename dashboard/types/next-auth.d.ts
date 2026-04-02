import "next-auth";

import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles?: Role[];
      /** OrbitDB API token (`Authorization: Token …`). */
      accessToken?: string;
    };
  }

  interface User {
    roles?: Role[];
    accessToken?: string;
  }
}

declare module "@auth/core/types" {
  // Auth.js callbacks use the underlying @auth/core `User` type,
  // so we augment it too for `user.roles`.
  interface User {
    roles?: Role[];
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    roles?: Role[];
    accessToken?: string;
  }
}
