import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

function unwrapOrbitData<T>(body: unknown): T | null {
  if (!body || typeof body !== "object") return null;
  if ("data" in body && (body as { data: T }).data !== undefined) {
    return (body as { data: T }).data;
  }
  return body as T;
}

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

  const result = await orbitJson<unknown>(token, "/inventory/report", { method: "GET" });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  const payload = unwrapOrbitData<unknown>(result.data);
  return Response.json(payload ?? result.data);
}
