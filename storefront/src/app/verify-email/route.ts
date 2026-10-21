import { NextResponse, type NextRequest } from "next/server";
import { API_URL } from "@/lib/auth";

// Target of the link in the verification email; verifies, then sends the user to log in.
export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid") ?? "";
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const login = new URL("/login", request.url);

  try {
    const res = await fetch(`${API_URL}/api/auth/verify-email/`, {
      method: "POST",
      body: new URLSearchParams({ uid, token }),
      cache: "no-store",
    });
    const data = (await res.json()) as { error?: string };
    if (res.ok) login.searchParams.set("verified", "1");
    else login.searchParams.set("error", data.error ?? "This verification link is invalid or has expired.");
  } catch (err) {
    console.error("Email verification failed", err);
    login.searchParams.set("error", "Could not verify your email right now. Please try again.");
  }
  return NextResponse.redirect(login);
}
