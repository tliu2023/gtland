import { games, type Game } from "@/lib/games";

export function CatalogSearchBar({ game, query }: { game?: Game; query?: string }) {
  return (
    <form
      action="/catalog"
      role="search"
      className="flex min-w-[280px] max-w-2xl flex-1 overflow-hidden rounded-full border border-zinc-300 bg-white focus-within:ring-2 focus-within:ring-black dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:ring-white"
    >
      <select
        name="game"
        aria-label="Game"
        defaultValue={game ?? ""}
        className="border-r border-zinc-300 bg-zinc-100 px-3 text-sm text-black outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
      >
        <option value="">All Games</option>
        {Object.entries(games).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        type="search"
        name="q"
        aria-label="Search products"
        defaultValue={query ?? ""}
        placeholder={game ? `Search ${games[game]}` : "Search all games"}
        className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-black outline-none dark:text-zinc-50"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-black px-4 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4.5 4.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}
