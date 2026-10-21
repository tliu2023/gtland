"use server";

import { redirect } from "next/navigation";
import { API_URL, getCurrentUser, getSessionToken } from "@/lib/auth";
import { addToGuestCart, removeFromGuestCart, updateGuestCart } from "@/lib/guest-cart";

async function postCart(path: string, body: Record<string, string>, loginNext: string) {
  const token = await getSessionToken();
  const toLogin = `/login?next=${encodeURIComponent(loginNext)}`;
  if (!token) redirect(toLogin);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: new URLSearchParams(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error(`Cart ${path} failed`, err);
    return { error: "Could not reach the server. Please try again." };
  }
  if (res.status === 401) redirect(toLogin);
  const data = (await res.json()) as { error?: string; order_id?: number };
  return res.ok ? { data } : { error: data.error ?? `Request failed (${res.status}).` };
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function wholeNumber(value: string, fallback?: number) {
  const n = value === "" && fallback !== undefined ? fallback : Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export async function addToCart(formData: FormData) {
  const slug = encodeURIComponent(field(formData, "slug"));
  const productPage = `/products/${slug}`;
  const productId = wholeNumber(field(formData, "productId"));
  const quantity = Math.max(1, wholeNumber(field(formData, "quantity"), 1) ?? 1);

  let error: string | undefined;
  if (!productId) error = "Invalid product.";
  else if (await getCurrentUser()) {
    ({ error } = await postCart("cart/add/", { product_id: String(productId), quantity: String(quantity) }, productPage));
  } else error = await addToGuestCart(productId, quantity);
  redirect(error ? `${productPage}?error=${encodeURIComponent(error)}` : `${productPage}?added=1`);
}

export async function updateCartItem(formData: FormData) {
  const productId = wholeNumber(field(formData, "productId"));
  const quantity = wholeNumber(field(formData, "quantity"));

  let error: string | undefined;
  if (!productId || quantity === null) error = "Invalid cart update.";
  else if (await getCurrentUser()) {
    ({ error } = await postCart("cart/update/", { product_id: String(productId), quantity: String(quantity) }, "/cart"));
  } else error = await updateGuestCart(productId, quantity);
  redirect(error ? `/cart?error=${encodeURIComponent(error)}` : "/cart");
}

export async function removeCartItem(formData: FormData) {
  const productId = wholeNumber(field(formData, "productId"));

  let error: string | undefined;
  if (!productId) error = "Invalid cart update.";
  else if (await getCurrentUser()) {
    ({ error } = await postCart("cart/remove/", { product_id: String(productId) }, "/cart"));
  } else await removeFromGuestCart(productId);
  redirect(error ? `/cart?error=${encodeURIComponent(error)}` : "/cart");
}

export async function placeOrder() {
  if (!(await getCurrentUser())) redirect("/login?next=/cart");
  const { data, error } = await postCart("orders/place/", {}, "/cart");
  redirect(error ? `/cart?error=${encodeURIComponent(error)}` : `/orders?placed=${data?.order_id ?? ""}`);
}
