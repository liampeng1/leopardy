// Files each suggestion-box submission as a GitHub issue on FEEDBACK_REPO,
// where the owner triages them (label: feedback). Use a private repo: issues
// are created with your token, so they appear under your GitHub account.
import { parseFeedback, toIssue } from "@/lib/feedback";

export async function POST(request: Request) {
  const fb = parseFeedback(await request.json().catch(() => null));
  if (!fb) {
    return Response.json({ error: "Invalid feedback" }, { status: 400 });
  }

  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  const repo = process.env.FEEDBACK_REPO;
  if (!token || !repo) {
    console.error("feedback: GITHUB_FEEDBACK_TOKEN or FEEDBACK_REPO is not set");
    return Response.json({ error: "Couldn't save feedback" }, { status: 500 });
  }

  const resp = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toIssue(fb)),
  });
  if (!resp.ok) {
    console.error(`feedback: GitHub responded ${resp.status}`);
    return Response.json({ error: "Couldn't save feedback" }, { status: 500 });
  }
  return Response.json({ ok: true });
}
