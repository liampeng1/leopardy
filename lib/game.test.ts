import { describe, expect, it } from "vitest";
import {
  computeBiggestWipeout,
  computeCategoryBreakdown,
  computeGroupAccuracy,
  computeRoundBreakdown,
  computeSuperlatives,
  computeTimeline,
  computeTimelineWithFinal,
  cycleVerdict,
  lowestScorer,
  nextCell,
  normalizeGame,
} from "./game";
import { Category, ClueResult, GameState, Player, Verdict } from "./types";

const A: Player = { id: "a", name: "Alice", score: 0, color: "#f00" };
const B: Player = { id: "b", name: "Bob", score: 0, color: "#0f0" };

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

function gameWith(history: ClueResult[], players: Player[] = [A, B]): GameState {
  // Final scores derived from history so ranking matches the timeline.
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
  };
}

describe("computeTimelineWithFinal", () => {
  const history = [
    entry({ value: 200, verdicts: { a: "correct", b: "wrong" } }),
  ];

  it("matches the plain timeline when there were no manual adjustments", () => {
    const game = gameWith(history); // scores derived from history: a=200, b=-200
    const plain = computeTimeline(game);
    const withFinal = computeTimelineWithFinal(game);
    expect(withFinal).toEqual(plain);
  });

  it("appends a final point carrying the true scores after a manual adjustment", () => {
    const game = gameWith(history);
    // Game master nudged Alice +100 and Bob +200 on the scoreboard.
    game.players = game.players.map((p) => ({ ...p, score: p.score + (p.id === "a" ? 100 : 200) }));
    const plain = computeTimeline(game);
    const withFinal = computeTimelineWithFinal(game);
    expect(withFinal.length).toBe(plain.length + 1);
    const last = withFinal[withFinal.length - 1];
    expect(last.scores.a).toBe(300); // 200 from the clue + 100 manual
    expect(last.scores.b).toBe(0); // -200 from the clue + 200 manual
    expect(last.index).toBe(plain[plain.length - 1].index + 1);
  });
});

describe("computeGroupAccuracy", () => {
  it("counts every correct/wrong verdict across all players", () => {
    const g = gameWith([
      entry({ value: 200, verdicts: { a: "correct", b: "wrong" } }),
      entry({ value: 400, verdicts: { a: "correct", b: "correct" } }),
      entry({ value: 600, verdicts: { a: "wrong" } }), // b didn't ring in
    ]);
    const r = computeGroupAccuracy(g);
    expect(r.answered).toBe(5); // 3 for a, 2 for b
    expect(r.correct).toBe(3);
    expect(r.accuracy).toBeCloseTo(3 / 5);
  });

  it("is zero when nobody answered", () => {
    const g = gameWith([entry({ value: 200, verdicts: {} })]);
    expect(computeGroupAccuracy(g)).toEqual({ correct: 0, answered: 0, accuracy: 0 });
  });
});

describe("computeBiggestWipeout", () => {
  it("finds the clue with the most wrong answers and total points lost", () => {
    const g = gameWith(
      [
        entry({ value: 200, category: "EASY", verdicts: { a: "wrong", b: "wrong" } }),
        entry({ value: 1000, category: "HARD", verdicts: { a: "wrong", b: "wrong" } }),
        entry({ value: 400, verdicts: { a: "correct" } }),
      ],
      [A, B],
    );
    const w = computeBiggestWipeout(g)!;
    // Both clues have 2 wrong; the $1000 one lost more, so it wins the tie.
    expect(w.entry.category).toBe("HARD");
    expect(w.wrongCount).toBe(2);
    expect(w.pointsLost).toBe(2000);
  });

  it("returns null when no clue tripped up two or more players", () => {
    const g = gameWith([
      entry({ value: 200, verdicts: { a: "wrong", b: "correct" } }),
      entry({ value: 400, verdicts: { a: "correct" } }),
    ]);
    expect(computeBiggestWipeout(g)).toBeNull();
  });
});

describe("computeSuperlatives", () => {
  it("finds the biggest single swing (signed, wrong answers count)", () => {
    const g = gameWith([
      entry({ value: 200, verdicts: { a: "correct" } }),
      entry({ value: 1000, category: "BIG", verdicts: { b: "wrong" } }),
      entry({ value: 600, verdicts: { a: "correct" } }),
    ]);
    const s = computeSuperlatives(g);
    expect(s.biggestSwing).toEqual({
      player: expect.objectContaining({ id: "b" }),
      delta: -1000,
      category: "BIG",
    });
  });

  it("finds the longest correct streak, null when under 2", () => {
    const g = gameWith([
      entry({ value: 200, verdicts: { a: "correct", b: "wrong" } }),
      entry({ value: 200, verdicts: { a: "correct" } }),
      entry({ value: 200, verdicts: { a: "wrong", b: "correct" } }),
      entry({ value: 200, verdicts: { a: "correct" } }),
    ]);
    expect(computeSuperlatives(g).longestStreak).toEqual({
      player: expect.objectContaining({ id: "a" }),
      length: 2,
    });
    const g2 = gameWith([entry({ value: 200, verdicts: { a: "correct" } })]);
    expect(computeSuperlatives(g2).longestStreak).toBeNull();
  });

  it("measures the winner's biggest deficit as the comeback", () => {
    const g = gameWith([
      entry({ value: 1000, verdicts: { b: "correct" } }), // b leads by 1000
      entry({ value: 800, verdicts: { a: "correct" } }),
      entry({ value: 800, verdicts: { a: "correct" } }), // a wins 1600 to 1000
    ]);
    expect(computeSuperlatives(g).comeback).toEqual({
      player: expect.objectContaining({ id: "a" }),
      deficit: 1000,
    });
  });

  it("returns null comeback when the winner led throughout", () => {
    const g = gameWith([
      entry({ value: 400, verdicts: { a: "correct" } }),
      entry({ value: 200, verdicts: { b: "correct" } }),
    ]);
    expect(computeSuperlatives(g).comeback).toBeNull();
  });

  it("tallies the Daily Double record across players, null when no DDs", () => {
    const g = gameWith([
      entry({ value: 1500, dd: true, verdicts: { a: "correct" } }),
      entry({ value: 500, dd: true, verdicts: { b: "wrong" } }),
      entry({ value: 200, verdicts: { a: "correct" } }),
    ]);
    expect(computeSuperlatives(g).ddRecord).toEqual({
      right: 1,
      wrong: 1,
      net: 1000,
    });
    expect(
      computeSuperlatives(gameWith([entry({ value: 200, verdicts: { a: "correct" } })]))
        .ddRecord,
    ).toBeNull();
  });

  it("counts sole-leader changes, ignoring ties and the tied start", () => {
    const g = gameWith([
      entry({ value: 400, verdicts: { a: "correct" } }), // a takes the first sole lead — not a change
      entry({ value: 400, verdicts: { b: "correct" } }), // tie — ignored
      entry({ value: 200, verdicts: { b: "correct" } }), // b leads: change 1
      entry({ value: 600, verdicts: { a: "correct" } }), // a leads: change 2
    ]);
    expect(computeSuperlatives(g).leadChanges).toBe(2);
  });
});

describe("computeRoundBreakdown", () => {
  it("nets per player per round, in play order", () => {
    const g = gameWith([
      entry({
        roundName: "Leopardy!",
        value: 200,
        verdicts: { a: "correct", b: "wrong" },
      }),
      entry({ roundName: "Double Leopardy!", value: 800, verdicts: { b: "correct" } }),
      entry({
        roundName: "Final Leopardy!",
        value: 2500,
        isFinal: true,
        verdicts: { a: "wrong", b: "correct" },
      }),
    ]);
    const r = computeRoundBreakdown(g);
    expect(r.rounds).toEqual(["Leopardy!", "Double Leopardy!", "Final Leopardy!"]);
    expect(r.perPlayer).toEqual([
      { player: expect.objectContaining({ id: "a" }), nets: [200, 0, -2500] },
      { player: expect.objectContaining({ id: "b" }), nets: [-200, 800, 2500] },
    ]);
  });
});

describe("computeCategoryBreakdown", () => {
  it("picks best and worst category by net, worst null when only one", () => {
    const g = gameWith([
      entry({ category: "SCIENCE", value: 400, verdicts: { a: "correct" } }),
      entry({ category: "SCIENCE", value: 600, verdicts: { a: "correct" } }),
      entry({ category: "OPERA", value: 800, verdicts: { a: "wrong", b: "correct" } }),
    ]);
    const [ca, cb] = computeCategoryBreakdown(g);
    expect(ca.best).toEqual({ category: "SCIENCE", net: 1000 });
    expect(ca.worst).toEqual({ category: "OPERA", net: -800 });
    expect(cb.best).toEqual({ category: "OPERA", net: 800 });
    expect(cb.worst).toBeNull();
  });

  it("returns nulls for a player who never answered", () => {
    const g = gameWith([entry({ value: 200, verdicts: { a: "correct" } })]);
    const [, cb] = computeCategoryBreakdown(g);
    expect(cb.best).toBeNull();
    expect(cb.worst).toBeNull();
  });
});

function cat(id: string, dones: boolean[]): Category {
  return {
    id,
    name: id,
    clues: dones.map((done, i) => ({
      id: `${id}-q${i}`,
      value: (i + 1) * 200,
      clue: "c",
      answer: "a",
      done,
    })),
  };
}

describe("lowestScorer", () => {
  it("returns the player with the lowest score", () => {
    const players = [
      { ...A, score: 800 },
      { ...B, score: -400 },
    ];
    expect(lowestScorer(players)?.id).toBe("b");
  });

  it("breaks ties by player order and handles empty lists", () => {
    const players = [
      { ...A, score: 200 },
      { ...B, score: 200 },
    ];
    expect(lowestScorer(players)?.id).toBe("a");
    expect(lowestScorer([])).toBeNull();
  });
});

describe("cycleVerdict", () => {
  it("cycles null → correct → wrong → null", () => {
    expect(cycleVerdict(null)).toBe("correct");
    expect(cycleVerdict("correct")).toBe("wrong");
    expect(cycleVerdict("wrong")).toBeNull();
  });
});

describe("nextCell", () => {
  const cats = [
    cat("c0", [false, true, false]),
    cat("c1", [true, true, true]),
    cat("c2", [false, false, false]),
  ];

  it("starts at the first available cell", () => {
    expect(nextCell(cats, null, "down")).toEqual({ col: 0, row: 0 });
  });

  it("steps down within a column, skipping done cells and wrapping", () => {
    expect(nextCell(cats, { col: 0, row: 0 }, "down")).toEqual({ col: 0, row: 2 });
    expect(nextCell(cats, { col: 0, row: 2 }, "down")).toEqual({ col: 0, row: 0 });
    expect(nextCell(cats, { col: 0, row: 2 }, "up")).toEqual({ col: 0, row: 0 });
  });

  it("steps right past a fully-done column, keeping the row", () => {
    expect(nextCell(cats, { col: 0, row: 0 }, "right")).toEqual({ col: 2, row: 0 });
  });

  it("wraps left onto the last column", () => {
    expect(nextCell(cats, { col: 0, row: 2 }, "left")).toEqual({ col: 2, row: 2 });
  });

  it("lands on the nearest available row when the target is done", () => {
    const cats2 = [cat("a", [false, false, false]), cat("b", [false, true, false])];
    expect(nextCell(cats2, { col: 0, row: 1 }, "right")).toEqual({ col: 1, row: 2 });
  });

  it("returns null when the whole board is done", () => {
    expect(nextCell([cat("x", [true, true])], null, "down")).toBeNull();
  });
});

describe("normalizeGame defaults", () => {
  it("defaults the answer timer to 20 seconds", () => {
    expect(normalizeGame({}, [A]).timerSeconds).toBe(20);
  });

  it("keeps an explicit timer value, including off (0)", () => {
    expect(normalizeGame({ timerSeconds: 45 }, [A]).timerSeconds).toBe(45);
    expect(normalizeGame({ timerSeconds: 0 }, [A]).timerSeconds).toBe(0);
  });

  it("defaults roast superlatives to on", () => {
    expect(normalizeGame({}, [A]).negativeSuperlatives).toBe(true);
  });

  it("keeps an explicit roasts-off choice", () => {
    expect(
      normalizeGame({ negativeSuperlatives: false }, [A]).negativeSuperlatives,
    ).toBe(false);
  });
});
