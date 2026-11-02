"use client";

import { useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Floating suggestion box, mounted once in the root layout so it's available
 * on every screen. Submissions POST to /api/feedback, which files them as
 * GitHub issues for the game master to triage.
 */
export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const close = () => {
    setOpen(false);
    setStatus("idle");
  };

  const send = async () => {
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const resp = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          from: from.trim() || undefined,
        }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setStatus("sent");
      setMessage("");
      window.setTimeout(close, 1800);
    } catch {
      setStatus("error");
    }
  };

  if (!open) {
    return (
      // z-[55]: above full-screen overlays like the game browser (z-50) so
      // suggestions can come from any screen, below the help/dialog layers.
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[55] font-ui text-sm text-ink-dim hover:text-gold-bright ring-1 ring-panel-edge hover:bg-white/5 px-3 py-1.5 rounded-full transition"
      >
        💡 Suggest
      </button>
    );
  }

  return (
    // Centered pop-up above every other overlay (ShortcutHelp tops out at
    // z-[60]) — a bottom-anchored panel can end up hidden behind content or
    // the on-screen keyboard on small screens.
    <div
      className="fixed inset-0 z-[70] bg-black/70 grid place-items-center p-4 animate-pop"
      onClick={close}
      // Keep Enter/Escape from reaching the global shortcut listener.
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") close();
      }}
    >
      <div
        className="w-full max-w-md max-h-[90dvh] overflow-auto rounded-2xl wood-trim p-5 shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {status === "sent" ? (
          <p className="font-ui text-ink text-center py-6">
            Thanks — suggestion sent! 🏆
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="font-display value-gold text-xl tracking-wide">
              Suggestion Box
            </h2>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="What should we change or add?"
              className="font-ui text-sm text-ink bg-black/30 rounded-xl ring-1 ring-panel-edge p-2.5 resize-none outline-none focus:ring-gold-bright/60"
            />
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              maxLength={100}
              placeholder="Your name (optional)"
              className="font-ui text-sm text-ink bg-black/30 rounded-xl ring-1 ring-panel-edge px-2.5 py-1.5 outline-none focus:ring-gold-bright/60"
            />
            {status === "error" && (
              <p className="font-ui text-sm text-red-400">
                Couldn&apos;t send — try again.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={close}
                className="font-ui text-sm text-ink-dim hover:text-ink px-3 py-1.5 rounded-full ring-1 ring-panel-edge hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={!message.trim() || status === "sending"}
                className="font-ui font-semibold text-sm bg-gold-bright text-[#0a1046] px-4 py-1.5 rounded-full transition disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
