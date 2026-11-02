"use client";

import { Player } from "@/lib/types";
import { useShortcuts } from "@/lib/useShortcuts";
import { money } from "./CreditPicker";

const MEDALS = ["🥇", "🥈", "🥉"];

/** Between-round recap: shows current standings before advancing. */
export function RoundRecap({
  roundName,
  players,
  nextLabel,
  nextStarter = null,
  onContinue,
  onClose,
}: {
  roundName: string;
  players: Player[];
  nextLabel: string;
  /** Who picks first in the next round (last place, as on the show). */
  nextStarter?: string | null;
  onContinue: () => void;
  onClose: () => void;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;

  useShortcuts({ Enter: onContinue, Escape: onClose });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#04081f] gap-2 animate-pop">
      {/* Full-bleed walnut cornice — the same top bar as the picker/setup,
          announcing the round that just wrapped. */}
      <header className="wood-trim px-5 sm:px-8 py-3 sm:py-4 text-center shrink-0">
        <div className="font-clue uppercase tracking-widest text-gold/80 text-base sm:text-xl leading-none">
          End of
        </div>
        <h2 className="font-display value-gold text-4xl sm:text-6xl tracking-wide leading-none mt-1">
          {roundName}
        </h2>
      </header>

      {/* Coral-railed cabinet body holding the standings and the advance
          controls, mirroring the play screen's framing. */}
      <div className="flex-1 min-h-0 flex items-stretch justify-center gap-2 sm:gap-3 px-4 sm:px-6 pb-4">
        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 max-w-3xl flex flex-col justify-center gap-4 sm:gap-6 overflow-auto py-2">
          {/* Standings in a black frame, like the play screen's score rail, so
              the podiums sit in black gutters. */}
          <div className="bg-black rounded-lg p-2 ring-1 ring-black/60 shadow-[0_6px_20px_rgba(0,0,0,0.45)] space-y-1.5">
            {ranked.map((p, i) => {
              const winning = p.score === top && players.length > 1;
              return (
                <div
                  key={p.id}
                  className="podium px-5 sm:px-7 py-4 flex items-center gap-4 animate-rise"
                  style={{
                    animationDelay: `${i * 70}ms`,
                    outline: winning ? `3px solid var(--gold)` : undefined,
                    outlineOffset: winning ? "-3px" : undefined,
                  }}
                >
                  <span className="font-display text-3xl sm:text-4xl w-12 text-center text-white shrink-0">
                    {players.length > 1 && i < 3 ? MEDALS[i] : `${i + 1}`}
                  </span>
                  <span className="flex-1 min-w-0 podium-name text-4xl sm:text-5xl leading-none truncate">
                    {p.name}
                  </span>
                  <span
                    className={`font-display text-3xl sm:text-5xl tabular-nums shrink-0 leading-none ${
                      p.score < 0 ? "score-neg" : "score-pos"
                    }`}
                  >
                    {money(p.score)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3 shrink-0">
            {nextStarter && (
              <p className="font-ui text-xl text-white/85 text-center">
                Trailing means choosing —{" "}
                <span className="podium-name text-3xl">{nextStarter}</span>{" "}
                picks first in {nextLabel}.
              </p>
            )}
            <button
              onClick={onContinue}
              className="btn-3d [--btn-ledge:#9a6a22] font-ui font-bold uppercase tracking-wider text-2xl sm:text-3xl text-[#0a1046] bg-gold-bright hover:bg-gold px-10 py-5 rounded-xl"
            >
              Continue to {nextLabel} →
            </button>
            <button
              onClick={onClose}
              className="font-ui font-medium text-lg text-ink-dim hover:text-ink px-4 py-2 rounded-lg transition"
            >
              ← Back to board
            </button>
          </div>
        </div>
        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />
      </div>
    </div>
  );
}
