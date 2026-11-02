import { describe, expect, it } from "vitest";
import { parseFeedback, toIssue } from "./feedback";

describe("parseFeedback", () => {
  it("accepts a plain message and trims it", () => {
    expect(parseFeedback({ message: "  more cowbell  " })).toEqual({
      message: "more cowbell",
    });
  });
  it("keeps a trimmed 'from' when present", () => {
    expect(parseFeedback({ message: "hi", from: " Leo " })).toEqual({
      message: "hi",
      from: "Leo",
    });
  });
  it("drops an empty 'from'", () => {
    expect(parseFeedback({ message: "hi", from: "  " })).toEqual({
      message: "hi",
    });
  });
  it.each([
    ["missing message", {}],
    ["blank message", { message: "   " }],
    ["non-string message", { message: 42 }],
    ["overlong message", { message: "x".repeat(2001) }],
    ["non-string from", { message: "hi", from: 7 }],
    ["overlong from", { message: "hi", from: "x".repeat(101) }],
    ["non-object body", "hello"],
    ["null body", null],
  ])("rejects %s", (_name, body) => {
    expect(parseFeedback(body)).toBeNull();
  });
});

describe("toIssue", () => {
  it("titles with the message and labels it feedback", () => {
    const issue = toIssue({ message: "Add team names" });
    expect(issue.title).toBe("Feedback: Add team names");
    expect(issue.body).toBe("Add team names");
    expect(issue.labels).toEqual(["feedback"]);
  });
  it("truncates long titles with an ellipsis", () => {
    const issue = toIssue({ message: "y".repeat(80) });
    expect(issue.title).toBe(`Feedback: ${"y".repeat(60)}…`);
    expect(issue.body).toBe("y".repeat(80));
  });
  it("appends a From line when provided", () => {
    const issue = toIssue({ message: "hi", from: "Leo" });
    expect(issue.body).toBe("hi\n\n---\nFrom: Leo");
  });
});
