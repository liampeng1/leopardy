import { describe, expect, it } from "vitest";
import { migrateLegacySettings } from "./settings";

describe("migrateLegacySettings", () => {
  it("moves the old default timer (30s) to the new 20s default", () => {
    expect(migrateLegacySettings({ timerSeconds: 30 }).timerSeconds).toBe(20);
  });

  it("moves the old roasts-off default to the new roasts-on default", () => {
    expect(
      migrateLegacySettings({ negativeSuperlatives: false }).negativeSuperlatives,
    ).toBe(true);
  });

  it("leaves non-default choices untouched", () => {
    const kept = migrateLegacySettings({
      timerSeconds: 45,
      negativeSuperlatives: true,
      wordRevealWpm: 180,
      soundEnabled: false,
    });
    expect(kept.timerSeconds).toBe(45);
    expect(kept.negativeSuperlatives).toBe(true);
    expect(kept.wordRevealWpm).toBe(180);
    expect(kept.soundEnabled).toBe(false);
  });

  it("adds nothing that wasn't stored", () => {
    expect(migrateLegacySettings({})).toEqual({});
  });
});
