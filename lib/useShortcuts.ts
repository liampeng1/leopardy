"use client";

import { useEffect, useRef } from "react";

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>;

/**
 * Bind a keyboard shortcut map while the owning screen/overlay is mounted.
 * Keys are KeyboardEvent.key values ("Enter", " ", "Escape", "1", "?", …).
 * Typing targets swallow everything except Enter/Escape; browser combos
 * (meta/ctrl/alt) always pass through.
 */
export function useShortcuts(map: ShortcutMap, enabled = true) {
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (typing && e.key !== "Enter" && e.key !== "Escape") return;
      const handler = mapRef.current[e.key];
      if (!handler) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
