import { GameState, RevealLevel } from "./types";

export interface GameMeta {
  id: string;
  ep: string;
  date: string; // YYYY-MM-DD
  year: number;
  rounds: number;
  cats: string[];
  /** Final Leopardy category (present once the index is rebuilt). */
  final?: string;
  /** Daily-Double count across all rounds (present once the index is rebuilt). */
  dd?: number;
}

export interface GamesIndex {
  minDate: string;
  count: number;
  years: { year: number; count: number }[];
  games: GameMeta[];
}

// A stored game is the app's GameState minus runtime-only fields.
export type StoredGame = Pick<GameState, "title" | "rounds" | "final">;

const BASE = "/games";
let indexCache: GamesIndex | null = null;
const yearCache = new Map<number, Record<string, StoredGame>>();

export async function fetchIndex(): Promise<GamesIndex> {
  if (indexCache) return indexCache;
  const res = await fetch(`${BASE}/index.json`);
  if (!res.ok) throw new Error(`Could not load game index (${res.status}).`);
  indexCache = (await res.json()) as GamesIndex;
  return indexCache;
}

export async function fetchYear(year: number): Promise<Record<string, StoredGame>> {
  const cached = yearCache.get(year);
  if (cached) return cached;
  const res = await fetch(`${BASE}/y${year}.json`);
  if (!res.ok) throw new Error(`Could not load ${year} games (${res.status}).`);
  const data = (await res.json()) as Record<string, StoredGame>;
  yearCache.set(year, data);
  return data;
}

export async function loadGame(meta: GameMeta): Promise<StoredGame> {
  const games = await fetchYear(meta.year);
  const game = games[meta.id];
  if (!game) throw new Error(`Game ${meta.id} not found in ${meta.year}.`);
  return game;
}

/** What a given reveal level discloses. */
export function revealed(level: RevealLevel): {
  cats: boolean;
  final: boolean;
  dd: boolean;
} {
  return {
    cats: level !== "blind",
    final: level === "full",
    dd: level === "full",
  };
}

/** The newest game in the index by air date (null if the index is empty). */
export function mostRecent(index: GamesIndex): GameMeta | null {
  let best: GameMeta | null = null;
  for (const g of index.games) {
    if (!best || g.date > best.date) best = g;
  }
  return best;
}

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** A lowercased haystack for a game: ISO date, "month year", and categories. */
function haystack(g: GameMeta): string {
  const [y, m] = g.date.split("-").map(Number);
  const month = MONTHS[(m || 1) - 1] ?? "";
  return `${g.date} ${month} ${y} ${g.cats.join(" ")}`.toLowerCase();
}

/**
 * Filter the index by a free-text query (category keywords AND/OR dates —
 * every whitespace token must match) and, optionally, hide played games.
 * Preserves the index's newest-first order.
 */
export function searchGames(
  index: GamesIndex,
  opts: { query: string; playedIds?: ReadonlySet<string>; hidePlayed?: boolean },
): GameMeta[] {
  const tokens = opts.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return index.games.filter((g) => {
    if (opts.hidePlayed && opts.playedIds?.has(g.id)) return false;
    if (!tokens.length) return true;
    const hay = haystack(g);
    return tokens.every((t) => hay.includes(t));
  });
}

/** Deterministic-free random pick (caller supplies index for variety in tests). */
export function pickRandom<T>(items: T[]): T | null {
  if (!items.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}
