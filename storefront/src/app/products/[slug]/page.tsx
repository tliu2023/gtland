import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/lib/games";
import { categoryLabels, getProductBySlug } from "@/lib/products";
import { resolveImageUrl } from "@/lib/media";
import { addToCart } from "../../cart/actions";

// inventory changes via the admin, so render fresh on every request rather than at build time
export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ added?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { added, error } = await searchParams;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <Link
          href="/catalog"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          ← Back to catalog
        </Link>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              {product.images.length > 0 ? (
                <Image
                  src={resolveImageUrl(product.images[0])}
                  alt={product.title}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  No image
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(1).map((image) => (
                  <div
                    key={image}
                    className="relative aspect-square overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800"
                  >
                    <Image
                      src={resolveImageUrl(image)}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {[product.game && games[product.game], categoryLabels[product.category]]
                .filter(Boolean)
                .join(" \u00b7 ")}
            </span>
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              {product.title}
            </h1>
            {(product.set || product.year) && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {[product.set, product.year].filter(Boolean).join(" · ")}
              </p>
            )}
            {product.condition && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Condition: {product.condition}
              </p>
            )}
            {(product.gradingCompany || product.grade) && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Grade: {[product.gradingCompany, product.grade].filter(Boolean).join(" ")}
              </p>
            )}
            {product.boxType && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {product.boxType}
                {product.sealedCondition ? ` · ${product.sealedCondition}` : ""}
              </p>
            )}

            <p className="mt-2 text-2xl font-semibold text-black dark:text-zinc-50">
              ${product.price}
            </p>

            {product.description && (
              <p className="mt-4 whitespace-pre-line text-zinc-700 dark:text-zinc-300">
                {product.description}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {added && (
                <p className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
                  Added to your cart.{" "}
                  <Link href="/cart" className="font-medium underline">
                    View cart
                  </Link>
                </p>
              )}
              {error && (
                <p className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                  {error}
                </p>
              )}
              {product.status === "sold" || product.quantity === 0 ? (
                <span className="inline-block w-fit rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Sold
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <form action={addToCart} className="flex items-center gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="slug" value={product.slug} />
                    {product.quantity > 1 && (
                      <input
                        type="number"
                        name="quantity"
                        min={1}
                        max={product.quantity}
                        defaultValue={1}
                        aria-label="Quantity"
                        className="w-16 rounded border border-zinc-300 bg-white px-2 py-2 text-sm text-black dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                      />
                    )}
                    <button
                      type="submit"
                      className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                    >
                      Add to cart
                    </button>
                  </form>
                  <Link
                    href={`/contact?product=${product.slug}`}
                    className="text-sm text-zinc-600 underline hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    Ask a question
                  </Link>
                </div>
              )}
              {product.status === "available" && product.quantity > 0 && (
                <p className="text-sm text-zinc-500">{product.quantity} in stock</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
