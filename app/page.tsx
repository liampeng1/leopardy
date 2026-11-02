"use client";

import { useState } from "react";
import { useGame } from "@/lib/useGame";
import {
  DEFAULT_DD_WAGER_RULE,
  DEFAULT_REVEAL_LEVEL,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_WORD_REVEAL_WPM,
  GameState,
  Phase,
  Verdict,
} from "@/lib/types";
import { fetchIndex, loadGame as fetchGame, pickRandom } from "@/lib/games";

const soundOn = (g: GameState) => g.soundEnabled !== false;
import {
  BoardPos,
  clearProgress,
  findClue,
  firstAvailableColor,
  lowestScorer,
  markClueDone,
  nextCell,
  normalizeGame,
  resetScores,
  roundMaxValue,
  scoreDeltas,
  uid,
} from "@/lib/game";
import { useShortcuts } from "@/lib/useShortcuts";
import { ShortcutHelp } from "@/components/ShortcutHelp";
import { Board } from "@/components/Board";
import { Scoreboard } from "@/components/Scoreboard";
import { ClueStage } from "@/components/ClueStage";
import { Editor } from "@/components/Editor";
import { GameBrowser } from "@/components/GameBrowser";
import { SettingsPanel } from "@/components/SettingsPanel";
import { SetupScreen } from "@/components/SetupScreen";
import { ResultsScreen } from "@/components/ResultsScreen";
import { RoundRecap } from "@/components/RoundRecap";

export default function Home() {
  const { game, update, hydrated } = useGame();
  const [openClueId, setOpenClueId] = useState<string | null>(null);
  const [finalOpen, setFinalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [tiebreaker, setTiebreaker] = useState<string | null>(null);
  const [roundEndOpen, setRoundEndOpen] = useState(false);
  // Mid-game settings (change timer/reading speed during play)
  // and the quit-confirm sheet (quitting was near-impossible).
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quitConfirm, setQuitConfirm] = useState(false);
  // Keyboard: board cell highlight (null = hidden) and the ? help overlay.
  const [boardSel, setBoardSel] = useState<BoardPos | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  // Games played THIS SESSION (resets on reload). Session-only by design.
  const [playedIds, setPlayedIds] = useState<Set<string>>(new Set());
  // The id of the currently loaded game, so we can mark it played on START.
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const open = openClueId ? findClue(game.rounds, openClueId) : null;
  const round = game.rounds[game.activeRound];

  const setPhase = (phase: Phase) => update((g) => ({ ...g, phase }));

  /* --- clue scoring (records history) --- */
  const applyClue = (verdicts: Record<string, Verdict>, stake: number) => {
    if (!open) return;
    const { clue, round: r, category } = open;
    // Board control: the correct responder picks next. If multiple are
    // right, the underdog rule applies — the lowest post-clue scorer among
    // them takes the board (matching the between-rounds trailing-player
    // rule). If nobody's right, control is unchanged.
    const scored = scoreDeltas(game.players, verdicts, stake);
    const correctAfter = scored.filter((p) => verdicts[p.id] === "correct");
    let nextControl = game.control ?? null;
    let viaTiebreak = false;
    if (correctAfter.length === 1) nextControl = correctAfter[0].id;
    else if (correctAfter.length > 1) {
      nextControl = lowestScorer(correctAfter)?.id ?? correctAfter[0].id;
      viaTiebreak = true;
    }
    update((g) => ({
      ...g,
      control: nextControl,
      players: scoreDeltas(g.players, verdicts, stake),
      rounds: markClueDone(g.rounds, clue.id, true),
      history: [
        ...g.history,
        {
          id: clue.id,
          roundName: r.name,
          category: category.name,
          value: stake,
          clue: clue.clue,
          answer: clue.answer,
          isFinal: false,
          dd: !!clue.dd,
          verdicts,
        },
      ],
    }));
    if (viaTiebreak && nextControl) {
      const name = game.players.find((p) => p.id === nextControl)?.name ?? "";
      setTiebreaker(name);
      window.setTimeout(() => setTiebreaker(null), 4000);
    }
    // When the last clue of the round is answered, auto-show the round recap.
    const roundNowComplete = r.categories.every((c) =>
      c.clues.every((cl) => cl.done || cl.id === clue.id),
    );
    if (roundNowComplete) {
      window.setTimeout(() => setRoundEndOpen(true), 350);
    }
    setOpenClueId(null);
  };

  const applyFinal = (verdicts: Record<string, Verdict>) => {
    update((g) => ({
      ...g,
      players: scoreDeltas(g.players, verdicts, g.final.value),
      final: { ...g.final, done: true },
      history: [
        ...g.history,
        {
          id: "final",
          roundName: "Final Leopardy!",
          category: g.final.category,
          value: g.final.value,
          clue: g.final.clue,
          answer: g.final.answer,
          isFinal: true,
          dd: false,
          verdicts,
        },
      ],
      phase: "results",
    }));
    setFinalOpen(false);
  };

  /* --- load a real / imported game; keep players, timer, preserve phase --- */
  const loadGame = (partial: Partial<GameState>, id?: string) => {
    update((g) => {
      const merged = normalizeGame(
        {
          ...partial,
          players: g.players,
          phase: g.phase,
          // Keep the game master's setup choices across game loads, unless the
          // imported file explicitly carries its own values.
          timerSeconds: partial.timerSeconds ?? g.timerSeconds,
          ddWagerRule: partial.ddWagerRule ?? g.ddWagerRule,
          wordReveal: partial.wordReveal ?? g.wordReveal,
          wordRevealWpm: partial.wordRevealWpm ?? g.wordRevealWpm,
          negativeSuperlatives:
            partial.negativeSuperlatives ?? g.negativeSuperlatives,
          soundEnabled: partial.soundEnabled ?? g.soundEnabled,
          revealDefault: partial.revealDefault ?? g.revealDefault,
        },
        g.players,
      );
      return clearProgress(resetScores(merged));
    });
    setLoadedId(id ?? null);
    setBrowsing(false);
    setOpenClueId(null);
    setFinalOpen(false);
    setBoardSel(null);
  };

  /* --- setup "Random": pick a random game straight from the index --- */
  const loadRandomGame = async () => {
    try {
      const index = await fetchIndex();
      const meta = pickRandom(index.games);
      if (!meta) return;
      const game = await fetchGame(meta);
      loadGame(game, meta.id);
    } catch {
      /* index unavailable — leave the current board in place */
    }
  };

  /* --- flow transitions --- */
  const startGame = () => {
    if (loadedId) setPlayedIds((prev) => new Set(prev).add(loadedId));
    update((g) => ({ ...clearProgress(resetScores(g)), phase: "play" }));
  };
  // Back to setup with the last game's settings (players, timer, board) so the
  // game master can tweak them or pick a different game, then start fresh.
  const newGame = () => {
    setPhase("setup");
    setEditing(false);
  };
  // Quit mid-game: confirmed via the sheet, then straight back to setup with
  // every play overlay dismissed.
  const quitGame = () => {
    setQuitConfirm(false);
    setOpenClueId(null);
    setFinalOpen(false);
    setRoundEndOpen(false);
    setBoardSel(null);
    newGame();
  };

  /* --- player management (used by in-play scoreboard) --- */
  const addPlayer = () =>
    update((g) => ({
      ...g,
      players: [
        ...g.players,
        {
          id: uid("p"),
          name: `Player ${g.players.length + 1}`,
          score: 0,
          color: firstAvailableColor(g.players),
        },
      ],
    }));
  const renamePlayer = (id: string, name: string) =>
    update((g) => ({
      ...g,
      players: g.players.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  const removePlayer = (id: string) =>
    update((g) => ({ ...g, players: g.players.filter((p) => p.id !== id) }));
  const adjustPlayer = (id: string, delta: number) =>
    update((g) => ({
      ...g,
      players: g.players.map((p) =>
        p.id === id ? { ...p, score: p.score + delta } : p,
      ),
    }));

  const setActiveRound = (i: number) => {
    update((g) => ({ ...g, activeRound: i }));
    setBoardSel(null);
  };

  /* --- board keyboard navigation (play screen, nothing open on top) --- */
  const overlayOpen =
    !!open ||
    finalOpen ||
    editing ||
    browsing ||
    roundEndOpen ||
    helpOpen ||
    settingsOpen ||
    quitConfirm;
  const move = (dir: "up" | "down" | "left" | "right") =>
    setBoardSel(nextCell(round?.categories ?? [], boardSel, dir));
  const openSelected = () => {
    const clue = boardSel
      ? round?.categories[boardSel.col]?.clues[boardSel.row]
      : null;
    if (clue && !clue.done) setOpenClueId(clue.id);
  };
  useShortcuts(
    {
      ArrowUp: () => move("up"),
      ArrowDown: () => move("down"),
      ArrowLeft: () => move("left"),
      ArrowRight: () => move("right"),
      Enter: openSelected,
      " ": openSelected,
      "?": () => setHelpOpen(true),
    },
    game.phase === "play" && !overlayOpen,
  );

  const toggleFullscreen = () => {
    // Safari (the likely AirPlay browser) only exposes the webkit-prefixed
    // API, and requestFullscreen rejects if not user-initiated — guard both.
    const doc = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => void;
    };
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const active = doc.fullscreenElement ?? doc.webkitFullscreenElement;
    if (active) {
      (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
    } else {
      const req = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
      try {
        const r = req?.();
        if (r && typeof (r as Promise<void>).catch === "function") {
          (r as Promise<void>).catch(() => {});
        }
      } catch {
        /* fullscreen unavailable — ignore */
      }
    }
  };

  if (!hydrated) {
    return <main className="min-h-dvh" />;
  }

  /* ---------------- SETUP ---------------- */
  if (game.phase === "setup") {
    return (
      <>
        <SetupScreen
          game={game}
          update={update}
          onPickGame={() => setBrowsing(true)}
          onRandom={loadRandomGame}
          onStart={startGame}
          played={!!loadedId && playedIds.has(loadedId)}
        />
        {browsing && (
          <GameBrowser
            onLoad={loadGame}
            onClose={() => setBrowsing(false)}
            playedIds={playedIds}
            revealDefault={game.revealDefault ?? DEFAULT_REVEAL_LEVEL}
          />
        )}
      </>
    );
  }

  /* ---------------- RESULTS ---------------- */
  if (game.phase === "results") {
    return (
      <>
        <ResultsScreen game={game} onNewGame={newGame} />
        {browsing && (
          <GameBrowser
            onLoad={loadGame}
            onClose={() => setBrowsing(false)}
            playedIds={playedIds}
            revealDefault={game.revealDefault ?? DEFAULT_REVEAL_LEVEL}
          />
        )}
      </>
    );
  }

  /* ---------------- PLAY ---------------- */
  return (
    <main className="relative z-10 flex flex-col h-dvh max-h-dvh p-2 sm:p-3 gap-2">
      {/* Top bar — title, round progress, and actions on a single row.
          Styled as the set's dark-walnut cornice. */}
      <header className="wood-trim rounded-b-xl px-4 py-2.5 flex items-center gap-3 shrink-0">
        <h1 className="font-display text-2xl sm:text-4xl value-gold tracking-wide leading-none min-w-0 truncate">
          {game.title}
        </h1>

        {/* Round progress (non-clickable) + manual advance */}
        <div className="flex-1 flex items-center justify-center gap-2 flex-wrap min-w-0">
          {game.rounds.map((r, i) => (
            <span
              key={r.id}
              className={`font-clue uppercase tracking-wide text-sm sm:text-base px-4 py-1.5 rounded-full ${
                i === game.activeRound
                  ? "bg-gold-bright text-[#0a1046] font-bold"
                  : i < game.activeRound
                    ? "text-ink-dim ring-1 ring-panel-edge"
                    : "text-ink-dim/50 ring-1 ring-panel-edge/50"
              }`}
            >
              {r.name}
            </span>
          ))}
          <span
            className={`font-clue uppercase tracking-wide text-sm sm:text-base px-4 py-1.5 rounded-full ${
              game.final.done
                ? "text-ink-dim ring-1 ring-panel-edge"
                : "text-ink-dim/50 ring-1 ring-panel-edge/50"
            }`}
          >
            Final
          </span>
          <button
            onClick={() => setRoundEndOpen(true)}
            className="font-ui font-semibold text-sm text-ink-dim hover:text-gold-bright ring-1 ring-panel-edge hover:bg-white/5 px-4 py-1.5 rounded-full transition ml-2"
          >
            End round ▸
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPhase("results")}
            className="font-ui font-medium text-base text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-3 rounded-xl transition"
          >
            🏁 Results
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="font-ui text-lg text-ink-dim hover:text-ink px-3 py-3 rounded-xl ring-1 ring-panel-edge hover:bg-white/5 transition"
          >
            ⚙
          </button>
          <button
            onClick={toggleFullscreen}
            aria-label="Toggle fullscreen"
            className="font-ui text-lg text-ink-dim hover:text-ink px-3 py-3 rounded-xl ring-1 ring-panel-edge hover:bg-white/5 transition"
          >
            ⛶
          </button>
          <button
            onClick={() => setEditing(true)}
            className="font-ui font-medium text-base text-ink ring-1 ring-panel-edge hover:bg-white/5 px-4 py-3 rounded-xl transition"
          >
            Edit
          </button>
          <button
            onClick={() => setQuitConfirm(true)}
            className="font-ui font-medium text-base text-wrong ring-1 ring-wrong/40 hover:bg-wrong/10 px-4 py-3 rounded-xl transition"
          >
            Quit
          </button>
        </div>
      </header>

      {/* Board + scoreboard side rail. Coral backlit strips flank the board like
          the set's lit side columns. */}
      <div className="flex-1 min-h-0 flex gap-2 sm:gap-3">
        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />
        <section className="flex-1 min-w-0 rounded-lg bg-black p-1.5 sm:p-2 ring-1 ring-black/60 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
          {round && round.categories.length > 0 ? (
            <Board
              categories={round.categories}
              onPick={setOpenClueId}
              selected={boardSel}
            />
          ) : (
            <div className="h-full grid place-items-center text-ink-dim font-ui text-2xl">
              No board — tap Edit to build one.
            </div>
          )}
        </section>

        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />

        {/* Scoreboard rail — framed in black like the board, so the podiums sit
            in black gutters and read as the same cabinet. */}
        <section className="shrink-0 w-44 sm:w-56 lg:w-64 rounded-lg bg-black p-1.5 sm:p-2 ring-1 ring-black/60 shadow-[0_6px_20px_rgba(0,0,0,0.45)] overflow-y-auto">
          <Scoreboard
            players={game.players}
            control={game.control ?? null}
            orientation="vertical"
            onRename={renamePlayer}
            onRemove={removePlayer}
            onAdd={addPlayer}
            onAdjust={adjustPlayer}
          />
        </section>
      </div>

      {/* Overlays */}
      {open && (
        <ClueStage
          category={open.category.name}
          value={open.clue.value}
          clue={open.clue.clue}
          answer={open.clue.answer}
          dailyDouble={open.clue.dd}
          players={game.players}
          control={game.control ?? null}
          roundMax={roundMaxValue(round)}
          timerSeconds={game.timerSeconds ?? DEFAULT_TIMER_SECONDS}
          ddWagerRule={game.ddWagerRule ?? DEFAULT_DD_WAGER_RULE}
          wordReveal={game.wordReveal !== false}
          wordRevealWpm={game.wordRevealWpm ?? DEFAULT_WORD_REVEAL_WPM}
          sound={soundOn(game)}
          onHelp={() => setHelpOpen(true)}
          shortcutsEnabled={!helpOpen}
          onApply={applyClue}
          onClose={() => setOpenClueId(null)}
        />
      )}

      {/* Tiebreaker flash when multiple players got a clue right */}
      {tiebreaker && (
        <div className="fixed inset-x-0 top-6 z-50 flex justify-center pointer-events-none">
          <div className="animate-pop bg-gold-bright text-[#0a1046] font-ui font-bold uppercase tracking-wider text-2xl px-8 py-4 rounded-2xl shadow-[0_0_40px_rgba(231,181,59,0.5)]">
            🐆 Underdog — {tiebreaker} picks next!
          </div>
        </div>
      )}

      {/* Round recap — shown before advancing to the next round */}
      {roundEndOpen && (
        <RoundRecap
          roundName={round?.name ?? "Round"}
          players={game.players}
          nextLabel={
            game.activeRound >= game.rounds.length - 1
              ? "Final Leopardy!"
              : game.rounds[game.activeRound + 1]?.name ?? "Next round"
          }
          // As on the show: the trailing player picks first in the next round.
          nextStarter={
            game.activeRound < game.rounds.length - 1
              ? lowestScorer(game.players)?.name ?? null
              : null
          }
          onContinue={() => {
            setRoundEndOpen(false);
            if (game.activeRound >= game.rounds.length - 1) setFinalOpen(true);
            else {
              setActiveRound(game.activeRound + 1);
              update((g) => ({
                ...g,
                control: lowestScorer(g.players)?.id ?? g.control ?? null,
              }));
            }
          }}
          onClose={() => setRoundEndOpen(false)}
        />
      )}

      {finalOpen && (
        <ClueStage
          isFinal
          category={game.final.category}
          value={game.final.value}
          clue={game.final.clue}
          answer={game.final.answer}
          players={game.players}
          timerSeconds={game.timerSeconds ?? DEFAULT_TIMER_SECONDS}
          wordReveal={game.wordReveal !== false}
          wordRevealWpm={game.wordRevealWpm ?? DEFAULT_WORD_REVEAL_WPM}
          sound={soundOn(game)}
          onHelp={() => setHelpOpen(true)}
          shortcutsEnabled={!helpOpen}
          onApply={applyFinal}
          onClose={() => setFinalOpen(false)}
        />
      )}

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}

      {/* Mid-game settings — the same panel as setup, so the timer, reading
          speed, and the rest can change between clues. */}
      {settingsOpen && (
        <SettingsPanel
          game={game}
          update={update}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Quit confirm — one clear way out of a game. */}
      {quitConfirm && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setQuitConfirm(false)}
        >
          <div
            className="bg-[#0a1046] ring-1 ring-panel-edge rounded-2xl p-7 sm:p-9 max-w-lg w-full text-center shadow-[0_10px_50px_rgba(0,0,0,0.6)] animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display value-gold text-3xl sm:text-4xl tracking-wide">
              QUIT THIS GAME?
            </div>
            <p className="font-ui text-ink-dim text-lg mt-3">
              You&apos;ll head back to setup. Scores and board progress will be
              lost.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setQuitConfirm(false)}
                className="btn-3d [--btn-ledge:#03061f] flex-1 font-ui font-bold text-xl text-white/85 bg-[#131c63] hover:bg-[#1a2578] py-4 rounded-xl"
              >
                Keep playing
              </button>
              <button
                onClick={quitGame}
                className="btn-3d [--btn-ledge:#9a6a22] flex-1 font-ui font-bold uppercase tracking-wider text-xl text-[#0a1046] bg-gold-bright hover:bg-gold py-4 rounded-xl"
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <Editor game={game} update={update} onClose={() => setEditing(false)} />
      )}

      {browsing && (
        <GameBrowser
          onLoad={loadGame}
          onClose={() => setBrowsing(false)}
          playedIds={playedIds}
          revealDefault={game.revealDefault ?? DEFAULT_REVEAL_LEVEL}
        />
      )}
    </main>
  );
}
