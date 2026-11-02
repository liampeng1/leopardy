"use client";

import { useEffect, useRef, useState } from "react";

function fmt(s: number): string {
  if (s >= 60) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  }
  return String(s);
}

/** Short, gentle double-beep when the clock runs out (Web Audio, no asset). */
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const blip = (at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 660;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + at + 0.18,
      );
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.2);
    };
    blip(0);
    blip(0.24);
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio unavailable — ignore */
  }
}

/**
 * Compact per-clue countdown — a small ring whose gold outline erodes
 * clockwise from the top as the seconds tick. Auto-starts when the clue
 * opens, freezes once the answer is revealed. Tap the ring to pause/resume,
 * ↺ to reset. The limit is configured on the setup screen.
 */
export function ClueTimer({
  limit,
  freeze = false,
  sound = true,
  onExpire,
}: {
  limit: number;
  freeze?: boolean;
  sound?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(limit);
  // The user's pause toggle; whether the clock actually ticks is derived
  // from this plus freeze/expiry, so nothing needs syncing via effects.
  const [paused, setPaused] = useState(false);
  const beeped = useRef(false);
  const expireFn = useRef(onExpire);
  useEffect(() => {
    expireFn.current = onExpire;
  }, [onExpire]);

  const expired = remaining === 0;
  const running = !paused && !freeze && !expired;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () => setRemaining((r) => Math.max(0, r - 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [running]);

  // At zero: sound the beep and reveal the answer + players.
  useEffect(() => {
    if (remaining === 0 && !beeped.current) {
      beeped.current = true;
      if (sound) beep();
      expireFn.current?.();
    }
  }, [remaining, sound]);
  const frac = limit > 0 ? remaining / limit : 0;
  const low = frac <= 0.25 || expired;
  const tint = low ? "var(--wrong)" : "var(--gold)";

  const R = 45;
  const C = 2 * Math.PI * R;

  const reset = () => {
    setRemaining(limit);
    setPaused(true);
    beeped.current = false;
  };
  const toggle = () => {
    if (expired) return reset();
    setPaused((p) => !p);
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0 select-none">
      {/* countdown ring — tap to start / pause / reset */}
      <button
        onClick={toggle}
        aria-label={expired ? "Reset timer" : running ? "Pause timer" : "Start timer"}
        className={`relative grid place-items-center h-[3.4rem] w-[3.4rem] sm:h-16 sm:w-16 ${
          expired ? "animate-pop" : ""
        }`}
      >
        {/* outline erodes clockwise from the top */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          style={{ transform: "scaleX(-1) rotate(-90deg)" }}
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="7"
          />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke={tint}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{
              transition: "stroke-dashoffset 1s linear, stroke 0.3s ease",
            }}
          />
        </svg>
        <span
          className={`relative font-display tabular-nums leading-none ${
            remaining >= 60 ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
          } ${!running && !expired ? "opacity-60" : ""}`}
          style={{ color: tint, textShadow: "1.5px 2px 0 rgba(0,0,0,0.45)" }}
        >
          {expired ? "0" : fmt(remaining)}
        </span>
      </button>

      {/* reset */}
      <button
        onClick={reset}
        aria-label="Reset timer"
        className="font-ui text-lg text-white/45 hover:text-white h-8 w-8 grid place-items-center rounded-lg hover:bg-white/10 transition"
      >
        ↺
      </button>
    </div>
  );
}
