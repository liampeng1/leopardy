"use client";

import { DEFAULT_TIMER_SECONDS, GameState } from "./types";

// The game master's setup preferences, persisted as their durable default
// independent of any single game. Stored separately from the game blob so a
// fresh sample game (or a game loaded from the browser) still adopts the last
// settings they chose.
const KEY = "leopardy:settings:v2";
// v1 predates the defaults change (timer 30s → 20s, roasts
// off → on) and is migrated on first read.
const LEGACY_KEY = "leopardy:settings:v1";

/** The fields that make up a saved default. */
export const SETTING_FIELDS = [
  "timerSeconds",
  "ddWagerRule",
  "wordReveal",
  "wordRevealWpm",
  "negativeSuperlatives",
  "soundEnabled",
  "revealDefault",
] as const;

export type GameSettings = Pick<GameState, (typeof SETTING_FIELDS)[number]>;

/**
 * v1 → v2: the defaults changed. The save-on-change mirror
 * echoed every field back into the v1 blob, so a stored old default is almost
 * always just the default — not a deliberate choice — and moves to the new
 * default. A choice re-made after this ships is saved to v2 and sticks.
 */
export function migrateLegacySettings(
  s: Partial<GameSettings>,
): Partial<GameSettings> {
  const out = { ...s };
  if (out.timerSeconds === 30) out.timerSeconds = DEFAULT_TIMER_SECONDS;
  if (out.negativeSuperlatives === false) out.negativeSuperlatives = true;
  return out;
}

export function loadSettings(): Partial<GameSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    const legacyRaw = raw ? null : window.localStorage.getItem(LEGACY_KEY);
    const parsed = JSON.parse(raw ?? legacyRaw ?? "null");
    if (!parsed || typeof parsed !== "object") return {};
    const out: Partial<GameSettings> = {};
    for (const f of SETTING_FIELDS) {
      if (parsed[f] !== undefined) (out as Record<string, unknown>)[f] = parsed[f];
    }
    return legacyRaw ? migrateLegacySettings(out) : out;
  } catch {
    return {};
  }
}

export function saveSettings(game: Partial<GameSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const out: Partial<GameSettings> = {};
    for (const f of SETTING_FIELDS) {
      if (game[f] !== undefined) (out as Record<string, unknown>)[f] = game[f];
    }
    window.localStorage.setItem(KEY, JSON.stringify(out));
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Overlay the saved defaults onto a game (saved prefs win over baked-in ones). */
export function applySettings(game: GameState, s: Partial<GameSettings>): GameState {
  return { ...game, ...s };
}
