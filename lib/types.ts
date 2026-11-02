export type Verdict = "correct" | "wrong" | null;

/** How much of a game a preview card discloses. */
export type RevealLevel = "blind" | "categories" | "full";

export interface Player {
  id: string;
  name: string;
  score: number;
  color: string;
}

export interface Clue {
  id: string;
  value: number;
  clue: string;
  answer: string;
  done: boolean;
  dd?: boolean; // daily double
}

export interface Category {
  id: string;
  name: string;
  clues: Clue[];
}

export interface Round {
  id: string;
  name: string;
  categories: Category[];
}

export interface FinalClue {
  category: string;
  clue: string;
  answer: string;
  value: number;
  done: boolean;
}

export type Phase = "setup" | "play" | "results";

/** A record of one answered clue, for stats and the results recap. */
export interface ClueResult {
  id: string;
  roundName: string;
  category: string;
  value: number; // amount at stake (the wager, for a Daily Double)
  clue: string;
  answer: string;
  isFinal: boolean;
  dd: boolean;
  verdicts: Record<string, Verdict>; // playerId -> correct | wrong | null
}

export interface GameState {
  title: string;
  rounds: Round[];
  activeRound: number;
  final: FinalClue;
  players: Player[];
  phase: Phase;
  history: ClueResult[];
  /** Player who controls the board (picks the next clue). */
  control?: string | null;
  /** Per-clue answer time limit, in seconds (countdown timer). */
  timerSeconds?: number;
  /** Which Daily Double wager limits to use. */
  ddWagerRule?: DDWagerRule;
  /** Reveal clue text word-by-word at reading speed (tap to skip). */
  wordReveal?: boolean;
  /** Word-by-word reveal pace, in words per minute. */
  wordRevealWpm?: number;
  /** Include negative ("roast") superlatives in the results awards. */
  negativeSuperlatives?: boolean;
  /** Play sound effects (Daily Double sting, Final Leopardy music, timer). */
  soundEnabled?: boolean;
  /** Default reveal level used when browsing/previewing games. */
  revealDefault?: RevealLevel;
}

/** Default per-clue countdown, in seconds (20s). */
export const DEFAULT_TIMER_SECONDS = 20;

/** Whether clues reveal word-by-word by default. */
export const DEFAULT_WORD_REVEAL = true;

/** Default word-by-word reveal pace (comfortable silent-reading speed). */
export const DEFAULT_WORD_REVEAL_WPM = 250;

/** Negative ("roast") superlatives are on by default. */
export const DEFAULT_NEGATIVE_SUPERLATIVES = true;

/** Sound effects are on by default. */
export const DEFAULT_SOUND_ENABLED = true;

/** Previews disclose category headers by default (Final stays sealed). */
export const DEFAULT_REVEAL_LEVEL: RevealLevel = "categories";

/**
 * Daily Double wager limits:
 *  - "official": min $5; max = greater of your score or the round's top value.
 *  - "house":    min $100; max = your current score (raised to $100 if lower).
 */
export type DDWagerRule = "official" | "house";
export const DEFAULT_DD_WAGER_RULE: DDWagerRule = "official";
export const OFFICIAL_MIN_WAGER = 5;
export const HOUSE_MIN_WAGER = 100;

// Ten player accents that read well on the blue/gold board. The first five
// are widely separated hues (yellow / blue / pink / teal / purple) so small
// games are maximally distinct; the rest fill the gaps. Pure reds and greens
// are avoided so player colors don't read as the correct/wrong verdict colors.
export const PLAYER_COLORS = [
  "#f5c531", // gold-yellow
  "#3ca0ea", // azure blue
  "#ec5aa6", // magenta pink
  "#17c0ac", // teal
  "#9d6cf0", // violet
  "#ef8226", // orange
  "#6f7ce0", // indigo
  "#ef7066", // coral
  "#c9b074", // khaki
  "#d36fd0", // orchid
];
