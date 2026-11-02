"use client";

import {
  DDWagerRule,
  DEFAULT_DD_WAGER_RULE,
  DEFAULT_REVEAL_LEVEL,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_WORD_REVEAL_WPM,
  GameState,
  RevealLevel,
} from "@/lib/types";
import { BoardSection } from "./BoardSection";

const DD_RULES: { value: DDWagerRule; label: string; blurb: string }[] = [
  { value: "official", label: "Official", blurb: "Min $5 · up to your score or the round's top value ($1000 / $2000)" },
  { value: "house", label: "House", blurb: "Min $100 · up to as much as you have" },
];
const WPM_MIN = 60;
const WPM_MAX = 350;
const TIMER_PRESETS = [
  { label: "Off", value: 0 }, { label: "10s", value: 10 }, { label: "15s", value: 15 },
  { label: "20s", value: 20 }, { label: "30s", value: 30 }, { label: "45s", value: 45 },
  { label: "60s", value: 60 }, { label: "90s", value: 90 },
];
const REVEAL_OPTIONS: { value: RevealLevel; label: string; blurb: string }[] = [
  { value: "blind", label: "Blind", blurb: "Show only the date — discover the categories live on the board" },
  { value: "categories", label: "Categories", blurb: "Show every round's category headers; keep Final sealed" },
  { value: "full", label: "Full", blurb: "Show categories, the Final category, and the Daily-Double count" },
];

export function SettingsPanel({
  game,
  update,
  onClose,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
  onClose: () => void;
}) {
  const timer = game.timerSeconds ?? DEFAULT_TIMER_SECONDS;
  const setTimer = (value: number) => update((g) => ({ ...g, timerSeconds: value }));
  const ddRule = game.ddWagerRule ?? DEFAULT_DD_WAGER_RULE;
  const setDdRule = (value: DDWagerRule) => update((g) => ({ ...g, ddWagerRule: value }));
  const wordReveal = game.wordReveal !== false;
  const wordRevealWpm = game.wordRevealWpm ?? DEFAULT_WORD_REVEAL_WPM;
  const setWordReveal = (on: boolean) => update((g) => ({ ...g, wordReveal: on }));
  const setWpm = (wpm: number) => update((g) => ({ ...g, wordRevealWpm: wpm }));
  const clampWpm = () => setWpm(Math.min(WPM_MAX, Math.max(WPM_MIN, wordRevealWpm || DEFAULT_WORD_REVEAL_WPM)));
  const roasts = game.negativeSuperlatives !== false;
  const setRoasts = (on: boolean) => update((g) => ({ ...g, negativeSuperlatives: on }));
  const sound = game.soundEnabled !== false;
  const setSound = (on: boolean) => update((g) => ({ ...g, soundEnabled: on }));
  const reveal = game.revealDefault ?? DEFAULT_REVEAL_LEVEL;
  const setReveal = (value: RevealLevel) => update((g) => ({ ...g, revealDefault: value }));

  const cardCls = (active: boolean) =>
    `text-left rounded-lg px-5 py-4 transition ${
      active
        ? "bg-gold-bright text-[#0a1046] shadow-[0_0_22px_rgba(231,181,59,0.45)]"
        : "text-white bg-black/20 ring-1 ring-white/15 hover:bg-black/30"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#04081f]/97 backdrop-blur-sm">
      <header className="wood-trim flex items-center justify-between px-5 sm:px-8 py-3.5 gap-3 shrink-0">
        <h2 className="font-display text-2xl sm:text-3xl value-gold tracking-wide leading-none">
          SETTINGS
        </h2>
        <button
          onClick={onClose}
          className="font-ui font-medium text-ink ring-1 ring-white/25 hover:bg-white/10 px-5 py-2.5 rounded-xl transition"
        >
          Done
        </button>
      </header>

      <div className="flex-1 overflow-auto px-5 sm:px-8 py-5 space-y-5 max-w-3xl w-full mx-auto">
        {/* Reveal default */}
        <BoardSection title="Preview reveal" aside={REVEAL_OPTIONS.find((r) => r.value === reveal)?.label}>
          <div className="grid sm:grid-cols-3 gap-3">
            {REVEAL_OPTIONS.map((r) => (
              <button key={r.value} onClick={() => setReveal(r.value)} className={cardCls(reveal === r.value)}>
                <div className="font-ui font-bold uppercase text-2xl">{r.label}</div>
                <div className={`font-ui text-base mt-0.5 ${reveal === r.value ? "text-[#0a1046]/75" : "text-ink-dim"}`}>{r.blurb}</div>
              </button>
            ))}
          </div>
        </BoardSection>

        {/* Answer timer */}
        <BoardSection title="Answer timer" aside={timer > 0 ? `${timer}s per clue` : "No timer"}>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-3">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setTimer(p.value)}
                className={`font-display tabular-nums text-2xl sm:text-3xl py-4 rounded-lg transition ${
                  timer === p.value
                    ? "bg-gold-bright text-[#0a1046] shadow-[0_0_22px_rgba(231,181,59,0.45)]"
                    : "text-white bg-black/20 ring-1 ring-white/15 hover:bg-black/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </BoardSection>

        {/* Daily Double wager */}
        <BoardSection title="Daily Double wager">
          <div className="grid sm:grid-cols-2 gap-3">
            {DD_RULES.map((r) => (
              <button key={r.value} onClick={() => setDdRule(r.value)} className={cardCls(ddRule === r.value)}>
                <div className="font-ui font-bold uppercase text-2xl">{r.label}</div>
                <div className={`font-ui text-base mt-0.5 ${ddRule === r.value ? "text-[#0a1046]/75" : "text-ink-dim"}`}>{r.blurb}</div>
              </button>
            ))}
          </div>
        </BoardSection>

        {/* Clue reveal */}
        <BoardSection title="Clue reveal" aside={wordReveal ? `${wordRevealWpm} words/min` : "Instant"}>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { value: true, label: "Word by word", blurb: "Words appear at reading speed — tap the clue to skip ahead" },
              { value: false, label: "All at once", blurb: "The whole clue appears immediately" },
            ].map((r) => (
              <button key={r.label} onClick={() => setWordReveal(r.value)} className={cardCls(wordReveal === r.value)}>
                <div className="font-ui font-bold uppercase text-2xl">{r.label}</div>
                <div className={`font-ui text-base mt-0.5 ${wordReveal === r.value ? "text-[#0a1046]/75" : "text-ink-dim"}`}>{r.blurb}</div>
              </button>
            ))}
          </div>
          {wordReveal && (
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <span className="font-ui text-lg text-white/80 shrink-0">Reading speed</span>
              <input
                type="range" min={WPM_MIN} max={WPM_MAX} step={5}
                value={Math.min(WPM_MAX, Math.max(WPM_MIN, wordRevealWpm))}
                onChange={(e) => setWpm(Number(e.target.value))}
                aria-label="Reading speed in words per minute"
                className="flex-1 min-w-40 h-2 accent-gold-bright cursor-pointer"
              />
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="text" inputMode="numeric"
                  value={wordRevealWpm === 0 ? "" : wordRevealWpm}
                  onChange={(e) => setWpm(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                  onBlur={clampWpm} onFocus={(e) => e.target.select()}
                  aria-label="Reading speed in words per minute"
                  className="w-20 bg-black/30 rounded-lg px-2 py-2 text-center font-display text-2xl value-gold outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-gold-bright"
                />
                <span className="font-ui text-base text-ink-dim">words/min</span>
              </div>
            </div>
          )}
        </BoardSection>

        {/* Superlatives */}
        <BoardSection title="Superlatives" aside={roasts ? "Positive + roasts" : "Positive only"}>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { value: false, label: "Positive only", blurb: "Every player gets a flattering, earned superlative" },
              { value: true, label: "Include roasts", blurb: "Also hand out cheeky worst-at-it awards (Brick Wall, Cold Streak…)" },
            ].map((r) => (
              <button key={r.label} onClick={() => setRoasts(r.value)} className={cardCls(roasts === r.value)}>
                <div className="font-ui font-bold uppercase text-2xl">{r.label}</div>
                <div className={`font-ui text-base mt-0.5 ${roasts === r.value ? "text-[#0a1046]/75" : "text-ink-dim"}`}>{r.blurb}</div>
              </button>
            ))}
          </div>
        </BoardSection>

        {/* Sound */}
        <BoardSection title="Sound" aside={sound ? "On" : "Off"}>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { value: true, label: "On", blurb: "Daily Double sting, Final Leopardy music, timer beep" },
              { value: false, label: "Off", blurb: "Silent — no sound effects" },
            ].map((r) => (
              <button key={r.label} onClick={() => setSound(r.value)} className={cardCls(sound === r.value)}>
                <div className="font-ui font-bold uppercase text-2xl">{r.label}</div>
                <div className={`font-ui text-base mt-0.5 ${sound === r.value ? "text-[#0a1046]/75" : "text-ink-dim"}`}>{r.blurb}</div>
              </button>
            ))}
          </div>
        </BoardSection>

        <p className="text-center font-ui text-ink-dim/70 text-base pb-4">
          ✓ These choices are saved as your default for every game.
        </p>
      </div>
    </div>
  );
}
