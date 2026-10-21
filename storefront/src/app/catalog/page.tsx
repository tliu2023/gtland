import Image from "next/image";
import Link from "next/link";
import { games, isGame } from "@/lib/games";
import {
  categoryLabels,
  getAvailableProducts,
  getProductFacets,
  type FacetOption,
  type ProductFilters,
} from "@/lib/products";
import { resolveImageUrl } from "@/lib/media";
import { CatalogSearchBar } from "../catalog-search-bar";

// inventory changes via the admin, so render fresh on every request rather than at build time
export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  game?: string;
  category?: string;
  set?: string;
};

type CatalogParams = Partial<Record<keyof SearchParams, string>>;

function catalogHref(current: CatalogParams, overrides: CatalogParams = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

function FacetSection({
  title,
  options,
  selected,
  hrefFor,
}: {
  title: string;
  options: { value: string; label: string; count: number }[];
  selected?: string;
  hrefFor: (value: string | undefined) => string;
}) {
  if (options.length === 0) return null;
  return (
    <section className="border-b border-zinc-200 py-4 dark:border-zinc-800">
      <h2 className="mb-2 text-sm font-semibold text-black dark:text-zinc-50">{title}</h2>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto text-sm">
        {options.map(({ value, label, count }) => {
          const active = selected === value;
          return (
            <li key={value}>
              <Link
                href={hrefFor(active ? undefined : value)}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-2 rounded px-1 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                  count === 0 && !active ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active
                      ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {active && "\u2713"}
                </span>
                <span className="flex-1">{label}</span>
                <span className="text-xs text-zinc-400">{count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const countFor = (options: FacetOption[], value: string) =>
  options.find((o) => o.value === value)?.count ?? 0;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters: ProductFilters = {
    query: params.q?.trim() || undefined,
    game: isGame(params.game) ? params.game : undefined,
    category:
      params.category && params.category in categoryLabels
        ? (params.category as ProductFilters["category"])
        : undefined,
    set: params.set || undefined,
  };
  const current: CatalogParams = {
    q: filters.query,
    game: filters.game,
    category: filters.category,
    set: filters.set,
  };

  const [products, facets] = await Promise.all([getAvailableProducts(filters), getProductFacets(filters)]);

  const chips: { label: string; remove: CatalogParams }[] = [];
  if (filters.query) chips.push({ label: `\u201c${filters.query}\u201d`, remove: { q: undefined } });
  if (filters.game) chips.push({ label: games[filters.game], remove: { game: undefined, set: undefined } });
  if (filters.category) chips.push({ label: categoryLabels[filters.category], remove: { category: undefined } });
  if (filters.set) chips.push({ label: filters.set, remove: { set: undefined } });

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-4 px-6 pt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Catalog</h1>
        <CatalogSearchBar game={filters.game} query={filters.query} />
      </div>

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filters">
          <FacetSection
            title="Game"
            options={Object.entries(games).map(([value, label]) => ({
              value,
              label,
              count: countFor(facets.game, value),
            }))}
            selected={filters.game}
            hrefFor={(game) => catalogHref(current, { game, set: undefined })}
          />
          <FacetSection
            title="Product Type"
            options={Object.entries(categoryLabels).map(([value, label]) => ({
              value,
              label,
              count: countFor(facets.category, value),
            }))}
            selected={filters.category}
            hrefFor={(category) => catalogHref(current, { category })}
          />
          <FacetSection
            title="Set"
            options={facets.set.map(({ value, count }) => ({ value, label: value, count }))}
            selected={filters.set}
            hrefFor={(set) => catalogHref(current, { set })}
          />
        </aside>

        <section aria-label="Results">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              {products.length} {products.length === 1 ? "result" : "results"}
              {filters.query && <> for {`\u201c${filters.query}\u201d`}</>}
              {filters.game && <> in {games[filters.game]}</>}
            </h2>
            {chips.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {chips.map(({ label, remove }) => (
                  <Link
                    key={label}
                    href={catalogHref(current, remove)}
                    aria-label={`Remove filter ${label}`}
                    className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white"
                  >
                    {label}
                    <span aria-hidden className="text-zinc-400">
                      {"\u00d7"}
                    </span>
                  </Link>
                ))}
                <Link
                  href="/catalog"
                  className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Clear all
                </Link>
              </div>
            )}
          </div>

          {products.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No products match these filters.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
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
                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {[product.game && games[product.game], categoryLabels[product.category]]
                        .filter(Boolean)
                        .join(" \u00b7 ")}
                    </span>
                    <h2 className="font-semibold text-black dark:text-zinc-50">{product.title}</h2>
                    {(product.set || product.year) && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {[product.set, product.year].filter(Boolean).join(" \u00b7 ")}
                      </p>
                    )}
                    {(product.gradingCompany || product.grade) && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {[product.gradingCompany, product.grade].filter(Boolean).join(" ")}
                      </p>
                    )}
                    <p className="mt-auto pt-2 text-lg font-semibold text-black dark:text-zinc-50">
                      ${product.price}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

