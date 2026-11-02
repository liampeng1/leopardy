"use client";

import { ReactNode } from "react";
import { RevealLevel } from "@/lib/types";
import { revealed } from "@/lib/games";

export interface GamePreviewProps {
  /** Big line, e.g. "July 23, 2026". Falls back to `title` when absent. */
  date?: string;
  /** Small line, e.g. "Episode #9142 · 2 rounds + Final". */
  subtitle?: string;
  /** Whole title when there is no parsed date (setup fallback). */
  title?: string;
  /** Flat category names (picker cards / hero). */
  categories?: string[];
  /** Optional round-grouped categories (setup, which has full rounds). */
  groups?: { label: string; cats: string[] }[];
  finalCategory?: string;
  ddCount?: number;
  reveal: RevealLevel;
  /** "played" (session) / "fresh" (aired within ~7 days) badges. */
  played?: boolean;
  fresh?: boolean;
  /** Compact list-card variant: smaller type, no round labels, hero omitted. */
  compact?: boolean;
  /** Optional per-card reveal control + play/footer slot. */
  revealControl?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const REVEAL_ORDER: RevealLevel[] = ["blind", "categories", "full"];

/** A small segmented Blind/Categories/Full control (optional helper). */
export function RevealToggle({
  value,
  onChange,
}: {
  value: RevealLevel;
  onChange: (r: RevealLevel) => void;
}) {
  const labels: Record<RevealLevel, string> = {
    blind: "Blind",
    categories: "Categories",
    full: "Full",
  };
  return (
    <div className="inline-flex bg-black/40 ring-1 ring-panel-edge rounded-xl p-1 gap-1">
      {REVEAL_ORDER.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`font-ui font-semibold text-sm px-3 py-1.5 rounded-lg transition ${
            value === r
              ? "bg-gold-bright text-[#0a1046]"
              : "text-ink-dim hover:text-ink"
          }`}
        >
          {labels[r]}
        </button>
      ))}
    </div>
  );
}

function Chips({ cats }: { cats: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {cats.map((c, i) => (
        <span
          key={i}
          className="font-clue uppercase tracking-wide text-xs text-gold-bright/85 bg-black/30 ring-1 ring-gold/25 rounded px-2 py-1"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

export function GamePreview({
  date,
  subtitle,
  title,
  categories,
  groups,
  finalCategory,
  ddCount,
  reveal,
  played,
  fresh,
  compact = false,
  revealControl,
  footer,
  className = "",
}: GamePreviewProps) {
  const show = revealed(reveal);
  const flatCats = groups ? groups.flatMap((g) => g.cats) : categories ?? [];

  return (
    <div
      className={`relative rounded-2xl ring-2 ring-gold-bright/70 bg-[radial-gradient(130%_110%_at_50%_0%,#101a6b_0%,#050a30_78%)] shadow-[0_0_28px_rgba(242,181,59,0.18)] ${
        compact ? "p-3" : "p-4 sm:p-5"
      } ${className}`}
    >
      {/* Header row: date/title + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-display value-gold leading-none truncate ${
              compact ? "text-xl" : "text-3xl sm:text-4xl"
            }`}
          >
            {date ?? title ?? "—"}
          </div>
          {subtitle && (
            <div className="font-ui text-ink-dim text-sm mt-1">{subtitle}</div>
          )}
        </div>
        {played ? (
          <span className="shrink-0 inline-flex items-center gap-1 font-ui font-bold text-xs text-correct bg-correct/15 ring-1 ring-correct/50 rounded-full px-2.5 py-1">
            ✓ Played
          </span>
        ) : fresh ? (
          <span className="shrink-0 inline-flex items-center gap-1 font-ui font-bold text-xs text-gold-bright bg-gold/15 ring-1 ring-gold/50 rounded-full px-2.5 py-1">
            ✦ Fresh
          </span>
        ) : null}
      </div>

      {/* Body: reveal-dependent */}
      <div className={compact ? "mt-2" : "mt-3"}>
        {!show.cats ? (
          <div className="font-ui text-ink-dim text-sm italic">
            Categories hidden — go in blind.
          </div>
        ) : groups && !compact ? (
          <div className="space-y-2.5">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="font-ui text-ink-dim/80 text-[11px] uppercase tracking-[0.15em] mb-1">
                  {g.label}
                </div>
                <Chips cats={g.cats} />
              </div>
            ))}
            <div>
              <div className="font-ui text-ink-dim/80 text-[11px] uppercase tracking-[0.15em] mb-1">
                Final
              </div>
              {show.final && finalCategory ? (
                <Chips cats={[finalCategory]} />
              ) : (
                <span className="font-ui text-ink-dim text-xs bg-black/30 border border-dashed border-panel-edge rounded px-3 py-1">
                  🔒 Sealed until you play
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Chips cats={flatCats} />
            {show.final && finalCategory ? (
              <div className="font-clue uppercase tracking-wide text-xs text-gold-bright bg-black/30 ring-1 ring-panel-edge rounded px-2 py-1 inline-block">
                Final · {finalCategory}
              </div>
            ) : (
              <span className="font-ui text-ink-dim text-xs">🔒 Final sealed</span>
            )}
          </div>
        )}
      </div>

      {show.dd && typeof ddCount === "number" && (
        <div className="mt-2 font-ui text-ink-dim text-xs">
          🎯 {ddCount} Daily Double{ddCount === 1 ? "" : "s"}
        </div>
      )}

      {(revealControl || footer) && (
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {footer}
          {revealControl && <div className="ml-auto">{revealControl}</div>}
        </div>
      )}
    </div>
  );
}
