import { Category, GameState, Round } from "./types";
import { normalizeGame, uid } from "./game";

/* ----------------------------- CSV parsing ----------------------------- */

/** Minimal RFC-4180-ish CSV parser (handles quotes, commas, newlines). */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // flush trailing field/row if any content
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function roundKey(raw: string): "double" | "triple" | "jeopardy" {
  const r = raw.trim().toLowerCase();
  if (r.includes("triple")) return "triple";
  if (r.includes("double") || r === "dj") return "double";
  return "jeopardy";
}

const ROUND_NAMES: Record<string, string> = {
  jeopardy: "Leopardy!",
  double: "Double Leopardy!",
  triple: "Triple Leopardy!",
};

/**
 * Import a board from CSV.
 * Columns (header required, case-insensitive): round, category, value, clue, answer
 *  - round "final" populates Final Leopardy!.
 *  - round "double"/"dj" goes to the Double Leopardy! round; anything else is the
 *    Leopardy! round. Clues are grouped into categories by first appearance.
 */
export function gameFromCSV(text: string): Partial<GameState> {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("CSV needs a header row and at least one clue.");

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const ri = col("round");
  const ci = col("category");
  const vi = col("value");
  const cli = col("clue");
  const ai = col("answer");
  if (ci < 0 || cli < 0 || ai < 0) {
    throw new Error('CSV header must include at least "category", "clue", and "answer".');
  }

  // One category-map + order per round key, preserving appearance order.
  const roundData: Record<string, { map: Map<string, Category>; order: string[] }> = {
    jeopardy: { map: new Map(), order: [] },
    double: { map: new Map(), order: [] },
    triple: { map: new Map(), order: [] },
  };
  let final: GameState["final"] | undefined;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rawRound = (ri >= 0 ? cells[ri] : "") ?? "";
    const category = (cells[ci] ?? "").trim();
    const value = Number((vi >= 0 ? cells[vi] : "")?.replace(/[^0-9.-]/g, "")) || 0;
    const clue = (cells[cli] ?? "").trim();
    const answer = (cells[ai] ?? "").trim();
    if (!clue && !answer) continue;

    if (rawRound.trim().toLowerCase().includes("final")) {
      final = {
        category: category || "Final Leopardy!",
        clue,
        answer,
        value: value || 2500,
        done: false,
      };
      continue;
    }

    const rk = roundKey(rawRound);
    const { map, order } = roundData[rk];
    if (!map.has(category)) {
      map.set(category, { id: uid("cat"), name: category || "Category", clues: [] });
      order.push(category);
    }
    const cat = map.get(category)!;
    cat.clues.push({
      id: uid("cl"),
      value: value || (cat.clues.length + 1) * 200,
      clue,
      answer,
      done: false,
    });
  }

  const rounds: Round[] = [];
  for (const rk of ["jeopardy", "double", "triple"] as const) {
    const { map, order } = roundData[rk];
    if (!order.length) continue;
    rounds.push({
      id: uid("rnd"),
      name: ROUND_NAMES[rk],
      categories: order.map((name) => map.get(name)!),
    });
  }

  const out: Partial<GameState> = {};
  if (rounds.length) out.rounds = rounds;
  if (final) out.final = final;
  return out;
}

export function gameToCSV(game: GameState): string {
  const esc = (s: string | number) => {
    const str = String(s);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines: string[] = ["round,category,value,clue,answer"];
  for (const round of game.rounds) {
    const label = roundKey(round.name);
    for (const cat of round.categories) {
      for (const cl of cat.clues) {
        lines.push([label, cat.name, cl.value, cl.clue, cl.answer].map(esc).join(","));
      }
    }
  }
  const f = game.final;
  lines.push(["final", f.category, f.value, f.clue, f.answer].map(esc).join(","));
  return lines.join("\n");
}

/* ----------------------------- JSON import ----------------------------- */

export function gameFromJSON(text: string): Partial<GameState> {
  const data = JSON.parse(text);
  // normalizeGame handles both the rounds shape and the legacy `categories` shape.
  const g = normalizeGame(data ?? {});
  const out: Partial<GameState> = { rounds: g.rounds, final: g.final };
  if (typeof data?.title === "string") out.title = data.title;
  if (Array.isArray(data?.players)) out.players = data.players;
  return out;
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
