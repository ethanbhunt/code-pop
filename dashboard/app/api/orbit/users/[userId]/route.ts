import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitAdminDashboardRole } from "@/lib/orbit-session";

type RouteCtx = { params: Promise<{ userId: string }> };

export async function PUT(req: Request, ctx: RouteCtx) {
  const { userId } = await ctx.params;
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

  const body = await req.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(body || "{}") as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (parsed.role !== undefined) {
    const targetId = parseInt(userId, 10);
    const myId = session?.user?.id ? parseInt(String(session.user.id), 10) : NaN;
    if (!Number.isNaN(targetId) && !Number.isNaN(myId) && targetId === myId) {
      return Response.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }
  }

  const result = await orbitJson<unknown>(
    token,
    `/users/edit/${encodeURIComponent(userId)}`,
    { method: "PUT", body: body || "{}" }
  );
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { userId } = await ctx.params;
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

  const result = await orbitJson<unknown>(
    token,
    `/users/delete/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}
