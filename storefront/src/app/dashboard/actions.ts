"use server";

import { redirect } from "next/navigation";
import { API_URL, canEditSubmissions, getCurrentUser, getSessionToken } from "@/lib/auth";

const FIELDS = [
  "name",
  "cert_number",
  "submission_number",
  "submission_date",
  "submission_tier",
  "grading_company",
  "grade",
  "submission_status",
  "note",
];

async function callApi(path: string, body?: FormData): Promise<string | null> {
  // checked here for a fast, friendly error; Django enforces the same rule on every write
  if (!canEditSubmissions(await getCurrentUser())) {
    return "You don't have permission to change submissions.";
  }
  const token = await getSessionToken();

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/submissions/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      cache: "no-store",
    });
  } catch (err) {
    console.error("Submissions API unreachable", err);
    return "Could not reach the management API.";
  }
  if (res.ok) return null;
  if (res.status === 401) redirect("/login?next=/dashboard");
  if (res.status === 403) return "You don't have permission to change submissions.";
  if (res.status === 400) {
    const { errors } = (await res.json()) as { errors: Record<string, string[]> };
    return Object.entries(errors)
      .map(([field, messages]) => `${field.replace(/_/g, " ")}: ${messages.join(" ")}`)
      .join(" ");
  }
  return `Request failed (${res.status}).`;
}

function pickFields(formData: FormData) {
  const body = new FormData();
  for (const field of FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") body.set(field, value.trim());
  }
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) body.set("image", image);
  return body;
}

function finish(error: string | null, onError: string) {
  if (error) redirect(`${onError}${onError.includes("?") ? "&" : "?"}error=${encodeURIComponent(error)}`);
  redirect("/dashboard");
}

function parseId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) redirect("/dashboard?error=Invalid%20card.");
  return id;
}

export async function saveSubmission(formData: FormData) {
  const id = formData.get("id") ? parseId(formData) : null;
  const error = await callApi(id ? `${id}/` : "", pickFields(formData));
  finish(error, id ? `/dashboard?edit=${id}` : "/dashboard?add=1");
}

export async function deleteSubmission(formData: FormData) {
  const id = parseId(formData);
  finish(await callApi(`${id}/delete/`), "/dashboard");
}
