import Image from "next/image";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { games } from "@/lib/games";
import { resolveImageUrl } from "@/lib/media";
import { categoryLabels } from "@/lib/products";
import { placeOrder, removeCartItem, updateCartItem } from "./actions";

export const dynamic = "force-dynamic";

const money = (value: number) => `$${value.toFixed(2)}`;

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const [user, cart] = await Promise.all([getCurrentUser(), getCart()]);
  const items = cart.items;

  const blocked = items.filter((item) => item.quantity > item.available);
  const subtotal = items
    .filter((item) => item.available > 0)
    .reduce((sum, item) => sum + Number(item.unitPrice) * Math.min(item.quantity, item.available), 0);

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Cart</h1>

        {params.error && (
          <p className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {params.error}
          </p>
        )}

        {items.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            Your cart is empty.{" "}
            <Link href="/catalog" className="font-medium text-black underline dark:text-zinc-50">
              Browse the catalog
            </Link>
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_18rem]">
            <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
              {items.map((item) => {
                const soldOut = item.available === 0;
                const short = !soldOut && item.quantity > item.available;
                return (
                  <li
                    key={item.productId}
                    className={`flex flex-wrap items-center gap-4 p-4 ${soldOut ? "opacity-50 grayscale" : ""}`}
                  >
                    <div className="relative h-20 w-16 shrink-0 bg-zinc-100 dark:bg-zinc-800">
                      {item.image && (
                        <Image
                          src={resolveImageUrl(item.image)}
                          alt={item.title}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs uppercase tracking-wide text-zinc-500">
                        {[item.game && games[item.game], categoryLabels[item.category]].filter(Boolean).join(" \u00b7 ")}
                      </span>
                      <Link
                        href={`/products/${item.slug}`}
                        className="block font-medium text-black hover:underline dark:text-zinc-50"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{money(Number(item.unitPrice))} each</p>
                      {soldOut && <p className="text-sm font-medium text-red-700 dark:text-red-400">Sold out</p>}
                      {short && (
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          Only {item.available} available {"\u2013"} update the quantity
                        </p>
                      )}
                    </div>

                    {soldOut ? (
                      <span className="w-28 text-sm text-zinc-600 dark:text-zinc-400">Qty 0</span>
                    ) : (
                      <form action={updateCartItem} className="flex w-28 items-center gap-1">
                        <input type="hidden" name="productId" value={item.productId} />
                        <input
                          type="number"
                          name="quantity"
                          min={1}
                          max={item.available}
                          defaultValue={Math.min(item.quantity, item.available)}
                          aria-label={`Quantity of ${item.title}`}
                          className="w-14 rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                        />
                        <button type="submit" className="text-xs text-zinc-600 underline dark:text-zinc-400">
                          Update
                        </button>
                      </form>
                    )}

                    <span className="w-20 text-right font-medium text-black dark:text-zinc-50">
                      {money(Number(item.unitPrice) * (soldOut ? 0 : Math.min(item.quantity, item.available)))}
                    </span>

                    <form action={removeCartItem}>
                      <input type="hidden" name="productId" value={item.productId} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>

            <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex justify-between text-lg font-semibold text-black dark:text-zinc-50">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              {blocked.length > 0 && (
                <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
                  Remove sold-out items or lower quantities to place your order.
                </p>
              )}
              {user ? (
                <form action={placeOrder}>
                  <button
                    type="submit"
                    disabled={blocked.length > 0}
                    className="w-full rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Place order
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Log in or create an account to place your order. Your cart will be kept.
                  </p>
                  <Link
                    href="/login?next=/cart"
                    className="rounded-full bg-black px-5 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                  >
                    Log in to check out
                  </Link>
                  <Link
                    href="/register?next=/cart"
                    className="rounded-full border border-zinc-300 px-5 py-2 text-center text-sm font-medium text-black hover:border-black dark:border-zinc-700 dark:text-zinc-50 dark:hover:border-white"
                  >
                    Sign up
                  </Link>
                </div>
              )}
              <p className="mt-3 text-xs text-zinc-500">
                No payment is taken online. Your order is saved to your account and we&apos;ll contact you to
                arrange payment and delivery.
              </p>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
