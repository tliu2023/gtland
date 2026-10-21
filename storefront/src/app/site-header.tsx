import Link from "next/link";
import { getCurrentUser, roleLabels } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { logout } from "./auth-actions";
import { NavTabs } from "./nav-tabs";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const cart = await getCart();
  const linkClass = "text-zinc-500 hover:text-black dark:hover:text-zinc-50";
  const cartLink = (
    <Link href="/cart" className={`${linkClass} flex items-center gap-1`}>
      Cart
      {cart.count > 0 && (
        <span className="rounded-full bg-black px-1.5 text-xs font-medium text-white dark:bg-white dark:text-black">
          {cart.count}
        </span>
      )}
    </Link>
  );

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-6">
        <Link href="/" className="py-3 text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          gtland
        </Link>
        <NavTabs />
        <div className="ml-auto flex items-center gap-4 py-3 text-sm">
          {user ? (
            <>
              <Link href="/orders" className={linkClass}>
                Orders
              </Link>
              {cartLink}
              <span className="text-zinc-400">
                {user.username} ({roleLabels[user.role]})
              </span>
              <form action={logout}>
                <button type="submit" className={linkClass}>
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              {cartLink}
              <Link href="/login" className={linkClass}>
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-black px-3 py-1 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
