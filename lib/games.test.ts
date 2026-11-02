import { describe, it, expect } from "vitest";
import { revealed, mostRecent, searchGames } from "./games";
import type { GamesIndex } from "./games";

const INDEX: GamesIndex = {
  minDate: "2010-01-01",
  count: 3,
  years: [
    { year: 2026, count: 2 },
    { year: 2019, count: 1 },
  ],
  games: [
    { id: "b", ep: "9142", date: "2026-07-23", year: 2026, rounds: 2, cats: ["ASTRONOMY", "POP MUSIC"], final: "US PRESIDENTS", dd: 3 },
    { id: "a", ep: "9128", date: "2026-07-16", year: 2026, rounds: 2, cats: ["CHEMISTRY", "SITCOMS"], final: "RIVERS", dd: 2 },
    { id: "c", ep: "8000", date: "2019-05-06", year: 2019, rounds: 2, cats: ["SHAKESPEARE", "THE MOVIES"], final: "OPERA", dd: 2 },
  ],
};

describe("revealed", () => {
  it("blind hides everything", () => {
    expect(revealed("blind")).toEqual({ cats: false, final: false, dd: false });
  });
  it("categories shows cats, seals final", () => {
    expect(revealed("categories")).toEqual({ cats: true, final: false, dd: false });
  });
  it("full shows everything", () => {
    expect(revealed("full")).toEqual({ cats: true, final: true, dd: true });
  });
});

describe("mostRecent", () => {
  it("returns the newest game by date regardless of array order", () => {
    expect(mostRecent(INDEX)?.id).toBe("b");
  });
  it("returns null for an empty index", () => {
    expect(mostRecent({ ...INDEX, games: [] })).toBeNull();
  });
});

describe("searchGames", () => {
  it("returns all games for an empty query", () => {
    expect(searchGames(INDEX, { query: "" }).map((g) => g.id)).toEqual(["b", "a", "c"]);
  });
  it("matches a category keyword case-insensitively", () => {
    expect(searchGames(INDEX, { query: "movies" }).map((g) => g.id)).toEqual(["c"]);
  });
  it("matches a year", () => {
    expect(searchGames(INDEX, { query: "2019" }).map((g) => g.id)).toEqual(["c"]);
  });
  it("matches a written month + year", () => {
    expect(searchGames(INDEX, { query: "july 2026" }).map((g) => g.id)).toEqual(["b", "a"]);
  });
  it("ANDs multiple tokens", () => {
    expect(searchGames(INDEX, { query: "chemistry 2026" }).map((g) => g.id)).toEqual(["a"]);
  });
  it("hides played games when hidePlayed is set", () => {
    const played = new Set(["a"]);
    expect(searchGames(INDEX, { query: "", playedIds: played, hidePlayed: true }).map((g) => g.id)).toEqual(["b", "c"]);
  });
  it("keeps played games visible when hidePlayed is false", () => {
    const played = new Set(["a"]);
    expect(searchGames(INDEX, { query: "", playedIds: played, hidePlayed: false }).map((g) => g.id)).toEqual(["b", "a", "c"]);
  });
});
