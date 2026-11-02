// Per-player awards for the results screen. Every player gets exactly one
// award, no award is given twice, and every award is factually earned — it
// can only go to a player nobody outdid on that stat (ties count as co-best).
//
// There is a catalog of 100+ distinct superlatives to draw from: a large set
// of global behavioral measures plus per-category, per-round and per-value
// families that scale with the board. Awards are handed out by MAXIMUM
// bipartite matching (players ↔ superlatives they are co-best at), so we give
// out the largest possible set of genuine "best-at-stat" titles rather than a
// greedy pass that strands players. Sharpshooter is pinned to the true
// accuracy leader. There is no "Contender" ribbon: with a catalog this large,
// coverage is effectively guaranteed.
//
// Negative ("roast") superlatives — worst-at-stat titles — are on by default
// and removed from the pool only when game.negativeSuperlatives
// is explicitly false. They sit after the positive titles so matching prefers
// a genuine positive for each player and only reaches for a roast when nothing
// kinder is left.
//
// Co-best is always judged across the WHOLE field: a title
// is never handed down to a weaker claimant just because the true leader
// already holds a different award. If a player is best at nothing, they get
// the neutral Finalist note — never an inflated "best-at" title.
import { computeTimeline } from "./game";
import { GameState, Player } from "./types";

export interface PlayerAward {
  player: Player;
  emoji: string;
  title: string;
  detail: string;
  negative?: boolean;
}

function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US")}`;
}

function ord(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : ["th", "st", "nd", "rd"][n % 10 <= 3 ? n % 10 : 0];
  return `${n}${suffix}`;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Everything the candidates need, precomputed per player. */
interface Stats {
  answered: number;
  correct: number;
  wrong: number;
  accuracy: number;
  streak: number;
  wrongStreak: number;
  ddNet: number;
  ddAnswered: number;
  ddCorrect: number;
  biggestClue: number; // largest single correct pickup
  biggestLoss: number; // largest single wrong (positive magnitude)
  bounceBacks: number; // corrects immediately following a wrong
  topCategory: { name: string; correct: number } | null;
  bestJump: { gained: number; from: number; to: number; category: string } | null;
  worstDrop: { lost: number; from: number; to: number; category: string } | null;
  firstRound: { name: string; earned: number } | null;
  lastRound: { name: string; earned: number } | null;
  bestRound: { name: string; earned: number } | null; // best single-round net
  busiestRound: { name: string; correct: number } | null; // most correct in a round
  cluesInLead: number;
  range: number; // own peak minus own trough over the game
  peak: number; // own highest score at any point
  trough: number; // own lowest score at any point (≤ 0 possible)
  recovered: number; // deepest deficit minus final deficit (comebacks)
  biggestLead: number; // largest margin held over the field
  wireToWire: boolean; // led or tied at every scored point
  distinctCats: number; // categories with ≥1 correct
  firstCorrectAt: number | null; // history index of first correct
  lastCorrectAt: number | null; // history index of last correct
  finalCorrect: boolean | null; // final-clue result, if they played it
  finalWon: number; // amount won on the final (0 if missed/none)
  finalLost: number; // amount dropped on the final (0 if right/none)
  catCorrect: Map<string, number>;
  catNet: Map<string, number>;
  catAnswered: Map<string, number>;
  roundCorrect: Map<string, number>;
  roundNet: Map<string, number>;
  rowCorrect: Map<number, number>; // value → correct count at that clue value
  rowAnswered: Map<number, number>; // value → clues answered at that value
}

function computeStats(game: GameState): Map<string, Stats> {
  const { players, history } = game;
  const timeline = computeTimeline(game);
  const roundNames: string[] = [];
  for (const h of history) {
    if (!h.isFinal && !roundNames.includes(h.roundName)) roundNames.push(h.roundName);
  }

  const out = new Map<string, Stats>();
  for (const p of players) {
    let answered = 0;
    let correct = 0;
    let wrong = 0;
    let streak = 0;
    let run = 0;
    let wrongStreak = 0;
    let wrongRun = 0;
    let ddNet = 0;
    let ddAnswered = 0;
    let ddCorrect = 0;
    let biggestClue = 0;
    let biggestLoss = 0;
    let bounceBacks = 0;
    let lastWasWrong = false;
    let firstCorrectAt: number | null = null;
    let lastCorrectAt: number | null = null;
    let finalCorrect: boolean | null = null;
    let finalWon = 0;
    let finalLost = 0;
    const byCategory = new Map<string, number>();
    const catNet = new Map<string, number>();
    const catAnswered = new Map<string, number>();
    const byRound = new Map<string, number>();
    const roundCorrect = new Map<string, number>();
    const byRow = new Map<number, number>();
    const rowAnswered = new Map<number, number>();
    let bestJump: Stats["bestJump"] = null;
    let worstDrop: Stats["worstDrop"] = null;

    // Standings rank at a timeline point (1 = leading; ties share a rank).
    const rankAt = (ti: number) => {
      const mine = timeline[ti].scores[p.id] ?? 0;
      return (
        1 +
        players.filter(
          (o) => o.id !== p.id && (timeline[ti].scores[o.id] ?? 0) > mine,
        ).length
      );
    };

    history.forEach((h, i) => {
      const v = h.verdicts[p.id];
      if (!v) return;
      answered++;
      const delta = v === "correct" ? h.value : -h.value;
      if (h.isFinal) {
        finalCorrect = v === "correct";
        if (v === "correct") finalWon = h.value;
        else finalLost = h.value;
      }
      if (v === "correct") {
        correct++;
        run++;
        wrongRun = 0;
        streak = Math.max(streak, run);
        if (lastWasWrong) bounceBacks++;
        biggestClue = Math.max(biggestClue, h.value);
        byCategory.set(h.category, (byCategory.get(h.category) ?? 0) + 1);
        roundCorrect.set(h.roundName, (roundCorrect.get(h.roundName) ?? 0) + 1);
        if (!h.isFinal) byRow.set(h.value, (byRow.get(h.value) ?? 0) + 1);
        if (firstCorrectAt === null) firstCorrectAt = i;
        lastCorrectAt = i;
        lastWasWrong = false;
      } else {
        wrong++;
        run = 0;
        wrongRun++;
        wrongStreak = Math.max(wrongStreak, wrongRun);
        biggestLoss = Math.max(biggestLoss, h.value);
        lastWasWrong = true;
      }
      catNet.set(h.category, (catNet.get(h.category) ?? 0) + delta);
      catAnswered.set(h.category, (catAnswered.get(h.category) ?? 0) + 1);
      if (!h.isFinal) rowAnswered.set(h.value, (rowAnswered.get(h.value) ?? 0) + 1);
      if (h.dd) {
        ddAnswered++;
        ddNet += delta;
        if (v === "correct") ddCorrect++;
      }
      // Place jumps and per-round net exclude the final (no board position).
      if (!h.isFinal) {
        const from = rankAt(i);
        const to = rankAt(i + 1);
        if (from - to > 0 && (!bestJump || from - to > bestJump.gained)) {
          bestJump = { gained: from - to, from, to, category: h.category };
        }
        if (to - from > 0 && (!worstDrop || to - from > worstDrop.lost)) {
          worstDrop = { lost: to - from, from, to, category: h.category };
        }
        byRound.set(h.roundName, (byRound.get(h.roundName) ?? 0) + delta);
      }
    });

    let topCategory: Stats["topCategory"] = null;
    for (const [name, c] of byCategory) {
      if (!topCategory || c > topCategory.correct) topCategory = { name, correct: c };
    }

    const roundEarned = (name: string | undefined) =>
      name === undefined ? null : { name, earned: byRound.get(name) ?? 0 };

    let bestRound: Stats["bestRound"] = null;
    for (const [name, net] of byRound) {
      if (!bestRound || net > bestRound.earned) bestRound = { name, earned: net };
    }
    let busiestRound: Stats["busiestRound"] = null;
    for (const [name, c] of roundCorrect) {
      if (!busiestRound || c > busiestRound.correct) busiestRound = { name, correct: c };
    }

    // Lead time, own peak/trough, deepest-recovered deficit, biggest lead, and
    // wire-to-wire all come from the timeline (point 0 is the all-zero start).
    let cluesInLead = 0;
    let peak = 0;
    let trough = 0;
    let maxDeficit = 0;
    let biggestLead = 0;
    let wireToWire = players.length > 1;
    for (const tp of timeline) {
      const mine = tp.scores[p.id] ?? 0;
      peak = Math.max(peak, mine);
      trough = Math.min(trough, mine);
      const others = players.filter((o) => o.id !== p.id);
      if (others.length && tp.index > 0) {
        const top = Math.max(...others.map((o) => tp.scores[o.id] ?? 0));
        if (mine > top) cluesInLead++;
        if (mine < top) wireToWire = false;
        maxDeficit = Math.max(maxDeficit, top - mine);
        biggestLead = Math.max(biggestLead, mine - top);
      }
    }
    const lastPoint = timeline[timeline.length - 1];
    const finalMine = lastPoint.scores[p.id] ?? 0;
    const others = players.filter((o) => o.id !== p.id);
    const finalTop = others.length
      ? Math.max(...others.map((o) => lastPoint.scores[o.id] ?? 0))
      : 0;
    const recovered =
      others.length > 0 ? maxDeficit - Math.max(0, finalTop - finalMine) : 0;

    out.set(p.id, {
      answered,
      correct,
      wrong,
      accuracy: answered ? correct / answered : 0,
      streak,
      wrongStreak,
      ddNet,
      ddAnswered,
      ddCorrect,
      biggestClue,
      biggestLoss,
      bounceBacks,
      topCategory,
      bestJump,
      worstDrop,
      firstRound: roundEarned(roundNames[0]),
      lastRound: roundEarned(
        roundNames.length > 1 ? roundNames[roundNames.length - 1] : undefined,
      ),
      bestRound,
      busiestRound,
      cluesInLead,
      range: peak - trough,
      peak,
      trough,
      recovered,
      biggestLead,
      wireToWire: wireToWire && cluesInLead > 0,
      distinctCats: byCategory.size,
      firstCorrectAt,
      lastCorrectAt,
      finalCorrect,
      finalWon,
      finalLost,
      catCorrect: byCategory,
      catNet,
      catAnswered,
      roundCorrect,
      roundNet: byRound,
      rowCorrect: byRow,
      rowAnswered,
    });
  }
  return out;
}

/** One candidate's claim for one player: bigger strength wins the award. */
interface Claim {
  strength: number;
  detail: string;
}

interface Candidate {
  key: string;
  emoji: string;
  title: string;
  negative?: boolean;
  claim: (p: Player, s: Stats) => Claim | null;
}

/** Concise helper for the common "player with the highest X wins" candidate. */
function best(
  key: string,
  emoji: string,
  title: string,
  get: (s: Stats, p: Player) => number,
  detail: (s: Stats, p: Player) => string,
  min = 1,
  negative = false,
): Candidate {
  return {
    key,
    emoji,
    title,
    negative,
    claim: (p, s) => {
      const strength = get(s, p);
      return strength >= min ? { strength, detail: detail(s, p) } : null;
    },
  };
}

/** Correct count at a player's most-valuable answered row (for Top Shelf). */
function topRowCorrect(s: Stats): number {
  if (!s.rowCorrect.size) return 0;
  const top = Math.max(...s.rowCorrect.keys());
  return s.rowCorrect.get(top) ?? 0;
}

/** The fixed, board-independent positive superlatives (global measures). */
const GLOBAL: Candidate[] = [
  best("correct", "🧠", "Quiz Whiz", (s) => s.correct, (s) => `${s.correct} correct answers`, 1),
  best("streak", "🔥", "Hot Streak", (s) => s.streak, (s) => `${s.streak} right in a row`, 2),
  best("answered", "🐝", "Busiest Buzzer", (s) => s.answered, (s) => `answered ${s.answered} clue${s.answered === 1 ? "" : "s"}`, 1),
  best("bigclue", "💰", "Big Banker", (s) => s.biggestClue, (s) => `banked ${fmt(s.biggestClue)} on one clue`, 1),
  best("ddnet", "◆", "Double Trouble", (s) => s.ddNet, (s) => `+${fmt(s.ddNet)} on Daily Doubles`, 1),
  best("ddcount", "🎰", "Daily Double Hunter", (s) => s.ddCorrect, (s) => `nailed ${s.ddCorrect} Daily Double${s.ddCorrect === 1 ? "" : "s"}`, 1),
  best("jump", "🚀", "Big Mover", (s) => s.bestJump?.gained ?? 0, (s) => `jumped ${ord(s.bestJump!.from)} → ${ord(s.bestJump!.to)} on ${s.bestJump!.category}`, 1),
  best("comeback", "⛰️", "Comeback Kid", (s) => s.recovered, (s) => `clawed back ${fmt(s.recovered)}`, 1),
  best("lead", "👑", "Front Runner", (s) => s.cluesInLead, (s) => `out in front for ${s.cluesInLead} clue${s.cluesInLead === 1 ? "" : "s"}`, 1),
  best("faststart", "🌅", "Fast Starter", (s) => s.firstRound?.earned ?? 0, (s) => `${fmt(s.firstRound!.earned)} in ${s.firstRound!.name}`, 1),
  best("closer", "🌙", "Closer", (s) => s.lastRound?.earned ?? 0, (s) => `${fmt(s.lastRound!.earned)} in ${s.lastRound!.name}`, 1),
  best("range", "🎢", "Rollercoaster", (s) => s.range, (s) => `swung ${fmt(s.range)} top to bottom`, 1),
  best("peak", "📈", "Peak Performer", (s) => s.peak, (s) => `reached ${fmt(s.peak)} at the top`, 1),
  best("catkiller", "🎯", "Category Killer", (s) => (s.topCategory && s.topCategory.correct >= 2 ? s.topCategory.correct : 0), (s) => `${s.topCategory!.correct} right in ${s.topCategory!.name}`, 2),
  best("bounce", "🪃", "Bounce Back", (s) => s.bounceBacks, (s) => `${s.bounceBacks} right straight after a miss`, 1),
  best("toproll", "🔝", "Top Shelf", (s) => topRowCorrect(s), (s) => { const top = Math.max(...s.rowCorrect.keys()); return `${s.rowCorrect.get(top)} of the ${fmt(top)} clues`; }, 1),
  best("clean", "🧊", "Clean Sheet", (s) => (s.wrong === 0 && s.correct >= 1 ? s.correct : 0), (s) => `${s.correct} for ${s.correct}, not a single miss`, 1),
  best("rampage", "💥", "Round Rampage", (s) => s.busiestRound?.correct ?? 0, (s) => `${s.busiestRound!.correct} right in ${s.busiestRound!.name}`, 2),
  best("bigquarter", "🏆", "Big Quarter", (s) => s.bestRound?.earned ?? 0, (s) => `${fmt(s.bestRound!.earned)} in one round`, 1),
  best("offblocks", "🏁", "Off the Blocks", (s) => (s.firstCorrectAt === null ? 0 : 1000 - s.firstCorrectAt), () => `first to light up the board`, 1),
  best("lastword", "🎬", "Last Word", (s) => (s.lastCorrectAt === null ? 0 : s.lastCorrectAt + 1), () => `landed the night's last correct answer`, 1),
  best("wire", "🚦", "Wire to Wire", (s) => (s.wireToWire ? s.cluesInLead : 0), () => `never once trailed the field`, 1),
  best("runaway", "🏇", "Runaway", (s) => s.biggestLead, (s) => `led by as much as ${fmt(s.biggestLead)}`, 1),
  best("rounded", "🌍", "Well-Rounded", (s) => s.distinctCats, (s) => `scored in ${s.distinctCats} categories`, 2),
  best("final", "🎓", "Clutch", (s) => (s.finalCorrect ? 1 : 0), () => `nailed Final Leopardy`, 1),
  best("finalwon", "🃏", "All In", (s) => s.finalWon, (s) => `won ${fmt(s.finalWon)} on Final Leopardy`, 1),
  best("gambler", "🎲", "High Roller", (s) => (s.ddAnswered > 0 && s.ddCorrect === s.ddAnswered ? s.ddAnswered : 0), (s) => `a perfect ${s.ddCorrect}/${s.ddAnswered} on Daily Doubles`, 1),
];

/** Negative "roast" superlatives — worst-at-stat. Opt-in only. */
const NEGATIVE: Candidate[] = [
  best("neg-wrong", "🧱", "Brick Wall", (s) => s.wrong, (s) => `${s.wrong} wrong answer${s.wrong === 1 ? "" : "s"}`, 1, true),
  best("neg-coldstreak", "🥶", "Cold Streak", (s) => s.wrongStreak, (s) => `${s.wrongStreak} misses in a row`, 2, true),
  best("neg-loss", "💸", "Vault Buster", (s) => s.biggestLoss, (s) => `dropped ${fmt(s.biggestLoss)} on one clue`, 1, true),
  best("neg-hole", "🕳️", "In the Hole", (s) => (s.trough < 0 ? -s.trough : 0), (s) => `sank to ${fmt(s.trough)} at the bottom`, 1, true),
  best("neg-ddnet", "🎣", "Overreach", (s) => (s.ddNet < 0 ? -s.ddNet : 0), (s) => `${fmt(s.ddNet)} on Daily Doubles`, 1, true),
  best("neg-final", "😬", "Final Fumble", (s) => (s.finalCorrect === false ? s.finalLost || 1 : 0), (s) => (s.finalLost ? `lost ${fmt(s.finalLost)} on Final Leopardy` : `whiffed Final Leopardy`), 1, true),
  best("neg-drop", "📉", "Free Fall", (s) => s.worstDrop?.lost ?? 0, (s) => `slid ${ord(s.worstDrop!.from)} → ${ord(s.worstDrop!.to)} on ${s.worstDrop!.category}`, 1, true),
  best("neg-airball", "🎯", "Air Ball", (s) => (s.answered >= 2 && s.correct === 0 ? s.answered : 0), (s) => `0 for ${s.answered} on the buzzer`, 2, true),
];

/**
 * Build the full candidate catalog for this game: the global measures plus
 * per-category, per-round and per-value families that scale with the board.
 * A full game yields well over 100 distinct superlatives to draw from.
 * Negative titles are appended only when the game opts in.
 */
export function buildCandidates(game: GameState): Candidate[] {
  const cats = new Set<string>();
  const rounds = new Set<string>();
  const rows = new Set<number>();
  for (const h of game.history) {
    if (h.isFinal) continue;
    cats.add(h.category);
    rounds.add(h.roundName);
    rows.add(h.value);
  }

  const list: Candidate[] = [...GLOBAL];

  // Per-category families: the ace (most right), the banker (best net), the
  // specialist (best accuracy), and the sweeper (a big haul in one category).
  for (const cat of cats) {
    list.push(
      best(`cat-ace:${cat}`, "🏅", `Ace of ${cat}`, (s) => s.catCorrect.get(cat) ?? 0, (s) => `${s.catCorrect.get(cat)} right in ${cat}`, 1),
      best(`cat-bank:${cat}`, "💵", `${cat} Banker`, (s) => s.catNet.get(cat) ?? 0, (s) => `${fmt(s.catNet.get(cat) ?? 0)} from ${cat}`, 1),
      best(`cat-spec:${cat}`, "🔬", `${cat} Specialist`, (s) => ((s.catAnswered.get(cat) ?? 0) >= 2 ? (s.catCorrect.get(cat) ?? 0) / (s.catAnswered.get(cat) ?? 1) : 0), (s) => `${pct((s.catCorrect.get(cat) ?? 0) / (s.catAnswered.get(cat) ?? 1))} in ${cat}`, 0.5),
      best(`cat-sweep:${cat}`, "🧹", `${cat} Sweeper`, (s) => ((s.catCorrect.get(cat) ?? 0) >= 3 ? s.catCorrect.get(cat) ?? 0 : 0), (s) => `swept ${s.catCorrect.get(cat)} clues in ${cat}`, 3),
      best(`cat-anchor:${cat}`, "⚓", `${cat} Anchor`, (s) => s.catAnswered.get(cat) ?? 0, (s) => `took on ${s.catAnswered.get(cat)} clues in ${cat}`, 2),
    );
  }

  // Per-round families: the round's top scorer and its most prolific answerer.
  for (const round of rounds) {
    list.push(
      best(`rnd-mvp:${round}`, "⭐", `${round} MVP`, (s) => s.roundNet.get(round) ?? 0, (s) => `top of the table in ${round} (${fmt(s.roundNet.get(round) ?? 0)})`, 1),
      best(`rnd-hot:${round}`, "🌡️", `${round} Sharp`, (s) => s.roundCorrect.get(round) ?? 0, (s) => `${s.roundCorrect.get(round)} right in ${round}`, 2),
    );
  }

  // Per-value families: who owned each dollar tier (by volume and by accuracy).
  for (const row of rows) {
    list.push(
      best(`row:${row}`, "🎟️", `${fmt(row)} Club`, (s) => s.rowCorrect.get(row) ?? 0, (s) => `${s.rowCorrect.get(row)} of the ${fmt(row)} clues`, 2),
      best(`row-spec:${row}`, "🎪", `${fmt(row)} Specialist`, (s) => ((s.rowAnswered.get(row) ?? 0) >= 2 ? (s.rowCorrect.get(row) ?? 0) / (s.rowAnswered.get(row) ?? 1) : 0), (s) => `${pct((s.rowCorrect.get(row) ?? 0) / (s.rowAnswered.get(row) ?? 1))} on ${fmt(row)} clues`, 0.5),
    );
  }

  if (game.negativeSuperlatives !== false) list.push(...NEGATIVE);

  return list;
}

/** How many distinct superlatives exist for this game (the pool to draw from). */
export function catalogSize(game: GameState): number {
  // +1 for Sharpshooter, which is handled specially (pinned) and not in the list.
  return buildCandidates(game).length + 1;
}

const EPS = 1e-9;

/**
 * When roasts are enabled, the last-place finisher gets the "wooden spoon":
 * their most-deserved negative superlative (one they're genuinely co-worst at),
 * so an opted-in roast actually shows rather than being buried by the far
 * larger positive pool. Returns null if they have nothing roast-worthy.
 */
function pinnedRoast(
  remaining: Player[],
  players: Player[],
  stats: Map<string, Stats>,
): PlayerAward | null {
  const target = [...remaining].sort(
    (a, b) => a.score - b.score || players.indexOf(a) - players.indexOf(b),
  )[0];
  if (!target) return null;
  let pick: { c: Candidate; claim: Claim } | null = null;
  for (const c of NEGATIVE) {
    let max = -Infinity;
    const claims = new Map<string, Claim>();
    for (const p of players) {
      const claim = c.claim(p, stats.get(p.id)!);
      if (claim && claim.strength > 0) {
        claims.set(p.id, claim);
        max = Math.max(max, claim.strength);
      }
    }
    const tc = claims.get(target.id);
    if (tc && tc.strength >= max - EPS) {
      if (!pick || tc.strength > pick.claim.strength) pick = { c, claim: tc };
    }
  }
  if (!pick) return null;
  return {
    player: target,
    emoji: pick.c.emoji,
    title: pick.c.title,
    detail: pick.claim.detail,
    negative: true,
  };
}

/** The highest-accuracy player (min 3 answered) — Sharpshooter is theirs. */
function accuracyLeader(players: Player[], stats: Map<string, Stats>): Player | null {
  const eligible = players.filter((p) => (stats.get(p.id)?.answered ?? 0) >= 3);
  if (!eligible.length) return null;
  return [...eligible].sort((a, b) => {
    const sa = stats.get(a.id)!;
    const sb = stats.get(b.id)!;
    return (
      sb.accuracy - sa.accuracy ||
      sb.answered - sa.answered ||
      b.score - a.score ||
      players.indexOf(a) - players.indexOf(b)
    );
  })[0];
}

/**
 * One unique, factually-earned award per player. Sharpshooter is pinned to the
 * accuracy leader; everyone else is assigned by maximum bipartite matching over
 * the superlatives they are co-best at, so we hand out the most genuine titles
 * possible and no player is left with a hollow ribbon.
 */
export function computePlayerAwards(game: GameState): PlayerAward[] {
  const { players } = game;
  const stats = computeStats(game);
  const awarded = new Map<string, PlayerAward>();
  const candidates = buildCandidates(game);

  // 1) Pin Sharpshooter to the true accuracy leader.
  const sharp = accuracyLeader(players, stats);
  if (sharp) {
    const s = stats.get(sharp.id)!;
    awarded.set(sharp.id, {
      player: sharp,
      emoji: "🎯",
      title: "Sharpshooter",
      detail: `${s.correct} of ${s.answered} correct (${pct(s.accuracy)})`,
    });
  }

  // 2) If roasts are on, pin the wooden spoon to the last-place finisher so a
  //    negative superlative actually surfaces.
  if (game.negativeSuperlatives !== false) {
    const roast = pinnedRoast(
      players.filter((p) => !awarded.has(p.id)),
      players,
      stats,
    );
    if (roast) awarded.set(roast.player.id, roast);
  }

  // 3) For each candidate, find its co-best players — judged across the WHOLE
  // field, never just the unmatched pool. A pinned player's
  // crowns stay theirs: if they alone lead a stat, that title simply goes
  // unawarded rather than trickling down with a smaller number on it.
  const remaining = players.filter((p) => !awarded.has(p.id));
  const coBest: { detail: Map<string, string>; ids: string[]; negative?: boolean }[] =
    candidates.map((c) => {
      let max = -Infinity;
      const claims = new Map<string, Claim>();
      for (const p of players) {
        const claim = c.claim(p, stats.get(p.id)!);
        if (claim && claim.strength > 0) {
          claims.set(p.id, claim);
          max = Math.max(max, claim.strength);
        }
      }
      const detail = new Map<string, string>();
      const ids: string[] = [];
      for (const [id, claim] of claims) {
        if (claim.strength >= max - EPS) {
          ids.push(id);
          detail.set(id, claim.detail);
        }
      }
      return { detail, ids, negative: c.negative };
    });

  // 4) Maximum bipartite matching (Kuhn). Players sorted by score (winners
  // pick prestigious awards first); each player's candidate list is in catalog
  // order, so positives are tried before any opt-in negatives.
  const order = [...remaining].sort(
    (a, b) => b.score - a.score || players.indexOf(a) - players.indexOf(b),
  );
  const adj = new Map<string, number[]>(); // playerId -> candidate indices
  for (const p of order) {
    const idxs: number[] = [];
    coBest.forEach((cb, i) => {
      if (cb.ids.includes(p.id)) idxs.push(i);
    });
    adj.set(p.id, idxs);
  }

  const matchCand: (string | null)[] = candidates.map(() => null); // candIdx -> playerId
  const matchPlayer = new Map<string, number>(); // playerId -> candIdx

  const augment = (pid: string, seen: Set<number>): boolean => {
    for (const ci of adj.get(pid) ?? []) {
      if (seen.has(ci)) continue;
      seen.add(ci);
      const held = matchCand[ci];
      if (held === null || augment(held, seen)) {
        matchCand[ci] = pid;
        matchPlayer.set(pid, ci);
        return true;
      }
    }
    return false;
  };

  for (const p of order) augment(p.id, new Set());

  for (const p of order) {
    const ci = matchPlayer.get(p.id);
    if (ci === undefined) continue;
    const c = candidates[ci];
    awarded.set(p.id, {
      player: p,
      emoji: c.emoji,
      title: c.title,
      detail: coBest[ci].detail.get(p.id)!,
      negative: c.negative,
    });
  }

  // 5) Anyone the matching couldn't place is best (or co-best) at nothing —
  // the maximum matching guarantees there is no way to hand them a genuine
  // title without taking one from its rightful holder. They get the neutral,
  // factual Finalist note; never an inflated "best-at" claim.
  for (const p of players) {
    if (awarded.has(p.id)) continue;
    awarded.set(p.id, {
      player: p,
      emoji: "🎗️",
      title: "Finalist",
      detail: `finished with ${fmt(p.score)}`,
    });
  }

  return players.map((p) => awarded.get(p.id)!);
}
