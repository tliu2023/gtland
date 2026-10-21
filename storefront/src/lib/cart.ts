import { cache } from "react";
import { API_URL, getCurrentUser, getSessionToken } from "./auth";
import { getGuestCartItems } from "./guest-cart";
import type { Product } from "./products";

export type CartItem = {
  productId: number;
  slug: string;
  title: string;
  game: Product["game"];
  category: Product["category"];
  unitPrice: string;
  quantity: number;
  // 0 when the product sold out (or was hidden) after it was added
  available: number;
  image: string | null;
};

export type Cart = { items: CartItem[]; count: number };

export type OrderItem = { title: string; unitPrice: string; quantity: number; lineTotal: string };

export type Order = {
  id: number;
  status: "placed" | "completed" | "cancelled";
  createdAt: string;
  total: string;
  items: OrderItem[];
};

type ApiCartItem = {
  product_id: number;
  slug: string;
  title: string;
  game: Product["game"];
  category: Product["category"];
  unit_price: string;
  quantity: number;
  available: number;
  image: string | null;
};

function mapCart(data: { items: ApiCartItem[]; count: number }): Cart {
  return {
    count: data.count,
    items: data.items.map((item) => ({
      productId: item.product_id,
      slug: item.slug,
      title: item.title,
      game: item.game,
      category: item.category,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      available: item.available,
      image: item.image,
    })),
  };
}

async function getJson<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch (err) {
    console.error(`GET ${path} failed`, err);
    return null;
  }
}

// logged-out visitors get their cookie-based guest cart; cached per request so the header and cart page share one fetch
export const getCart = cache(async (): Promise<Cart> => {
  if (!(await getCurrentUser())) {
    const items = await getGuestCartItems();
    return { items, count: items.reduce((sum, item) => sum + item.quantity, 0) };
  }
  const data = await getJson<{ items: ApiCartItem[]; count: number }>("/api/cart/");
  return data ? mapCart(data) : { items: [], count: 0 };
});

export async function getOrders(): Promise<Order[] | null> {
  const data = await getJson<{
    orders: {
      id: number;
      status: Order["status"];
      created_at: string;
      total: string;
      items: { title: string; unit_price: string; quantity: number; line_total: string }[];
    }[];
  }>("/api/orders/");
  if (!data) return null;
  return data.orders.map((order) => ({
    id: order.id,
    status: order.status,
    createdAt: order.created_at,
    total: order.total,
    items: order.items.map((item) => ({
      title: item.title,
      unitPrice: item.unit_price,
      quantity: item.quantity,
      lineTotal: item.line_total,
    })),
  }));
}
