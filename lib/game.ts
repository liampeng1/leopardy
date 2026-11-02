import {
  Category,
  Clue,
  ClueResult,
  DEFAULT_TIMER_SECONDS,
  DEFAULT_WORD_REVEAL_WPM,
  GameState,
  Player,
  PLAYER_COLORS,
  Round,
  Verdict,
} from "./types";

/** First palette color not already used by a player (falls back if all taken). */
export function firstAvailableColor(players: Player[]): string {
  const used = new Set(players.map((p) => p.color));
  return (
    PLAYER_COLORS.find((c) => !used.has(c)) ??
    PLAYER_COLORS[players.length % PLAYER_COLORS.length]
  );
}

/** Reassign any repeated player colors so each player is visually distinct. */
export function dedupePlayerColors(players: Player[]): Player[] {
  const used = new Set<string>();
  return players.map((p, i) => {
    if (p.color && !used.has(p.color)) {
      used.add(p.color);
      return p;
    }
    const color =
      PLAYER_COLORS.find((c) => !used.has(c)) ??
      PLAYER_COLORS[i % PLAYER_COLORS.length];
    used.add(color);
    return { ...p, color };
  });
}

export function uid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/** Apply per-player correct/wrong verdicts for a clue worth `value`. */
export function scoreDeltas(
  players: Player[],
  verdicts: Record<string, Verdict>,
  value: number,
): Player[] {
  return players.map((p) => {
    const v = verdicts[p.id];
    if (v === "correct") return { ...p, score: p.score + value };
    if (v === "wrong") return { ...p, score: p.score - value };
    return p;
  });
}

/** Mark a clue done anywhere across all rounds (immutably). */
export function markClueDone(
  rounds: Round[],
  clueId: string,
  done = true,
): Round[] {
  return rounds.map((r) => ({
    ...r,
    categories: r.categories.map((c) => ({
      ...c,
      clues: c.clues.map((cl) => (cl.id === clueId ? { ...cl, done } : cl)),
    })),
  }));
}

export function findClue(
  rounds: Round[],
  clueId: string,
): { round: Round; category: Category; clue: Clue } | null {
  for (const round of rounds) {
    for (const category of round.categories) {
      const clue = category.clues.find((c) => c.id === clueId);
      if (clue) return { round, category, clue };
    }
  }
  return null;
}

/** Row indices present on the board, based on the tallest category. */
export function boardRows(categories: Category[]): number[] {
  const max = categories.reduce((m, c) => Math.max(m, c.clues.length), 0);
  return Array.from({ length: max }, (_, i) => i);
}

export function resetScores(game: GameState): GameState {
  return { ...game, players: game.players.map((p) => ({ ...p, score: 0 })) };
}

/** Clear all "done" flags and history so the same board can be replayed. */
export function clearProgress(game: GameState): GameState {
  return {
    ...game,
    activeRound: 0,
    history: [],
    control: null,
    rounds: game.rounds.map((r) => ({
      ...r,
      categories: r.categories.map((c) => ({
        ...c,
        clues: c.clues.map((cl) => ({ ...cl, done: false })),
      })),
    })),
    final: { ...game.final, done: false },
  };
}

export interface PlayerStat {
  player: Player;
  correct: number;
  wrong: number;
  answered: number;
  accuracy: number; // 0..1 over answered clues
}

/** Tally each player's correct/wrong counts from the answered-clue history. */
export function computeStats(game: GameState): PlayerStat[] {
  return game.players.map((player) => {
    let correct = 0;
    let wrong = 0;
    for (const entry of game.history) {
      const v = entry.verdicts[player.id];
      if (v === "correct") correct++;
      else if (v === "wrong") wrong++;
    }
    const answered = correct + wrong;
    return {
      player,
      correct,
      wrong,
      answered,
      accuracy: answered ? correct / answered : 0,
    };
  });
}

export interface TimelinePoint {
  index: number; // question number (0 = game start)
  scores: Record<string, number>; // playerId -> cumulative score
}

/** Reconstruct each player's running score after every answered clue. */
export function computeTimeline(game: GameState): TimelinePoint[] {
  const running: Record<string, number> = {};
  for (const p of game.players) running[p.id] = 0;
  const points: TimelinePoint[] = [{ index: 0, scores: { ...running } }];
  game.history.forEach((h, i) => {
    for (const p of game.players) {
      const v = h.verdicts[p.id];
      if (v === "correct") running[p.id] += h.value;
      else if (v === "wrong") running[p.id] -= h.value;
    }
    points.push({ index: i + 1, scores: { ...running } });
  });
  return points;
}

/**
 * The clue-history timeline, plus a trailing point for any MANUAL score
 * adjustments the game master made on the scoreboard (which change a player's
 * score without a history entry). When the reconstructed total disagrees with
 * a player's actual score, a final point carrying the true scores is appended
 * so the chart always lands on each player's real final total. Returns the
 * plain history timeline unchanged when there were no manual adjustments.
 */
export function computeTimelineWithFinal(game: GameState): TimelinePoint[] {
  const points = computeTimeline(game);
  const fromHistory = points[points.length - 1].scores;
  const adjusted = game.players.some(
    (p) => p.score !== (fromHistory[p.id] ?? 0),
  );
  if (!adjusted) return points;
  const scores: Record<string, number> = {};
  for (const p of game.players) scores[p.id] = p.score;
  return [...points, { index: points[points.length - 1].index + 1, scores }];
}

/**
 * The trailing player (lowest score; ties go to the earlier-listed player).
 * As on the real show, they get board control at the start of the next round.
 */
export function lowestScorer(players: Player[]): Player | null {
  let low: Player | null = null;
  for (const p of players) {
    if (!low || p.score < low.score) low = p;
  }
  return low;
}

/** Cycle a verdict null → correct → wrong → null (keyboard marking). */
export function cycleVerdict(v: Verdict): Verdict {
  if (!v) return "correct";
  return v === "correct" ? "wrong" : null;
}

export interface BoardPos {
  col: number;
  row: number;
}

/**
 * Keyboard navigation over the board grid. From null, returns the first
 * available (not-done) cell. Up/down step within the column, skipping done
 * cells and wrapping. Left/right step columns with wrap, keeping the row;
 * a done/missing target falls to the nearest available cell in that column
 * (below first, then above), and fully-done columns are skipped entirely.
 * Returns null only when every cell on the board is done.
 */
export function nextCell(
  categories: Category[],
  from: BoardPos | null,
  dir: "up" | "down" | "left" | "right",
): BoardPos | null {
  const avail = (col: number, row: number) =>
    !!categories[col]?.clues[row] && !categories[col].clues[row].done;
  const anyAvail = categories.some((c) => c.clues.some((cl) => !cl.done));
  if (!anyAvail) return null;

  if (!from) {
    for (let col = 0; col < categories.length; col++)
      for (let row = 0; row < categories[col].clues.length; row++)
        if (avail(col, row)) return { col, row };
    return null;
  }

  if (dir === "up" || dir === "down") {
    const len = categories[from.col]?.clues.length ?? 0;
    if (!len) return from;
    const step = dir === "down" ? 1 : -1;
    let row = from.row;
    for (let i = 0; i < len; i++) {
      row = (row + step + len) % len;
      if (avail(from.col, row)) return { col: from.col, row };
    }
    return from;
  }

  const step = dir === "right" ? 1 : -1;
  const nCols = categories.length;
  let col = from.col;
  for (let i = 0; i < nCols; i++) {
    col = (col + step + nCols) % nCols;
    const len = categories[col].clues.length;
    if (!len) continue;
    const row = Math.min(from.row, len - 1);
    if (avail(col, row)) return { col, row };
    // Nearest available in this column: below first, then above.
    for (let d = 1; d < len; d++) {
      if (avail(col, row + d)) return { col, row: row + d };
      if (avail(col, row - d)) return { col, row: row - d };
    }
  }
  return from;
}

export interface Superlatives {
  biggestSwing: { player: Player; delta: number; category: string } | null;
  longestStreak: { player: Player; length: number } | null;
  comeback: { player: Player; deficit: number } | null;
  ddRecord: { right: number; wrong: number; net: number } | null;
  leadChanges: number;
}

/** Game-level "fun facts" derived from the answered-clue history. */
export function computeSuperlatives(game: GameState): Superlatives {
  const { players, history } = game;

  // Biggest single-clue swing for any one player (signed; wrongs count).
  let biggestSwing: Superlatives["biggestSwing"] = null;
  for (const h of history) {
    for (const p of players) {
      const v = h.verdicts[p.id];
      if (!v) continue;
      const delta = v === "correct" ? h.value : -h.value;
      if (!biggestSwing || Math.abs(delta) > Math.abs(biggestSwing.delta)) {
        biggestSwing = { player: p, delta, category: h.category };
      }
    }
  }

  // Longest run of consecutive correct answers (each player's own answered clues).
  let longestStreak: Superlatives["longestStreak"] = null;
  for (const p of players) {
    let run = 0;
    let best = 0;
    for (const h of history) {
      const v = h.verdicts[p.id];
      if (!v) continue;
      run = v === "correct" ? run + 1 : 0;
      best = Math.max(best, run);
    }
    if (best >= 2 && (!longestStreak || best > longestStreak.length)) {
      longestStreak = { player: p, length: best };
    }
  }

  // Winner's largest deficit at any point (only meaningful with 2+ players).
  const timeline = computeTimeline(game);
  const winner = [...players].sort((a, b) => b.score - a.score)[0] ?? null;
  let comeback: Superlatives["comeback"] = null;
  if (winner && players.length > 1) {
    for (const tp of timeline) {
      const mine = tp.scores[winner.id] ?? 0;
      const top = Math.max(
        ...players
          .filter((p) => p.id !== winner.id)
          .map((p) => tp.scores[p.id] ?? 0),
      );
      const deficit = top - mine;
      if (deficit > 0 && (!comeback || deficit > comeback.deficit)) {
        comeback = { player: winner, deficit };
      }
    }
  }

  // Daily Double record across all players.
  let right = 0;
  let wrong = 0;
  let net = 0;
  for (const h of history) {
    if (!h.dd) continue;
    for (const p of players) {
      const v = h.verdicts[p.id];
      if (v === "correct") {
        right++;
        net += h.value;
      } else if (v === "wrong") {
        wrong++;
        net -= h.value;
      }
    }
  }
  const ddRecord = right + wrong > 0 ? { right, wrong, net } : null;

  // How many times the sole leader changed identity.
  let leadChanges = 0;
  let leader: string | null = null;
  for (const tp of timeline) {
    let bestScore = -Infinity;
    let bestId: string | null = null;
    let tied = false;
    for (const p of players) {
      const s = tp.scores[p.id] ?? 0;
      if (s > bestScore) {
        bestScore = s;
        bestId = p.id;
        tied = false;
      } else if (s === bestScore) {
        tied = true;
      }
    }
    if (tied || bestId === null) continue; // no sole leader at this point
    if (leader !== null && bestId !== leader) leadChanges++;
    leader = bestId;
  }

  return { biggestSwing, longestStreak, comeback, ddRecord, leadChanges };
}

/** The room's overall hit rate: every correct/wrong verdict across the game. */
export function computeGroupAccuracy(game: GameState): {
  correct: number;
  answered: number;
  accuracy: number;
} {
  let correct = 0;
  let answered = 0;
  for (const h of game.history) {
    for (const p of game.players) {
      const v = h.verdicts[p.id];
      if (v === "correct") {
        correct++;
        answered++;
      } else if (v === "wrong") {
        answered++;
      }
    }
  }
  return { correct, answered, accuracy: answered ? correct / answered : 0 };
}

export interface Wipeout {
  entry: ClueResult;
  wrongCount: number;
  pointsLost: number; // total $ dropped on this clue across all players
}

/**
 * The clue that wiped out the most players — the most 'wrong' verdicts on a
 * single clue — with the total points lost on it. Returns null unless at least
 * two players missed the same clue (otherwise there's no real "wipeout").
 */
export function computeBiggestWipeout(game: GameState): Wipeout | null {
  let best: Wipeout | null = null;
  for (const h of game.history) {
    let wrongCount = 0;
    for (const p of game.players) {
      if (h.verdicts[p.id] === "wrong") wrongCount++;
    }
    if (wrongCount < 2) continue;
    const pointsLost = wrongCount * h.value;
    if (
      !best ||
      wrongCount > best.wrongCount ||
      (wrongCount === best.wrongCount && pointsLost > best.pointsLost)
    ) {
      best = { entry: h, wrongCount, pointsLost };
    }
  }
  return best;
}

export interface RoundBreakdown {
  rounds: string[];
  perPlayer: { player: Player; nets: number[] }[];
}

/** Net $ per player per round, rounds in the order they were played. */
export function computeRoundBreakdown(game: GameState): RoundBreakdown {
  const rounds: string[] = [];
  for (const h of game.history) {
    if (!rounds.includes(h.roundName)) rounds.push(h.roundName);
  }
  const perPlayer = game.players.map((player) => {
    const nets = rounds.map((name) => {
      let net = 0;
      for (const h of game.history) {
        if (h.roundName !== name) continue;
        const v = h.verdicts[player.id];
        if (v === "correct") net += h.value;
        else if (v === "wrong") net -= h.value;
      }
      return net;
    });
    return { player, nets };
  });
  return { rounds, perPlayer };
}

export interface CategoryEdge {
  category: string;
  net: number;
}

export interface CategoryBreakdown {
  player: Player;
  best: CategoryEdge | null;
  worst: CategoryEdge | null;
}

/** Each player's best and worst category by net $ (only categories they answered in). */
export function computeCategoryBreakdown(game: GameState): CategoryBreakdown[] {
  return game.players.map((player) => {
    const nets = new Map<string, number>();
    for (const h of game.history) {
      const v = h.verdicts[player.id];
      if (!v) continue;
      const delta = v === "correct" ? h.value : -h.value;
      nets.set(h.category, (nets.get(h.category) ?? 0) + delta);
    }
    const entries = [...nets.entries()].map(([category, net]) => ({
      category,
      net,
    }));
    if (!entries.length) return { player, best: null, worst: null };
    entries.sort((a, b) => b.net - a.net);
    const best = entries[0];
    const worst = entries.length > 1 ? entries[entries.length - 1] : null;
    return { player, best, worst };
  });
}

/** Total clues available across all rounds (+ final). */
export function totalClues(game: GameState): number {
  const board = game.rounds.reduce(
    (sum, r) => sum + r.categories.reduce((s, c) => s + c.clues.length, 0),
    0,
  );
  return board + (game.final.clue ? 1 : 0);
}

export function emptyClue(value: number): Clue {
  return { id: uid("cl"), value, clue: "", answer: "", done: false };
}

export function emptyCategory(rowValues: number[]): Category {
  return {
    id: uid("cat"),
    name: "New Category",
    clues: rowValues.map((v) => emptyClue(v)),
  };
}

export function emptyRound(name: string, rowValues: number[]): Round {
  return {
    id: uid("rnd"),
    name,
    categories: Array.from({ length: 6 }, () => emptyCategory(rowValues)),
  };
}

/**
 * Normalize any loaded/imported object into a valid GameState.
 * Handles the legacy single-`categories` shape and partial game data
 * (e.g. a real game loaded from /games without players/activeRound).
 */
export function normalizeGame(
  data: Partial<GameState> & { categories?: Category[] },
  fallbackPlayers: Player[] = [],
): GameState {
  let rounds: Round[] = [];
  if (Array.isArray(data.rounds) && data.rounds.length) {
    rounds = data.rounds.map((r, i) => ({
      id: r.id || uid("rnd"),
      name: r.name || `Round ${i + 1}`,
      categories: r.categories ?? [],
    }));
  } else if (Array.isArray(data.categories) && data.categories.length) {
    rounds = [{ id: uid("rnd"), name: "Leopardy!", categories: data.categories }];
  }

  // Force globally-unique, position-stable clue ids. The bundled game data
  // reuses the same ids across rounds (e.g. Leopardy! and Double Leopardy! both
  // have a "c0-2"), which made marking/indicators leak between rounds. These
  // deterministic ids stay consistent across reloads so history keeps matching.
  rounds = rounds.map((r, ri) => ({
    ...r,
    categories: r.categories.map((c, ci) => ({
      ...c,
      id: `r${ri}c${ci}`,
      clues: c.clues.map((cl, qi) => ({ ...cl, id: `r${ri}c${ci}q${qi}` })),
    })),
  }));

  const final = data.final ?? {
    category: "Final Leopardy!",
    clue: "",
    answer: "",
    value: 2500,
    done: false,
  };

  const phase =
    data.phase === "setup" || data.phase === "play" || data.phase === "results"
      ? data.phase
      : rounds.length
        ? "play"
        : "setup";

  return {
    title: data.title || "Leopardy!",
    rounds,
    activeRound:
      typeof data.activeRound === "number" &&
      data.activeRound < rounds.length
        ? data.activeRound
        : 0,
    final,
    players: dedupePlayerColors(data.players ?? fallbackPlayers),
    phase,
    history: Array.isArray(data.history) ? (data.history as ClueResult[]) : [],
    control: data.control ?? null,
    // 0 means the timer is turned off; any other non-number falls back to the
    // default so existing games still get a timer.
    timerSeconds:
      typeof data.timerSeconds === "number" && data.timerSeconds >= 0
        ? data.timerSeconds
        : DEFAULT_TIMER_SECONDS,
    ddWagerRule: data.ddWagerRule === "house" ? "house" : "official",
    wordReveal: data.wordReveal !== false,
    // Clamp into the setup slider's range; a save can hold a half-typed value.
    wordRevealWpm:
      typeof data.wordRevealWpm === "number" && data.wordRevealWpm > 0
        ? Math.min(350, Math.max(60, data.wordRevealWpm))
        : DEFAULT_WORD_REVEAL_WPM,
    negativeSuperlatives: data.negativeSuperlatives !== false,
    soundEnabled: data.soundEnabled !== false,
  };
}

/** Highest clue value present in a round (the Daily Double wager cap floor). */
export function roundMaxValue(round?: { categories: { clues: { value: number }[] }[] }): number {
  if (!round) return 1000;
  let max = 0;
  for (const c of round.categories) for (const cl of c.clues) max = Math.max(max, cl.value);
  return max || 1000;
}
