"use client";

import { useState } from "react";
import { DEFAULT_REVEAL_LEVEL, GameState, RevealLevel } from "@/lib/types";
import { firstAvailableColor, uid } from "@/lib/game";
import { GamePreview, RevealToggle } from "./GamePreview";
import { SettingsPanel } from "./SettingsPanel";

/** Derive "July 23, 2026" + round-grouped categories from the loaded game. */
function loadedPreview(game: GameState) {
  // Library titles may carry an episode and date: "Game #12 — 2026-07-23".
  const isoMatch = game.title.match(/(\d{4})-(\d{2})-(\d{2})/);
  const epMatch = game.title.match(/#(\d+)/);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let date: string | undefined;
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    date = `${months[Number(m) - 1]} ${Number(d)}, ${y}`;
  }
  const groups = game.rounds.map((r) => ({
    label: r.name,
    cats: r.categories.map((c) => c.name).filter(Boolean),
  }));
  const ddCount = game.rounds.reduce(
    (n, r) => n + r.categories.reduce((m, c) => m + c.clues.filter((cl) => cl.dd).length, 0),
    0,
  );
  const subtitle =
    game.rounds.length > 0
      ? `${epMatch ? `Episode #${epMatch[1]} · ` : ""}${game.rounds.length} round${game.rounds.length === 1 ? "" : "s"} + Final`
      : undefined;
  return { date: date, title: game.title, subtitle, groups, ddCount, finalCategory: game.final.category };
}

export function SetupScreen({
  game,
  update,
  onPickGame,
  onRandom,
  onStart,
  played,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
  onPickGame: () => void;
  onRandom: () => void;
  onStart: () => void;
  played: boolean;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Per-screen reveal state, seeded from the saved default. When the default
  // changes in the gear, re-sync during render (React's prop-change pattern)
  // so the on-screen preview never disagrees with the setting just picked.
  const savedReveal = game.revealDefault ?? DEFAULT_REVEAL_LEVEL;
  const [reveal, setReveal] = useState<RevealLevel>(savedReveal);
  const [lastSaved, setLastSaved] = useState<RevealLevel>(savedReveal);
  if (savedReveal !== lastSaved) {
    setLastSaved(savedReveal);
    setReveal(savedReveal);
  }
  const preview = loadedPreview(game);
  const hasBoard = game.rounds.length > 0;

  const addPlayer = () =>
    update((g) => ({
      ...g,
      players: [
        ...g.players,
        { id: uid("p"), name: `Player ${g.players.length + 1}`, score: 0, color: firstAvailableColor(g.players) },
      ],
    }));
  const rename = (id: string, name: string) =>
    update((g) => ({ ...g, players: g.players.map((p) => (p.id === id ? { ...p, name } : p)) }));
  const remove = (id: string) =>
    update((g) => ({ ...g, players: g.players.filter((p) => p.id !== id) }));

  return (
    <div className="relative z-10 min-h-dvh flex flex-col bg-[#04081f]">
      {/* Full-bleed marquee header — the same top bar as the picker. */}
      <header className="wood-trim flex items-center justify-between px-5 sm:px-8 py-3 sm:py-4 shrink-0">
        <h1 className="font-display value-gold text-4xl sm:text-6xl tracking-wide leading-none">
          LEOPARDY!
        </h1>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="shrink-0 font-ui text-2xl text-ink-dim hover:text-gold-bright ring-1 ring-white/20 hover:bg-white/5 w-12 h-12 rounded-xl transition"
        >
          ⚙
        </button>
      </header>

      {/* Scrollable body — content flows top-down like the picker. */}
      <div className="flex-1 overflow-auto px-5 sm:px-8 py-5">
        <div className="max-w-5xl mx-auto grid gap-5 md:grid-cols-[1.5fr_1fr]">
          {/* LEFT — the game */}
          <div className="flex flex-col gap-3">
            {hasBoard ? (
              <GamePreview
                date={preview.date}
                title={preview.title}
                subtitle={preview.subtitle}
                groups={preview.groups}
                finalCategory={preview.finalCategory}
                ddCount={preview.ddCount}
                reveal={reveal}
                played={played}
              />
            ) : (
              <div className="rounded-2xl ring-2 ring-gold-bright/40 bg-black/20 p-8 grid place-items-center text-center">
                <div className="font-ui text-ink-dim text-xl">
                  No board loaded yet.
                  <br />
                  Pick a game to begin.
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onPickGame}
                className="btn-3d [--btn-ledge:#9a6a22] font-ui font-bold uppercase tracking-wider text-lg text-[#0a1046] bg-gold-bright hover:bg-gold px-6 py-3.5 rounded-xl transition"
              >
                🗂 Browse games
              </button>
              <button
                onClick={onRandom}
                className="font-ui font-bold uppercase tracking-wider text-lg text-white ring-1 ring-white/25 hover:bg-white/5 px-6 py-3.5 rounded-xl transition"
              >
                🎲 Random
              </button>
              {hasBoard && <RevealToggle value={reveal} onChange={setReveal} />}
            </div>
          </div>

          {/* RIGHT — players + start */}
          <div className="flex flex-col gap-3">
            <div className="font-clue uppercase tracking-wide text-ink-dim text-sm">Players</div>
            <div className="space-y-3">
              {game.players.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <input
                    value={p.name}
                    onChange={(e) => rename(p.id, e.target.value)}
                    className="flex-1 min-w-0 bg-black/30 rounded-lg px-4 py-3 podium-name text-2xl outline-none focus:ring-2 ring-gold-bright"
                  />
                  <button
                    onClick={() => remove(p.id)}
                    aria-label={`Remove ${p.name}`}
                    className="h-11 w-11 shrink-0 rounded-lg text-xl text-wrong bg-black/20 ring-1 ring-wrong/40 hover:bg-wrong/15 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addPlayer}
              className="w-full font-ui font-semibold text-lg text-white/70 hover:text-gold-bright border-2 border-dashed border-white/25 hover:border-gold-bright/60 hover:bg-black/15 rounded-lg px-6 py-3.5 transition"
            >
              ＋ Add player
            </button>

            <button
              onClick={onStart}
              disabled={!game.players.length || !hasBoard}
              className="btn-3d [--btn-ledge:#9a6a22] w-full font-display uppercase tracking-widest text-3xl sm:text-4xl text-[#0a1046] bg-gold-bright hover:bg-gold disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none py-6 rounded-xl"
            >
              ▶ START
            </button>
            {!game.players.length && (
              <p className="text-center font-ui text-ink-dim text-base">Add at least one player to start.</p>
            )}
            {!hasBoard && (
              <p className="text-center font-ui text-ink-dim text-base">Pick a game to start.</p>
            )}
          </div>
        </div>
      </div>

      {settingsOpen && (
        <SettingsPanel game={game} update={update} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
