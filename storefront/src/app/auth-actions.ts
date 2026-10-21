"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, SESSION_COOKIE, SESSION_MAX_AGE, safeNextPath } from "@/lib/auth";

type AuthResponse = {
  token?: string;
  code?: string;
  error?: string;
  errors?: Record<string, string[]>;
};

async function postAuth(path: string, body: URLSearchParams) {
  try {
    const res = await fetch(`${API_URL}/api/auth/${path}/`, { method: "POST", body, cache: "no-store" });
    const data = (await res.json()) as AuthResponse;
    const error = res.ok
      ? undefined
      : data.error ||
        Object.values(data.errors ?? {})
          .flat()
          .join(" ") ||
        `Request failed (${res.status}).`;
    return { ok: res.ok, data, error };
  } catch (err) {
    console.error(`Auth ${path} failed`, err);
    return { ok: false, data: {} as AuthResponse, error: "Could not reach the server. Please try again." };
  }
}

async function startSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

function back(page: "/login" | "/register", next: string, extra: Record<string, string>): never {
  const params = new URLSearchParams(extra);
  if (next !== "/") params.set("next", next);
  redirect(`${page}?${params}`);
}

export async function login(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const { data, error } = await postAuth(
    "login",
    new URLSearchParams({
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    }),
  );
  if (data.code === "unverified") back("/login", next, { unverified: "1" });
  if (!data.token) back("/login", next, { error: error ?? "Login failed." });
  await startSession(data.token);
  redirect(next);
}

export async function register(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const { ok, error } = await postAuth(
    "register",
    new URLSearchParams({
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password1: String(formData.get("password1") ?? ""),
      password2: String(formData.get("password2") ?? ""),
    }),
  );
  if (!ok) back("/register", next, { error: error ?? "Sign up failed." });
  back("/register", next, { sent: "1" });
}

export async function resendVerification(formData: FormData) {
  const { ok, error } = await postAuth(
    "resend-verification",
    new URLSearchParams({ email: String(formData.get("email") ?? "") }),
  );
  redirect(ok ? "/resend-verification?sent=1" : `/resend-verification?error=${encodeURIComponent(error ?? "")}`);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
