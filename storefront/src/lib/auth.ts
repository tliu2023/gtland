import { cookies } from "next/headers";
import { cache } from "react";

export const SESSION_COOKIE = "gtland_session";
export const API_URL = process.env.MANAGEMENT_API_URL ?? "http://localhost:8000";
// keep in sync with TOKEN_MAX_AGE in management-api/accounts/auth.py
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type Role = "admin" | "grading_admin" | "user";
export type CurrentUser = { username: string; role: Role };

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

// Django is the source of truth, so a revoked/expired token is caught here; cached per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as CurrentUser) : null;
  } catch (err) {
    console.error("Auth check failed", err);
    return null;
  }
});

export function canEditSubmissions(user: CurrentUser | null) {
  return user?.role === "admin" || user?.role === "grading_admin";
}

export const roleLabels: Record<Role, string> = {
  admin: "Admin",
  grading_admin: "Grading admin",
  user: "User",
};

// only allow same-site relative paths to avoid open redirects
export function safeNextPath(next: unknown) {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/";
}
