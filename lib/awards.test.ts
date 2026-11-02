import { describe, expect, it } from "vitest";
import { buildCandidates, catalogSize, computePlayerAwards } from "./awards";
import { ClueResult, GameState, Player, Verdict } from "./types";

const A: Player = { id: "a", name: "Alice", score: 0, color: "#f00" };
const B: Player = { id: "b", name: "Bob", score: 0, color: "#0f0" };
const C: Player = { id: "c", name: "Cara", score: 0, color: "#00f" };

let nextId = 0;

function entry(
  o: Partial<ClueResult> & { value: number; verdicts: Record<string, Verdict> },
): ClueResult {
  return {
    id: o.id ?? `e${nextId++}`,
    roundName: o.roundName ?? "Leopardy!",
    category: o.category ?? "CAT",
    value: o.value,
    clue: "",
    answer: "",
    isFinal: o.isFinal ?? false,
    dd: o.dd ?? false,
    verdicts: o.verdicts,
  };
}

function gameWith(
  history: ClueResult[],
  players: Player[] = [A, B],
  extra: Partial<GameState> = {},
): GameState {
  const totals: Record<string, number> = Object.fromEntries(
    players.map((p) => [p.id, 0]),
  );
  for (const h of history) {
    for (const p of players) {
      if (h.verdicts[p.id] === "correct") totals[p.id] += h.value;
      if (h.verdicts[p.id] === "wrong") totals[p.id] -= h.value;
    }
  }
  return {
    title: "t",
    rounds: [],
    activeRound: 0,
    final: { category: "", clue: "", answer: "", value: 2500, done: true },
    players: players.map((p) => ({ ...p, score: totals[p.id] })),
    phase: "results",
    history,
    ...extra,
  };
}

/** A varied, full-ish game: two rounds, 12 distinct categories, DDs, a final. */
function fullGame(): GameState {
  const history: ClueResult[] = [];
  const catsByRound = [
    ["HISTORY", "SCIENCE", "MOVIES", "SPORTS", "FOOD", "WORDS"],
    ["GEOGRAPHY", "MUSIC", "ART", "TV", "NATURE", "MYTH"],
  ];
  const rounds = ["Leopardy!", "Double Leopardy!"];
  let flip = 0;
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    for (const cat of catsByRound[r]) {
      for (const value of [200, 400, 600, 800, 1000]) {
        flip++;
        const a: Verdict = flip % 2 === 0 ? "correct" : null;
        const b: Verdict = flip % 3 === 0 ? "correct" : flip % 5 === 0 ? "wrong" : null;
        const c: Verdict = flip % 4 === 0 ? "correct" : null;
        history.push(
          entry({
            value: round === rounds[1] ? value * 2 : value,
            category: cat,
            roundName: round,
            dd: flip % 11 === 0,
            verdicts: { a, b, c },
          }),
        );
      }
    }
  }
  history.push(
    entry({
      value: 2500,
      category: "FINAL",
      roundName: "Final Leopardy!",
      isFinal: true,
      verdicts: { a: "correct", b: "wrong", c: "correct" },
    }),
  );
  return gameWith(history, [A, B, C]);
}

describe("computePlayerAwards", () => {
  it("gives every player exactly one award, all titles unique", () => {
    const g = gameWith(
      [
        entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
        entry({ value: 800, verdicts: { a: "correct", c: "correct" } }),
        entry({ value: 1200, dd: true, verdicts: { b: "correct" } }),
        entry({ value: 400, category: "TV", verdicts: { c: "correct" } }),
        entry({ value: 800, category: "TV", verdicts: { c: "correct" } }),
      ],
      [A, B, C],
    );
    const awards = computePlayerAwards(g);
    expect(awards).toHaveLength(3);
    expect(new Set(awards.map((a) => a.player.id)).size).toBe(3);
    expect(new Set(awards.map((a) => a.title)).size).toBe(3);
  });

  it("never awards the hollow Contender ribbon", () => {
    const g = fullGame();
    for (const a of computePlayerAwards(g)) {
      expect(a.title).not.toBe("Contender");
    }
  });

  it("offers a catalog of more than 100 superlatives for a full game", () => {
    expect(catalogSize(fullGame())).toBeGreaterThan(100);
  });

  it("pins Sharpshooter to the highest-accuracy player (min 3 answered)", () => {
    // Alice 3/3 (100%), Bob 2/4 (50%) — Alice is the accuracy leader.
    const g = gameWith([
      entry({ value: 400, verdicts: { a: "correct", b: "correct" } }),
      entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
      entry({ value: 400, verdicts: { a: "correct", b: "correct" } }),
      entry({ value: 400, verdicts: { b: "wrong" } }),
    ]);
    const awards = computePlayerAwards(g);
    const alice = awards.find((x) => x.player.id === "a")!;
    const bob = awards.find((x) => x.player.id === "b")!;
    expect(alice.title).toBe("Sharpshooter");
    expect(alice.detail).toContain("100%");
    // The less-accurate player must never be labelled Sharpshooter.
    expect(bob.title).not.toBe("Sharpshooter");
  });

  it("does not pin Sharpshooter when nobody has answered 3", () => {
    const g = gameWith([
      entry({ value: 400, verdicts: { a: "correct" } }),
      entry({ value: 400, verdicts: { b: "correct" } }),
    ]);
    expect(
      computePlayerAwards(g).some((x) => x.title === "Sharpshooter"),
    ).toBe(false);
  });

  it("works for a single player", () => {
    const g = gameWith([entry({ value: 400, verdicts: { a: "correct" } })], [A]);
    const awards = computePlayerAwards(g);
    expect(awards).toHaveLength(1);
    expect(awards[0].player.id).toBe("a");
    expect(awards[0].title).not.toBe("Contender");
  });

  it("is deterministic when players are tied", () => {
    const history = [
      entry({ value: 400, verdicts: { a: "correct", b: "correct" } }),
      entry({ value: 800, verdicts: { a: "correct", b: "correct" } }),
    ];
    const first = computePlayerAwards(gameWith(history));
    const second = computePlayerAwards(gameWith(history));
    expect(first.map((x) => `${x.player.id}:${x.title}`)).toEqual(
      second.map((x) => `${x.player.id}:${x.title}`),
    );
    expect(new Set(first.map((x) => x.title)).size).toBe(2);
  });

  it("gives every player a unique, non-ribbon award in a real game", () => {
    const g = fullGame();
    const awards = computePlayerAwards(g);
    expect(new Set(awards.map((a) => a.title)).size).toBe(awards.length);
    expect(awards.length).toBe(g.players.length);
    for (const a of awards) expect(a.title).not.toBe("Finalist");
  });

  it("credits the Daily Double specialist", () => {
    // Alice's only mark is a big correct Daily Double; Bob grinds base clues.
    // (Kept under 3 answered each so nobody is pinned as Sharpshooter.)
    const g = gameWith(
      [
        entry({ value: 2000, dd: true, verdicts: { a: "correct" } }),
        entry({ value: 400, verdicts: { b: "correct" } }),
        entry({ value: 400, verdicts: { b: "correct" } }),
      ],
      [A, B],
    );
    const alice = computePlayerAwards(g).find((x) => x.player.id === "a")!;
    // Alice's signature moment is that $2,000 Daily Double — whichever true
    // title she lands (Big Banker / Double Trouble / …), it reflects it.
    expect(alice.detail).toContain("$2,000");
  });

  it("never hands a best-at title to a player someone else strictly beat on that stat", () => {
    // Bob strictly leads on correct answers (6 vs 1) and is pinned as
    // Sharpshooter. Quiz Whiz must then go unawarded — never trickle down to
    // Alice with a smaller number.
    const g = gameWith(
      [
        entry({ value: 200, category: "X", verdicts: { b: "correct" } }),
        entry({ value: 400, category: "X", verdicts: { b: "correct" } }),
        entry({ value: 600, category: "X", verdicts: { a: "correct", b: "correct" } }),
        entry({ value: 200, category: "Y", verdicts: { b: "correct" } }),
        entry({ value: 400, category: "Y", verdicts: { a: "wrong", b: "correct" } }),
        entry({ value: 800, category: "Y", verdicts: { b: "correct" } }),
      ],
      [A, B],
      { negativeSuperlatives: false },
    );
    const awards = computePlayerAwards(g);
    const bob = awards.find((x) => x.player.id === "b")!;
    const alice = awards.find((x) => x.player.id === "a")!;
    expect(bob.title).toBe("Sharpshooter");
    // Bob (6 correct, most answered, biggest clue…) holds these crowns even
    // though he's pinned elsewhere — Alice must not inherit any of them.
    for (const title of ["Quiz Whiz", "Busiest Buzzer", "Big Banker"]) {
      expect(alice.title).not.toBe(title);
      expect(awards.some((x) => x.title === title)).toBe(false);
    }
  });

  describe("negative superlatives", () => {
    it("are included by default", () => {
      const g = gameWith([
        entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
        entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
        entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
      ]);
      expect(buildCandidates(g).some((c) => c.negative)).toBe(true);
      // Bob went 0-for-3 and finished last — the wooden spoon lands.
      const bob = computePlayerAwards(g).find((x) => x.player.id === "b")!;
      expect(bob.negative).toBe(true);
    });

    it("are excluded when turned off", () => {
      const g = gameWith(
        [
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
        ],
        [A, B],
        { negativeSuperlatives: false },
      );
      expect(buildCandidates(g).some((c) => c.negative)).toBe(false);
      for (const a of computePlayerAwards(g)) expect(a.negative).toBeFalsy();
    });

    it("appear in the pool when opted in", () => {
      const g = gameWith(
        [
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
          entry({ value: 400, verdicts: { a: "correct", b: "wrong" } }),
        ],
        [A, B],
        { negativeSuperlatives: true },
      );
      expect(buildCandidates(g).some((c) => c.negative)).toBe(true);
      // Bob went 0-for-3 and finishes last: the wooden spoon pins a genuine
      // roast on him, while everyone still gets a unique award.
      const awards = computePlayerAwards(g);
      expect(new Set(awards.map((a) => a.title)).size).toBe(2);
      const bob = awards.find((x) => x.player.id === "b")!;
      expect(bob.negative).toBe(true);
    });
  });
});
