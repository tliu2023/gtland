import { cookies } from "next/headers";
import { API_URL } from "./auth";
import type { CartItem } from "./cart";
import { query } from "./db";

// Cart for logged-out visitors, kept in an httpOnly cookie as "productId:qty|productId:qty".
// Contents are re-validated against live stock whenever read, so a tampered cookie can't do harm.
const GUEST_CART_COOKIE = "gtland_guest_cart";
const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 30;
const MAX_LINES = 50;
// keep in sync with MAX_QUANTITY in management-api/orders/api.py
const MAX_QUANTITY = 99;

type GuestCart = Map<number, number>;

function parse(value: string | undefined): GuestCart {
  const cart: GuestCart = new Map();
  for (const part of (value ?? "").split("|")) {
    const [id, quantity] = part.split(":").map(Number);
    if (Number.isInteger(id) && id > 0 && Number.isInteger(quantity) && quantity > 0 && cart.size < MAX_LINES) {
      cart.set(id, Math.min(quantity, MAX_QUANTITY));
    }
  }
  return cart;
}

async function readGuestCart() {
  return parse((await cookies()).get(GUEST_CART_COOKIE)?.value);
}

async function writeGuestCart(cart: GuestCart) {
  const store = await cookies();
  if (cart.size === 0) {
    store.delete(GUEST_CART_COOKIE);
    return;
  }
  store.set(GUEST_CART_COOKIE, [...cart].map(([id, quantity]) => `${id}:${quantity}`).join("|"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_MAX_AGE,
  });
}

type StockRow = {
  id: number;
  slug: string;
  title: string;
  game: CartItem["game"];
  category: CartItem["category"];
  price: string;
  quantity: number;
  status: string;
  image: string | null;
};

async function getStock(ids: number[]) {
  return query<StockRow>(
    `SELECT p.id::int AS id, p.slug, p.title, p.game, p.category, p.price, p.quantity, p.status,
       (SELECT pi.image FROM cards_productimage pi WHERE pi.product_id = p.id ORDER BY pi.sort_order LIMIT 1) AS image
     FROM cards_product p
     WHERE p.status <> 'hidden' AND p.id = ANY($1::bigint[])`,
    [ids],
  );
}

const availableOf = (row: StockRow) => (row.status === "available" ? row.quantity : 0);

export async function getGuestCartItems(): Promise<CartItem[]> {
  const cart = await readGuestCart();
  if (cart.size === 0) return [];
  const byId = new Map((await getStock([...cart.keys()])).map((row) => [row.id, row]));
  return [...cart].flatMap(([id, quantity]) => {
    const row = byId.get(id);
    return row
      ? [
          {
            productId: row.id,
            slug: row.slug,
            title: row.title,
            game: row.game,
            category: row.category,
            unitPrice: row.price,
            quantity,
            available: availableOf(row),
            image: row.image,
          },
        ]
      : [];
  });
}

// The functions below write cookies, so they may only be called from Server Actions.

export async function addToGuestCart(productId: number, quantity: number): Promise<string | undefined> {
  const [row] = await getStock([productId]);
  if (!row) return "Product not found.";
  const available = availableOf(row);
  if (available === 0) return "This item is sold out.";
  const cart = await readGuestCart();
  if (!cart.has(productId) && cart.size >= MAX_LINES) return "Your cart is full.";
  cart.set(productId, Math.min((cart.get(productId) ?? 0) + quantity, available, MAX_QUANTITY));
  await writeGuestCart(cart);
}

export async function updateGuestCart(productId: number, quantity: number): Promise<string | undefined> {
  const cart = await readGuestCart();
  if (!cart.has(productId)) return "Invalid cart update.";
  if (quantity === 0) {
    cart.delete(productId);
  } else {
    const [row] = await getStock([productId]);
    const available = row ? availableOf(row) : 0;
    if (quantity > Math.min(available, MAX_QUANTITY)) {
      return `Only ${available} of \u201c${row?.title ?? "this item"}\u201d available.`;
    }
    cart.set(productId, quantity);
  }
  await writeGuestCart(cart);
}

export async function removeFromGuestCart(productId: number) {
  const cart = await readGuestCart();
  cart.delete(productId);
  await writeGuestCart(cart);
}

// Called right after login; the cookie is only cleared once Django has saved the items.
export async function mergeGuestCartInto(token: string) {
  const cart = await readGuestCart();
  if (cart.size === 0) return;
  try {
    const res = await fetch(`${API_URL}/api/cart/merge/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: new URLSearchParams({
        items: JSON.stringify([...cart].map(([product_id, quantity]) => ({ product_id, quantity }))),
      }),
      cache: "no-store",
    });
    if (res.ok) await writeGuestCart(new Map());
    else console.error("Guest cart merge failed", res.status);
  } catch (err) {
    console.error("Guest cart merge failed", err);
  }
}
