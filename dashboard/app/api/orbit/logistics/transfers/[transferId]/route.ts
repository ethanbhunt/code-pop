import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitLogisticsDashboardRole } from "@/lib/orbit-session";

type RouteCtx = { params: Promise<{ transferId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { transferId } = await ctx.params;
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitLogisticsDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<unknown>(
    token,
    `/logistics/transfers/${encodeURIComponent(transferId)}`,
    { method: "GET" }
  );
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { transferId } = await ctx.params;
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOrbitLogisticsDashboardRole(session)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const result = await orbitJson<unknown>(
    token,
    `/logistics/transfers/${encodeURIComponent(transferId)}`,
    { method: "PATCH", body: body || "{}" }
  );
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}
