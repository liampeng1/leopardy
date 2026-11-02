"use client";

// Synthesized game sounds — all generated with the Web Audio API, no audio
// assets and (deliberately) not the copyrighted show cues. Each entry point
// takes an `enabled` flag so a single Sound toggle can mute everything.

function makeCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    // Autoplay policies can leave the context suspended; a clue is always
    // opened via a click/keypress, so resuming here is allowed.
    ctx.resume?.().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** A bright rising arpeggio when a Daily Double is revealed. */
export function playDailyDouble(enabled = true): void {
  if (!enabled) return;
  const ctx = makeCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((f, i) => {
    const at = i * 0.1;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
    gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.34);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + at);
    osc.stop(ctx.currentTime + at + 0.36);
  });
  setTimeout(() => ctx.close().catch(() => {}), 1200);
}

/**
 * A gentle looping "think" motif for Final Leopardy — an original waltzing
 * arpeggio, not the copyrighted cue. Returns a stop() that fades it out.
 */
export function playThinkMusic(enabled = true): () => void {
  if (!enabled) return () => {};
  const ctx = makeCtx();
  if (!ctx) return () => {};

  const seq = [392.0, 523.25, 659.25, 523.25, 587.33, 493.88, 587.33, 392.0]; // G C E C D B D G
  const beat = 0.5;
  let stopped = false;
  let timer = 0;

  const master = ctx.createGain();
  master.gain.value = 0.13;
  master.connect(ctx.destination);

  const scheduleBar = () => {
    if (stopped) return;
    const t0 = ctx.currentTime + 0.06;
    seq.forEach((f, i) => {
      const at = t0 + i * beat;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(1, at + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + beat * 0.9);
      osc.connect(gain).connect(master);
      osc.start(at);
      osc.stop(at + beat);
    });
    timer = window.setTimeout(scheduleBar, seq.length * beat * 1000);
  };
  scheduleBar();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    } catch {
      /* ignore */
    }
    setTimeout(() => ctx.close().catch(() => {}), 500);
  };
}
