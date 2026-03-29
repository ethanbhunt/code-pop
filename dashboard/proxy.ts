import { auth } from "@/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const publicPaths = ["/login"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!isLoggedIn && !isPublic) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return Response.redirect(login);
  }

  if (isLoggedIn && pathname === "/login") {
    return Response.redirect(new URL("/", req.url));
  }

  return undefined;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/orbit).*)",
  ],
};
