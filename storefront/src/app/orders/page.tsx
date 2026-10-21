import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOrders, type Order } from "@/lib/cart";

export const dynamic = "force-dynamic";

const statusStyles: Record<Order["status"], string> = {
  placed: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  completed: "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ placed?: string }> }) {
  const params = await searchParams;
  if (!(await getCurrentUser())) redirect("/login?next=/orders");
  const orders = (await getOrders()) ?? [];

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Your orders</h1>

        {params.placed && (
          <p className="mb-6 rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            Order #{params.placed} placed. We&apos;ll be in touch to arrange payment and delivery.
          </p>
        )}

        {orders.length === 0 ? (
          <p className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            You haven&apos;t placed any orders yet.{" "}
            <Link href="/catalog" className="font-medium text-black underline dark:text-zinc-50">
              Browse the catalog
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-black dark:text-zinc-50">Order #{order.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[order.status]}`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {new Date(order.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {order.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 text-black dark:text-zinc-50">{item.title}</td>
                        <td className="py-1.5 text-zinc-500">
                          {item.quantity} {"\u00d7"} ${item.unitPrice}
                        </td>
                        <td className="py-1.5 text-right text-black dark:text-zinc-50">${item.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex justify-end gap-2 border-t border-zinc-200 pt-3 font-semibold text-black dark:border-zinc-800 dark:text-zinc-50">
                  <span>Total</span>
                  <span>${order.total}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
