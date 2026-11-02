"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GameState } from "./types";
import { SAMPLE_GAME } from "./sampleGame";
import { normalizeGame } from "./game";
import { applySettings, loadSettings, saveSettings } from "./settings";

const KEY = "leopardy:game:v1";
// Saves written before the Leopardy! rename live under the old key.
const LEGACY_KEY = "leoprady:game:v1";

function load(): GameState {
  if (typeof window === "undefined") return SAMPLE_GAME;
  try {
    const raw =
      window.localStorage.getItem(KEY) ??
      window.localStorage.getItem(LEGACY_KEY);
    // No saved game: still honor the saved settings — otherwise the mirror
    // effect would overwrite them with the sample game's (empty) fields.
    if (!raw) return applySettings(SAMPLE_GAME, loadSettings());
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return SAMPLE_GAME;
    // Migrate legacy single-`categories` saves into the rounds shape.
    const game = normalizeGame(parsed, SAMPLE_GAME.players);
    if (!game.rounds.length) return applySettings(SAMPLE_GAME, loadSettings());
    // The game master's saved defaults win over whatever the blob carried.
    return applySettings(game, loadSettings());
  } catch {
    return SAMPLE_GAME;
  }
}

export function useGame() {
  // Start from the sample so server and first client render match, then hydrate.
  const [game, setGame] = useState<GameState>(SAMPLE_GAME);
  const [hydrated, setHydrated] = useState(false);
  const skipNextSave = useRef(true);

  useEffect(() => {
    // Hydrate from localStorage after mount. Reading it during render would
    // cause an SSR/client mismatch, so we intentionally swap state post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGame(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(game));
    } catch {
      /* storage full / unavailable — ignore */
    }
  }, [game, hydrated]);

  // Mirror the setup preferences into their own durable store whenever they
  // change, so they persist as the default across new/loaded games.
  useEffect(() => {
    if (!hydrated) return;
    saveSettings(game);
    // Intentionally keyed on the setting fields only, not the whole game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    game.timerSeconds,
    game.ddWagerRule,
    game.wordReveal,
    game.wordRevealWpm,
    game.negativeSuperlatives,
    game.soundEnabled,
    game.revealDefault,
  ]);

  const update = useCallback(
    (fn: (g: GameState) => GameState) => setGame((g) => fn(g)),
    [],
  );

  return { game, setGame, update, hydrated };
}
