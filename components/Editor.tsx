"use client";

import { useRef, useState } from "react";
import { Category, Clue, GameState, Round } from "@/lib/types";
import {
  boardRows,
  clearProgress,
  emptyCategory,
  emptyRound,
  resetScores,
} from "@/lib/game";
import {
  gameFromCSV,
  gameFromJSON,
  gameToCSV,
  downloadFile,
} from "@/lib/io";
import { SAMPLE_GAME } from "@/lib/sampleGame";

type Tab = "board" | "final" | "data";

export function Editor({
  game,
  update,
  onClose,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("board");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#04081f]/95 backdrop-blur-sm">
      <header className="flex items-center justify-between px-5 sm:px-8 py-4 border-b border-panel-edge">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-2xl value-gold">EDIT</h2>
          <input
            value={game.title}
            onChange={(e) => update((g) => ({ ...g, title: e.target.value }))}
            className="bg-transparent border-b border-panel-edge focus:border-gold outline-none font-ui font-semibold text-ink px-1 py-0.5"
          />
        </div>
        <button
          onClick={onClose}
          className="font-ui font-bold uppercase tracking-wider text-[#06351a] bg-gold-bright hover:bg-gold px-6 py-2.5 rounded-xl transition"
        >
          Done
        </button>
      </header>

      <nav className="flex gap-1 px-5 sm:px-8 pt-4">
        {(["board", "final", "data"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-ui font-medium uppercase tracking-wider text-sm px-4 py-2 rounded-t-lg transition ${
              tab === t
                ? "bg-panel text-gold-bright border-x border-t border-panel-edge"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {t === "board" ? "Board" : t === "final" ? "Final Leopardy!" : "Import / Export"}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-auto px-5 sm:px-8 py-6">
        {tab === "board" && <BoardEditor game={game} update={update} />}
        {tab === "final" && <FinalEditor game={game} update={update} />}
        {tab === "data" && <DataTab game={game} update={update} />}
      </div>
    </div>
  );
}

function BoardEditor({
  game,
  update,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
}) {
  const [ri, setRi] = useState(Math.min(game.activeRound, game.rounds.length - 1));
  const round = game.rounds[ri];

  // Mutate one category within the active round, immutably.
  const editRound = (fn: (r: Round) => Round) =>
    update((g) => {
      const rounds = [...g.rounds];
      rounds[ri] = fn(rounds[ri]);
      return { ...g, rounds };
    });

  const editCategory = (ci: number, fn: (c: Category) => Category) =>
    editRound((r) => {
      const cats = [...r.categories];
      cats[ci] = fn(cats[ci]);
      return { ...r, categories: cats };
    });

  const editClue = (ci: number, cli: number, patch: Partial<Clue>) =>
    editCategory(ci, (c) => {
      const clues = [...c.clues];
      clues[cli] = { ...clues[cli], ...patch };
      return { ...c, clues };
    });

  if (!round) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4">
        <p className="font-ui text-ink-dim">This game has no rounds yet.</p>
        <button
          onClick={() =>
            update((g) => ({
              ...g,
              rounds: [emptyRound("Leopardy!", [200, 400, 600, 800, 1000])],
              activeRound: 0,
            }))
          }
          className="font-ui font-semibold text-[#06351a] bg-gold-bright px-5 py-2.5 rounded-xl"
        >
          ＋ Add a round
        </button>
      </div>
    );
  }

  const rowValues = boardRows(round.categories).map(
    (i) => round.categories[0]?.clues[i]?.value ?? (i + 1) * 200,
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Round tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {game.rounds.map((r, i) => (
          <div key={r.id} className="flex items-center">
            <button
              onClick={() => setRi(i)}
              className={`font-clue uppercase tracking-wide text-sm px-4 py-1.5 rounded-l-full ${
                i === ri
                  ? "bg-gold-bright text-[#06351a] font-semibold"
                  : "text-ink-dim ring-1 ring-panel-edge hover:text-ink"
              }`}
            >
              {r.name}
            </button>
            <button
              onClick={() =>
                update((g) => {
                  const rounds = g.rounds.filter((_, x) => x !== i);
                  return { ...g, rounds, activeRound: 0 };
                })
              }
              aria-label={`Delete ${r.name} round`}
              className={`px-2 py-1.5 rounded-r-full text-xs ${
                i === ri ? "bg-gold text-[#06351a]" : "ring-1 ring-l-0 ring-panel-edge text-wrong"
              }`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            update((g) => ({
              ...g,
              rounds: [
                ...g.rounds,
                emptyRound(
                  g.rounds.length === 1 ? "Double Leopardy!" : `Round ${g.rounds.length + 1}`,
                  rowValues.length ? rowValues : [200, 400, 600, 800, 1000],
                ),
              ],
            }))
          }
          className="font-ui text-sm text-ink-dim hover:text-gold-bright px-3 py-1.5 rounded-full border border-dashed border-panel-edge"
        >
          ＋ Round
        </button>
      </div>

      {/* Round name */}
      <input
        value={round.name}
        onChange={(e) => editRound((r) => ({ ...r, name: e.target.value }))}
        className="bg-transparent border-b border-panel-edge focus:border-gold outline-none font-ui font-semibold text-ink px-1 py-1"
      />

      <div className="flex flex-wrap gap-4">
        {round.categories.map((cat, ci) => (
          <div key={cat.id} className="panel rounded-2xl p-4 w-full sm:w-[calc(50%-0.5rem)] space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={cat.name}
                onChange={(e) => editCategory(ci, (c) => ({ ...c, name: e.target.value }))}
                placeholder="Category name"
                className="flex-1 bg-transparent border-b border-panel-edge focus:border-gold outline-none font-clue uppercase tracking-wide text-gold-bright text-lg px-1 py-1"
              />
              <button
                onClick={() =>
                  editRound((r) => ({
                    ...r,
                    categories: r.categories.filter((_, i) => i !== ci),
                  }))
                }
                className="text-wrong text-sm px-2 py-1 rounded hover:bg-wrong/10"
              >
                Delete
              </button>
            </div>

            {cat.clues.map((clue, cli) => (
              <div key={clue.id} className="flex gap-2 items-start">
                <input
                  value={clue.value}
                  onChange={(e) => editClue(ci, cli, { value: Number(e.target.value) || 0 })}
                  className="w-16 shrink-0 bg-black/20 rounded-lg px-2 py-2 text-center value-gold font-display outline-none focus:ring-1 ring-gold"
                />
                <div className="flex-1 space-y-1.5">
                  <textarea
                    value={clue.clue}
                    onChange={(e) => editClue(ci, cli, { clue: e.target.value })}
                    rows={2}
                    placeholder="Clue"
                    className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-ui text-ink outline-none focus:ring-1 ring-gold resize-none"
                  />
                  <input
                    value={clue.answer}
                    onChange={(e) => editClue(ci, cli, { answer: e.target.value })}
                    placeholder="Answer (What is …?)"
                    className="w-full bg-black/20 rounded-lg px-3 py-2 text-sm font-ui text-correct outline-none focus:ring-1 ring-gold"
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() =>
          editRound((r) => ({ ...r, categories: [...r.categories, emptyCategory(rowValues)] }))
        }
        className="font-ui font-medium text-ink-dim hover:text-gold-bright border border-dashed border-panel-edge hover:border-gold/50 rounded-2xl px-6 py-4 w-full transition"
      >
        ＋ Add category
      </button>
    </div>
  );
}

function FinalEditor({
  game,
  update,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
}) {
  const f = game.final;
  const set = (patch: Partial<GameState["final"]>) =>
    update((g) => ({ ...g, final: { ...g.final, ...patch } }));

  return (
    <div className="max-w-2xl mx-auto panel rounded-2xl p-6 space-y-4">
      <label className="block">
        <span className="font-ui text-xs uppercase tracking-wider text-ink-dim">Category</span>
        <input
          value={f.category}
          onChange={(e) => set({ category: e.target.value })}
          className="mt-1 w-full bg-black/20 rounded-lg px-3 py-2 font-clue uppercase tracking-wide text-gold-bright outline-none focus:ring-1 ring-gold"
        />
      </label>
      <label className="block">
        <span className="font-ui text-xs uppercase tracking-wider text-ink-dim">Clue</span>
        <textarea
          value={f.clue}
          onChange={(e) => set({ clue: e.target.value })}
          rows={3}
          className="mt-1 w-full bg-black/20 rounded-lg px-3 py-2 font-ui text-ink outline-none focus:ring-1 ring-gold resize-none"
        />
      </label>
      <label className="block">
        <span className="font-ui text-xs uppercase tracking-wider text-ink-dim">Answer</span>
        <input
          value={f.answer}
          onChange={(e) => set({ answer: e.target.value })}
          className="mt-1 w-full bg-black/20 rounded-lg px-3 py-2 font-ui text-correct outline-none focus:ring-1 ring-gold"
        />
      </label>
      <label className="block w-40">
        <span className="font-ui text-xs uppercase tracking-wider text-ink-dim">Value</span>
        <input
          value={f.value}
          onChange={(e) => set({ value: Number(e.target.value) || 0 })}
          className="mt-1 w-full bg-black/20 rounded-lg px-3 py-2 value-gold font-display text-xl outline-none focus:ring-1 ring-gold"
        />
      </label>
    </div>
  );
}

function DataTab({
  game,
  update,
}: {
  game: GameState;
  update: (fn: (g: GameState) => GameState) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const applyImport = (text: string, kind: "csv" | "json") => {
    try {
      const parsed = kind === "csv" ? gameFromCSV(text) : gameFromJSON(text);
      if (!parsed.rounds?.length && !parsed.final) {
        throw new Error("No rounds or final clue found.");
      }
      update((g) => ({
        ...g,
        ...(parsed.title ? { title: parsed.title } : {}),
        ...(parsed.rounds ? { rounds: parsed.rounds, activeRound: 0 } : {}),
        ...(parsed.final ? { final: parsed.final } : {}),
        ...(parsed.players ? { players: parsed.players } : {}),
      }));
      const n = parsed.rounds?.length ?? 0;
      const cats = parsed.rounds?.reduce((s, r) => s + r.categories.length, 0) ?? 0;
      setStatus({
        ok: true,
        msg: `Imported ${n} round${n === 1 ? "" : "s"} (${cats} categories)${parsed.final ? " + Final Leopardy!" : ""}.`,
      });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Import failed." });
    }
  };

  const onFile = (file: File) => {
    const kind = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
    file.text().then((t) => applyImport(t, kind));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section className="panel rounded-2xl p-6 space-y-4">
        <h3 className="font-clue uppercase tracking-wide text-gold-bright text-lg">Import questions</h3>
        <p className="font-ui text-sm text-ink-dim">
          Load a board from a CSV or JSON file. CSV columns:{" "}
          <code className="text-ink">round, category, value, clue, answer</code>{" "}
          — use <code className="text-ink">final</code> in the round column for Final Leopardy!.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,text/csv,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="font-ui font-semibold text-[#06351a] bg-gold-bright hover:bg-gold px-5 py-2.5 rounded-xl transition"
        >
          Choose CSV / JSON file…
        </button>

        <details className="font-ui text-sm">
          <summary className="cursor-pointer text-ink-dim hover:text-ink">…or paste text</summary>
          <PasteImport onImport={applyImport} />
        </details>

        {status && (
          <p className={`font-ui text-sm ${status.ok ? "text-correct" : "text-wrong"}`}>
            {status.msg}
          </p>
        )}
      </section>

      <section className="panel rounded-2xl p-6 space-y-3">
        <h3 className="font-clue uppercase tracking-wide text-gold-bright text-lg">Export</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => downloadFile(`${slug(game.title)}.csv`, gameToCSV(game), "text/csv")}
            className="font-ui font-medium text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-2 rounded-xl transition"
          >
            Download CSV
          </button>
          <button
            onClick={() =>
              downloadFile(`${slug(game.title)}.json`, JSON.stringify(game, null, 2), "application/json")
            }
            className="font-ui font-medium text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-2 rounded-xl transition"
          >
            Download JSON
          </button>
        </div>
      </section>

      <section className="panel rounded-2xl p-6 space-y-3">
        <h3 className="font-clue uppercase tracking-wide text-gold-bright text-lg">Reset</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => update((g) => clearProgress(g))}
            className="font-ui font-medium text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-2 rounded-xl transition"
          >
            Clear board progress
          </button>
          <button
            onClick={() => update((g) => resetScores(g))}
            className="font-ui font-medium text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-2 rounded-xl transition"
          >
            Reset scores to $0
          </button>
          <button
            onClick={() => {
              if (confirm("Replace the entire board and players with the sample game?"))
                update(() => structuredClone(SAMPLE_GAME));
            }}
            className="font-ui font-medium text-wrong ring-1 ring-wrong/40 hover:bg-wrong/10 px-4 py-2 rounded-xl transition"
          >
            Load sample game
          </button>
        </div>
      </section>
    </div>
  );
}

function PasteImport({
  onImport,
}: {
  onImport: (text: string, kind: "csv" | "json") => void;
}) {
  const [text, setText] = useState("");
  const looksJson = text.trim().startsWith("{") || text.trim().startsWith("[");
  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"round,category,value,clue,answer\nleopardy,Science,200,The symbol O,What is oxygen?"}
        className="w-full bg-black/20 rounded-lg px-3 py-2 font-mono text-xs text-ink outline-none focus:ring-1 ring-gold resize-y"
      />
      <button
        onClick={() => onImport(text, looksJson ? "json" : "csv")}
        disabled={!text.trim()}
        className="font-ui font-medium text-[#06351a] bg-gold-bright disabled:opacity-40 px-4 py-2 rounded-xl transition"
      >
        Import pasted {looksJson ? "JSON" : "CSV"}
      </button>
    </div>
  );
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "leopardy";
}
