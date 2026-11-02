"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  DDWagerRule,
  DEFAULT_DD_WAGER_RULE,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_WORD_REVEAL_WPM,
  HOUSE_MIN_WAGER,
  OFFICIAL_MIN_WAGER,
  Player,
  Verdict,
} from "@/lib/types";
import { cycleVerdict } from "@/lib/game";
import { playDailyDouble, playThinkMusic } from "@/lib/sound";
import { useShortcuts } from "@/lib/useShortcuts";
import { CreditPicker, money } from "./CreditPicker";
import { ClueTimer } from "./ClueTimer";

export function ClueStage({
  category,
  value,
  clue,
  answer,
  players,
  isFinal = false,
  dailyDouble = false,
  control = null,
  roundMax = 1000,
  timerSeconds = DEFAULT_TIMER_SECONDS,
  ddWagerRule = DEFAULT_DD_WAGER_RULE,
  wordReveal = true,
  wordRevealWpm = DEFAULT_WORD_REVEAL_WPM,
  sound = true,
  onHelp,
  shortcutsEnabled = true,
  onApply,
  onClose,
}: {
  category: string;
  value: number;
  clue: string;
  answer: string;
  players: Player[];
  isFinal?: boolean;
  dailyDouble?: boolean;
  control?: string | null;
  roundMax?: number;
  timerSeconds?: number;
  ddWagerRule?: DDWagerRule;
  wordReveal?: boolean;
  wordRevealWpm?: number;
  /** Play sound effects (Daily Double sting, Final Leopardy music). */
  sound?: boolean;
  /** Opens the ? shortcut help overlay (owned by the page). */
  onHelp?: () => void;
  /** Off while the help overlay sits on top, so Esc closes only the help. */
  shortcutsEnabled?: boolean;
  onApply: (verdicts: Record<string, Verdict>, value: number) => void;
  onClose: () => void;
}) {
  const houseRule = ddWagerRule === "house";
  // Wager limits depend on the chosen rule:
  //  - house:    min $100; up to your current score (raised to $100 if lower).
  //  - official: min $5;   up to the greater of your score or the round's top.
  const minWager = houseRule ? HOUSE_MIN_WAGER : OFFICIAL_MIN_WAGER;
  const maxWagerFor = (score: number) =>
    houseRule ? Math.max(score, HOUSE_MIN_WAGER) : Math.max(score, roundMax);

  const initialDdId =
    control && players.some((p) => p.id === control) ? control : null;

  const [revealed, setRevealed] = useState(false);

  // Final Leopardy opens on a category card for a beat before the clue shows
  //, as on the show. Auto-advances; tap or Enter skips ahead.
  const [finalIntro, setFinalIntro] = useState(isFinal);
  useEffect(() => {
    if (!finalIntro) return;
    const t = window.setTimeout(() => setFinalIntro(false), 2800);
    return () => window.clearTimeout(t);
  }, [finalIntro]);

  // Word-by-word reveal: all words render immediately (so the auto-fit font
  // never reflows) but start invisible and fade in at reading speed. Tapping
  // the clue, or Reveal Answer, shows everything at once.
  const words = useMemo(() => clue.split(/\s+/).filter(Boolean), [clue]);
  const [shownWords, setShownWords] = useState(() =>
    wordReveal ? 0 : words.length,
  );
  const fullyShown = shownWords >= words.length;

  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  // A Daily Double is wagered, and only one player plays it.
  const [ddStarted, setDdStarted] = useState(!dailyDouble);
  // Which player landed on the Daily Double (defaults to whoever has control).
  const [ddPlayerId, setDdPlayerId] = useState<string | null>(initialDdId);
  // Start the wager within the controlling player's allowed range.
  const [wager, setWager] = useState<number>(() => {
    if (!dailyDouble) return value;
    const sc = players.find((p) => p.id === initialDdId)?.score ?? 0;
    return Math.min(Math.max(value, minWager), maxWagerFor(sc));
  });

  // Picking who found it re-clamps the wager into that player's range.
  const pickDdPlayer = (id: string) => {
    setDdPlayerId(id);
    const sc = players.find((p) => p.id === id)?.score ?? 0;
    setWager((w) => Math.min(Math.max(w, minWager), maxWagerFor(sc)));
  };

  const ddPlayer = players.find((p) => p.id === ddPlayerId) ?? null;
  const maxWager = maxWagerFor(ddPlayer?.score ?? 0);
  const stake = dailyDouble
    ? Math.min(Math.max(wager, minWager), maxWager)
    : value;
  // Suggested wager buttons, tailored to the rule (de-duplicated).
  const wagerPresets = [
    ...new Set(houseRule ? [minWager, maxWager] : [value, roundMax, maxWager]),
  ];

  const setVerdict = (id: string, v: Verdict) =>
    setVerdicts((prev) => {
      // Daily Double: exactly one responder.
      if (dailyDouble) return v ? { [id]: v } : {};
      return { ...prev, [id]: v };
    });

  const anyMarked = Object.values(verdicts).some((v) => v);

  // Tick out the next word at the configured reading speed while the clue is
  // on screen. Base pace comes from the setup screen (words/min); words ending
  // a clause get an extra ~75% beat so the clue breathes at punctuation.
  const clueVisible = (!dailyDouble || ddStarted) && !finalIntro;
  useEffect(() => {
    if (!wordReveal || !clueVisible || fullyShown) return;
    const perWord = Math.round(60000 / Math.max(wordRevealWpm, 60));
    const prev = words[shownWords - 1] ?? "";
    const delay =
      shownWords === 0
        ? 350
        : /[.,;:?!—]$/.test(prev)
          ? Math.round(perWord * 1.75)
          : perWord;
    const t = window.setTimeout(() => setShownWords((n) => n + 1), delay);
    return () => window.clearTimeout(t);
  }, [wordReveal, wordRevealWpm, clueVisible, fullyShown, shownWords, words]);

  const showAllWords = () => setShownWords(words.length);

  // Daily Double reveal sting — once, when the Daily Double stage appears.
  const ddStung = useRef(false);
  useEffect(() => {
    if (dailyDouble && !ddStung.current) {
      ddStung.current = true;
      playDailyDouble(sound);
    }
  }, [dailyDouble, sound]);

  // Final Leopardy think music plays while players write — starting after the
  // category intro — and stops the moment the answer is revealed (or the
  // stage is closed).
  useEffect(() => {
    if (!isFinal || finalIntro || revealed) return;
    return playThinkMusic(sound);
  }, [isFinal, finalIntro, revealed, sound]);

  /* --- keyboard shortcuts (players keyed 1–9 in scoreboard order) --- */
  const numberKeys = (fn: (playerId: string) => void) =>
    Object.fromEntries(
      players.slice(0, 9).map((p, i) => [String(i + 1), () => fn(p.id)]),
    );

  // Daily Double gate: pick the finder, Enter shows the clue.
  useShortcuts(
    {
      ...numberKeys(pickDdPlayer),
      Enter: () => setDdStarted(true),
      Escape: onClose,
      ...(onHelp ? { "?": onHelp } : {}),
    },
    shortcutsEnabled && dailyDouble && !ddStarted,
  );

  // Final intro card: Space/Enter (or a tap) skips straight to the clue.
  useShortcuts(
    {
      " ": () => setFinalIntro(false),
      Enter: () => setFinalIntro(false),
      Escape: onClose,
      ...(onHelp ? { "?": onHelp } : {}),
    },
    shortcutsEnabled && finalIntro,
  );

  // Clue: Space (or Enter) advances through the whole flow — skip the word
  // reveal, then reveal the answer, then score & close. Numbers cycle
  // verdicts once the answer is up.
  const advance = () => {
    if (!fullyShown) showAllWords();
    else if (!revealed) setRevealed(true);
    else onApply(verdicts, stake);
  };
  useShortcuts(
    {
      " ": advance,
      Enter: advance,
      ...(revealed
        ? numberKeys((id) =>
            setVerdict(id, cycleVerdict(verdicts[id] ?? null)),
          )
        : {}),
      Escape: onClose,
      ...(onHelp ? { "?": onHelp } : {}),
    },
    shortcutsEnabled && (!dailyDouble || ddStarted) && !finalIntro,
  );

  // Auto-fit the clue: make it as large as possible while still fitting the
  // available area. The text wraps to the full width, so the binding limit is
  // height — we keep the font big and only shrink when the clue truly can't
  // fit (preferring width over a smaller size).
  const clueBoxRef = useRef<HTMLDivElement>(null);
  const clueRef = useRef<HTMLParagraphElement>(null);
  const [clueFont, setClueFont] = useState(72);

  useLayoutEffect(() => {
    const box = clueBoxRef.current;
    const text = clueRef.current;
    if (!box || !text) return;
    const fit = () => {
      // Leave vertical breathing room (don't fill top-to-bottom) and cap the
      // size so short clues are big but not overwhelming. Width stays full —
      // the text wraps to it, so height is the binding constraint.
      const maxH = box.clientHeight * 0.88;
      const maxW = box.clientWidth;
      if (maxH <= 0 || maxW <= 0) return;
      let lo = 16,
        hi = 84,
        best = 16;
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        text.style.fontSize = `${mid}px`;
        if (text.scrollHeight <= maxH && text.scrollWidth <= maxW) {
          best = mid;
          lo = mid;
        } else {
          hi = mid;
        }
      }
      text.style.fontSize = `${best}px`;
      setClueFont(best);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [clue, revealed, ddStarted, finalIntro]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col metal-frame p-2 sm:p-3 gap-2 animate-pop">
      {/* Walnut cornice header — the same band as the play board. Category in
          white display caps, value in gold, matching the board's convention. */}
      <header className="wood-trim rounded-b-xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="font-display uppercase tracking-[0.12em] text-white text-board-shadow text-2xl sm:text-4xl min-w-0 flex-1 truncate">
          {isFinal ? "Final Leopardy!" : category}
        </div>
        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
          <div className="value-gold font-display text-3xl sm:text-5xl">
            {money(stake)}
          </div>
          {/* Answer time limit — erodes clockwise, auto-reveals at zero, and
              freezes once the answer shows. Limit is set on the setup screen
              (0 = off). Mounted (invisible, frozen) for the whole clue so the
              header never changes height — its appearance used to shrink the
              clue area and shift the words mid-reveal. Ticking starts only
              once the last word is on screen.
              Final Leopardy gets double time: everyone answers it at once. */}
          {timerSeconds > 0 && ddStarted && !finalIntro && (
            <div className={fullyShown ? "" : "invisible"}>
              <ClueTimer
                limit={isFinal ? timerSeconds * 2 : timerSeconds}
                freeze={revealed || !fullyShown}
                sound={sound}
                onExpire={() => setRevealed(true)}
              />
            </div>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="font-ui text-3xl sm:text-4xl text-white/70 hover:text-white h-12 w-12 grid place-items-center rounded-full hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Coral rails frame the whole cabinet — the clue panel and the footer
          stack in one column between them, so the players, ✓/✕ selection, and
          buttons all line up within the same framing as the clue above. */}
      <div className="flex-1 min-h-0 flex gap-2 sm:gap-3">
        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 flex flex-col gap-2 sm:gap-3 min-h-0">
          <section className="flex-1 min-h-0 rounded-lg bg-black p-1.5 sm:p-2 ring-1 ring-black/60 shadow-[0_6px_20px_rgba(0,0,0,0.45)]">
            <div className="board-surface rounded-md h-full flex flex-col overflow-hidden">
            {finalIntro ? (
              /* Final Leopardy intro: the category alone, for a beat, before
                 the clue appears. Tap to skip ahead. */
              <div
                onClick={() => setFinalIntro(false)}
                className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center cursor-pointer"
              >
                <div className="font-display value-gold text-[clamp(2rem,6vw,5rem)] animate-pop leading-none">
                  FINAL LEOPARDY!
                </div>
                <div className="font-ui text-xl sm:text-2xl text-white/70 uppercase tracking-wide">
                  The category is
                </div>
                <div className="font-display uppercase tracking-[0.08em] text-white text-board-shadow text-[clamp(2.5rem,8vw,7rem)] leading-tight animate-up">
                  {category}
                </div>
              </div>
            ) : dailyDouble && !ddStarted ? (
              /* Daily Double gate: pick the player, set the wager, then reveal */
              <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center overflow-auto no-scrollbar py-6">
                <div className="font-display value-gold text-[clamp(2.5rem,8vw,7rem)] animate-pop leading-none">
                  DAILY DOUBLE!
                </div>

                {/* Who found it */}
                <div className="flex flex-col items-center gap-3">
                  <span className="font-ui text-xl text-white/80 uppercase tracking-wide">
                    Who found it?
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {players.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => pickDdPlayer(p.id)}
                        className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl transition ${
                          ddPlayerId === p.id
                            ? "bg-gold-bright text-[#0a1046]"
                            : "bg-white/10 text-white ring-2 ring-white/25 hover:bg-white/20"
                        }`}
                      >
                        <span className="font-hand font-bold text-3xl leading-none">
                          {p.name}
                        </span>
                        {/* Everyone's totals in view — wagers are strategic. */}
                        <span
                          className={`font-display tabular-nums text-xl leading-none ${
                            ddPlayerId === p.id
                              ? ""
                              : p.score < 0
                                ? "score-neg"
                                : "score-pos"
                          }`}
                        >
                          {money(p.score)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wager */}
                <div className="flex flex-col items-center gap-3">
                  <label className="font-ui text-xl text-white/80 uppercase tracking-wide">
                    Wager
                    {ddPlayer && (
                      <span className="text-gold">
                        {" "}
                        — {ddPlayer.name} can bet {money(minWager)} to{" "}
                        {money(maxWager)}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={wager === 0 ? "" : `$${wager.toLocaleString("en-US")}`}
                    autoFocus
                    onChange={(e) =>
                      setWager(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
                    }
                    onFocus={(e) => e.target.select()}
                    className={`w-80 bg-black/40 rounded-2xl px-6 py-4 text-center font-display text-6xl outline-none ring-2 focus:ring-gold ${
                      wager > maxWager || wager < minWager
                        ? "text-wrong ring-wrong"
                        : "value-gold ring-white/20"
                    }`}
                  />
                  {wager > maxWager && (
                    <span className="font-ui text-wrong text-lg">
                      Over the max — will be capped at {money(maxWager)}.
                    </span>
                  )}
                  {wager < minWager && (
                    <span className="font-ui text-wrong text-lg">
                      Below the {money(minWager)} minimum — will be raised to{" "}
                      {money(minWager)}.
                    </span>
                  )}
                  <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                    {wagerPresets.map((amt, i) => (
                      <button
                        key={i}
                        onClick={() => setWager(amt)}
                        className="font-ui font-bold text-lg text-white bg-white/10 hover:bg-white/20 ring-1 ring-white/25 rounded-xl px-4 py-2 transition"
                      >
                        {amt === maxWager ? "Max " : ""}
                        {money(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setDdStarted(true)}
                  className="btn-3d [--btn-ledge:#9a6a22] font-ui font-bold uppercase tracking-wider text-[#0a1046] bg-gold-bright hover:bg-gold px-10 py-5 rounded-2xl text-2xl"
                >
                  Show Clue
                </button>
              </div>
            ) : (
              <>
                {/* Clue — auto-fit to the available space, big with breathing room */}
                <div className="flex-1 min-h-0 flex flex-col px-6 sm:px-16 py-4 gap-3">
                  {dailyDouble && (
                    <div className="shrink-0 text-center font-display value-gold text-3xl sm:text-5xl">
                      DAILY DOUBLE · {money(stake)}
                    </div>
                  )}
                  {isFinal && (
                    <div className="shrink-0 text-center font-display uppercase tracking-wide text-gold text-2xl sm:text-4xl">
                      {category}
                    </div>
                  )}
                  <div
                    ref={clueBoxRef}
                    onClick={showAllWords}
                    className={`flex-1 min-h-0 w-full grid place-items-center overflow-hidden ${
                      fullyShown ? "" : "cursor-pointer"
                    }`}
                  >
                    <p
                      ref={clueRef}
                      className="w-full text-center font-clue font-bold uppercase text-white text-board-shadow leading-[1.1] hyphens-none break-words"
                      style={{ fontSize: `${clueFont}px` }}
                    >
                      {words.length === 0
                        ? "—"
                        : words.map((w, i) => (
                            <span
                              key={i}
                              className="transition-opacity duration-200"
                              style={{ opacity: i < shownWords ? 1 : 0 }}
                            >
                              {w}
                              {i < words.length - 1 ? " " : ""}
                            </span>
                          ))}
                    </p>
                  </div>
                </div>

                {/* Answer — inside the navy panel so it reads as part of the clue */}
                {revealed && (
                  <div className="shrink-0 px-6 sm:px-14 pb-6 text-center animate-up">
                    <span className="value-gold font-display text-[clamp(1.8rem,4.6vw,4.6rem)] leading-tight hyphens-none break-words">
                      {answer || "—"}
                    </span>
                  </div>
                )}
              </>
            )}
            </div>
          </section>

          {/* Players + scoring controls in a black box on the metal, within the
              same coral framing as the clue — the play screen's scoreboard
              treatment. Buttons are chunky 3D set props (.btn-3d: a solid
              same-hue ledge that sinks when pressed). Hidden during the Daily
              Double gate (whose Show Clue button is inline) and the Final
              category intro. */}
          {!(dailyDouble && !ddStarted) && !finalIntro && (
            <div className="bg-black rounded-lg p-2 ring-1 ring-black/60 shadow-[0_4px_14px_rgba(0,0,0,0.45)] shrink-0">
              {!revealed ? (
                /* Before reveal: just the reveal control — no player buttons yet */
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    aria-label="Back"
                    className="btn-3d [--btn-ledge:#03061f] font-ui font-bold text-2xl text-white/85 bg-[#0a1046] hover:bg-[#131c63] px-7 py-4 rounded-xl"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      showAllWords();
                      setRevealed(true);
                    }}
                    className="btn-3d [--btn-ledge:#9a6a22] flex-1 font-ui font-bold uppercase tracking-wider text-2xl sm:text-3xl text-[#0a1046] bg-gold-bright hover:bg-gold py-4 rounded-xl"
                  >
                    Reveal Answer
                  </button>
                </div>
              ) : (
                /* After reveal: players + scoring controls in the black box */
                <div className="space-y-2">
                  <CreditPicker
                    players={players}
                    value={stake}
                    verdicts={verdicts}
                    onChange={setVerdict}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      aria-label="Back"
                      className="btn-3d [--btn-ledge:#03061f] font-ui font-bold text-2xl text-white/85 bg-[#0a1046] hover:bg-[#131c63] px-7 py-4 rounded-xl"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={() => onApply(verdicts, stake)}
                      className="btn-3d [--btn-ledge:#9a6a22] flex-1 font-ui font-bold uppercase tracking-wider text-2xl text-[#0a1046] bg-gold-bright hover:bg-gold py-4 rounded-xl"
                    >
                      {anyMarked ? "Score & Close" : "Mark Done & Close"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="coral-rail w-1.5 sm:w-2 shrink-0" aria-hidden />
      </div>
    </div>
  );
}
