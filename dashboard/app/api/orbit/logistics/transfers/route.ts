import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

export async function GET(req: Request) {
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitStaffDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json({ error: "ORBITDB_API_URL is not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const query = url.searchParams.toString();
  const path = query ? `/logistics/transfers?${query}` : "/logistics/transfers";

  const result = await orbitJson<unknown>(token, path, { method: "GET" });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

export async function POST(req: Request) {
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitStaffDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json({ error: "ORBITDB_API_URL is not configured" }, { status: 503 });
  }

  const body = await req.text();
  const result = await orbitJson<unknown>(token, "/logistics/transfers", {
    method: "POST",
    body: body || "{}",
  });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data, { status: result.status === 201 ? 201 : 200 });
}
