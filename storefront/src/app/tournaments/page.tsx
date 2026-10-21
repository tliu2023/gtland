import Link from "next/link";
import { games, isGame, type Game } from "@/lib/games";
import { gameColors, getPlaceholderTournaments, type Tournament } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS_PER_DAY = 2;

// all calendar math is done in UTC on YYYY-MM-DD strings so server time zones can't shift days
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (year: number, month: number) => `${year}-${pad(month + 1)}`;

function parseMonth(value: string | undefined, today: Date) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  const month = match ? Number(match[2]) - 1 : NaN;
  if (match && month >= 0 && month <= 11) return { year: Number(match[1]), month };
  return { year: today.getUTCFullYear(), month: today.getUTCMonth() };
}

function tournamentsHref(params: { month?: string; game?: Game }) {
  const search = new URLSearchParams();
  if (params.month) search.set("month", params.month);
  if (params.game) search.set("game", params.game);
  const qs = search.toString();
  return qs ? `/tournaments?${qs}` : "/tournaments";
}

const formatDate = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...options });

function GameBadge({ game }: { game: Game }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${gameColors[game].chip}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${gameColors[game].dot}`} />
      {games[game]}
    </span>
  );
}

function Calendar({
  year,
  month,
  todayIso,
  events,
}: {
  year: number;
  month: number;
  todayIso: string;
  events: Tournament[];
}) {
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = new Map<string, Tournament[]>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="grid grid-cols-7 border-b border-zinc-200 text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} className="min-h-24 border-b border-r border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950" />;
          }
          const iso = `${monthKey(year, month)}-${pad(day)}`;
          const dayEvents = byDate.get(iso) ?? [];
          const isToday = iso === todayIso;
          return (
            <div key={iso} className="min-h-24 border-b border-r border-zinc-100 p-1.5 dark:border-zinc-800">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday
                    ? "bg-black font-semibold text-white dark:bg-white dark:text-black"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {day}
              </span>
              <ul className="mt-1 flex flex-col gap-1">
                {dayEvents.slice(0, MAX_CHIPS_PER_DAY).map((event) => (
                  <li key={event.id}>
                    <a
                      href={`#${event.id}`}
                      title={`${event.title} \u00b7 ${event.time}`}
                      className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:opacity-80 ${gameColors[event.game].chip}`}
                    >
                      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${gameColors[event.game].dot}`} />
                      <span className="hidden truncate sm:inline">{event.title}</span>
                    </a>
                  </li>
                ))}
                {dayEvents.length > MAX_CHIPS_PER_DAY && (
                  <li className="px-1 text-xs text-zinc-500">+{dayEvents.length - MAX_CHIPS_PER_DAY} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; game?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const { year, month } = parseMonth(params.month, today);
  const game = isGame(params.game) ? params.game : undefined;

  const current = monthKey(year, month);
  const prev = monthKey(month === 0 ? year - 1 : year, (month + 11) % 12);
  const next = monthKey(month === 11 ? year + 1 : year, (month + 1) % 12);
  const thisMonth = monthKey(today.getUTCFullYear(), today.getUTCMonth());

  const events = getPlaceholderTournaments(today)
    .filter((event) => event.date.startsWith(current) && (!game || event.game === game))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const navLink = "rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800";

  return (
    <div className="flex-1 bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">Tournaments</h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
          magna aliqua.
        </p>

        <nav aria-label="Filter by game" className="mb-6 flex flex-wrap gap-2">
          {[undefined, ...(Object.keys(games) as Game[])].map((value) => {
            const active = value === game;
            return (
              <Link
                key={value ?? "all"}
                href={tournamentsHref({ month: current === thisMonth ? undefined : current, game: value })}
                aria-current={active ? "true" : undefined}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
                  active
                    ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-white"
                }`}
              >
                {value && <span aria-hidden className={`h-2 w-2 rounded-full ${gameColors[value].dot}`} />}
                {value ? games[value] : "All games"}
              </Link>
            );
          })}
        </nav>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            <Link href={tournamentsHref({ month: prev, game })} className={navLink} aria-label="Previous month">
              {"\u2039"} Prev
            </Link>
            {current !== thisMonth && (
              <Link href={tournamentsHref({ game })} className={navLink}>
                Today
              </Link>
            )}
            <Link href={tournamentsHref({ month: next, game })} className={navLink} aria-label="Next month">
              Next {"\u203a"}
            </Link>
          </div>
        </div>

        <Calendar year={year} month={month} todayIso={todayIso} events={events} />

        <section aria-labelledby="events-heading" className="mt-12">
          <h2 id="events-heading" className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
            Events in {monthLabel}
            {game && <> {"\u00b7"} {games[game]}</>}
          </h2>
          {events.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-8 text-center text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No tournaments scheduled this month.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event) => (
                <article
                  key={event.id}
                  id={event.id}
                  className={`flex scroll-mt-24 gap-5 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${
                    event.date < todayIso ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-md border border-zinc-200 py-2 text-center dark:border-zinc-700">
                    <span className="text-xs font-medium uppercase text-zinc-500">
                      {formatDate(event.date, { month: "short" })}
                    </span>
                    <span className="text-2xl font-semibold text-black dark:text-zinc-50">
                      {formatDate(event.date, { day: "numeric" })}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(event.date, { weekday: "short" })}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <GameBadge game={event.game} />
                      {event.date < todayIso && <span className="text-xs text-zinc-500">Past event</span>}
                    </div>
                    <h3 className="text-lg font-semibold text-black dark:text-zinc-50">{event.title}</h3>
                    <p className="mb-3 text-sm text-zinc-500">
                      {[event.time, event.location, event.format, `Entry ${event.entryFee}`].join(" \u00b7 ")}
                    </p>
                    <p className="leading-7 text-zinc-700 dark:text-zinc-300">{event.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
