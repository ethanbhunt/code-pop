/**
 * Server-only OrbitDB REST client. Base URL must include `/backend`
 * (e.g. http://127.0.0.1:3001/backend).
 */

export function getOrbitBaseUrl(): string | null {
  const raw = process.env.ORBITDB_API_URL;
  if (!raw?.trim()) return null;
  return raw.replace(/\/$/, "");
}

export async function orbitFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getOrbitBaseUrl();
  if (!base) {
    throw new Error("ORBITDB_API_URL is not set");
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Token ${accessToken}`);
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${base}${normalized}`, { ...init, headers });
}

/** Unauthenticated request (e.g. register) — no Authorization header. */
export async function orbitFetchPublic(path: string, init?: RequestInit): Promise<Response> {
  const base = getOrbitBaseUrl();
  if (!base) {
    throw new Error("ORBITDB_API_URL is not set");
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init?.headers);
  if (
    init?.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${base}${normalized}`, { ...init, headers });
}

export async function orbitJsonPublic<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; body: string }> {
  const res = await orbitFetchPublic(path, init);
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, body: text || "Invalid JSON" };
  }
}

export async function orbitJson<T>(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T; status: number } | { ok: false; status: number; body: string }> {
  const res = await orbitFetch(accessToken, path, init);
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  try {
    return { ok: true, status: res.status, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: res.status, body: text || "Invalid JSON" };
  }
}
