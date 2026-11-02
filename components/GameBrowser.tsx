"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GameMeta,
  GamesIndex,
  StoredGame,
  fetchIndex,
  loadGame,
  mostRecent,
  pickRandom,
  searchGames,
} from "@/lib/games";
import { DEFAULT_REVEAL_LEVEL, RevealLevel } from "@/lib/types";
import { GamePreview, RevealToggle } from "./GamePreview";

const PAGE = 300;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}, ${y}`;
}

/** Aired within the last 7 days (relative to now)? */
function isFresh(iso: string): boolean {
  const then = new Date(iso).getTime();
  return Number.isFinite(then) && Date.now() - then < 7 * 24 * 3600 * 1000;
}

export function GameBrowser({
  onLoad,
  onClose,
  playedIds,
  revealDefault,
}: {
  onLoad: (game: StoredGame, id: string) => void;
  onClose: () => void;
  playedIds: ReadonlySet<string>;
  revealDefault: RevealLevel;
}) {
  const [index, setIndex] = useState<GamesIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [hidePlayed, setHidePlayed] = useState(false);
  const [reveal, setReveal] = useState<RevealLevel>(revealDefault ?? DEFAULT_REVEAL_LEVEL);
  const [busy, setBusy] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    fetchIndex()
      .then(setIndex)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load games."));
  }, []);

  const hero = useMemo(() => (index ? mostRecent(index) : null), [index]);
  const filtered = useMemo(
    () => (index ? searchGames(index, { query: keyword, playedIds, hidePlayed }) : []),
    [index, keyword, playedIds, hidePlayed],
  );

  const pick = async (meta: GameMeta) => {
    setBusy(meta.id);
    setError(null);
    try {
      const game = await loadGame(meta);
      onLoad(game, meta.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load game.");
      setBusy(null);
    }
  };
  const random = () => {
    const m = pickRandom(filtered);
    if (m) pick(m);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#04081f]/97 backdrop-blur-sm">
      <header className="wood-trim flex items-center justify-between px-5 sm:px-8 py-3.5 gap-3 shrink-0">
        <h2 className="font-display text-2xl sm:text-3xl value-gold tracking-wide leading-none">PICK A GAME</h2>
        <button
          onClick={onClose}
          className="font-ui font-medium text-ink ring-1 ring-white/25 hover:bg-white/10 px-5 py-2.5 rounded-xl transition"
        >
          ✕ Close
        </button>
      </header>

      <div className="flex-1 overflow-auto px-5 sm:px-8 py-4 space-y-4">
        {error && <p className="font-ui text-wrong">{error}</p>}
        {!index && !error && <p className="font-ui text-ink-dim">Loading game index…</p>}

        {index && (
          <>
            {/* Hero: most recent + random */}
            <div className="grid gap-3 lg:grid-cols-[1.7fr_1fr]">
              {hero && (
                <GamePreview
                  date={formatDate(hero.date)}
                  subtitle={`Episode #${hero.ep} · ${hero.rounds} round${hero.rounds === 1 ? "" : "s"} + Final`}
                  categories={hero.cats}
                  finalCategory={hero.final}
                  ddCount={hero.dd}
                  reveal={reveal}
                  played={playedIds.has(hero.id)}
                  fresh={!playedIds.has(hero.id) && isFresh(hero.date)}
                  footer={
                    <button
                      onClick={() => pick(hero)}
                      disabled={!!busy}
                      className="btn-3d [--btn-ledge:#9a6a22] font-display uppercase tracking-wider text-xl text-[#0a1046] bg-gold-bright hover:bg-gold disabled:opacity-40 px-8 py-3 rounded-xl"
                    >
                      ▶ Play
                    </button>
                  }
                  revealControl={<RevealToggle value={reveal} onChange={setReveal} />}
                />
              )}
              <button
                onClick={random}
                disabled={!filtered.length || !!busy}
                className="btn-3d [--btn-ledge:#9a6a22] flex flex-col items-center justify-center gap-2 text-[#0a1046] bg-gold-bright hover:bg-gold disabled:opacity-40 disabled:shadow-none rounded-2xl p-6"
              >
                <span className="text-5xl">🎲</span>
                <span className="font-display uppercase tracking-wider text-2xl">Surprise me</span>
                <span className="font-ui font-semibold text-sm text-[#0a1046]/70">random from your filters</span>
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setLimit(PAGE);
                }}
                placeholder="Search a category or date… “movies”, “2019”, “July 2020”"
                className="flex-1 min-w-[220px] bg-panel border border-panel-edge rounded-lg px-4 py-2.5 font-ui text-lg text-ink outline-none focus:border-gold"
              />
              <button
                onClick={() => {
                  setHidePlayed((v) => !v);
                  setLimit(PAGE);
                }}
                className={`font-ui font-semibold text-base px-4 py-2.5 rounded-lg ring-1 transition ${
                  hidePlayed
                    ? "bg-gold-bright text-[#0a1046] ring-transparent"
                    : "text-ink-dim ring-panel-edge hover:text-ink hover:bg-white/5"
                }`}
              >
                {hidePlayed ? "☑" : "◻"} Hide played
              </button>
              <RevealToggle value={reveal} onChange={setReveal} />
            </div>

            <p className="font-ui text-sm text-ink-dim">
              {filtered.length.toLocaleString()} game{filtered.length === 1 ? "" : "s"}
              {filtered.length > limit ? ` — showing first ${limit}` : ""}
            </p>

            {/* List */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filtered.slice(0, limit).map((g) => (
                <button
                  key={g.id}
                  onClick={() => pick(g)}
                  disabled={!!busy}
                  className="text-left transition disabled:opacity-50 hover:scale-[1.01]"
                >
                  <GamePreview
                    compact
                    date={formatDate(g.date)}
                    subtitle={busy === g.id ? "loading…" : `#${g.ep} · ${g.rounds} rd${g.rounds === 1 ? "" : "s"}`}
                    categories={g.cats}
                    finalCategory={g.final}
                    ddCount={g.dd}
                    reveal={reveal}
                    played={playedIds.has(g.id)}
                  />
                </button>
              ))}
            </div>

            {filtered.length > limit && (
              <div className="flex justify-center">
                <button
                  onClick={() => setLimit((n) => n + PAGE)}
                  className="font-ui font-semibold text-ink-dim hover:text-gold-bright ring-1 ring-panel-edge hover:bg-white/5 px-6 py-2.5 rounded-xl transition"
                >
                  Show {Math.min(PAGE, filtered.length - limit).toLocaleString()} more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
