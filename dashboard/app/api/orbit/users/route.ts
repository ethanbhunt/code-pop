import { auth } from "@/auth";
import {
  getOrbitBaseUrl,
  orbitJson,
  orbitJsonPublic,
} from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

export async function GET() {
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitAdminDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<unknown>(token, "/users", { method: "GET" });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

/**
 * Create a user via OrbitDB register (BFF-gated: same as Orbit admin routes).
 * Proxies to POST /backend/auth/register (no token on upstream).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!hasOrbitAdminDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const result = await orbitJsonPublic<unknown>("/auth/register", {
    method: "POST",
    body: body || "{}",
  });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data, { status: result.status === 201 ? 201 : 200 });
}
