import type { Game } from "./games";

export type Tournament = {
  id: string;
  title: string;
  game: Game;
  // YYYY-MM-DD
  date: string;
  time: string;
  location: string;
  format: string;
  entryFee: string;
  summary: string;
};

// static class names so Tailwind can see them
export const gameColors: Record<Game, { dot: string; chip: string }> = {
  one_piece: { dot: "bg-red-500", chip: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300" },
  gundam: { dot: "bg-blue-500", chip: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  riftbound: { dot: "bg-violet-500", chip: "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300" },
  union_arena: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300" },
  naruto_mythos: { dot: "bg-orange-500", chip: "bg-orange-50 text-orange-900 dark:bg-orange-950 dark:text-orange-300" },
  naruto: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
};

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

// days kept at 28 or below so every month has them
const TEMPLATES: (Omit<Tournament, "id" | "date" | "summary"> & { day: number })[] = [
  { day: 3, title: "One Piece Weekly", game: "one_piece", time: "6:00 PM", location: "gtland Store", format: "Standard \u00b7 Swiss, Bo3", entryFee: "$10" },
  { day: 7, title: "Gundam TCG Launch League", game: "gundam", time: "7:00 PM", location: "gtland Store", format: "Constructed \u00b7 Swiss, Bo1", entryFee: "$15" },
  { day: 12, title: "Riftbound Sealed Night", game: "riftbound", time: "6:30 PM", location: "Community Hall", format: "Sealed \u00b7 4 rounds", entryFee: "$35" },
  { day: 14, title: "Union Arena Showdown", game: "union_arena", time: "1:00 PM", location: "gtland Store", format: "Standard \u00b7 Swiss + Top 8", entryFee: "$20" },
  { day: 17, title: "One Piece Treasure Cup", game: "one_piece", time: "11:00 AM", location: "Convention Center", format: "Standard \u00b7 Swiss + Top 16", entryFee: "$30" },
  { day: 20, title: "Naruto Mythos Casual Meetup", game: "naruto_mythos", time: "5:00 PM", location: "gtland Store", format: "Casual \u00b7 Open play", entryFee: "Free" },
  { day: 24, title: "Naruto TCG Ninja Clash", game: "naruto", time: "2:00 PM", location: "gtland Store", format: "Constructed \u00b7 Swiss, Bo3", entryFee: "$12" },
  { day: 27, title: "Gundam TCG Monthly Championship", game: "gundam", time: "12:00 PM", location: "Community Hall", format: "Constructed \u00b7 Swiss + Top 8", entryFee: "$25" },
];

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

// Placeholder schedule: the same events every month from last month through three months out.
export function getPlaceholderTournaments(today = new Date()): Tournament[] {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const events: Tournament[] = [];
  for (let offset = -1; offset <= 3; offset++) {
    for (const { day, ...template } of TEMPLATES) {
      const date = isoDate(new Date(Date.UTC(year, month + offset, day)));
      events.push({ ...template, id: `${template.game}-${date}`, date, summary: LOREM });
    }
  }
  return events;
}
