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
    };
  }

  interface User {
    roles?: Role[];
  }
}

declare module "@auth/core/types" {
  // Auth.js callbacks use the underlying @auth/core `User` type,
  // so we augment it too for `user.roles`.
  interface User {
    roles?: Role[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    name?: string;
    roles?: Role[];
  }
}
