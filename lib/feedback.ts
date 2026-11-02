// Validation and GitHub-issue formatting for the suggestion box.
// Kept pure so the API route stays a thin transport layer.

export interface Feedback {
  message: string;
  from?: string;
}

const MESSAGE_MAX = 2000;
const FROM_MAX = 100;
const TITLE_MAX = 60;

export function parseFeedback(body: unknown): Feedback | null {
  if (typeof body !== "object" || body === null) return null;
  const { message, from } = body as Record<string, unknown>;
  if (typeof message !== "string") return null;
  const msg = message.trim();
  if (!msg || msg.length > MESSAGE_MAX) return null;
  if (from !== undefined) {
    if (typeof from !== "string" || from.length > FROM_MAX) return null;
    const f = from.trim();
    if (f) return { message: msg, from: f };
  }
  return { message: msg };
}

export function toIssue(fb: Feedback): {
  title: string;
  body: string;
  labels: string[];
} {
  const head =
    fb.message.length > TITLE_MAX
      ? `${fb.message.slice(0, TITLE_MAX)}…`
      : fb.message;
  const body = fb.from ? `${fb.message}\n\n---\nFrom: ${fb.from}` : fb.message;
  return { title: `Feedback: ${head}`, body, labels: ["feedback"] };
}
