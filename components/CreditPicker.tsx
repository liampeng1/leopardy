"use client";

import { Player, Verdict } from "@/lib/types";

export function CreditPicker({
  players,
  value,
  verdicts,
  onChange,
}: {
  players: Player[];
  value: number;
  verdicts: Record<string, Verdict>;
  onChange: (playerId: string, verdict: Verdict) => void;
}) {
  if (players.length === 0) {
    return (
      <p className="text-center text-ink-dim font-ui text-xl">
        No players yet — add some on the setup screen.
      </p>
    );
  }

  // Lay players out on a uniform grid (max 4 per row) so every card is the
  // same size even when they wrap onto multiple rows.
  const cols = Math.ceil(players.length / Math.ceil(players.length / 4));

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {players.map((p, i) => {
        const v = verdicts[p.id] ?? null;
        const delta = v === "correct" ? value : v === "wrong" ? -value : 0;
        const preview = p.score + delta;
        return (
          <div
            key={p.id}
            className="podium px-5 py-2.5 flex items-center gap-4 flex-1 min-w-[300px]"
            style={{
              outline:
                v === "correct"
                  ? "3px solid var(--gold)"
                  : v === "wrong"
                    ? "3px solid var(--wrong)"
                    : undefined,
              outlineOffset: "-3px",
            }}
          >
            {/* Keyboard key for this player (1–9 cycles ✓ → ✕ → clear) */}
            {i < 9 && (
              <span className="shrink-0 h-8 w-8 grid place-items-center rounded-md bg-black/40 ring-1 ring-white/25 font-display text-xl text-white/85">
                {i + 1}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="podium-name truncate text-4xl leading-none">
                {p.name}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`font-display text-3xl tabular-nums leading-none ${
                    delta > 0
                      ? "text-gold-bright"
                      : delta < 0
                        ? "text-wrong"
                        : "value-gold"
                  }`}
                >
                  {money(preview)}
                </span>
                {delta !== 0 && (
                  <span className="text-lg font-ui font-semibold text-white/70">
                    {delta > 0 ? "+" : "−"}
                    {money(Math.abs(delta))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                aria-label={`${p.name} correct`}
                onClick={() => onChange(p.id, v === "correct" ? null : "correct")}
                className={`h-16 w-16 rounded-lg border-2 border-black text-[2.6rem] font-black leading-none grid place-items-center btn-3d [--btn-ledge:#00000088] ${
                  v === "correct"
                    ? "bg-gold-bright text-[#0a1046]"
                    : "bg-[#060a36] text-gold-bright hover:bg-[#0c1150]"
                }`}
              >
                ✓
              </button>
              <button
                aria-label={`${p.name} wrong`}
                onClick={() => onChange(p.id, v === "wrong" ? null : "wrong")}
                className={`h-16 w-16 rounded-lg border-2 border-black text-[2.6rem] font-black leading-none grid place-items-center btn-3d [--btn-ledge:#00000088] ${
                  v === "wrong"
                    ? "bg-wrong text-white"
                    : "bg-[#060a36] text-wrong hover:bg-[#0c1150]"
                }`}
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US")}`;
}
