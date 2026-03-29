import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken } from "@/lib/orbit-session";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<unknown>(token, `/inventory/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const body = await req.text();
  const result = await orbitJson<unknown>(token, `/inventory/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: body || "{}",
  });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  const session = await auth();
  const token = getAccessToken(session);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getOrbitBaseUrl()) {
    return Response.json(
      { error: "ORBITDB_API_URL or DJANGO_API_URL is not configured" },
      { status: 503 }
    );
  }

  const result = await orbitJson<unknown>(token, `/inventory/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!result.ok) {
    return new Response(result.body, { status: result.status });
  }
  return Response.json(result.data);
}
