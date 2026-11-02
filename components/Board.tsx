"use client";

import { Category } from "@/lib/types";
import { BoardPos, boardRows } from "@/lib/game";

export function Board({
  categories,
  onPick,
  selected = null,
}: {
  categories: Category[];
  onPick: (clueId: string) => void;
  /** Keyboard-selected cell, outlined in gold (null = no highlight). */
  selected?: BoardPos | null;
}) {
  const rows = boardRows(categories);

  return (
    <div
      className="grid gap-2 sm:gap-2.5 h-full"
      style={{
        gridTemplateColumns: `repeat(${categories.length}, minmax(0, 1fr))`,
        gridTemplateRows: `minmax(0, 1.2fr) repeat(${rows.length}, minmax(0, 1fr))`,
      }}
    >
      {categories.map((cat) => {
        // Size each header so it fits the cell on both axes while staying as
        // large (readable) as possible:
        //  - width  cap: the longest single word must fit on one line, so a
        //    name like "VOCABULARY" shrinks instead of breaking mid-word.
        //  - height cap: a wordy name like "THE COUNTRY THAT BORDERS BOTH"
        //    wraps to several lines, so we shrink it by total length so those
        //    lines don't spill out the top and bottom of the cell.
        const longestWord = cat.name
          .split(/\s+/)
          .reduce((m, w) => Math.max(m, w.length), 1);
        const totalChars = cat.name.replace(/\s+/g, "").length || 1;
        // Anton is heavily condensed (~0.46em advance), so the longest word fits
        // far more width than a default font — size up aggressively to fill the
        // cell the way the real board does, capping so short names stay sane.
        const widthCap = Math.min(22, 180 / longestWord); // cqw
        const heightCap = Math.min(38, 470 / totalChars); // cqh
        return (
          <div
            key={cat.id}
            className="cat-header rounded-md flex items-center justify-center text-center px-1.5 py-0.5 mb-1.5 sm:mb-2 overflow-hidden [container-type:size]"
          >
            <span
              className="font-display uppercase tracking-wide text-white text-board-shadow leading-[1.04] min-w-0 hyphens-auto [overflow-wrap:anywhere]"
              style={{
                fontSize: `min(${heightCap.toFixed(2)}cqh, ${widthCap.toFixed(2)}cqw)`,
              }}
            >
              {cat.name}
            </span>
          </div>
        );
      })}

      {rows.map((rowIdx) =>
        categories.map((cat, ci) => {
          const clue = cat.clues[rowIdx];
          if (!clue) {
            return <div key={`${cat.id}-${rowIdx}`} className="rounded-md" />;
          }
          if (clue.done) {
            // Used cell: blank board-blue, like the real board after a clue
            // is played.
            return (
              <div key={clue.id} className="board-surface rounded-md" />
            );
          }
          const isSelected =
            !!selected && selected.col === ci && selected.row === rowIdx;
          return (
            <button
              key={clue.id}
              onClick={() => onPick(clue.id)}
              className="clue-cell rounded-md flex items-center justify-center overflow-hidden transition [container-type:size]"
              style={
                isSelected
                  ? { outline: "3px solid var(--gold)", outlineOffset: "-3px" }
                  : undefined
              }
            >
              <span className="value-gold board-value font-display leading-none [font-size:min(58cqh,28cqw)]">
                ${clue.value}
              </span>
            </button>
          );
        }),
      )}
    </div>
  );
}
