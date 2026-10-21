import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { games } from "@/lib/games";
import { categoryLabels, getProductBySlug } from "@/lib/products";
import { resolveImageUrl } from "@/lib/media";

// inventory changes via the admin, so render fresh on every request rather than at build time
export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

            <div className="mt-6">
              {product.status === "sold" ? (
                <span className="inline-block rounded-full bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  Sold
                </span>
              ) : (
                <Link
                  href={`/contact?product=${product.slug}`}
                  className="inline-block rounded-full bg-black px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                  Inquire to buy
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
