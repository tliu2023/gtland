import Image from "next/image";
import { getAvailableProducts } from "@/lib/products";
import { resolveImageUrl } from "@/lib/media";

const categoryLabels = {
  single_card: "Single Card",
  sealed: "Sealed Product",
  graded: "Graded Card",
};

// inventory changes via the admin, so render fresh on every request rather than at build time
export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getAvailableProducts();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          gtland
        </h1>

        {products.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            No products available yet. Add some via the management admin.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
                  {product.primaryImage ? (
                    <Image
                      src={resolveImageUrl(product.primaryImage)}
                      alt={product.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {categoryLabels[product.category]}
                  </span>
                  <h2 className="font-semibold text-black dark:text-zinc-50">
                    {product.title}
                  </h2>
                  {(product.set || product.year) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {[product.set, product.year].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {(product.gradingCompany || product.grade) && (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {[product.gradingCompany, product.grade].filter(Boolean).join(" ")}
                    </p>
                  )}
                  <p className="mt-2 text-lg font-semibold text-black dark:text-zinc-50">
                    ${product.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

