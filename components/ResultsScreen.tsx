"use client";

import { ReactNode, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { GameState } from "@/lib/types";
import {
  computeBiggestWipeout,
  computeCategoryBreakdown,
  computeGroupAccuracy,
  computeRoundBreakdown,
  computeStats,
  computeSuperlatives,
} from "@/lib/game";
import { computePlayerAwards } from "@/lib/awards";
import { money } from "./CreditPicker";
import { ScoreChart } from "./ScoreChart";

const MEDALS = ["🥇", "🥈", "🥉"];

export function ResultsScreen({
  game,
  onNewGame,
}: {
  game: GameState;
  onNewGame: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Render the results to a PNG and hand it to the OS share sheet (iMessage,
  // Mail, AirDrop…). Falls back to a direct download where the browser can't
  // share files (e.g. desktop Chrome).
  const shareResults = async () => {
    if (!contentRef.current || saving) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(contentRef.current, {
        pixelRatio: 2,
        backgroundColor: "#04081f",
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${slug(game.title)}-results.png`, {
        type: "image/png",
      });
      const canShareFiles =
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: "Leopardy! results",
          text: `${game.title} — final results`,
        });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
    } catch {
      /* share cancelled or export failed — ignore */
    } finally {
      setSaving(false);
    }
  };

  const stats = useMemo(() => computeStats(game), [game]);
  const ranked = useMemo(
    () => [...game.players].sort((a, b) => b.score - a.score),
    [game.players],
  );
  const statFor = (id: string) => stats.find((s) => s.player.id === id);
  const topScore = ranked[0]?.score ?? 0;
  const superlatives = useMemo(() => computeSuperlatives(game), [game]);
  const awards = useMemo(() => computePlayerAwards(game), [game]);
  const awardFor = (id: string) => awards.find((a) => a.player.id === id);
  const roundBreakdown = useMemo(() => computeRoundBreakdown(game), [game]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(game), [game]);
  const groupAccuracy = useMemo(() => computeGroupAccuracy(game), [game]);
  const wipeout = useMemo(() => computeBiggestWipeout(game), [game]);

  return (
    <div className="relative z-10 min-h-dvh flex flex-col bg-[#04081f]">
      {/* Full-bleed header — the same top bar as the picker/setup, with the
          share + new-game actions (kept outside the exported content). */}
      <header className="wood-trim flex items-center justify-between gap-3 px-5 sm:px-8 py-3 sm:py-4 shrink-0">
        <div className="min-w-0">
          <h1 className="font-display value-gold text-3xl sm:text-5xl tracking-wide leading-none">
            FINAL RESULTS
          </h1>
          <p className="font-ui text-ink-dim text-sm sm:text-base truncate mt-0.5">
            {game.title}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={shareResults}
            disabled={saving}
            className="btn-3d [--btn-ledge:#9a6a22] font-ui font-bold uppercase tracking-wider text-base sm:text-xl text-[#0a1046] bg-gold-bright hover:bg-gold disabled:opacity-60 disabled:shadow-none px-6 sm:px-8 py-3 sm:py-4 rounded-xl"
          >
            {saving ? "Saving…" : "⬆ Share"}
          </button>
          <button
            onClick={onNewGame}
            className="btn-3d [--btn-ledge:#03061f] font-ui font-bold uppercase tracking-wider text-base sm:text-xl text-white bg-[#0a1046] hover:bg-[#131c63] px-5 sm:px-7 py-3 sm:py-4 rounded-xl"
          >
            ▶ New Game
          </button>
        </div>
      </header>

      {/* Scrollable body; the ref'd block is what Share/Download captures. */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 py-4">
        <div ref={contentRef} className="mx-auto max-w-[1400px] space-y-4">
          {/* Podium strip — winners across the top, leader outlined in gold */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((p, i) => {
              const s = statFor(p.id);
              const isWinner = p.score === topScore && game.players.length > 1;
              return (
                <div
                  key={p.id}
                  className="podium px-5 py-4 flex flex-col gap-1.5 animate-rise"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    outline: isWinner ? "3px solid var(--gold)" : undefined,
                    outlineOffset: isWinner ? "-3px" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl sm:text-4xl text-white shrink-0">
                      {game.players.length > 1 && i < 3 ? MEDALS[i] : `${i + 1}`}
                    </span>
                    <span className="podium-name text-white text-3xl sm:text-4xl truncate min-w-0 leading-none">
                      {p.name}
                    </span>
                  </div>
                  <div
                    className={`font-display tabular-nums text-4xl sm:text-5xl leading-none ${
                      p.score < 0 ? "score-neg" : "score-pos"
                    }`}
                  >
                    {money(p.score)}
                  </div>
                  {s && s.answered > 0 && (
                    <div className="font-ui text-white/70 text-sm sm:text-base">
                      <span className="text-correct font-semibold">{s.correct} ✓</span>
                      {"  ·  "}
                      <span className="text-wrong font-semibold">{s.wrong} ✕</span>
                      {"  ·  "}
                      {Math.round(s.accuracy * 100)}%
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Score progression — the hero graph, full width */}
          {game.history.length > 0 && (
            <div className="board-cell-quiet rounded-xl overflow-hidden p-2">
              <ScoreChart game={game} />
            </div>
          )}

          {/* Detail tiles — masonry columns spread across the width */}
          {game.history.length > 0 && (
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-3">
              {groupAccuracy.answered > 0 && (
                <div className="mb-3 break-inside-avoid board-cell-quiet rounded-xl p-5 flex items-center gap-4">
                  <span className="text-4xl shrink-0" aria-hidden>
                    🎯
                  </span>
                  <div className="min-w-0">
                    <div className="font-display value-gold text-2xl tracking-wide leading-none">
                      As a group
                    </div>
                    <div className="font-ui text-lg text-white/90 mt-1">
                      <b className="text-correct">{groupAccuracy.correct}</b> of{" "}
                      {groupAccuracy.answered} correct{" "}
                      <span className="text-ink-dim">
                        ({Math.round(groupAccuracy.accuracy * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {wipeout && (
                <div className="mb-3 break-inside-avoid board-cell-quiet rounded-xl p-5 flex items-center gap-4">
                  <span className="text-4xl shrink-0" aria-hidden>
                    🪦
                  </span>
                  <div className="min-w-0">
                    <div className="font-display value-gold text-2xl tracking-wide leading-none">
                      Biggest Wipeout
                    </div>
                    <div className="font-ui text-lg text-white/90 mt-1">
                      <b className="text-wrong">{wipeout.wrongCount} players</b> missed{" "}
                      <span className="text-white">{wipeout.entry.category}</span>{" "}
                      <span className="text-ink-dim">(−{money(wipeout.pointsLost)})</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-3 break-inside-avoid">
              <Tile title="Awards">
                <ul className="space-y-2 font-ui text-lg text-white/90">
                  {/* One unique award per player, in podium order. */}
                  {ranked.map((p) => {
                    const a = awardFor(p.id);
                    if (!a) return null;
                    return (
                      <li key={p.id}>
                        {a.emoji}{" "}
                        <b className={a.negative ? "text-wrong" : "text-gold-bright"}>
                          {a.title}
                        </b>{" "}
                        — <b className="podium-name text-2xl">{p.name}</b>
                        <span className="text-ink-dim">, {a.detail}</span>
                      </li>
                    );
                  })}
                  {superlatives.ddRecord && (
                    <li>
                      ◆ Daily Doubles — {superlatives.ddRecord.right} right,{" "}
                      {superlatives.ddRecord.wrong} wrong,{" "}
                      <span
                        className={
                          superlatives.ddRecord.net < 0
                            ? "text-wrong"
                            : "text-correct"
                        }
                      >
                        net {superlatives.ddRecord.net < 0 ? "−" : "+"}
                        {money(Math.abs(superlatives.ddRecord.net))}
                      </span>
                    </li>
                  )}
                  <li>🔄 Lead changes — {superlatives.leadChanges}</li>
                </ul>
              </Tile>
              </div>

              <div className="mb-3 break-inside-avoid">
              <Tile title="Accuracy">
                <div className="space-y-2.5">
                  {ranked.map((p) => {
                    const s = statFor(p.id);
                    if (!s || !s.answered) return null;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="podium-name text-2xl w-32 truncate shrink-0">
                          {p.name}
                        </span>
                        <div className="flex-1 h-4 rounded-full bg-black/40 overflow-hidden flex">
                          <div
                            className="bg-correct h-full"
                            style={{ width: `${(s.correct / s.answered) * 100}%` }}
                          />
                          <div
                            className="bg-wrong h-full"
                            style={{ width: `${(s.wrong / s.answered) * 100}%` }}
                          />
                        </div>
                        <span className="font-ui text-lg text-white/85 shrink-0 tabular-nums">
                          <span className="text-correct font-bold">{s.correct}✓</span>{" "}
                          <span className="text-wrong font-bold">{s.wrong}✕</span>{" "}
                          {Math.round(s.accuracy * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Tile>
              </div>

              <div className="mb-3 break-inside-avoid">
              <Tile title="Round by round">
                <div className="space-y-3">
                  {roundBreakdown.perPlayer.map(({ player, nets }) => (
                    <div key={player.id}>
                      <span className="podium-name text-2xl">{player.name}</span>
                      <div className="mt-1 flex gap-2">
                        {roundBreakdown.rounds.map((name, i) => (
                          <div
                            key={name}
                            className="flex-1 bg-black/40 rounded-lg px-3 py-2 text-center"
                          >
                            <div
                              className={`font-display text-xl tabular-nums ${
                                nets[i] < 0 ? "score-neg" : "value-gold"
                              }`}
                            >
                              {nets[i] < 0 ? "−" : ""}
                              {money(Math.abs(nets[i]))}
                            </div>
                            <div className="font-ui text-xs uppercase tracking-wider text-white/55 mt-0.5 truncate">
                              {name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Tile>
              </div>

              <div className="mb-3 break-inside-avoid">
              <Tile title="Categories">
                <div className="space-y-2.5 font-ui text-lg text-white/90">
                  {categoryBreakdown.map(({ player, best, worst }) => {
                    if (!best) return null;
                    return (
                      <div key={player.id}>
                        <span className="podium-name text-2xl">{player.name}</span>
                        <div className="text-base mt-0.5">
                          <span className="text-correct">▲ {best.category}</span>{" "}
                          <span className="text-ink-dim">({money(best.net)})</span>
                          {worst && (
                            <>
                              {"   "}
                              <span className="text-wrong">▼ {worst.category}</span>{" "}
                              <span className="text-ink-dim">
                                ({worst.net < 0 ? "−" : ""}
                                {money(Math.abs(worst.net))})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Tile>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** A board-cell metric tile with a small gold title. */
function Tile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="board-cell-quiet rounded-xl p-5">
      <h3 className="font-display value-gold text-2xl tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "leopardy";
}

