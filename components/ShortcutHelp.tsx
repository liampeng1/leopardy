"use client";

import { useShortcuts } from "@/lib/useShortcuts";

const GROUPS: { title: string; rows: { keys: string[]; does: string }[] }[] = [
  {
    title: "Board",
    rows: [
      { keys: ["↑", "↓", "←", "→"], does: "Move the gold highlight" },
      { keys: ["Enter"], does: "Open the highlighted clue" },
      { keys: ["?"], does: "Show / hide this help" },
    ],
  },
  {
    title: "Clue",
    rows: [
      {
        keys: ["Space", "Enter"],
        does: "Advance: skip reveal → show answer → score & close",
      },
      { keys: ["1", "–", "9"], does: "Cycle a player's verdict ✓ → ✕ → clear" },
      { keys: ["Esc"], does: "Back to the board (nothing scored)" },
    ],
  },
  {
    title: "Daily Double",
    rows: [
      { keys: ["1", "–", "9"], does: "Pick who found it" },
      { keys: ["Enter"], does: "Show the clue (works from the wager box)" },
    ],
  },
  {
    title: "Round recap",
    rows: [
      { keys: ["Enter"], does: "Continue to the next round / Final" },
      { keys: ["Esc"], does: "Back to the board" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-grid place-items-center min-w-8 h-8 px-2 rounded-md bg-black/40 ring-1 ring-white/25 font-display text-lg text-white leading-none">
      {children}
    </kbd>
  );
}

/** Keyboard shortcut reference, toggled with "?" during play. */
export function ShortcutHelp({ onClose }: { onClose: () => void }) {
  useShortcuts({ Escape: onClose, "?": onClose });

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/70 grid place-items-center p-4 animate-pop"
      onClick={onClose}
    >
      <div
        className="board-cell-quiet rounded-2xl p-6 sm:p-8 w-full max-w-2xl max-h-[90dvh] overflow-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-display value-gold text-4xl tracking-wide leading-none">
            Keyboard shortcuts
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="font-ui text-2xl text-white/70 hover:text-white h-10 w-10 grid place-items-center rounded-full hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="font-clue font-bold uppercase tracking-wide text-gold-bright/90 text-xl mb-2">
                {g.title}
              </h3>
              <ul className="space-y-2">
                {g.rows.map((r) => (
                  <li key={r.does} className="flex items-center gap-3">
                    <span className="flex items-center gap-1 shrink-0">
                      {r.keys.map((k) => (
                        <Kbd key={k}>{k}</Kbd>
                      ))}
                    </span>
                    <span className="font-ui text-lg text-white/85">
                      {r.does}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
